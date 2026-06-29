<?php

namespace App\Services;

use App\Models\RechargeOrder;
use App\Models\RechargeProduct;
use App\Models\User;
use App\Services\Payment\PaymentGatewayManager;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RechargeOrderService
{
    public function __construct(
        private readonly RechargeProductService $products,
        private readonly RechargeGuardService $guard,
        private readonly RechargeFulfillmentService $fulfillment,
        private readonly PaymentGatewayManager $payments,
    ) {
    }

    /** @return array<string, mixed> */
    public function create(User $user, string $productKey, string $payChannel, Request $request): array
    {
        $product = $this->products->findPurchasable($productKey);
        if (! $product) {
            throw new \InvalidArgumentException('商品不存在或已下架');
        }

        $this->products->assertLimits($user, $product);
        $this->guard->assertCanRecharge($user, (int) $product->price_cents);

        $order = RechargeOrder::query()->create([
            'order_no' => $this->generateOrderNo(),
            'user_id' => $user->id,
            'product_key' => $product->product_key,
            'amount_cents' => $product->price_cents,
            'currency' => 'CNY',
            'status' => 'pending',
            'pay_channel' => $payChannel,
            'client_meta' => $this->guard->clientMeta($request),
        ]);

        $gateway = $this->payments->resolve($payChannel);
        $pay = $gateway->createPayment($order, (string) $request->ip());

        return [
            'order' => $this->serializeOrder($order),
            'pay' => $pay,
        ];
    }

    public function markPaidFromNotify(string $orderNo, ?string $providerTradeNo = null): void
    {
        $order = RechargeOrder::query()->where('order_no', $orderNo)->first();
        if (! $order) {
            throw new \RuntimeException('订单不存在');
        }

        if ($providerTradeNo) {
            $order->provider_trade_no = $providerTradeNo;
            $order->save();
        }

        $this->fulfillment->deliver($order);
    }

    public function mockPay(string $orderNo, User $user): array
    {
        if (! config('recharge.mock_pay', false)) {
            throw new \RuntimeException('模拟支付未开启');
        }

        $order = RechargeOrder::query()
            ->where('order_no', $orderNo)
            ->where('user_id', $user->id)
            ->first();

        if (! $order) {
            throw new \InvalidArgumentException('订单不存在');
        }

        if ($order->status === 'paid') {
            return $this->serializeOrder($order->fresh());
        }

        $order->provider_trade_no = 'MOCK-' . Str::upper(Str::random(12));
        $order->save();

        $this->fulfillment->deliver($order->fresh());

        return $this->serializeOrder($order->fresh());
    }

    public function findForUser(string $orderNo, User $user): ?array
    {
        $order = RechargeOrder::query()
            ->where('order_no', $orderNo)
            ->where('user_id', $user->id)
            ->first();

        return $order ? $this->serializeOrder($order) : null;
    }

    public function exchangeJadeToStones(User $user, int $jadeAmount): array
    {
        $rate = max(1, (int) config('recharge.jade_to_stone_rate', 10));
        if ($jadeAmount < $rate) {
            throw new \InvalidArgumentException("至少兑换 {$rate} 仙玉");
        }
        if ($jadeAmount % $rate !== 0) {
            throw new \InvalidArgumentException('兑换数量须为 ' . $rate . ' 的整数倍');
        }

        $stones = (int) ($jadeAmount / $rate);

        app(JadeLedgerService::class)->debit(
            $user->fresh(),
            $jadeAmount,
            'exchange',
            null,
            "兑换 {$stones} 灵石"
        );

        $user = $user->fresh();
        $user->increment('spirit_stone', $stones);

        return [
            'jade_spent' => $jadeAmount,
            'stones_gained' => $stones,
            'jade_balance' => (int) $user->jade_balance,
            'spirit_stone' => (int) $user->spirit_stone,
        ];
    }

    /** @return array<string, mixed> */
    private function serializeOrder(RechargeOrder $order): array
    {
        return [
            'order_no' => $order->order_no,
            'product_key' => $order->product_key,
            'amount_cents' => $order->amount_cents,
            'status' => $order->status,
            'pay_channel' => $order->pay_channel,
            'paid_at' => optional($order->paid_at)?->toIso8601String(),
        ];
    }

    private function generateOrderNo(): string
    {
        return 'RCG' . now()->format('YmdHis') . Str::upper(Str::random(6));
    }
}
