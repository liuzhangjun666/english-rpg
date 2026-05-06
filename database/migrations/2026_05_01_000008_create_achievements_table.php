<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('levelup_achievements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('levelup_users');
            $table->string('type', 50);          // first_login, first_pass, full_mark, demon_slayer, 100_questions, streak_7, realm_breakthrough
            $table->string('title', 100);        // '初入道途', '小试牛刀', '完美通关', '心魔克星', '百战修士', '七日不辍', '境界突破'
            $table->string('description', 255);
            $table->text('meta')->nullable();     // JSON context data
            $table->timestamp('achieved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void { Schema::dropIfExists('levelup_achievements'); }
};
