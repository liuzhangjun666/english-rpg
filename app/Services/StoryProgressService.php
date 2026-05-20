<?php

namespace App\Services;

use App\Models\User;
use App\Support\StoryProgressSupport;

class StoryProgressService
{
    public function sync(User $user, array $payload): array
    {
        $story = StoryProgressSupport::normalizeStoryProgress($payload['story_progress'] ?? $user->story_progress);
        $currency = StoryProgressSupport::normalizeProgressCurrency($payload['progress_currency'] ?? $user->progress_currency);

        if (array_key_exists('current_chapter', $payload)) {
            $chapter = trim((string) ($payload['current_chapter'] ?? ''));
            if ($chapter !== '') {
                $story['current_chapter_id'] = $chapter;
            }
        }

        if (array_key_exists('dao_heart', $payload)) {
            $currency['daoxin'] = max(0, (int) $payload['dao_heart']);
        }

        if (array_key_exists('story_keys', $payload)) {
            $currency['story_keys'] = max(0, (int) $payload['story_keys']);
        }

        if (array_key_exists('unlocked_nodes', $payload) && is_array($payload['unlocked_nodes'])) {
            $story['collected_nodes'] = $this->mergeUniqueStrings(
                $story['collected_nodes'] ?? [],
                $payload['unlocked_nodes']
            );
        }

        $explicitNode = null;
        if (array_key_exists('current_node', $payload)) {
            $explicitNode = trim((string) ($payload['current_node'] ?? ''));
        }

        if ($explicitNode !== null && $explicitNode !== '') {
            $chapterId = (string) ($story['current_chapter_id'] ?? 'R1-01');
            $story['selected_branches'][$chapterId] = $explicitNode;
            $story['collected_nodes'] = $this->mergeUniqueStrings($story['collected_nodes'] ?? [], [$explicitNode]);
        }

        return $this->persistSnapshot($user, $story, $currency, $explicitNode);
    }

    public function applyChoice(User $user, array $payload): array
    {
        $story = StoryProgressSupport::normalizeStoryProgress($user->story_progress);
        $currency = StoryProgressSupport::normalizeProgressCurrency($user->progress_currency);

        $chapterId = trim((string) ($payload['chapter_id'] ?? $story['current_chapter_id'] ?? 'R1-01'));
        if ($chapterId !== '') {
            $story['current_chapter_id'] = $chapterId;
        }

        $nodeId = trim((string) ($payload['node_id'] ?? $payload['selected_branch_id'] ?? ''));
        if ($nodeId !== '') {
            $story['selected_branches'][$story['current_chapter_id']] = $nodeId;
            $story['collected_nodes'] = $this->mergeUniqueStrings($story['collected_nodes'] ?? [], [$nodeId]);
        }

        if (!empty($payload['next_chapter_id'])) {
            $story['current_chapter_id'] = trim((string) $payload['next_chapter_id']);
        }

        if (array_key_exists('dao_heart', $payload)) {
            $currency['daoxin'] = max(0, (int) $payload['dao_heart']);
        }

        if (array_key_exists('story_keys', $payload)) {
            $currency['story_keys'] = max(0, (int) $payload['story_keys']);
        }

        return $this->persistSnapshot($user, $story, $currency, $nodeId !== '' ? $nodeId : null);
    }

    public function snapshot(User $user): array
    {
        $story = StoryProgressSupport::normalizeStoryProgress($user->story_progress);
        $currency = StoryProgressSupport::normalizeProgressCurrency($user->progress_currency);
        $currentChapter = (string) ($story['current_chapter_id'] ?? 'R1-01');
        $currentNode = $this->resolveCurrentNode($story, $currentChapter, (string) ($user->current_node ?? ''));

        return [
            'current_chapter' => $currentChapter,
            'current_node' => $currentNode ?: null,
            'dao_heart' => (int) $currency['daoxin'],
            'story_keys' => (int) $currency['story_keys'],
            'unlocked_nodes' => $story['collected_nodes'] ?? [],
            'story_progress' => $story,
            'progress_currency' => $currency,
        ];
    }

    private function persistSnapshot(User $user, array $story, array $currency, ?string $preferredNode = null): array
    {
        $currentChapter = (string) ($story['current_chapter_id'] ?? 'R1-01');
        $currentNode = $this->resolveCurrentNode($story, $currentChapter, $preferredNode ?? (string) ($user->current_node ?? ''));

        $user->story_progress = $story;
        $user->progress_currency = $currency;
        $user->current_chapter = $currentChapter;
        $user->current_node = $currentNode ?: null;
        $user->dao_heart = (int) $currency['daoxin'];
        $user->story_keys = (int) $currency['story_keys'];
        $user->unlocked_nodes = $story['collected_nodes'] ?? [];
        $user->save();

        return $this->snapshot($user->fresh());
    }

    private function resolveCurrentNode(array $story, string $chapterId, string $fallback = ''): string
    {
        $map = is_array($story['selected_branches'] ?? null) ? $story['selected_branches'] : [];
        $fromMap = trim((string) ($map[$chapterId] ?? ''));
        if ($fromMap !== '') {
            return $fromMap;
        }
        return trim($fallback);
    }

    private function mergeUniqueStrings(array $base, array $incoming): array
    {
        $all = array_merge($base, $incoming);
        $normalized = [];
        foreach ($all as $item) {
            $value = trim((string) $item);
            if ($value === '') {
                continue;
            }
            $normalized[$value] = true;
        }
        return array_keys($normalized);
    }
}

