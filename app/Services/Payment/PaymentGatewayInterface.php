<?php

namespace App\Services\Payment;

use App\Models\RechargeOrder;

interface PaymentGatewayInterface
{
    public function channel(): string;

    /** @return array{pay_mode: string, mweb_url?: string, mock_pay_path?: string} */
    public function createPayment(RechargeOrder $order, string $clientIp): array;
}
