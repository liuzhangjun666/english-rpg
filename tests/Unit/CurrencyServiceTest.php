<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\CurrencyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CurrencyServiceTest extends TestCase
{
    use RefreshDatabase;

    private CurrencyService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new CurrencyService();
    }

    public function test_daily_check_recovers_spirit_power()
    {
        $user = User::factory()->create([
            'spirit_power' => 30,
            'spirit_power_max' => 100,
            'spirit_power_date' => now()->subDay()->format('Y-m-d'),
        ]);

        $result = $this->service->dailyCheck($user);

        $this->assertTrue($result['recovered']);
        $this->assertEquals(100, $result['spirit_power']);
        $this->assertEquals(100, $user->fresh()->spirit_power);
    }

    public function test_daily_check_does_not_recover_same_day()
    {
        $user = User::factory()->create([
            'spirit_power' => 30,
            'spirit_power_max' => 100,
            'spirit_power_date' => now()->format('Y-m-d'),
        ]);

        $result = $this->service->dailyCheck($user);

        $this->assertFalse($result['recovered']);
        $this->assertEquals(30, $user->fresh()->spirit_power);
    }

    public function test_consume_spirit_when_enough()
    {
        $user = User::factory()->create(['spirit_power' => 50]);

        $result = $this->service->consumeSpirit($user, 30);

        $this->assertTrue($result);
        $this->assertEquals(20, $user->fresh()->spirit_power);
    }

    public function test_consume_spirit_when_not_enough()
    {
        $user = User::factory()->create(['spirit_power' => 10]);

        $result = $this->service->consumeSpirit($user, 30);

        $this->assertFalse($result);
        $this->assertEquals(10, $user->fresh()->spirit_power);
    }

    public function test_settle_batch_correct_calculation()
    {
        $user = User::factory()->create([
            'spirit_power' => 100,
            'exp' => 0,
            'spirit_stone' => 0,
        ]);

        $results = [
            ['correct' => true],
            ['correct' => true],
            ['correct' => false],
            ['correct' => true],
        ];

        $settlement = $this->service->settleBatch($user, $results, 4);

        $this->assertEquals(3, $settlement['correct_count']);
        $this->assertEquals(75, $settlement['accuracy']);
        $this->assertEquals(30, $settlement['exp_gained']); // 3 x 10
        $this->assertEquals(4, $settlement['spirit_cost']);
        $this->assertTrue($settlement['passed']);
        $this->assertEquals(3, $settlement['stones_gained']); // 3 x 1
    }

    public function test_settle_batch_insufficient_spirit()
    {
        $user = User::factory()->create(['spirit_power' => 2, 'exp' => 0]);

        $results = [['correct' => true], ['correct' => true], ['correct' => true]];
        $settlement = $this->service->settleBatch($user, $results, 3);

        $this->assertArrayHasKey('error', $settlement);
        $this->assertEquals('INSUFFICIENT_SPIRIT_POWER', $settlement['error']);
        $this->assertEquals(0, $user->fresh()->exp);
    }

    public function test_perfect_bonus()
    {
        $user = User::factory()->create([
            'spirit_power' => 100,
            'exp' => 0,
            'spirit_stone' => 0,
        ]);

        $results = [
            ['correct' => true],
            ['correct' => true],
        ];

        $settlement = $this->service->settleBatch($user, $results, 2);

        $this->assertEquals(100, $settlement['accuracy']);
        $this->assertEquals(20 + CurrencyService::EXP_BONUS_PERFECT, $settlement['exp_gained']);
        $this->assertEquals(2 + CurrencyService::STONE_PERFECT_BONUS, $settlement['stones_gained']);
    }
}
