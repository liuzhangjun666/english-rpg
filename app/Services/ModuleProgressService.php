<?php

namespace App\Services;

use App\Models\User;

class ModuleProgressService
{
    private const AURA_PER_CORRECT = 12;
    private const AURA_LEVEL_STEP = 100;
    private const DAILY_PRACTICE_BONUS_STONES = 5;
    private const DAILY_PRACTICE_BONUS_SCROLLS = 1;
    private const PERFECT_GRAMMAR_SCROLLS = 1;
    private const SKILL_POINTS_PER_PRACTICE_RANK_UP = 1;
    private const SKILL_POINTS_PER_GRAMMAR_STREAK = 1;
    private const GRAMMAR_STREAK_THRESHOLD = 5;

    public function applyVocabProgress(User $user, array $results, bool $passed): array
    {
        $correctCount = count(array_filter($results, fn ($r) => !empty($r['correct'])));
        $auraGain = $correctCount * self::AURA_PER_CORRECT;
        $totalAura = (int) $user->practice_aura + $auraGain;
        $rankUp = intdiv($totalAura, self::AURA_LEVEL_STEP);

        if ($rankUp > 0) {
            $user->practice_rank = min(99, (int) $user->practice_rank + $rankUp);
            $user->skill_point = (int) $user->skill_point + ($rankUp * self::SKILL_POINTS_PER_PRACTICE_RANK_UP);
        }

        $user->practice_aura = $totalAura % self::AURA_LEVEL_STEP;

        $today = now()->toDateString();
        $lastBonusDate = $user->daily_practice_bonus_date ? $user->daily_practice_bonus_date->toDateString() : null;
        $dailyBonusStones = 0;
        $dailyBonusScrolls = 0;
        if ($passed && $lastBonusDate !== $today) {
            $dailyBonusStones = self::DAILY_PRACTICE_BONUS_STONES;
            $dailyBonusScrolls = self::DAILY_PRACTICE_BONUS_SCROLLS;
            $user->spirit_stone = (int) $user->spirit_stone + $dailyBonusStones;
            $user->secret_scroll = (int) $user->secret_scroll + $dailyBonusScrolls;
            $user->daily_practice_bonus_date = $today;
        }

        $user->save();

        return [
            'aura_gain' => $auraGain,
            'aura_current' => (int) $user->practice_aura,
            'practice_rank' => (int) $user->practice_rank,
            'practice_rank_up' => $rankUp,
            'daily_bonus_stones' => $dailyBonusStones,
            'daily_bonus_scrolls' => $dailyBonusScrolls,
            'skill_points_gained' => $rankUp * self::SKILL_POINTS_PER_PRACTICE_RANK_UP,
            'skill_points_total' => (int) $user->skill_point,
            'secret_scroll_total' => (int) $user->secret_scroll,
            'spirit_stone_total' => (int) $user->spirit_stone,
        ];
    }

    public function applyGrammarProgress(User $user, array $results, int $accuracy, bool $passed): array
    {
        $maxStreak = $this->maxCorrectStreak($results);
        $skillPoints = $maxStreak >= self::GRAMMAR_STREAK_THRESHOLD ? self::SKILL_POINTS_PER_GRAMMAR_STREAK : 0;
        $scrollsGained = $accuracy === 100 ? self::PERFECT_GRAMMAR_SCROLLS : 0;
        $floorUnlocked = 0;

        if ($passed) {
            $floorUnlocked = 1;
            $user->grammar_floor = min(99, (int) $user->grammar_floor + 1);
        }
        if ($scrollsGained > 0) {
            $user->secret_scroll = (int) $user->secret_scroll + $scrollsGained;
        }
        if ($skillPoints > 0) {
            $user->skill_point = (int) $user->skill_point + $skillPoints;
        }

        $user->save();

        return [
            'grammar_floor' => (int) $user->grammar_floor,
            'grammar_floor_unlocked' => $floorUnlocked,
            'max_streak' => $maxStreak,
            'scrolls_gained' => $scrollsGained,
            'skill_points_gained' => $skillPoints,
            'skill_points_total' => (int) $user->skill_point,
            'secret_scroll_total' => (int) $user->secret_scroll,
            'spirit_stone_total' => (int) $user->spirit_stone,
        ];
    }

    private function maxCorrectStreak(array $results): int
    {
        $max = 0;
        $streak = 0;
        foreach ($results as $row) {
            if (!empty($row['correct'])) {
                $streak++;
                $max = max($max, $streak);
            } else {
                $streak = 0;
            }
        }
        return $max;
    }
}
