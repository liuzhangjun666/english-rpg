<?php

namespace App\Services;

use App\Models\LearningRecord;
use App\Models\User;
use App\Support\StoryProgressSupport;
use Illuminate\Support\Facades\Log;

class ReadingAdventureService
{
    private const PASS_THRESHOLD = 60;
    private const CHAPTER_PREFIX_TO_MAINLINE = [
        'R1' => 'chapter_1',
        'R2' => 'chapter_2',
        'R3' => 'chapter_3',
        'R4' => 'chapter_4',
    ];
    private const HIDDEN_NODE_MAPPING = [
        'chapter_1' => 'hidden_ending_void',
        'chapter_2' => 'hidden_ending_starlight',
        // 预留：chapter_3 / chapter_4 后续补充
    ];

    public function __construct(
        private readonly HeartDemonService $demonService,
        private readonly RealmService $realmService
    )
    {
    }

    public function getChaptersByLevel(User $user, int $level): array
    {
        $chapters = array_values(array_filter($this->allChapters(), fn ($c) => $c['level'] === $level));
        $completed = $this->completedMap($user);
        $storyProgress = StoryProgressSupport::normalizeStoryProgress($user->story_progress);

        return array_map(function ($chapter) use ($completed, $storyProgress) {
            $unlockRequirements = $chapter['unlock_requirements'] ?? [];
            $selectedBranchId = $storyProgress['selected_branches'][$chapter['id']] ?? null;
            return [
                'id' => $chapter['id'],
                'level' => $chapter['level'],
                'scene' => $chapter['scene'],
                'title' => $chapter['title'],
                'difficulty' => $chapter['difficulty'],
                'task_count' => count($chapter['tasks']),
                'reward_preview' => $chapter['rewards'],
                'chapter_rewards' => $chapter['chapter_rewards'] ?? [],
                'unlock_requirements' => $unlockRequirements,
                'branch_count' => count($chapter['branch_options'] ?? []),
                'selected_branch_id' => $selectedBranchId,
                'completed' => !empty($completed[$chapter['id']]),
            ];
        }, $chapters);
    }

    public function getChapterOrNull(string $chapterId, ?User $user = null): ?array
    {
        $chapter = $this->allChapters()[$chapterId] ?? null;
        if (!$chapter) {
            return null;
        }

        if ($user) {
            $storyProgress = StoryProgressSupport::normalizeStoryProgress($user->story_progress);
            $chapter['selected_branch_id'] = $storyProgress['selected_branches'][$chapterId] ?? null;
        }

        return $chapter;
    }

