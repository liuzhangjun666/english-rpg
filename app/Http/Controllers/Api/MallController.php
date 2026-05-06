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
        return response()->json(['success'=>true, 'data'=>$items]);
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

    /** GET /api/mall/inventory */
    public function inventory(Request $request): JsonResponse
    {
        $items = $this->mallService->getUserItems($request->user()->id);
        return response()->json(['success'=>true, 'data'=>$items]);
    }
}
