<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LearningRecord;
use App\Models\Question;
use App\Services\AchievementService;
use App\Services\CurrencyService;
use App\Services\HeartDemonService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SkillPracticeController extends Controller
{
    private CurrencyService $currencyService;
    private HeartDemonService $demonService;
    private AchievementService $achievementService;

    private const MODULES = [
        'listening' => ['normal_count' => 10, 'fallback' => 'vocab'],
        'speaking' => ['normal_count' => 10, 'fallback' => 'vocab'],
        'reading' => ['normal_count' => 10, 'fallback' => 'grammar'],
        'writing' => ['normal_count' => 10, 'fallback' => 'grammar'],
    ];

    public function __construct(
        CurrencyService $currencyService,
        HeartDemonService $demonService,
        AchievementService $achievementService
    ) {
        $this->currencyService = $currencyService;
        $this->demonService = $demonService;
        $this->achievementService = $achievementService;
    }

    public function questions(Request $request, string $type): JsonResponse
    {
        $module = self::MODULES[$type] ?? null;
        if (!$module) {
            return response()->json([
                'success' => false,
                'code' => 'MODULE_NOT_FOUND',
                'message' => '模块不存在',
            ], 404);
        }

        $level = $request->query('level', 'L1');
        $stage = $request->query('stage', '01');
        $user = $request->user();

        $bankType = $type;
        $normalCount = $module['normal_count'];
        $questions = $this->demonService->getInjectedQuestions($user->id, $bankType, $level, $stage, $normalCount);

        if (empty($questions) && !empty($module['fallback'])) {
            $bankType = $module['fallback'];
            $questions = $this->demonService->getInjectedQuestions($user->id, $bankType, $level, $stage, $normalCount);
        }

        if (empty($questions)) {
            return response()->json([
                'success' => false,
                'code' => 'NO_QUESTIONS',
                'message' => '该关卡暂时无题目',
            ], 404);
        }

        $demonCount = count(array_filter($questions, fn ($q) => !empty($q['_is_demon'])));

        return response()->json([
            'success' => true,
            'data' => [
                'level' => $level,
                'stage' => $stage,
                'module_type' => $type,
                'question_bank_type' => $bankType,
                'questions' => $questions,
                'total' => count($questions),
                'spirit_cost' => count($questions) - $demonCount,
                'demon_injected' => $demonCount,
            ],
        ]);
    }

    public function submitBatch(Request $request, string $type): JsonResponse
    {
        $module = self::MODULES[$type] ?? null;
        if (!$module) {
            return response()->json([
                'success' => false,
                'code' => 'MODULE_NOT_FOUND',
                'message' => '模块不存在',
            ], 404);
        }

        $data = $request->validate([
            'level' => 'required|string',
            'stage' => 'required|string',
            'answers' => 'required|array',
            'answers.*.question_id' => 'required|string',
            'answers.*.answer' => 'required|string',
        ]);

        $user = $request->user();
        $results = [];

        foreach ($data['answers'] as $ans) {
            $question = Question::where('question_id', $ans['question_id'])->first();
            $correct = $question && $question->correct_answer === $ans['answer'];

            $results[] = [
                'question_id' => $ans['question_id'],
                'correct' => $correct,
            ];

            LearningRecord::create([
                'user_id' => $user->id,
                'activity_type' => $type,
                'activity_id' => $data['level'] . '-' . $data['stage'],
                'question_id' => $ans['question_id'],
                'is_correct' => $correct,
                'exp_gained' => $correct ? CurrencyService::EXP_PER_CORRECT : 0,
                'spirit_cost' => CurrencyService::SPIRIT_COST_PER_QUESTION,
                'time_spent' => 0,
                'answer_data' => $ans,
            ]);

            if (!$correct) {
                $this->demonService->recordWrong($user->id, $ans['question_id'], $type, $data['level']);
            } else {
                $this->demonService->recordCorrect($user->id, $ans['question_id']);
            }
        }

        $settlement = $this->currencyService->settleBatch($user, $results, count($data['answers']));
        $newAchs = $this->achievementService->onLevelSubmit($user, $results, $settlement['accuracy']);

        return response()->json([
            'success' => true,
            'data' => array_merge($settlement, ['new_achievements' => $newAchs]),
        ]);
    }
}
