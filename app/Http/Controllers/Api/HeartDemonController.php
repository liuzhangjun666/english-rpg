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
    public function __construct(HeartDemonService $demonService)
    {
        $this->demonService = $demonService;
    }

    /** GET /api/demons - 用户所有未掌握心魔 */
    public function index(Request $request): JsonResponse
    {
        return $this->list($request);
    }


    /** GET /api/demons/list - 鐢ㄦ埛鎵€鏈夋湭鎺屾彙蹇冮瓟 */
    public function list(Request $request): JsonResponse
    {
        $demons = HeartDemon::where('user_id', $request->user()->id)
            ->where('is_mastered', false)
            ->orderByDesc('wrong_count')
            ->get();

        $items = [];
        $questions = [];
        foreach ($demons as $d) {
            $q = Question::where('question_id', $d->question_id)->first();
            $items[] = [
                'demon' => $d->toArray(),
                'question' => $q?->toArray(),
            ];
            if ($q) {
                $qa = $q->toArray();
                $qa['_demon'] = $d->toArray();
                $questions[] = $qa;
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total' => count($items),
                'demons' => $items,
                // keep legacy field for compatibility
                'questions' => $questions,
            ],
        ]);
    }

    /** GET /api/demons/pre-exam - 娓″姭鍓嶅己鍒跺績榄斿涔犻 */
    public function preExam(Request $request): JsonResponse
    {
        $user = $request->user();
        $questions = $this->demonService->getPreExamReview($user->id, $user->realm, 5);
        return response()->json([
            'success' => true,
            'data' => ['total' => count($questions), 'questions' => $questions],
        ]);
    }

    /** POST /api/demons/review-submit - 娓″姭鍓嶅績榄斿涔犳彁浜?*/
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
            } elseif ($question) {
                $this->demonService->recordWrong(
                    $user->id,
                    $ans['question_id'],
                    $question->type,
                    $question->realm ?? $user->realm
                );
            }
        }

        return response()->json([
            'success' => true,
            'data' => ['correct_count' => $correctCount, 'total' => count($data['answers'])],
        ]);
    }

    /** POST /api/demons/report-wrong - 答错即时写入心魔录 */
    public function reportWrong(Request $request): JsonResponse
    {
        $data = $request->validate([
            'question_id' => 'required|string',
            'type' => 'nullable|string',
            'level' => 'nullable|string',
        ]);

        $user = $request->user();
        $question = Question::where('question_id', $data['question_id'])->first();
        if (!$question) {
            return response()->json([
                'success' => false,
                'code' => 'QUESTION_NOT_FOUND',
                'message' => '题目不存在',
            ], 404);
        }

        $type = $question->type ?: ($data['type'] ?? 'vocab');
        $realm = $question->realm ?: ($data['level'] ?? $user->realm);

        $this->demonService->recordWrong($user->id, $question->question_id, $type, $realm);

        return response()->json([
            'success' => true,
            'data' => ['question_id' => $question->question_id],
        ]);
    }

    /** POST /api/demons/clear-mastered - 娓呴櫎宸叉帉鎻″績榄?*/
    public function clearMastered(Request $request): JsonResponse
    {
        $count = HeartDemon::where('user_id', $request->user()->id)
            ->where('is_mastered', true)->delete();
        return response()->json(['success'=>true, 'data'=>['deleted'=>$count]]);
    }
}

