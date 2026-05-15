<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('levelup_writing_prompts', function (Blueprint $table) {
            $table->id();
            $table->string('prompt_id', 50)->unique()->comment('题号 如 WP-L1-01-1');
            $table->enum('writing_type', ['topic', 'continuation'])->comment('类型: topic=命题作文, continuation=续写');
            $table->string('realm', 10)->comment('境界 L1~L3');
            $table->string('stage', 10)->comment('关卡 01~09');
            $table->string('title', 200)->comment('写作题目标题');
            $table->text('topic')->comment('写作提示/要求说明');
            $table->text('passage')->nullable()->comment('续写类型的原文段落');
            $table->integer('word_limit_min')->default(50)->comment('最少字数');
            $table->integer('word_limit_max')->default(150)->comment('最多字数');
            $table->json('scoring_criteria')->nullable()->comment('AI评分标准 JSON');
            $table->timestamps();

            $table->index(['realm', 'stage'], 'idx_writing_prompt_lookup');
        });

        Schema::create('levelup_writing_results', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('prompt_id', 50);
            $table->text('content')->comment('学生写作内容');
            $table->integer('word_count')->default(0)->comment('实际字数');
            $table->integer('ai_score')->nullable()->comment('AI评分 0-100');
            $table->text('ai_feedback')->nullable()->comment('AI反馈文字');
            $table->json('ai_details')->nullable()->comment('AI详细评分维度JSON');
            $table->integer('exp_gained')->default(0);
            $table->integer('stones_gained')->default(0);
            $table->timestamps();

            $table->index(['user_id', 'prompt_id']);
            $table->foreign('user_id')->references('id')->on('levelup_users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('levelup_writing_results');
        Schema::dropIfExists('levelup_writing_prompts');
    }
};
