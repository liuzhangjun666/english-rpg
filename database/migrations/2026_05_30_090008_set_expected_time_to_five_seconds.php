<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('levelup_questions', function (Blueprint $table) {
            $table->unsignedInteger('expected_time')
                ->default(5)
                ->comment('预计答题时间，单位秒')
                ->change();
        });

        Schema::table('levelup_vocabulary_assessment_records', function (Blueprint $table) {
            $table->unsignedInteger('expected_time')
                ->default(5)
                ->change();
        });

        DB::table('levelup_questions')
            ->where('is_assessment', 1)
            ->update(['expected_time' => 5]);

        DB::table('levelup_vocabulary_assessment_records')
            ->update(['expected_time' => 5]);
    }

    public function down(): void
    {
        Schema::table('levelup_questions', function (Blueprint $table) {
            $table->unsignedInteger('expected_time')
                ->default(10)
                ->comment('预计答题时间，单位秒')
                ->change();
        });

        Schema::table('levelup_vocabulary_assessment_records', function (Blueprint $table) {
            $table->unsignedInteger('expected_time')
                ->default(10)
                ->change();
        });
    }
};
