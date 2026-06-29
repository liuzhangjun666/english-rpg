<?php

namespace App\Services\Payment;

class PaymentGatewayManager
{
    public function __construct(
        private readonly WechatH5PaymentGateway $wechatH5,
        private readonly MockPaymentGateway $mock,
    ) {
    }

    public function resolve(string $channel): PaymentGatewayInterface
    {
        if ($channel === 'wechat_h5') {
            if ($this->wechatH5->isConfigured()) {
                return $this->wechatH5;
            }
            if (config('recharge.mock_pay', false)) {
                return $this->mock;
            }
            throw new \RuntimeException('微信支付未配置，请联系管理员');
        }

        if ($channel === 'mock' && config('recharge.mock_pay', false)) {
            return $this->mock;
        }

        throw new \InvalidArgumentException('不支持的支付渠道');
    }
}
