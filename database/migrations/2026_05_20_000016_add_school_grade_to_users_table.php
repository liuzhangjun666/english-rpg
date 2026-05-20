<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            if (!Schema::hasColumn('levelup_users', 'school_grade')) {
                $table->string('school_grade', 32)
                    ->nullable()
                    ->after('nickname')
                    ->comment('学习年级/阶段');
            }
        });
    }

    public function down(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            if (Schema::hasColumn('levelup_users', 'school_grade')) {
                $table->dropColumn('school_grade');
            }
        });
    }
};