    public function submit(
        User $user,
        string $chapterId,
        array $answers,
        ?string $selectedBranchId = null,
        ?array $demonTrialAnswers = null,
        bool $skipDemonTrial = false
    ): array
    {
        $chapter = $this->getChapterOrNull($chapterId, $user);
        if (!$chapter) {
            return ['success' => false, 'message' => '阅读副本不存在'];
        }

        $taskAnswers = [];
        foreach ($answers as $item) {
            if (!is_array($item)) {
                continue;
            }
            $taskId = $item['task_id'] ?? null;
            if (!$taskId) {
                continue;
            }
            $taskAnswers[$taskId] = (string)($item['answer'] ?? '');
        }

        $results = [];
        $correctCount = 0;
        foreach ($chapter['tasks'] as $task) {
            $taskId = $task['id'];
            $userAnswer = trim((string)($taskAnswers[$taskId] ?? ''));
            $correct = $this->isTaskCorrect($task, $userAnswer);
            if ($correct) {
                $correctCount++;
            }

            $results[] = [
                'task_id' => $taskId,
                'type' => $task['type'],
                'correct' => $correct,
                'user_answer' => $userAnswer,
                'correct_answer' => $task['answer'],
            ];
        }

        $total = count($chapter['tasks']);
        $accuracy = $total > 0 ? (int) round(($correctCount / $total) * 100) : 0;
        $passed = $accuracy >= self::PASS_THRESHOLD;
        $branchOptions = $chapter['branch_options'] ?? [];
        $validBranchIds = array_values(array_map(fn ($item) => (string) ($item['id'] ?? ''), $branchOptions));

        if ($passed && count($validBranchIds) > 0) {
            if (!$selectedBranchId || !in_array($selectedBranchId, $validBranchIds, true)) {
                return [
                    'success' => false,
                    'message' => '请先选择本章命盘分支后再提交',
                ];
            }
        } else {
            $selectedBranchId = null;
        }

        $isHereticChoice = $selectedBranchId && str_contains($selectedBranchId, 'path_heretic');
        $demonTrial = null;
        $hiddenNodeId = null;

        if ($passed && $isHereticChoice) {
            $demonQuestions = $this->demonService->getRecentWrongQuestions($user->id, 3, 5);
            if (count($demonQuestions) > 0) {
                if ($skipDemonTrial) {
                    $selectedBranchId = $this->fallbackRegularBranch($chapter, $selectedBranchId);
                    $demonTrial = [
                        'total' => count($demonQuestions),
                        'correct_count' => 0,
                        'passed' => false,
                        'results' => [],
                        'message' => '用户取消问心试炼，已退回常规节点。',
                    ];
                } elseif (!$demonTrialAnswers || count($demonTrialAnswers) === 0) {
                    return [
                        'success' => true,
                        'data' => [
                            'need_demon_trial' => true,
                            'chapter_id' => $chapterId,
                            'selected_branch_id' => $selectedBranchId,
                            'demon_trial_questions' => $demonQuestions,
                            'demon_trial_min' => 3,
                            'demon_trial_max' => 5,
                            'message' => '问心之路已触发：请先破除心魔再判定分支。',
                        ],
                    ];
                } else {
                    $allowedQuestionIds = array_values(array_map(
                        fn ($q) => (string) ($q['question_id'] ?? ''),
                        $demonQuestions
                    ));

                    $filteredAnswers = [];
                    foreach ($demonTrialAnswers as $answerItem) {
                        $qid = trim((string) ($answerItem['question_id'] ?? ''));
                        if ($qid === '' || !in_array($qid, $allowedQuestionIds, true)) {
                            continue;
                        }
                        $filteredAnswers[] = [
                            'question_id' => $qid,
                            'answer' => (string) ($answerItem['answer'] ?? ''),
                        ];
                    }

                    $demonTrial = $this->demonService->evaluateDemonTrial($user->id, $filteredAnswers);
                    if (!($demonTrial['passed'] ?? false)) {
                        $selectedBranchId = $this->fallbackRegularBranch($chapter, $selectedBranchId);
                    } else {
                        $hiddenNodeId = $this->resolveHiddenNodeByChapter($chapterId);
                    }
                }
            } else {
                $demonTrial = [
                    'total' => 0,
                    'correct_count' => 0,
                    'passed' => true,
                    'results' => [],
                    'message' => '当前无可用心魔题，按破除处理。',
                ];
                $hiddenNodeId = $this->resolveHiddenNodeByChapter($chapterId);
            }
        }

        $difficulty = max(1, (int)$chapter['difficulty']);
        $multiplier = 1 + (($difficulty - 1) * 0.25);

        $baseXp = (int)($chapter['rewards']['xp'] ?? 0);
        $baseSpiritStone = (int)($chapter['rewards']['spirit_stone'] ?? 0);
        $xp = (int) round($baseXp * $multiplier * ($accuracy / 100));
        $spiritStone = (int) round($baseSpiritStone * $multiplier * ($accuracy / 100));

        if ($passed) {
            $user->increment('exp', $xp);
            $user->increment('spirit_stone', $spiritStone);
        }

        $branchUnlockState = $this->resolveBranchUnlockState($chapterId, $selectedBranchId, $chapter);
        if ($hiddenNodeId) {
            $branchUnlockState['hidden_node_id'] = $hiddenNodeId;
        }
        $storySnapshot = StoryProgressSupport::applyReadingBranchResult(
            $user,
            $chapter,
            $selectedBranchId,
            $passed,
            $accuracy,
            $chapter['chapter_rewards'] ?? [],
            $branchUnlockState,
        );

        foreach ($results as $row) {
            LearningRecord::create([
                'user_id' => $user->id,
                'activity_type' => 'reading',
                'activity_id' => $chapterId,
                'question_id' => $row['task_id'],
                'is_correct' => (bool) $row['correct'],
                'exp_gained' => 0,
                'spirit_cost' => 0,
                'time_spent' => 0,
                'answer_data' => [
                    'task_type' => $row['type'],
                    'user_answer' => $row['user_answer'],
                    'correct_answer' => $row['correct_answer'],
                ],
            ]);

            if ($row['correct']) {
                $this->demonService->recordCorrect($user->id, $row['task_id']);
            } else {
                $this->demonService->recordWrong($user->id, $row['task_id'], 'reading', $user->realm);
            }
        }

        LearningRecord::create([
            'user_id' => $user->id,
            'activity_type' => 'reading',
            'activity_id' => $chapterId,
                'question_id' => 'chapter_result',
                'is_correct' => $passed,
                'exp_gained' => $passed ? $xp : 0,
                'spirit_cost' => CurrencyService::SPIRIT_COST_PER_LEVEL,
                'time_spent' => 0,
                'answer_data' => [
                    'level' => $chapter['level'],
                    'scene' => $chapter['scene'],
                    'accuracy' => $accuracy,
                'difficulty' => $chapter['difficulty'],
                'passed' => $passed,
            ],
        ]);

        return [
            'success' => true,
            'data' => [
                'chapter_id' => $chapterId,
                'level' => $chapter['level'],
                'scene' => $chapter['scene'],
                'difficulty' => $chapter['difficulty'],
                'results' => $results,
                'accuracy' => $accuracy,
                'passed' => $passed,
                'xp_gained' => $passed ? $xp : 0,
                'spirit_stone_gained' => $passed ? $spiritStone : 0,
                'item_reward' => $passed ? ($chapter['rewards']['item'] ?? null) : null,
                'selected_branch_id' => $selectedBranchId,
                'branch_unlock_state' => $branchUnlockState,
                'demon_trial' => $demonTrial,
                'next_chapter_id' => $branchUnlockState['next_chapter_id'] ?? null,
                'story_progress' => $storySnapshot['story_progress'] ?? StoryProgressSupport::normalizeStoryProgress($user->story_progress),
                'progress_currency' => $storySnapshot['progress_currency'] ?? StoryProgressSupport::normalizeProgressCurrency($user->progress_currency),
            ],
        ];
    }

