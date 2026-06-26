<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\RealmService;
use App\Services\ShareRewardService;
use App\Services\SmsService;
use App\Support\CultivationProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    /** 访问令牌名称：用于常规 auth:sanctum 鉴权。 */
    public const ACCESS_TOKEN_NAME = 'access-token';

    /** 刷新令牌名称：仅用于 /auth/refresh 手动校验，禁止当访问令牌使用。 */
    public const REFRESH_TOKEN_NAME = 'refresh-token';

    /** 刷新令牌能力标记（最小权限：不携带 `*`）。 */
    public const REFRESH_ABILITY = 'refresh';

    private SmsService $smsService;
    private RealmService $realmService;

    public function __construct(SmsService $smsService, RealmService $realmService)
    {
        $this->smsService = $smsService;
        $this->realmService = $realmService;
    }

    private const CHINESE_MESSAGES = [
        'phone.required' => '请输入手机号',
        'phone.size' => '请输入11位手机号',
        'code.required' => '请输入验证码',
        'code.size' => '验证码为6位数字',
        'nickname.max' => '道号最长50个字符',
        'school_grade.required' => '请选择学段',
        'school_grade.max' => '年级信息过长',
        'birth_year.integer' => '出生年份格式错误',
        'birth_year.min' => '出生年份不早于1950年',
        'birth_year.max' => '出生年份不能晚于当前年份',
        'password.required' => '请设置密码',
        'password.min' => '密码至少6位',
        'password.max' => '密码最长64位',
        'password.confirmed' => '两次输入的密码不一致',
        'login_type.in' => '登录方式无效',
        'password.required_if' => '请输入密码',
        'code.required_if' => '请输入验证码',
        'current_password.required' => '请输入当前密码',
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
            'phone' => 'required|string|size:11',
            'code'  => 'required|string|size:6',
            'password' => 'required|string|min:6|max:64|confirmed',
            'nickname' => 'nullable|string|max:50',
            'school_grade' => 'required|string|max:32',
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

        if (User::where('phone', $request->phone)->exists()) {
            return response()->json([
                'success' => false,
                'code' => 'PHONE_ALREADY_REGISTERED',
                'message' => '该手机号已被注册，请返回登录页面进行登录',
                'data' => [
                    'next_action' => 'login',
                ],
            ]);
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
        // 注册时仅写入占位境界（练气一层），真实初始境界在灵根测试完成后写入
        $initialRealm = CultivationProfile::defaultInitialRealm();
        $currentRealmName = $this->realmService->composeCurrentRealm($initialRealm['realm'], $initialRealm['realm_stage']);

        $user = User::create([
            'phone' => $request->phone,
            'password' => $request->password,
            'nickname' => $request->nickname ?: ('道友' . substr($request->phone, -4)),
            'school_grade' => $request->school_grade,
            'realm' => $initialRealm['realm'],
            'realm_stage' => $initialRealm['realm_stage'],
            'exp' => 0,
            'current_realm' => $currentRealmName,
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

        $tokens = $this->issueAuthTokens($user);

        return response()->json([
            'success' => true,
            'data' => array_merge(['user' => $user], $tokens),
        ], 201);
    }

    /**
     * 登录
     * POST /api/auth/login
     */
    public function login(Request $request): JsonResponse
    {
        $loginType = $request->input('login_type', 'sms');
        $request->merge(['login_type' => $loginType]);

        $validator = Validator::make($request->all(), [
            'phone' => 'required|string|size:11',
            'login_type' => 'nullable|string|in:sms,password',
            'code'  => 'required_if:login_type,sms|nullable|string|size:6',
            'password' => 'required_if:login_type,password|nullable|string|min:6|max:64',
        ], self::CHINESE_MESSAGES);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'code' => 'VALIDATION_ERROR',
                'message' => $validator->errors()->first(),
            ], 422);
        }

        if ($loginType === 'password') {
            return $this->loginWithPassword($request);
        }

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

        return $this->completeLogin($user);
    }

    private function loginWithPassword(Request $request): JsonResponse
    {
        $ipKey = 'login-password:' . $request->ip();
        if (RateLimiter::tooManyAttempts($ipKey, 10)) {
            $retryAfter = RateLimiter::availableIn($ipKey);
            return response()->json([
                'success' => false,
                'code' => 'TOO_MANY_ATTEMPTS',
                'message' => "登录尝试过于频繁，请 {$retryAfter} 秒后再试",
                'retry_after' => $retryAfter,
            ], 429);
        }

        $user = User::where('phone', $request->phone)->first();

        if (!$user) {
            RateLimiter::hit($ipKey, 900);
            return response()->json([
                'success' => false,
                'code' => 'INVALID_CREDENTIALS',
                'message' => '手机号或密码错误',
            ], 401);
        }

        if (!$user->password || !Hash::check($request->password, $user->password)) {
            RateLimiter::hit($ipKey, 900);
            return response()->json([
                'success' => false,
                'code' => 'INVALID_CREDENTIALS',
                'message' => '手机号或密码错误',
            ], 401);
        }

        RateLimiter::clear($ipKey);

        return $this->completeLogin($user);
    }

    /**
     * 忘记密码：短信验证后重置
     * POST /api/auth/reset-password
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'phone' => 'required|string|size:11',
            'code' => 'required|string|size:6',
            'password' => 'required|string|min:6|max:64|confirmed',
        ], self::CHINESE_MESSAGES);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'code' => 'VALIDATION_ERROR',
                'message' => $validator->errors()->first(),
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

        if (!$this->smsService->verify($request->phone, $request->code, 'reset_password')) {
            return response()->json([
                'success' => false,
                'code' => 'INVALID_CODE',
                'message' => '验证码错误或已过期',
            ], 422);
        }

        $user->update(['password' => $request->password]);

        return response()->json([
            'success' => true,
            'message' => '密码已重置，请使用新密码登录',
        ]);
    }

    /**
     * 已登录用户：发送设置密码验证码
     * POST /api/auth/password/send-code
     */
    public function sendSetPasswordCode(Request $request): JsonResponse
    {
        $user = $request->user();
        $result = $this->smsService->send($user->phone, 'set_password');

        if (!$result['success']) {
            $status = match ($result['code'] ?? null) {
                'SMS_RESEND_COOLDOWN', 'SMS_DAILY_LIMIT' => 429,
                default => 503,
            };

            return response()->json([
                'success' => false,
                'code' => $result['code'] ?? 'SMS_SEND_FAILED',
                'message' => $result['message'],
                'retry_after' => $result['retry_after'] ?? null,
            ], $status);
        }

        $response = ['success' => true, 'message' => $result['message']];
        if (isset($result['debug_code'])) {
            $response['debug_code'] = $result['debug_code'];
        }

        return response()->json($response);
    }

    /**
     * 已登录用户：设置或修改密码
     * POST /api/auth/password
     */
    public function updatePassword(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $hasPassword = filled($user->password);

        $rules = $hasPassword
            ? [
                'current_password' => 'required|string',
                'password' => 'required|string|min:6|max:64|confirmed',
            ]
            : [
                'code' => 'required|string|size:6',
                'password' => 'required|string|min:6|max:64|confirmed',
            ];

        $validator = Validator::make($request->all(), $rules, self::CHINESE_MESSAGES);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'code' => 'VALIDATION_ERROR',
                'message' => $validator->errors()->first(),
            ], 422);
        }

        if ($hasPassword) {
            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'success' => false,
                    'code' => 'INVALID_CURRENT_PASSWORD',
                    'message' => '当前密码错误',
                ], 422);
            }
        } elseif (!$this->smsService->verify($user->phone, $request->code, 'set_password')) {
            return response()->json([
                'success' => false,
                'code' => 'INVALID_CODE',
                'message' => '验证码错误或已过期',
            ], 422);
        }

        $user->update(['password' => $request->password]);

        return response()->json([
            'success' => true,
            'message' => $hasPassword ? '密码已修改' : '密码已设置',
            'data' => ['has_password' => true],
        ]);
    }

    private function completeLogin(User $user): JsonResponse
    {
        $user->update(['last_login_at' => now()]);
        // 显式重新登录：清空旧令牌（含旧刷新令牌），等价于在此设备上重置会话。
        $user->tokens()->delete();
        $tokens = $this->issueAuthTokens($user);

        return response()->json([
            'success' => true,
            'data' => array_merge(['user' => $user], $tokens),
        ]);
    }

    /**
     * 刷新访问令牌
     * POST /api/auth/refresh
     *
     * 该端点**不在** auth:sanctum 之下：访问令牌过期后正是要靠它恢复会话。
     * 凭据是独立的、更长寿命的刷新令牌（请求体 refresh_token，或 Bearer 头兜底），
     * 在此手动校验，因此不受 sanctum.expiration（按 created_at 的 7 天全局上限）约束。
     *
     * 关键：刷新**不旋转**刷新令牌，也**不删除**任何在用的访问令牌，只新签发一个访问令牌。
     * 这样两个入口（Vue / 旧版）并发刷新时不会互相作废，杜绝“无故掉线”。
     */
    public function refresh(Request $request): JsonResponse
    {
        $plainTextRefreshToken = $this->extractRefreshToken($request);
        if ($plainTextRefreshToken === null) {
            return response()->json([
                'success' => false,
                'code' => 'REFRESH_TOKEN_REQUIRED',
                'message' => '缺少刷新凭证，请重新登录',
            ], 401);
        }

        $refreshToken = PersonalAccessToken::findToken($plainTextRefreshToken);

        if (! $this->isValidRefreshToken($refreshToken)) {
            return response()->json([
                'success' => false,
                'code' => 'INVALID_REFRESH_TOKEN',
                'message' => '刷新凭证无效或已过期，请重新登录',
            ], 401);
        }

        /** @var User $user */
        $user = $refreshToken->tokenable;

        // 顺手回收已过期的访问令牌（仅删 expires_at 已过的，绝不碰在用令牌），避免无限堆积。
        $this->pruneExpiredAccessTokens($user);

        $accessToken = $user->createToken(
            self::ACCESS_TOKEN_NAME,
            ['*'],
            now()->addMinutes($this->accessTokenTtlMinutes())
        )->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => ['token' => $accessToken],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        // 注销访问令牌；同时撤销刷新令牌，防止注销后仍能用旧刷新凭证换取新会话。
        $user->currentAccessToken()->delete();
        $user->tokens()->where('name', self::REFRESH_TOKEN_NAME)->delete();

        return response()->json([
            'success' => true,
            'message' => '已退出宗门',
        ]);
    }

    /**
     * 同时签发访问令牌与刷新令牌。
     *
     * @return array{token: string, refresh_token: string}
     */
    private function issueAuthTokens(User $user): array
    {
        $accessToken = $user->createToken(
            self::ACCESS_TOKEN_NAME,
            ['*'],
            now()->addMinutes($this->accessTokenTtlMinutes())
        )->plainTextToken;

        $refreshToken = $user->createToken(
            self::REFRESH_TOKEN_NAME,
            [self::REFRESH_ABILITY],
            now()->addMinutes($this->refreshTokenTtlMinutes())
        )->plainTextToken;

        return [
            'token' => $accessToken,
            'refresh_token' => $refreshToken,
        ];
    }

    /** 从请求体 refresh_token 取刷新凭证，回退到 Bearer 头。 */
    private function extractRefreshToken(Request $request): ?string
    {
        $fromBody = $request->input('refresh_token');
        if (is_string($fromBody) && $fromBody !== '') {
            return $fromBody;
        }

        $bearer = $request->bearerToken();

        return (is_string($bearer) && $bearer !== '') ? $bearer : null;
    }

    /**
     * 校验刷新令牌：必须存在、归属用户、名称与能力匹配、且未过自身 expires_at。
     * 刻意不套用全局 sanctum.expiration —— 刷新令牌寿命只由其 expires_at 决定。
     */
    private function isValidRefreshToken(?PersonalAccessToken $token): bool
    {
        if (! $token || ! $token->tokenable) {
            return false;
        }

        if ($token->name !== self::REFRESH_TOKEN_NAME || ! $token->can(self::REFRESH_ABILITY)) {
            return false;
        }

        if ($token->expires_at && $token->expires_at->isPast()) {
            return false;
        }

        return true;
    }

    /** 仅删除已过期的访问令牌（绝不删除在用令牌或刷新令牌），用于卫生回收。 */
    private function pruneExpiredAccessTokens(User $user): void
    {
        $user->tokens()
            ->where('name', self::ACCESS_TOKEN_NAME)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->delete();
    }

    private function accessTokenTtlMinutes(): int
    {
        return (int) config('sanctum.expiration', 10080);
    }

    private function refreshTokenTtlMinutes(): int
    {
        return (int) config('sanctum.refresh_expiration', 43200);
    }
}
