<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HeartDemon;
use App\Models\Question;
use App\Services\HeartDemonService;
use App\Services\QuestionResolverService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HeartDemonController extends Controller
{
    private HeartDemonService $demonService;
    public function __construct(
        HeartDemonService $demonService,
        private readonly QuestionResolverService $questionResolver,
    )
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
            $resolved = $this->questionResolver->resolve((string) $d->question_id);
            if (!$resolved) {
                $q = Question::where('question_id', $d->question_id)->first();
                $resolved = $q?->toArray();
            }
            $items[] = [
                'demon' => $d->toArray(),
                'question' => $resolved,
            ];
            if ($resolved) {
                $qa = $resolved;
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

    /** POST /api/demons/review-submit - 渡劫前心魔复习提交 */
    public function reviewSubmit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'answers' => 'required|array',
            'answers.*.question_id' => 'required|string',
            'answers.*.answer' => 'required|string',
            'encounter_type' => 'nullable|string',
            'time_spent' => 'nullable|integer',
        ]);

        $user = $request->user();
        
        $encounterType = $data['encounter_type'] ?? 'manual';
        $timeSpent = $data['time_spent'] ?? 0;
        
        $result = $this->demonService->evaluateDemonTrial($user->id, $data['answers'], $encounterType, (int)$timeSpent);

        return response()->json([
            'success' => true,
            'data' => [
                'correct_count' => $result['correct_count'], 
                'total' => $result['total']
            ],
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
        $recorded = $this->recordWrongForUser($user, (string) $data['question_id'], $data['type'] ?? null, $data['level'] ?? null);
        if (!$recorded) {
            return response()->json([
                'success' => false,
                'code' => 'QUESTION_NOT_FOUND',
                'message' => '题目不存在',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => ['question_id' => $data['question_id']],
        ]);
    }

    /** POST /api/demons/report-wrongs - 批量写入心魔录（试炼拼错/跳过等） */
    public function reportWrongs(Request $request): JsonResponse
    {
        $data = $request->validate([
            'question_ids' => 'required|array',
            'question_ids.*' => 'string',
            'type' => 'nullable|string',
            'level' => 'nullable|string',
        ]);

        $user = $request->user();
        $recorded = [];
        foreach ($data['question_ids'] as $questionId) {
            if ($this->recordWrongForUser($user, (string) $questionId, $data['type'] ?? null, $data['level'] ?? null)) {
                $recorded[] = (string) $questionId;
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'recorded' => $recorded,
                'total' => count($recorded),
            ],
        ]);
    }

    private function recordWrongForUser($user, string $questionId, ?string $typeOverride = null, ?string $levelOverride = null): bool
    {
        $questionId = trim($questionId);
        if ($questionId === '') {
            return false;
        }

        $resolved = $this->questionResolver->resolve($questionId);
        if ($resolved) {
            $type = $typeOverride ?: (string) ($resolved['type'] ?? 'vocab');
            $realm = $levelOverride ?: (string) ($resolved['realm'] ?? $user->realm ?? 'L1');
            $this->demonService->recordWrong($user->id, $questionId, $type, $realm);

            return true;
        }

        $question = Question::where('question_id', $questionId)->first();
        if (!$question) {
            return false;
        }

        $type = $typeOverride ?: ($question->type ?: 'vocab');
        $realm = $levelOverride ?: ($question->realm ?: $user->realm);
        $this->demonService->recordWrong($user->id, $question->question_id, $type, $realm);

        return true;
    }

    /** POST /api/demons/clear-mastered - 娓呴櫎宸叉帉鎻″績榄?*/
    public function clearMastered(Request $request): JsonResponse
    {
        $count = HeartDemon::where('user_id', $request->user()->id)
            ->where('is_mastered', true)->delete();
        return response()->json(['success'=>true, 'data'=>['deleted'=>$count]]);
    }
}

