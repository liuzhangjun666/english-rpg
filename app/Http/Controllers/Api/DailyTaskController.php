<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DailyTaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyTaskController extends Controller
{
    public function __construct(private readonly DailyTaskService $dailyTaskService) {}

    /** GET /api/daily/tasks */
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->dailyTaskService->getStatus($request->user()),
        ]);
    }

    /** POST /api/daily/tasks/claim */
    public function claim(Request $request): JsonResponse
    {
        $result = $this->dailyTaskService->claim($request->user());
        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => $result['message'],
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => $result['message'],
            'data' => $result['user'],
        ]);
    }

    /** POST /api/daily/signin */
    public function signIn(Request $request): JsonResponse
    {
        $result = $this->dailyTaskService->signIn($request->user());

        return response()->json([
            'success' => true,
            'message' => $result['message'],
            'data' => [
                'already_signed' => $result['already_signed'],
                'streak_days' => $result['streak_days'],
                'spirit_recovered' => $result['spirit_recovered'] ?? false,
                'user' => $result['user'],
            ],
        ]);
    }
}
