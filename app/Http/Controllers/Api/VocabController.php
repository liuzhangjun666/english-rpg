<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LearningRecord;
use App\Models\Question;
use App\Services\CurrencyService;
use App\Services\HeartDemonService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VocabController extends Controller
{
    private CurrencyService $currencyService;
    private HeartDemonService $demonService;

    public function __construct(CurrencyService $currencyService, HeartDemonService $demonService)
    {
        $this->currencyService = $currencyService;
        $this->demonService = $demonService;
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

        // 心魔注入：正常题 + 混入心魔题（20%）
        $normalCount = 15;
        $allQuestions = $this->demonService->getInjectedQuestions($user->id, 'vocab', $level, $stage, $normalCount);

        if (empty($allQuestions)) {
            return response()->json(['success'=>false,'code'=>'NO_QUESTIONS','message'=>'该关卡暂无题目'], 404);
        }

        $demonCount = count(array_filter($allQuestions, fn($q) => !empty($q['_is_demon'])));

        return response()->json([
            'success' => true,
            'data' => [
                'level' => $level,
                'stage' => $stage,
                'questions' => $allQuestions,
                'total' => count($allQuestions),
                'spirit_cost' => count($allQuestions) - $demonCount, // 心魔题不扣灵力
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
        ]);

        $user = $request->user();

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
                $this->demonService->recordWrong($user->id, $ans['question_id'], 'vocab', $data['level']);
            } else {
                $this->demonService->recordCorrect($user->id, $ans['question_id']);
            }
        }

        // 经济结算
        $settlement = $this->currencyService->settleBatch($user, $results, count($data['answers']));

        return response()->json([
            'success' => true,
            'data' => [
                'results' => $results,
                'total_exp' => $settlement['exp_gained'],
                'total_spirit_cost' => $settlement['spirit_cost'],
                'accuracy' => $settlement['accuracy'],
                'passed' => $settlement['passed'],
                'stones_gained' => $settlement['stones_gained'],
            ],
        ]);
    }
}
