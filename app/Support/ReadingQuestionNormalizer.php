<?php

namespace App\Support;

/**
 * 将导入的阅读小题规范为藏经阁可用的题干 + 选项结构。
 */
class ReadingQuestionNormalizer
{
    /**
     * @param  array<string, mixed>  $raw
     * @return array{question_type: string, question: string, options: array<string, string>, correct_answer: string, explanation: ?string}
     */
    public function normalize(array $raw): array
    {
        $type = strtolower(trim((string) ($raw['question_type'] ?? 'single')));
        $correctRaw = strtoupper(trim((string) ($raw['correct_answer'] ?? '')));

        if ($type === 'tf' || in_array($correctRaw, ['T', 'F', 'TRUE', 'FALSE'], true)) {
            return $this->normalizeTrueFalse($raw);
        }

        $existingOptions = $raw['options'] ?? null;
        if (is_array($existingOptions) && count($existingOptions) >= 2) {
            return $this->normalizeStructuredChoice($raw, $existingOptions);
        }

        return $this->normalizeSingleChoice($raw);
    }

    /**
     * @param  array<string, mixed>  $raw
     * @param  array<string, string>  $options
     * @return array{question_type: string, question: string, options: array<string, string>, correct_answer: string, explanation: ?string}
     */
    private function normalizeStructuredChoice(array $raw, array $options): array
    {
        $stem = $this->cleanStem((string) ($raw['question'] ?? ''));
        $type = strtolower(trim((string) ($raw['question_type'] ?? '')));
        if (!in_array($type, ['detail', 'word', 'infer', 'single', 'blank'], true)) {
            $type = $this->inferQuestionType($stem);
        }

        $correct = strtoupper(trim((string) ($raw['correct_answer'] ?? '')));
        if ($correct !== '' && !isset($options[$correct])) {
            foreach ($options as $key => $label) {
                if (strtoupper((string) $key) === $correct || strcasecmp((string) $label, $correct) === 0) {
                    $correct = (string) $key;
                    break;
                }
            }
        }

        return [
            'question_type' => $type,
            'question' => $stem,
            'options' => $options,
            'correct_answer' => $correct,
            'explanation' => $this->nullableString($raw['explanation'] ?? null),
        ];
    }

    /**
     * @param  array<string, mixed>  $raw
     * @return array{question_type: string, question: string, options: array<string, string>, correct_answer: string, explanation: ?string}
     */
    private function normalizeTrueFalse(array $raw): array
    {
        $stem = $this->cleanStem((string) ($raw['question'] ?? ''));
        $correctRaw = strtoupper(trim((string) ($raw['correct_answer'] ?? '')));
        $isTrue = in_array($correctRaw, ['T', 'TRUE', 'A'], true);

        return [
            'question_type' => 'tf',
            'question' => $stem,
            'options' => [
                'A' => 'True',
                'B' => 'False',
            ],
            'correct_answer' => $isTrue ? 'A' : 'B',
            'explanation' => $this->nullableString($raw['explanation'] ?? null),
        ];
    }

    /**
     * @param  array<string, mixed>  $raw
     * @return array{question_type: string, question: string, options: array<string, string>, correct_answer: string, explanation: ?string}
     */
    private function normalizeSingleChoice(array $raw): array
    {
        $text = str_replace(["\r\n", "\r"], "\n", (string) ($raw['question'] ?? ''));
        $lines = array_values(array_filter(array_map('trim', explode("\n", $text)), fn ($line) => $line !== ''));

        $stemParts = [];
        $options = [];

        foreach ($lines as $line) {
            if (preg_match('/^([A-D])[．\.、:：]\s*(.+)$/u', $line, $matches)) {
                $options[$matches[1]] = trim($matches[2]);
                continue;
            }
            $stemParts[] = $line;
        }

        $stem = $this->cleanStem(implode(' ', $stemParts));
        if ($stem === '' && $text !== '') {
            $stem = $this->cleanStem($text);
        }

        $correct = strtoupper(trim((string) ($raw['correct_answer'] ?? '')));
        if ($correct !== '' && !isset($options[$correct]) && count($options) > 0) {
            foreach ($options as $key => $label) {
                if (strtoupper($key) === $correct || strcasecmp($label, $correct) === 0) {
                    $correct = $key;
                    break;
                }
            }
        }

        return [
            'question_type' => $this->inferQuestionType($stem),
            'question' => $stem,
            'options' => $options,
            'correct_answer' => $correct,
            'explanation' => $this->nullableString($raw['explanation'] ?? null),
        ];
    }

    private function cleanStem(string $stem): string
    {
        $stem = trim($stem);
        $stem = preg_replace('/\(\s*[　\s]*\)\s*$/u', '', $stem) ?? $stem;
        $stem = preg_replace('/\s+/', ' ', $stem) ?? $stem;

        return trim($stem);
    }

    private function inferQuestionType(string $stem): string
    {
        $lower = strtolower($stem);
        if (preg_match('/\bwhy\b|\binfer\b|main idea|best title|author|purpose\b/i', $stem)) {
            return 'infer';
        }
        if (preg_match('/\bmean\b|closest in meaning|underline|word\b|phrase\b/i', $stem)) {
            return 'word';
        }

        return 'detail';
    }

    private function nullableString(mixed $value): ?string
    {
        $text = trim((string) $value);

        return $text === '' ? null : $text;
    }
}
