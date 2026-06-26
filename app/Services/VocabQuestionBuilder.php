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

        $normalized = $this->normalizeMeaningForCompare($answerText);
        $meanings = VocabularyMeaningNormalizer::normalize($word->meanings);
        foreach ($meanings as $meaning) {
            if ($this->normalizeMeaningForCompare((string) $meaning) === $normalized) {
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
        $seed = crc32('vocab-q:' . $word->id);

        $uniqueDistractors = array_values(array_unique(array_filter(
            $distractors,
            fn ($distractor) => $distractor !== '' && $distractor !== $correctText
        )));
        sort($uniqueDistractors, SORT_STRING);
        $picked = $this->deterministicPick($uniqueDistractors, $seed, 3);

        $opts = array_merge([$correctText], $picked);
        while (count($opts) < 4) {
            $opts[] = $correctText;
        }
        $opts = array_slice($opts, 0, 4);
        $this->deterministicShuffle($opts, $seed ^ 0x5f3759df);
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
            ->orderBy('id')
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

    private function deterministicPick(array $items, int $seed, int $count): array
    {
        $items = array_values($items);
        if ($items === []) {
            return [];
        }

        $this->deterministicShuffle($items, $seed ^ 0x9e3779b9);

        return array_slice($items, 0, min($count, count($items)));
    }

    private function deterministicShuffle(array &$items, int $seed): void
    {
        $count = count($items);
        if ($count <= 1) {
            return;
        }

        for ($i = $count - 1; $i > 0; $i--) {
            $seed = (int) (($seed * 1103515245 + 12345) & 0x7fffffff);
            $j = $seed % ($i + 1);
            [$items[$i], $items[$j]] = [$items[$j], $items[$i]];
        }
    }

    private function normalizeMeaningForCompare(string $text): string
    {
        $text = mb_strtolower(trim($text));

        return str_replace(['（', '）', '(', ')', ' ', '　'], '', $text);
    }
}
