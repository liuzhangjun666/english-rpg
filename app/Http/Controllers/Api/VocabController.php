<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LearningRecord;
use App\Models\Question;
use App\Models\VocabularyWord;
use App\Services\CurrencyService;
use App\Services\HeartDemonService;
use App\Services\PracticeLevelService;
use App\Services\RealmService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VocabController extends Controller
{
    private CurrencyService $currencyService;
    private HeartDemonService $demonService;
    private RealmService $realmService;

    private PracticeLevelService $levelService;

    public function __construct(
        CurrencyService $currencyService,
        HeartDemonService $demonService,
        RealmService $realmService,
        PracticeLevelService $levelService
    )
    {
        $this->currencyService = $currencyService;
        $this->demonService = $demonService;
        $this->realmService = $realmService;
        $this->levelService = $levelService;
    }

    /**
     * 获取一关词汇题（按当前境界对应年级题库划分关卡）
     * GET /api/vocab/questions?stage=01
     */
    public function questions(Request $request): JsonResponse
    {
        $stageNo = $this->levelService->parseStageNo($request->query('stage', 1));
        $user = $request->user();
        $this->currencyService->recoverSpiritPower($user);
        $user->refresh();

        $layout = $this->levelService->getStageLayout($user, 'vocab');
        $normalCount = PracticeLevelService::PER_SESSION['vocab'];
        $words = $this->levelService->getStageQuestions($user, 'vocab', $stageNo);
        if ($words->isEmpty()) {
            return response()->json(['success'=>false,'code'=>'NO_QUESTIONS','message'=>'该关卡暂无题目'], 404);
        }

        $normalQuestions = $this->buildQuestionsFromWords($words);
        $allQuestions = $this->injectDemonWords($user->id, $normalQuestions, $normalCount, (string) ($user->realm ?? 'L1'));

        if (empty($allQuestions)) {
            return response()->json(['success'=>false,'code'=>'NO_QUESTIONS','message'=>'该关卡暂无题目'], 404);
        }
        $spiritCost = CurrencyService::SPIRIT_COST_PER_LEVEL;

        $demonCount = count(array_filter($allQuestions, fn($q) => !empty($q['_is_demon'])));
        $stageMeta = collect($layout['stages'])->firstWhere('stage_no', $stageNo) ?? [];

        return response()->json([
            'success' => true,
            'data' => [
                'level' => $layout['realm'],
                'stage' => $stageMeta['stage_code'] ?? str_pad((string) $stageNo, 2, '0', STR_PAD_LEFT),
                'stage_no' => $stageNo,
                'current_realm' => $layout['current_realm'],
                'grade_labels' => $layout['grade_labels'],
                'level_id' => $stageMeta['level_id'] ?? sprintf('%s-%02d', $layout['realm'], $stageNo),
                'questions' => $allQuestions,
                'total' => count($allQuestions),
                'spirit_cost' => $spiritCost,
                'current_spirit_power' => (int) ($user->fresh()->spirit_power ?? 0),
                'demon_injected' => $demonCount,
            ],
        ]);
    }

    /**
     * 批量提交
     * POST /api/vocab/submit-batch
     */
    public function submitBatch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'level' => 'required|string',
            'stage' => 'required|string',
            'answers' => 'required|array',
            'answers.*.question_id' => 'required|string',
            'answers.*.answer' => 'required|string',
            'answers.*.answer_text' => 'nullable|string|max:255',
            'reported_wrong_ids' => 'sometimes|array',
            'reported_wrong_ids.*' => 'string',
        ]);

        $user = $request->user();
        $reportedWrongIds = collect($data['reported_wrong_ids'] ?? [])->flip();

        // 逐题判分
        $results = [];
        foreach ($data['answers'] as $ans) {
            $qid = (string) ($ans['question_id'] ?? '');
            $answerText = trim((string) ($ans['answer_text'] ?? ''));
            $correct = $this->isVocabAnswerCorrect($qid, $answerText);
            $results[] = [
                'question_id' => $qid,
                'correct' => $correct,
            ];

            // 记录学习日志
            LearningRecord::create([
                'user_id' => $user->id,
                'activity_type' => 'vocab',
                'activity_id' => $data['level'] . '-' . $data['stage'],
                'question_id' => $qid,
                'is_correct' => $correct,
                'exp_gained' => $correct ? CurrencyService::EXP_PER_CORRECT : 0,
                'spirit_cost' => CurrencyService::SPIRIT_COST_PER_QUESTION,
                'time_spent' => 0,
                'answer_data' => $ans,
            ]);

            // 答错 → 自动收入心魔录
            if (!$correct) {
                if (!isset($reportedWrongIds[$qid])) {
                    $this->demonService->recordWrong($user->id, $qid, 'vocab', (string) ($user->realm ?? 'L1'));
                }
            } else {
                $this->demonService->recordCorrect($user->id, $qid);
            }
        }

        // 经济结算
        $settlement = $this->currencyService->settleBatch($user, $results, count($data['answers']), 0);
        $correctCount = count(array_filter($results, fn (array $item) => !empty($item['correct'])));
        $realmProgress = $this->realmService->applyCultivationGain($user, 'vocabulary', $correctCount);

        return response()->json([
            'success' => true,
            'data' => [
                'results' => $results,
                'total_exp' => $settlement['exp_gained'],
                'total_spirit_cost' => $settlement['spirit_cost'],
                'accuracy' => $settlement['accuracy'],
                'passed' => $settlement['passed'],
                'stones_gained' => $settlement['stones_gained'],
                'correct_count' => $correctCount,
                'realm_progress' => $realmProgress,
            ],
        ]);
    }

    private function buildQuestionsFromWords($words): array
    {
        $allMeaningsPool = VocabularyWord::query()
            ->whereNotNull('meanings')
            ->where('meanings', '<>', 'null')
            ->inRandomOrder()
            ->limit(500)
            ->get();

        $distractors = [];
        foreach ($allMeaningsPool as $w) {
            $meanings = is_array($w->meanings) ? $w->meanings : [];
            foreach ($meanings as $m) {
                $m = trim((string) $m);
                if ($m !== '') {
                    $distractors[] = $m;
                }
            }
        }

        $questions = [];
        foreach ($words as $word) {
            $meanings = is_array($word->meanings) ? $word->meanings : [];
            $meanings = array_values(array_filter(array_map(fn ($v) => trim((string) $v), $meanings)));
            if (empty($meanings)) {
                continue;
            }
            $correctText = $meanings[0];

            $opts = [$correctText];
            shuffle($distractors);
            foreach ($distractors as $d) {
                if (count($opts) >= 4) {
                    break;
                }
                if ($d === '' || in_array($d, $opts, true)) {
                    continue;
                }
                $opts[] = $d;
            }
            while (count($opts) < 4) {
                $opts[] = $correctText;
            }

            shuffle($opts);
            $labels = ['A', 'B', 'C', 'D'];
            $options = [];
            $correctKey = 'A';
            foreach ($labels as $i => $key) {
                $options[$key] = (string) ($opts[$i] ?? '');
                if ($options[$key] === $correctText) {
                    $correctKey = $key;
                }
            }

            $questions[] = [
                'question_id' => 'VW-' . (string) $word->id,
                'type' => 'vocab',
                'word' => (string) $word->lemma,
                'question' => '"' . (string) $word->lemma . '" 的中文意思是？',
                'options' => $options,
                'correct_answer' => $correctKey,
                'explanation' => implode('；', $meanings),
            ];
        }

        return $questions;
    }

    private function injectDemonWords(int $userId, array $normalQuestions, int $normalCount, string $realmCode): array
    {
        $demonCount = (int) round($normalCount * HeartDemonService::INJECTION_RATIO);
        if ($demonCount > 0) {
            $demonCount = max(1, $demonCount);
        }
        $demons = $this->demonService->getPendingDemons($userId, $demonCount, 'vocab', $realmCode);
        $injected = [];

        foreach ($demons as $demon) {
            $qid = (string) ($demon['question_id'] ?? '');
            $lemma = (string) ($demon['word'] ?? '');
            $word = null;
            if (preg_match('/^VW-(\d+)$/', $qid, $m)) {
                $word = VocabularyWord::query()->find((int) $m[1]);
            }
            if (!$word && $lemma !== '') {
                $word = VocabularyWord::query()->where('lemma', $lemma)->first();
            }
            if (!$word) {
                continue;
            }
            $qArr = $this->buildQuestionsFromWords(collect([$word]));
            if (!empty($qArr[0])) {
                $qArr[0]['_is_demon'] = true;
                $qArr[0]['_demon_wrong_count'] = $demon['wrong_count'] ?? 0;
                $injected[] = $qArr[0];
            }
        }

        $injectedIds = array_column($injected, 'question_id');
        $remaining = array_values(array_filter($normalQuestions, fn ($q) => !in_array($q['question_id'], $injectedIds, true)));
        shuffle($remaining);
        $keepCount = $normalCount - count($injected);
        $normal = array_slice($remaining, 0, max(0, $keepCount));
        $all = array_merge($normal, $injected);
        shuffle($all);
        return $all;
    }

    private function isVocabAnswerCorrect(string $questionId, string $answerText): bool
    {
        if ($answerText === '') {
            return false;
        }
        if (!preg_match('/^VW-(\d+)$/', $questionId, $m)) {
            return false;
        }
        $word = VocabularyWord::query()->find((int) $m[1]);
        if (!$word) {
            return false;
        }
        $meanings = is_array($word->meanings) ? $word->meanings : [];
        $normalized = mb_strtolower(trim($answerText));
        foreach ($meanings as $mng) {
            if (mb_strtolower(trim((string) $mng)) === $normalized) {
                return true;
            }
        }
        return false;
    }
}
