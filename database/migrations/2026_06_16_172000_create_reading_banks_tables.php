<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reading_passages', function (Blueprint $table) {
            $table->id();
            $table->string('passage_code', 60)->nullable()->comment('稳定编号，可选：RP-L1-01-001');
            $table->string('level_tag', 30)->nullable()->comment('小学/初中/高中等');
            $table->string('grade_level', 30)->nullable()->comment('三年级/高一上册等');
            $table->string('realm', 10)->nullable()->comment('境界 L1/Z1/J1...');
            $table->string('stage', 10)->nullable()->comment('关卡 01~09');
            $table->string('title', 200)->nullable();
            $table->longText('content')->comment('阅读文章正文');
            $table->json('meta')->nullable()->comment('课本/单元/主题/来源等元信息');
            $table->timestamps();

            $table->unique('passage_code', 'uk_reading_passage_code');
            $table->index(['realm', 'stage'], 'idx_reading_passage_realm_stage');
            $table->index(['level_tag', 'grade_level'], 'idx_reading_passage_level_grade');
        });

        Schema::create('reading_questions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('passage_id');
            $table->unsignedInteger('question_no')->default(1)->comment('文章内题号');
            $table->enum('question_type', ['tf', 'single', 'blank'])->default('tf')->comment('tf/单选/填空');
            $table->text('question')->comment('题干/命题');
            $table->json('options')->nullable()->comment('选项，单选或 tf 可用');
            $table->string('correct_answer', 100)->comment('正确答案：T/F/A/B/标准填空');
            $table->json('answer_accept')->nullable()->comment('可接受答案（填空同义/大小写忽略等）');
            $table->text('explanation')->nullable()->comment('解析');
            $table->timestamps();

            $table->index(['passage_id', 'question_no'], 'idx_reading_question_passage_no');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reading_questions');
        Schema::dropIfExists('reading_passages');
    }
};

