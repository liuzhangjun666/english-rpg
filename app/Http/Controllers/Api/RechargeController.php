<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\JadeLedgerService;
use App\Services\Payment\WechatH5PaymentGateway;
use App\Services\RechargeOrderService;
use App\Services\RechargeProductService;
use App\Services\VipService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class RechargeController extends Controller
{
    public function __construct(
        private readonly RechargeProductService $productService,
        private readonly RechargeOrderService $orderService,
        private readonly JadeLedgerService $jadeLedger,
        private readonly VipService $vipService,
        private readonly WechatH5PaymentGateway $wechatH5,
    ) {
    }

    /** GET /api/recharge/catalog */
    public function catalog(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'products' => $this->productService->listForUser($user),
                'jade_balance' => (int) $user->jade_balance,
                'spirit_stone' => (int) $user->spirit_stone,
                'jade_to_stone_rate' => (int) config('recharge.jade_to_stone_rate', 10),
                'vip' => $this->vipService->snapshot($user),
                'pay_channels' => $this->availablePayChannels(),
            ],
        ]);
    }

    /** POST /api/recharge/orders */
    public function createOrder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_key' => 'required|string|max:50',
            'pay_channel' => 'nullable|string|in:wechat_h5,mock',
        ]);

        try {
            $payChannel = (string) ($data['pay_channel'] ?? 'wechat_h5');
            $result = $this->orderService->create(
                $request->user(),
                $data['product_key'],
                $payChannel,
                $request
            );

            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'code' => 'RECHARGE_REJECTED',
                'message' => $e->getMessage(),
            ], 422);
        } catch (\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'code' => 'RECHARGE_FAILED',
                'message' => $e->getMessage(),
            ], 503);
        }
    }

    /** GET /api/recharge/orders/{orderNo} */
    public function showOrder(Request $request, string $orderNo): JsonResponse
    {
        $order = $this->orderService->findForUser($orderNo, $request->user());
        if (! $order) {
            return response()->json([
                'success' => false,
                'code' => 'ORDER_NOT_FOUND',
                'message' => '订单不存在',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'order' => $order,
                'user' => $request->user()->fresh(),
            ],
        ]);
    }

    /** POST /api/recharge/mock-pay/{orderNo} */
    public function mockPay(Request $request, string $orderNo): JsonResponse
    {
        try {
            $order = $this->orderService->mockPay($orderNo, $request->user());

            return response()->json([
                'success' => true,
                'data' => [
                    'order' => $order,
                    'user' => $request->user()->fresh(),
                ],
            ]);
        } catch (\InvalidArgumentException|\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /** POST /api/recharge/exchange */
    public function exchange(Request $request): JsonResponse
    {
        $data = $request->validate([
            'jade_amount' => 'required|integer|min:1',
        ]);

        try {
            $result = $this->orderService->exchangeJadeToStones(
                $request->user(),
                (int) $data['jade_amount']
            );

            return response()->json([
                'success' => true,
                'data' => array_merge($result, [
                    'user' => $request->user()->fresh(),
                ]),
            ]);
        } catch (\InvalidArgumentException|\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /** POST /api/recharge/notify/wechat */
    public function wechatNotify(Request $request): Response
    {
        $xml = (string) $request->getContent();
        $element = simplexml_load_string($xml, 'SimpleXMLElement', LIBXML_NOCDATA);
        $payload = $element ? json_decode(json_encode($element), true) : [];

        if (! $this->wechatH5->verifyNotify($payload)) {
            return response('<xml><return_code><![CDATA[FAIL]]></return_code></xml>', 200)
                ->header('Content-Type', 'application/xml');
        }

        if (($payload['return_code'] ?? '') !== 'SUCCESS' || ($payload['result_code'] ?? '') !== 'SUCCESS') {
            return response('<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>', 200)
                ->header('Content-Type', 'application/xml');
        }

        $orderNo = (string) ($payload['out_trade_no'] ?? '');
        $tradeNo = (string) ($payload['transaction_id'] ?? '');

        try {
            $this->orderService->markPaidFromNotify($orderNo, $tradeNo);
        } catch (\Throwable) {
            return response('<xml><return_code><![CDATA[FAIL]]></return_code></xml>', 200)
                ->header('Content-Type', 'application/xml');
        }

        return response('<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>', 200)
            ->header('Content-Type', 'application/xml');
    }

    /** @return array<int, array<string, string>> */
    private function availablePayChannels(): array
    {
        $channels = [];
        if ($this->wechatH5->isConfigured()) {
            $channels[] = ['key' => 'wechat_h5', 'label' => '微信 H5'];
        }
        if (config('recharge.mock_pay', false)) {
            $channels[] = ['key' => 'mock', 'label' => '模拟支付（开发）'];
        }

        return $channels;
    }
}
