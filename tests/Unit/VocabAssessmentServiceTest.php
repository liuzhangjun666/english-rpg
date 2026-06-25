<?php

namespace Tests\Unit;

use App\Models\Question;
use App\Models\VocabularyAssessment;
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

    public function test_senior_start_level_floor_is_one_below_start(): void
    {
        $this->assertSame(4, $this->service->getStartLevelByStage('高中'));
        $this->assertSame(3, $this->service->getMinLevelByStartLevel(4));
    }

    public function test_primary_start_level_cannot_drop_below_one(): void
    {
        $this->assertSame(1, $this->service->getMinLevelByStartLevel(1));
    }

    public function test_correct_answer_promotes_one_level_without_time_limit(): void
    {
        $assessment = new VocabularyAssessment([
            'school_stage' => '高中',
            'start_level' => 4,
            'grammar_current_level' => 3,
            'vocab_current_level' => 4,
        ]);

        $result = $this->service->adjustAssessmentLevel(
            $assessment,
            VocabAssessmentService::DIMENSION_GRAMMAR,
            true,
            999,
            5
        );

        $this->assertSame(3, $result['level_before']);
        $this->assertSame(4, $result['level_after']);
    }

    public function test_wrong_answer_respects_school_stage_floor(): void
    {
        $assessment = new VocabularyAssessment([
            'school_stage' => '高中',
            'start_level' => 4,
            'grammar_current_level' => 3,
            'vocab_current_level' => 4,
        ]);

        $result = $this->service->adjustAssessmentLevel(
            $assessment,
            VocabAssessmentService::DIMENSION_GRAMMAR,
            false,
            2,
            5
        );

        $this->assertSame(3, $result['level_before']);
        $this->assertSame(3, $result['level_after']);
    }

    public function test_resolve_stable_level_uses_tail_median(): void
    {
        $records = [
            (object) ['question_type' => 'grammar', 'level_after' => 4, 'assessment_level' => 4],
            (object) ['question_type' => 'grammar', 'level_after' => 3, 'assessment_level' => 4],
            (object) ['question_type' => 'grammar', 'level_after' => 3, 'assessment_level' => 3],
            (object) ['question_type' => 'grammar', 'level_after' => 2, 'assessment_level' => 3],
        ];

        $level = $this->service->resolveStableLevelByDimension(
            $records,
            VocabAssessmentService::DIMENSION_GRAMMAR,
            4
        );

        $this->assertSame(3, $level);
    }

    public function test_assessment_grammar_rejects_odd_one_out_classification(): void
    {
        $question = new Question([
            'type' => 'grammar',
            'question' => '读一读，选出不同类的单词：',
        ]);

        $this->assertFalse($this->service->isAssessmentSuitableGrammar($question));
    }

    public function test_assessment_grammar_accepts_sentence_grammar_item(): void
    {
        $question = new Question([
            'type' => 'grammar',
            'question' => "It's 9:00 p.m. It's time ______. ( )",
        ]);

        $this->assertTrue($this->service->isAssessmentSuitableGrammar($question));
    }
}
