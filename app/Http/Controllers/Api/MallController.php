<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MallService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MallController extends Controller
{
    private MallService $mallService;
    public function __construct(MallService $mallService) { $this->mallService = $mallService; }

    /** GET /api/mall/items */
    public function items(Request $request): JsonResponse
    {
        $items = $this->mallService->getAvailableItems();
        if (empty($items)) {
            MallService::seedItems();
            $items = $this->mallService->getAvailableItems();
        }
        return response()->json(['success' => true, 'data' => ['items' => $items]]);
    }

    /** POST /api/mall/purchase */
    public function purchase(Request $request): JsonResponse
    {
        $data = $request->validate([
            'item_id' => 'required|string',
            'quantity' => 'nullable|integer|min:1|max:99',
        ]);

        $result = $this->mallService->purchase($request->user(), $data['item_id'], $data['quantity'] ?? 1);

        if (!$result['success']) {
            return response()->json(['success'=>false, 'code'=>'PURCHASE_FAILED', 'message'=>$result['message']], 422);
        }

        $user = $request->user()->fresh();
        return response()->json([
            'success' => true,
            'data' => ['message'=>$result['message'], 'user'=>$user],
        ]);
    }

    /** POST /api/mall/buy */
    public function buy(Request $request): JsonResponse
    {
        return $this->purchase($request);
    }

    /** GET /api/mall/inventory */
    public function inventory(Request $request): JsonResponse
    {
        $items = $this->mallService->getUserItems($request->user()->id);
        return response()->json(['success' => true, 'data' => $items]);
    }

    /** GET /api/mall/buffs - 当前生效的道具增益 */
    public function buffs(Request $request): JsonResponse
    {
        $buffs = $this->mallService->getActiveBuffs($request->user());
        return response()->json(['success' => true, 'data' => $buffs]);
    }

    /** POST /api/mall/use - 使用储物袋物品 */
    public function useItem(Request $request): JsonResponse
    {
        $data = $request->validate([
            'item_id' => 'required|string|max:50',
        ]);

        $result = $this->mallService->useItem($request->user(), $data['item_id']);
        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => $result['message'],
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => $result['message'],
            'data' => [
                'buffs' => $result['buffs'] ?? [],
                'user' => $request->user()->fresh(),
            ],
        ]);
    }
}
