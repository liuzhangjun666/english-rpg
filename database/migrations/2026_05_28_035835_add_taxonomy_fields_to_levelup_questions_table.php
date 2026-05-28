<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('levelup_questions', function (Blueprint $table) {
            $table->string('play_mode', 50)->nullable()->after('type')->comment('玩法类型：木桩连击、语法机关等');
            $table->string('scene', 50)->nullable()->after('play_mode')->comment('场景：练功房、阵法峰等');
            $table->string('education_stage', 30)->nullable()->after('scene')->comment('学段：小学、初中、高中、大学、CET4等');
            $table->string('grade_level', 30)->nullable()->after('education_stage')->comment('年级：三年级、高一等');

            $table->index(['scene', 'education_stage', 'grade_level'], 'idx_question_scene_stage_grade');
            $table->index(['play_mode'], 'idx_question_play_mode');
        });
    }

    public function down(): void
    {
        Schema::table('levelup_questions', function (Blueprint $table) {
            $table->dropIndex('idx_question_scene_stage_grade');
            $table->dropIndex('idx_question_play_mode');
            $table->dropColumn(['play_mode', 'scene', 'education_stage', 'grade_level']);
        });
    }
};
