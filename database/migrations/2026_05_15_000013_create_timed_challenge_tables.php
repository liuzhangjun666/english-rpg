<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('levelup_timed_challenge_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('challenge_id', 40)->unique();
            $table->unsignedBigInteger('user_id');
            $table->string('module_type', 20);
            $table->string('level', 10);
            $table->string('stage', 10);
            $table->unsignedSmallInteger('duration_sec')->default(60);
            $table->unsignedSmallInteger('spirit_cost')->default(5);
            $table->string('status', 20)->default('running');
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->unsignedSmallInteger('total_answered')->default(0);
            $table->unsignedSmallInteger('correct_count')->default(0);
            $table->unsignedInteger('final_score')->default(0);
            $table->unsignedSmallInteger('current_combo')->default(0);
            $table->unsignedSmallInteger('highest_combo')->default(0);
            $table->json('asked_question_ids')->nullable();
            $table->json('weak_tag_stats')->nullable();
            $table->boolean('rewards_granted')->default(false);
            $table->unsignedInteger('exp_gained')->default(0);
            $table->unsignedInteger('points_gained')->default(0);
            $table->timestamps();

            $table->index(['user_id', 'status'], 'idx_tc_user_status');
            $table->index(['module_type', 'level', 'stage'], 'idx_tc_module_level');
        });

        Schema::create('levelup_timed_challenge_answers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('session_id');
            $table->string('question_id', 50);
            $table->string('knowledge_tag', 100)->nullable();
            $table->string('user_answer', 255);
            $table->boolean('is_correct');
            $table->unsignedInteger('elapsed_ms')->default(0);
            $table->unsignedSmallInteger('score_delta')->default(0);
            $table->timestamps();

            $table->index(['session_id', 'question_id'], 'idx_tc_answer_session_question');
            $table->index(['session_id', 'is_correct'], 'idx_tc_answer_session_correct');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('levelup_timed_challenge_answers');
        Schema::dropIfExists('levelup_timed_challenge_sessions');
    }
};

