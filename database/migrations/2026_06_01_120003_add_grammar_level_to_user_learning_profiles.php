<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('levelup_user_learning_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('levelup_user_learning_profiles', 'grammar_level')) {
                $table->unsignedTinyInteger('grammar_level')
                    ->nullable()
                    ->after('vocabulary_level')
                    ->comment('语法评测等级');
            }
        });
    }

    public function down(): void
    {
        Schema::table('levelup_user_learning_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('levelup_user_learning_profiles', 'grammar_level')) {
                $table->dropColumn('grammar_level');
            }
        });
    }
};

