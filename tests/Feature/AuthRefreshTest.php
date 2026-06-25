<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\AuthController;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthRefreshTest extends TestCase
{
    use RefreshDatabase;

    private function makeRefreshToken(User $user, ?\DateTimeInterface $expiresAt = null): string
    {
        return $user->createToken(
            AuthController::REFRESH_TOKEN_NAME,
            [AuthController::REFRESH_ABILITY],
            $expiresAt ?? now()->addDays(30)
        )->plainTextToken;
    }

    private function makeAccessToken(User $user, ?\DateTimeInterface $expiresAt = null): string
    {
        return $user->createToken(
            AuthController::ACCESS_TOKEN_NAME,
            ['*'],
            $expiresAt ?? now()->addDays(7)
        )->plainTextToken;
    }

    public function test_login_issues_both_access_and_refresh_tokens(): void
    {
        $user = User::factory()->create(['phone' => '13800138000']);

        $response = $this->postJson('/api/auth/login', [
            'phone' => '13800138000',
            'code' => '888888', // 非 production 环境的测试万能码
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['token', 'refresh_token']]);

        $this->assertNotEmpty($response->json('data.token'));
        $this->assertNotEmpty($response->json('data.refresh_token'));
        $this->assertTrue(
            $user->tokens()->where('name', AuthController::REFRESH_TOKEN_NAME)->exists()
        );
    }

    public function test_refresh_works_without_auth_sanctum_and_recovers_expired_access_token(): void
    {
        $user = User::factory()->create();

        // 访问令牌已过期 → 受保护路由必须 401。
        $expiredAccess = $this->makeAccessToken($user, now()->subMinute());
        $refreshToken = $this->makeRefreshToken($user);

        $this->withHeader('Authorization', "Bearer {$expiredAccess}")
            ->getJson('/api/user/profile')
            ->assertStatus(401);

        // 即便不带任何有效访问令牌，凭刷新令牌也能换取新会话——这正是修复前死掉的路径。
        $refreshResponse = $this->postJson('/api/auth/refresh', [
            'refresh_token' => $refreshToken,
        ]);

        $refreshResponse->assertStatus(200)->assertJsonPath('success', true);
        $newAccess = $refreshResponse->json('data.token');
        $this->assertNotEmpty($newAccess);

        // 新访问令牌可用。
        $this->withHeader('Authorization', "Bearer {$newAccess}")
            ->getJson('/api/user/profile')
            ->assertStatus(200);
    }

    public function test_concurrent_refresh_does_not_invalidate_each_other(): void
    {
        $user = User::factory()->create();
        $refreshToken = $this->makeRefreshToken($user);

        // 模拟 Vue 与旧版两个入口先后并发刷新（同一个刷新令牌）。
        $first = $this->postJson('/api/auth/refresh', ['refresh_token' => $refreshToken]);
        $second = $this->postJson('/api/auth/refresh', ['refresh_token' => $refreshToken]);

        $first->assertStatus(200);
        $second->assertStatus(200);

        $accessA = $first->json('data.token');
        $accessB = $second->json('data.token');
        $this->assertNotSame($accessA, $accessB);

        // 关键：第二次刷新不得作废第一次签发的访问令牌（旧实现 tokens()->delete() 会破坏它）。
        $this->withHeader('Authorization', "Bearer {$accessA}")
            ->getJson('/api/user/profile')->assertStatus(200);
        $this->withHeader('Authorization', "Bearer {$accessB}")
            ->getJson('/api/user/profile')->assertStatus(200);

        // 刷新令牌不旋转，仍然有效。
        $this->postJson('/api/auth/refresh', ['refresh_token' => $refreshToken])
            ->assertStatus(200);
    }

    public function test_refresh_token_cannot_be_used_as_access_token(): void
    {
        $user = User::factory()->create();
        $refreshToken = $this->makeRefreshToken($user);

        // 刷新令牌当作 Bearer 访问受保护路由必须被拒（authenticateAccessTokensUsing 名称守卫）。
        $this->withHeader('Authorization', "Bearer {$refreshToken}")
            ->getJson('/api/user/profile')
            ->assertStatus(401);
    }

    public function test_missing_refresh_token_is_rejected(): void
    {
        $this->postJson('/api/auth/refresh', [])
            ->assertStatus(401)
            ->assertJsonPath('code', 'REFRESH_TOKEN_REQUIRED');
    }

    public function test_invalid_or_expired_refresh_token_is_rejected(): void
    {
        $user = User::factory()->create();

        // 乱填的令牌。
        $this->postJson('/api/auth/refresh', ['refresh_token' => 'not-a-real-token'])
            ->assertStatus(401)
            ->assertJsonPath('code', 'INVALID_REFRESH_TOKEN');

        // 过期的刷新令牌。
        $expiredRefresh = $this->makeRefreshToken($user, now()->subDay());
        $this->postJson('/api/auth/refresh', ['refresh_token' => $expiredRefresh])
            ->assertStatus(401)
            ->assertJsonPath('code', 'INVALID_REFRESH_TOKEN');

        // 用访问令牌冒充刷新令牌（名称/能力不匹配）。
        $accessToken = $this->makeAccessToken($user);
        $this->postJson('/api/auth/refresh', ['refresh_token' => $accessToken])
            ->assertStatus(401)
            ->assertJsonPath('code', 'INVALID_REFRESH_TOKEN');
    }

    public function test_refresh_prunes_only_expired_access_tokens(): void
    {
        $user = User::factory()->create();
        $refreshToken = $this->makeRefreshToken($user);

        $this->makeAccessToken($user, now()->subMinute());   // 已过期 → 应被回收
        $liveAccess = $this->makeAccessToken($user, now()->addDays(7)); // 在用 → 必须保留

        $this->postJson('/api/auth/refresh', ['refresh_token' => $refreshToken])
            ->assertStatus(200);

        // 过期访问令牌被清理，但在用令牌与刷新令牌都保留。
        $this->assertSame(
            0,
            $user->tokens()
                ->where('name', AuthController::ACCESS_TOKEN_NAME)
                ->whereNotNull('expires_at')
                ->where('expires_at', '<', now())
                ->count()
        );
        $this->withHeader('Authorization', "Bearer {$liveAccess}")
            ->getJson('/api/user/profile')->assertStatus(200);
        $this->assertTrue(
            $user->tokens()->where('name', AuthController::REFRESH_TOKEN_NAME)->exists()
        );
    }
}
