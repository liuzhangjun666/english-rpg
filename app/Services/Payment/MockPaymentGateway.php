<?php

namespace App\Services\Payment;

use App\Models\RechargeOrder;

class MockPaymentGateway implements PaymentGatewayInterface
{
    public function channel(): string
    {
        return 'mock';
    }

    public function createPayment(RechargeOrder $order, string $clientIp): array
    {
        return [
            'pay_mode' => 'mock',
            'mock_pay_path' => '/api/recharge/mock-pay/' . $order->order_no,
        ];
    }
}
