<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    /**
     * 获取用户信息
     * GET /api/user/profile
     */
    public function profile(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $request->user(),
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
            'realm_stage' => 'nullable|integer|min:1|max:3',
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
     * 获取今日统计
     * GET /api/user/stats
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'daily_minutes' => $user->daily_minutes,
                'daily_minutes_date' => $user->daily_minutes_date,
                'realm' => $user->realm,
                'exp' => $user->exp,
            ],
        ]);
    }
}
