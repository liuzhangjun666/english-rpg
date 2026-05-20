<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LearningRecord;
use App\Models\Question;
use App\Services\CurrencyService;
use App\Services\HeartDemonService;
use App\Services\RealmService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VocabController extends Controller
{
    private CurrencyService $currencyService;
    private HeartDemonService $demonService;
    private RealmService $realmService;

    public function __construct(
        CurrencyService $currencyService,
        HeartDemonService $demonService,
        RealmService $realmService
    )
    {
        $this->currencyService = $currencyService;
        $this->demonService = $demonService;
        $this->realmService = $realmService;
    }

    /**
     * 获取一关词汇题
     * GET /api/vocab/questions?level=L1&stage=01
     */
    public function questions(Request $request): JsonResponse
    {
        $level = $request->query('level', 'L1');
        $stage = $request->query('stage', '01');
        $user = $request->user();
        $this->currencyService->recoverSpiritPower($user);
        $user->refresh();

        // 心魔注入：正常题 + 混入心魔题（20%）
        $normalCount = 15;
        $allQuestions = $this->demonService->getInjectedQuestions($user->id, 'vocab', $level, $stage, $normalCount);

        if (empty($allQuestions)) {
            return response()->json(['success'=>false,'code'=>'NO_QUESTIONS','message'=>'该关卡暂无题目'], 404);
        }
        $spiritCost = CurrencyService::SPIRIT_COST_PER_LEVEL;

        $demonCount = count(array_filter($allQuestions, fn($q) => !empty($q['_is_demon'])));

        return response()->json([
            'success' => true,
            'data' => [
                'level' => $level,
                'stage' => $stage,
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
            'reported_wrong_ids' => 'sometimes|array',
            'reported_wrong_ids.*' => 'string',
        ]);

        $user = $request->user();
        $reportedWrongIds = collect($data['reported_wrong_ids'] ?? [])->flip();

        // 逐题判分
        $results = [];
        foreach ($data['answers'] as $ans) {
            $question = Question::where('question_id', $ans['question_id'])->first();
            $correct = $question && $question->correct_answer === $ans['answer'];
            $results[] = [
                'question_id' => $ans['question_id'],
                'correct' => $correct,
            ];

            // 记录学习日志
            LearningRecord::create([
                'user_id' => $user->id,
                'activity_type' => 'vocab',
                'activity_id' => $data['level'] . '-' . $data['stage'],
                'question_id' => $ans['question_id'],
                'is_correct' => $correct,
                'exp_gained' => $correct ? CurrencyService::EXP_PER_CORRECT : 0,
                'spirit_cost' => CurrencyService::SPIRIT_COST_PER_QUESTION,
                'time_spent' => 0,
                'answer_data' => $ans,
            ]);

            // 答错 → 自动收入心魔录
            if (!$correct) {
                if (!isset($reportedWrongIds[$ans['question_id']])) {
                    $this->demonService->recordWrong($user->id, $ans['question_id'], 'vocab', $data['level']);
                }
            } else {
                $this->demonService->recordCorrect($user->id, $ans['question_id']);
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
                'realm_progress' => $realmProgress,
            ],
        ]);
    }
}
