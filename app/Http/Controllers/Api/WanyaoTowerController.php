<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WanyaoTowerRun;
use App\Services\CurrencyService;
use App\Services\HeartDemonService;
use App\Services\WanyaoTowerService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class WanyaoTowerController extends Controller
{
    private const BOSS_MIN_CHARS = 30;

    public function __construct(
        private readonly WanyaoTowerService $tower,
        private readonly HeartDemonService $heartDemon,
        private readonly CurrencyService $currency,
    ) {}

    public function status(Request $r): JsonResponse
    {
        return response()->json($this->tower->getStatus($r->user()));
    }

    public function start(Request $r): JsonResponse
    {
        try {
            $run = $this->tower->startRun($r->user());
        } catch (\DomainException $e) {
            if (str_starts_with($e->getMessage(), 'RUN_IN_PROGRESS:')) {
                [, $id] = explode(':', $e->getMessage());
                return response()->json(['error' => 'run_in_progress', 'run_id' => (int)$id], 409);
            }
            throw $e;
        }
        return response()->json($this->responsePayload($run));
    }

    public function answer(Request $r): JsonResponse
    {
        $data = $r->validate([
            'run_id' => 'required|integer',
            'qid' => 'required|integer',
            'answer' => 'required|string|max:50',
        ]);
        $run = $this->findOwnedRun($r, $data['run_id']);
        try {
            $correct = $this->tower->submitAnswer($run, $data['qid'], $data['answer']);
        } catch (\DomainException $e) {
            return $this->errorResponse($e);
        }
        return response()->json(['correct' => $correct]);
    }

    public function settle(Request $r): JsonResponse
    {
        $data = $r->validate([
            'run_id' => 'required|integer',
            'boss_text' => 'nullable|string|max:2000',
        ]);
        $run = $this->findOwnedRun($r, $data['run_id']);
        // Phase 1 Boss 评分降级：字数 >= BOSS_MIN_CHARS 即视为通过。
        // 未来接 WritingService 真评分时改为评分模式。
        $bossPassed = mb_strlen(trim((string)($data['boss_text'] ?? ''))) >= self::BOSS_MIN_CHARS;
        try {
            $result = $this->tower->settle($run, $bossPassed, $this->heartDemon, $this->currency);
        } catch (\DomainException $e) {
            return $this->errorResponse($e);
        }
        return response()->json($result);
    }

    public function abandon(Request $r): JsonResponse
    {
        $data = $r->validate(['run_id' => 'required|integer']);
        $run = $this->findOwnedRun($r, $data['run_id']);
        try {
            $this->tower->abandon($run);
        } catch (\DomainException $e) {
            return $this->errorResponse($e);
        }
        return response()->json(['ok' => true]);
    }

    private function findOwnedRun(Request $r, int $runId): WanyaoTowerRun
    {
        return WanyaoTowerRun::where('user_id', $r->user()->id)->findOrFail($runId);
    }

    private function errorResponse(\DomainException $e): JsonResponse
    {
        $msg = $e->getMessage();
        // 把 Service 抛出的 message 映射为稳定 API 错误码 + 正确 HTTP 状态码
        if ($msg === 'FORBIDDEN') {
            return response()->json(['error' => 'forbidden'], 403);
        }
        if ($msg === 'RUN_NOT_ACTIVE') {
            return response()->json(['error' => 'run_not_active'], 422);
        }
        if (str_starts_with($msg, 'UNKNOWN_QID:')) {
            [, $qid] = explode(':', $msg);
            return response()->json(['error' => 'unknown_qid', 'qid' => (int)$qid], 422);
        }
        return response()->json(['error' => strtolower($msg)], 422);
    }

    private function responsePayload(WanyaoTowerRun $run): array
    {
        $snap = $run->questions_json ?? [];
        $clientQuestions = array_map(function ($q) {
            unset($q['answer']);
            return $q;
        }, $snap['questions'] ?? []);
        return [
            'run_id' => $run->id,
            'floor' => $run->floor,
            'theme' => $snap['theme'] ?? null,
            'vocab_tier' => $snap['vocab_tier'] ?? null,
            'questions' => $clientQuestions,
            'boss_prompt' => $snap['boss_prompt'] ?? null,
        ];
    }
}
