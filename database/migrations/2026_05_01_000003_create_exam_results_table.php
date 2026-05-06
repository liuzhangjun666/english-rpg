<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('levelup_exam_results', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('realm', 10)->comment('所属境界');
            $table->decimal('score', 5, 2)->comment('得分百分比');
            $table->unsignedInteger('total_questions');
            $table->unsignedInteger('correct_count');
            $table->unsignedInteger('time_spent')->comment('用时秒数');
            $table->enum('grade', ['S','A','B','C','D'])->comment('评级');
            $table->tinyInteger('passed')->default(0)->comment('是否通过');
            $table->json('breakdown')->nullable()->comment('各维度得分明细');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'realm', 'created_at'], 'idx_user_realm');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('levelup_exam_results');
    }
};
