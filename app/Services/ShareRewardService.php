<?php

namespace App\Services;

use App\Models\User;

/**
 * 分享奖励引擎（文档 8.3.4）
 */
class ShareRewardService
{
    const REWARDS = [
        'register'    => ['sharer' => 100, 'new_user_spirit' => 200],
        'first_clear' => ['sharer' => 150],
        'scan'        => ['sharer' => 10],
    ];

    const DAILY_SCAN_LIMIT = 50;
    /** 单个邀请方每日最多有效邀请人数（超出仍记录关系但不发奖励，防止刷号） */
    const DAILY_INVITE_REWARD_LIMIT = 10;

    /**
     * 为指定用户生成/获取邀请码。
     *
     * 算法：LV + 6 位密码学安全随机字符（Crockford-style 字母表，去掉 0/1/I/O 等易混淆字符）。
     * 32^6 ≈ 10.7 亿组合空间，配合 DB 唯一性检查 + 重试，碰撞概率可忽略。
     *
     * 旧的 `LV + dechex(user_id)` 方案泄露 user_id 和总用户数，且可被枚举，已废弃。
     * 已存在的旧格式邀请码不会被自动覆盖（避免破坏已发出去的招募链接）。
     */
    public function getInviteCode(User $user): string
    {
        if ($user->invite_code) return $user->invite_code;

        // 32 个字符，剔除 0/1/I/O/L 等视觉相似 / 易输错的字符
        $alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
        $alphaLen = strlen($alphabet);
        $maxAttempts = 10;

        for ($i = 0; $i < $maxAttempts; $i++) {
            $suffix = '';
            for ($j = 0; $j < 6; $j++) {
                $suffix .= $alphabet[random_int(0, $alphaLen - 1)];
            }
            $code = 'LV' . $suffix;

            // DB 唯一性兜底：理论上 6 位随机碰撞极低，但 race condition 下仍可能撞，重试即可
            if (!User::where('invite_code', $code)->exists()) {
                $user->update(['invite_code' => $code]);
                return $code;
            }
        }

        // 10 次都撞上属于天文事件，兜底用 user_id 派生（保证一定能生成）+ 微秒后缀
        $code = 'LV' . substr(strtoupper(base_convert((string)(microtime(true) * 1000), 10, 36)), -6);
        $user->update(['invite_code' => $code]);
        return $code;
    }

    /**
     * 处理新用户注册时填写的邀请码。
     *
     * 关系记录与奖励发放解耦：即便邀请方今日奖励已封顶（防刷限流），
     * invited_by 关系仍照常记录，新用户的 200 灵力新人礼也照样发——
     * 限流惩罚的是邀请方的薅羊毛行为，不该牵连新用户。
     */
    public function handleInvitedRegistration(User $newUser, string $inviteCode): array
    {
        $inviter = User::where('invite_code', $inviteCode)->first();
        if (!$inviter || $inviter->id === $newUser->id) {
            return ['success' => false, 'message' => '无效的邀请码'];
        }

        // 记录被邀请关系
        $newUser->update(['invited_by' => $inviteCode]);

        // 给新用户奖励（无条件，不受邀请方限流影响）
        $reward = self::REWARDS['register'];
        $newUser->increment('spirit_power', $reward['new_user_spirit']);
        $newUser->spirit_power_max = max($newUser->spirit_power_max, 100);
        $newUser->save();

        // 邀请方限流检查：今天通过此 invite_code 注册的人数 ≥ 上限则不发奖励，
        // 但 invited_by 关系仍然写入，统计仍计入（这样作弊也"留下证据"便于事后审计）
        $today = now()->startOfDay();
        $todayInvited = User::where('invited_by', $inviteCode)
            ->where('created_at', '>=', $today)
            ->count();
        $sharerReward = 0;
        $throttled = $todayInvited > self::DAILY_INVITE_REWARD_LIMIT;
        if (!$throttled) {
            $sharerReward = $reward['sharer'];
            $inviter->increment('spirit_power', $sharerReward);
            $inviter->save();
        }

        // 邀请成功后触发邀请方相关成就（1 人 → 传道授业，10 人 → 渡人无量）
        try {
            $achievementService = app(AchievementService::class);
            $totalInvited = User::where('invited_by', $inviteCode)->count();
            $achievementService->checkInviteMilestones($inviter, $totalInvited);
        } catch (\Throwable $e) {
            // 成就发放失败不应阻塞注册流程，吞掉异常但记录日志
            \Log::warning('邀请成就检查失败: ' . $e->getMessage(), ['inviter_id' => $inviter->id]);
        }

        return [
            'success' => true,
            'sharer_reward' => $sharerReward,
            'new_user_reward' => $reward['new_user_spirit'],
            'throttled' => $throttled,
            'message' => $throttled
                ? "已记录邀请关系，但邀请方今日奖励已封顶（{$todayInvited}/" . self::DAILY_INVITE_REWARD_LIMIT . "）"
                : "邀请成功！你和邀请人各获得 {$sharerReward}/{$reward['new_user_spirit']} 灵力奖励",
        ];
    }

