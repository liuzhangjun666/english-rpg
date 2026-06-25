<?php

namespace App\Support;

/**
 * 灵根测试题目 assessment_level 解析（L1–L7）。
 *
 * L1 小学低段 · L2 小学高段 · L3 初中 · L4 高中 · L5 四级 · L6 六级/考研 · L7 研究生
 */
class AssessmentLevelResolver
{
    public static function resolveFromParts(
        ?string $gradeLevel,
        ?string $explanation,
        ?string $question,
        ?string $realm,
        ?string $stage,
        ?string $questionId = null,
    ): int {
        $fromGrade = self::resolveFromGradeText(trim((string) $gradeLevel));
        if ($fromGrade !== null) {
            return $fromGrade;
        }

        $fromExplanation = self::resolveFromGradeText(trim((string) $explanation));
        if ($fromExplanation !== null) {
            return $fromExplanation;
        }

        if (self::isElementaryGrammarImportId((string) $questionId)) {
            return self::resolveElementaryGrammarRealmLevel((string) $realm, (string) $stage);
        }

        return self::resolveFromGameRealmStage((string) $realm, (string) $stage);
    }

    /** 词汇分类题不应进入灵根测试语法轨、语法机关桥等语法练功池 */
    public static function isVocabularyClassificationStem(?string $question): bool
    {
        $stem = trim((string) $question);
        if ($stem === '') {
            return false;
        }

        if (preg_match('/选出不同类|不同类的一项|哪一项不同|different from others/ui', $stem)) {
            return true;
        }

        return preg_match('/读一读[，,]?\s*选/u', $stem) && preg_match('/不同类/u', $stem);
    }

    /** 语法练功池 SQL 预筛：排除词汇分类题干 */
    public static function applyGrammarPracticeScope($query): void
    {
        $query->where(function ($builder) {
            $builder
                ->where('question', 'not like', '%选出不同类%')
                ->where('question', 'not like', '%不同类的一项%')
                ->where('question', 'not like', '%哪一项不同%');
        });
    }

    public static function shouldIncludeInAssessment(
        ?string $type,
        ?string $question,
    ): bool {
        $normalizedType = strtolower(trim((string) $type));
        if ($normalizedType === 'grammar' && self::isVocabularyClassificationStem($question)) {
            return false;
        }

        return true;
    }

    private static function isElementaryGrammarImportId(string $questionId): bool
    {
        return (bool) preg_match('/^EGV-L[123]-/i', $questionId);
    }

    /**
     * 小学语法 JSON 中 L1/L2/L3 均为小学分批，不可按游戏境界 L2=初中 映射。
     */
    private static function resolveElementaryGrammarRealmLevel(string $realm, string $stage): int
    {
        $realm = strtoupper(trim($realm));
        $stageNum = max(1, (int) ltrim(trim($stage), '0'));

        return match ($realm) {
            'L1' => $stageNum <= 4 ? 1 : 2,
            'L2', 'L3' => 2,
            default => self::resolveFromGameRealmStage($realm, $stage),
        };
    }

    public static function resolveFromGameRealmStage(string $realm, string $stage): int
    {
        $realm = strtoupper(trim($realm));
        $stageNum = max(1, (int) ltrim(trim($stage), '0'));

        return match ($realm) {
            'L1' => $stageNum <= 3 ? 1 : 2,
            'L2' => match (true) {
                $stageNum <= 3 => 3,
                $stageNum <= 6 => 4,
                default => 5,
            },
            'L3' => $stageNum <= 3 ? 6 : 7,
            'Z1' => 3,
            'J1' => 4,
            'Y1' => 5,
            'H1' => 7,
            default => 1,
        };
    }

    private static function resolveFromGradeText(string $text): ?int
    {
        if ($text === '') {
            return null;
        }

        if (preg_match('/三年级|四年级|小学低/u', $text)) {
            return 1;
        }
        if (preg_match('/五年级|六年级|小学高/u', $text)) {
            return 2;
        }
        if (preg_match('/七年级|八年级|九年级|初一|初二|初三|初中/u', $text)) {
            return 3;
        }
        if (preg_match('/高一|高二|高三|高中/u', $text)) {
            return 4;
        }
        if (preg_match('/四级|CET[\s-]?4|CET4/u', $text)) {
            return 5;
        }
        if (preg_match('/六级|CET[\s-]?6|CET6|考研/u', $text)) {
            return 6;
        }
        if (preg_match('/研究生|学术英语|托福|雅思|GRE/u', $text)) {
            return 7;
        }

        return null;
    }
}
