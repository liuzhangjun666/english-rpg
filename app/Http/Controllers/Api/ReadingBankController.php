<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LearningRecord;
use App\Models\ReadingPassage;
use App\Services\CurrencyService;
use App\Services\HeartDemonService;
use App\Services\RealmService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReadingBankController extends Controller
{
    public function __construct(
        private readonly CurrencyService $currencyService,
        private readonly HeartDemonService $demonService,
        private readonly RealmService $realmService,
        private readonly \App\Services\QuestionResolverService $questionResolver,
    ) {
    }

    /**
     * GET /api/reading/questions?level=L1&stage=01
     * 返回：文章 + 题目列表
     */
    public function questions(Request $request): JsonResponse
    {
        $level = strtoupper(trim((string) $request->query('level', 'L1')));
        $stage = str_pad((string) $request->query('stage', '01'), 2, '0', STR_PAD_LEFT);

        $user = $request->user();
        $this->currencyService->recoverSpiritPower($user);
        $user->refresh();

        $passage = ReadingPassage::query()
            ->where('realm', $level)
            ->where('stage', $stage)
            ->orderBy('id')
            ->with(['questions' => function ($q) {
                $q->orderBy('question_no');
            }])
            ->first();

        if (!$passage) {
            return response()->json([
                'success' => false,
                'code' => 'NO_PASSAGE',
                'message' => '该关卡暂无阅读文章',
            ], 404);
        }

        $questions = $passage->questions->map(function ($q) use ($passage) {
            $options = $q->options ?? null;
            if (empty($options)) {
                // 兼容当前藏经阁 T/F 玩法：没有选项时，构造“正确项 + 错误项”
                $correct = trim((string) $q->correct_answer);
                $wrong = $correct === '' ? 'N/A' : ($correct . '（误）');
                $options = [
                    'A' => $correct,
                    'B' => $wrong,
                ];
            }
            return [
                'question_id' => 'RQ-' . (string) $q->id,
                'question_type' => $q->question_type,
                'question' => $q->question,
                'options' => $options,
                'correct_answer' => $q->correct_answer,
                'explanation' => $q->explanation,
                'clue_sentence' => $this->clueSentence(
                    (string) $passage->content,
                    (string) $q->question,
                    (int) $q->question_no,
                ),
                'reading_passage' => $q->passage?->content,
                'passage_id' => 'RP-' . (string) $q->passage_id,
                'question_no' => (int) $q->question_no,
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => [
                'level' => $level,
                'stage' => $stage,
                'passage' => [
                    'passage_id' => 'RP-' . (string) $passage->id,
                    'title' => $passage->title,
                    'content' => $passage->content,
                    'meta' => $passage->meta,
                ],
                'questions' => $questions,
                'total' => $questions->count(),
                'spirit_cost' => CurrencyService::SPIRIT_COST_PER_LEVEL,
                'current_spirit_power' => (int) ($user->fresh()->spirit_power ?? 0),
            ],
        ]);
    }

    /**
     * POST /api/reading/submit-batch
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
        ]);

        $user = $request->user();
        $results = [];

        foreach ($data['answers'] as $ans) {
            $qid = (string) ($ans['question_id'] ?? '');
            $answerText = isset($ans['answer_text']) ? (string) $ans['answer_text'] : null;
            $correct = $this->questionResolver->isCorrect($qid, (string) ($ans['answer'] ?? ''), $answerText);
            $resolved = $this->questionResolver->resolve($qid);

            $results[] = [
                'question_id' => $qid,
                'correct' => $correct,
                'explanation' => $resolved['explanation'] ?? null,
            ];

            LearningRecord::create([
                'user_id' => $user->id,
                'activity_type' => 'reading',
                'activity_id' => $data['level'] . '-' . $data['stage'],
                'question_id' => $qid,
                'is_correct' => $correct,
                'exp_gained' => $correct ? CurrencyService::EXP_PER_CORRECT : 0,
                'spirit_cost' => CurrencyService::SPIRIT_COST_PER_QUESTION,
                'time_spent' => 0,
                'answer_data' => $ans,
            ]);

            if ($correct) {
                $this->demonService->recordCorrect($user->id, $qid);
            } else {
                $this->demonService->recordWrong(
                    $user->id,
                    $qid,
                    'reading',
                    (string) ($resolved['realm'] ?? $data['level'])
                );
            }
        }

        $settlement = $this->currencyService->settleBatch($user, $results, count($data['answers']), 0);
        $correctCount = count(array_filter($results, fn (array $item) => !empty($item['correct'])));
        $realmProgress = $this->realmService->applyCultivationGain($user, 'reading', $correctCount);

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

    private function clueSentence(string $passage, string $question, int $questionNo): string
    {
        $passage = trim($passage);
        $question = strtolower(trim($question));
        $sentences = preg_split('/(?<=[.!?])\s+/', $passage) ?: [];
        $sentences = array_values(array_filter(array_map('trim', $sentences)));
        if ($sentences === []) {
            return $passage;
        }

        if (str_contains($question, 'what pet') || str_contains($question, 'who') || str_contains($question, 'where')) {
            foreach ($sentences as $sentence) {
                if (preg_match('/pet|name|have/i', $sentence)) {
                    return $sentence;
                }
            }
            return $sentences[0];
        }

        if (str_contains($question, 'play') || str_contains($question, 'garden') || str_contains($question, 'morning')) {
            foreach ($sentences as $sentence) {
                if (preg_match('/garden|play|morning|feed/i', $sentence)) {
                    return $sentence;
                }
            }
            return $sentences[1] ?? $sentences[0];
        }

        if (str_contains($question, 'why') || str_contains($question, 'friend')) {
            foreach ($sentences as $sentence) {
                if (preg_match('/friend|friendly|cute|because/i', $sentence)) {
                    return $sentence;
                }
            }
            return $sentences[count($sentences) - 1];
        }

        $index = max(0, min($questionNo - 1, count($sentences) - 1));
        return $sentences[$index];
    }
}

