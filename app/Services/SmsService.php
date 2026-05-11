<?php

namespace App\Services;

use App\Models\SmsCode;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    // 60 seconds cooldown between sends for same phone+action
    public const RESEND_INTERVAL = 60;
    public const CODE_TTL = 5;
    public const CODE_LENGTH = 6;

    public function send(string $phone, string $action = 'login'): array
    {
        $recent = SmsCode::where('phone', $phone)
            ->where('action', $action)
            ->whereNull('used_at')
            ->where('created_at', '<=', now())
            ->where('created_at', '>', now()->subSeconds(self::RESEND_INTERVAL))
            ->latest()
            ->first();

        if ($recent) {
            $elapsed = max(0, now()->timestamp - $recent->created_at->timestamp);
            $retryAfter = max(1, self::RESEND_INTERVAL - $elapsed);

            return [
                'success' => false,
                'code' => 'SMS_RESEND_COOLDOWN',
                'retry_after' => $retryAfter,
                'message' => '请 ' . $retryAfter . ' 秒后再试',
            ];
        }

        $todayCount = SmsCode::where('phone', $phone)
            ->whereDate('created_at', now()->format('Y-m-d'))
            ->count();

        if ($todayCount >= 10) {
            return [
                'success' => false,
                'code' => 'SMS_DAILY_LIMIT',
                'message' => '今日验证码已达上限',
            ];
        }

        $code = $this->generateCode();

        SmsCode::create([
            'phone' => $phone,
            'code' => $code,
            'action' => $action,
            'expires_at' => now()->addMinutes(self::CODE_TTL),
        ]);

        if (app()->environment('production')) {
            $result = $this->sendViaTencentCloud($phone, $code);

            if (!$result['success']) {
                return [
                    'success' => false,
                    'code' => $result['code'] ?? 'SMS_SEND_FAILED',
                    'message' => $result['message'] ?? '短信发送失败，请稍后再试',
                ];
            }

            Log::info("[SMS] sent to {$phone}: {$code}");
        } else {
            Log::info("[SMS-DEV] code {$code} sent to {$phone}");
        }

        return [
            'success' => true,
            'message' => '验证码已发送',
            'debug_code' => app()->environment('production') ? null : $code,
        ];
    }

    public function verify(string $phone, string $code, string $action = 'login'): bool
    {
        // In non-production, test code 888888 should still consume latest pending code
        if (!app()->environment('production') && $code === '888888') {
            $latestPending = SmsCode::where('phone', $phone)
                ->where('action', $action)
                ->whereNull('used_at')
                ->latest()
                ->first();

            if ($latestPending) {
                $latestPending->update(['used_at' => now()]);
            }

            return true;
        }

        $record = SmsCode::valid($phone, $code, $action)->latest()->first();

        if (!$record) {
            return false;
        }

        $record->update(['used_at' => now()]);
        return true;
    }

    private function generateCode(): string
    {
        return str_pad((string) random_int(0, 999999), self::CODE_LENGTH, '0', STR_PAD_LEFT);
    }

    private function sendViaTencentCloud(string $phone, string $code): array
    {
        $secretId = env('TENCENT_SMS_SECRET_ID');
        $secretKey = env('TENCENT_SMS_SECRET_KEY');
        $sdkAppId = env('TENCENT_SMS_APP_ID');
        $signName = env('TENCENT_SMS_SIGN', 'LevelUp英语修仙');
        $templateId = env('TENCENT_SMS_TEMPLATE_ID');

        if (!$secretId || !$secretKey || !$sdkAppId || !$templateId) {
            Log::error('[SMS] Tencent SMS config missing');
            return [
                'success' => false,
                'code' => 'SMS_CONFIG_MISSING',
                'message' => '短信服务未配置',
            ];
        }

        try {
            $headers = [
                'Content-Type' => 'application/json; charset=utf-8',
                'X-TC-Action' => 'SendSms',
                'X-TC-Timestamp' => (string) time(),
                'X-TC-Version' => '2021-01-11',
                'X-TC-Region' => 'ap-guangzhou',
            ];

            $response = Http::withHeaders($headers)
                ->withOptions(['verify' => false])
                ->post('https://sms.tencentcloudapi.com', [
                    'PhoneNumberSet' => ["+86{$phone}"],
                    'SmsSdkAppId' => $sdkAppId,
                    'SignName' => $signName,
                    'TemplateId' => $templateId,
                    'TemplateParamSet' => [$code, (string) self::CODE_TTL],
                ]);

            $result = $response->json();
            if (($result['Response']['SendStatusSet'][0]['Code'] ?? '') === 'Ok') {
                return ['success' => true];
            }

            Log::error('[SMS] provider response error: ' . json_encode($result, JSON_UNESCAPED_UNICODE));
            return ['success' => false, 'code' => 'SMS_PROVIDER_ERROR'];
        } catch (\Exception $e) {
            Log::error('[SMS] send exception: ' . $e->getMessage());
            return ['success' => false, 'code' => 'SMS_PROVIDER_EXCEPTION'];
        }
    }
}
