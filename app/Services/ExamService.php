<?php

namespace App\Services;

use App\Models\Question;
use App\Models\User;

/**
 * 渡劫检测引擎
 */
class ExamService
{
    // 评级阈值
    const GRADE_S = 95;
    const GRADE_A = 85;
    const GRADE_B = 70;
    const GRADE_C = 60;

    // 评级修为倍率
    const MULTIPLIER = [
        'S' => 3.0,
        'A' => 2.0,
        'B' => 1.5,
        'C' => 1.0,
        'D' => 0.5,
    ];

    // 渡劫灵力消耗
    const SPIRIT_COST = 30;

    /** 抽题：从已学关卡中混合抽取30题 */
    public function pickQuestions(string $realm): array
    {
        // L1渡劫：从L1-01~L1-09所有题中随机抽
        $questions = Question::where('realm', $realm)
            ->inRandomOrder()
            ->limit(30)
            ->get(['id', 'question_id', 'type', 'question', 'options', 'word']);

        if ($questions->count() < 10) {
            // 题不够时补充
            $fallback = Question::where('realm', $realm)->limit(30)->get(['id', 'question_id', 'type', 'question', 'options', 'word']);
            return $fallback->toArray();
        }

        return $questions->toArray();
    }

    /** 判分评级 */
    public function grade(array $results): array
    {
        $total = count($results);
        $correct = count(array_filter($results, fn($r) => $r['correct']));
        $score = $total > 0 ? round(($correct / $total) * 100, 2) : 0;

        $grade = 'D';
        if ($score >= self::GRADE_S) $grade = 'S';
        elseif ($score >= self::GRADE_A) $grade = 'A';
        elseif ($score >= self::GRADE_B) $grade = 'B';
        elseif ($score >= self::GRADE_C) $grade = 'C';

        $passed = $score >= self::GRADE_C;

        return [
            'total' => $total,
            'correct' => $correct,
            'score' => $score,
            'grade' => $grade,
            'passed' => $passed,
        ];
    }

    /** 计算渡劫奖励 */
    public function calculateReward(array $gradeResult): array
    {
        $multiplier = self::MULTIPLIER[$gradeResult['grade']] ?? 0.5;
        $baseExp = 100;
        $expGained = (int) round($baseExp * $multiplier);
        $stonesGained = $gradeResult['passed'] ? (int) round(5 * $multiplier) : 0;

        return [
            'exp_gained' => $expGained,
            'stones_gained' => $stonesGained,
            'multiplier' => $multiplier,
        ];
    }

    /** 检测是否可参加渡劫 */
    public function canTakeExam(User $user, string $realm): array
    {
        if ($user->spirit_power < self::SPIRIT_COST) {
            return ['allowed' => false, 'reason' => "灵力不足（需要" . self::SPIRIT_COST . "）"];
        }
        return ['allowed' => true, 'reason' => ''];
    }
}
