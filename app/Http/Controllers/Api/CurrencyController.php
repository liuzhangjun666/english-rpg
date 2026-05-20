<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CurrencyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CurrencyController extends Controller
{
    private CurrencyService $currencyService;

    public function __construct(CurrencyService $currencyService)
    {
        $this->currencyService = $currencyService;
    }

    /**
     * 每日灵力恢复检查
     * POST /api/currency/daily-check
     */
    public function dailyCheck(Request $request): JsonResponse
    {
        $user = $request->user();
        $result = $this->currencyService->dailyCheck($user);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * 获取灵石数量
     * GET /api/currency/stones
     */
    public function stones(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'spirit_stone' => $request->user()->spirit_stone,
            ],
        ]);
    }

    /**
     * 卷轴兑换
     * POST /api/currency/redeem-scroll
     */
    public function redeemScroll(Request $request): JsonResponse
    {
        $data = $request->validate([
            'target' => 'required|string|in:stone,exp,skill',
            'count' => 'nullable|integer|min:1|max:20',
        ]);

        $user = $request->user();
        $count = (int) ($data['count'] ?? 1);
        $owned = (int) ($user->secret_scroll ?? 0);
        if ($owned < $count) {
            return response()->json([
                'success' => false,
                'code' => 'SCROLL_NOT_ENOUGH',
                'message' => '秘境卷轴不足',
            ], 422);
        }

        $target = $data['target'];
        $gain = 0;
        if ($target === 'stone') {
            $gain = $count * 3;
            $user->spirit_stone = (int) $user->spirit_stone + $gain;
        } elseif ($target === 'exp') {
            $gain = $count * 20;
            $user->exp = (int) $user->exp + $gain;
        } else {
            $gain = $count;
            $user->skill_point = (int) $user->skill_point + $gain;
        }

        $user->secret_scroll = max(0, $owned - $count);
        $user->save();

        return response()->json([
            'success' => true,
            'data' => [
                'target' => $target,
                'count' => $count,
                'gain' => $gain,
                'secret_scroll' => (int) $user->secret_scroll,
                'spirit_stone' => (int) $user->spirit_stone,
                'exp' => (int) $user->exp,
                'skill_point' => (int) $user->skill_point,
            ],
        ]);
    }
}
