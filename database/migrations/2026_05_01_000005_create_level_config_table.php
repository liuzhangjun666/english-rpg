<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('levelup_level_config', function (Blueprint $table) {
            $table->id();
            $table->string('level_id', 20)->unique()->comment('关卡ID 如 L1-01');
            $table->string('realm', 10)->comment('境界 L1');
            $table->tinyInteger('stage')->unsigned()->comment('关卡序号 1~9');
            $table->enum('type', ['vocab', 'grammar', 'exam'])->comment('关卡类型');
            $table->string('title', 100)->comment('关卡名称');
            $table->text('description')->nullable()->comment('关卡描述');
            $table->integer('question_count')->unsigned()->default(15)->comment('题目数量');
            $table->integer('exp_reward')->unsigned()->default(0)->comment('完成奖励修为');
            $table->string('unlock_condition', 100)->nullable()->comment('解锁条件');
            $table->tinyInteger('sort_order')->unsigned()->comment('排序');
            $table->timestamps();

            $table->index(['realm', 'sort_order'], 'idx_realm_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('levelup_level_config');
    }
};
