<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LearningRecord;
use App\Models\VocabProgress;
use App\Services\HeartDemonService;
use App\Services\QuestionResolverService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function __construct(
        private readonly HeartDemonService $demonService,
        private readonly QuestionResolverService $questionResolver,
    ) {
    }

    /**
     * 获取错题列表（从 learning_records 提取）
     * GET /api/review/list
     */
    public function list(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $wrongQids = LearningRecord::where('user_id', $userId)
            ->where('is_correct', false)
            ->whereIn('activity_type', ['vocab', 'grammar', 'listening', 'speaking', 'reading', 'writing', 'exam'])
            ->selectRaw('question_id, MAX(created_at) as latest')
            ->groupBy('question_id')
            ->orderByDesc('latest')
            ->limit(30)
            ->pluck('question_id');

        if ($wrongQids->isEmpty()) {
            return response()->json([
                'success' => true,
                'data' => ['questions' => [], 'total' => 0],
            ]);
        }

        $questions = $this->questionResolver->resolveMany($wrongQids);

        return response()->json([
            'success' => true,
            'data' => [
                'questions' => $questions,
                'total' => count($questions),
            ],
        ]);
    }

    /**
     * 提交复习答案（不消耗灵力）
     * POST /api/review/submit
     */
    public function submit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'answers' => 'required|array',
            'answers.*.question_id' => 'required|string',
            'answers.*.answer' => 'required|string',
            'answers.*.answer_text' => 'nullable|string|max:255',
        ]);

        $userId = $request->user()->id;
        $results = [];

        foreach ($data['answers'] as $ans) {
            $qid = (string) ($ans['question_id'] ?? '');
            $answerText = isset($ans['answer_text']) ? (string) $ans['answer_text'] : null;
            $resolved = $this->questionResolver->resolve($qid);
            $correct = $this->questionResolver->isCorrect($qid, (string) ($ans['answer'] ?? ''), $answerText);

            $results[] = [
                'question_id' => $qid,
                'correct' => $correct,
                'explanation' => $resolved['explanation'] ?? null,
            ];

            if ($resolved) {
                $wordKey = (string) ($resolved['word'] ?? $qid);
                VocabProgress::updateOrCreate(
                    ['user_id' => $userId, 'word' => $wordKey],
                    [
                        'status' => $correct ? 'learning' : 'forgotten',
                        'mastery_score' => $correct
                            ? \DB::raw('LEAST(mastery_score + 20, 100)')
                            : \DB::raw('GREATEST(mastery_score - 10, 0)'),
                        'correct_count' => $correct ? \DB::raw('correct_count + 1') : \DB::raw('correct_count'),
                        'error_count' => $correct ? \DB::raw('error_count') : \DB::raw('error_count + 1'),
                        'last_reviewed_at' => now(),
                    ]
                );

                if ($correct) {
                    $this->demonService->recordCorrect($userId, $qid);
                } else {
                    $this->demonService->recordWrong(
                        $userId,
                        $qid,
                        (string) ($resolved['type'] ?? 'vocab'),
                        (string) ($resolved['realm'] ?? null)
                    );
                }
            }
        }

        $correctCount = count(array_filter($results, fn ($r) => $r['correct']));
        $accuracy = count($results) > 0 ? round(($correctCount / count($results)) * 100) : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'results' => $results,
                'correct_count' => $correctCount,
                'total' => count($results),
                'accuracy' => $accuracy,
            ],
        ]);
    }
}
