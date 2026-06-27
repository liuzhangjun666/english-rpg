<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthPasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_requires_password(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'phone' => '13900139001',
            'code' => '888888',
            'school_grade' => 'junior',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('code', 'VALIDATION_ERROR');
    }

    public function test_register_stores_hashed_password(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'phone' => '13900139002',
            'code' => '888888',
            'school_grade' => 'junior',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $user = User::where('phone', '13900139002')->first();
        $this->assertNotNull($user);
        $this->assertTrue(Hash::check('secret123', $user->password));
    }

    public function test_login_with_password_succeeds(): void
    {
        User::factory()->create([
            'phone' => '13900139003',
            'password' => Hash::make('mypassword'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'phone' => '13900139003',
            'login_type' => 'password',
            'password' => 'mypassword',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['token', 'refresh_token']]);
    }

    public function test_login_with_wrong_password_is_rejected(): void
    {
        User::factory()->create([
            'phone' => '13900139004',
            'password' => Hash::make('correct-pass'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'phone' => '13900139004',
            'login_type' => 'password',
            'password' => 'wrong-pass',
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('code', 'INVALID_CREDENTIALS');
    }

    public function test_sms_login_still_works_without_login_type(): void
    {
        User::factory()->create(['phone' => '13800138000']);

        $response = $this->postJson('/api/auth/login', [
            'phone' => '13800138000',
            'code' => '888888',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    public function test_login_sms_send_rejects_unregistered_phone(): void
    {
        $response = $this->postJson('/api/sms/send', [
            'phone' => '13900139999',
            'action' => 'login',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', false)
            ->assertJsonPath('code', 'PHONE_NOT_REGISTERED');
    }

    public function test_register_sms_send_rejects_registered_phone(): void
    {
        User::factory()->create(['phone' => '13900139998']);

        $response = $this->postJson('/api/sms/send', [
            'phone' => '13900139998',
            'action' => 'register',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', false)
            ->assertJsonPath('code', 'PHONE_ALREADY_REGISTERED');
    }

    public function test_login_sms_send_allows_registered_phone(): void
    {
        User::factory()->create(['phone' => '13900139997']);

        $response = $this->postJson('/api/sms/send', [
            'phone' => '13900139997',
            'action' => 'login',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    public function test_reset_password_via_sms(): void
    {
        User::factory()->create(['phone' => '13900139005']);

        $this->postJson('/api/sms/send', [
            'phone' => '13900139005',
            'action' => 'reset_password',
        ])->assertStatus(200);

        $response = $this->postJson('/api/auth/reset-password', [
            'phone' => '13900139005',
            'code' => '888888',
            'password' => 'newpass123',
            'password_confirmation' => 'newpass123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $user = User::where('phone', '13900139005')->first();
        $this->assertTrue(Hash::check('newpass123', $user->password));
    }

    public function test_authenticated_user_can_set_password_with_sms(): void
    {
        $user = User::factory()->create(['phone' => '13900139006', 'password' => null]);
        $token = $user->createToken('access-token', ['*'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/password/send-code')
            ->assertStatus(200);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/password', [
                'code' => '888888',
                'password' => 'setpass123',
                'password_confirmation' => 'setpass123',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.has_password', true);

        $user->refresh();
        $this->assertTrue(Hash::check('setpass123', $user->password));
    }

    public function test_authenticated_user_can_change_password(): void
    {
        $user = User::factory()->create([
            'phone' => '13900139007',
            'password' => Hash::make('oldpass123'),
        ]);
        $token = $user->createToken('access-token', ['*'])->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/password', [
                'current_password' => 'oldpass123',
                'password' => 'newpass456',
                'password_confirmation' => 'newpass456',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $user->refresh();
        $this->assertTrue(Hash::check('newpass456', $user->password));
    }

    public function test_profile_includes_has_password_flag(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('secret'),
        ]);
        $token = $user->createToken('access-token', ['*'])->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/user/profile')
            ->assertStatus(200)
            ->assertJsonPath('data.has_password', true);
    }
}
