<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LearningRecord;
use App\Models\Question;
use App\Support\CultivationProfile;
use App\Services\CurrencyService;
use App\Services\RealmService;
use App\Services\ReportService;
use App\Services\StoryProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    public function __construct(
        private readonly ReportService $reportService,
        private readonly RealmService $realmService,
        private readonly StoryProgressService $storyService,
    ) {
    }
    /**
     * 获取用户信息
     * GET /api/user/profile
     */
    public function profile(Request $request): JsonResponse
    {
        $user = $request->user();
        $snapshot = $this->realmService->getCultivationProgress($user);
        if (($user->current_realm ?? null) !== $snapshot['current_realm']) {
            $user->current_realm = $snapshot['current_realm'];
            $user->save();
            $user->refresh();
        }

        $snapshot = $this->storyService->snapshot($user);
        $data = array_merge($user->toArray(), $snapshot);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * 更新用户信息（昵称/头像）
     * PUT /api/user/profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nickname'    => 'nullable|string|max:50',
            'avatar_url'  => 'nullable|string|max:255',
            'realm'       => 'nullable|string|max:10',
            'realm_stage' => 'nullable|integer|min:1|max:9',
        ], [
            'nickname.max' => '道号最长50个字符',
            'avatar_url.max' => '头像地址过长',
            'realm.string' => '境界格式错误',
            'realm_stage.integer' => '阶段格式错误',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'code' => 'VALIDATION_ERROR',
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $user = $request->user();
        $updates = [];

        if ($request->filled('nickname')) {
            $updates['nickname'] = $request->nickname;
        }
        if ($request->filled('avatar_url')) {
            $updates['avatar_url'] = $request->avatar_url;
        }
        if ($request->filled('realm')) {
            $updates['realm'] = $request->realm;
        }
        if ($request->filled('realm_stage')) {
            $updates['realm_stage'] = (int)$request->realm_stage;
        }

        if (!empty($updates)) {
            $user->update($updates);
        }

        return response()->json([
            'success' => true,
            'data' => $user,
        ]);
    }

    /**
     * 上传并更新头像
     * POST /api/user/avatar
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ], [
            'avatar.required' => '请选择要上传的图片',
            'avatar.image' => '文件必须是图片',
            'avatar.max' => '图片大小不能超过 2MB',
            'avatar.mimes' => '仅支持 JPG, PNG, GIF, WEBP 格式',
        ]);

        $user = $request->user();
        
        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('avatars', 'public');
            $url = \Illuminate\Support\Facades\Storage::url($path);
            
            $user->update(['avatar_url' => $url]);
            
            return response()->json([
                'success' => true,
                'data' => $user,
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => '上传失败',
        ], 400);
    }


    /**
     * 获取今日统计
     * GET /api/user/stats
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = now()->format('Y-m-d');
        $todayRecords = LearningRecord::where('user_id', $user->id)
            ->whereDate('created_at', $today)
            ->get();

        $questionsDone = $todayRecords->count();
        $correctCount = $todayRecords->where('is_correct', true)->count();
        $accuracy = $questionsDone > 0 ? (int) round(($correctCount / $questionsDone) * 100) : 0;

        $newWordCount = 0;
        $correctQids = $todayRecords
            ->where('is_correct', true)
            ->pluck('question_id')
            ->filter()
            ->unique()
            ->values();
        if ($correctQids->isNotEmpty()) {
            $newWordCount = Question::whereIn('question_id', $correctQids)
                ->where('type', 'vocab')
                ->whereNotNull('word')
                ->distinct()
                ->count('word');
        }

        return response()->json([
            'success' => true,
            'data' => [
                'daily_minutes' => $user->daily_minutes,
                'daily_minutes_date' => $user->daily_minutes_date,
                'realm' => $user->realm,
                'exp' => $user->exp,
                'questions_done' => $questionsDone,
                'correct_count' => $correctCount,
                'accuracy' => $accuracy,
                'new_word_count' => $newWordCount,
            ],
        ]);
    }

    /**
     * PATCH /api/user/tutorial-step
     */
    public function updateTutorialStep(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tutorial_step' => 'required|integer|min:0|max:3',
        ]);

        $user = $request->user();
        $nextStep = (int) $data['tutorial_step'];
        if ($nextStep > (int) ($user->tutorial_step ?? 0)) {
            $user->tutorial_step = $nextStep;
            $user->save();
        }

        return response()->json([
            'success' => true,
            'data' => ['tutorial_step' => (int) $user->tutorial_step],
        ]);
    }

    /**
     * GET /api/user/learning-progress
     */
    public function learningProgress(Request $request): JsonResponse
    {
        $user = $request->user();
        $realm = (string) $user->realm;
        $stage = max(1, (int) $user->realm_stage);
        $exp = (int) $user->exp;

        $currentThreshold = CurrencyService::getStageExpThreshold($realm, $stage);
        $nextThreshold = CurrencyService::getStageExpThreshold($realm, $stage + 1);
        if ($nextThreshold <= $currentThreshold) {
            $nextThreshold = $currentThreshold + 1;
        }

        $progressRange = max(1, $nextThreshold - $currentThreshold);
        $progressValue = max(0, min($exp - $currentThreshold, $progressRange));
        $progressPercent = (int) round(($progressValue / $progressRange) * 100);
        $remainingExp = max(0, $nextThreshold - $exp);
        $realmSnapshot = $this->realmService->getCultivationProgress($user);
        if (($user->current_realm ?? null) !== $realmSnapshot['current_realm']) {
            $user->current_realm = $realmSnapshot['current_realm'];
            $user->save();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'realm' => $realm,
                'stage' => $stage,
                'exp' => $exp,
                'current_threshold' => $currentThreshold,
                'next_threshold' => $nextThreshold,
                'progress_percent' => $progressPercent,
                'remaining_exp' => $remainingExp,
                'cefr_hint' => CultivationProfile::cefrHint($realm),
                'realm_name' => CultivationProfile::realmName($realm),
                'learning_stage' => CultivationProfile::learningStage($realm, $stage)['label'],
                'ability_focus' => CultivationProfile::learningStage($realm, $stage)['focus'],
                'current_realm' => $realmSnapshot['current_realm'],
                'cultivation_energy' => $realmSnapshot['cultivation_energy'],
                'next_realm' => $realmSnapshot['next_realm'],
                'current_realm_index' => $realmSnapshot['current_realm_index'],
                'next_realm_energy' => $realmSnapshot['next_realm_energy'],
                'realm_progress_percent' => $realmSnapshot['realm_progress_percent'],
                'remaining_energy_to_next_realm' => $realmSnapshot['remaining_energy_to_next_realm'],
                'six_dimensions' => array_map(
                    fn (array $item) => $item['value'],
                    $realmSnapshot['abilities']
                ),
                'breakthrough_conditions' => $realmSnapshot['breakthrough_conditions'],
                'can_breakthrough' => $realmSnapshot['can_breakthrough'],
            ],
        ]);
    }

    /**
     * GET /api/user/analytics?days=30
     */
    public function analytics(Request $request): JsonResponse
    {
        $days = (int) $request->query('days', 30);
        $data = $this->reportService->learningAnalytics($request->user(), $days);
        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

}
