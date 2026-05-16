<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TimedChallengeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MijingChallengeController extends Controller
{
    public function __construct(
        private readonly TimedChallengeService $challengeService,
    ) {
    }

    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'module_type' => 'required|string',
            'level' => 'required|string',
            'stage' => 'required|string',
        ]);

        $result = $this->challengeService->start(
            $request->user(),
            $data['module_type'],
            $data['level'],
            $data['stage'],
        );

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'code' => $result['code'] ?? 'START_FAILED',
                'message' => $result['message'] ?? '限时挑战开启失败',
            ], 422);
        }

        return response()->json($result);
    }

    public function nextQuestion(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challenge_id' => 'required|string',
        ]);

        $result = $this->challengeService->nextQuestion($request->user(), $data['challenge_id']);
        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'code' => $result['code'] ?? 'NEXT_QUESTION_FAILED',
                'message' => $result['message'] ?? '获取题目失败',
            ], 422);
        }

        return response()->json($result);
    }

    public function submitAnswer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challenge_id' => 'required|string',
            'question_id' => 'required|string',
            'answer' => 'required|string',
            'elapsed_ms' => 'nullable|integer|min:0',
        ]);

        $result = $this->challengeService->submitAnswer(
            $request->user(),
            $data['challenge_id'],
            $data['question_id'],
            $data['answer'],
            (int) ($data['elapsed_ms'] ?? 0),
        );

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'code' => $result['code'] ?? 'SUBMIT_FAILED',
                'message' => $result['message'] ?? '提交答案失败',
            ], 422);
        }

        return response()->json($result);
    }

    public function finish(Request $request): JsonResponse
    {
        $data = $request->validate([
            'challenge_id' => 'required|string',
        ]);

        $result = $this->challengeService->finish($request->user(), $data['challenge_id']);
        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'code' => $result['code'] ?? 'FINISH_FAILED',
                'message' => $result['message'] ?? '结算失败',
            ], 422);
        }

        return response()->json($result);
    }
}

