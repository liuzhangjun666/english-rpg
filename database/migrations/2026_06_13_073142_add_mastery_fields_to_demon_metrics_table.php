<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('levelup_demon_metrics', function (Blueprint $table) {
            $table->tinyInteger('mastery_before')->unsigned()->default(0)->comment('遭遇前的掌握度')->after('wrong_count_at_encounter');
            $table->tinyInteger('mastery_after')->unsigned()->default(0)->comment('遭遇后的掌握度')->after('mastery_before');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('levelup_demon_metrics', function (Blueprint $table) {
            $table->dropColumn(['mastery_before', 'mastery_after']);
        });
    }
};
