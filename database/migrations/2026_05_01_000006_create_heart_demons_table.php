<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('levelup_heart_demons', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('question_id', 50)->comment('题目ID');
            $table->string('word', 100)->nullable()->comment('关联单词');
            $table->string('realm', 10)->nullable()->comment('所属境界');
            $table->string('type', 20)->comment('题型 vocab/grammar/exam');
            $table->integer('wrong_count')->unsigned()->default(1)->comment('累计答错次数');
            $table->integer('reviewed_count')->unsigned()->default(0)->comment('已复习正确次数');
            $table->tinyInteger('mastery')->unsigned()->default(0)->comment('掌握度 0-100');
            $table->timestamp('last_wrong_at')->nullable()->comment('最后一次答错');
            $table->timestamp('last_reviewed_at')->nullable()->comment('最后一次复习正确');
            $table->timestamp('next_review_at')->nullable()->comment('下次应复习时间');
            $table->tinyInteger('is_mastered')->default(0)->comment('是否已掌握');
            $table->timestamps();

            $table->unique(['user_id', 'question_id'], 'uk_user_demon');
            $table->index(['user_id', 'is_mastered', 'next_review_at'], 'idx_review_queue');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('levelup_heart_demons');
    }
};
