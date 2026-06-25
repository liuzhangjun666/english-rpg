<?php

namespace Tests\Unit;

use App\Models\User;
use App\Models\VocabularyWord;
use App\Services\PracticeLevelService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PracticeLevelServiceTest extends TestCase
{
    use RefreshDatabase;

    private PracticeLevelService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(PracticeLevelService::class);
    }

    /**
     * 回归：练气一层(L1) 映射到“一年级”，但小学英语词库从三年级起、无一年级词。
     * 此时年级过滤必然落空，getVocabWordPool 必须回落到“仅按学段(小学)取词”，
     * 否则练功房出现“境界暂无题目”死路（用户实测 bug）。
     */
    public function test_vocab_pool_falls_back_to_level_tag_when_no_grade_match()
    {
        foreach (['apple' => '三年级上册', 'banana' => '四年级下册'] as $lemma => $grade) {
            VocabularyWord::create([
                'lemma' => $lemma,
                'level_tag' => '小学',
                'grade_level' => $grade,
                'meanings' => ['释义'],
            ]);
        }

        $user = User::factory()->create(['realm' => 'L1', 'realm_stage' => 1, 'school_grade' => null]);

        $pool = $this->service->getVocabWordPool($user);

        $this->assertCount(2, $pool, 'L1 无一年级词时应回落到全部小学词，而不是空池');
    }

    /**
     * 兜底2：词库完全未标注 level_tag 时，仍应返回全部词，保证练功房不空转。
     */
    public function test_vocab_pool_falls_back_to_all_words_when_untagged()
    {
        VocabularyWord::create(['lemma' => 'cat', 'level_tag' => null, 'grade_level' => null, 'meanings' => ['猫']]);

        $user = User::factory()->create(['realm' => 'L1', 'realm_stage' => 1, 'school_grade' => null]);

        $pool = $this->service->getVocabWordPool($user);

        $this->assertCount(1, $pool, '未标注词库应回落返回全部词');
    }
}
