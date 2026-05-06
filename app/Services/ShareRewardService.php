<?php

namespace App\Services;

use App\Models\User;

/**
 * 分享奖励引擎（文档 8.3.4）
 */
class ShareRewardService
{
    const REWARDS = [
        'register' => ['sharer' => 100, 'new_user_spirit' => 200],
        'scan'     => ['sharer' => 10],
    ];

    const DAILY_SCAN_LIMIT = 50;

    /**
     * 为指定用户生成/获取邀请码
     */
    public function getInviteCode(User $user): string
    {
        if ($user->invite_code) return $user->invite_code;

        $code = 'LV' . str_pad(dechex($user->id), 6, '0', STR_PAD_LEFT);
        $user->update(['invite_code' => $code]);
        return $code;
    }

    /**
     * 处理新用户注册时填写的邀请码
     */
    public function handleInvitedRegistration(User $newUser, string $inviteCode): array
    {
        $inviter = User::where('invite_code', $inviteCode)->first();
        if (!$inviter || $inviter->id === $newUser->id) {
            return ['success' => false, 'message' => '无效的邀请码'];
        }

        // 记录被邀请关系
        $newUser->update(['invited_by' => $inviteCode]);

        // 给邀请人奖励灵力
        $reward = self::REWARDS['register'];
        $inviter->increment('spirit_power', $reward['sharer']);
        $inviter->save();

        // 给新用户奖励
        $newUser->increment('spirit_power', $reward['new_user_spirit']);
        $newUser->spirit_power_max = max($newUser->spirit_power_max, 100);
        $newUser->save();

        return [
            'success' => true,
            'sharer_reward' => $reward['sharer'],
            'new_user_reward' => $reward['new_user_spirit'],
            'message' => "邀请成功！你和邀请人各获得 {$reward['sharer']}/{$reward['new_user_spirit']} 灵力奖励",
        ];
    }

    /**
     * 获取分享数据（前端展示用）
     */
    public function getShareData(User $user): array
    {
        return [
            'invite_code' => $this->getInviteCode($user),
            'share_enabled' => (bool)$user->share_enabled,
            'rewards' => self::REWARDS,
            'daily_scan_limit' => self::DAILY_SCAN_LIMIT,
        ];
    }
}
