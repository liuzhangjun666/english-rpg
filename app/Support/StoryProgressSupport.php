<?php

namespace App\Support;

use App\Models\User;

class StoryProgressSupport
{
    public static function defaultStoryProgress(): array
    {
        return [
            'current_mainline' => 'chapter_1',
            'current_chapter_id' => 'R1-01',
            'recommended_module' => 'reading',
            'selected_branches' => [],
            'collected_nodes' => [],
            'collected_items' => [],
            'unlocked_endings' => [],
            'chapter_completion' => [],
            'daily_destiny' => [
                'date' => null,
                'event_id' => null,
                'event_title' => null,
                'reward_hint' => null,
            ],
            'weekly_branch_window' => [
                'week_key' => null,
                'branch_ids' => [],
            ],
        ];
    }

    public static function defaultProgressCurrency(): array
    {
        return [
            'lingqi' => 0,
            'daoxin' => 100,
            'story_keys' => 0,
        ];
    }

    public static function normalizeStoryProgress(array|null $raw): array
    {
        $defaults = self::defaultStoryProgress();
        $source = is_array($raw) ? $raw : [];

        $merged = array_merge($defaults, $source);
        $merged['selected_branches'] = self::normalizeAssoc($source['selected_branches'] ?? []);
        $merged['chapter_completion'] = self::normalizeAssoc($source['chapter_completion'] ?? []);
        $merged['collected_nodes'] = self::normalizeList($source['collected_nodes'] ?? []);
        $merged['collected_items'] = self::normalizeList($source['collected_items'] ?? []);
        $merged['unlocked_endings'] = self::normalizeList($source['unlocked_endings'] ?? []);

        $merged['daily_destiny'] = array_merge(
            $defaults['daily_destiny'],
            is_array($source['daily_destiny'] ?? null) ? $source['daily_destiny'] : []
        );
        $merged['weekly_branch_window'] = array_merge(
            $defaults['weekly_branch_window'],
            is_array($source['weekly_branch_window'] ?? null) ? $source['weekly_branch_window'] : []
        );
        $merged['weekly_branch_window']['branch_ids'] = self::normalizeList($merged['weekly_branch_window']['branch_ids'] ?? []);

        return $merged;
    }

    public static function normalizeProgressCurrency(array|null $raw): array
    {
        $defaults = self::defaultProgressCurrency();
        $source = is_array($raw) ? $raw : [];

        return [
            'lingqi' => max(0, (int) ($source['lingqi'] ?? $defaults['lingqi'])),
            'daoxin' => max(0, (int) ($source['daoxin'] ?? $defaults['daoxin'])),
            'story_keys' => max(0, (int) ($source['story_keys'] ?? $defaults['story_keys'])),
        ];
    }

    public static function applyReadingBranchResult(
        User $user,
        array $chapter,
        string|null $selectedBranchId,
        bool $passed,
        int $accuracy,
        array $chapterRewards = [],
        array $unlockState = []
    ): array {
        $story = self::normalizeStoryProgress($user->story_progress);
        $currency = self::normalizeProgressCurrency($user->progress_currency);

        $chapterId = (string) ($chapter['id'] ?? '');
        if ($chapterId !== '') {
            $story['chapter_completion'][$chapterId] = [
                'passed' => $passed,
                'accuracy' => $accuracy,
                'updated_at' => now()->toIso8601String(),
            ];
        }

        $gainedLingqi = (int) ($chapterRewards['lingqi'] ?? 0);
        $gainedKeys = (int) ($chapterRewards['story_keys'] ?? 0);
        $gainedDaoxin = (int) ($chapterRewards['daoxin'] ?? 0);

        if ($passed) {
            $currency['lingqi'] += max(0, $gainedLingqi);
            $currency['story_keys'] += max(0, $gainedKeys);
            $currency['daoxin'] = min(999, $currency['daoxin'] + max(0, $gainedDaoxin));
        } else {
            $currency['daoxin'] = max(0, $currency['daoxin'] - 2);
        }

        if ($selectedBranchId) {
            $story['selected_branches'][$chapterId] = $selectedBranchId;
            $story['collected_nodes'] = self::normalizeList(array_merge(
                $story['collected_nodes'],
                [$selectedBranchId]
            ));
        }

        if (!empty($unlockState['next_chapter_id'])) {
            $story['current_chapter_id'] = (string) $unlockState['next_chapter_id'];
        }

        if (!empty($unlockState['ending_id'])) {
            $story['unlocked_endings'] = self::normalizeList(array_merge(
                $story['unlocked_endings'],
                [(string) $unlockState['ending_id']]
            ));
        }

        if (!empty($chapterRewards['collectible_id']) && $passed) {
            $story['collected_items'] = self::normalizeList(array_merge(
                $story['collected_items'],
                [(string) $chapterRewards['collectible_id']]
            ));
        }

        $story['recommended_module'] = $unlockState['recommended_module'] ?? 'reading';

        $user->story_progress = $story;
        $user->progress_currency = $currency;
        $user->save();

        return [
            'story_progress' => $story,
            'progress_currency' => $currency,
        ];
    }

    public static function grantMijingCollectible(User $user, array $result): array
    {
        $story = self::normalizeStoryProgress($user->story_progress);
        $currency = self::normalizeProgressCurrency($user->progress_currency);

        $score = (int) ($result['final_score'] ?? 0);
        $accuracy = (int) ($result['accuracy'] ?? 0);

        $collectibleId = null;
        if ($score >= 120 || $accuracy >= 85) {
            $collectibleId = 'mijing_scroll';
            $alreadyCollected = in_array($collectibleId, $story['collected_items'], true);
            if (!$alreadyCollected) {
                $story['collected_items'] = self::normalizeList(array_merge($story['collected_items'], [$collectibleId]));
                $currency['story_keys'] += 1;
                $currency['lingqi'] += 8;
            }
        }

        $user->story_progress = $story;
        $user->progress_currency = $currency;
        $user->save();

        return [
            'collectible_id' => $collectibleId,
            'story_progress' => $story,
            'progress_currency' => $currency,
        ];
    }

    private static function normalizeList(array $items): array
    {
        $values = array_values(array_filter(array_map(fn ($v) => (string) $v, $items), fn ($v) => $v !== ''));
        return array_values(array_unique($values));
    }

    private static function normalizeAssoc(array $assoc): array
    {
        $normalized = [];
        foreach ($assoc as $key => $value) {
            $k = (string) $key;
            if ($k === '') {
                continue;
            }
            $normalized[$k] = $value;
        }
        return $normalized;
    }
}
