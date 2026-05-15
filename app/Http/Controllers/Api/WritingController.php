<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CurrencyService;
use App\Services\WritingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WritingController extends Controller
{
    public function __construct(
        private readonly WritingService $writingService,
        private readonly CurrencyService $currencyService,
    ) {}

    /**
     * 获取写作关卡题目（命题+续写各1题）
     */
    public function prompts(Request $request): JsonResponse
    {
        $realm = $request->query('level', 'L1');
        $stage = $request->query('stage', '01');
        $user = $request->user();

        $prompts = $this->writingService->getPrompts($realm, $stage);

        if (empty($prompts)) {
            return response()->json([
                'success' => false,
                'code' => 'NO_PROMPTS',
                'message' => '该关卡暂无写作题目',
            ], 404);
        }

        $spiritCost = count($prompts) * WritingService::SPIRIT_COST_PER_PROMPT;

        return response()->json([
            'success' => true,
            'data' => [
                'level' => $realm,
                'stage' => $stage,
                'prompts' => $prompts,
                'total' => count($prompts),
                'spirit_cost' => $spiritCost,
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

        // 检查灵力
        if (!$this->currencyService->hasEnoughSpirit($user, WritingService::SPIRIT_COST_PER_PROMPT)) {
            return response()->json([
                'success' => false,
                'code' => 'INSUFFICIENT_SPIRIT',
                'message' => "灵力不足（需要 " . WritingService::SPIRIT_COST_PER_PROMPT . " 点灵力）",
            ], 422);
        }

        // 扣除灵力
        $this->currencyService->consumeSpirit($user, WritingService::SPIRIT_COST_PER_PROMPT);

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
