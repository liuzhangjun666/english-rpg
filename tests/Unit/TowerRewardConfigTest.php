<?php
namespace Tests\Unit;
use App\Services\TowerRewardConfig;
use Tests\TestCase;

class TowerRewardConfigTest extends TestCase
{
    public function test_first_clear_floor_1_gives_10_stones()
    {
        $r = TowerRewardConfig::computeStones(floor: 1, isFirstClear: true, perfect: false);
        $this->assertSame(10, $r);
    }
    public function test_first_clear_floor_30_gives_300_stones()
    {
        $this->assertSame(300, TowerRewardConfig::computeStones(30, true, false));
    }
    public function test_repeat_clear_floor_30_gives_90_stones()
    {
        $this->assertSame(90, TowerRewardConfig::computeStones(30, false, false));
    }
    public function test_perfect_first_clear_floor_30_adds_bonus()
    {
        // 300 base + floor*5 perfect bonus = 300 + 150 = 450
        $this->assertSame(450, TowerRewardConfig::computeStones(30, true, true));
    }
    public function test_breakthrough_floors_include_10_and_100()
    {
        $this->assertTrue(TowerRewardConfig::isBreakthrough(10));
        $this->assertTrue(TowerRewardConfig::isBreakthrough(100));
        $this->assertFalse(TowerRewardConfig::isBreakthrough(11));
    }
    public function test_theme_for_floor()
    {
        $this->assertSame('fire', TowerRewardConfig::themeForFloor(1));
        $this->assertSame('fire', TowerRewardConfig::themeForFloor(10));
        $this->assertSame('ice',  TowerRewardConfig::themeForFloor(11));
        $this->assertSame('chaos', TowerRewardConfig::themeForFloor(100));
    }
    public function test_vocab_tier_for_floor()
    {
        $this->assertSame('cet4_hf', TowerRewardConfig::vocabTier(1));
        $this->assertSame('cet4',    TowerRewardConfig::vocabTier(30));
        $this->assertSame('cet6',    TowerRewardConfig::vocabTier(50));
        $this->assertSame('kaoyan',  TowerRewardConfig::vocabTier(70));
        $this->assertSame('ielts',   TowerRewardConfig::vocabTier(95));
    }

    public function test_assessment_level_for_floor()
    {
        $this->assertSame(4, TowerRewardConfig::assessmentLevelForFloor(1));
        $this->assertSame(5, TowerRewardConfig::assessmentLevelForFloor(30));
        $this->assertSame(6, TowerRewardConfig::assessmentLevelForFloor(50));
        $this->assertSame(7, TowerRewardConfig::assessmentLevelForFloor(90));
    }

    public function test_realm_for_assessment_level()
    {
        $this->assertSame('L1', TowerRewardConfig::realmForAssessmentLevel(1));
        $this->assertSame('J1', TowerRewardConfig::realmForAssessmentLevel(4));
        $this->assertSame('H1', TowerRewardConfig::realmForAssessmentLevel(7));
    }
}