    public function scenesByLevel(int $level): array
    {
        $sceneMap = [
            1 => ['宗门院落', '宗门食堂', '灵兽森林', '师门小故事'],
            2 => ['宗门院落', '宗门食堂', '灵兽森林', '师门小故事', '宗门后山探险', '宗门课堂'],
        ];

        return $sceneMap[$level] ?? [];
    }

    private function completedMap(User $user): array
    {
        return LearningRecord::where('user_id', $user->id)
            ->where('activity_type', 'reading')
            ->where('question_id', 'chapter_result')
            ->where('is_correct', 1)
            ->pluck('activity_id')
            ->flip()
            ->toArray();
    }

    private function isTaskCorrect(array $task, string $userAnswer): bool
    {
        if ($userAnswer === '') {
            return false;
        }

        $answer = $task['answer'];
        if (is_array($answer)) {
            $normalized = array_map(fn ($v) => $this->normalize($v), $answer);
            return in_array($this->normalize($userAnswer), $normalized, true);
        }

        return $this->normalize($userAnswer) === $this->normalize((string)$answer);
    }

    private function normalize(string $v): string
    {
        return mb_strtolower(trim($v));
    }

    private function resolveBranchUnlockState(string $chapterId, ?string $selectedBranchId, array $chapter): array
    {
        $nextByBranch = [];
        foreach (($chapter['branch_options'] ?? []) as $option) {
            $branchId = (string) ($option['id'] ?? '');
            if ($branchId === '') {
                continue;
            }
            $nextByBranch[$branchId] = (string) ($option['next_chapter_id'] ?? '');
        }

        $nextChapterId = $selectedBranchId ? ($nextByBranch[$selectedBranchId] ?? '') : '';
        if ($nextChapterId === '' && !empty($chapter['next_chapter_id'])) {
            $nextChapterId = (string) $chapter['next_chapter_id'];
        }

        $isEndingChapter = preg_match('/-15$/', $chapterId) === 1;

        return [
            'selected_branch_id' => $selectedBranchId,
            'next_chapter_id' => $nextChapterId ?: null,
            'branch_count' => count($chapter['branch_options'] ?? []),
            'recommended_module' => $nextChapterId ? 'reading' : 'practice',
            'ending_id' => $isEndingChapter ? $selectedBranchId : null,
        ];
    }

    private function fallbackRegularBranch(array $chapter, ?string $selectedBranchId): ?string
    {
        $options = $chapter['branch_options'] ?? [];
        foreach ($options as $option) {
            $id = (string) ($option['id'] ?? '');
            if ($id === '' || $id === $selectedBranchId) {
                continue;
            }
            if (!str_contains($id, 'path_heretic')) {
                return $id;
            }
        }
        return $selectedBranchId;
    }

