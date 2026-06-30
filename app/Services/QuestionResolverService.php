<?php

namespace App\Services;

use App\Models\ListeningQuestion;
use App\Models\Question;
use App\Models\ReadingQuestion;
use App\Models\VocabularyWord;

/**
 * 统一解析 VW-* / RQ-* / levelup_questions 题目并判分。
 */
class QuestionResolverService
{
    public function __construct(
        private readonly VocabQuestionBuilder $vocabBuilder
    ) {
    }

    public function resolve(string $questionId): ?array
    {
        $questionId = trim($questionId);
        if ($questionId === '') {
            return null;
        }

        if (preg_match('/^VW-(\d+)$/', $questionId, $m)) {
            return $this->resolveVocab((int) $m[1], $questionId);
        }

        if (preg_match('/^RQ-(\d+)$/', $questionId, $m)) {
            return $this->resolveReading((int) $m[1], $questionId);
        }

        if (preg_match('/^LQ-(\d+)$/', $questionId, $m)) {
            return $this->resolveListening((int) $m[1], $questionId);
        }

        $question = Question::where('question_id', $questionId)->first();
        if (!$question) {
            return null;
        }

        return $this->normalizeLevelupQuestion($question);
    }

    public function resolveMany(iterable $questionIds): array
    {
        $items = [];
        foreach ($questionIds as $questionId) {
            $resolved = $this->resolve((string) $questionId);
            if ($resolved) {
                $items[] = $resolved;
            }
        }

        return $items;
    }

    public function isCorrect(string $questionId, string $answer, ?string $answerText = null): bool
    {
        $resolved = $this->resolve($questionId);
        if (!$resolved) {
            return false;
        }

        $type = (string) ($resolved['type'] ?? '');
        if ($type === 'vocab') {
            if ($answerText !== null && trim($answerText) !== '') {
                return $this->vocabBuilder->isMeaningCorrect($questionId, $answerText);
            }

            $options = $resolved['options'] ?? [];
            $key = strtoupper(trim($answer));
            if (isset($options[$key])) {
                return $this->vocabBuilder->isMeaningCorrect($questionId, (string) $options[$key]);
            }

            return $this->vocabBuilder->isMeaningCorrect($questionId, $answer);
        }

        if ($type === 'reading') {
            return $this->isReadingAnswerCorrect($resolved, $answer, $answerText);
        }

        return $this->normalize($resolved['correct_answer'] ?? '') === $this->normalize($answer);
    }

    public function getType(string $questionId): ?string
    {
        return $this->resolve($questionId)['type'] ?? null;
    }

    public function getRealm(string $questionId): ?string
    {
        return $this->resolve($questionId)['realm'] ?? null;
    }

    public function buildExamQuestionPool(string $realm, int $limit = 30): array
    {
        $items = Question::query()
            ->where('realm', $realm)
            ->inRandomOrder()
            ->limit($limit)
            ->get()
            ->map(fn (Question $q) => $this->normalizeLevelupQuestion($q))
            ->filter()
            ->values()
            ->all();

        if (count($items) >= 10) {
            return array_slice($items, 0, $limit);
        }

        $vocabItems = $this->vocabBuilder
            ->buildFromPool(
                VocabularyWord::query()->where('level_tag', '小学')->inRandomOrder()->limit(20)->get()
            );

        return array_slice(array_merge($items, $vocabItems), 0, $limit);
    }

    private function resolveVocab(int $wordId, string $questionId): ?array
    {
        $word = VocabularyWord::query()->find($wordId);
        if (!$word) {
            return null;
        }

        $built = $this->vocabBuilder->buildFromWord($word);
        if (!$built) {
            return null;
        }

        $built['question_id'] = $questionId;

        return $built;
    }

    private function resolveReading(int $readingQuestionId, string $questionId): ?array
    {
        $rq = ReadingQuestion::query()->with('passage')->find($readingQuestionId);
        if (!$rq) {
            return null;
        }

        $options = $rq->options ?? null;
        if (empty($options)) {
            $correct = trim((string) $rq->correct_answer);
            $wrong = $correct === '' ? 'N/A' : ($correct . '（误）');
            $options = ['A' => $correct, 'B' => $wrong];
        }

        return [
            'id' => $rq->id,
            'question_id' => $questionId,
            'type' => 'reading',
            'realm' => $rq->passage?->realm,
            'stage' => $rq->passage?->stage,
            'question' => $rq->question,
            'options' => $options,
            'correct_answer' => (string) $rq->correct_answer,
            'answer_accept' => $rq->answer_accept,
            'explanation' => $rq->explanation,
            'word' => null,
        ];
    }

    private function resolveListening(int $listeningQuestionId, string $questionId): ?array
    {
        $lq = ListeningQuestion::query()->with('passage')->find($listeningQuestionId);
        if (!$lq || !$lq->passage) {
            return null;
        }

        $passage = $lq->passage;

        return [
            'id' => $lq->id,
            'question_id' => $questionId,
            'type' => 'listening',
            'realm' => $passage->realm,
            'stage' => $passage->stage,
            'question' => $lq->question,
            'options' => $lq->options,
            'correct_answer' => (string) $lq->correct_answer,
            'explanation' => $lq->explanation,
            'word' => $lq->word ?: $passage->word,
            'listening_text' => $passage->listening_text,
            'passage_id' => 'LP-' . (string) $passage->id,
        ];
    }

    private function normalizeLevelupQuestion(Question $question): array
    {
        return [
            'id' => $question->id,
            'question_id' => $question->question_id,
            'type' => $question->type,
            'realm' => $question->realm,
            'stage' => $question->stage,
            'question' => $question->question,
            'options' => $question->options,
            'correct_answer' => $question->correct_answer,
            'explanation' => $question->explanation,
            'word' => $question->word,
            'listening_text' => $question->listening_text,
        ];
    }

    private function isReadingAnswerCorrect(array $resolved, string $answer, ?string $answerText): bool
    {
        $user = $this->normalize($answerText !== null && $answerText !== '' ? $answerText : $answer);
        $correct = $this->normalize((string) ($resolved['correct_answer'] ?? ''));

        if ($user === $correct) {
            return true;
        }

        $options = $resolved['options'] ?? [];
        if (is_array($options) && isset($options[$answer])) {
            $user = $this->normalize((string) $options[$answer]);
            if ($user === $correct) {
                return true;
            }
        }

        $accepted = $resolved['answer_accept'] ?? [];
        if (is_array($accepted)) {
            foreach ($accepted as $item) {
                if ($this->normalize((string) $item) === $user) {
                    return true;
                }
            }
        }

        return false;
    }

    private function normalize(?string $value): string
    {
        return mb_strtolower(trim((string) $value));
    }
}
