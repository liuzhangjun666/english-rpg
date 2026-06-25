<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ENUM / MODIFY COLUMN 是 MySQL 专用语法；SQLite（dev/test 驱动）会报
        // "near \"MODIFY\": syntax error"，且其 question_type 为无约束文本列，无需变更。
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE `reading_questions` MODIFY COLUMN `question_type` ENUM('tf','single','blank','detail','word','infer') NOT NULL DEFAULT 'single' COMMENT 'tf/单选/填空/细节/词义/推理'");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE `reading_questions` MODIFY COLUMN `question_type` ENUM('tf','single','blank') NOT NULL DEFAULT 'tf' COMMENT 'tf/单选/填空'");
    }
};