    private function resolveHiddenNodeByChapter(string $chapterId): ?string
    {
        preg_match('/^(R\d+)-/i', trim($chapterId), $match);
        $prefix = strtoupper($match[1] ?? '');
        $mainlineKey = self::CHAPTER_PREFIX_TO_MAINLINE[$prefix] ?? null;
        $hiddenNodeId = $mainlineKey ? (self::HIDDEN_NODE_MAPPING[$mainlineKey] ?? null) : null;

        if ($hiddenNodeId === null) {
            Log::warning('Missing hidden node mapping for chapter', [
                'chapter_id' => $chapterId,
                'chapter_prefix' => $prefix !== '' ? $prefix : null,
                'mainline_key' => $mainlineKey,
            ]);
        }

        return $hiddenNodeId;
    }

    private function decorateStoryMeta(array $chapters): array
    {
        $storyArcs = [
            'R1' => ['mainline' => 'chapter_1', 'name' => '宗门初启'],
            'R2' => ['mainline' => 'chapter_2', 'name' => '山门试炼'],
        ];

        $branchTemplates = [
            ['id' => 'path_guardian', 'label' => '守正之路', 'hint' => '稳扎稳打，重视基础与秩序'],
            ['id' => 'path_explorer', 'label' => '探秘之路', 'hint' => '偏探索与推理，收集线索更快'],
            ['id' => 'path_heretic', 'label' => '问心之路', 'hint' => '高风险高收益，道心波动更大'],
        ];

        $chapterIds = array_keys($chapters);
        sort($chapterIds);

        foreach ($chapterIds as $index => $chapterId) {
            $chapter = $chapters[$chapterId];
            [$arcPrefix] = explode('-', $chapterId);
            $arc = $storyArcs[$arcPrefix] ?? ['mainline' => 'chapter_3', 'name' => '终章'];

            $options = [];
            $isStoryHub = (($index + 1) % 5) === 0;
            if ($isStoryHub) {
                foreach ($branchTemplates as $template) {
                    $nextChapter = $chapterIds[$index + 1] ?? null;
                    $branchId = $chapterId . '_' . $template['id'];
                    $options[] = [
                        'id' => $branchId,
                        'label' => $template['label'],
                        'hint' => $template['hint'],
                        'next_chapter_id' => $nextChapter,
                        'reward_delta' => [
                            'lingqi' => 6,
                            'story_keys' => 1,
                            'daoxin' => 1,
                        ],
                    ];
                }
            }

            $chapters[$chapterId]['story_arc'] = $arc;
            $chapters[$chapterId]['unlock_requirements'] = [
                'min_accuracy' => self::PASS_THRESHOLD,
                'required_module' => 'reading',
            ];
            $chapters[$chapterId]['chapter_rewards'] = [
                'lingqi' => 4 + (($index + 1) % 3),
                'story_keys' => $isStoryHub ? 1 : 0,
                'daoxin' => 1,
                'collectible_id' => $isStoryHub ? 'scroll_' . strtolower(str_replace('-', '_', $chapterId)) : null,
            ];
            $chapters[$chapterId]['branch_options'] = $options;
            $chapters[$chapterId]['next_chapter_id'] = $chapterIds[$index + 1] ?? null;
        }

        return $chapters;
    }

