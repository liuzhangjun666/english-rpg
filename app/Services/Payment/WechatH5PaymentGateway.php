<?php

namespace App\Services\Payment;

use App\Models\RechargeOrder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * 微信 H5（MWEB）支付。未配置密钥时由 PaymentGatewayManager 回退到 Mock。
 */
class WechatH5PaymentGateway implements PaymentGatewayInterface
{
    public function channel(): string
    {
        return 'wechat_h5';
    }

    public function isConfigured(): bool
    {
        $cfg = config('recharge.wechat', []);

        return filled($cfg['app_id'] ?? null)
            && filled($cfg['mch_id'] ?? null)
            && filled($cfg['api_key'] ?? null)
            && filled($cfg['notify_url'] ?? null);
    }

    public function createPayment(RechargeOrder $order, string $clientIp): array
    {
        if (! $this->isConfigured()) {
            throw new \RuntimeException('微信支付未配置');
        }

        $cfg = config('recharge.wechat');
        $nonce = Str::random(32);
        $body = '修仙英语-仙玉充值';
        $params = [
            'appid' => $cfg['app_id'],
            'mch_id' => $cfg['mch_id'],
            'nonce_str' => $nonce,
            'body' => $body,
            'out_trade_no' => $order->order_no,
            'total_fee' => $order->amount_cents,
            'spbill_create_ip' => $clientIp ?: '127.0.0.1',
            'notify_url' => $cfg['notify_url'],
            'trade_type' => 'MWEB',
            'scene_info' => json_encode([
                'h5_info' => [
                    'type' => 'Wap',
                    'wap_url' => config('app.url'),
                    'wap_name' => '修仙英语',
                ],
            ], JSON_UNESCAPED_UNICODE),
        ];
        $params['sign'] = $this->sign($params, (string) $cfg['api_key']);

        $xml = $this->arrayToXml($params);
        $response = Http::withBody($xml, 'application/xml')
            ->post('https://api.mch.weixin.qq.com/pay/unifiedorder');

        $result = $this->xmlToArray((string) $response->body());
        if (($result['return_code'] ?? '') !== 'SUCCESS' || ($result['result_code'] ?? '') !== 'SUCCESS') {
            Log::error('[WechatH5] unifiedorder failed', $result);
            throw new \RuntimeException($result['return_msg'] ?? $result['err_code_des'] ?? '微信下单失败');
        }

        return [
            'pay_mode' => 'wechat_h5',
            'mweb_url' => (string) ($result['mweb_url'] ?? ''),
        ];
    }

    /** @param array<string, mixed> $payload */
    public function verifyNotify(array $payload): bool
    {
        $cfg = config('recharge.wechat');
        $sign = (string) ($payload['sign'] ?? '');
        unset($payload['sign']);
        $expected = $this->sign($payload, (string) ($cfg['api_key'] ?? ''));

        return $sign !== '' && hash_equals($expected, $sign);
    }

    /** @param array<string, mixed> $data */
    private function sign(array $data, string $apiKey): string
    {
        ksort($data);
        $parts = [];
        foreach ($data as $key => $value) {
            if ($value === '' || $value === null) {
                continue;
            }
            $parts[] = $key . '=' . $value;
        }
        $string = implode('&', $parts) . '&key=' . $apiKey;

        return strtoupper(md5($string));
    }

    /** @param array<string, mixed> $data */
    private function arrayToXml(array $data): string
    {
        $xml = '<xml>';
        foreach ($data as $key => $value) {
            $xml .= '<' . $key . '><![CDATA[' . $value . ']]></' . $key . '>';
        }
        $xml .= '</xml>';

        return $xml;
    }

    /** @return array<string, mixed> */
    private function xmlToArray(string $xml): array
    {
        $element = simplexml_load_string($xml, 'SimpleXMLElement', LIBXML_NOCDATA);
        if ($element === false) {
            return [];
        }

        return json_decode(json_encode($element), true) ?: [];
    }
}
