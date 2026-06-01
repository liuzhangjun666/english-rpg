<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('levelup_vocabulary_assessments', function (Blueprint $table) {
            if (!Schema::hasColumn('levelup_vocabulary_assessments', 'vocab_current_level')) {
                $table->unsignedTinyInteger('vocab_current_level')
                    ->default(1)
                    ->after('current_level')
                    ->comment('词汇维度当前等级');
            }
            if (!Schema::hasColumn('levelup_vocabulary_assessments', 'grammar_current_level')) {
                $table->unsignedTinyInteger('grammar_current_level')
                    ->default(1)
                    ->after('vocab_current_level')
                    ->comment('语法维度当前等级');
            }
            if (!Schema::hasColumn('levelup_vocabulary_assessments', 'vocab_final_level')) {
                $table->unsignedTinyInteger('vocab_final_level')
                    ->nullable()
                    ->after('final_level')
                    ->comment('词汇维度最终等级');
            }
            if (!Schema::hasColumn('levelup_vocabulary_assessments', 'grammar_final_level')) {
                $table->unsignedTinyInteger('grammar_final_level')
                    ->nullable()
                    ->after('vocab_final_level')
                    ->comment('语法维度最终等级');
            }
        });
    }

    public function down(): void
    {
        Schema::table('levelup_vocabulary_assessments', function (Blueprint $table) {
            $dropColumns = [];
            foreach (['vocab_current_level', 'grammar_current_level', 'vocab_final_level', 'grammar_final_level'] as $column) {
                if (Schema::hasColumn('levelup_vocabulary_assessments', $column)) {
                    $dropColumns[] = $column;
                }
            }
            if (!empty($dropColumns)) {
                $table->dropColumn($dropColumns);
            }
        });
    }
};