    private function allChapters(): array
    {
        $chapters = [];

        $l1Data = [
            ['宗门院落', '晨练问候', 'Good morning! Ling and Mei greet Master Han in the yard. They practice breathing and count from one to ten together.', 'greet', 'Who do Ling and Mei greet?', 'Master Han'],
            ['宗门食堂', '灵粥时间', 'At noon, Ling eats rice porridge in the canteen. Mei brings soup. They sit by the window and talk about class.', 'canteen', 'Where do they eat lunch?', 'in the canteen'],
            ['灵兽森林', '小鹿脚印', 'Ling and Mei walk into the spirit forest. They find small deer footprints near the river and follow them slowly.', 'footprints', 'What do they find near the river?', ['deer footprints', 'small deer footprints']],
            ['师门小故事', '师兄的木剑', 'Senior Brother Zhou loses his wooden sword. Ling reads the notice and helps him search behind the old tree.', 'wooden sword', 'What did Senior Brother Zhou lose?', ['a wooden sword', 'wooden sword']],
            ['宗门院落', '风铃声', 'A wind chime rings at the gate. Mei says the sound means evening practice is about to begin.', 'rings', 'What does the wind chime sound mean?', ['evening practice is about to begin', 'evening practice begins']],
            ['宗门食堂', '点心配茶', 'After class, the canteen offers sweet buns and tea. Ling chooses tea, but Mei chooses warm milk.', 'chooses', 'What does Mei choose?', ['warm milk', 'milk']],
            ['灵兽森林', '迷路的小狐', 'A little fox looks afraid in the forest path. Ling kneels down and shows it the way back.', 'afraid', 'How does the little fox look?', ['afraid', 'it looks afraid']],
            ['师门小故事', '书卷比赛', 'Master Han asks students to read one short scroll each day. Ling finishes first and shares key words with friends.', 'scroll', 'What does Master Han ask students to read?', ['one short scroll each day', 'a short scroll each day']],
            ['宗门院落', '雨后清扫', 'After rain, the yard is wet and full of leaves. Mei sweeps the ground while Ling carries clean buckets.', 'sweeps', 'Who sweeps the ground?', ['Mei', 'mei']],
            ['宗门食堂', '今日菜单', 'Today menu has noodles, eggs, and green vegetables. Ling does not like eggs, so he takes extra vegetables.', 'vegetables', 'What does Ling take extra?', ['vegetables', 'extra vegetables']],
            ['灵兽森林', '石桥前停步', 'In the deep forest, a narrow stone bridge crosses cold water. The team stops and checks the map before crossing.', 'bridge', 'What do they check before crossing?', ['the map', 'map']],
            ['师门小故事', '迟到的解释', 'Junior Lin is late for class because he helps an old farmer carry wood. Master Han praises his kindness.', 'kindness', 'Why is Junior Lin late?', ['he helps an old farmer carry wood', 'he helped an old farmer carry wood']],
            ['宗门院落', '夜间巡灯', 'At night, Ling and Mei walk around the yard with lanterns. They make sure every corner is safe and bright.', 'lanterns', 'What do they carry at night?', ['lanterns', 'they carry lanterns']],
            ['宗门食堂', '节日汤圆', 'On festival day, the canteen cooks sweet rice balls. Students write wishes and hang them near the dining door.', 'festival', 'What do students write?', ['wishes', 'they write wishes']],
            ['师门小故事', '第一次演讲', 'Ling tells a short story in class. He is nervous at first, but he smiles and finishes clearly.', 'nervous', 'How does Ling feel at first?', ['nervous', 'he is nervous']],
        ];

        foreach ($l1Data as $idx => $item) {
            $no = str_pad((string)($idx + 1), 2, '0', STR_PAD_LEFT);
            [$scene, $title, $text, $targetWord, $compQuestion, $compAnswer] = $item;
            $id = "R1-{$no}";
            $chapters[$id] = [
                'id' => $id,
                'level' => 1,
                'scene' => $scene,
                'title' => $title,
                'difficulty' => $idx < 5 ? 1 : ($idx < 10 ? 2 : 3),
                'text' => $text,
                'vocabulary' => [$targetWord, 'Ling', 'Mei'],
                'tasks' => [
                    [
                        'id' => "{$id}-T1",
                        'type' => 'cloze',
                        'question' => "选词填空：The key word is ____.",
                        'blank' => 'The key word is ____.',
                        'options' => [$targetWord, 'mountain', 'teacher', 'morning'],
                        'answer' => $targetWord,
                    ],
                    [
                        'id' => "{$id}-T2",
                        'type' => 'comprehension',
                        'question' => $compQuestion,
                        'answer' => $compAnswer,
                    ],
                ],
                'rewards' => [
                    'xp' => 6 + ($idx % 3),
                    'spirit_stone' => 2 + ($idx % 2),
                    'item' => '法宝碎片',
                ],
            ];
        }

        $l2Data = [
            ['宗门院落', '晨课分组', 'Master Han divides students into three teams. Ling leads Team A and assigns reading roles.', 'assigns', 'verb', 'Why does Ling assign roles?', ['to organize team reading', 'organize team reading']],
            ['宗门课堂', '词性挑战', 'In class, students mark nouns, verbs, and adjectives from a short passage about spirit herbs.', 'nouns', 'noun', 'What do students mark in class?', ['nouns verbs and adjectives', 'nouns, verbs, and adjectives']],
            ['宗门食堂', '预算午餐', 'The canteen gives each team ten spirit coins. Mei calculates cost before ordering noodles and soup.', 'calculates', 'verb', 'Why does Mei calculate cost first?', ['because each team has a budget', 'they have a budget']],
            ['灵兽森林', '路径推理', 'Two paths lead to the same cave. One is short but muddy; the other is long but safe. Ling chooses the safer path.', 'safer', 'adjective', 'Why does Ling choose the longer path?', ['because it is safer', 'it is safe']],
            ['师门小故事', '失踪书页', 'A page disappears from the library scroll. Mei compares handwriting clues and finds who borrowed it.', 'clues', 'noun', 'How does Mei solve the problem?', ['by comparing handwriting clues', 'comparing handwriting clues']],
            ['宗门后山探险', '雾中石碑', 'Behind the mountain, mist covers old stone tablets. The team reads symbols to find the correct route.', 'symbols', 'noun', 'What helps the team find the route?', ['symbols on stone tablets', 'symbols']],
            ['宗门课堂', '因果句子', 'Teacher writes: If we water herbs daily, they grow faster. Students discuss cause and effect.', 'grow', 'verb', 'What is the effect in this sentence?', ['herbs grow faster', 'they grow faster']],
            ['宗门院落', '值日安排', 'A schedule board shows cleaning, watering, and guard tasks. Ling rearranges jobs when one student is sick.', 'rearranges', 'verb', 'Why does Ling rearrange jobs?', ['because one student is sick', 'one student is sick']],
            ['宗门后山探险', '夜行信号', 'At night, Mei notices three lantern flashes from the hill. She infers another team needs help.', 'infers', 'verb', 'What does Mei infer from the lantern flashes?', ['another team needs help', 'a team needs help']],
            ['灵兽森林', '水源判断', 'The map marks two springs. One is near fresh tracks, so Ling predicts animals will return soon.', 'fresh', 'adjective', 'Why does Ling predict animals will return?', ['because there are fresh tracks', 'fresh tracks are nearby']],
            ['宗门食堂', '食谱改进', 'Cooks test two soup recipes. Students vote and explain flavor reasons using adjectives.', 'flavor', 'noun', 'What do students explain when voting?', ['flavor reasons', 'reasons about flavor']],
            ['师门小故事', '误会澄清', 'Junior Lin thinks Mei took his notes, but later he finds them in his own bag and apologizes.', 'apologizes', 'verb', 'Why does Junior Lin apologize?', ['because he misunderstood mei', 'he misunderstood Mei']],
            ['宗门课堂', '推理问答', 'Teacher asks: If the bridge is broken and rain is coming, which shelter should we choose first?', 'shelter', 'noun', 'What skill does this question test?', ['simple reasoning', 'reasoning']],
            ['宗门后山探险', '回声定位', 'The team hears an echo from the left valley. Mei uses timing to locate a narrow cave entrance.', 'locate', 'verb', 'How does Mei locate the cave?', ['by using echo timing', 'using echo timing']],
            ['师门小故事', '结业分享', 'At the end of week, each team shares one lesson learned from mistakes and one improvement plan.', 'improvement', 'noun', 'What do teams share at week end?', ['a lesson learned and an improvement plan', 'lesson learned and improvement plan']],
        ];

        foreach ($l2Data as $idx => $item) {
            $no = str_pad((string)($idx + 1), 2, '0', STR_PAD_LEFT);
            [$scene, $title, $text, $targetWord, $pos, $reasoningQuestion, $reasoningAnswer] = $item;
            $id = "R2-{$no}";
            $chapters[$id] = [
                'id' => $id,
                'level' => 2,
                'scene' => $scene,
                'title' => $title,
                'difficulty' => $idx < 5 ? 2 : 3,
                'text' => $text,
                'vocabulary' => [$targetWord, 'reasoning', 'teamwork'],
                'tasks' => [
                    [
                        'id' => "{$id}-T1",
                        'type' => 'cloze',
                        'question' => "词性填空（{$pos}）：Choose the best word for ____.",
                        'blank' => 'Choose the best word for ____.',
                        'pos' => $pos,
                        'options' => [$targetWord, 'quickly', 'bright', 'student'],
                        'answer' => $targetWord,
                    ],
                    [
                        'id' => "{$id}-T2",
                        'type' => 'comprehension',
                        'question' => $reasoningQuestion,
                        'reasoning' => true,
                        'answer' => $reasoningAnswer,
                    ],
                ],
                'rewards' => [
                    'xp' => 8 + ($idx % 4),
                    'spirit_stone' => 3 + ($idx % 3),
                    'item' => '高阶法宝碎片',
                ],
            ];
        }

        return $this->decorateStoryMeta($chapters);
    }
}
