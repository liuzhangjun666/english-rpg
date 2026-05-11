<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExamResult;
use App\Models\LearningRecord;
use App\Services\CurrencyService;
use App\Services\ExamService;
use App\Services\HeartDemonService;
use App\Services\RealmService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamController extends Controller
{
    private ExamService $examService;
    private CurrencyService $currencyService;
    private RealmService $realmService;
    private HeartDemonService $demonService;

    public function __construct(
        ExamService $examService,
        CurrencyService $currencyService,
        RealmService $realmService,
        HeartDemonService $demonService
    )
    {
        $this->examService = $examService;
        $this->currencyService = $currencyService;
        $this->realmService = $realmService;
        $this->demonService = $demonService;
    }

    /** GET /api/exam/current - 获取当前渡劫信息 */
    public function current(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'realm' => $user->realm,
                'realm_name' => RealmService::REALM_NAMES[$user->realm] ?? $user->realm,
                'stage' => $user->realm_stage,
                'spirit_power' => $user->spirit_power,
                'spirit_cost' => ExamService::SPIRIT_COST,
                'can_take' => $user->spirit_power >= ExamService::SPIRIT_COST,
                'last_exam' => ExamResult::where('user_id', $user->id)
                    ->where('realm', $user->realm)
                    ->orderByDesc('created_at')
                    ->first(),
            ],
        ]);
    }

    /** POST /api/exam/start - 开始渡劫 */
    public function start(Request $request): JsonResponse
    {
        $user = $request->user();

        $check = $this->examService->canTakeExam($user, $user->realm);
        if (!$check['allowed']) {
            return response()->json([
                'success' => false,
                'code' => 'INSUFFICIENT_SPIRIT_POWER',
                'message' => $check['reason'],
            ], 422);
        }

        $questions = $this->examService->pickQuestions($user->realm);

        return response()->json([
            'success' => true,
            'data' => [
                'realm' => $user->realm,
                'total' => count($questions),
                'questions' => $questions,
                'time_limit' => 600, // 10分钟
            ],
        ]);
    }

    /** POST /api/exam/submit - 提交渡劫答案 */
    public function submit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'answers' => 'required|array',
            'answers.*.question_id' => 'required|string',
            'answers.*.answer' => 'required|string',
            'time_spent' => 'nullable|integer',
        ]);

        $user = $request->user();

        // 扣除灵力
        if (!$this->currencyService->consumeSpirit($user, ExamService::SPIRIT_COST)) {
            return response()->json([
                'success' => false,
                'code' => 'INSUFFICIENT_SPIRIT_POWER',
                'message' => '灵力不足',
            ], 422);
        }

        // 逐题判分
        $results = [];
        foreach ($data['answers'] as $ans) {
            $question = \App\Models\Question::where('question_id', $ans['question_id'])->first();
            $correct = $question && $question->correct_answer === $ans['answer'];
            $results[] = ['question_id' => $ans['question_id'], 'correct' => $correct];

            LearningRecord::create([
                'user_id' => $user->id,
                'activity_type' => 'exam',
                'activity_id' => $user->realm,
                'question_id' => $ans['question_id'],
                'is_correct' => $correct,
                'exp_gained' => 0,
                'spirit_cost' => 0,
                'time_spent' => 0,
                'answer_data' => $ans,
            ]);

            if ($question) {
                if (!$correct) {
                    $this->demonService->recordWrong(
                        $user->id,
                        $ans['question_id'],
                        $question->type,
                        $question->realm ?? $user->realm
                    );
                } else {
                    $this->demonService->recordCorrect($user->id, $ans['question_id']);
                }
            }
        }

        // 评级
        $gradeResult = $this->examService->grade($results);
        $reward = $this->examService->calculateReward($gradeResult);

        // 发放奖励
        $user->increment('exp', $reward['exp_gained']);
        $user->increment('spirit_stone', $reward['stones_gained']);
        $user->save();

        // 如果渡劫通过，尝试突破
        $breakthrough = null;
        if ($gradeResult['passed']) {
            $bt = $this->realmService->canBreakthrough($user);
            if ($bt['can']) {
                $breakthrough = $this->realmService->breakthrough($user);
            }
        }

        // 记录渡劫结果
        ExamResult::create([
            'user_id' => $user->id,
            'realm' => $gradeResult['passed'] ? ($breakthrough['new_realm'] ?? $user->realm) : $user->realm,
            'score' => $gradeResult['score'],
            'total_questions' => $gradeResult['total'],
            'correct_count' => $gradeResult['correct'],
            'time_spent' => $data['time_spent'] ?? 0,
            'grade' => $gradeResult['grade'],
            'passed' => $gradeResult['passed'],
            'breakdown' => ['results' => $results],
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'grade_result' => $gradeResult,
                'reward' => $reward,
                'breakthrough' => $breakthrough,
                'current_realm' => $user->fresh()->realm,
                'current_stage' => $user->fresh()->realm_stage,
            ],
        ]);
    }

    /** GET /api/exam/history - 渡劫历史 */
    public function history(Request $request): JsonResponse
    {
        $records = ExamResult::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $records,
        ]);
    }
}
