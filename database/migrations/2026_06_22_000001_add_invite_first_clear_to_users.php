<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 邀请系统扩展：通关首关追加奖励防重复发放。
 *
 * 字段含义：被邀请进来的用户首次通过任何关卡时，会给邀请方追加一笔奖励。
 * 该字段记录"已经触发过这次追加"的时间戳；NULL 表示尚未触发，触发后写入当前时间。
 *
 * 选择时间戳而非 boolean：未来需要做奖励发放审计 / 追溯异常时有时间信息可查。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            $table->timestamp('invite_first_clear_rewarded_at')
                ->nullable()
                ->after('share_enabled')
                ->comment('被邀请进来的用户首次通关时为邀请方追加奖励的时间戳');
        });
    }

    public function down(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            $table->dropColumn('invite_first_clear_rewarded_at');
        });
    }
};
