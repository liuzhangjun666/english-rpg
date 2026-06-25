<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE `reading_questions` MODIFY COLUMN `question_type` ENUM('tf','single','blank','detail','word','infer') NOT NULL DEFAULT 'single' COMMENT 'tf/单选/填空/细节/词义/推理'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `reading_questions` MODIFY COLUMN `question_type` ENUM('tf','single','blank') NOT NULL DEFAULT 'tf' COMMENT 'tf/单选/填空'");
    }
};
