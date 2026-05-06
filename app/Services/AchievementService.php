<?php

namespace App\Services;

use App\Models\Achievement;
use App\Models\User;
use App\Models\LearningRecord;
use App\Models\ExamResult;

/**
 * 成就系统引擎 — 自动检测并发放成就
 */
class AchievementService
{
    const TYPES = [
        'first_login'     => ['title'=>'初入道途', 'desc'=>'首次登录宗门'],
        'first_pass'      => ['title'=>'小试牛刀', 'desc'=>'首次通过关卡'],
        'full_mark'       => ['title'=>'完美通关', 'desc'=>'100%正确率通过关卡'],
        'exam_s'          => ['title'=>'天道认可', 'desc'=>'渡劫获得S级评价'],
        'demon_slayer'    => ['title'=>'心魔克星', 'desc'=>'清除10条心魔'],
        'streak_3'        => ['title'=>'三日不辍', 'desc'=>'连续修炼3天'],
        'streak_7'        => ['title'=>'七日不辍', 'desc'=>'连续修炼7天'],
        'streak_30'       => ['title'=>'铁杵成针', 'desc'=>'连续修炼30天'],
        'realm_breakthrough'=> ['title'=>'境界突破', 'desc'=>'首次突破大境界'],
        '100_questions'   => ['title'=>'百战修士', 'desc'=>'累计修炼100题'],
        '1000_questions'  => ['title'=>'千锤百炼', 'desc'=>'累计修炼1000题'],
        'invite_friend'   => ['title'=>'传道授业', 'desc'=>'成功邀请一位好友'],
    ];

    public static function getAchievementMeta(string $type): array
    {
        return self::TYPES[$type] ?? ['title'=>$type, 'desc'=>''];
    }

    /** 检查并发放成就（已存在则跳过） */
    public function checkAndAward(User $user, string $type, ?array $meta = null): ?Achievement
    {
        $exists = Achievement::where('user_id', $user->id)->where('type', $type)->exists();
        if ($exists) return null;

        $def = self::getAchievementMeta($type);
        return Achievement::create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $def['title'],
            'description' => $def['desc'],
            'meta' => $meta,
            'achieved_at' => now(),
        ]);
    }

    /** 批量检查所有可触发的成就 */
    public function checkAll(User $user): array
    {
        $new = [];

        // 首次登录
        $a = $this->checkAndAward($user, 'first_login');
        if ($a) $new[] = $a;

        // 关卡完成数
        $totalQuestions = LearningRecord::where('user_id', $user->id)->count();
        if ($totalQuestions >= 100) { $a = $this->checkAndAward($user, '100_questions'); if ($a) $new[] = $a; }
        if ($totalQuestions >= 1000) { $a = $this->checkAndAward($user, '1000_questions'); if ($a) $new[] = $a; }

        // 连续修炼天数
        $streak = $this->getStreakDays($user);
        if ($streak >= 3) { $a = $this->checkAndAward($user, 'streak_3'); if ($a) $new[] = $a; }
        if ($streak >= 7) { $a = $this->checkAndAward($user, 'streak_7'); if ($a) $new[] = $a; }
        if ($streak >= 30) { $a = $this->checkAndAward($user, 'streak_30'); if ($a) $new[] = $a; }

        // 心魔清除
        $cleared = \App\Models\HeartDemon::where('user_id', $user->id)->where('is_mastered', true)->count();
        if ($cleared >= 10) { $a = $this->checkAndAward($user, 'demon_slayer', ['cleared'=>$cleared]); if ($a) $new[] = $a; }

        return $new;
    }

    /** 用户在关卡提交后触发成就检查 */
    public function onLevelSubmit(User $user, array $results, int $accuracy): array
    {
        $new = $this->checkAll($user);

        // 首次通过
        $hasPassed = LearningRecord::where('user_id', $user->id)->where('is_correct', true)->exists();
        if ($hasPassed) { $a = $this->checkAndAward($user, 'first_pass'); if ($a) $new[] = $a; }

        // 完美通关
        if ($accuracy === 100) { $a = $this->checkAndAward($user, 'full_mark', ['accuracy'=>$accuracy]); if ($a) $new[] = $a; }

        return $new;
    }

    /** 渡劫后触发成就检查 */
    public function onExamSubmit(User $user, string $grade): array
    {
        $new = $this->checkAll($user);
        if ($grade === 'S') { $a = $this->checkAndAward($user, 'exam_s', ['grade'=>$grade]); if ($a) $new[] = $a; }
        return $new;
    }

    private function getStreakDays(User $user): int
    {
        $dates = LearningRecord::where('user_id', $user->id)
            ->selectRaw('DATE(created_at) as d')
            ->groupBy('d')->orderByDesc('d')->pluck('d');
        $streak = 0; $check = now()->format('Y-m-d');
        foreach ($dates as $d) {
            if ($d === $check) { $streak++; $check = date('Y-m-d', strtotime($check.' -1 day')); }
            else break;
        }
        return $streak;
    }

    public function getUserAchievements(int $userId): array
    {
        return Achievement::where('user_id', $userId)->orderByDesc('achieved_at')->get()->toArray();
    }
}
