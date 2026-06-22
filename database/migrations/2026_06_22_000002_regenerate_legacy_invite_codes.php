<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * 把所有"旧公式生成"的邀请码清空，让 ShareRewardService::getInviteCode() 用新算法重发。
 *
 * 旧公式：LV + str_pad(dechex($user->id), 6, '0', STR_PAD_LEFT)
 * 比如 user_id=1 → "LV000001"，user_id=1000 → "LV0003E8"。
 *
 * 检测方式：对每个用户重新算一次旧公式，如果当前 invite_code 等于这个值，
 * 就视为是旧算法生成的，可以安全清空（用户改过的自定义码、新随机码不会被波及）。
 *
 * 之所以用 SQL 而不是 Eloquent：性能 + 避免触发 model 的 boot 事件。
 * down() 不复原（旧码已被新随机码替代），如需回滚请重新跑历史 seed。
 */
return new class extends Migration {
    public function up(): void
    {
        $cleared = 0;
        DB::table('levelup_users')
            ->select('id', 'invite_code')
            ->whereNotNull('invite_code')
            ->orderBy('id')
            ->chunk(500, function ($users) use (&$cleared) {
                foreach ($users as $u) {
                    $legacyCode = 'LV' . str_pad(dechex($u->id), 6, '0', STR_PAD_LEFT);
                    // 不区分大小写比较，旧实现产出的是小写 hex，但用户可能手动改成大写
                    if (strcasecmp($u->invite_code, $legacyCode) === 0) {
                        DB::table('levelup_users')
                            ->where('id', $u->id)
                            ->update(['invite_code' => null]);
                        $cleared++;
                    }
                }
            });

        if ($cleared > 0) {
            echo "✓ 清空了 {$cleared} 个旧格式邀请码，下次访问 /api/share/info 时会自动重发随机码\n";
        }
    }

    public function down(): void
    {
        // 不复原。旧码本身就是可推导的，重新跑老公式即可，但通常没必要。
    }
};
