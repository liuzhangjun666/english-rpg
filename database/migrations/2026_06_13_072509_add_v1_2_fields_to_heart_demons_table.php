<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('levelup_heart_demons', function (Blueprint $table) {
            // V1.2 本命心魔进化相关预留字段
            $table->tinyInteger('evolution_level')->unsigned()->default(0)->comment('心魔等级 0=普通 1=魔影 2=本命 3=天魔')->after('type');
            $table->integer('encounter_count')->unsigned()->default(0)->comment('累计遭遇次数')->after('wrong_count');
            $table->integer('defeat_count')->unsigned()->default(0)->comment('累计被玩家击败次数')->after('encounter_count');
            $table->timestamp('last_seen_at')->nullable()->comment('最后遭遇时间')->after('last_reviewed_at');
            $table->boolean('is_sealed')->default(false)->comment('是否已被彻底封印进入镇魔碑')->after('is_mastered');
            $table->timestamp('sealed_at')->nullable()->comment('封印时间')->after('is_sealed');
            $table->string('title_override', 100)->nullable()->comment('特殊称号覆写')->after('evolution_level');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('levelup_heart_demons', function (Blueprint $table) {
            $table->dropColumn([
                'evolution_level',
                'title_override',
                'encounter_count',
                'defeat_count',
                'last_seen_at',
                'is_sealed',
                'sealed_at'
            ]);
        });
    }
};
