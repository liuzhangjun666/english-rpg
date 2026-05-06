<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HeartDemon;
use App\Models\Question;
use App\Services\HeartDemonService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HeartDemonController extends Controller
{
    private HeartDemonService $demonService;
    public function __construct(HeartDemonService $demonService) { $this->demonService = $demonService; }

    /** GET /api/demons/list - 用户所有未掌握心魔 */
    public function list(Request $request): JsonResponse
    {
        $demons = HeartDemon::where('user_id', $request->user()->id)
            ->where('is_mastered', false)
            ->orderByDesc('wrong_count')
            ->get();

        $questions = [];
        foreach ($demons as $d) {
            $q = Question::where('question_id', $d->question_id)->first();
            if ($q) {
                $qa = $q->toArray();
                $qa['_demon'] = $d->toArray();
                $questions[] = $qa;
            }
        }

        return response()->json([
            'success' => true,
            'data' => ['total' => count($questions), 'questions' => $questions],
        ]);
    }

    /** GET /api/demons/pre-exam - 渡劫前强制心魔复习题 */
    public function preExam(Request $request): JsonResponse
    {
        $user = $request->user();
        $questions = $this->demonService->getPreExamReview($user->id, $user->realm, 5);
        return response()->json([
            'success' => true,
            'data' => ['total' => count($questions), 'questions' => $questions],
        ]);
    }

    /** POST /api/demons/review-submit - 渡劫前心魔复习提交 */
    public function reviewSubmit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'answers' => 'required|array',
            'answers.*.question_id' => 'required|string',
            'answers.*.answer' => 'required|string',
        ]);

        $user = $request->user();
        $correctCount = 0;
        foreach ($data['answers'] as $ans) {
            $question = Question::where('question_id', $ans['question_id'])->first();
            $correct = $question && $question->correct_answer === $ans['answer'];
            if ($correct) {
                $correctCount++;
                $this->demonService->recordCorrect($user->id, $ans['question_id']);
            }
        }

        return response()->json([
            'success' => true,
            'data' => ['correct_count' => $correctCount, 'total' => count($data['answers'])],
        ]);
    }

    /** POST /api/demons/clear-mastered - 清除已掌握心魔 */
    public function clearMastered(Request $request): JsonResponse
    {
        $count = HeartDemon::where('user_id', $request->user()->id)
            ->where('is_mastered', true)->delete();
        return response()->json(['success'=>true, 'data'=>['deleted'=>$count]]);
    }
}
