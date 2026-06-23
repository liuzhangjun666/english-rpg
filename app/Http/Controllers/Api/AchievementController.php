<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AchievementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AchievementController extends Controller
{
    private AchievementService $achievementService;
    public function __construct(AchievementService $achievementService) { $this->achievementService = $achievementService; }

    /** GET /api/achievements */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->achievementService->checkAll($user);
        $achievements = $this->achievementService->getUserAchievements($user->id);
        $unlockedIds = $this->achievementService->toFrontendIds($achievements);
        $allTypes = AchievementService::TYPES;

        return response()->json([
            'success' => true,
            'data' => [
                'unlocked' => $achievements,
                'unlocked_ids' => $unlockedIds,
                'total_unlocked' => count($unlockedIds),
                'total_possible' => count($allTypes),
                'all_types' => $allTypes,
            ],
        ]);
    }

    /** POST /api/achievements/check */
    public function check(Request $request): JsonResponse
    {
        $new = $this->achievementService->checkAll($request->user());
        return response()->json([
            'success' => true,
            'data' => ['new_achievements' => $new],
        ]);
    }
}
