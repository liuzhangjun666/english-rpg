<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LearningRecord;
use App\Models\Question;
use App\Models\VocabProgress;
use App\Services\HeartDemonService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function __construct(private readonly HeartDemonService $demonService)
    {
    }

    /**
     * 获取错题列表（从 learning_records 提取）
     * GET /api/review/list
     */
    public function list(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        // 获取最近答错的题目ID（去重，取最新记录）
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

        $questions = Question::whereIn('question_id', $wrongQids)
            ->get(['id', 'question_id', 'type', 'question', 'options', 'correct_answer', 'word', 'explanation']);

        return response()->json([
            'success' => true,
            'data' => [
                'questions' => $questions,
                'total' => $questions->count(),
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
        ]);

        $userId = $request->user()->id;
        $results = [];

        foreach ($data['answers'] as $ans) {
            $question = Question::where('question_id', $ans['question_id'])->first();
            $correct = $question && $question->correct_answer === $ans['answer'];
            $results[] = [
                'question_id' => $ans['question_id'],
                'correct' => $correct,
                'explanation' => $question?->explanation,
            ];

            // 更新词汇进度
            if ($question) {
                VocabProgress::updateOrCreate(
                    ['user_id' => $userId, 'word' => $question->word ?? $question->question_id],
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
                    $this->demonService->recordCorrect($userId, $ans['question_id']);
                } else {
                    $this->demonService->recordWrong(
                        $userId,
                        $ans['question_id'],
                        $question->type,
                        $question->realm
                    );
                }
            }
        }

        $correctCount = count(array_filter($results, fn($r) => $r['correct']));
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
