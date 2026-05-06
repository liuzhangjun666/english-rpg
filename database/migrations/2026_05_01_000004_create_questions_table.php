<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('levelup_questions', function (Blueprint $table) {
            $table->id();
            $table->string('question_id', 50)->unique()->comment('题号 如 C-L1-001');
            $table->enum('type', ['vocab', 'grammar'])->comment('题型');
            $table->string('realm', 10)->comment('境界 L1~L3');
            $table->string('stage', 10)->comment('关卡 01~09');
            $table->text('question')->comment('题干');
            $table->json('options')->comment('选项 {"A":"...","B":"...","C":"...","D":"..."}');
            $table->string('correct_answer', 10)->comment('正确答案 A/B/C/D');
            $table->string('explanation', 500)->nullable()->comment('解析');
            $table->string('word', 100)->nullable()->comment('关联单词');
            $table->timestamps();

            $table->index(['type', 'realm', 'stage'], 'idx_question_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('levelup_questions');
    }
};
