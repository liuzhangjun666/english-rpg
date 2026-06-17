<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReadingPassage;
use App\Services\CurrencyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReadingBankController extends Controller
{
    public function __construct(
        private readonly CurrencyService $currencyService
    ) {
    }

    /**
     * GET /api/reading/questions?level=L1&stage=01
     * 返回：文章 + 题目列表
     */
    public function questions(Request $request): JsonResponse
    {
        $level = strtoupper(trim((string) $request->query('level', 'L1')));
        $stage = str_pad((string) $request->query('stage', '01'), 2, '0', STR_PAD_LEFT);

        $user = $request->user();
        $this->currencyService->recoverSpiritPower($user);
        $user->refresh();

        $passage = ReadingPassage::query()
            ->where('realm', $level)
            ->where('stage', $stage)
            ->orderBy('id')
            ->with(['questions' => function ($q) {
                $q->orderBy('question_no');
            }])
            ->first();

        if (!$passage) {
            return response()->json([
                'success' => false,
                'code' => 'NO_PASSAGE',
                'message' => '该关卡暂无阅读文章',
            ], 404);
        }

        $questions = $passage->questions->map(function ($q) {
            $options = $q->options ?? null;
            if (empty($options)) {
                // 兼容当前藏经阁 T/F 玩法：没有选项时，构造“正确项 + 错误项”
                $correct = trim((string) $q->correct_answer);
                $wrong = $correct === '' ? 'N/A' : ($correct . '（误）');
                $options = [
                    'A' => $correct,
                    'B' => $wrong,
                ];
            }
            return [
                'question_id' => 'RQ-' . (string) $q->id,
                'question_type' => $q->question_type,
                'question' => $q->question,
                'options' => $options,
                'correct_answer' => $q->correct_answer,
                'explanation' => $q->explanation,
                'reading_passage' => $q->passage?->content,
                'passage_id' => 'RP-' . (string) $q->passage_id,
                'question_no' => (int) $q->question_no,
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => [
                'level' => $level,
                'stage' => $stage,
                'passage' => [
                    'passage_id' => 'RP-' . (string) $passage->id,
                    'title' => $passage->title,
                    'content' => $passage->content,
                    'meta' => $passage->meta,
                ],
                'questions' => $questions,
                'total' => $questions->count(),
                'spirit_cost' => CurrencyService::SPIRIT_COST_PER_LEVEL,
                'current_spirit_power' => (int) ($user->fresh()->spirit_power ?? 0),
            ],
        ]);
    }
}

