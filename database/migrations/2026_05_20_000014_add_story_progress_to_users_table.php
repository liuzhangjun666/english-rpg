<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            if (!Schema::hasColumn('levelup_users', 'story_progress')) {
                $table->json('story_progress')->nullable()->after('tutorial_step');
            }

            if (!Schema::hasColumn('levelup_users', 'progress_currency')) {
                $table->json('progress_currency')->nullable()->after('story_progress');
            }
        });
    }

    public function down(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            if (Schema::hasColumn('levelup_users', 'progress_currency')) {
                $table->dropColumn('progress_currency');
            }
            if (Schema::hasColumn('levelup_users', 'story_progress')) {
                $table->dropColumn('story_progress');
            }
        });
    }
};
