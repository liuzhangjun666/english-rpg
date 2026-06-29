<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            if (! Schema::hasColumn('levelup_users', 'is_guest')) {
                $table->boolean('is_guest')->default(false)->after('tutorial_step');
            }
            if (! Schema::hasColumn('levelup_users', 'guest_key')) {
                $table->string('guest_key', 36)->nullable()->unique()->after('is_guest');
            }
        });
    }

    public function down(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            if (Schema::hasColumn('levelup_users', 'guest_key')) {
                $table->dropUnique(['guest_key']);
                $table->dropColumn('guest_key');
            }
            if (Schema::hasColumn('levelup_users', 'is_guest')) {
                $table->dropColumn('is_guest');
            }
        });
    }
};
