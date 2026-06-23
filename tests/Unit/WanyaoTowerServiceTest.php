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
}
