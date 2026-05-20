<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            if (!Schema::hasColumn('levelup_users', 'initiation_completed_at')) {
                $table->timestamp('initiation_completed_at')
                    ->nullable()
                    ->after('last_login_at')
                    ->comment('天机测试完成时间');
            }
        });
    }

    public function down(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            if (Schema::hasColumn('levelup_users', 'initiation_completed_at')) {
                $table->dropColumn('initiation_completed_at');
            }
        });
    }
};

