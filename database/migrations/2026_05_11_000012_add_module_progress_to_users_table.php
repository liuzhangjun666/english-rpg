<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            if (!Schema::hasColumn('levelup_users', 'practice_rank')) {
                $table->unsignedTinyInteger('practice_rank')->default(1)->after('spirit_stone')->comment('练功等级');
            }
            if (!Schema::hasColumn('levelup_users', 'practice_aura')) {
                $table->unsignedInteger('practice_aura')->default(0)->after('practice_rank')->comment('练功灵气值(0-99循环)');
            }
            if (!Schema::hasColumn('levelup_users', 'grammar_floor')) {
                $table->unsignedTinyInteger('grammar_floor')->default(1)->after('practice_aura')->comment('藏书阁楼层');
            }
            if (!Schema::hasColumn('levelup_users', 'secret_scroll')) {
                $table->unsignedInteger('secret_scroll')->default(0)->after('grammar_floor')->comment('秘境卷轴');
            }
            if (!Schema::hasColumn('levelup_users', 'skill_point')) {
                $table->unsignedInteger('skill_point')->default(0)->after('secret_scroll')->comment('技能点');
            }
            if (!Schema::hasColumn('levelup_users', 'daily_practice_bonus_date')) {
                $table->date('daily_practice_bonus_date')->nullable()->after('daily_minutes_date')->comment('每日练功奖励发放日期');
            }
        });
    }

    public function down(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            foreach ([
                'practice_rank',
                'practice_aura',
                'grammar_floor',
                'secret_scroll',
                'skill_point',
                'daily_practice_bonus_date',
            ] as $column) {
                if (Schema::hasColumn('levelup_users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

