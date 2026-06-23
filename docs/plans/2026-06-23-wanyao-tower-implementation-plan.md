# 万妖古塔 (Wanyao Tower) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现万妖古塔 Phase 1：世界地图第 8 座建筑，纯闯关 PvE 副本（5 道词汇 MCQ + 1 道写作 Boss / 层），线性百层进度，失败错题入心魔池。

**Architecture:** Laravel Service 层模式（`WanyaoTowerService` + `WanyaoTowerController`），复用现有 `VocabQuestionBuilder` / `WritingService` / `HeartDemonService` / `CurrencyService`。前端 Vue 3 新建 1 个 View + 6 个组件 + 1 个 Pinia store，状态机驱动；零新增第三方依赖。

**Tech Stack:** PHP 8.x / Laravel · PHPUnit · MySQL · Vue 3 + TypeScript + Pinia + Element Plus · Vite

**Spec:** [docs/plans/2026-06-23-wanyao-tower-design.md](./2026-06-23-wanyao-tower-design.md) (commit f3b8e66)

**Test strategy disclaimer:** 项目实际只有 PHPUnit Unit 测试（`tests/Unit/`），无 Feature/E2E 框架，前端无 Vitest。本计划测试仅覆盖 Service 层纯逻辑（与现有 `ExamServiceTest` 一致），HTTP 层与前端通过 `npm run smoke:frontend` + 手动验证。

---

## File Structure

**新建（Backend）**
- `database/migrations/2026_06_23_000001_create_wanyao_tower_progress_table.php`
- `database/migrations/2026_06_23_000002_create_wanyao_tower_runs_table.php`
- `app/Models/WanyaoTowerProgress.php`
- `app/Models/WanyaoTowerRun.php`
- `app/Services/WanyaoTowerService.php`
- `app/Services/TowerRewardConfig.php`
- `app/Http/Controllers/Api/WanyaoTowerController.php`
- `tests/Unit/WanyaoTowerServiceTest.php`
- `tests/Unit/TowerRewardConfigTest.php`

**新建（Frontend）**
- `resources/js/vue/views/WanyaoTowerView.vue`
- `resources/js/vue/components/wanyaoTower/TowerLobby.vue`
- `resources/js/vue/components/wanyaoTower/TowerMCQQuestion.vue`
- `resources/js/vue/components/wanyaoTower/TowerQuestionRunner.vue`
- `resources/js/vue/components/wanyaoTower/TowerBossPanel.vue`
- `resources/js/vue/components/wanyaoTower/TowerSettleModal.vue`
- `resources/js/vue/components/wanyaoTower/TowerRewardCard.vue`
- `resources/js/vue/stores/towerStore.ts`
- `resources/js/vue/types/wanyaoTower.ts`

**修改（Backend）**
- `routes/api.php`：追加 `Route::prefix('wanyao-tower')` 组（5 个端点）

**修改（Frontend）**
- `resources/js/vue/data/SECT_NODES.ts`（或对应常量文件）：追加 `wanyaoTower` 项，调整 7 座坐标为 8 点布局
- `resources/js/vue/core/WorldSceneManager.ts`：若布局参数硬编码，同步 8 节点环形参数
- `resources/js/vue/router/index.ts`：追加 `/wanyao-tower` 路由
- `resources/js/vue/composables/useLegacyBridge.ts`：追加 `switchToWanyaoTowerScene()` 方法
- `resources/js/vue/components/map/WorldMapOverlay.vue`：节点点击处理添加 `wanyaoTower` 分支

---

## Task 1: 创建 progress 表 migration + Model

**Files:**
- Create: `database/migrations/2026_06_23_000001_create_wanyao_tower_progress_table.php`
- Create: `app/Models/WanyaoTowerProgress.php`

- [ ] **Step 1: 写 migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('wanyao_tower_progress', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->primary();
            $table->unsignedInteger('current_floor')->default(1);
            $table->unsignedInteger('highest_floor')->default(0);
            $table->unsignedBigInteger('current_run_id')->nullable();
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }
    public function down(): void { Schema::dropIfExists('wanyao_tower_progress'); }
};
```

- [ ] **Step 2: 写 Model**

```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class WanyaoTowerProgress extends Model
{
    protected $table = 'wanyao_tower_progress';
    protected $primaryKey = 'user_id';
    public $incrementing = false;
    protected $fillable = ['user_id','current_floor','highest_floor','current_run_id'];
    public function user() { return $this->belongsTo(User::class); }
    public function currentRun() { return $this->belongsTo(WanyaoTowerRun::class, 'current_run_id'); }
}
```

- [ ] **Step 3: 跑 migration**

Run: `php artisan migrate`
Expected: `Migrated: 2026_06_23_000001_create_wanyao_tower_progress_table`

- [ ] **Step 4: 提交**

```bash
git add database/migrations/2026_06_23_000001_create_wanyao_tower_progress_table.php app/Models/WanyaoTowerProgress.php
git commit -m "feat(tower): wanyao_tower_progress table + model"
```

---

## Task 2: 创建 runs 表 migration + Model（含唯一约束）

**Files:**
- Create: `database/migrations/2026_06_23_000002_create_wanyao_tower_runs_table.php`
- Create: `app/Models/WanyaoTowerRun.php`

- [ ] **Step 1: 写 migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('wanyao_tower_runs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedInteger('floor');
            $table->json('questions_json');
            $table->unsignedBigInteger('boss_question_id');
            $table->enum('status', ['in_progress','cleared','failed','abandoned'])->default('in_progress');
            $table->unsignedInteger('correct_count')->default(0);
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['user_id','status']);
            // 部分唯一索引：一人同时只能有 1 个 in_progress
            $table->unique(['user_id','status'], 'uq_user_in_progress'); // see Step 2 注
        });
    }
    public function down(): void { Schema::dropIfExists('wanyao_tower_runs'); }
};
```

- [ ] **Step 2: 调整为只对 in_progress 强制唯一**

MySQL 不支持 partial unique。改用 trigger 或应用层 + 普通索引。本计划走**应用层**强制：在 `WanyaoTowerService::startRun()` 里事务内先 `SELECT ... WHERE status='in_progress' FOR UPDATE` 后插入。

