<?php

namespace App\Services;

use App\Models\HeartDemon;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiAskService
{
    public function __construct(
        private readonly ReportService $reportService,
        private readonly RealmService $realmService,
        private readonly DailyTaskService $dailyTaskService,
        private readonly MallService $mallService,
    ) {}

    public function answer(User $user, ?string $question = null): array
    {
        $context = $this->buildContext($user);
        $trimmed = trim((string) $question);

        if ($trimmed !== '' && $this->canUseLlm()) {
            $llm = $this->askLlm($trimmed, $context);
            if ($llm !== null) {
                return [
                    'answer' => $llm,
                    'source' => 'ai',
                    'context' => $context,
                ];
            }
        }

        return [
            'answer' => $this->ruleBasedAnswer($trimmed, $context),
            'source' => 'guide',
            'context' => $context,
        ];
    }

    private function buildContext(User $user): array
    {
        $analytics = $this->reportService->learningAnalytics($user, 30);
        $breakthrough = $this->realmService->getBreakthroughStatus($user);
        $daily = $this->dailyTaskService->getStatus($user);
        $demonCount = HeartDemon::where('user_id', $user->id)->where('is_mastered', false)->count();
        $weakTags = collect($analytics['weak_tags'] ?? [])->take(5)->pluck('tag')->filter()->values()->all();

        return [
            'realm' => $this->realmService->resolveCurrentRealm($user),
            'spirit_power' => (int) $user->spirit_power,
            'spirit_stone' => (int) $user->spirit_stone,
            'streak_days' => $this->reportService->getStreakDays($user),
            'total_questions' => (int) ($analytics['total_questions'] ?? 0),
            'accuracy' => (int) ($analytics['accuracy'] ?? 0),
            'weak_tags' => $weakTags,
            'demon_count' => $demonCount,
            'can_breakthrough' => (bool) ($breakthrough['can_breakthrough'] ?? false),
            'breakthrough_message' => (string) ($breakthrough['message'] ?? ''),
            'daily_tasks_done' => collect($daily['tasks'] ?? [])->where('done', true)->count(),
            'daily_tasks_total' => count($daily['tasks'] ?? []),
            'buffs' => $this->mallService->getActiveBuffs($user),
        ];
    }

    private function ruleBasedAnswer(string $question, array $context): string
    {
        if ($question === '') {
            return $this->openingAdvice($context);
        }

        $q = mb_strtolower($question);

        if (str_contains($q, '灵力') || str_contains($q, 'spirit')) {
            return "当前灵力 {$context['spirit_power']} 点。灵力会随时间恢复，也可完成签到、每日任务，或在坊市购买灵泉水。";
        }
        if (str_contains($q, '突破') || str_contains($q, '境界') || str_contains($q, '渡劫')) {
            if ($context['can_breakthrough']) {
                return '六维修行已达标：' . ($context['breakthrough_message'] ?: '可前往天道峰渡劫。');
            }

            return '突破需六维修行与修为同时达标。建议先查看天道峰渡劫页，针对未达标维度专项修炼。';
        }
        if (str_contains($q, '心魔') || str_contains($q, '错题')) {
            $n = (int) $context['demon_count'];
            if ($n > 0) {
                return "心魔录中尚有 {$n} 道未净化的错题执念。建议先温故复盘，再在心魔禁地镇魔封印。";
            }

            return '心境澄明，暂无心魔缠身。继续保持正确率，错题会自动收入心魔录。';
        }
        if (str_contains($q, '今日') || str_contains($q, '怎么练') || str_contains($q, '修炼')) {
            return $this->openingAdvice($context);
        }
        if (str_contains($q, '灵石') || str_contains($q, '坊市')) {
            return "当前灵石 {$context['spirit_stone']} 枚。答对题目、完成每日任务与秘境试炼都可获得灵石，用于坊市购置灵材。";
        }

        if (!empty($context['weak_tags'])) {
            $tags = implode('、', $context['weak_tags']);

            return "关于「{$question}」：检测到薄弱点 {$tags}。建议优先复盘相关错题，再在对应模块专项修炼。";
        }

        return '天机示：保持每日词汇 + 阅读 + 错题复盘三角修炼，灵力与境界自然精进。若有具体疑惑，可问「今日如何修炼」「心魔怎么办」「如何突破」等。';
    }

    private function openingAdvice(array $context): string
    {
        $parts = [];
        $parts[] = "当前境界：{$context['realm']}，连修 {$context['streak_days']} 天。";

        if (!empty($context['weak_tags'])) {
            $parts[] = '薄弱执念：' . implode('、', $context['weak_tags']) . '。';
        }

        $done = (int) $context['daily_tasks_done'];
        $total = (int) $context['daily_tasks_total'];
        if ($done < $total) {
            $parts[] = "今日任务进度 {$done}/{$total}，完成可领灵石与灵力。";
        }

        if ((int) $context['demon_count'] > 0) {
            $parts[] = "心魔录有 {$context['demon_count']} 道待净化，建议先复盘。";
        } elseif ((int) $context['accuracy'] > 0 && (int) $context['accuracy'] < 70) {
            $parts[] = "近30日正确率 {$context['accuracy']}%，宜放慢节奏精练基础。";
        } else {
            $parts[] = '建议：练功殿词汇 10 题 → 藏经阁阅读 1 篇 → 温故复盘错题。';
        }

        if ($context['can_breakthrough']) {
            $parts[] = '突破条件已满足，可赴天道峰渡劫。';
        }

        if (!empty($context['buffs'])) {
            $labels = collect($context['buffs'])->pluck('label')->implode('、');
            $parts[] = "已启用增益：{$labels}。";
        }

        return implode(' ', $parts);
    }

    private function canUseLlm(): bool
    {
        return (bool) (config('services.openai.key') ?: env('OPENAI_API_KEY'));
    }

    private function askLlm(string $question, array $context): ?string
    {
        $apiKey = config('services.openai.key') ?: env('OPENAI_API_KEY');
        $apiBase = config('services.openai.base_url', 'https://api.openai.com/v1');
        if (!$apiKey) {
            return null;
        }

        $contextText = json_encode($context, JSON_UNESCAPED_UNICODE);
        $system = <<<PROMPT
你是英语学习 RPG「English RPG」中的修仙导师赫尔墨斯。
用简短、鼓励性的中文回答（120字内），结合用户修炼数据给出可执行建议。
不要编造用户没有的数据。可推荐：练功殿、藏经阁、心魔录、天道峰、坊市等游戏内地点。
PROMPT;

        try {
            $response = Http::timeout(15)
                ->withHeaders(['Authorization' => "Bearer {$apiKey}"])
                ->post("{$apiBase}/chat/completions", [
                    'model' => 'gpt-4o-mini',
                    'messages' => [
                        ['role' => 'system', 'content' => $system],
                        ['role' => 'user', 'content' => "用户数据：{$contextText}\n\n用户问题：{$question}"],
                    ],
                    'temperature' => 0.6,
                    'max_tokens' => 220,
                ]);

            if ($response->successful()) {
                $text = trim((string) $response->json('choices.0.message.content', ''));
                if ($text !== '') {
                    return $text;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('AiAskService LLM failed: ' . $e->getMessage());
        }

        return null;
    }
}
