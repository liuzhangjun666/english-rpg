<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('levelup_questions')
            ->where('type', 'vocab')
            ->whereIn('grade_level', ['三年级', '四年级'])
            ->update(['assessment_level' => 1]);

        DB::table('levelup_questions')
            ->where('type', 'vocab')
            ->whereIn('grade_level', ['五年级', '六年级'])
            ->update(['assessment_level' => 2]);
    }

    public function down(): void
    {
        DB::table('levelup_questions')
            ->where('type', 'vocab')
            ->update(['assessment_level' => 1]);
    }
};
