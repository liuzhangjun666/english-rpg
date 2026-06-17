<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('levelup_vocabulary_assessment_records', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('assessment_id');
            $table->unsignedBigInteger('user_id');
            $table->string('question_id', 50);

            $table->unsignedTinyInteger('assessment_level')->comment('本题测试等级');
            $table->string('play_mode', 50)->nullable()->comment('复用当前词汇玩法，例如 木桩连击');

            $table->string('user_answer', 20)->nullable();
            $table->string('correct_answer', 20)->nullable();
            $table->unsignedTinyInteger('is_correct')->default(0);

            $table->unsignedInteger('expected_time')->default(10);
            $table->unsignedInteger('time_spent')->default(0);

            $table->unsignedTinyInteger('level_before')->nullable();
            $table->unsignedTinyInteger('level_after')->nullable();

            $table->timestamp('created_at')->useCurrent();

            $table->index(['assessment_id'], 'idx_assessment_id');
            $table->index(['user_id'], 'idx_user_id');
            $table->index(['assessment_level'], 'idx_level');
            $table->index(['play_mode'], 'idx_play_mode');
            $table->unique(['assessment_id', 'question_id'], 'uk_assessment_question');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('levelup_vocabulary_assessment_records');
    }
};
