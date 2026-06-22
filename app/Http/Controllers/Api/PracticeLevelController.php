<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PracticeLevelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PracticeLevelController extends Controller
{
    private const MODULES = ['vocab', 'grammar', 'listening', 'speaking', 'writing'];

    public function __construct(
        private readonly PracticeLevelService $levelService
    ) {
    }

    /** GET /api/practice/levels/{type} */
    public function show(Request $request, string $type): JsonResponse
    {
        if (!in_array($type, self::MODULES, true)) {
            return response()->json([
                'success' => false,
                'code' => 'MODULE_NOT_FOUND',
                'message' => '模块不存在',
            ], 404);
        }

        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => $this->levelService->getStageLayout($user, $type),
        ]);
    }
}
