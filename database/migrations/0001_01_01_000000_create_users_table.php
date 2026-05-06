<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // LevelUp 定制 users 表
        Schema::create('levelup_users', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 20)->unique()->comment('手机号');
            $table->string('nickname', 50)->nullable()->comment('昵称');
            $table->string('avatar_url', 255)->nullable()->comment('头像URL');

            // 境界/进度
            $table->enum('realm', [
                'L1','L2','L3','L4','L5','L6','L7','L8','L9',
                'Z1','Z2','Z3','J1','J2','J3',
                'Y1','Y2','Y3','H1','H2','H3',
                'D1','D2','D3'
            ])->default('L1')->comment('当前境界');
            $table->tinyInteger('realm_stage')->unsigned()->default(1)->comment('本境界内小阶段1-3');
            $table->bigInteger('exp')->unsigned()->default(0)->comment('当前修为');

            // 经济系统
            $table->integer('spirit_power')->unsigned()->default(100)->comment('当前灵力');
            $table->integer('spirit_power_max')->unsigned()->default(100)->comment('灵力上限');
            $table->integer('spirit_stone')->unsigned()->default(0)->comment('灵石数量');
            $table->date('spirit_power_date')->comment('灵力最后恢复日期');

            // VIP
            $table->enum('vip_type', ['free','monthly','yearly'])->default('free');
            $table->timestamp('vip_expired_at')->nullable();

            // 合规
            $table->tinyInteger('is_minor')->default(0)->comment('是否14岁以下');
            $table->string('parent_phone', 20)->nullable()->comment('家长手机号');
            $table->tinyInteger('parent_verified')->default(0)->comment('家长是否已验证');
            $table->integer('daily_minutes')->unsigned()->default(0)->comment('今日已学习分钟数');
            $table->date('daily_minutes_date')->comment('分钟数记录日期');

            // Sanctum token 支持
            $table->string('password')->nullable()->comment('备用密码字段');
            $table->rememberToken();

            $table->timestamps();
            $table->timestamp('last_login_at')->nullable();

            $table->index('realm');
            $table->index(['vip_type', 'vip_expired_at']);
        });

        // 保留 Laravel 默认的 password_reset_tokens 和 sessions（用于 Sanctum）
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('levelup_users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
