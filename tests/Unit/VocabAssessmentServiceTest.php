<?php

namespace Tests\Unit;

use App\Services\VocabAssessmentService;
use Tests\TestCase;

class VocabAssessmentServiceTest extends TestCase
{
    private VocabAssessmentService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new VocabAssessmentService();
    }

    public function test_primary_school_caps_max_level_at_two(): void
    {
        $this->assertSame(2, $this->service->getMaxLevelBySchoolStage('小学'));
    }

    public function test_primary_school_realm_stays_in_lianqi_regardless_of_adaptive_level(): void
    {
        $mapped = $this->service->mapLevelToRealm(6, 76.0, '小学');

        $this->assertSame('练气', $mapped['major_realm']);
        $this->assertSame('L1', $mapped['realm_code']);
        $this->assertSame('练气六层', $mapped['realm_label']);
        $this->assertStringContainsString('小学', $mapped['explanation']);
    }

    public function test_college_stage_allows_yuanying_realm(): void
    {
        $mapped = $this->service->mapLevelToRealm(6, 76.0, '大学');

        $this->assertSame('元婴', $mapped['major_realm']);
        $this->assertSame('Y1', $mapped['realm_code']);
        $this->assertSame('元婴六层', $mapped['realm_label']);
    }
}
