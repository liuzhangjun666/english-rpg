<?php

namespace App\Services;

use App\Models\LearningRecord;
use App\Models\User;
use App\Models\WritingPrompt;
use App\Models\WritingResult;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WritingService
{
    // 写作模块灵力消耗（每道题）
    const SPIRIT_COST_PER_PROMPT = 3;
    // 基础修为奖励
    const EXP_BASE = 20;
    // 高分加成
    const EXP_HIGH_SCORE_BONUS = 15;
    // 完美分加成
    const EXP_PERFECT_BONUS = 25;
    // 高分线
    const HIGH_SCORE_LINE = 75;
    const PERFECT_SCORE_LINE = 90;

    /**
     * 获取一关的写作题目（命题+续写各1题）
     */
    public function getPrompts(string $realm, string $stage): array
    {
        $prompts = WritingPrompt::where('realm', $realm)
            ->where('stage', $stage)
            ->get();

        if ($prompts->isEmpty()) {
            return [];
        }

        return $prompts->map(fn($p) => $this->formatPrompt($p))->values()->toArray();
    }

    /**
     * 提交写作并进行 AI 评分
     */
    public function submitWriting(User $user, string $promptId, string $content): array
    {
        $prompt = WritingPrompt::where('prompt_id', $promptId)->first();
        if (!$prompt) {
            return ['success' => false, 'message' => '题目不存在'];
        }

        $wordCount = $this->countWords($content);

        // AI 评分
        $scoreResult = $this->scoreWithAI($prompt, $content, $wordCount);

        $score = $scoreResult['score'];
        $expGained = $this->calcExp($score);
        $stonesGained = $score >= self::HIGH_SCORE_LINE ? 2 : ($score >= 60 ? 1 : 0);

        // 存储结果
        $result = WritingResult::create([
            'user_id' => $user->id,
            'prompt_id' => $promptId,
            'content' => $content,
            'word_count' => $wordCount,
            'ai_score' => $score,
            'ai_feedback' => $scoreResult['feedback'],
            'ai_details' => $scoreResult['details'] ?? null,
            'exp_gained' => $expGained,
            'stones_gained' => $stonesGained,
        ]);

        // 奖励发放
        $user->increment('exp', $expGained);
        $user->increment('spirit_stone', $stonesGained);
        $user->save();

        // 记录学习记录
        LearningRecord::create([
            'user_id' => $user->id,
            'activity_type' => 'writing',
            'activity_id' => "{$prompt->realm}-{$prompt->stage}",
            'question_id' => $promptId,
            'is_correct' => $score >= 60,
            'exp_gained' => $expGained,
            'spirit_cost' => self::SPIRIT_COST_PER_PROMPT,
            'time_spent' => 0,
            'answer_data' => ['content_preview' => mb_substr($content, 0, 100)],
        ]);

        return [
            'success' => true,
            'score' => $score,
            'feedback' => $scoreResult['feedback'],
            'details' => $scoreResult['details'] ?? [],
            'exp_gained' => $expGained,
            'stones_gained' => $stonesGained,
            'word_count' => $wordCount,
            'passed' => $score >= 60,
        ];
    }

    /**
     * 调用 AI 接口进行写作评分
     * 若 AI 调用失败则降级为本地规则评分
     */
    private function scoreWithAI(WritingPrompt $prompt, string $content, int $wordCount): array
    {
        $apiKey = config('services.openai.key') ?: config('services.hermes.key');
        $apiBase = config('services.openai.base_url', 'https://api.openai.com/v1');

        if (!$apiKey) {
            return $this->scoreFallback($prompt, $content, $wordCount);
        }

        try {
            $isTopicType = $prompt->writing_type === 'topic';
            $systemPrompt = <<<PROMPT
你是一名英语写作评分老师。请对学生的英文写作进行评分，满分100分。
评分标准：
- 内容相关性（25分）：是否紧扣题目要求
- 语言表达（25分）：词汇丰富度、句式多样性
- 语法正确性（25分）：语法错误数量
- 连贯逻辑（25分）：文章结构是否清晰、逻辑连贯

请以JSON格式返回，字段：
{
  "score": 整数(0-100),
  "feedback": "中文总体评语（100字内，鼓励为主）",
  "details": {
    "relevance": 分数,
    "language": 分数,
    "grammar": 分数,
    "coherence": 分数
  }
}
只返回JSON，不要其他文字。
PROMPT;

            $userMessage = $isTopicType
                ? "写作题目：{$prompt->title}\n题目要求：{$prompt->topic}\n\n学生作文：\n{$content}"
                : "续写要求：{$prompt->topic}\n原文段落：{$prompt->passage}\n\n学生续写内容：\n{$content}";

            $response = Http::timeout(20)
                ->withHeaders(['Authorization' => "Bearer {$apiKey}"])
                ->post("{$apiBase}/chat/completions", [
                    'model' => 'gpt-4o-mini',
                    'messages' => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user', 'content' => $userMessage],
                    ],
                    'temperature' => 0.3,
                    'max_tokens' => 500,
                ]);

            if ($response->successful()) {
                $json = json_decode(
                    $response->json('choices.0.message.content', '{}'),
                    true
                );
                if (isset($json['score']) && is_numeric($json['score'])) {
                    return [
                        'score' => min(100, max(0, (int)$json['score'])),
                        'feedback' => $json['feedback'] ?? '写作完成，继续加油！',
                        'details' => $json['details'] ?? [],
                    ];
                }
            }
        } catch (\Throwable $e) {
            Log::warning('WritingService AI scoring failed: ' . $e->getMessage());
        }

        return $this->scoreFallback($prompt, $content, $wordCount);
    }

    /**
     * 降级评分：基于字数、关键词检测的本地规则
     */
    private function scoreFallback(WritingPrompt $prompt, string $content, int $wordCount): array
    {
        $minWords = $prompt->word_limit_min ?? 50;
        $maxWords = $prompt->word_limit_max ?? 150;

        // 字数得分（满40分）
        if ($wordCount >= $minWords) {
            $wordScore = min(40, 30 + (int)(($wordCount - $minWords) / max(1, $maxWords - $minWords) * 10));
        } else {
            $wordScore = (int)(($wordCount / $minWords) * 30);
        }

        // 句子多样性（满20分）
        $sentences = preg_split('/[.!?]+/', $content, -1, PREG_SPLIT_NO_EMPTY);
        $sentenceCount = count(array_filter($sentences, fn($s) => strlen(trim($s)) > 3));
        $sentenceScore = min(20, $sentenceCount * 4);

        // 语法初判（无明显错误加20分）
        $grammarPenalty = 0;
        $grammarIssues = preg_match_all('/\bi\b(?!\')|doesnt|dont|cant|wont|isnt|arent/i', $content);
        $grammarPenalty = min(15, $grammarIssues * 3);
        $grammarScore = max(0, 20 - $grammarPenalty);

        // 内容相关性（题目关键词命中，满20分）
        $topicWords = preg_split('/\W+/', strtolower($prompt->title . ' ' . $prompt->topic));
        $topicWords = array_filter($topicWords, fn($w) => strlen($w) > 3);
        $contentLower = strtolower($content);
        $hitCount = 0;
        foreach ($topicWords as $tw) {
            if (str_contains($contentLower, $tw)) $hitCount++;
        }
        $relevanceScore = min(20, $hitCount * 4);

        $totalScore = $wordScore + $sentenceScore + $grammarScore + $relevanceScore;
        $totalScore = min(100, max(20, $totalScore)); // 最低20分

        // 生成鼓励性反馈
        $feedback = $this->generateFeedback($totalScore, $wordCount, $minWords, $sentenceCount);

        return [
            'score' => $totalScore,
            'feedback' => $feedback,
            'details' => [
                'relevance' => $relevanceScore,
                'language' => $sentenceScore,
                'grammar' => $grammarScore,
                'coherence' => $wordScore,
            ],
        ];
    }

    private function generateFeedback(int $score, int $wordCount, int $minWords, int $sentences): string
    {
        if ($score >= self::PERFECT_SCORE_LINE) {
            return "妙哉！行文流畅，词汇精准，令人叹服。此等写作功力，实乃修仙之资！";
        }
        if ($score >= self::HIGH_SCORE_LINE) {
            return "写得不错！结构清晰，表意明确。再多练习词汇多样性，可臻完美境界。";
        }
        if ($score >= 60) {
            if ($wordCount < $minWords) {
                return "内容稍显单薄，字数略有不足。多些细节描写，功力可大有提升！";
            }
            return "基础扎实，但可尝试更多样的句式结构，让文章更生动有力。";
        }
        return "初学者之作，勿要气馁！多积累词汇，勤加练习，假以时日必有大进！";
    }

    private function calcExp(int $score): int
    {
        $exp = self::EXP_BASE;
        if ($score >= self::PERFECT_SCORE_LINE) {
            $exp += self::EXP_PERFECT_BONUS;
        } elseif ($score >= self::HIGH_SCORE_LINE) {
            $exp += self::EXP_HIGH_SCORE_BONUS;
        }
        return $exp;
    }

    private function countWords(string $content): int
    {
        $content = trim(preg_replace('/\s+/', ' ', $content));
        if (empty($content)) return 0;
        return str_word_count($content);
    }

    private function formatPrompt(WritingPrompt $p): array
    {
        return [
            'prompt_id' => $p->prompt_id,
            'writing_type' => $p->writing_type,
            'title' => $p->title,
            'topic' => $p->topic,
            'passage' => $p->passage,
            'word_limit_min' => $p->word_limit_min,
            'word_limit_max' => $p->word_limit_max,
        ];
    }
}
