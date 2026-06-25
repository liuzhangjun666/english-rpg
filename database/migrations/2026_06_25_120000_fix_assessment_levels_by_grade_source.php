<?php

use App\Models\Question;
use App\Support\AssessmentLevelResolver;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $stats = [
            'updated_level' => 0,
            'removed_from_assessment' => 0,
        ];

        Question::query()
            ->whereIn('type', ['vocab', 'vocabulary', 'grammar'])
            ->orderBy('id')
            ->chunkById(500, function ($rows) use (&$stats) {
                foreach ($rows as $question) {
                    $level = AssessmentLevelResolver::resolveFromParts(
                        $question->grade_level,
                        $question->explanation,
                        $question->question,
                        $question->realm,
                        $question->stage,
                        $question->question_id,
                    );

                    $include = AssessmentLevelResolver::shouldIncludeInAssessment(
                        (string) $question->type,
                        $question->question,
                    );

                    $dirty = false;

                    if ((int) ($question->assessment_level ?? 0) !== $level) {
                        $question->assessment_level = $level;
                        $dirty = true;
                        $stats['updated_level']++;
                    }

                    $nextAssessmentFlag = $include ? 1 : 0;
                    if ((int) ($question->is_assessment ?? 0) !== $nextAssessmentFlag) {
                        $question->is_assessment = $nextAssessmentFlag;
                        $dirty = true;
                        if (!$include) {
                            $stats['removed_from_assessment']++;
                        }
                    }

                    if ($dirty) {
                        $question->save();
                    }
                }
            });

        if (app()->runningInConsole()) {
            echo "fix_assessment_levels_by_grade: updated_level={$stats['updated_level']}, removed_from_assessment={$stats['removed_from_assessment']}\n";
        }
    }

    public function down(): void
    {
        // 历史错误映射无法安全还原，不回滚。
    }
};
