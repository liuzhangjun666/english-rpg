<?php

namespace App\Support;

class ListeningQuestionParser
{
    /**
     * @return array{question: string, options: array<string, string>}
     */
    public static function parseContent(string $content): array
    {
        $content = trim($content);
        $lines = preg_split('/\r?\n+/', $content) ?: [];
        $stemLines = [];
        $options = [];

        foreach ($lines as $line) {
            $line = trim((string) $line);
            if ($line === '') {
                continue;
            }

            if (preg_match('/^([A-D])[．.](.+)$/u', $line, $matches)) {
                $options[strtoupper($matches[1])] = trim($matches[2]);
                continue;
            }

            $stemLines[] = preg_replace('/^\d+[．.、]\s*/u', '', $line);
        }

        $question = trim(implode(' ', array_filter($stemLines)));

        if ($question === '' && $options !== []) {
            $question = '请选择最合适的答语。';
        }

        return [
            'question' => $question,
            'options' => $options,
        ];
    }
}
