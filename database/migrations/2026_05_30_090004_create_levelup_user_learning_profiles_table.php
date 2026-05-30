<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('levelup_user_learning_profiles', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');

            $table->string('school_stage', 30)->nullable()->comment('小学/初中/高中/大学/研究生');
            $table->string('learning_goal', 30)->nullable()->comment('学习目标');

            $table->unsignedTinyInteger('initial_assessment_done')->default(0)->comment('是否完成初始灵根测试');

            $table->unsignedTinyInteger('initial_level')->nullable()->comment('初始测试等级');
            $table->unsignedTinyInteger('current_level')->default(1)->comment('当前等级');

            $table->string('initial_realm', 30)->nullable()->comment('初始境界');
            $table->string('current_realm', 30)->default('练气一层')->comment('当前境界');
            $table->string('current_stage', 10)->default('1')->comment('当前层数');

            $table->string('vocabulary_realm', 30)->nullable()->comment('词汇境界');
            $table->unsignedTinyInteger('vocabulary_level')->nullable()->comment('词汇等级');

            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->unique(['user_id'], 'uk_user_id');
            $table->index(['initial_assessment_done'], 'idx_assessment_done');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('levelup_user_learning_profiles');
    }
};
