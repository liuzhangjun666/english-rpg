<?php

namespace App\Support;

/**
 * 合并导入时被错误拆开的释义片段，如 ["上(船", "飞机", "公共汽车等)"]。
 */
class VocabularyMeaningNormalizer
{
    public static function normalize(mixed $meanings): array
    {
        if (!is_array($meanings)) {
            $text = trim((string) $meanings);

            return $text === '' ? [] : [self::finalize($text)];
        }

        $items = array_values(array_filter(array_map(
            fn ($value) => self::cleanSegment(trim((string) $value)),
            $meanings
        )));

        if ($items === []) {
            return [];
        }

        $merged = [];
        $buffer = '';

        foreach ($items as $item) {
            if ($buffer === '') {
                $buffer = $item;
            } elseif (self::shouldJoinWithSeparator($buffer, $item)) {
                $buffer .= '、' . $item;
            } else {
                $merged[] = self::finalize($buffer);
                $buffer = $item;
            }

            if (self::isCompleteFragment($buffer)) {
                $merged[] = self::finalize($buffer);
                $buffer = '';
            }
        }

        if ($buffer !== '') {
            $merged[] = self::finalize($buffer);
        }

        return array_values(array_unique(array_filter($merged)));
    }

    private static function cleanSegment(string $segment): string
    {
        if (str_starts_with($segment, '/') && mb_strlen($segment) > 1) {
            return mb_substr($segment, 1);
        }

        return $segment;
    }

    private static function parenDelta(string $text): int
    {
        $open = mb_substr_count($text, '(') + mb_substr_count($text, '（');
        $close = mb_substr_count($text, ')') + mb_substr_count($text, '）');

        return $open - $close;
    }

    private static function shouldJoinWithSeparator(string $buffer, string $next): bool
    {
        if (self::parenDelta($buffer) > 0) {
            return true;
        }

        return (bool) preg_match('/[(（][^)）]*$/u', $buffer);
    }

    private static function isCompleteFragment(string $text): bool
    {
        if (self::parenDelta($text) > 0) {
            return false;
        }

        return !preg_match('/[(（]$/u', $text)
            && !preg_match('/[(（][^)）]*$/u', $text);
    }

    private static function finalize(string $text): string
    {
        return self::cleanSegment(trim($text));
    }
}
