<?php

namespace App\Console\Commands;

use App\Services\MailService;
use Illuminate\Console\Command;

class SendMail extends Command
{
    protected $signature = 'mail:send
        {--title= : 邮件标题}
        {--body= : 正文}
        {--type=announce : 类型 announce/reward/notice/system}
        {--sender=宗门 : 发件人显示名}
        {--action= : 点击动作 signin/dailyQuest/exam}
        {--broadcast : 全员广播（与 --user 二选一）}
        {--user= : 定向收件人用户 id}
        {--stones=0 : 附件灵石}
        {--exp=0 : 附件修为}
        {--power=0 : 附件灵力}
        {--item=* : 附件道具，格式 item_id:数量，可多次}
        {--expires= : 过期时间，可为 N(天数) 或 Y-m-d 日期}';

    protected $description = '发送一封站内信（运营公告 / 定向邮件，可带附件奖励）';

    public function handle(MailService $mailService): int
    {
        $title = (string) $this->option('title');
        $body = (string) $this->option('body');

        if ($title === '' || $body === '') {
            $this->error('必须提供 --title 与 --body');
            return self::FAILURE;
        }

        $broadcast = (bool) $this->option('broadcast');
        $userId = $this->option('user') !== null ? (int) $this->option('user') : null;

        if ($broadcast === ($userId !== null)) {
            $this->error('--broadcast 与 --user 必须二选一');
            return self::FAILURE;
        }

        $rewards = $this->buildRewards();
        $expiresAt = $this->parseExpires();

        $mail = $mailService->send([
            'title' => $title,
            'body' => $body,
            'type' => (string) $this->option('type'),
            'sender' => (string) $this->option('sender'),
            'action' => $this->option('action') ?: null,
            'rewards' => $rewards,
            'is_broadcast' => $broadcast,
            'target_user_id' => $userId,
            'expires_at' => $expiresAt,
        ]);

        $scope = $broadcast ? '全员广播' : "定向用户 #{$userId}";
        $this->info("邮件已发送 (#{$mail->id})：{$scope}");
        if ($rewards) {
            $this->line('附件：' . json_encode($rewards, JSON_UNESCAPED_UNICODE));
        }

        return self::SUCCESS;
    }

    /** @return array<string,mixed>|null */
    private function buildRewards(): ?array
    {
        $rewards = [];

        $stones = (int) $this->option('stones');
        $exp = (int) $this->option('exp');
        $power = (int) $this->option('power');
        if ($stones > 0) $rewards['spirit_stone'] = $stones;
        if ($exp > 0) $rewards['exp'] = $exp;
        if ($power > 0) $rewards['spirit_power'] = $power;

        $items = [];
        foreach ((array) $this->option('item') as $raw) {
            [$itemId, $qty] = array_pad(explode(':', (string) $raw, 2), 2, '1');
            $itemId = trim($itemId);
            if ($itemId === '') continue;
            $items[] = ['item_id' => $itemId, 'quantity' => max(1, (int) $qty)];
        }
        if ($items) $rewards['items'] = $items;

        return $rewards ?: null;
    }

    private function parseExpires(): ?string
    {
        $raw = $this->option('expires');
        if (!$raw) return null;

        // 纯数字 → 视为天数；否则按日期解析
        if (ctype_digit((string) $raw)) {
            return now()->addDays((int) $raw)->toDateTimeString();
        }

        try {
            return \Illuminate\Support\Carbon::parse((string) $raw)->toDateTimeString();
        } catch (\Throwable) {
            $this->warn("无法解析 --expires={$raw}，已忽略");
            return null;
        }
    }
}
