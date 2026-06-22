<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('levelup_vocabulary_assessments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');

            $table->string('school_stage', 30)->nullable()->comment('用户选择的学习阶段');
            $table->string('learning_goal', 30)->nullable()->comment('用户选择的学习目标');

            $table->unsignedTinyInteger('start_level')->default(1)->comment('起始测试等级');
            $table->unsignedTinyInteger('current_level')->default(1)->comment('当前测试等级');
            $table->unsignedTinyInteger('final_level')->nullable()->comment('最终测试等级');

            $table->unsignedInteger('total_questions')->default(25);
            $table->unsignedInteger('answered_count')->default(0);
            $table->unsignedInteger('correct_count')->default(0);
            $table->decimal('accuracy', 5, 2)->default(0);

            $table->string('final_realm', 30)->nullable()->comment('最终境界，例如 筑基七层');
            $table->string('final_stage', 10)->nullable()->comment('最终层数，例如 7');

            $table->json('level_result_json')->nullable()->comment('各 level 正确率');
            $table->json('suggestion_json')->nullable()->comment('推荐修炼路线');

            $table->string('status', 20)->default('running')->comment('running, finished, cancelled');

            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->index(['user_id', 'status'], 'idx_user_status');
            $table->index(['user_id', 'created_at'], 'idx_user_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('levelup_vocabulary_assessments');
    }
};
