<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\VocabularyAssessment;
use App\Models\VocabularyAssessmentRecord;
use App\Services\VocabAssessmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VocabAssessmentController extends Controller
{
    public function __construct(
        private readonly VocabAssessmentService $service,
    ) {
    }

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        $requestedUserId = (int) $request->query('user_id', 0);
        if ($requestedUserId > 0 && $requestedUserId !== (int) $user->id) {
            return response()->json([
                'success' => false,
                'code' => 'FORBIDDEN_USER',
                'message' => '无权查询该用户状态',
            ], 403);
        }

        $status = $this->service->getAssessmentStatusForUser($user);

        return response()->json([
            'success' => true,
            'data' => $status,
        ]);
    }

    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'sometimes|integer|min:1',
            'school_stage' => 'required|string|max:30',
            'learning_goal' => 'nullable|string|max:30',
        ]);

        $user = $request->user();
        if (!empty($data['user_id']) && (int) $data['user_id'] !== (int) $user->id) {
            return response()->json([
                'success' => false,
                'code' => 'FORBIDDEN_USER',
                'message' => '无权为该用户开启测试',
            ], 403);
        }

        $assessment = $this->service->startAssessment(
            $user,
            (string) $data['school_stage'],
            isset($data['learning_goal']) ? (string) $data['learning_goal'] : null
        );

        return response()->json([
            'success' => true,
            'data' => [
                'assessment_id' => (int) $assessment->id,
                'current_level' => (int) $assessment->current_level,
                'total_questions' => (int) $assessment->total_questions,
            ],
        ]);
    }

    public function nextQuestion(Request $request): JsonResponse
    {
        $data = $request->validate([
            'assessment_id' => 'required|integer|min:1',
        ]);

        $assessment = $this->service->getOwnedAssessment((int) $data['assessment_id'], (int) $request->user()->id);
        if (!$assessment) {
            return response()->json([
                'success' => false,
                'code' => 'ASSESSMENT_NOT_FOUND',
                'message' => '测试记录不存在',
            ], 404);
        }

        if ($assessment->status !== 'running') {
            return response()->json([
                'success' => false,
                'code' => 'ASSESSMENT_NOT_RUNNING',
                'message' => '该测试不在进行中',
            ], 422);
        }

        $picked = $this->service->pickNextVocabularyQuestion((int) $assessment->id);

        if (!empty($picked['finished'])) {
            return response()->json([
                'success' => true,
                'data' => [
                    'finished' => true,
                    'question' => null,
                    'progress' => [
                        'current' => (int) $assessment->answered_count,
                        'total' => (int) $assessment->total_questions,
                        'current_level' => (int) $assessment->current_level,
                    ],
                ],
            ]);
        }

        if (empty($picked['question'])) {
            return response()->json([
                'success' => false,
                'code' => 'NO_QUESTIONS_FOR_ASSESSMENT',
                'message' => '题库不足，当前无法继续出题，请稍后重试或联系管理员补充题库。',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'question' => $picked['question'],
                'progress' => [
                    'current' => min((int) $assessment->answered_count + 1, (int) $assessment->total_questions),
                    'total' => (int) $assessment->total_questions,
                    'current_level' => (int) $assessment->current_level,
                ],
            ],
        ]);
    }

    public function submitAnswer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'assessment_id' => 'required|integer|min:1',
            'user_id' => 'sometimes|integer|min:1',
            'question_id' => 'required|string|max:50',
            'user_answer' => 'required|string|max:20',
            'time_spent' => 'nullable|integer|min:0|max:3600',
        ]);

        $user = $request->user();
        if (!empty($data['user_id']) && (int) $data['user_id'] !== (int) $user->id) {
            return response()->json([
                'success' => false,
                'code' => 'FORBIDDEN_USER',
                'message' => '无权提交该用户答案',
            ], 403);
        }

        /** @var VocabularyAssessment|null $assessment */
        $assessment = $this->service->getOwnedAssessment((int) $data['assessment_id'], (int) $user->id);
        if (!$assessment) {
            return response()->json([
                'success' => false,
                'code' => 'ASSESSMENT_NOT_FOUND',
                'message' => '测试记录不存在',
            ], 404);
        }

        if ($assessment->status !== 'running') {
            return response()->json([
                'success' => false,
                'code' => 'ASSESSMENT_NOT_RUNNING',
                'message' => '该测试不在进行中',
            ], 422);
        }

        if ((int) $assessment->answered_count >= (int) $assessment->total_questions) {
            return response()->json([
                'success' => true,
                'data' => [
                    'finished' => true,
                    'message' => '已达到总题数，请结算测试结果。',
                ],
            ]);
        }

        $question = Question::query()
            ->where('question_id', (string) $data['question_id'])
            ->where('type', 'vocab')
            ->where('is_assessment', 1)
            ->first();

        if (!$question) {
            return response()->json([
                'success' => false,
                'code' => 'QUESTION_NOT_FOUND',
                'message' => '题目不存在或不属于灵根测试题库',
            ], 404);
        }

        $existingRecord = VocabularyAssessmentRecord::query()
            ->where('assessment_id', $assessment->id)
            ->where('question_id', $question->question_id)
            ->first();

        if ($existingRecord) {
            return response()->json([
                'success' => false,
                'code' => 'QUESTION_ALREADY_ANSWERED',
                'message' => '该题已提交，请获取下一题。',
            ], 422);
        }

        $timeSpent = (int) ($data['time_spent'] ?? 0);
        $expectedTime = max(1, (int) ($question->expected_time ?? 5));

        $checked = $this->service->checkVocabularyAnswer($question, (string) $data['user_answer']);
        $adjusted = $this->service->adjustAssessmentLevel(
            $assessment,
            (bool) $checked['is_correct'],
            $timeSpent,
            $expectedTime
        );

        $isCorrect = (bool) $checked['is_correct'];

        DB::transaction(function () use ($assessment, $user, $question, $checked, $adjusted, $timeSpent, $expectedTime, $isCorrect) {
            VocabularyAssessmentRecord::query()->create([
                'assessment_id' => (int) $assessment->id,
                'user_id' => (int) $user->id,
                'question_id' => (string) $question->question_id,
                'assessment_level' => (int) ($question->assessment_level ?? $adjusted['level_before']),
                'play_mode' => (string) ($question->play_mode ?? ''),
                'user_answer' => (string) $checked['normalized_answer'],
                'correct_answer' => (string) $checked['correct_answer'],
                'is_correct' => $isCorrect ? 1 : 0,
                'expected_time' => $expectedTime,
                'time_spent' => $timeSpent,
                'level_before' => (int) $adjusted['level_before'],
                'level_after' => (int) $adjusted['level_after'],
            ]);

            $nextAnswered = (int) $assessment->answered_count + 1;
            $nextCorrect = (int) $assessment->correct_count + ($isCorrect ? 1 : 0);
            $accuracy = $nextAnswered > 0 ? round(($nextCorrect / $nextAnswered) * 100, 2) : 0;

            $assessment->answered_count = $nextAnswered;
            $assessment->correct_count = $nextCorrect;
            $assessment->accuracy = $accuracy;
            $assessment->current_level = (int) $adjusted['level_after'];
            $assessment->save();
        });

        $assessment->refresh();
        $finished = (int) $assessment->answered_count >= (int) $assessment->total_questions;

        return response()->json([
            'success' => true,
            'data' => [
                'is_correct' => $isCorrect,
                'correct_answer' => (string) $checked['correct_answer'],
                'explanation' => (string) $checked['explanation'],
                'level_before' => (int) $adjusted['level_before'],
                'level_after' => (int) $adjusted['level_after'],
                'finished' => $finished,
            ],
        ]);
    }

    public function finish(Request $request): JsonResponse
    {
        $data = $request->validate([
            'assessment_id' => 'required|integer|min:1',
            'user_id' => 'sometimes|integer|min:1',
        ]);

        $user = $request->user();
        if (!empty($data['user_id']) && (int) $data['user_id'] !== (int) $user->id) {
            return response()->json([
                'success' => false,
                'code' => 'FORBIDDEN_USER',
                'message' => '无权结束该用户测试',
            ], 403);
        }

        /** @var VocabularyAssessment|null $assessment */
        $assessment = $this->service->getOwnedAssessment((int) $data['assessment_id'], (int) $user->id);
        if (!$assessment) {
            return response()->json([
                'success' => false,
                'code' => 'ASSESSMENT_NOT_FOUND',
                'message' => '测试记录不存在',
            ], 404);
        }

        $result = $this->service->calculateVocabularyAssessmentResult((int) $assessment->id);

        DB::transaction(function () use ($assessment, $result) {
            $assessment->final_level = (int) $result['final_level'];
            $assessment->final_realm = (string) $result['final_realm'];
            $assessment->final_stage = (string) $result['final_stage'];
            $assessment->level_result_json = $result['level_results'];
            $assessment->suggestion_json = $result['suggestions'];
            $assessment->status = 'finished';
            $assessment->save();
        });

        $this->service->updateUserLearningProfile(
            (int) $user->id,
            $result,
            (string) ($assessment->school_stage ?? ''),
            (string) ($assessment->learning_goal ?? '')
        );

        return response()->json([
            'success' => true,
            'data' => [
                'final_level' => (int) $result['final_level'],
                'final_realm' => (string) $result['final_realm'],
                'level_results' => $result['level_results'],
                'suggestions' => $result['suggestions'],
            ],
        ]);
    }
}
