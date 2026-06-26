<?php

namespace App\Services;

use App\Models\Mail;
use App\Models\ShopItem;
use App\Models\User;
use App\Models\UserItem;
use App\Models\UserMail;
use Illuminate\Support\Facades\DB;

class MailService
{
    // DB 持久化邮件在合并列表中的 id 前缀，用于和动态提醒(welcome/signin...)区分。
    private const DB_PREFIX = 'db-';

    public function __construct(
        private readonly ReportService $reportService,
        private readonly RealmService $realmService,
    ) {}

    public function inbox(User $user): array
    {
        $dynamic = $this->buildDynamicMessages($user);
        $persisted = $this->buildPersistedMessages($user);

        // 持久化邮件在前（更可能是运营公告/奖励），动态提醒在后
        $messages = array_merge($persisted, $dynamic);

        return [
            'unread' => collect($messages)->where('read', false)->count(),
            'messages' => $messages,
        ];
    }

    public function markRead(User $user, string $messageId): array
    {
        if (str_starts_with($messageId, self::DB_PREFIX)) {
            $this->markPersistedRead($user, $this->parseDbId($messageId));
        } else {
            $this->markDynamicRead($user, $messageId);
        }

        return $this->inbox($user->fresh());
    }

    /**
     * 领取附件奖励。仅持久化邮件可领。幂等：已领取直接返回提示。
     *
     * @return array{success: bool, message: string, rewards?: array, inbox?: array}
     */
    public function claim(User $user, string $messageId): array
    {
        if (!str_starts_with($messageId, self::DB_PREFIX)) {
            return ['success' => false, 'message' => '该邮件没有可领取的附件'];
        }

        $mailId = $this->parseDbId($messageId);
        $mail = Mail::query()->active()->visibleTo($user->id)->find($mailId);
        if (!$mail) {
            return ['success' => false, 'message' => '邮件不存在或已过期'];
        }

        $rewards = is_array($mail->rewards) ? $mail->rewards : [];
        if (empty($rewards)) {
            return ['success' => false, 'message' => '该邮件没有附件奖励'];
        }

        // 事务 + 行锁：防并发重复领取（双击/重放）
        $applied = DB::transaction(function () use ($user, $mail, $rewards) {
            $state = UserMail::query()
                ->where('user_id', $user->id)
                ->where('mail_id', $mail->id)
                ->lockForUpdate()
                ->first();

            if ($state && $state->claimed_at !== null) {
                return null; // 已领取
            }

            $locked = User::query()->whereKey($user->id)->lockForUpdate()->first();
            $this->applyRewards($locked, $rewards);

            UserMail::query()->updateOrCreate(
                ['user_id' => $user->id, 'mail_id' => $mail->id],
                ['read_at' => now(), 'claimed_at' => now()],
            );

            return true;
        });

        if ($applied === null) {
            return ['success' => false, 'message' => '奖励已领取，请勿重复领取'];
        }

        return [
            'success' => true,
            'message' => '附件奖励已领取',
            'rewards' => $this->decorateRewards($rewards),
            'inbox' => $this->inbox($user->fresh()),
        ];
    }

