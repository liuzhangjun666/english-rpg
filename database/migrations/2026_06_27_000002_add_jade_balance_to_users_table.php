<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            if (! Schema::hasColumn('levelup_users', 'jade_balance')) {
                $table->unsignedInteger('jade_balance')->default(0)->after('spirit_stone');
            }
            if (! Schema::hasColumn('levelup_users', 'first_recharge_at')) {
                $table->timestamp('first_recharge_at')->nullable()->after('jade_balance');
            }
        });
    }

    public function down(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            if (Schema::hasColumn('levelup_users', 'first_recharge_at')) {
                $table->dropColumn('first_recharge_at');
            }
            if (Schema::hasColumn('levelup_users', 'jade_balance')) {
                $table->dropColumn('jade_balance');
            }
        });
    }
};
