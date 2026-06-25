<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PetController extends Controller
{
    public function __construct(private readonly PetService $petService) {}

    /** GET /api/pet/garden */
    public function garden(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->petService->garden($request->user()),
        ]);
    }

    /** POST /api/pet/select */
    public function select(Request $request): JsonResponse
    {
        $data = $request->validate(['pet_id' => 'required|string|max:32']);
        $result = $this->petService->select($request->user(), $data['pet_id']);

        return response()->json($result, ($result['success'] ?? false) ? 200 : 422);
    }

    /** POST /api/pet/interact */
    public function interact(Request $request): JsonResponse
    {
        $data = $request->validate(['pet_id' => 'required|string|max:32']);
        $result = $this->petService->interact($request->user(), $data['pet_id']);

        return response()->json($result, ($result['success'] ?? false) ? 200 : 422);
    }
}
