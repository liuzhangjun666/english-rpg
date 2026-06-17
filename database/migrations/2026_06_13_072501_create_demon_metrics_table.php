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
        Schema::create('levelup_demon_metrics', function (Blueprint $table) {
            $table->id();
            $table->uuid('encounter_id')->index()->comment('单场遭遇战的唯一标识');
            $table->unsignedBigInteger('user_id')->index();
            $table->string('question_id', 50)->comment('题目ID');
            $table->enum('encounter_type', ['random', 'manual', 'tribulation', 'boss', 'story'])->comment('触发场景');
            $table->boolean('is_passed')->comment('是否战斗通过');
            $table->integer('time_spent')->unsigned()->default(0)->comment('战斗耗时(秒)');
            $table->integer('wrong_count_at_encounter')->unsigned()->default(1)->comment('遭遇时的累计错误次数');
            $table->timestamps();
            
            // 索引方便统计
            $table->index(['encounter_type', 'is_passed']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('levelup_demon_metrics');
    }
};
