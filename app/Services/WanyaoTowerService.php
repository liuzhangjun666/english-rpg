<?php
namespace App\Services;

use App\Models\User;
use App\Models\WanyaoTowerProgress;
use App\Models\WanyaoTowerRun;
use App\Models\VocabularyWord;
use App\Services\CurrencyService;
use App\Services\HeartDemonService;
use Illuminate\Support\Facades\DB;

class WanyaoTowerService
{
    private const QUESTION_TYPE_VOCAB = 'vocab';

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
        // 三级降级：tier+theme → 仅 tier → 任意随机词。
        // 词库 tier/theme 尚未标注（或某档词不足 $count）时逐级兜底，
        // 保证 /start 始终能出题，绝不返回空题或抛错。
        $tierTheme = VocabularyWord::query()
            ->where('tier', $tier)
            ->where('theme', $theme)
            ->inRandomOrder()
            ->limit($count)
            ->get();
        if ($tierTheme->count() >= $count) {
            return $tierTheme;
        }

        $tierOnly = VocabularyWord::query()
            ->where('tier', $tier)
            ->inRandomOrder()
            ->limit($count)
            ->get();
        if ($tierOnly->count() >= $count) {
            return $tierOnly;
        }

        return VocabularyWord::query()
            ->inRandomOrder()
            ->limit($count)
            ->get();
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

    public function gradeAnswer(array $snapshot, int $qid, string $given): bool
    {
        foreach ($snapshot['questions'] ?? [] as $q) {
            if ((int)($q['id'] ?? 0) === $qid) {
                return strcasecmp($q['answer'] ?? '', $given) === 0;
            }
        }
        throw new \DomainException("UNKNOWN_QID:{$qid}");
    }

    public function computeSettleResult(int $correctCount, bool $bossPassed): array
    {
        $passThreshold = 3;
        $cleared = $correctCount >= $passThreshold && $bossPassed;
        $perfect = $correctCount === 5 && $bossPassed;
        return [
            'cleared' => $cleared,
            'perfect' => $perfect,
            'correct_count' => $correctCount,
            'boss_passed' => $bossPassed,
        ];
    }

    public function submitAnswer(WanyaoTowerRun $run, int $qid, string $given): bool
    {
        if ($run->user_id !== auth()->id()) {
            throw new \DomainException('FORBIDDEN');
        }
        if ($run->status !== 'in_progress') {
            throw new \DomainException('RUN_NOT_ACTIVE');
        }
        $correct = $this->gradeAnswer($run->questions_json, $qid, $given);
        $snap = $run->questions_json;
        $snap['answered'] = $snap['answered'] ?? [];
        if (isset($snap['answered'][$qid])) {
            return (bool) $snap['answered'][$qid]['correct'];
        }
        $snap['answered'][$qid] = ['given' => $given, 'correct' => $correct];
        if ($correct) {
            $run->correct_count = $run->correct_count + 1;
        }
        $run->questions_json = $snap;
        $run->save();
        return $correct;
    }

    public function settle(
        WanyaoTowerRun $run,
        bool $bossPassed,
        HeartDemonService $heartDemon,
        CurrencyService $currency,
    ): array {
        if ($run->user_id !== auth()->id()) {
            throw new \DomainException('FORBIDDEN');
        }
        if ($run->status !== 'in_progress') {
            throw new \DomainException('RUN_NOT_ACTIVE');
        }
        return DB::transaction(function () use ($run, $bossPassed, $heartDemon, $currency) {
            $result = $this->computeSettleResult($run->correct_count, $bossPassed);
            $progress = WanyaoTowerProgress::lockForUpdate()->firstOrCreate(['user_id' => $run->user_id]);
            $isFirstClear = $result['cleared'] && $run->floor > $progress->highest_floor;
            $stones = 0;
            $demonsAdded = 0;

            if ($result['cleared']) {
                $stones = TowerRewardConfig::computeStones($run->floor, $isFirstClear, $result['perfect']);
                $user = User::findOrFail($run->user_id);
                $currency->addStones($user, $stones, "tower_clear_floor_{$run->floor}");
                $progress->current_floor = $run->floor + 1;
                if ($run->floor > $progress->highest_floor) {
                    $progress->highest_floor = $run->floor;
                }
                $run->status = 'cleared';
            } else {
                foreach ($run->questions_json['questions'] ?? [] as $q) {
                    $wasCorrect = $run->questions_json['answered'][$q['id']]['correct'] ?? null;
                    if ($wasCorrect !== true) {
                        $heartDemon->recordWrong($run->user_id, (string)$q['id'], self::QUESTION_TYPE_VOCAB);
                        $demonsAdded++;
                    }
                }
                $run->status = 'failed';
            }
            $run->ended_at = now();
            $run->save();
            $progress->current_run_id = null;
            $progress->save();

            return [
                'cleared' => $result['cleared'],
                'perfect' => $result['perfect'],
                'stones' => $stones,
                'demons_added' => $demonsAdded,
                'is_first_clear' => $isFirstClear,
                'breakthrough' => TowerRewardConfig::isBreakthrough($run->floor) && $result['cleared'],
                'new_floor' => $progress->current_floor,
                'highest_floor' => $progress->highest_floor,
            ];
        });
    }

    public function abandon(WanyaoTowerRun $run): void
    {
        if ($run->user_id !== auth()->id()) {
            throw new \DomainException('FORBIDDEN');
        }
        DB::transaction(function () use ($run) {
            $run->status = 'abandoned';
            $run->ended_at = now();
            $run->save();
            WanyaoTowerProgress::where('user_id', $run->user_id)->update(['current_run_id' => null]);
        });
    }
}
