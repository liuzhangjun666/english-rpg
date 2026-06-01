<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('levelup_vocabulary_assessment_records', function (Blueprint $table) {
            if (!Schema::hasColumn('levelup_vocabulary_assessment_records', 'question_type')) {
                $table->string('question_type', 20)
                    ->nullable()
                    ->after('question_id')
                    ->comment('题目维度：vocabulary / grammar');
                $table->index(['assessment_id', 'question_type'], 'idx_assessment_question_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('levelup_vocabulary_assessment_records', function (Blueprint $table) {
            if (Schema::hasColumn('levelup_vocabulary_assessment_records', 'question_type')) {
                $table->dropIndex('idx_assessment_question_type');
                $table->dropColumn('question_type');
            }
        });
    }
};

