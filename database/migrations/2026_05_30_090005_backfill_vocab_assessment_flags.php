<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("UPDATE levelup_questions SET is_assessment = 1 WHERE type = 'vocab'");

        DB::statement("UPDATE levelup_questions SET assessment_level = 1 WHERE type = 'vocab' AND realm = 'L1' AND stage BETWEEN '01' AND '03'");
        DB::statement("UPDATE levelup_questions SET assessment_level = 2 WHERE type = 'vocab' AND realm = 'L1' AND stage BETWEEN '04' AND '09'");
        DB::statement("UPDATE levelup_questions SET assessment_level = 3 WHERE type = 'vocab' AND realm = 'L2' AND stage BETWEEN '01' AND '03'");
        DB::statement("UPDATE levelup_questions SET assessment_level = 4 WHERE type = 'vocab' AND realm = 'L2' AND stage BETWEEN '04' AND '06'");
        DB::statement("UPDATE levelup_questions SET assessment_level = 5 WHERE type = 'vocab' AND realm = 'L2' AND stage BETWEEN '07' AND '09'");
        DB::statement("UPDATE levelup_questions SET assessment_level = 6 WHERE type = 'vocab' AND realm = 'L3' AND stage BETWEEN '01' AND '03'");
        DB::statement("UPDATE levelup_questions SET assessment_level = 7 WHERE type = 'vocab' AND realm = 'L3' AND stage BETWEEN '04' AND '09'");

        DB::statement("UPDATE levelup_questions SET expected_time = 10 WHERE type = 'vocab' AND (expected_time IS NULL OR expected_time = 0)");
    }

    public function down(): void
    {
        DB::statement("UPDATE levelup_questions SET is_assessment = 0 WHERE type = 'vocab'");
        DB::statement("UPDATE levelup_questions SET assessment_level = 1 WHERE type = 'vocab'");
    }
};