→ 把 Step 1 里的 `$table->unique(['user_id','status'], 'uq_user_in_progress');` **删掉**，只保留 `$table->index(['user_id','status'])`。

- [ ] **Step 3: 写 Model**

```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class WanyaoTowerRun extends Model
{
    protected $table = 'wanyao_tower_runs';
    protected $fillable = [
        'user_id','floor','questions_json','boss_question_id',
        'status','correct_count','started_at','ended_at',
    ];
    protected $casts = [
        'questions_json' => 'array',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];
    public function user() { return $this->belongsTo(User::class); }
}
```

- [ ] **Step 4: 跑 migration**

Run: `php artisan migrate`
Expected: `Migrated: 2026_06_23_000002_create_wanyao_tower_runs_table`

- [ ] **Step 5: 提交**

```bash
git add database/migrations/2026_06_23_000002_create_wanyao_tower_runs_table.php app/Models/WanyaoTowerRun.php
git commit -m "feat(tower): wanyao_tower_runs table + model"
```

---

## Task 3: TowerRewardConfig 值对象 + 单元测试

**Files:**
- Create: `app/Services/TowerRewardConfig.php`
- Test: `tests/Unit/TowerRewardConfigTest.php`

- [ ] **Step 1: 写失败测试**

```php
<?php
namespace Tests\Unit;
use App\Services\TowerRewardConfig;
use Tests\TestCase;

class TowerRewardConfigTest extends TestCase
{
    public function test_first_clear_floor_1_gives_10_stones()
    {
        $r = TowerRewardConfig::computeStones(floor: 1, isFirstClear: true, perfect: false);
        $this->assertSame(10, $r);
    }
    public function test_first_clear_floor_30_gives_300_stones()
    {
        $this->assertSame(300, TowerRewardConfig::computeStones(30, true, false));
    }
    public function test_repeat_clear_floor_30_gives_90_stones()
    {
        $this->assertSame(90, TowerRewardConfig::computeStones(30, false, false));
    }
    public function test_perfect_first_clear_floor_30_adds_bonus()
    {
        // 300 base + floor*5 perfect bonus = 300 + 150 = 450
        $this->assertSame(450, TowerRewardConfig::computeStones(30, true, true));
    }
    public function test_breakthrough_floors_include_10_and_100()
    {
        $this->assertTrue(TowerRewardConfig::isBreakthrough(10));
        $this->assertTrue(TowerRewardConfig::isBreakthrough(100));
        $this->assertFalse(TowerRewardConfig::isBreakthrough(11));
    }
    public function test_theme_for_floor()
    {
        $this->assertSame('fire', TowerRewardConfig::themeForFloor(1));
        $this->assertSame('fire', TowerRewardConfig::themeForFloor(10));
        $this->assertSame('ice',  TowerRewardConfig::themeForFloor(11));
        $this->assertSame('chaos', TowerRewardConfig::themeForFloor(100));
    }
    public function test_vocab_tier_for_floor()
    {
        $this->assertSame('cet4_hf', TowerRewardConfig::vocabTier(1));
        $this->assertSame('cet4',    TowerRewardConfig::vocabTier(30));
        $this->assertSame('cet6',    TowerRewardConfig::vocabTier(50));
        $this->assertSame('kaoyan',  TowerRewardConfig::vocabTier(70));
        $this->assertSame('ielts',   TowerRewardConfig::vocabTier(95));
    }
}
```

- [ ] **Step 2: 跑测试确认失败**

Run: `vendor/bin/phpunit --filter TowerRewardConfigTest`
Expected: 7 个测试全部 FAIL（类不存在）

- [ ] **Step 3: 写实现**

