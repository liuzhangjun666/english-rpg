<?php

namespace Tests\Unit;

use App\Support\ReadingQuestionNormalizer;
use PHPUnit\Framework\TestCase;

class ReadingQuestionNormalizerTest extends TestCase
{
    private ReadingQuestionNormalizer $normalizer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->normalizer = new ReadingQuestionNormalizer();
    }

    public function test_it_parses_single_choice_stem_and_options(): void
    {
        $result = $this->normalizer->normalize([
            'question_type' => 'single',
            'question' => "What's coming? (   )\nA．Winter holiday.\nB．Summer holiday.\nC．Weekend.",
            'correct_answer' => 'B',
            'explanation' => '暑假即将到来。',
        ]);

        $this->assertSame("What's coming?", $result['question']);
        $this->assertSame([
            'A' => 'Winter holiday.',
            'B' => 'Summer holiday.',
            'C' => 'Weekend.',
        ], $result['options']);
        $this->assertSame('B', $result['correct_answer']);
        $this->assertSame('detail', $result['question_type']);
    }

    public function test_it_normalizes_true_false_questions(): void
    {
        $result = $this->normalizer->normalize([
            'question_type' => 'tf',
            'question' => 'Amy goes to school by bus. (     )',
            'correct_answer' => 'T',
            'explanation' => '表达正确。',
        ]);

        $this->assertSame('Amy goes to school by bus.', $result['question']);
        $this->assertSame(['A' => 'True', 'B' => 'False'], $result['options']);
        $this->assertSame('A', $result['correct_answer']);
        $this->assertSame('tf', $result['question_type']);
    }

    public function test_it_marks_inference_questions(): void
    {
        $result = $this->normalizer->normalize([
            'question_type' => 'single',
            'question' => "Why did the writer change his mind? (   )\nA．He was tired.\nB．He learned from practice.\nC．He quit school.\nD．He forgot the topic.",
            'correct_answer' => 'B',
        ]);

        $this->assertSame('infer', $result['question_type']);
        $this->assertStringContainsString('Why did the writer change his mind?', $result['question']);
    }

    public function test_it_normalizes_structured_generator_questions(): void
    {
        $result = $this->normalizer->normalize([
            'question_type' => 'detail',
            'question' => 'Why did the writer doubt joining the newspaper at first?',
            'options' => [
                'A' => 'He was not interested in writing.',
                'B' => 'He worried his English was not good enough.',
                'C' => 'He disliked the English teacher.',
                'D' => 'He had no time after class.',
            ],
            'correct_answer' => 'B',
            'explanation' => '他起初担心自己英语不够好。',
        ]);

        $this->assertSame('detail', $result['question_type']);
        $this->assertSame('B', $result['correct_answer']);
        $this->assertCount(4, $result['options']);
    }
}
