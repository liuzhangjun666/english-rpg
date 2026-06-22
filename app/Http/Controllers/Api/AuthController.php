<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ShareRewardService;
use App\Services\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    private SmsService $smsService;

    public function __construct(SmsService $smsService)
    {
        $this->smsService = $smsService;
    }

    private const CHINESE_MESSAGES = [
        'phone.required' => '请输入手机号',
        'phone.size' => '请输入11位手机号',
        'phone.unique' => '该手机号已注册',
        'code.required' => '请输入验证码',
        'code.size' => '验证码为6位数字',
        'nickname.max' => '道号最长50个字符',
        'school_grade.max' => '年级信息过长',
        'birth_year.integer' => '出生年份格式错误',
        'birth_year.min' => '出生年份不早于1950年',
        'birth_year.max' => '出生年份不能晚于当前年份',
    ];

    private function verifyCode(Request $request, string $action): bool
    {
        return $this->smsService->verify($request->phone, $request->code, $action);
    }

    /**
     * 注册
     * POST /api/auth/register
     */
    public function register(Request $request): JsonResponse
    {
        // ── 防刷限流 ──
        // 单个 IP 每小时最多 5 次注册尝试（含失败）。SMS 验证码已经是天然限流，
        // 这里追加一层兜底，主要防御机器人短时间用大量虚拟号刷邀请奖励。
        // 命中限流：返回 429，前端展示倒计时。
        $ipKey = 'register-ip:' . $request->ip();
        if (RateLimiter::tooManyAttempts($ipKey, 5)) {
            $retryAfter = RateLimiter::availableIn($ipKey);
            return response()->json([
                'success' => false,
                'code' => 'TOO_MANY_REGISTRATIONS',
                'message' => "注册过于频繁，请 {$retryAfter} 秒后再试",
                'retry_after' => $retryAfter,
            ], 429);
        }
        RateLimiter::hit($ipKey, 3600); // 计数器存活 1 小时

        $validator = Validator::make($request->all(), [
            'phone' => 'required|string|size:11|unique:levelup_users,phone',
            'code'  => 'required|string|size:6',
            'nickname' => 'nullable|string|max:50',
            'school_grade' => 'nullable|string|max:32',
            'birth_year' => 'nullable|integer|min:1950|max:' . date('Y'),
            'invite_code' => 'nullable|string|max:20',
        ], self::CHINESE_MESSAGES);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'code' => 'VALIDATION_ERROR',
                'message' => $validator->errors()->first(),
            ], 422);
        }

        // 验证短信验证码
        if (!$this->verifyCode($request, 'register')) {
            return response()->json([
                'success' => false,
                'code' => 'INVALID_CODE',
                'message' => '验证码错误或已过期',
            ], 422);
        }

        // 未成年检测
        $isMinor = 0;
        if ($request->birth_year) {
            $age = date('Y') - (int)$request->birth_year;
            if ($age < 14) $isMinor = 1;
        }

        $today = date('Y-m-d');

        $user = User::create([
            'phone' => $request->phone,
            'nickname' => $request->nickname ?: ('道友' . substr($request->phone, -4)),
            'school_grade' => $request->school_grade ?: null,
            'realm' => 'L1',
            'realm_stage' => 1,
            'exp' => 0,
            'current_realm' => '练气一层',
            'cultivation_energy' => 0,
            'vocabulary' => 0,
            'grammar' => 0,
            'reading' => 0,
            'listening' => 0,
            'writing' => 0,
            'speaking' => 0,
            'spirit_power' => $isMinor ? 50 : 100,
            'spirit_power_max' => $isMinor ? 50 : 100,
            'spirit_stone' => 0,
            'spirit_power_date' => $today,
            'spirit_power_last_recover_at' => now(),
            'is_minor' => $isMinor,
            'daily_minutes' => 0,
            'daily_minutes_date' => $today,
            'last_login_at' => now(),
            'tutorial_step' => 0,
        ]);

        $shareService = app(ShareRewardService::class);
        // 新用户立刻生成自己的邀请码，避免延迟到第一次访问 /share/info 才有
        $shareService->getInviteCode($user);

        if ($request->filled('invite_code')) {
            $shareService->handleInvitedRegistration($user, $request->invite_code);
        }

        // 重新加载以获取上面 increment / update 的最新值（spirit_power、invite_code 等）
        $user->refresh();

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => ['user' => $user, 'token' => $token],
        ], 201);
    }

    /**
     * 登录
     * POST /api/auth/login
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'phone' => 'required|string|size:11',
            'code'  => 'required|string|size:6',
        ], [
            'phone.required' => '请输入手机号',
            'phone.size' => '请输入11位手机号',
            'code.required' => '请输入验证码',
            'code.size' => '验证码为6位数字',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'code' => 'VALIDATION_ERROR',
                'message' => $validator->errors()->first(),
            ], 422);
        }

        // 验证短信验证码
        if (!$this->verifyCode($request, 'login')) {
            return response()->json([
                'success' => false,
                'code' => 'INVALID_CODE',
                'message' => '验证码错误或已过期',
            ], 422);
        }

        $user = User::where('phone', $request->phone)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'code' => 'USER_NOT_FOUND',
                'message' => '该手机号未注册',
            ], 404);
        }

        $user->update(['last_login_at' => now()]);
        $user->tokens()->delete();
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => ['user' => $user, 'token' => $token],
        ]);
    }

    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->tokens()->delete();
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => ['token' => $token],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => '已退出宗门',
        ]);
    }
}
