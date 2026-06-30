<?php

namespace App\Services;

use App\Models\ListeningPassage;
use App\Models\ListeningQuestion;
use App\Models\Question;
use App\Models\User;
use Illuminate\Support\Collection;

class ListeningBankService
{
    public function __construct(
        private readonly PracticeLevelService $levelService,
        private readonly HeartDemonService $demonService,
    ) {
    }

    public function hasPassageBank(User $user): bool
    {
        return $this->passageQueryForUser($user)->exists();
    }

    /**
     * @return array{questions: list<array<string, mixed>>, passages: list<array<string, mixed>>}|null
     */
    public function buildSession(User $user, int $stageNo, int $targetCount = 10): ?array
    {
        $stage = str_pad((string) max(1, $stageNo), 2, '0', STR_PAD_LEFT);
        $passages = $this->passageQueryForUser($user)
            ->where('stage', $stage)
            ->with(['questions' => function ($q) {
                $q->orderBy('question_no');
            }])
            ->orderBy('passage_code')
            ->get();

        if ($passages->isEmpty()) {
            return null;
        }

        $flat = [];
        $passagePayload = [];
        foreach ($passages as $passage) {
            $total = $passage->questions->count();
            if ($total === 0) {
                continue;
            }

            $passagePayload[] = [
                'passage_id' => 'LP-' . (string) $passage->id,
                'passage_code' => $passage->passage_code,
                'title' => $passage->title,
                'listening_text' => $passage->listening_text,
                'word' => $passage->word,
                'question_count' => $total,
            ];

            foreach ($passage->questions as $question) {
                $flat[] = $this->formatQuestion($passage, $question, $total);
                if (count($flat) >= $targetCount) {
                    break 2;
                }
            }
        }

        if ($flat === []) {
            return null;
        }

        $flat = $this->injectDemons($user, $flat, $targetCount);

        return [
            'questions' => $flat,
            'passages' => $passagePayload,
        ];
    }

    public function getQuestionPool(User $user): Collection
    {
        $passageIds = $this->passageQueryForUser($user)->pluck('id');
        if ($passageIds->isEmpty()) {
            return collect();
        }

        return ListeningQuestion::query()
            ->whereIn('passage_id', $passageIds)
            ->with('passage')
            ->orderBy('passage_id')
            ->orderBy('question_no')
            ->get()
            ->map(fn (ListeningQuestion $question) => $this->formatQuestion(
                $question->passage,
                $question,
                (int) $question->passage?->questions()->count()
            ));
    }

    public function isQuestionInUserPool(User $user, string $questionId): bool
    {
        if (!preg_match('/^LQ-(\d+)$/', trim($questionId), $m)) {
            return false;
        }

        $question = ListeningQuestion::query()
            ->with('passage')
            ->find((int) $m[1]);

        if (!$question || !$question->passage) {
            return false;
        }

        $realm = strtoupper((string) ($question->passage->realm ?? ''));
        $userRealm = $this->levelService->getRealmCode($user);
        $prefix = $this->levelService->getRealmPrefix($user);

        return $realm === $userRealm || str_starts_with($realm, $prefix);
    }

    private function passageQueryForUser(User $user)
    {
        $realmCode = $this->levelService->getRealmCode($user);
        $prefix = $this->levelService->getRealmPrefix($user);

        return ListeningPassage::query()->where(function ($q) use ($realmCode, $prefix) {
            $q->where('realm', $realmCode)
                ->orWhere('realm', 'like', $prefix . '%');
        });
    }

    /**
     * @param  list<array<string, mixed>>  $normal
     * @return list<array<string, mixed>>
     */
    private function injectDemons(User $user, array $normal, int $targetCount): array
    {
        $realmCode = (string) ($user->realm ?? 'L1');
        $demonCount = (int) round($targetCount * $this->demonService->injectionRatioFor($user->id, 'listening', $realmCode));
        if ($demonCount <= 0) {
            return $normal;
        }

        $demons = $this->demonService->getPendingDemons($user->id, max(1, $demonCount), 'listening', $realmCode);
        $injected = [];

        foreach ($demons as $demon) {
            $qid = (string) ($demon['question_id'] ?? '');
            if (preg_match('/^LQ-(\d+)$/', $qid, $m)) {
                $question = ListeningQuestion::query()->with('passage')->find((int) $m[1]);
                if ($question && $question->passage && $this->isQuestionInUserPool($user, $qid)) {
                    $row = $this->formatQuestion(
                        $question->passage,
                        $question,
                        (int) $question->passage->questions()->count()
                    );
                    $row['_is_demon'] = true;
                    $row['_demon_wrong_count'] = $demon['wrong_count'];
                    $injected[] = $row;
                }
                continue;
            }

            $legacy = Question::query()->where('question_id', $qid)->where('type', 'listening')->first();
            if ($legacy && $this->levelService->isQuestionInUserPool($user, 'listening', $qid)) {
                $row = $legacy->toArray();
                $row['passage_id'] = null;
                $row['_is_demon'] = true;
                $row['_demon_wrong_count'] = $demon['wrong_count'];
                $injected[] = $row;
            }
        }

        if ($injected === []) {
            return $normal;
        }

        $injectedIds = array_column($injected, 'question_id');
        $remaining = array_values(array_filter($normal, fn ($q) => !in_array($q['question_id'] ?? '', $injectedIds, true)));
        shuffle($remaining);

        $keep = max(0, $targetCount - count($injected));
        $merged = array_merge(array_slice($remaining, 0, $keep), $injected);
        shuffle($merged);

        return array_slice($merged, 0, $targetCount);
    }

    private function formatQuestion(ListeningPassage $passage, ListeningQuestion $question, int $totalInPassage): array
    {
        return [
            'id' => $question->id,
            'question_id' => 'LQ-' . (string) $question->id,
            'type' => 'listening',
            'realm' => $passage->realm,
            'stage' => $passage->stage,
            'question' => $question->question,
            'options' => $question->options,
            'correct_answer' => $question->correct_answer,
            'explanation' => $question->explanation,
            'word' => $question->word ?: $passage->word,
            'listening_text' => $passage->listening_text,
            'passage_id' => 'LP-' . (string) $passage->id,
            'passage_code' => $passage->passage_code,
            'passage_title' => $passage->title,
            'question_no_in_passage' => (int) $question->question_no,
            'passage_question_total' => max(1, $totalInPassage),
        ];
    }
}
