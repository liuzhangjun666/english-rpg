<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExamResult;
use App\Models\LearningRecord;
use App\Services\CurrencyService;
use App\Services\ExamService;
use App\Services\HeartDemonService;
use App\Services\RealmService;
use App\Support\CultivationProfile;
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
        $status = $this->realmService->getBreakthroughStatus($user);
        if (($user->current_realm ?? null) !== $status['current_realm']) {
            $user->current_realm = $status['current_realm'];
            $user->save();
            $user->refresh();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'realm' => $user->realm,
                'current_realm' => $status['current_realm'],
                'next_realm' => $status['next_realm'],
                'realm_name' => CultivationProfile::realmName((string) $user->realm),
                'stage' => $user->realm_stage,
                'spirit_power' => $user->spirit_power,
                'spirit_cost' => ExamService::SPIRIT_COST,
                'can_take' => $user->spirit_power >= ExamService::SPIRIT_COST,
                'breakthrough_status' => $status,
                'last_exam' => ExamResult::where('user_id', $user->id)
                    ->where('realm', $user->realm)
                    ->orderByDesc('created_at')
                    ->first(),
            ],
        ]);
    }

    /** POST /api/exam/breakthrough - 手动突破 */
    public function breakthrough(Request $request): JsonResponse
    {
        $user = $request->user();
        $status = $this->realmService->getBreakthroughStatus($user);

        if ($status['is_max_realm']) {
            return response()->json([
                'success' => false,
                'code' => 'REALM_MAX',
                'message' => '当前已达 MVP 最高境界',
                'data' => [
                    'status' => $status,
                ],
            ], 422);
        }

        if (!$status['can_breakthrough']) {
            return response()->json([
                'success' => false,
                'code' => 'BREAKTHROUGH_REQUIREMENTS_NOT_MET',
                'message' => '突破条件未满足',
                'data' => [
                    'status' => $status,
                    'missing_requirements' => $status['missing_requirements'],
                ],
            ], 422);
        }

        $result = $this->realmService->breakthrough($user);
        $fresh = $user->fresh();
        $latestStatus = $this->realmService->getBreakthroughStatus($fresh);

        return response()->json([
            'success' => true,
            'data' => [
                'breakthrough' => $result,
                'status' => $latestStatus,
                'user' => [
                    'realm' => $fresh->realm,
                    'realm_stage' => $fresh->realm_stage,
                    'current_realm' => $fresh->current_realm,
                    'cultivation_energy' => $fresh->cultivation_energy,
                    'vocabulary' => $fresh->vocabulary,
                    'grammar' => $fresh->grammar,
                    'reading' => $fresh->reading,
                    'listening' => $fresh->listening,
                    'writing' => $fresh->writing,
                    'speaking' => $fresh->speaking,
                ],
                'message' => $result['message'] ?? '突破成功',
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

        // 渡劫完成后仅返回突破资格，不自动执行突破
        $breakthroughStatus = $this->realmService->getBreakthroughStatus($user->fresh());

        // 记录渡劫结果
        ExamResult::create([
            'user_id' => $user->id,
            'realm' => $user->realm,
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
                'breakthrough' => null,
                'breakthrough_status' => $breakthroughStatus,
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
