<?php
namespace App\Services;

class TowerRewardConfig
{
    public const STONE_BASE_PER_FLOOR = 10;
    public const STONE_REPEAT_MULTIPLIER = 0.3;
    public const PERFECT_BONUS_MULTIPLIER = 0.5;
    public const FRAGMENTS_PER_TECHNIQUE = 5;
    public const BREAKTHROUGH_FLOORS = [10,20,30,40,50,60,70,80,90,100];
    public const THEMES = ['fire','ice','thunder','poison','beast','shadow','mist','wind','storm','chaos'];
    public const TIERS = [
        20 => 'cet4_hf',
        40 => 'cet4',
        60 => 'cet6',
        80 => 'kaoyan',
        100 => 'ielts',
    ];

    public static function computeStones(int $floor, bool $isFirstClear, bool $perfect): int
    {
        $base = (int) ($isFirstClear
            ? $floor * self::STONE_BASE_PER_FLOOR
            : $floor * self::STONE_BASE_PER_FLOOR * self::STONE_REPEAT_MULTIPLIER);
        $bonus = $perfect ? (int) ($floor * self::STONE_BASE_PER_FLOOR * self::PERFECT_BONUS_MULTIPLIER) : 0;
        return $base + $bonus;
    }

    public static function isBreakthrough(int $floor): bool
    {
        return in_array($floor, self::BREAKTHROUGH_FLOORS, true);
    }

    public static function themeForFloor(int $floor): string
    {
        $idx = (int) ceil($floor / 10) - 1;
        return self::THEMES[max(0, min(9, $idx))];
    }

    public static function vocabTier(int $floor): string
    {
        foreach (self::TIERS as $cap => $tier) {
            if ($floor <= $cap) return $tier;
        }
        return 'ielts';
    }
}
