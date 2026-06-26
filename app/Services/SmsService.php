<?php

namespace App\Services;

use App\Models\SmsCode;
use App\Support\TencentSmsClient;
use Illuminate\Support\Facades\Log;

class SmsService
{
    public const CODE_LENGTH = 6;

    public function send(string $phone, string $action = 'login'): array
    {
        $cooldown = (int) config('sms.send_cooldown_seconds', 60);

        $recent = SmsCode::where('phone', $phone)
            ->where('action', $action)
            ->whereNull('used_at')
            ->where('created_at', '<=', now())
            ->where('created_at', '>', now()->subSeconds($cooldown))
            ->latest()
            ->first();

        if ($recent) {
            $elapsed = max(0, now()->timestamp - $recent->created_at->timestamp);
            $retryAfter = max(1, $cooldown - $elapsed);

            return [
                'success' => false,
                'code' => 'SMS_RESEND_COOLDOWN',
                'retry_after' => $retryAfter,
                'message' => '请 ' . $retryAfter . ' 秒后再试',
            ];
        }

        if ($this->shouldEnforceDailyLimit()) {
            $dailyLimit = (int) config('sms.daily_limit', 10);
            $todayCount = SmsCode::where('phone', $phone)
                ->whereDate('created_at', now()->format('Y-m-d'))
                ->count();

            if ($todayCount >= $dailyLimit) {
                return [
                    'success' => false,
                    'code' => 'SMS_DAILY_LIMIT',
                    'message' => '今日验证码已达上限',
                ];
            }
        }

        $code = $this->generateCode();
        $ttlSeconds = (int) config('sms.code_ttl_seconds', 300);

        SmsCode::create([
            'phone' => $phone,
            'code' => $code,
            'action' => $action,
            'expires_at' => now()->addSeconds($ttlSeconds),
        ]);

        if ($this->shouldSendViaProvider()) {
            $result = $this->sendViaTencentCloud($phone, $code);

            if (!$result['success']) {
                return [
                    'success' => false,
                    'code' => $result['code'] ?? 'SMS_SEND_FAILED',
                    'message' => $result['message'] ?? '短信发送失败，请稍后再试',
                ];
            }

            Log::info("[SMS] sent to {$phone}");
        } else {
            Log::info("[SMS-DEV] code {$code} sent to {$phone} (action={$action})");
        }

        return [
            'success' => true,
            'message' => '验证码已发送',
            'debug_code' => $this->shouldExposeDebugCode() ? $code : null,
        ];
    }

    public function verify(string $phone, string $code, string $action = 'login'): bool
    {
        if ($this->isBypassCode($code)) {
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
            $this->incrementFailedAttempt($phone, $action);

            return false;
        }

        $record->update(['used_at' => now()]);

        return true;
    }

    private function shouldSendViaProvider(): bool
    {
        if (config('sms.debug_bypass_enabled')) {
            return false;
        }

        return $this->tencentConfigReady();
    }

    private function shouldExposeDebugCode(): bool
    {
        return config('sms.debug_bypass_enabled') || ! $this->tencentConfigReady();
    }

    private function isBypassCode(string $code): bool
    {
        if (! config('sms.debug_bypass_enabled')) {
            if (! app()->environment('production') && $code === '888888') {
                return true;
            }

            return false;
        }

        return $code === (string) config('sms.debug_bypass_code');
    }

    private function shouldEnforceDailyLimit(): bool
    {
        if (config('sms.skip_daily_limit')) {
            return false;
        }

        return $this->shouldSendViaProvider();
    }

    private function tencentConfigReady(): bool
    {
        $cfg = config('sms.tencent');

        return filled($cfg['secret_id'])
            && filled($cfg['secret_key'])
            && filled($cfg['sdk_app_id'])
            && filled($cfg['template_id'])
            && filled($cfg['sign_name']);
    }

    private function incrementFailedAttempt(string $phone, string $action): void
    {
        $pending = SmsCode::where('phone', $phone)
            ->where('action', $action)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if ($pending) {
            $pending->increment('attempts');
        }
    }

    private function generateCode(): string
    {
        return str_pad((string) random_int(0, 999999), self::CODE_LENGTH, '0', STR_PAD_LEFT);
    }

    private function sendViaTencentCloud(string $phone, string $code): array
    {
        $cfg = config('sms.tencent');

        if (! $this->tencentConfigReady()) {
            Log::error('[SMS] Tencent SMS config missing');

            return [
                'success' => false,
                'code' => 'SMS_CONFIG_MISSING',
                'message' => '短信服务未配置',
            ];
        }

        try {
            return TencentSmsClient::sendVerificationCode([
                ...$cfg,
                'verify_ssl' => config('sms.http_verify_ssl', true),
            ], $phone, $code);
        } catch (\Throwable $e) {
            Log::error('[SMS] send exception: ' . $e->getMessage());

            return [
                'success' => false,
                'code' => 'SMS_PROVIDER_EXCEPTION',
                'message' => '短信发送失败，请稍后再试',
            ];
        }
    }
}
