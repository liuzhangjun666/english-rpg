<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // 原建表 enum 漏了 listening，导致听力练习 LearningRecord::create 被 CHECK 约束拒绝。
    public function up(): void
    {
        Schema::table('levelup_learning_records', function (Blueprint $table) {
            $table->enum('activity_type', ['vocab', 'grammar', 'reading', 'listening', 'speaking', 'writing', 'exam', 'review'])->change();
        });
    }

    // 不回退 enum：若库中已存在 listening 记录，缩小 enum 会因 CHECK 约束失败。
    public function down(): void
    {
        // no-op by design
    }
};
