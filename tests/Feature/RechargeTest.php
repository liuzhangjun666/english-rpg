<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RechargeTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_create_recharge_order(): void
    {
        $user = User::factory()->create(['is_guest' => true, 'guest_key' => 'guest-rc-1']);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/recharge/orders', [
            'product_key' => 'jade_60',
            'pay_channel' => 'mock',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('code', 'RECHARGE_REJECTED');
    }

    public function test_mock_recharge_credits_jade(): void
    {
        config(['recharge.mock_pay' => true]);

        $user = User::factory()->create(['is_guest' => false]);
        Sanctum::actingAs($user);

        $catalog = $this->getJson('/api/recharge/catalog');
        $catalog->assertOk();

        $create = $this->postJson('/api/recharge/orders', [
            'product_key' => 'jade_60',
            'pay_channel' => 'mock',
        ]);
        $create->assertOk();
        $orderNo = (string) $create->json('data.order.order_no');

        $pay = $this->postJson("/api/recharge/mock-pay/{$orderNo}");
        $pay->assertOk()
            ->assertJsonPath('data.order.status', 'paid');

        $user->refresh();
        $this->assertGreaterThan(0, (int) $user->jade_balance);
        $this->assertNotNull($user->first_recharge_at);
    }

    public function test_exchange_jade_to_stones(): void
    {
        $user = User::factory()->create([
            'is_guest' => false,
            'jade_balance' => 100,
            'spirit_stone' => 0,
        ]);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/recharge/exchange', [
            'jade_amount' => 50,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.stones_gained', 5);

        $user->refresh();
        $this->assertSame(50, (int) $user->jade_balance);
        $this->assertSame(5, (int) $user->spirit_stone);
    }
}
