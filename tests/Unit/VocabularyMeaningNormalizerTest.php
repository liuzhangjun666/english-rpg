<?php

namespace Tests\Unit;

use App\Support\VocabularyMeaningNormalizer;
use Tests\TestCase;

class VocabularyMeaningNormalizerTest extends TestCase
{
    public function test_merges_split_parenthetical_meaning(): void
    {
        $normalized = VocabularyMeaningNormalizer::normalize([
            '上(船',
            '飞机',
            '公共汽车等)',
        ]);

        $this->assertSame(['上(船、飞机、公共汽车等)'], $normalized);
    }

    public function test_merges_title_style_fragments(): void
    {
        $normalized = VocabularyMeaningNormalizer::normalize([
            '(书',
            '诗歌等的)名称',
            '/标题',
            '职称',
            '头衔',
        ]);

        $this->assertSame([
            '(书、诗歌等的)名称',
            '标题',
            '职称',
            '头衔',
        ], $normalized);
    }

    public function test_check_in_style_meaning_is_merged(): void
    {
        $normalized = VocabularyMeaningNormalizer::normalize([
            '(在旅馆',
            '机场等)登记',
        ]);

        $this->assertSame(['(在旅馆、机场等)登记'], $normalized);
    }
}
