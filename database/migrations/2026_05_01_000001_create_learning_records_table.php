<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('levelup_learning_records', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->enum('activity_type', ['vocab','grammar','reading','speaking','writing','exam','review']);
            $table->string('activity_id', 50)->nullable()->comment('关联ID（题目ID/文章ID等）');
            $table->string('question_id', 50)->nullable()->comment('具体题目ID');

            $table->tinyInteger('is_correct')->nullable()->comment('对错（主观题null）');
            $table->unsignedInteger('exp_gained')->default(0)->comment('获得修为');
            $table->unsignedInteger('spirit_cost')->default(0)->comment('消耗灵力');
            $table->unsignedInteger('time_spent')->default(0)->comment('用时(秒)');
            $table->json('answer_data')->nullable()->comment('答题数据（选项/文本等）');

            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'activity_type', 'created_at'], 'idx_user_activity');
            $table->index(['user_id', 'created_at'], 'idx_user_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('levelup_learning_records');
    }
};
