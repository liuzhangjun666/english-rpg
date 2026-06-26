<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('levelup_users', 'password')) {
            Schema::table('levelup_users', function (Blueprint $table) {
                $table->string('password')->nullable()->comment('登录密码（bcrypt 哈希）');
            });
        }
    }

    public function down(): void
    {
        // 保留已有数据，不删除 password 列
    }
};
