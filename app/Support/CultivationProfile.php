<?php

namespace App\Support;

class CultivationProfile
{
    private const REALM_NAME_MAP = [
        'L' => '练气期',
        'Z' => '筑基期',
        'J' => '金丹期',
        'Y' => '元婴期',
        'H' => '化神期',
        'X' => '炼虚期',
        'T' => '合体期',
        'D' => '大乘期',
        'U' => '渡劫期',
    ];

    private const LEARNING_STAGE_RULES = [
        'lower_primary' => ['label' => '小学低年级', 'focus' => '字母、基础单词、简单听说'],
        'upper_primary' => ['label' => '小学高年级', 'focus' => '常用词、简单句、基础阅读'],
        'junior' => ['label' => '初中', 'focus' => '基础语法、阅读理解、句型表达'],
        'senior' => ['label' => '高中', 'focus' => '复杂语法、长阅读、写作框架'],
        'college_non_english' => ['label' => '大学非英语专业', 'focus' => '四六级词汇、听力、议论文写作'],
        'college_english' => ['label' => '大学英语专业 / 考研', 'focus' => '学术阅读、翻译、长难句'],
        'graduate' => ['label' => '研究生', 'focus' => '论文阅读、学术写作、汇报口语'],
        'advanced' => ['label' => '高阶挑战', 'focus' => '雅思、托福、GRE、学术发表'],
    ];

    private const SCHOOL_GRADE_LABELS = [
        'grade_1' => '1年级',
        'grade_2' => '2年级',
        'grade_3' => '3年级',
        'grade_4' => '4年级',
        'grade_5' => '5年级',
        'grade_6' => '6年级',
        'grade_7' => '7年级',
        'grade_8' => '8年级',
        'grade_9' => '9年级',
        'grade_10' => '10年级',
        'grade_11' => '11年级',
        'grade_12' => '12年级',
        'college' => '本科阶段',
        'exam' => '考研 / 英专',
        'graduate' => '硕士 / 博士',
        'advanced' => '留学 / 考试 / 发表',
    ];

    public static function realmName(string $realm): string
    {
        $prefix = self::realmPrefix($realm);
        $layer = self::realmLayer($realm);
        $name = self::REALM_NAME_MAP[$prefix] ?? $realm;
        return $name . ' · ' . self::chineseLayer($layer);
    }

    public static function realmOrderIndex(string $realm): int
    {
        $prefix = self::realmPrefix($realm);
        $layer = self::realmLayer($realm);
        $prefixOrder = array_flip(array_keys(self::REALM_NAME_MAP));
        $group = $prefixOrder[$prefix] ?? 99;
        return ($group * 10) + $layer;
    }

    public static function learningStage(string $realm, int $stage = 1, ?string $schoolGrade = null): array
    {
        $gradeRule = self::learningStageBySchoolGrade($schoolGrade);
        if ($gradeRule) {
            return $gradeRule;
        }

        $prefix = self::realmPrefix($realm);
        $layer = self::realmLayer($realm);

        if ($prefix === 'L' && $layer <= 3) {
            return self::LEARNING_STAGE_RULES['lower_primary'];
        }
        if ($prefix === 'L') {
            return self::LEARNING_STAGE_RULES['upper_primary'];
        }
        if ($prefix === 'Z') {
            return self::LEARNING_STAGE_RULES['junior'];
        }
        if ($prefix === 'J') {
            return self::LEARNING_STAGE_RULES['senior'];
        }
        if ($prefix === 'Y') {
            return self::LEARNING_STAGE_RULES['college_non_english'];
        }
        if ($prefix === 'H') {
            return self::LEARNING_STAGE_RULES['college_english'];
        }
        if (in_array($prefix, ['X', 'T', 'D'], true)) {
            return self::LEARNING_STAGE_RULES['graduate'];
        }
        if ($prefix === 'U') {
            return self::LEARNING_STAGE_RULES['advanced'];
        }

        // 兼容旧档：以 realm_stage 辅助兜底
        return $stage >= 6 ? self::LEARNING_STAGE_RULES['graduate'] : self::LEARNING_STAGE_RULES['upper_primary'];
    }

    public static function learningStageBySchoolGrade(?string $schoolGrade): ?array
    {
        return match (trim((string) $schoolGrade)) {
            'grade_1', 'grade_2', 'grade_3' => self::LEARNING_STAGE_RULES['lower_primary'],
            'grade_4', 'grade_5', 'grade_6' => self::LEARNING_STAGE_RULES['upper_primary'],
            'grade_7', 'grade_8', 'grade_9' => self::LEARNING_STAGE_RULES['junior'],
            'grade_10', 'grade_11', 'grade_12' => self::LEARNING_STAGE_RULES['senior'],
            'college' => self::LEARNING_STAGE_RULES['college_non_english'],
            'exam' => self::LEARNING_STAGE_RULES['college_english'],
            'graduate' => self::LEARNING_STAGE_RULES['graduate'],
            'advanced' => self::LEARNING_STAGE_RULES['advanced'],
            default => null,
        };
    }

    public static function schoolGradeLabel(?string $schoolGrade): string
    {
        $value = trim((string) $schoolGrade);
        return self::SCHOOL_GRADE_LABELS[$value] ?? '';
    }

    public static function cefrHint(string $realm): string
    {
        return match (self::realmPrefix($realm)) {
            'L' => 'CEFR A1',
            'Z' => 'CEFR A2',
            'J' => 'CEFR B1',
            'Y' => 'CEFR B2',
            'H' => 'CEFR C1',
            'X', 'T', 'D', 'U' => 'CEFR C2+',
            default => 'CEFR Unknown',
        };
    }

    public static function realmPrefix(string $realm): string
    {
        $realm = strtoupper(trim($realm));
        return $realm === '' ? '' : substr($realm, 0, 1);
    }

    public static function realmLayer(string $realm): int
    {
        if (preg_match('/(\d+)$/', strtoupper(trim($realm)), $m)) {
            return max(1, min(9, (int) $m[1]));
        }
        return 1;
    }

    private static function chineseLayer(int $layer): string
    {
        $nums = [1 => '一层', 2 => '二层', 3 => '三层', 4 => '四层', 5 => '五层', 6 => '六层', 7 => '七层', 8 => '八层', 9 => '九层'];
        return $nums[$layer] ?? ($layer . '层');
    }
}
