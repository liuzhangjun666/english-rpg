<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ShareRewardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShareController extends Controller
{
    private ShareRewardService $shareService;

    public function __construct(ShareRewardService $shareService)
    {
        $this->shareService = $shareService;
    }

    /**
     * 获取分享信息
     * GET /api/share/info
     */
    public function info(Request $request): JsonResponse
    {
        $data = $this->shareService->getShareData($request->user());

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * 切换分享开关
     * POST /api/share/toggle
     */
    public function toggle(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->update(['share_enabled' => !$user->share_enabled]);

        return response()->json([
            'success' => true,
            'data' => ['share_enabled' => (bool)$user->share_enabled],
        ]);
    }
}
