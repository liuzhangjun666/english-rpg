<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            $table->string('invite_code', 20)->unique()->nullable()->after('id')->comment('邀请码');
            $table->string('invited_by', 20)->nullable()->after('invite_code')->comment('由谁邀请');
            $table->tinyInteger('share_enabled')->default(1)->after('invited_by')->comment('允许分享 0/1');
        });

        // 为已有用户生成邀请码
        $users = DB::table('levelup_users')->whereNull('invite_code')->get();
        foreach ($users as $user) {
            $code = 'LV' . str_pad(dechex($user->id), 6, '0', STR_PAD_LEFT);
            DB::table('levelup_users')->where('id', $user->id)->update(['invite_code' => $code]);
        }
    }

    public function down(): void
    {
        Schema::table('levelup_users', function (Blueprint $table) {
            $table->dropColumn(['invite_code', 'invited_by', 'share_enabled']);
        });
    }
};
