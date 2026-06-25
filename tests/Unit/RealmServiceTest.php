<?php

namespace Tests\Unit;

use App\Models\Question;
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
        $this->service = app(RealmService::class);
    }

    /**
     * getRealmIndex 委托 CultivationProfile::realmOrderIndex，返回 group*10+layer 的
     * 单调排序键（练气 L=0 组，筑基 Z=1 组…）。仅用于境界先后比较。
     */
    public function test_get_realm_index_orders_realms_monotonically()
    {
        $this->assertSame(1, $this->service->getRealmIndex('L1'));
        $this->assertSame(9, $this->service->getRealmIndex('L9'));
        $this->assertSame(11, $this->service->getRealmIndex('Z1'));

        // 跨境界单调递增：练气九层 < 筑基一层
        $this->assertGreaterThan(
            $this->service->getRealmIndex('L9'),
            $this->service->getRealmIndex('Z1')
        );
    }

    /**
     * 当前境界尚无修炼题库（total_curriculum = 0）时无法突破，返回 blocked。
     */
    public function test_breakthrough_blocked_without_curriculum()
    {
        $user = User::factory()->create(['realm' => 'L1', 'realm_stage' => 1]);

        $result = $this->service->breakthrough($user);

        $this->assertEquals('blocked', $result['type']);
        $this->assertFalse($result['breakthrough']);
    }

    /**
     * 满足六维 + 修为条件后突破：练气一层 → 练气二层（同组内 realm 代码不变，stage+1）。
     */
    public function test_breakthrough_realm_up()
    {
        // 仅播种 1 道语法题：grammar 维度要求 1，其余维度要求 0，requiredEnergy = 2。
        Question::create([
            'question_id' => 'G-L1-001',
            'type' => 'grammar',
            'realm' => 'L1',
            'stage' => '01',
            'question' => 'Choose the correct form.',
            'options' => ['A' => 'is', 'B' => 'are', 'C' => 'am', 'D' => 'be'],
            'correct_answer' => 'A',
        ]);

        $user = User::factory()->create([
            'realm' => 'L1',
            'realm_stage' => 1,
            'current_realm' => '练气一层',
            'grammar' => 1,
            'cultivation_energy' => 2,
        ]);

        $result = $this->service->breakthrough($user);

        $this->assertEquals('realm_up', $result['type']);
        $this->assertTrue($result['breakthrough']);
        $this->assertEquals('练气一层', $result['from_current_realm']);
        $this->assertEquals('练气二层', $result['to_current_realm']);
        $this->assertEquals('L1', $result['new_realm']);
        $this->assertEquals(2, $result['new_stage']);
        $this->assertEquals(1, $result['old_stage']);

        // 突破后六维与修为清零
        $user->refresh();
        $this->assertEquals(0, (int) $user->grammar);
        $this->assertEquals(0, (int) $user->cultivation_energy);
        $this->assertEquals('练气二层', $user->current_realm);
    }

    /**
     * 已达最高境界（渡劫九层）时返回 maxed。
     */
    public function test_breakthrough_max_realm()
    {
        // realm 列 enum 上限为 D3，渡劫境界用 current_realm 标签承载；
        // resolveCurrentRealm 会优先采用更高序号的 current_realm。
        $user = User::factory()->create([
            'realm' => 'D3',
            'realm_stage' => 9,
            'current_realm' => '渡劫九层',
        ]);

        $result = $this->service->breakthrough($user);

        $this->assertEquals('maxed', $result['type']);
        $this->assertFalse($result['breakthrough']);
    }

    public function test_resolve_current_realm_does_not_downgrade_assessed_label(): void
    {
        $user = User::factory()->make([
            'realm' => 'L1',
            'realm_stage' => 1,
            'current_realm' => '练气五层',
        ]);

        $this->assertSame('练气五层', $this->service->resolveCurrentRealm($user));
    }

    public function test_apply_realm_label_syncs_code_and_stage(): void
    {
        $user = User::factory()->create([
            'realm' => 'L1',
            'realm_stage' => 1,
            'current_realm' => '练气一层',
        ]);

        $this->service->applyRealmLabelToUser($user, '练气五层');
        $user->refresh();

        $this->assertSame('L1', $user->realm);
        $this->assertSame(5, (int) $user->realm_stage);
        $this->assertSame('练气五层', $user->current_realm);
    }
}
