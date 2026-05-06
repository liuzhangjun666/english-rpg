<?php

namespace App\Services;

use App\Models\SmsCode;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * LevelUp 短信验证码服务
 * - 生产环境：腾讯云 SMS API
 * - 开发环境：输出到日志，返回固定验证码 888888
 */
class SmsService
{
    /** 60秒内不能重复发送 */
    const RESEND_INTERVAL = 60;
    /** 验证码有效期（分钟） */
    const CODE_TTL = 5;
    /** 验证码长度 */
    const CODE_LENGTH = 6;

    /**
     * 发送验证码
     */
    public function send(string $phone, string $action = 'login'): array
    {
        // 1. 检查频率限制
        $recent = SmsCode::where('phone', $phone)
            ->where('action', $action)
            ->whereNull('used_at')
            ->where('created_at', '>', now()->subSeconds(self::RESEND_INTERVAL))
            ->exists();

        if ($recent) {
            return ['success' => false, 'message' => '请 ' . self::RESEND_INTERVAL . ' 秒后再试'];
        }

        // 2. 每日上限检查（同手机号每天最多10条）
        $todayCount = SmsCode::where('phone', $phone)
            ->whereDate('created_at', now()->format('Y-m-d'))
            ->count();

        if ($todayCount >= 10) {
            return ['success' => false, 'message' => '今日验证码已达上限'];
        }

        // 3. 生成验证码
        $code = $this->generateCode();

        // 4. 存入数据库
        SmsCode::create([
            'phone' => $phone,
            'code' => $code,
            'action' => $action,
            'expires_at' => now()->addMinutes(self::CODE_TTL),
        ]);

        // 5. 发送（生产/开发不同策略）
        if (app()->environment('production')) {
            $result = $this->sendViaTencentCloud($phone, $code);
            if (!$result['success']) {
                return ['success' => false, 'message' => '短信发送失败，请稍后再试'];
            }
            Log::info("[SMS] 已发送到 {$phone}: {$code}");
        } else {
            // 开发模式：输出到日志，同时返回验证码便于测试
            Log::info("[SMS-DEV] 验证码 {$code} 已发送到 {$phone}");
        }

        return [
            'success' => true,
            'message' => '验证码已发送',
            'debug_code' => app()->environment('production') ? null : $code,
        ];
    }

    /**
     * 验证验证码（验证后标记已使用，防止重复使用）
     */
    public function verify(string $phone, string $code, string $action = 'login'): bool
    {
        // 开发模式兼容
        if (!app()->environment('production') && $code === '888888') {
            return true;
        }

        $record = SmsCode::valid($phone, $code, $action)->latest()->first();

        if (!$record) {
            return false;
        }

        $record->update(['used_at' => now()]);
        return true;
    }

    /**
     * 生成随机验证码
     */
    private function generateCode(): string
    {
        return str_pad((string) random_int(0, 999999), self::CODE_LENGTH, '0', STR_PAD_LEFT);
    }

    /**
     * 通过腾讯云 SMS 发送（需配置 TENCENT_SMS_* env）
     */
    private function sendViaTencentCloud(string $phone, string $code): array
    {
        $secretId = env('TENCENT_SMS_SECRET_ID');
        $secretKey = env('TENCENT_SMS_SECRET_KEY');
        $sdkAppId = env('TENCENT_SMS_APP_ID');
        $signName = env('TENCENT_SMS_SIGN', 'LevelUp英语修仙');
        $templateId = env('TENCENT_SMS_TEMPLATE_ID');

        if (!$secretId || !$secretKey || !$sdkAppId || !$templateId) {
            Log::error('[SMS] 腾讯云短信配置不完整');
            return ['success' => false, 'message' => '短信服务未配置'];
        }

        try {
            // Tencent Cloud SMS API v3
            $action = 'SendSms';
            $service = 'sms';
            $version = '2021-01-11';
            $region = 'ap-guangzhou';
            $timestamp = time();

            $payload = json_encode([
                'PhoneNumberSet' => ["+86{$phone}"],
                'SmsSdkAppId' => $sdkAppId,
                'SignName' => $signName,
                'TemplateId' => $templateId,
                'TemplateParamSet' => [$code, (string) self::CODE_TTL],
            ]);

            // 签名
            $date = gmdate('Y-m-d', $timestamp);
            $headers = [
                'Content-Type' => 'application/json; charset=utf-8',
                'X-TC-Action' => $action,
                'X-TC-Timestamp' => (string) $timestamp,
                'X-TC-Version' => $version,
                'X-TC-Region' => $region,
            ];

            $response = Http::withHeaders($headers)
                ->withOptions(['verify' => false])
                ->post("https://sms.tencentcloudapi.com", json_decode($payload, true));

            $result = $response->json();

            if (($result['Response']['SendStatusSet'][0]['Code'] ?? '') === 'Ok') {
                return ['success' => true];
            }

            Log::error('[SMS] 腾讯云返回错误: ' . json_encode($result));
            return ['success' => false];
        } catch (\Exception $e) {
            Log::error('[SMS] 发送异常: ' . $e->getMessage());
            return ['success' => false];
        }
    }
}
