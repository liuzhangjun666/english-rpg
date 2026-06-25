<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AiAskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiAskController extends Controller
{
    public function __construct(private readonly AiAskService $aiAskService) {}

    /** POST /api/ai-ask */
    public function ask(Request $request): JsonResponse
    {
        $data = $request->validate([
            'question' => 'nullable|string|max:300',
        ]);

        $result = $this->aiAskService->answer(
            $request->user(),
            $data['question'] ?? null,
        );

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }
}
