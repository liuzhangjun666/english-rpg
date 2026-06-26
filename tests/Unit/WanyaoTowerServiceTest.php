<?php
namespace Tests\Unit;

use App\Services\TowerRewardConfig;
use App\Services\WanyaoTowerService;
use Tests\TestCase;

class WanyaoTowerServiceTest extends TestCase
{
    public function test_assemble_run_payload_picks_5_mcq_plus_1_boss()
    {
        $svc = new class extends WanyaoTowerService {
            protected function pickQuestions(int $floor, int $count): array
            {
                return array_fill(0, 5, [
                    'id' => 1,
                    'question_id' => 'TEST-001',
                    'type' => 'grammar',
                    'question' => 'Pick one.',
                    'options' => ['A' => 'a', 'B' => 'b', 'C' => 'c', 'D' => 'd'],
                    'correct_answer' => 'A',
                ]);
            }

            protected function pickBossPrompt(int $floor, string $theme): array
            {
                return [
                    'id' => 9,
                    'prompt_id' => 'WP-TEST',
                    'theme' => $theme,
                    'title' => 'Boss writing',
                    'min_chars' => 30,
                    'time_limit' => 120,
                ];
            }
        };

        $payload = $svc->assembleRunPayload(floor: 5);

        $this->assertCount(5, $payload['questions']);
        $this->assertArrayHasKey('boss_prompt', $payload);
        $this->assertSame('TEST-001', $payload['questions'][0]['question_id']);
        $this->assertSame('fire', $payload['theme']);
        $this->assertSame('cet4_hf', $payload['vocab_tier']);
    }

    public function test_grade_answer_returns_correct_for_matching_choice()
    {
        $svc = new WanyaoTowerService();
        $snapshot = ['questions' => [
            [
                'id' => 7,
                'question_id' => 'GR-TEST-007',
                'type' => 'grammar',
                'options' => ['A' => 'good', 'B' => 'bad'],
                'correct_answer' => 'A',
            ],
        ]];
        $this->assertTrue($svc->gradeAnswer($snapshot, qid: 7, given: 'good'));
        $this->assertFalse($svc->gradeAnswer($snapshot, qid: 7, given: 'bad'));
    }

    public function test_grade_answer_throws_for_unknown_qid()
    {
        $svc = new WanyaoTowerService();
        $this->expectException(\DomainException::class);
        $svc->gradeAnswer(['questions' => []], qid: 999, given: 'x');
    }

    public function test_compute_settle_result_pass_threshold()
    {
        $svc = new WanyaoTowerService();
        $r = $svc->computeSettleResult(correctCount: 4, bossPassed: true);
        $this->assertTrue($r['cleared']);
        $this->assertFalse($r['perfect']);
    }

    public function test_compute_settle_result_fail_when_boss_failed()
    {
        $svc = new WanyaoTowerService();
        $r = $svc->computeSettleResult(correctCount: 5, bossPassed: false);
        $this->assertFalse($r['cleared']);
    }

    public function test_compute_settle_result_fail_when_less_than_3_correct()
    {
        $svc = new WanyaoTowerService();
        $this->assertFalse($svc->computeSettleResult(2, true)['cleared']);
    }

    public function test_compute_settle_result_perfect_requires_all_5_correct()
    {
        $svc = new WanyaoTowerService();
        $this->assertFalse($svc->computeSettleResult(4, true)['perfect']);
        $this->assertTrue($svc->computeSettleResult(5, true)['perfect']);
    }
}
