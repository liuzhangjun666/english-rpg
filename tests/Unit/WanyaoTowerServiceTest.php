<?php
namespace Tests\Unit;
use App\Services\WanyaoTowerService;
use App\Services\TowerRewardConfig;
use Tests\TestCase;
use PHPUnit\Framework\MockObject\MockObject;

class WanyaoTowerServiceTest extends TestCase
{
    public function test_assemble_run_payload_picks_5_mcq_plus_1_boss()
    {
        $vocabBuilder = $this->createMock(\App\Services\VocabQuestionBuilder::class);
        $vocabBuilder->method('buildFromPool')->willReturn(array_fill(0, 5, [
            'id' => 1, 'type' => 'vocab', 'options' => ['a','b','c','d'], 'answer' => 'a',
        ]));
        $svc = new class($vocabBuilder) extends WanyaoTowerService {
            protected function pickVocabWords(string $tier, string $theme, int $count): \Illuminate\Support\Collection
            {
                return collect();
            }
        };

        $payload = $svc->assembleRunPayload(floor: 5);

        $this->assertCount(5, $payload['questions']);
        $this->assertArrayHasKey('boss_prompt', $payload);
        $this->assertArrayNotHasKey('answer', $payload['questions'][0],
            '答案不应下发给前端');
        $this->assertSame('fire', $payload['theme']);
        $this->assertSame('cet4_hf', $payload['vocab_tier']);
    }

    public function test_grade_answer_returns_correct_for_matching_choice()
    {
        $svc = new WanyaoTowerService($this->createMock(\App\Services\VocabQuestionBuilder::class));
        $snapshot = ['questions' => [
            ['id' => 7, 'answer' => 'good', 'type' => 'vocab']
        ]];
        $this->assertTrue($svc->gradeAnswer($snapshot, qid: 7, given: 'good'));
        $this->assertFalse($svc->gradeAnswer($snapshot, qid: 7, given: 'bad'));
    }

    public function test_grade_answer_throws_for_unknown_qid()
    {
        $svc = new WanyaoTowerService($this->createMock(\App\Services\VocabQuestionBuilder::class));
        $this->expectException(\DomainException::class);
        $svc->gradeAnswer(['questions' => []], qid: 999, given: 'x');
    }

    public function test_compute_settle_result_pass_threshold()
    {
        $svc = new WanyaoTowerService($this->createMock(\App\Services\VocabQuestionBuilder::class));
        $r = $svc->computeSettleResult(correctCount: 4, bossPassed: true);
        $this->assertTrue($r['cleared']);
        $this->assertFalse($r['perfect']);
    }

    public function test_compute_settle_result_fail_when_boss_failed()
    {
        $svc = new WanyaoTowerService($this->createMock(\App\Services\VocabQuestionBuilder::class));
        $r = $svc->computeSettleResult(correctCount: 5, bossPassed: false);
        $this->assertFalse($r['cleared']);
    }

    public function test_compute_settle_result_fail_when_less_than_3_correct()
    {
        $svc = new WanyaoTowerService($this->createMock(\App\Services\VocabQuestionBuilder::class));
        $this->assertFalse($svc->computeSettleResult(2, true)['cleared']);
    }

    public function test_compute_settle_result_perfect_requires_all_5_correct()
    {
        $svc = new WanyaoTowerService($this->createMock(\App\Services\VocabQuestionBuilder::class));
        $this->assertFalse($svc->computeSettleResult(4, true)['perfect']);
        $this->assertTrue($svc->computeSettleResult(5, true)['perfect']);
    }
}
