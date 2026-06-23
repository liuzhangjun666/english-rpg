<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('wanyao_tower_runs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedInteger('floor');
            $table->json('questions_json');
            $table->unsignedBigInteger('boss_question_id');
            $table->enum('status', ['in_progress','cleared','failed','abandoned'])->default('in_progress');
            $table->unsignedInteger('correct_count')->default(0);
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['user_id','status']);
            $table->index('boss_question_id');
        });
    }
    public function down(): void { Schema::dropIfExists('wanyao_tower_runs'); }
};
