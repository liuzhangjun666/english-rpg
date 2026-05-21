<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            if (!Schema::hasColumn('levelup_users', 'current_chapter')) {
                $table->string('current_chapter', 32)->nullable()->after('progress_currency');
            }

            if (!Schema::hasColumn('levelup_users', 'current_node')) {
                $table->string('current_node', 64)->nullable()->after('current_chapter');
            }

            if (!Schema::hasColumn('levelup_users', 'dao_heart')) {
                $table->unsignedInteger('dao_heart')->default(100)->after('current_node');
            }

            if (!Schema::hasColumn('levelup_users', 'story_keys')) {
                $table->unsignedInteger('story_keys')->default(0)->after('dao_heart');
            }

            if (!Schema::hasColumn('levelup_users', 'unlocked_nodes')) {
                $table->json('unlocked_nodes')->nullable()->after('story_keys');
            }
        });
    }

    public function down(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            if (Schema::hasColumn('levelup_users', 'unlocked_nodes')) {
                $table->dropColumn('unlocked_nodes');
            }
            if (Schema::hasColumn('levelup_users', 'story_keys')) {
                $table->dropColumn('story_keys');
            }
            if (Schema::hasColumn('levelup_users', 'dao_heart')) {
                $table->dropColumn('dao_heart');
            }
            if (Schema::hasColumn('levelup_users', 'current_node')) {
                $table->dropColumn('current_node');
            }
            if (Schema::hasColumn('levelup_users', 'current_chapter')) {
                $table->dropColumn('current_chapter');
            }
        });
    }
};

