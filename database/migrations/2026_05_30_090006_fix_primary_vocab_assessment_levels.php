<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("UPDATE levelup_questions SET assessment_level = 1 WHERE type = 'vocab' AND grade_level IN ('三年级', '四年级')");
        DB::statement("UPDATE levelup_questions SET assessment_level = 2 WHERE type = 'vocab' AND grade_level IN ('五年级', '六年级')");
    }

    public function down(): void
    {
        DB::statement("UPDATE levelup_questions SET assessment_level = 1 WHERE type = 'vocab'");
    }
};
