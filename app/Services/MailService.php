<?php

namespace App\Services;

use App\Models\User;

class MailService
{
    public function __construct(
        private readonly ReportService $reportService,
        private readonly RealmService $realmService,
    ) {}

    public function inbox(User $user): array
    {
        $messages = $this->buildMessages($user);
        $readIds = $this->getReadIds($user);

        foreach ($messages as &$message) {
            if (($message['id'] ?? '') === 'welcome') {
                $message['read'] = true;
                continue;
            }
            $message['read'] = in_array($message['id'], $readIds, true);
        }
        unset($message);

        return [
            'unread' => collect($messages)->where('read', false)->count(),
            'messages' => $messages,
        ];
    }

    public function markRead(User $user, string $messageId): array
    {
        $readIds = $this->getReadIds($user);
        if (!in_array($messageId, $readIds, true)) {
            $readIds[] = $messageId;
        }

        $currency = is_array($user->progress_currency) ? $user->progress_currency : [];
        $currency['mail_read_ids'] = array_values(array_unique($readIds));
        $user->progress_currency = $currency;
        $user->save();

        return $this->inbox($user->fresh());
    }

    private function getReadIds(User $user): array
    {
        $currency = is_array($user->progress_currency) ? $user->progress_currency : [];
        $ids = $currency['mail_read_ids'] ?? [];

        return is_array($ids) ? array_values(array_filter(array_map('strval', $ids))) : [];
    }

    private function buildMessages(User $user): array
    {
        $messages = [];
        $today = now()->format('Y-m-d');
        $currency = is_array($user->progress_currency) ? $user->progress_currency : [];

        $messages[] = [
            'id' => 'welcome',
            'title' => '天道传音',
            'body' => '道友，灵脉已通。每日修炼、签到与复盘，可助境界精进。',
            'time' => $today,
            'read' => true,
            'type' => 'system',
        ];

        if (($currency['daily_signin_date'] ?? '') !== $today) {
            $messages[] = [
                'id' => 'signin',
                'title' => '每日签到提醒',
                'body' => '今日尚未签到，完成签到可领取灵石奖励并恢复灵力。',
                'time' => $today,
                'read' => false,
                'type' => 'reward',
                'action' => 'signin',
            ];
        }

        if (($currency['daily_quest_claimed_date'] ?? '') !== $today) {
            $messages[] = [
                'id' => 'daily-quest',
                'title' => '今日修炼任务',
                'body' => '完成词汇修炼、秘境试炼与阅读任务，可领取额外奖励。',
                'time' => $today,
                'read' => false,
                'type' => 'quest',
                'action' => 'dailyQuest',
            ];
        }

        $breakthrough = $this->realmService->getBreakthroughStatus($user);
        if (!empty($breakthrough['can_breakthrough'])) {
            $messages[] = [
                'id' => 'breakthrough-ready',
                'title' => '境界可突破',
                'body' => $breakthrough['message'] ?? '六维修行已达标，可前往天道峰渡劫。',
                'time' => $today,
                'read' => false,
                'type' => 'realm',
                'action' => 'exam',
            ];
        }

        $streak = $this->reportService->getStreakDays($user);
        if ($streak >= 3) {
            $messages[] = [
                'id' => 'streak',
                'title' => "连续修炼 {$streak} 天",
                'body' => '道心坚定，继续保持每日修炼节奏。',
                'time' => $today,
                'read' => false,
                'type' => 'praise',
            ];
        }

        return $messages;
    }
}