    /**
     * 被邀请进来的用户首次通关时为邀请方追加奖励。
     *
     * 调用时机：AchievementService::onLevelSubmit 中检测到 first_pass 成就**首次**发放时触发。
     * 防重复：用 users.invite_first_clear_rewarded_at 时间戳记录，已发过的不会再发。
     */
    public function handleInviteeFirstClear(User $invitee): array
    {
        // 不是被邀请进来的，跳过
        if (!$invitee->invited_by) {
            return ['success' => false, 'reason' => 'not_invited'];
        }
        // 已发过追加奖励，跳过
        if ($invitee->invite_first_clear_rewarded_at) {
            return ['success' => false, 'reason' => 'already_rewarded'];
        }

        $inviter = User::where('invite_code', $invitee->invited_by)->first();
        if (!$inviter) {
            return ['success' => false, 'reason' => 'inviter_not_found'];
        }

        $reward = self::REWARDS['first_clear']['sharer'];
        $inviter->increment('spirit_power', $reward);
        $inviter->save();

        // 标记已发放，防重复（即便逻辑链条上 first_pass 只触发一次，
        // 保险起见仍写时间戳——避免任何上游 bug 导致重复结算）
        $invitee->update(['invite_first_clear_rewarded_at' => now()]);

        return [
            'success' => true,
            'inviter_id' => $inviter->id,
            'sharer_reward' => $reward,
        ];
    }

    /**
     * 获取分享数据（前端展示用）
     */
    public function getShareData(User $user): array
    {
        $inviteCode = $this->getInviteCode($user);
        $stats = $this->getInviteStats($user, $inviteCode);

        // 如果当前用户是被邀请进来的，把邀请人也带上（前端可以显示"由 XXX 邀请"）
        $inviter = null;
        if ($user->invited_by) {
            $inviterUser = User::where('invite_code', $user->invited_by)
                ->select(['id', 'nickname', 'avatar_url', 'current_realm'])
                ->first();
            if ($inviterUser) {
                $inviter = [
                    'nickname' => $inviterUser->nickname,
                    'avatar_url' => $inviterUser->avatar_url,
                    'current_realm' => $inviterUser->current_realm,
                ];
            }
        }

        return [
            'invite_code' => $inviteCode,
            'share_enabled' => (bool)$user->share_enabled,
            'invited_count' => $stats['count'],
            'invited_users' => $stats['recent'],
            'total_sharer_reward' => $stats['count'] * self::REWARDS['register']['sharer'],
            'inviter' => $inviter,
            'rewards' => self::REWARDS,
            'daily_scan_limit' => self::DAILY_SCAN_LIMIT,
        ];
    }

    /**
     * 统计当前用户邀请了多少人 + 最近 10 个被邀请的道友。
     */
    public function getInviteStats(User $user, ?string $inviteCode = null): array
    {
        $code = $inviteCode ?: $user->invite_code;
        if (!$code) return ['count' => 0, 'recent' => []];

        $count = User::where('invited_by', $code)->count();

        $recent = User::where('invited_by', $code)
            ->orderByDesc('id')
            ->limit(10)
            ->get(['id', 'nickname', 'avatar_url', 'current_realm', 'created_at'])
            ->map(function ($u) {
                return [
                    'nickname' => $u->nickname,
                    'avatar_url' => $u->avatar_url,
                    'current_realm' => $u->current_realm,
                    // 隐去具体时间，只给"X 天前"避免暴露过细的注册时间
                    'joined_ago' => $u->created_at ? $u->created_at->diffForHumans() : null,
                ];
            })
            ->toArray();

        return ['count' => $count, 'recent' => $recent];
    }
}
