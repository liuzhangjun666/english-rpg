<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CurrencyService;
use App\Services\ReadingAdventureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReadingAdventureController extends Controller
{
    public function __construct(
        private readonly ReadingAdventureService $service,
        private readonly CurrencyService $currencyService
    )
    {
    }

    public function chapters(Request $request): JsonResponse
    {
        $level = max(1, min(2, (int)$request->query('level', 1)));
        $user = $request->user();
        $unlockedLevels = [
            1 => true,
            2 => (int)($user->realm_stage ?? 1) >= 2,
        ];

        if (empty($unlockedLevels[$level])) {
            return response()->json([
                'success' => false,
                'code' => 'LEVEL_LOCKED',
                'message' => '请先突破到练气二层后解锁该阅读层',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'level' => $level,
                'unlocked_levels' => $unlockedLevels,
                'scenes' => $this->service->scenesByLevel($level),
                'chapters' => $this->service->getChaptersByLevel($user, $level),
            ],
        ]);
    }

    public function chapter(Request $request, string $chapterId): JsonResponse
    public function chapter(Request $request, string $chapterId): JsonResponse
    {
        $user = $request->user();
        $this->currencyService->recoverSpiritPower($user);
        $user->refresh();
        $spiritCost = CurrencyService::SPIRIT_COST_PER_LEVEL;

        $chapter = $this->service->getChapterOrNull($chapterId);
        if (!$chapter) {
            return response()->json([
                'success' => false,
                'code' => 'CHAPTER_NOT_FOUND',
                'message' => '章节不存在',
            ], 404);
        }
        $chapter['spirit_cost'] = $spiritCost;
        $chapter['current_spirit_power'] = (int) ($user->fresh()->spirit_power ?? 0);

        return response()->json([
            'success' => true,
            'data' => $chapter,
        ]);
    }

    public function submit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'chapter_id' => 'required|string',
            'answers' => 'required|array',
            'answers.*.task_id' => 'required|string',
            'answers.*.answer' => 'nullable|string',
            'selected_branch_id' => 'nullable|string',
            'demon_trial_answers' => 'nullable|array',
            'demon_trial_answers.*.question_id' => 'required_with:demon_trial_answers|string',
            'demon_trial_answers.*.answer' => 'nullable|string',
            'skip_demon_trial' => 'nullable|boolean',
        ]);

        $result = $this->service->submit(
            $request->user(),
            $data['chapter_id'],
            $data['answers'],
            $data['selected_branch_id'] ?? null,
            $data['demon_trial_answers'] ?? null,
            (bool) ($data['skip_demon_trial'] ?? false),
        );
        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? '提交失败',
            ], 422);
        }

        return response()->json($result);
    }
}
