<?php

namespace App\Services;

use App\Models\User;

class PetService
{
  private const PET_DEFS = [
    ['id' => 'fox', 'name' => '灵狐', 'requirement' => '连续修炼 3 天', 'min_streak' => 3],
    ['id' => 'crane', 'name' => '白鹤', 'requirement' => '连续修炼 7 天', 'min_streak' => 7],
    ['id' => 'turtle', 'name' => '玄龟', 'requirement' => '累计答题 100 道', 'min_total' => 100],
    ['id' => 'dragon', 'name' => '幼龙', 'requirement' => '获得任意成就', 'min_achievements' => 1],
  ];

  public function __construct(
    private readonly ReportService $reportService,
    private readonly AchievementService $achievementService,
  ) {}

  public function garden(User $user): array
  {
    $stats = $this->resolveUnlockStats($user);
    $currency = is_array($user->progress_currency) ? $user->progress_currency : [];
    $affinity = is_array($currency['pet_affinity'] ?? null) ? $currency['pet_affinity'] : [];
    $selected = (string) ($currency['selected_pet'] ?? '');
    $lastPetDate = (string) ($currency['pet_interact_date'] ?? '');

    $pets = [];
    foreach (self::PET_DEFS as $def) {
      $id = $def['id'];
      $unlocked = $this->isUnlocked($def, $stats);
      $pets[] = [
        'id' => $id,
        'name' => $def['name'],
        'requirement' => $def['requirement'],
        'unlocked' => $unlocked,
        'selected' => $selected === $id,
        'affinity' => (int) ($affinity[$id] ?? 0),
      ];
    }

    return [
      'pets' => $pets,
      'selected_pet' => $selected,
      'can_interact_today' => $lastPetDate !== now()->format('Y-m-d'),
    ];
  }

  public function select(User $user, string $petId): array
  {
    $stats = $this->resolveUnlockStats($user);
    $def = collect(self::PET_DEFS)->firstWhere('id', $petId);
    if (!$def || !$this->isUnlocked($def, $stats)) {
      return ['success' => false, 'message' => '灵宠尚未解锁'];
    }

    $currency = is_array($user->progress_currency) ? $user->progress_currency : [];
    $currency['selected_pet'] = $petId;
    $user->progress_currency = $currency;
    $user->save();

    return ['success' => true, 'data' => $this->garden($user->fresh())];
  }

  public function interact(User $user, string $petId): array
  {
    $stats = $this->resolveUnlockStats($user);
    $def = collect(self::PET_DEFS)->firstWhere('id', $petId);
    if (!$def || !$this->isUnlocked($def, $stats)) {
      return ['success' => false, 'message' => '灵宠尚未解锁'];
    }

    $currency = is_array($user->progress_currency) ? $user->progress_currency : [];
    $today = now()->format('Y-m-d');
    if (($currency['pet_interact_date'] ?? '') === $today) {
      return ['success' => false, 'message' => '今日已抚灵，明日再来'];
    }

    $affinity = is_array($currency['pet_affinity'] ?? null) ? $currency['pet_affinity'] : [];
    $affinity[$petId] = (int) ($affinity[$petId] ?? 0) + 10;
    $currency['pet_affinity'] = $affinity;
    $currency['pet_interact_date'] = $today;
    $currency['selected_pet'] = $petId;
    $user->progress_currency = $currency;
    $user->save();

    return [
      'success' => true,
      'message' => '灵宠亲昵度 +10',
      'data' => $this->garden($user->fresh()),
    ];
  }

  private function resolveUnlockStats(User $user): array
  {
    $analytics = $this->reportService->learningAnalytics($user, 30);
    $achievements = $this->achievementService->getUserAchievements($user->id);
    $unlockedIds = $this->achievementService->toFrontendIds($achievements);

    return [
      'streak' => $this->reportService->getStreakDays($user),
      'total' => (int) ($analytics['total_questions'] ?? 0),
      'achievements' => count($unlockedIds),
    ];
  }

  private function isUnlocked(array $def, array $stats): bool
  {
    if (isset($def['min_streak']) && (int) $stats['streak'] < (int) $def['min_streak']) {
      return false;
    }
    if (isset($def['min_total']) && (int) $stats['total'] < (int) $def['min_total']) {
      return false;
    }
    if (isset($def['min_achievements']) && (int) $stats['achievements'] < (int) $def['min_achievements']) {
      return false;
    }

    return true;
  }
}
