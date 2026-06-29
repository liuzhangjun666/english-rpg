<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserLearningProfile;
use App\Support\CultivationProfile;
use Illuminate\Support\Str;

class GuestAuthService
{
  public function __construct(
    private readonly RealmService $realmService,
  ) {
  }

  public function resolveGuestKey(?string $raw): string
  {
    $key = trim((string) $raw);
    if ($key !== '' && preg_match('/^[a-zA-Z0-9\-]{8,36}$/', $key)) {
      return $key;
    }

    return (string) Str::uuid();
  }

  public function findOrCreateGuest(string $guestKey): User
  {
    $existing = User::query()
      ->where('guest_key', $guestKey)
      ->where('is_guest', true)
      ->first();

    if ($existing) {
      return $existing;
    }

    return $this->createGuestUser($guestKey);
  }

  private function createGuestUser(string $guestKey): User
  {
    $realm = 'L1';
    $stage = 3;
    $exp = 45;
    $currentRealmName = $this->realmService->composeCurrentRealm($realm, $stage);
    $phone = $this->allocateGuestPhone($guestKey);
    $today = date('Y-m-d');

    $user = User::create([
      'phone' => $phone,
      'guest_key' => $guestKey,
      'is_guest' => true,
      'nickname' => '云游道人',
      'school_grade' => 'junior',
      'realm' => $realm,
      'realm_stage' => $stage,
      'exp' => $exp,
      'current_realm' => $currentRealmName,
      'cultivation_energy' => 0,
      'vocabulary' => 0,
      'grammar' => 0,
      'reading' => 0,
      'listening' => 0,
      'writing' => 0,
      'speaking' => 0,
      'spirit_power' => 100,
      'spirit_power_max' => 100,
      'spirit_stone' => 30,
      'spirit_power_date' => $today,
      'spirit_power_last_recover_at' => now(),
      'is_minor' => 0,
      'daily_minutes' => 0,
      'daily_minutes_date' => $today,
      'last_login_at' => now(),
      'tutorial_step' => 1,
      'initiation_completed_at' => now(),
    ]);

    UserLearningProfile::query()->create([
      'user_id' => $user->id,
      'school_stage' => 'junior',
      'learning_goal' => CultivationProfile::learningStage($realm, $stage, 'junior')['focus'] ?? null,
      'initial_assessment_done' => 1,
      'initial_level' => 2,
      'current_level' => 2,
      'initial_realm' => $currentRealmName,
      'current_realm' => $currentRealmName,
      'current_stage' => 'L1-03',
      'vocabulary_realm' => $realm,
      'vocabulary_level' => 2,
      'grammar_level' => 2,
    ]);

    return $user;
  }

  private function allocateGuestPhone(string $guestKey): string
  {
    $candidate = $this->guestPhoneFromKey($guestKey);
    $attempt = 0;

    while (User::query()->where('phone', $candidate)->exists() && $attempt < 5) {
      $attempt += 1;
      $candidate = $this->guestPhoneFromKey($guestKey . ':' . $attempt);
    }

    return $candidate;
  }

  /** 100 开头为游客占位号段，不与真实手机号冲突。 */
  private function guestPhoneFromKey(string $guestKey): string
  {
    $n = abs(crc32($guestKey)) % 100000000;

    return '100' . str_pad((string) $n, 8, '0', STR_PAD_LEFT);
  }
}
