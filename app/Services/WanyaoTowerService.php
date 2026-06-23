<?php
namespace App\Services;

use App\Models\User;
use App\Models\WanyaoTowerProgress;
use App\Models\WanyaoTowerRun;
use App\Models\VocabularyWord;
use Illuminate\Support\Facades\DB;

class WanyaoTowerService
{
    public function __construct(
        private readonly VocabQuestionBuilder $vocabBuilder,
    ) {}

    public function assembleRunPayload(int $floor): array
    {
        $theme = TowerRewardConfig::themeForFloor($floor);
        $tier  = TowerRewardConfig::vocabTier($floor);
        $words = $this->pickVocabWords($tier, $theme, count: 5);
        $built = $this->vocabBuilder->buildFromPool($words);
        $questions = array_map(fn($q) => $this->stripAnswer($q), $built);
        $bossPrompt = $this->pickBossPrompt($theme);
        return [
            'theme' => $theme,
            'vocab_tier' => $tier,
            'questions' => $questions,
            'boss_prompt' => $bossPrompt,
        ];
    }

    private function stripAnswer(array $q): array
    {
        unset($q['answer']);
        return $q;
    }

    protected function pickVocabWords(string $tier, string $theme, int $count): \Illuminate\Support\Collection
    {
        // Phase 1: tier 字段假设词库导入时带，theme tag 缺失时 fallback 全 tier 池
        $q = VocabularyWord::query()->where('tier', $tier);
        if ($q->where('theme', $theme)->count() >= $count) {
            return $q->where('theme', $theme)->inRandomOrder()->limit($count)->get();
        }
        return VocabularyWord::query()->where('tier', $tier)
            ->inRandomOrder()->limit($count)->get();
    }

    private function pickBossPrompt(string $theme): array
    {
        // Phase 1 stub：返回一个写作 prompt 占位
        return [
            'id' => 0,
            'theme' => $theme,
            'title' => "击败{$theme}妖王：写一篇 30 字以上的英文短文",
            'min_chars' => 30,
            'time_limit' => 60,
        ];
    }

    public function getStatus(User $user): array
    {
        $p = WanyaoTowerProgress::firstOrCreate(['user_id' => $user->id]);
        $run = $p->current_run_id ? WanyaoTowerRun::find($p->current_run_id) : null;
        return [
            'current_floor' => $p->current_floor,
            'highest_floor' => $p->highest_floor,
            'in_progress_run_id' => $run?->id,
        ];
    }

    public function startRun(User $user): WanyaoTowerRun
    {
        return DB::transaction(function () use ($user) {
            $p = WanyaoTowerProgress::lockForUpdate()->firstOrCreate(['user_id' => $user->id]);
            $existing = WanyaoTowerRun::where('user_id', $user->id)
                ->where('status', 'in_progress')->lockForUpdate()->first();
            if ($existing) {
                throw new \DomainException("RUN_IN_PROGRESS:{$existing->id}");
            }
            $payload = $this->assembleRunPayload($p->current_floor);
            $run = WanyaoTowerRun::create([
                'user_id' => $user->id,
                'floor' => $p->current_floor,
                'questions_json' => $payload, // 含答案的完整快照存 DB
                'boss_question_id' => $payload['boss_prompt']['id'] ?? 0,
                'status' => 'in_progress',
            ]);
            $p->current_run_id = $run->id;
            $p->save();
            return $run;
        });
    }
}
