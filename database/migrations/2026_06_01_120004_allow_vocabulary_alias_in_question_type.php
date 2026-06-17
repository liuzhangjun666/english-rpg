<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("
            ALTER TABLE `levelup_questions`
            MODIFY COLUMN `type` ENUM('vocab','vocabulary','grammar','listening','speaking','reading','writing') NOT NULL COMMENT '题型'
        ");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("
            ALTER TABLE `levelup_questions`
            MODIFY COLUMN `type` ENUM('vocab','grammar','listening','speaking','reading','writing') NOT NULL COMMENT '题型'
        ");
    }
};

