<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 为万妖塔补齐 vocabulary_words.tier / theme 两列。
 *
 * 背景：WanyaoTowerService::pickVocabWords 按 `tier`/`theme` 过滤词库，但这两列从未建过。
 * SQLite 会把不存在的标识符当字符串字面量（静默返回空），而生产 MySQL 会直接抛
 * "Unknown column 'tier'" → /api/wanyao-tower/start 必 500。本迁移补列消除该隐患。
 *
 * 取值规范（内容导入阶段填充，本迁移仅建空列）：
 *   tier  ∈ TowerRewardConfig::TIERS  → cet4_hf / cet4 / cet6 / kaoyan / ielts
 *   theme ∈ TowerRewardConfig::THEMES → fire / ice / thunder / poison / beast /
 *                                        shadow / mist / wind / storm / chaos
 */
return new class extends Migration
{
    private const TABLE = 'vocabulary_words';

    public function up(): void
    {
        $hasTier = Schema::hasColumn(self::TABLE, 'tier');
        $hasTheme = Schema::hasColumn(self::TABLE, 'theme');

        Schema::table(self::TABLE, function (Blueprint $table) use ($hasTier, $hasTheme) {
            if (!$hasTier) {
                $table->string('tier', 20)->nullable()->index()
                    ->comment('万妖塔词汇难度档：cet4_hf/cet4/cet6/kaoyan/ielts（对齐 TowerRewardConfig::TIERS）');
            }
            if (!$hasTheme) {
                $table->string('theme', 20)->nullable()->index()
                    ->comment('万妖塔主题词标签：fire/ice/thunder/.../chaos（对齐 TowerRewardConfig::THEMES）');
            }
        });
    }

    public function down(): void
    {
        Schema::table(self::TABLE, function (Blueprint $table) {
            if (Schema::hasColumn(self::TABLE, 'tier')) {
                $table->dropIndex(['tier']);
                $table->dropColumn('tier');
            }
            if (Schema::hasColumn(self::TABLE, 'theme')) {
                $table->dropIndex(['theme']);
                $table->dropColumn('theme');
            }
        });
    }
};