```php
<?php
namespace App\Services;

class TowerRewardConfig
{
    public const STONE_BASE_PER_FLOOR = 10;
    public const STONE_REPEAT_MULTIPLIER = 0.3;
    public const PERFECT_BONUS_MULTIPLIER = 0.5;
    public const FRAGMENTS_PER_TECHNIQUE = 5;
    public const BREAKTHROUGH_FLOORS = [10,20,30,40,50,60,70,80,90,100];
    public const THEMES = ['fire','ice','thunder','poison','beast','shadow','mist','wind','storm','chaos'];
    public const TIERS = [
        20 => 'cet4_hf',
        40 => 'cet4',
        60 => 'cet6',
        80 => 'kaoyan',
        100 => 'ielts',
    ];

    public static function computeStones(int $floor, bool $isFirstClear, bool $perfect): int
    {
        $base = (int) ($isFirstClear
            ? $floor * self::STONE_BASE_PER_FLOOR
            : $floor * self::STONE_BASE_PER_FLOOR * self::STONE_REPEAT_MULTIPLIER);
        $bonus = $perfect ? (int) ($floor * self::STONE_BASE_PER_FLOOR * self::PERFECT_BONUS_MULTIPLIER) : 0;
        return $base + $bonus;
    }

    public static function isBreakthrough(int $floor): bool
    {
        return in_array($floor, self::BREAKTHROUGH_FLOORS, true);
    }

    public static function themeForFloor(int $floor): string
    {
        $idx = (int) ceil($floor / 10) - 1;
        return self::THEMES[max(0, min(9, $idx))];
    }

    public static function vocabTier(int $floor): string
    {
        foreach (self::TIERS as $cap => $tier) {
            if ($floor <= $cap) return $tier;
        }
        return 'ielts';
    }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `vendor/bin/phpunit --filter TowerRewardConfigTest`
Expected: `OK (7 tests, 14+ assertions)`

- [ ] **Step 5: 提交**

```bash
git add app/Services/TowerRewardConfig.php tests/Unit/TowerRewardConfigTest.php
git commit -m "feat(tower): reward config + tier/theme calculator with tests"
```

---

## Task 4: WanyaoTowerService — getStatus + startRun

**Files:**
- Create: `app/Services/WanyaoTowerService.php`
- Test: `tests/Unit/WanyaoTowerServiceTest.php`

> 注：项目无 Feature Test 框架，且 `tests/Unit` 现有测试**不打 DB**（看 `ExamServiceTest`，全是纯函数）。本任务测试也保持纯函数策略——把抽题和 DB 写入封装成可注入的依赖，测试只覆盖**业务规则**（已有 run 时拒绝、参数装配），不实际 hit DB。

- [ ] **Step 1: 写失败测试（注入 Builder mock）**

```php
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
        $svc = new WanyaoTowerService($vocabBuilder);

        $payload = $svc->assembleRunPayload(floor: 5);

        $this->assertCount(5, $payload['questions']);
        $this->assertArrayHasKey('boss_prompt', $payload);
        $this->assertArrayNotHasKey('answer', $payload['questions'][0],
            '答案不应下发给前端');
        $this->assertSame('fire', $payload['theme']);
        $this->assertSame('cet4_hf', $payload['vocab_tier']);
    }
}
```

- [ ] **Step 2: 跑测试确认失败**

Run: `vendor/bin/phpunit --filter WanyaoTowerServiceTest`
Expected: FAIL（类不存在）

- [ ] **Step 3: 写 Service 骨架 + assembleRunPayload**

```php
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

    private function pickVocabWords(string $tier, string $theme, int $count): \Illuminate\Support\Collection
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
```

> 注：`questions_json` 入库时存**完整快照含答案**；`assembleRunPayload` 出参已 strip 答案——`startRun` 控制器需用 `getResponsePayload(run)` 而非直接返回 `questions_json`。下一 Task 加该方法。

- [ ] **Step 4: 跑测试确认通过**

Run: `vendor/bin/phpunit --filter WanyaoTowerServiceTest`
Expected: `OK (1 test)`

- [ ] **Step 5: 提交**

```bash
git add app/Services/WanyaoTowerService.php tests/Unit/WanyaoTowerServiceTest.php
git commit -m "feat(tower): service skeleton + assembleRunPayload + startRun"
```

---

## Task 5: WanyaoTowerService — submitAnswer + settle + abandon

**Files:**
- Modify: `app/Services/WanyaoTowerService.php`
- Modify: `tests/Unit/WanyaoTowerServiceTest.php`

- [ ] **Step 1: 添加失败测试**

```php
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
    // 5 道题答对至少 3 道 + Boss 通过 = 通关；但答对 4 道不算 perfect
    $r = $svc->computeSettleResult(correctCount: 4, bossPassed: true);
    $this->assertTrue($r['cleared']);
    $this->assertFalse($r['perfect']); // perfect 要 5 道全对，单独由下方测试覆盖
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
```

修订 `test_compute_settle_result_pass_threshold` 中的 perfect 判定：

```php
public function test_compute_settle_result_perfect_requires_all_5_correct()
{
    $svc = new WanyaoTowerService($this->createMock(\App\Services\VocabQuestionBuilder::class));
    $this->assertFalse($svc->computeSettleResult(4, true)['perfect']);
    $this->assertTrue($svc->computeSettleResult(5, true)['perfect']);
}
```

- [ ] **Step 2: 跑测试确认失败**

Run: `vendor/bin/phpunit --filter WanyaoTowerServiceTest`
Expected: 新增测试 FAIL（方法不存在）

- [ ] **Step 3: 加方法到 Service**

```php
public function gradeAnswer(array $snapshot, int $qid, string $given): bool
{
    foreach ($snapshot['questions'] as $q) {
        if ((int)($q['id'] ?? 0) === $qid) {
            return strcasecmp($q['answer'] ?? '', $given) === 0;
        }
    }
    throw new \DomainException("UNKNOWN_QID:{$qid}");
}

