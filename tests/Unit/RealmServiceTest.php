<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\RealmService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RealmServiceTest extends TestCase
{
    use RefreshDatabase;

    private RealmService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new RealmService();
    }

    public function test_get_realm_index()
    {
        $this->assertEquals(0, $this->service->getRealmIndex('L1'));
        $this->assertEquals(8, $this->service->getRealmIndex('L9'));
        $this->assertEquals(9, $this->service->getRealmIndex('Z1'));
        $this->assertEquals(-1, $this->service->getRealmIndex('XX'));
    }

    public function test_breakthrough_stage_up()
    {
        $user = User::factory()->create(['realm' => 'L1', 'realm_stage' => 1, 'exp' => 0]);

        $result = $this->service->breakthrough($user);

        $this->assertEquals('stage_up', $result['type']);
        $this->assertEquals(2, $result['new_stage']);
        $this->assertEquals(1, $result['old_stage']);
        $this->assertEquals('L1', $result['new_realm']);
        $this->assertGreaterThan(0, $result['bonus_exp']);
    }

    public function test_breakthrough_realm_up()
    {
        $user = User::factory()->create(['realm' => 'L1', 'realm_stage' => 3, 'exp' => 0]);

        $result = $this->service->breakthrough($user);

        $this->assertEquals('realm_up', $result['type']);
        $this->assertEquals('L2', $result['new_realm']);
        $this->assertEquals(1, $result['new_stage']);
        $this->assertEquals('L1', $result['old_realm']);
        $this->assertTrue($result['breakthrough']);
        $this->assertEquals(50, $result['spirit_power_max_increased']);
    }

    public function test_breakthrough_max_realm()
    {
        $user = User::factory()->create(['realm' => 'D3', 'realm_stage' => 3]);

        $result = $this->service->breakthrough($user);

        $this->assertEquals('maxed', $result['type']);
    }
}
