<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LearningRecord;
use App\Models\Question;
use App\Services\AchievementService;
use App\Services\CurrencyService;
use App\Services\HeartDemonService;
use App\Services\PracticeLevelService;
use App\Services\RealmService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SkillPracticeController extends Controller
{
    private CurrencyService $currencyService;
    private HeartDemonService $demonService;
    private AchievementService $achievementService;
    private RealmService $realmService;

    private const MODULES = [
        'listening' => ['normal_count' => 10, 'fallback' => 'vocab'],
        'speaking' => ['normal_count' => 10, 'fallback' => 'vocab'],
        'reading' => ['normal_count' => 10, 'fallback' => 'grammar'],
        'writing' => ['normal_count' => 10, 'fallback' => 'grammar'],
    ];

    private PracticeLevelService $levelService;

    public function __construct(
        CurrencyService $currencyService,
        HeartDemonService $demonService,
        AchievementService $achievementService,
        RealmService $realmService,
        PracticeLevelService $levelService
    ) {
        $this->currencyService = $currencyService;
        $this->demonService = $demonService;
        $this->achievementService = $achievementService;
        $this->realmService = $realmService;
        $this->levelService = $levelService;
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

        $stageNo = $this->levelService->parseStageNo($request->query('stage', 1));
        $user = $request->user();
        $this->currencyService->recoverSpiritPower($user);
        $user->refresh();

        $layout = $this->levelService->getStageLayout($user, $type);
        $bankType = $type;
        $normalCount = $module['normal_count'];
        $questions = $this->demonService->getInjectedQuestions($user->id, $bankType, $stageNo, $normalCount);

        if (empty($questions)) {
            return response()->json([
                'success' => false,
                'code' => 'NO_QUESTIONS',
                'message' => '该关卡暂时无题目',
            ], 404);
        }
        $spiritCost = CurrencyService::SPIRIT_COST_PER_LEVEL;

        $demonCount = count(array_filter($questions, fn ($q) => !empty($q['_is_demon'])));
        $stageMeta = collect($layout['stages'])->firstWhere('stage_no', $stageNo) ?? [];

        return response()->json([
            'success' => true,
            'data' => [
                'level' => $layout['realm'],
                'stage' => $stageMeta['stage_code'] ?? str_pad((string) $stageNo, 2, '0', STR_PAD_LEFT),
                'stage_no' => $stageNo,
                'current_realm' => $layout['current_realm'],
                'grade_labels' => $layout['grade_labels'],
                'level_id' => $stageMeta['level_id'] ?? sprintf('%s-%02d', $layout['realm'], $stageNo),
                'module_type' => $type,
                'question_bank_type' => $bankType,
                'questions' => $questions,
                'total' => count($questions),
                'spirit_cost' => $spiritCost,
                'current_spirit_power' => (int) ($user->fresh()->spirit_power ?? 0),
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
            'answers.*.mode' => 'nullable|string|in:choice,dictation,spelling',
            'answers.*.answer_text' => 'nullable|string|max:120',
            'reported_wrong_ids' => 'sometimes|array',
            'reported_wrong_ids.*' => 'string',
        ]);

        $user = $request->user();
        $reportedWrongIds = collect($data['reported_wrong_ids'] ?? [])->flip();
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
                if (!isset($reportedWrongIds[$ans['question_id']])) {
                    $this->demonService->recordWrong($user->id, $ans['question_id'], $type, (string) ($user->realm ?? 'L1'));
                }
            } else {
                $this->demonService->recordCorrect($user->id, $ans['question_id']);
            }
        }

        $settlement = $this->currencyService->settleBatch($user, $results, count($data['answers']), 0);
        $newAchs = $this->achievementService->onLevelSubmit($user, $results, $settlement['accuracy']);
        $correctCount = count(array_filter($results, fn (array $item) => !empty($item['correct'])));
        $dimensionMap = [
            'listening' => 'listening',
            'speaking' => 'speaking',
            'reading' => 'reading',
            'writing' => 'writing',
        ];
        $dimensionKey = $dimensionMap[$type] ?? null;
        $realmProgress = $dimensionKey
            ? $this->realmService->applyCultivationGain($user, $dimensionKey, $correctCount)
            : $this->realmService->getCultivationProgress($user);

        return response()->json([
            'success' => true,
            'data' => array_merge($settlement, [
                'new_achievements' => $newAchs,
                'realm_progress' => $realmProgress,
            ]),
        ]);
    }
}
