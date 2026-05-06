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
}
