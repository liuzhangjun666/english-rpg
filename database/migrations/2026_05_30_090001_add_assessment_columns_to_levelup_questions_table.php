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
            if (!Schema::hasColumn('levelup_questions', 'assessment_level')) {
                $table->unsignedTinyInteger('assessment_level')
                    ->default(1)
                    ->after('grade_level')
                    ->comment('灵根测试等级：1小学低段，2小学高段，3初中，4高中，5四级，6六级/考研基础，7研究生/学术词汇');
            }

            if (!Schema::hasColumn('levelup_questions', 'is_assessment')) {
                $table->unsignedTinyInteger('is_assessment')
                    ->default(0)
                    ->after('assessment_level')
                    ->comment('是否用于注册后灵根测试：0否，1是');
            }

            if (!Schema::hasColumn('levelup_questions', 'expected_time')) {
                $table->unsignedInteger('expected_time')
                    ->default(10)
                    ->after('is_assessment')
                    ->comment('预计答题时间，单位秒');
            }
        });

        $this->createIndexIfMissing('levelup_questions', 'idx_assessment_level', ['is_assessment', 'assessment_level']);
        $this->createIndexIfMissing('levelup_questions', 'idx_type_assessment', ['type', 'is_assessment', 'assessment_level']);
        $this->createIndexIfMissing('levelup_questions', 'idx_word', ['word']);
    }

    public function down(): void
    {
        Schema::table('levelup_questions', function (Blueprint $table) {
            if ($this->hasIndex('levelup_questions', 'idx_assessment_level')) {
                $table->dropIndex('idx_assessment_level');
            }
            if ($this->hasIndex('levelup_questions', 'idx_type_assessment')) {
                $table->dropIndex('idx_type_assessment');
            }
            if ($this->hasIndex('levelup_questions', 'idx_word')) {
                $table->dropIndex('idx_word');
            }

            $dropColumns = [];
            foreach (['assessment_level', 'is_assessment', 'expected_time'] as $column) {
                if (Schema::hasColumn('levelup_questions', $column)) {
                    $dropColumns[] = $column;
                }
            }

            if (!empty($dropColumns)) {
                $table->dropColumn($dropColumns);
            }
        });
    }

    private function createIndexIfMissing(string $table, string $indexName, array $columns): void
    {
        if ($this->hasIndex($table, $indexName)) {
            return;
        }

        $columnList = implode('`,`', $columns);
        DB::statement(sprintf('CREATE INDEX `%s` ON `%s` (`%s`)', $indexName, $table, $columnList));
    }

    private function hasIndex(string $table, string $indexName): bool
    {
        $rows = DB::select(sprintf('SHOW INDEX FROM `%s` WHERE Key_name = ?', $table), [$indexName]);
        return !empty($rows);
    }
};
