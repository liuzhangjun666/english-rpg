<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CurrencyService;
use App\Services\PracticeLevelService;
use App\Services\WritingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WritingController extends Controller
{
    public function __construct(
        private readonly WritingService $writingService,
        private readonly CurrencyService $currencyService,
        private readonly PracticeLevelService $levelService,
    ) {}

    /**
     * 获取写作关卡题目（命题+续写各1题）
     */
    public function prompts(Request $request): JsonResponse
    {
        $stageNo = $this->levelService->parseStageNo($request->query('stage', 1));
        $user = $request->user();
        $this->currencyService->recoverSpiritPower($user);
        $user->refresh();

        $layout = $this->levelService->getStageLayout($user, 'writing');
        $prompts = $this->writingService->getPromptsForUser($user, $stageNo);

        if (empty($prompts)) {
            return response()->json([
                'success' => false,
                'code' => 'NO_PROMPTS',
                'message' => '该关卡暂无写作题目',
            ], 404);
        }

        $spiritCost = CurrencyService::SPIRIT_COST_PER_LEVEL;
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
                'prompts' => $prompts,
                'total' => count($prompts),
                'spirit_cost' => $spiritCost,
                'current_spirit_power' => (int) ($user->fresh()->spirit_power ?? 0),
            ],
        ]);
    }

    /**
     * 提交单篇写作（逐题提交，实时返回AI评分）
     */
    public function submitOne(Request $request): JsonResponse
    {
        $data = $request->validate([
            'prompt_id' => 'required|string',
            'content' => 'required|string|min:10|max:5000',
        ]);

        $user = $request->user();

        $result = $this->writingService->submitWriting($user, $data['prompt_id'], $data['content']);

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? '提交失败',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }
}
