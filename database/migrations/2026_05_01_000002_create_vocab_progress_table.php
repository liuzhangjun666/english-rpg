<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('levelup_vocab_progress', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('word', 100)->comment('单词');
            $table->enum('status', ['new','learning','mastered','forgotten'])->default('new');
            $table->tinyInteger('mastery_score')->unsigned()->default(0)->comment('0-100');
            $table->unsignedInteger('correct_count')->default(0);
            $table->unsignedInteger('error_count')->default(0);
            $table->timestamp('last_reviewed_at')->nullable();
            $table->timestamp('next_review_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'word'], 'uk_user_word');
            $table->index(['user_id', 'status'], 'idx_user_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('levelup_vocab_progress');
    }
};
