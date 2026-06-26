<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;

/**
 * 腾讯云短信 SendSms（API 3.0 + TC3-HMAC-SHA256 签名）。
 */
class TencentSmsClient
{
    /**
     * @param  array{
     *   secret_id: string,
     *   secret_key: string,
     *   sdk_app_id: string,
     *   sign_name: string,
     *   template_id: string,
     *   template_extra_params: string,
     *   region: string,
     *   endpoint: string,
     *   timeout: int
     * }  $config
     * @return array{success: bool, code?: string, message?: string}
     */
    public static function sendVerificationCode(array $config, string $phone, string $code): array
    {
        $host = $config['endpoint'];
        $payload = json_encode([
            'PhoneNumberSet' => ["+86{$phone}"],
            'SmsSdkAppId' => $config['sdk_app_id'],
            'SignName' => $config['sign_name'],
            'TemplateId' => $config['template_id'],
            'TemplateParamSet' => [
                $code,
                (string) $config['template_extra_params'],
            ],
        ], JSON_UNESCAPED_UNICODE);

        $service = 'sms';
        $action = 'SendSms';
        $version = '2021-01-11';
        $timestamp = time();
        $date = gmdate('Y-m-d', $timestamp);

        $canonicalHeaders = "content-type:application/json; charset=utf-8\nhost:{$host}\n";
        $signedHeaders = 'content-type;host';
        $hashedPayload = hash('sha256', $payload);
        $canonicalRequest = "POST\n/\n\n{$canonicalHeaders}\n{$signedHeaders}\n{$hashedPayload}";
        $credentialScope = "{$date}/{$service}/tc3_request";
        $stringToSign = "TC3-HMAC-SHA256\n{$timestamp}\n{$credentialScope}\n" . hash('sha256', $canonicalRequest);

        $secretDate = hash_hmac('sha256', $date, 'TC3' . $config['secret_key'], true);
        $secretService = hash_hmac('sha256', $service, $secretDate, true);
        $secretSigning = hash_hmac('sha256', 'tc3_request', $secretService, true);
        $signature = hash_hmac('sha256', $stringToSign, $secretSigning);

        $authorization = sprintf(
            'TC3-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s',
            $config['secret_id'],
            $credentialScope,
            $signedHeaders,
            $signature
        );

        $request = Http::timeout($config['timeout']);

        if (! ($config['verify_ssl'] ?? config('sms.http_verify_ssl', true))) {
            $request = $request->withoutVerifying();
        }

        $response = $request->withHeaders([
                'Authorization' => $authorization,
                'Content-Type' => 'application/json; charset=utf-8',
                'Host' => $host,
                'X-TC-Action' => $action,
                'X-TC-Timestamp' => (string) $timestamp,
                'X-TC-Version' => $version,
                'X-TC-Region' => $config['region'],
            ])
            ->withBody($payload, 'application/json; charset=utf-8')
            ->post("https://{$host}");

        $result = $response->json();
        $status = $result['Response']['SendStatusSet'][0] ?? null;
        $statusCode = is_array($status) ? ($status['Code'] ?? '') : ($status->Code ?? '');

        if ($statusCode === 'Ok') {
            return ['success' => true];
        }

        $message = is_array($status)
            ? ($status['Message'] ?? '短信发送失败')
            : ($status->Message ?? '短信发送失败');

        return [
            'success' => false,
            'code' => 'SMS_PROVIDER_ERROR',
            'message' => $message,
        ];
    }
}
