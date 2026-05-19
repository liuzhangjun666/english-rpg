<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            if (!Schema::hasColumn('levelup_users', 'spirit_power_last_recover_at')) {
                $table->timestamp('spirit_power_last_recover_at')
                    ->nullable()
                    ->after('spirit_power_date')
                    ->comment('灵力上次自动恢复计算时间');
            }
        });

        DB::table('levelup_users')
            ->whereNull('spirit_power_last_recover_at')
            ->update(['spirit_power_last_recover_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            if (Schema::hasColumn('levelup_users', 'spirit_power_last_recover_at')) {
                $table->dropColumn('spirit_power_last_recover_at');
            }
        });
    }
};

