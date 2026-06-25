<?php

namespace Tests\Unit;

use App\Support\AssessmentLevelResolver;
use Tests\TestCase;

class AssessmentLevelResolverTest extends TestCase
{
    public function test_elementary_grammar_l2_stage_maps_to_primary_high_not_junior_high(): void
    {
        $level = AssessmentLevelResolver::resolveFromParts(
            null,
            '（来源：四年级分类 · 四年级下册）',
            '读一读，选出不同类的单词：',
            'L2',
            '01',
            'EGV-L2-01-1204',
        );

        $this->assertSame(1, $level);
    }

    public function test_junior_high_source_maps_to_level_three(): void
    {
        $level = AssessmentLevelResolver::resolveFromParts(
            '八年级',
            '（来源：八年级语法 · 八年级上册）',
            'He ______ to school every day.',
            'Z1',
            '05',
            'JGV-Z1-05-0001',
        );

        $this->assertSame(3, $level);
    }

    public function test_classification_grammar_excluded_from_assessment(): void
    {
        $this->assertFalse(AssessmentLevelResolver::shouldIncludeInAssessment(
            'grammar',
            '读一读，选出不同类的单词：',
        ));
    }

    public function test_classification_stem_variants_are_detected(): void
    {
        $this->assertTrue(AssessmentLevelResolver::isVocabularyClassificationStem(
            '读一读，选出不同类的单词：time / go / come / morning',
        ));
        $this->assertTrue(AssessmentLevelResolver::isVocabularyClassificationStem(
            'Which word is different from others?',
        ));
        $this->assertFalse(AssessmentLevelResolver::isVocabularyClassificationStem(
            'Ling ___ to the sect library every morning.',
        ));
    }
}
