<?php

namespace App\Services;

use App\Models\VocabularyWord;
use App\Support\VocabularyMeaningNormalizer;
use Illuminate\Support\Collection;

class VocabQuestionBuilder
{
    public function buildFromWord(VocabularyWord $word): ?array
    {
        $items = $this->buildFromPool(collect([$word]));

        return $items[0] ?? null;
    }

    public function buildFromPool(Collection $words): array
    {
        if ($words->isEmpty()) {
            return [];
        }

        $distractors = $this->collectDistractors();

        $questions = [];
        foreach ($words as $word) {
            $built = $this->buildQuestionArray($word, $distractors);
            if ($built) {
                $questions[] = $built;
            }
        }

        return $questions;
    }

    public function isMeaningCorrect(string $questionId, string $answerText): bool
    {
        if (!preg_match('/^VW-(\d+)$/', $questionId, $m)) {
            return false;
        }

        $word = VocabularyWord::query()->find((int) $m[1]);
        if (!$word) {
            return false;
        }

        $normalized = mb_strtolower(trim($answerText));
        $meanings = VocabularyMeaningNormalizer::normalize($word->meanings);
        foreach ($meanings as $meaning) {
            if (mb_strtolower(trim((string) $meaning)) === $normalized) {
                return true;
            }
        }

        $built = $this->buildFromWord($word);
        if (!$built) {
            return false;
        }

        $options = $built['options'] ?? [];
        $key = strtoupper(trim($answerText));
        if (isset($options[$key])) {
            $selected = (string) $options[$key];
            $correctKey = (string) ($built['correct_answer'] ?? '');

            return isset($options[$correctKey]) && $options[$correctKey] === $selected;
        }

        return false;
    }

    private function buildQuestionArray(VocabularyWord $word, array $distractors): ?array
    {
        $meanings = VocabularyMeaningNormalizer::normalize($word->meanings);
        if (empty($meanings)) {
            return null;
        }

        $correctText = $meanings[0];
        $opts = [$correctText];
        shuffle($distractors);
        foreach ($distractors as $distractor) {
            if (count($opts) >= 4) {
                break;
            }
            if ($distractor === '' || in_array($distractor, $opts, true)) {
                continue;
            }
            $opts[] = $distractor;
        }
        while (count($opts) < 4) {
            $opts[] = $correctText;
        }

        shuffle($opts);
        $labels = ['A', 'B', 'C', 'D'];
        $options = [];
        $correctKey = 'A';
        foreach ($labels as $i => $key) {
            $options[$key] = (string) ($opts[$i] ?? '');
            if ($options[$key] === $correctText) {
                $correctKey = $key;
            }
        }

        return [
            'question_id' => 'VW-' . (string) $word->id,
            'type' => 'vocab',
            'realm' => null,
            'stage' => null,
            'word' => (string) $word->lemma,
            'question' => '"' . (string) $word->lemma . '" 的中文意思是？',
            'options' => $options,
            'correct_answer' => $correctKey,
            'explanation' => implode('；', $meanings),
        ];
    }

    private function collectDistractors(): array
    {
        $pool = VocabularyWord::query()
            ->whereNotNull('meanings')
            ->inRandomOrder()
            ->limit(500)
            ->get();

        $distractors = [];
        foreach ($pool as $word) {
            foreach (VocabularyMeaningNormalizer::normalize($word->meanings) as $meaning) {
                $meaning = trim((string) $meaning);
                if ($meaning !== '') {
                    $distractors[] = $meaning;
                }
            }
        }

        return $distractors;
    }
}
