<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('listening_passages', function (Blueprint $table) {
            $table->id();
            $table->string('passage_code', 60)->nullable()->comment('稳定编号，如 LP-L1-01-001');
            $table->string('level_tag', 30)->nullable();
            $table->string('grade_level', 30)->nullable();
            $table->string('realm', 10)->nullable()->comment('境界 L1/Z1/J1...');
            $table->string('stage', 10)->nullable()->comment('关卡 01~09');
            $table->string('title', 200)->nullable();
            $table->longText('listening_text')->comment('听力材料（浏览器朗读）');
            $table->string('word', 60)->nullable()->comment('风铃主题词');
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique('passage_code', 'uk_listening_passage_code');
            $table->index(['realm', 'stage'], 'idx_listening_passage_realm_stage');
        });

        Schema::create('listening_questions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('passage_id');
            $table->unsignedInteger('question_no')->default(1);
            $table->text('question');
            $table->json('options')->nullable();
            $table->string('correct_answer', 20);
            $table->text('explanation')->nullable();
            $table->string('word', 60)->nullable();
            $table->timestamps();

            $table->index(['passage_id', 'question_no'], 'idx_listening_question_passage_no');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('listening_questions');
        Schema::dropIfExists('listening_passages');
    }
};
