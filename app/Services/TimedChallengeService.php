<?php

namespace App\Services;

use App\Models\HeartDemon;
use App\Models\LearningRecord;
use App\Models\Question;
use App\Models\TimedChallengeAnswer;
use App\Models\TimedChallengeSession;
use App\Models\User;
use App\Support\StoryProgressSupport;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TimedChallengeService
{
    public const DURATION_SEC = 60;
    public const SPIRIT_COST = 5;
    public const DEMON_RATIO = 40;

    private const MODULE_TYPES = ['vocab', 'grammar', 'listening', 'speaking', 'reading', 'writing'];

    public function __construct(
        private readonly CurrencyService $currencyService,
        private readonly HeartDemonService $demonService,
        private readonly RealmService $realmService,
    ) {
    }

    public function start(User $user, string $moduleType, string $level, string $stage): array
    {
        if (!in_array($moduleType, self::MODULE_TYPES, true)) {
            return ['success' => false, 'code' => 'MODULE_NOT_SUPPORTED', 'message' => '不支持的挑战类型'];
        }

        if (!$this->currencyService->hasEnoughSpirit($user, self::SPIRIT_COST)) {
            return ['success' => false, 'code' => 'INSUFFICIENT_SPIRIT', 'message' => '学习精力不足'];
        }

        $this->currencyService->consumeSpirit($user, self::SPIRIT_COST);

        $session = TimedChallengeSession::create([
            'challenge_id' => 'tc_' . Str::lower(Str::random(20)),
            'user_id' => $user->id,
            'module_type' => $moduleType,
            'level' => $level,
            'stage' => $stage,
            'duration_sec' => self::DURATION_SEC,
            'spirit_cost' => self::SPIRIT_COST,
            'status' => 'running',
            'started_at' => now(),
            'asked_question_ids' => [],
            'weak_tag_stats' => [],
        ]);

        return [
            'success' => true,
            'data' => [
                'challenge_id' => $session->challenge_id,
                'duration_sec' => $session->duration_sec,
                'start_at' => $session->started_at?->toIso8601String(),
                'spirit_cost' => $session->spirit_cost,
                'question_count_hint' => 999,
            ],
        ];
    }

    public function nextQuestion(User $user, string $challengeId): array
    {
        $session = $this->getSession($user, $challengeId);
        if (!$session) {
            return ['success' => false, 'code' => 'SESSION_NOT_FOUND', 'message' => '挑战不存在'];
        }

        if (!$this->ensureSessionActive($session)) {
            return ['success' => false, 'code' => 'CHALLENGE_ENDED', 'message' => '挑战已结束'];
        }

        $question = $this->pickQuestion($session);
        if (!$question) {
            return ['success' => false, 'code' => 'QUESTION_NOT_FOUND', 'message' => '暂无可用题目'];
        }

        $asked = $session->asked_question_ids ?? [];
        $asked[] = $question->question_id;
        $session->asked_question_ids = array_values(array_unique($asked));
        $session->save();

        return [
            'success' => true,
            'data' => [
                'question_id' => $question->question_id,
                'question_type' => 'multiple_choice',
                'stem' => (string) $question->question,
                'options' => $question->options,
                'knowledge_tag' => $this->resolveKnowledgeTag($question),
            ],
        ];
    }

    public function submitAnswer(
        User $user,
        string $challengeId,
        string $questionId,
        string $answer,
        int $elapsedMs
    ): array {
        $session = $this->getSession($user, $challengeId);
        if (!$session) {
            return ['success' => false, 'code' => 'SESSION_NOT_FOUND', 'message' => '挑战不存在'];
        }

        if (!$this->ensureSessionActive($session)) {
            return ['success' => false, 'code' => 'CHALLENGE_ENDED', 'message' => '挑战已结束'];
        }

        $question = Question::where('question_id', $questionId)->first();
        if (!$question) {
            return ['success' => false, 'code' => 'QUESTION_NOT_FOUND', 'message' => '题目不存在'];
        }

        $correct = $this->normalizeAnswer($question->correct_answer) === $this->normalizeAnswer($answer);
        $knowledgeTag = $this->resolveKnowledgeTag($question);

        $stats = $session->weak_tag_stats ?? [];
        $stats[$knowledgeTag] = $stats[$knowledgeTag] ?? ['total' => 0, 'wrong' => 0];
        $stats[$knowledgeTag]['total']++;
        if (!$correct) {
            $stats[$knowledgeTag]['wrong']++;
        }

        $combo = $correct ? ($session->current_combo + 1) : 0;
        $scoreDelta = $correct ? (10 + min(max($combo - 1, 0), 5)) : 0;

        DB::transaction(function () use (
            $session,
            $question,
            $answer,
            $correct,
            $elapsedMs,
            $scoreDelta,
            $combo,
            $stats
        ) {
            $session->total_answered += 1;
            if ($correct) {
                $session->correct_count += 1;
            }
            $session->final_score += $scoreDelta;
            $session->current_combo = $combo;
            $session->highest_combo = max((int) $session->highest_combo, (int) $combo);
            $session->weak_tag_stats = $stats;
            $session->save();

            TimedChallengeAnswer::create([
                'session_id' => $session->id,
                'question_id' => $question->question_id,
                'knowledge_tag' => $this->resolveKnowledgeTag($question),
                'user_answer' => $answer,
                'is_correct' => $correct,
                'elapsed_ms' => max(0, $elapsedMs),
                'score_delta' => $scoreDelta,
            ]);
        });

        if ($correct) {
            $this->demonService->recordCorrect($user->id, $question->question_id);
        } else {
            $this->demonService->recordWrong($user->id, $question->question_id, $session->module_type, $session->level);
        }

        $remainSec = $this->remainingSeconds($session);
        if ($remainSec <= 0) {
            $session->status = 'expired';
            $session->ended_at = now();
            $session->save();
        }

        return [
            'success' => true,
            'data' => [
                'correct' => $correct,
                'score' => (int) $session->final_score,
                'combo' => (int) $session->current_combo,
                'remain_sec' => max(0, $remainSec),
            ],
        ];
    }

    public function finish(User $user, string $challengeId): array
    {
        $session = $this->getSession($user, $challengeId);
        if (!$session) {
            return ['success' => false, 'code' => 'SESSION_NOT_FOUND', 'message' => '挑战不存在'];
        }

        if ($session->status === 'running') {
            $session->status = 'finished';
            $session->ended_at = now();
            $session->save();
        }

        $accuracy = $session->total_answered > 0
            ? (int) round(($session->correct_count / $session->total_answered) * 100)
            : 0;

        $expGained = (int) floor($session->correct_count * 1.5);
        $pointsGained = $this->calcPoints((int) $session->final_score);

        if (!$session->rewards_granted) {
            DB::transaction(function () use ($user, $session, $expGained, $pointsGained, $accuracy) {
                $user->increment('exp', $expGained);
                $user->increment('spirit_stone', $pointsGained);

                LearningRecord::create([
                    'user_id' => $user->id,
                    'activity_type' => $session->module_type,
                    'activity_id' => $session->challenge_id,
                    'question_id' => 'timed_challenge',
                    'is_correct' => $accuracy >= 60,
                    'exp_gained' => $expGained,
                    'spirit_cost' => (int) $session->spirit_cost,
                    'time_spent' => self::DURATION_SEC - max(0, $this->remainingSeconds($session)),
                    'answer_data' => [
                        'final_score' => (int) $session->final_score,
                        'total_answered' => (int) $session->total_answered,
                        'correct_count' => (int) $session->correct_count,
                        'accuracy' => $accuracy,
                        'module_type' => $session->module_type,
                        'is_timed_challenge' => true,
                    ],
                ]);

                $session->rewards_granted = true;
                $session->exp_gained = $expGained;
                $session->points_gained = $pointsGained;
                $session->save();
            });
        } else {
            $expGained = (int) $session->exp_gained;
            $pointsGained = (int) $session->points_gained;
        }

        $weakTags = $this->extractWeakTags($session->weak_tag_stats ?? []);
        $storyReward = StoryProgressSupport::grantMijingCollectible($user, [
            'final_score' => (int) $session->final_score,
            'accuracy' => $accuracy,
        ]);

        return [
            'success' => true,
            'data' => [
                'total_answered' => (int) $session->total_answered,
                'correct_count' => (int) $session->correct_count,
                'accuracy' => $accuracy,
                'final_score' => (int) $session->final_score,
                'exp_gained' => $expGained,
                'points_gained' => $pointsGained,
                'weak_tags' => $weakTags,
                'collectible_id' => $storyReward['collectible_id'] ?? null,
                'story_progress' => $storyReward['story_progress'] ?? StoryProgressSupport::normalizeStoryProgress($user->story_progress),
                'progress_currency' => $storyReward['progress_currency'] ?? StoryProgressSupport::normalizeProgressCurrency($user->progress_currency),
                'review_pack_id' => 'rp_' . Str::lower(Str::random(12)),
                'realm_progress' => $realmProgress,
            ],
        ];
    }

    private function resolveDimensionKey(string $moduleType): ?string
    {
        return match ($moduleType) {
            'vocab' => 'vocabulary',
            'grammar' => 'grammar',
            'listening' => 'listening',
            'speaking' => 'speaking',
            'reading' => 'reading',
            'writing' => 'writing',
            default => null,
        };
    }

    private function getSession(User $user, string $challengeId): ?TimedChallengeSession
    {
        return TimedChallengeSession::where('challenge_id', $challengeId)
            ->where('user_id', $user->id)
            ->first();
    }

    private function ensureSessionActive(TimedChallengeSession $session): bool
    {
        if ($session->status !== 'running') {
            return false;
        }

        if ($this->remainingSeconds($session) > 0) {
            return true;
        }

        $session->status = 'expired';
        $session->ended_at = now();
        $session->save();
        return false;
    }

    private function pickQuestion(TimedChallengeSession $session): ?Question
    {
        $asked = $session->asked_question_ids ?? [];
        $asked = empty($asked) ? ['__none__'] : $asked;
        $useDemon = random_int(1, 100) <= self::DEMON_RATIO;

        if ($useDemon) {
            $demonQuestion = $this->pickDemonQuestion($session, $asked);
            if ($demonQuestion) {
                return $demonQuestion;
            }
        }

        $normal = Question::where('type', $session->module_type)
            ->where('realm', $session->level)
            ->where('stage', $session->stage)
            ->whereNotIn('question_id', $asked)
            ->inRandomOrder()
            ->first();
        if ($normal) {
            return $normal;
        }

        $fallback = Question::where('type', $session->module_type)
            ->whereNotIn('question_id', $asked)
            ->inRandomOrder()
            ->first();
        if ($fallback) {
            return $fallback;
        }

        return Question::where('type', $session->module_type)
            ->inRandomOrder()
            ->first();
    }

    private function pickDemonQuestion(TimedChallengeSession $session, array $asked): ?Question
    {
        $demonIds = HeartDemon::where('user_id', $session->user_id)
            ->where('is_mastered', false)
            ->where('type', $session->module_type)
            ->where(function ($q) use ($session) {
                $q->where('realm', $session->level)->orWhereNull('realm');
            })
            ->whereNotIn('question_id', $asked)
            ->limit(30)
            ->pluck('question_id');

        if ($demonIds->isEmpty()) {
            return null;
        }

        return Question::whereIn('question_id', $demonIds)
            ->where('type', $session->module_type)
            ->inRandomOrder()
            ->first();
    }

    private function remainingSeconds(TimedChallengeSession $session): int
    {
        if (!$session->started_at) {
            return 0;
        }
        $elapsed = now()->diffInSeconds($session->started_at);
        return max(0, (int) $session->duration_sec - $elapsed);
    }

    private function normalizeAnswer(?string $value): string
    {
        return mb_strtolower(trim((string) $value));
    }

    private function resolveKnowledgeTag(Question $question): string
    {
        if (!empty($question->word)) {
            return (string) $question->word;
        }
        return implode('_', array_filter([(string) $question->type, (string) $question->realm, (string) $question->stage]));
    }

    private function extractWeakTags(array $stats): array
    {
        $ranked = [];
        foreach ($stats as $tag => $meta) {
            $total = (int) ($meta['total'] ?? 0);
            $wrong = (int) ($meta['wrong'] ?? 0);
            if ($total <= 0 || $wrong <= 0) {
                continue;
            }
            $ranked[] = [
                'tag' => $tag,
                'rate' => $wrong / $total,
                'wrong' => $wrong,
            ];
        }

        usort($ranked, fn ($a, $b) => ($b['rate'] <=> $a['rate']) ?: ($b['wrong'] <=> $a['wrong']));
        return array_values(array_map(fn ($item) => $item['tag'], array_slice($ranked, 0, 3)));
    }

    private function calcPoints(int $score): int
    {
        return match (true) {
            $score >= 300 => 12,
            $score >= 220 => 8,
            $score >= 120 => 5,
            default => 0,
        };
    }
}
