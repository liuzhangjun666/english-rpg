<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            $table->unsignedTinyInteger('tutorial_step')
                ->default(0)
                ->after('last_login_at')
                ->comment('new user onboarding step');
        });
    }

    public function down(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            $table->dropColumn('tutorial_step');
        });
    }
};