    /**
     * 发送一封持久化邮件（供 artisan 命令 / 系统事件调用）。
     *
     * @param array $options title, body, type, sender, rewards, action,
     *                       is_broadcast(bool), target_user_id(int|null),
     *                       published_at, expires_at
     */
    public function send(array $options): Mail
    {
        return Mail::create([
            'title' => $options['title'] ?? '无标题',
            'body' => $options['body'] ?? '',
            'type' => $options['type'] ?? 'announce',
            'sender' => $options['sender'] ?? '宗门',
            'rewards' => $options['rewards'] ?? null,
            'action' => $options['action'] ?? null,
            'is_broadcast' => (bool) ($options['is_broadcast'] ?? false),
            'target_user_id' => $options['target_user_id'] ?? null,
            'published_at' => $options['published_at'] ?? now(),
            'expires_at' => $options['expires_at'] ?? null,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // 持久化邮件
    // ─────────────────────────────────────────────────────────────

    private function buildPersistedMessages(User $user): array
    {
        $mails = Mail::query()
            ->active()
            ->visibleTo($user->id)
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        if ($mails->isEmpty()) {
            return [];
        }

        $states = UserMail::query()
            ->where('user_id', $user->id)
            ->whereIn('mail_id', $mails->pluck('id'))
            ->get()
            ->keyBy('mail_id');

        return $mails->map(function (Mail $mail) use ($states) {
            $state = $states->get($mail->id);
            $rewards = is_array($mail->rewards) ? $mail->rewards : [];
            $hasRewards = !empty($rewards);

            return [
                'id' => self::DB_PREFIX . $mail->id,
                'title' => $mail->title,
                'body' => $mail->body,
                'time' => optional($mail->published_at)->format('Y-m-d') ?? optional($mail->created_at)->format('Y-m-d'),
                'read' => $state?->read_at !== null,
                'type' => $mail->type,
                'sender' => $mail->sender,
                'action' => $mail->action,
                'rewards' => $hasRewards ? $this->decorateRewards($rewards) : null,
                'has_rewards' => $hasRewards,
                'claimed' => $state?->claimed_at !== null,
                'claimable' => $hasRewards && $state?->claimed_at === null,
            ];
        })->all();
    }

    private function markPersistedRead(User $user, int $mailId): void
    {
        $exists = Mail::query()->active()->visibleTo($user->id)->whereKey($mailId)->exists();
        if (!$exists) {
            return;
        }

        UserMail::query()->updateOrCreate(
            ['user_id' => $user->id, 'mail_id' => $mailId],
            ['read_at' => now()],
        );
    }

    private function parseDbId(string $messageId): int
    {
        return (int) substr($messageId, strlen(self::DB_PREFIX));
    }

    /**
     * 发放附件奖励。复用既有经济/背包写法：
     * 灵石/修为/灵力直接增量，道具写入 levelup_user_items。
     */
    private function applyRewards(User $user, array $rewards): void
    {
        $stones = max(0, (int) ($rewards['spirit_stone'] ?? 0));
        if ($stones > 0) {
            $user->increment('spirit_stone', $stones);
        }

        $exp = max(0, (int) ($rewards['exp'] ?? 0));
        if ($exp > 0) {
            $user->increment('exp', $exp);
        }

        $power = max(0, (int) ($rewards['spirit_power'] ?? 0));
        if ($power > 0) {
            $max = max(0, (int) ($user->spirit_power_max ?? 0));
            $next = (int) $user->spirit_power + $power;
            $user->spirit_power = $max > 0 ? min($max, $next) : $next;
            $user->save();
        }

        $items = $rewards['items'] ?? [];
        if (is_array($items)) {
            foreach ($items as $item) {
                $itemId = (string) ($item['item_id'] ?? '');
                $qty = max(1, (int) ($item['quantity'] ?? 1));
                if ($itemId === '') {
                    continue;
                }
                UserItem::create([
                    'user_id' => $user->id,
                    'item_id' => $itemId,
                    'quantity' => $qty,
                ]);
            }
        }
    }

    /** 给奖励里的道具补充展示名，便于前端直接渲染。 */
    private function decorateRewards(array $rewards): array
    {
        $items = $rewards['items'] ?? [];
        if (is_array($items) && !empty($items)) {
            $names = ShopItem::query()
                ->whereIn('item_id', array_filter(array_map(fn ($i) => $i['item_id'] ?? null, $items)))
                ->pluck('name', 'item_id');

            $rewards['items'] = array_map(function ($item) use ($names) {
                $id = (string) ($item['item_id'] ?? '');
                return [
                    'item_id' => $id,
                    'quantity' => max(1, (int) ($item['quantity'] ?? 1)),
                    'name' => $names[$id] ?? $id,
                ];
            }, $items);
        }

        return $rewards;
    }

    // ─────────────────────────────────────────────────────────────
    // 动态提醒（基于用户进度实时计算，沿用旧实现）
    // ─────────────────────────────────────────────────────────────

    private function buildDynamicMessages(User $user): array
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

        return $messages;
    }

    private function markDynamicRead(User $user, string $messageId): void
    {
        $readIds = $this->getReadIds($user);
        if (!in_array($messageId, $readIds, true)) {
            $readIds[] = $messageId;
        }

        $currency = is_array($user->progress_currency) ? $user->progress_currency : [];
        $currency['mail_read_ids'] = array_values(array_unique($readIds));
        $user->progress_currency = $currency;
        $user->save();
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
