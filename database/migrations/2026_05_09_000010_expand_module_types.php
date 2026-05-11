<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();
        if ($driver !== 'mysql') {
            return;
        }

        DB::statement("
            ALTER TABLE `levelup_questions`
            MODIFY COLUMN `type` ENUM('vocab','grammar','listening','speaking','reading','writing') NOT NULL COMMENT '题型'
        ");

        DB::statement("
            ALTER TABLE `levelup_learning_records`
            MODIFY COLUMN `activity_type` ENUM('vocab','grammar','listening','reading','speaking','writing','exam','review') NOT NULL
        ");
    }

    public function down(): void
    {
        $driver = DB::getDriverName();
        if ($driver !== 'mysql') {
            return;
        }

        DB::statement("
            ALTER TABLE `levelup_questions`
            MODIFY COLUMN `type` ENUM('vocab','grammar') NOT NULL COMMENT '题型'
        ");

        DB::statement("
            ALTER TABLE `levelup_learning_records`
            MODIFY COLUMN `activity_type` ENUM('vocab','grammar','reading','speaking','writing','exam','review') NOT NULL
        ");
    }
};