public function computeSettleResult(int $correctCount, bool $bossPassed): array
{
    $passThreshold = 3; // 5 道题至少答对 3 道
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
    // 幂等：用 answered map 存进 questions_json 的副本字段
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
            $currency->addStones($run->user_id, $stones, "tower_clear_floor_{$run->floor}");
            $progress->current_floor = $run->floor + 1;
            if ($run->floor > $progress->highest_floor) {
                $progress->highest_floor = $run->floor;
            }
            $run->status = 'cleared';
        } else {
            // 失败：未答对的 qid 入心魔池
            foreach ($run->questions_json['questions'] ?? [] as $q) {
                $given = $run->questions_json['answered'][$q['id']]['correct'] ?? null;
                if ($given !== true) {
                    $heartDemon->recordWrong($run->user_id, (int)$q['id']);
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
```

> **依赖确认**：`CurrencyService::addStones($userId, $amount, $reason)` 与 `HeartDemonService::recordWrong($userId, $questionId)` 的实际签名以源文件为准（见 `app/Services/CurrencyService.php`、`app/Services/HeartDemonService.php`），如不一致以本任务执行时实际签名为准，调整调用方式后再提交。

- [ ] **Step 4: 跑测试确认通过**

Run: `vendor/bin/phpunit --filter WanyaoTowerServiceTest`
Expected: 全部通过

- [ ] **Step 5: 提交**

```bash
git add app/Services/WanyaoTowerService.php tests/Unit/WanyaoTowerServiceTest.php
git commit -m "feat(tower): submitAnswer + settle + abandon with grading logic"
```

---

## Task 6: WanyaoTowerController + 路由

**Files:**
- Create: `app/Http/Controllers/Api/WanyaoTowerController.php`
- Modify: `routes/api.php`

- [ ] **Step 1: 写 Controller**

```php
<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WanyaoTowerRun;
use App\Services\CurrencyService;
use App\Services\HeartDemonService;
use App\Services\WanyaoTowerService;
use App\Services\WritingService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class WanyaoTowerController extends Controller
{
    public function __construct(
        private readonly WanyaoTowerService $tower,
        private readonly HeartDemonService $heartDemon,
        private readonly CurrencyService $currency,
        private readonly WritingService $writing,
    ) {}

    public function status(Request $r): JsonResponse
    {
        return response()->json($this->tower->getStatus($r->user()));
    }

    public function start(Request $r): JsonResponse
    {
        try {
            $run = $this->tower->startRun($r->user());
        } catch (\DomainException $e) {
            if (str_starts_with($e->getMessage(), 'RUN_IN_PROGRESS:')) {
                [, $id] = explode(':', $e->getMessage());
                return response()->json(['error' => 'run_in_progress', 'run_id' => (int)$id], 409);
            }
            throw $e;
        }
        return response()->json($this->responsePayload($run));
    }

    public function answer(Request $r): JsonResponse
    {
        $data = $r->validate([
            'run_id' => 'required|integer',
            'qid' => 'required|integer',
            'answer' => 'required|string|max:2000',
        ]);
        $run = WanyaoTowerRun::findOrFail($data['run_id']);
        try {
            $correct = $this->tower->submitAnswer($run, $data['qid'], $data['answer']);
        } catch (\DomainException $e) {
            return response()->json(['error' => strtolower($e->getMessage())], 422);
        }
        return response()->json(['correct' => $correct]);
    }

    public function settle(Request $r): JsonResponse
    {
        $data = $r->validate([
            'run_id' => 'required|integer',
            'boss_text' => 'nullable|string|max:2000',
        ]);
        $run = WanyaoTowerRun::findOrFail($data['run_id']);
        // Boss 评分（写作）：缺失或评分挂时降级 passed=true，避免阻塞玩家
        $bossPassed = true;
        if (!empty($data['boss_text'])) {
            try {
                $score = $this->writing->scoreFreeText($data['boss_text']);
                $bossPassed = ($score['score'] ?? 0) >= 60;
            } catch (\Throwable $e) {
                logger()->warning('tower.boss_scoring_failed', ['err' => $e->getMessage()]);
                $bossPassed = true; // 降级
            }
        }
        try {
            $result = $this->tower->settle($run, $bossPassed, $this->heartDemon, $this->currency);
        } catch (\DomainException $e) {
            return response()->json(['error' => strtolower($e->getMessage())], 422);
        }
        return response()->json($result);
    }

    public function abandon(Request $r): JsonResponse
    {
        $data = $r->validate(['run_id' => 'required|integer']);
        $run = WanyaoTowerRun::findOrFail($data['run_id']);
        try {
            $this->tower->abandon($run);
        } catch (\DomainException $e) {
            return response()->json(['error' => strtolower($e->getMessage())], 422);
        }
        return response()->json(['ok' => true]);
    }

    private function responsePayload(WanyaoTowerRun $run): array
    {
        $snap = $run->questions_json;
        $clientQuestions = array_map(function ($q) {
            unset($q['answer']);
            return $q;
        }, $snap['questions'] ?? []);
        return [
            'run_id' => $run->id,
            'floor' => $run->floor,
            'theme' => $snap['theme'],
            'vocab_tier' => $snap['vocab_tier'],
            'questions' => $clientQuestions,
            'boss_prompt' => $snap['boss_prompt'],
        ];
    }
}
```

> **WritingService 签名核对**：实际方法名以源文件为准。若是 `submitWriting($user, $promptId, $content)`，把上面 `$this->writing->scoreFreeText(...)` 改为对应签名；如无简单评分入口，Phase 1 可降级为「Boss 题只校验字数 ≥30 即通过」，删掉 try 块，写 `$bossPassed = strlen($data['boss_text']) >= 30;`。

- [ ] **Step 2: 在 routes/api.php 追加路由**

找到 `Route::prefix('demons')->group(...)` 之后插入：

```php
    Route::prefix('wanyao-tower')->group(function () {
        Route::get('/status',    [WanyaoTowerController::class, 'status']);
        Route::post('/start',    [WanyaoTowerController::class, 'start']);
        Route::post('/answer',   [WanyaoTowerController::class, 'answer']);
        Route::post('/settle',   [WanyaoTowerController::class, 'settle']);
        Route::post('/abandon',  [WanyaoTowerController::class, 'abandon']);
    });
```

文件顶部 `use App\Http\Controllers\Api\WanyaoTowerController;` 也加上。

- [ ] **Step 3: 手测 status 端点**

Run: `php artisan route:list --path=wanyao-tower`
Expected: 5 行输出，路径正确。

Run (登录用户的 token 替换 $TOKEN)：
```bash
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8000/api/wanyao-tower/status
```
Expected: `{"current_floor":1,"highest_floor":0,"in_progress_run_id":null}`

- [ ] **Step 4: 提交**

```bash
git add app/Http/Controllers/Api/WanyaoTowerController.php routes/api.php
git commit -m "feat(tower): HTTP controller + routes"
```

---

## Task 7: 前端 — 类型定义 + Pinia store

**Files:**
- Create: `resources/js/vue/types/wanyaoTower.ts`
- Create: `resources/js/vue/stores/towerStore.ts`

- [ ] **Step 1: 写 types**

```ts
export type TowerStatus =
  | 'idle' | 'starting' | 'answering' | 'boss' | 'settling' | 'reward' | 'failed';

export interface TowerQuestion {
  id: number;
  type: 'vocab';
  prompt: string;
  options: string[];
}

export interface BossPrompt {
  id: number;
  theme: string;
  title: string;
  min_chars: number;
  time_limit: number;
}

export interface TowerRunPayload {
  run_id: number;
  floor: number;
  theme: string;
  vocab_tier: string;
  questions: TowerQuestion[];
  boss_prompt: BossPrompt;
}

export interface TowerStatusPayload {
  current_floor: number;
  highest_floor: number;
  in_progress_run_id: number | null;
}

export interface SettleResult {
  cleared: boolean;
  perfect: boolean;
  stones: number;
  demons_added: number;
  is_first_clear: boolean;
  breakthrough: boolean;
  new_floor: number;
  highest_floor: number;
}
```

- [ ] **Step 2: 写 store**

```ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import type { TowerStatus, TowerRunPayload, TowerStatusPayload, SettleResult } from '../types/wanyaoTower';

export const useTowerStore = defineStore('tower', () => {
  const status = ref<TowerStatus>('idle');
  const currentFloor = ref(1);
  const highestFloor = ref(0);
  const inProgressRunId = ref<number | null>(null);
  const currentRun = ref<TowerRunPayload | null>(null);
  const answerIndex = ref(0); // 当前答到第几题
  const correctMap = ref<Record<number, boolean>>({});
  const lastSettle = ref<SettleResult | null>(null);

  async function fetchStatus() {
    const { data } = await axios.get<TowerStatusPayload>('/api/wanyao-tower/status');
    currentFloor.value = data.current_floor;
    highestFloor.value = data.highest_floor;
    inProgressRunId.value = data.in_progress_run_id;
  }

  async function startRun(): Promise<void> {
    status.value = 'starting';
    try {
      const { data } = await axios.post<TowerRunPayload>('/api/wanyao-tower/start');
      currentRun.value = data;
      answerIndex.value = 0;
      correctMap.value = {};
      status.value = 'answering';
    } catch (e: any) {
      status.value = 'idle';
      throw e;
    }
  }

  async function submitAnswer(qid: number, answer: string): Promise<boolean> {
    const { data } = await axios.post<{ correct: boolean }>('/api/wanyao-tower/answer', {
      run_id: currentRun.value!.run_id, qid, answer,
    });
    correctMap.value[qid] = data.correct;
    return data.correct;
  }

  function advanceAfterAnswer() {
    answerIndex.value++;
    if (currentRun.value && answerIndex.value >= currentRun.value.questions.length) {
      status.value = 'boss';
    }
  }

  async function settle(bossText: string | null): Promise<void> {
    status.value = 'settling';
    const { data } = await axios.post<SettleResult>('/api/wanyao-tower/settle', {
      run_id: currentRun.value!.run_id,
      boss_text: bossText,
    });
    lastSettle.value = data;
    status.value = data.cleared ? 'reward' : 'failed';
    if (data.cleared) {
      currentFloor.value = data.new_floor;
      highestFloor.value = data.highest_floor;
    }
    currentRun.value = null;
  }

  async function abandon(): Promise<void> {
    if (!currentRun.value) return;
    await axios.post('/api/wanyao-tower/abandon', { run_id: currentRun.value.run_id });
    currentRun.value = null;
    status.value = 'idle';
    inProgressRunId.value = null;
  }

  function resetToIdle() {
    status.value = 'idle';
    lastSettle.value = null;
  }

  return {
    status, currentFloor, highestFloor, inProgressRunId, currentRun,
    answerIndex, correctMap, lastSettle,
    fetchStatus, startRun, submitAnswer, advanceAfterAnswer, settle, abandon, resetToIdle,
  };
});
```

- [ ] **Step 3: 类型检查**

Run: `npx vue-tsc --noEmit`
Expected: 无新报错（如果项目已有红线，确认本次提交未引入新红线）

- [ ] **Step 4: 提交**

```bash
git add resources/js/vue/types/wanyaoTower.ts resources/js/vue/stores/towerStore.ts
git commit -m "feat(tower): types + pinia store"
```

---

## Task 8: 前端 — TowerMCQQuestion 组件

**Files:**
- Create: `resources/js/vue/components/wanyaoTower/TowerMCQQuestion.vue`

- [ ] **Step 1: 写组件**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import type { TowerQuestion } from '@/types/wanyaoTower';

const props = defineProps<{ question: TowerQuestion; index: number; total: number; disabled?: boolean }>();
const emit = defineEmits<{ submit: [answer: string] }>();
const selected = ref<string | null>(null);

function pick(opt: string) {
  if (props.disabled || selected.value) return;
  selected.value = opt;
  emit('submit', opt);
}
</script>

<template>
  <div class="tower-mcq">
    <div class="tower-mcq__progress">第 {{ index + 1 }} / {{ total }} 题</div>
    <div class="tower-mcq__prompt">{{ question.prompt }}</div>
    <div class="tower-mcq__options">
      <button
        v-for="opt in question.options"
        :key="opt"
        class="tower-mcq__option"
        :class="{ 'is-selected': selected === opt }"
        :disabled="!!selected || disabled"
        @click="pick(opt)"
      >
        {{ opt }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.tower-mcq { padding: 20px; color: #f4e7c1; }
.tower-mcq__progress { font-size: 12px; opacity: 0.7; margin-bottom: 8px; }
.tower-mcq__prompt { font-size: 22px; margin-bottom: 24px; }
.tower-mcq__options { display: grid; gap: 12px; }
.tower-mcq__option {
  padding: 12px 16px; background: rgba(196, 30, 58, 0.18); border: 1px solid #c41e3a;
  color: #f4e7c1; border-radius: 6px; cursor: pointer; transition: all 0.15s;
}
.tower-mcq__option:hover:not(:disabled) { background: rgba(196, 30, 58, 0.35); }
.tower-mcq__option.is-selected { background: #c41e3a; color: #fff; }
.tower-mcq__option:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
```

- [ ] **Step 2: 提交**

```bash
git add resources/js/vue/components/wanyaoTower/TowerMCQQuestion.vue
git commit -m "feat(tower): MCQQuestion component"
```

---

## Task 9: 前端 — TowerQuestionRunner

**Files:**
- Create: `resources/js/vue/components/wanyaoTower/TowerQuestionRunner.vue`

- [ ] **Step 1: 写组件**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTowerStore } from '@/stores/towerStore';
import TowerMCQQuestion from './TowerMCQQuestion.vue';

const store = useTowerStore();
const feedback = ref<'correct' | 'wrong' | null>(null);
const submitting = ref(false);

const currentQ = computed(() => store.currentRun?.questions[store.answerIndex] ?? null);
const total = computed(() => store.currentRun?.questions.length ?? 0);

async function onSubmit(answer: string) {
  if (!currentQ.value || submitting.value) return;
  submitting.value = true;
  try {
    const correct = await store.submitAnswer(currentQ.value.id, answer);
    feedback.value = correct ? 'correct' : 'wrong';
    await new Promise(r => setTimeout(r, 1200));
    feedback.value = null;
    store.advanceAfterAnswer();
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="tower-runner">
    <TowerMCQQuestion
      v-if="currentQ"
      :question="currentQ"
      :index="store.answerIndex"
      :total="total"
      :disabled="submitting"
      @submit="onSubmit"
    />
    <transition name="fade">
      <div v-if="feedback" class="tower-runner__feedback" :class="`is-${feedback}`">
        {{ feedback === 'correct' ? '✓ 答对了' : '✗ 答错' }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.tower-runner { position: relative; }
.tower-runner__feedback {
  position: absolute; inset: 0; display: grid; place-items: center;
  font-size: 48px; font-weight: bold; pointer-events: none;
}
.is-correct { color: #6dd17c; text-shadow: 0 0 16px #6dd17c; }
.is-wrong   { color: #d34c4c; text-shadow: 0 0 16px #d34c4c; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
```

- [ ] **Step 2: 提交**

```bash
git add resources/js/vue/components/wanyaoTower/TowerQuestionRunner.vue
git commit -m "feat(tower): question runner with feedback overlay"
```

---

## Task 10: 前端 — TowerBossPanel（含倒计时）

**Files:**
- Create: `resources/js/vue/components/wanyaoTower/TowerBossPanel.vue`

- [ ] **Step 1: 写组件**

```vue
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useTowerStore } from '@/stores/towerStore';

const store = useTowerStore();
const boss = computed(() => store.currentRun?.boss_prompt);
const text = ref('');
const remaining = ref(boss.value?.time_limit ?? 60);
const submitted = ref(false);
let timer: ReturnType<typeof setInterval> | null = null;

const minChars = computed(() => boss.value?.min_chars ?? 30);
const canSubmit = computed(() => text.value.trim().length >= minChars.value);
const bloodPercent = computed(() => Math.max(0, (remaining.value / (boss.value?.time_limit ?? 60)) * 100));

onMounted(() => {
  timer = setInterval(() => {
    remaining.value -= 1;
    if (remaining.value <= 0) {
      remaining.value = 0;
      if (!submitted.value) submit(true);
    }
  }, 1000);
});
onUnmounted(() => { if (timer) clearInterval(timer); });

async function submit(timeout = false) {
  if (submitted.value) return;
  submitted.value = true;
  if (timer) clearInterval(timer);
  // 提交：字数不够 / 超时 → boss_text 留空，后端降级
  const bossText = !timeout && canSubmit.value ? text.value.trim() : null;
  await store.settle(bossText);
}
</script>

<template>
  <div v-if="boss" class="tower-boss">
    <div class="tower-boss__title">{{ boss.title }}</div>
    <div class="tower-boss__blood">
      <div class="tower-boss__blood-fill" :style="{ width: bloodPercent + '%' }"></div>
      <div class="tower-boss__blood-text">{{ remaining }}s</div>
    </div>
    <textarea
      v-model="text"
      class="tower-boss__input"
      :placeholder="`写至少 ${minChars} 字`"
      :disabled="submitted"
      rows="6"
    />
    <div class="tower-boss__footer">
      <span class="tower-boss__count">{{ text.length }} / {{ minChars }}+</span>
      <button class="tower-boss__btn" :disabled="!canSubmit || submitted" @click="submit(false)">
        提交破关
      </button>
    </div>
  </div>
</template>

<style scoped>
.tower-boss { padding: 24px; color: #f4e7c1; }
.tower-boss__title { font-size: 20px; margin-bottom: 12px; }
.tower-boss__blood {
  position: relative; height: 28px; background: rgba(60,0,0,0.5);
  border: 1px solid #c41e3a; border-radius: 4px; overflow: hidden; margin-bottom: 16px;
}
.tower-boss__blood-fill {
  position: absolute; inset: 0 auto 0 0; background: linear-gradient(90deg, #c41e3a, #ff6b6b);
  transition: width 1s linear;
}
.tower-boss__blood-text {
  position: absolute; inset: 0; display: grid; place-items: center;
  font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);
}
.tower-boss__input {
  width: 100%; padding: 12px; background: rgba(0,0,0,0.3);
  border: 1px solid #4a4a6a; color: #f4e7c1; border-radius: 4px; font-size: 15px;
}
.tower-boss__footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
.tower-boss__btn {
  padding: 10px 24px; background: #c41e3a; color: #fff; border: none; border-radius: 4px;
  cursor: pointer; font-size: 16px;
}
.tower-boss__btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
```

- [ ] **Step 2: 提交**

```bash
git add resources/js/vue/components/wanyaoTower/TowerBossPanel.vue
git commit -m "feat(tower): boss panel with countdown blood bar"
```

---

## Task 11: 前端 — Lobby / RewardCard / SettleModal

**Files:**
- Create: `resources/js/vue/components/wanyaoTower/TowerLobby.vue`
- Create: `resources/js/vue/components/wanyaoTower/TowerRewardCard.vue`
- Create: `resources/js/vue/components/wanyaoTower/TowerSettleModal.vue`

- [ ] **Step 1: TowerLobby.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useTowerStore } from '@/stores/towerStore';

const store = useTowerStore();
const emit = defineEmits<{ start: []; resume: []; back: [] }>();
const hasInProgress = computed(() => !!store.inProgressRunId);
</script>

<template>
  <div class="tower-lobby">
    <button class="tower-lobby__back" @click="emit('back')">← 返回大厅</button>
    <div class="tower-lobby__title">万妖古塔</div>
    <div class="tower-lobby__stats">
      <div>当前层：<b>{{ store.currentFloor }}</b></div>
      <div>历史最高：<b>{{ store.highestFloor }}</b></div>
    </div>
    <button v-if="hasInProgress" class="tower-lobby__cta" @click="emit('resume')">继续上次闯关</button>
    <button v-else class="tower-lobby__cta" @click="emit('start')">登塔挑战</button>
  </div>
</template>

<style scoped>
.tower-lobby { padding: 40px; text-align: center; color: #f4e7c1; }
.tower-lobby__back { background: none; border: none; color: #f4e7c1; cursor: pointer; }
.tower-lobby__title { font-size: 36px; margin: 24px 0; letter-spacing: 8px; }
.tower-lobby__stats { display: flex; gap: 40px; justify-content: center; margin-bottom: 32px; font-size: 18px; }
.tower-lobby__cta {
  padding: 16px 48px; font-size: 20px; background: #c41e3a; color: #fff;
  border: none; border-radius: 6px; cursor: pointer;
}
</style>
```

- [ ] **Step 2: TowerRewardCard.vue**

```vue
<script setup lang="ts">
defineProps<{ icon: string; label: string; value: string | number }>();
</script>
<template>
  <div class="tower-reward-card">
    <div class="tower-reward-card__icon">{{ icon }}</div>
    <div class="tower-reward-card__label">{{ label }}</div>
    <div class="tower-reward-card__value">{{ value }}</div>
  </div>
</template>
<style scoped>
.tower-reward-card {
  padding: 16px; background: rgba(196,30,58,0.15); border: 1px solid #c41e3a;
  border-radius: 6px; text-align: center; min-width: 120px;
}
.tower-reward-card__icon { font-size: 28px; }
.tower-reward-card__label { font-size: 12px; opacity: 0.7; margin-top: 4px; }
.tower-reward-card__value { font-size: 18px; font-weight: bold; margin-top: 6px; color: #ffe28a; }
</style>
```

- [ ] **Step 3: TowerSettleModal.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useTowerStore } from '@/stores/towerStore';
import TowerRewardCard from './TowerRewardCard.vue';

const store = useTowerStore();
const emit = defineEmits<{ continue: []; back: [] }>();
const result = computed(() => store.lastSettle);
const isCleared = computed(() => result.value?.cleared);
</script>

<template>
  <div v-if="result" class="tower-settle-overlay">
    <div class="tower-settle">
      <div class="tower-settle__title">
        {{ isCleared ? (result.breakthrough ? '🎉 境界突破！' : '通关！') : '挑战失败' }}
      </div>
      <div v-if="isCleared" class="tower-settle__rewards">
        <TowerRewardCard icon="💎" label="灵石" :value="`+${result.stones}`" />
        <TowerRewardCard v-if="result.breakthrough" icon="📜" label="心法碎片" value="+1" />
        <TowerRewardCard v-if="result.is_first_clear" icon="⭐" label="首通" :value="`第 ${result.new_floor - 1} 层`" />
      </div>
      <div v-else class="tower-settle__fail">
        <div>本层错题已入心魔池</div>
        <TowerRewardCard icon="👹" label="新生心魔" :value="result.demons_added" />
      </div>
      <div class="tower-settle__actions">
        <button v-if="isCleared" class="tower-settle__btn" @click="emit('continue')">挑战下一层</button>
        <button v-else class="tower-settle__btn" @click="emit('continue')">重试本层</button>
        <button class="tower-settle__btn tower-settle__btn--ghost" @click="emit('back')">返回</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tower-settle-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  display: grid; place-items: center; z-index: 1000;
}
.tower-settle {
  background: #1a0a14; border: 2px solid #c41e3a; border-radius: 12px;
  padding: 32px; color: #f4e7c1; min-width: 480px;
}
.tower-settle__title { font-size: 28px; text-align: center; margin-bottom: 24px; }
.tower-settle__rewards, .tower-settle__fail {
  display: flex; gap: 16px; justify-content: center; margin: 24px 0;
}
.tower-settle__fail { flex-direction: column; align-items: center; }
.tower-settle__actions { display: flex; gap: 12px; justify-content: center; margin-top: 24px; }
.tower-settle__btn {
  padding: 10px 24px; background: #c41e3a; color: #fff; border: none;
  border-radius: 4px; cursor: pointer; font-size: 15px;
}
.tower-settle__btn--ghost { background: transparent; border: 1px solid #c41e3a; }
</style>
```

- [ ] **Step 4: 提交**

```bash
git add resources/js/vue/components/wanyaoTower/TowerLobby.vue \
  resources/js/vue/components/wanyaoTower/TowerRewardCard.vue \
  resources/js/vue/components/wanyaoTower/TowerSettleModal.vue
git commit -m "feat(tower): lobby + reward card + settle modal"
```

---

## Task 12: 前端 — 主 View 组装

**Files:**
- Create: `resources/js/vue/views/WanyaoTowerView.vue`

- [ ] **Step 1: 写 View**

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTowerStore } from '@/stores/towerStore';
import { useLegacyBridge } from '@/composables/useLegacyBridge';
import TowerLobby from '@/components/wanyaoTower/TowerLobby.vue';
import TowerQuestionRunner from '@/components/wanyaoTower/TowerQuestionRunner.vue';
import TowerBossPanel from '@/components/wanyaoTower/TowerBossPanel.vue';
import TowerSettleModal from '@/components/wanyaoTower/TowerSettleModal.vue';

const router = useRouter();
const store = useTowerStore();
const bridge = useLegacyBridge();

onMounted(async () => {
  bridge.switchToWanyaoTowerScene?.();
  await store.fetchStatus();
});

function onStart()   { store.startRun(); }
function onResume()  { store.startRun(); /* 后端拒绝时显示已有 run；Phase 1 简化 */ }
function onBack()    { router.push('/practice'); }
function onContinue() {
  store.resetToIdle();
  store.fetchStatus();
}
</script>

<template>
  <div class="wanyao-tower-view">
    <TowerLobby
      v-if="store.status === 'idle'"
      @start="onStart"
      @resume="onResume"
      @back="onBack"
    />
    <TowerQuestionRunner v-else-if="store.status === 'answering'" />
    <TowerBossPanel v-else-if="store.status === 'boss'" />
    <div v-else-if="store.status === 'starting' || store.status === 'settling'" class="wanyao-tower-view__loading">
      载入中…
    </div>
    <TowerSettleModal
      v-if="store.status === 'reward' || store.status === 'failed'"
      @continue="onContinue"
      @back="onBack"
    />
  </div>
</template>

<style scoped>
.wanyao-tower-view {
  position: fixed; inset: 0; pointer-events: auto;
  background: linear-gradient(180deg, rgba(20,0,10,0.5), rgba(0,0,0,0.85));
}
.wanyao-tower-view__loading { display: grid; place-items: center; height: 100vh; color: #f4e7c1; }
</style>
```

- [ ] **Step 2: 提交**

```bash
git add resources/js/vue/views/WanyaoTowerView.vue
git commit -m "feat(tower): main view assembling state-machine UI"
```

---

## Task 13: 接入路由 + Bridge + 世界地图节点

**Files:**
- Modify: `resources/js/vue/router/index.ts`
- Modify: `resources/js/vue/composables/useLegacyBridge.ts`
- Modify: `resources/js/vue/data/SECT_NODES.ts`（实际路径以源码为准，可能在 `core/` 或 `modules/`）
- Modify: `resources/js/vue/components/map/WorldMapOverlay.vue`

- [ ] **Step 1: 找到 SECT_NODES 实际位置**

Run: `grep -rn "SECT_NODES\s*=" resources/js/vue/`
Expected: 单点声明位置

- [ ] **Step 2: 在 SECT_NODES 追加 wanyaoTower**

```ts
{ id: 'wanyaoTower', name: '万妖古塔', model: '/models/wanyaoTower.glb',
  position: [/* 妖与心魔殿对称的坐标 */], accentColor: '#c41e3a' },
```
同时微调其它 7 座坐标，保持环形/扇形布局视觉平衡（实际数值看 WorldSceneManager 的布局公式）。

- [ ] **Step 3: 路由追加**

`router/index.ts`：

```ts
{
  path: '/wanyao-tower',
  name: 'WanyaoTower',
  component: () => import('@/views/WanyaoTowerView.vue'),
},
```

- [ ] **Step 4: Bridge 追加 switchToWanyaoTowerScene**

`useLegacyBridge.ts`：参考 `switchToExamScene` 实现，Phase 1 复用试炼场 Canvas 场景：

```ts
function switchToWanyaoTowerScene() {
  const game = getGame();
  if (!game) return;
  // Phase 1 占位：复用试炼场背景
  game.switchToScene?.('exam');
}
```
并在 return 的对象里加上 `switchToWanyaoTowerScene`。

- [ ] **Step 5: WorldMapOverlay 节点点击分支**

找到点击节点的 switch/if 处理，加入：

```ts
case 'wanyaoTower':
  ui.hideMapOverlay();
  router.push('/wanyao-tower');
  break;
```

- [ ] **Step 6: 类型检查**

Run: `npx vue-tsc --noEmit`
Expected: 无新增报错

- [ ] **Step 7: 提交**

```bash
git add resources/js/vue/router/index.ts \
  resources/js/vue/composables/useLegacyBridge.ts \
  resources/js/vue/data/SECT_NODES.ts \
  resources/js/vue/components/map/WorldMapOverlay.vue
git commit -m "feat(tower): wire route + bridge + world map node"
```

---

## Task 14: 端到端冒烟测试

**Files:**
- 无新文件

- [ ] **Step 1: 启动后端**

Run: `php artisan serve`
Expected: 后端在 127.0.0.1:8000 启动

- [ ] **Step 2: 启动前端**

Run: `npm run dev`
Expected: Vite 在 127.0.0.1:5173 启动，无编译错误

- [ ] **Step 3: 浏览器手动走通**

打开 127.0.0.1:8000，登录测试账号 →
1. 进世界地图 → 看到第 8 座万妖古塔节点
2. 点击 → 进 `/wanyao-tower` → 看到 TowerLobby，显示当前层=1、最高=0
3. 点【登塔挑战】→ 进 answering，依次答 5 题（部分对部分错）
4. 答完 → Boss 倒计时面板，写 30+ 字提交
5. 通关 → SettleModal 显示灵石数 → 点【挑战下一层】
6. 回 lobby，currentFloor 显示 2

- [ ] **Step 4: 检查心魔池**

故意答对 < 3 题失败 → 进 SettleModal 失败态 → 看到"新生心魔 N"。
再去心魔殿（innerDemonHall）→ `/api/demons/list` 或 UI 验证错题已进池。

- [ ] **Step 5: 跑前端 smoke 脚本**

Run: `npm run smoke:frontend`
Expected: 通过

- [ ] **Step 6: 跑后端测试**

Run: `vendor/bin/phpunit`
Expected: 所有现有测试 + 新测试通过

- [ ] **Step 7: 提交（如冒烟过程中有微调）**

```bash
git status
# 如有改动：
git add . && git commit -m "fix(tower): smoke test adjustments"
```

---

## Task 15: 文档收尾

**Files:**
- Modify: `english-rpg/CLAUDE.md`（项目根 CLAUDE.md）

- [ ] **Step 1: 在 CLAUDE.md 的「Business Rules」节追加万妖古塔条目**

```
- **万妖古塔（万妖古塔 PvE 副本）：** 第 8 座建筑 `wanyaoTower`，纯闯关百层；
  单层 = 5 道词汇 MCQ + 1 道写作 Boss（60s 倒计时）。失败错题入心魔池。
  奖励：基础灵石 floor×10、首通额外 perfect bonus、境界突破层（10/20/.../100）掉心法碎片。
  API：`/wanyao-tower/status` `/start` `/answer` `/settle` `/abandon`。
```

并在 SECT_NODES 列表里把 7→8 改正。

- [ ] **Step 2: 提交**

```bash
git add CLAUDE.md
git commit -m "docs(tower): update CLAUDE.md with wanyao tower entry"
```

---

## Recap of Decisions Encoded in This Plan

| 决定 | 落点 |
|---|---|
| 应用层（非 DB partial unique）强制单 in_progress run | Task 5 `startRun` 的事务 + `lockForUpdate` |
| `questions_json` DB 存完整含答案、HTTP 出参 strip | Task 4/6 `responsePayload` 与 `stripAnswer` 双层防御 |
| 写作评分失败降级为通关，不阻塞玩家 | Task 6 `settle()` 的 try/catch |
| Phase 1 仅词汇 MCQ + 写作 Boss，不抽离 PracticeView | Task 8 独立 `TowerMCQQuestion`，全程不 import PracticeView 组件 |
| 失败错题入心魔池前端不再单独调 API | Task 5 `settle()` 内直接调 `HeartDemonService::recordWrong` |
| 测试只覆盖 Service 层纯逻辑 | Task 3/4/5 测试，纯依赖注入 mock，不打 DB |

## Risks Logged in Plan

- **`VocabularyWord` 的 `tier` / `theme` 字段未导入** → Task 4 的 `pickVocabWords` 假设字段存在，词库导入前 Phase 1 无法跑通生产抽题。Workaround：临时改为按 `id` 随机抽 5 个，提交一个 `feat(tower): temporary random word picker until vocab tags ready` commit，词库就绪后 revert。
- **`CurrencyService::addStones` / `HeartDemonService::recordWrong` 签名假设** → 实际执行 Task 5 时先 `grep` 真实签名，按需调整。
- **`WritingService::scoreFreeText` 不一定存在** → Task 6 已写降级路径，Phase 1 可纯按字数判定。

## Verification Checklist (final before merge)

- [ ] `php artisan migrate:fresh && php artisan migrate` 跑通
- [ ] `vendor/bin/phpunit` 全绿
- [ ] `npx vue-tsc --noEmit` 无新增错误
- [ ] `npm run build` 通过
- [ ] `npm run smoke:frontend` 通过
- [ ] 手动走通 Task 14 的完整 happy path 和失败路径
