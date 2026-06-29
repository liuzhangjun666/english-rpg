<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserLearningProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthGuestTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_login_creates_guest_user_with_assessment_done(): void
    {
        $guestKey = 'guest-test-key-001';

        $response = $this->postJson('/api/auth/guest', [
            'guest_key' => $guestKey,
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.guest_key', $guestKey)
            ->assertJsonStructure([
                'data' => ['token', 'refresh_token', 'user' => ['id', 'nickname', 'is_guest']],
            ]);

        $user = User::query()->where('guest_key', $guestKey)->first();
        $this->assertNotNull($user);
        $this->assertTrue($user->is_guest);
        $this->assertSame('云游道人', $user->nickname);
        $this->assertStringStartsWith('100', $user->phone);

        $profile = UserLearningProfile::query()->where('user_id', $user->id)->first();
        $this->assertNotNull($profile);
        $this->assertSame(1, (int) $profile->initial_assessment_done);
    }

    public function test_guest_login_reuses_existing_guest_account(): void
    {
        $guestKey = 'guest-test-key-002';

        $first = $this->postJson('/api/auth/guest', ['guest_key' => $guestKey]);
        $first->assertOk();
        $userId = (int) $first->json('data.user.id');

        $second = $this->postJson('/api/auth/guest', ['guest_key' => $guestKey]);
        $second->assertOk()
            ->assertJsonPath('data.user.id', $userId);

        $this->assertSame(1, User::query()->where('guest_key', $guestKey)->count());
    }

    public function test_guest_profile_is_accessible_with_token(): void
    {
        $guestKey = 'guest-test-key-003';
        $login = $this->postJson('/api/auth/guest', ['guest_key' => $guestKey]);
        $token = (string) $login->json('data.token');

        $profile = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/user/profile');

        $profile->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_guest', true)
            ->assertJsonPath('data.initial_assessment_done', 1);
    }
}
