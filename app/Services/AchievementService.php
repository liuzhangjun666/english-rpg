<?php

namespace App\Services;

use App\Models\Achievement;
use App\Models\ExamResult;
use App\Models\HeartDemon;
use App\Models\LearningRecord;
use App\Models\User;

/**
 * 成就系统引擎 — 自动检测并发放成就
 */
class AchievementService
{
    /** 成就类型定义（type 与前端 AchievementsModal 的 id 对齐） */
    public const TYPES = [
        'first_practice'   => ['title' => '初入练功房', 'desc' => '完成第一次修炼'],
        'hundred_questions'=> ['title' => '百题斩', 'desc' => '累计完成100道题'],
        'five_hundred_q'   => ['title' => '五百题斩', 'desc' => '累计完成500道题'],
        'thousand_q'       => ['title' => '千题宗师', 'desc' => '累计完成1000道题'],
        'streak_3'         => ['title' => '三花聚顶', 'desc' => '连续修炼3天'],
        'streak_7'         => ['title' => '七星连珠', 'desc' => '连续修炼7天'],
        'streak_30'        => ['title' => '月满乾坤', 'desc' => '连续修炼30天'],
        'exam_s'           => ['title' => '天道认可', 'desc' => '渡劫获得S级评价'],
        'exam_a'           => ['title' => '青云直上', 'desc' => '渡劫获得A级以上评价3次'],
        'realm_l3'         => ['title' => '练气登堂', 'desc' => '达到练气中期(L3)'],
        'realm_l6'         => ['title' => '练气入室', 'desc' => '达到练气后期(L6)'],
        'realm_z1'         => ['title' => '筑基成功', 'desc' => '突破到筑基期'],
        'realm_j1'         => ['title' => '金丹大成', 'desc' => '突破到金丹期'],
        'realm_y1'         => ['title' => '元婴出窍', 'desc' => '突破到元婴期'],
        'perfect_10'       => ['title' => '十题全对', 'desc' => '单次修炼10题全部答对'],
        'accuracy_90'      => ['title' => '精准如神', 'desc' => '总正确率达到90%以上'],
        'first_share'      => ['title' => '初传道法', 'desc' => '第一次分享修炼成果'],
        'invite_3'         => ['title' => '广纳门徒', 'desc' => '成功邀请3位好友'],
        'invite_10'        => ['title' => '桃李满天下', 'desc' => '成功邀请10位好友'],
        'master_demon'     => ['title' => '心魔克星', 'desc' => '降服10条心魔'],
        'realm_breakthrough'=> ['title' => '境界突破', 'desc' => '首次突破大境界'],
    ];

    /** 历史成就 type → 前端 id */
    private const LEGACY_TYPE_ALIASES = [
        'first_login'      => 'first_practice',
        'first_pass'       => 'first_practice',
        '100_questions'    => 'hundred_questions',
        '1000_questions'   => 'thousand_q',
        'demon_slayer'     => 'master_demon',
    ];

    public function __construct(
        private readonly ReportService $reportService,
        private readonly RealmService $realmService,
    ) {}

    public static function getAchievementMeta(string $type): array
    {
        return self::TYPES[$type] ?? ['title' => $type, 'desc' => ''];
    }

    public function checkAndAward(User $user, string $type, ?array $meta = null): ?Achievement
    {
        $exists = Achievement::where('user_id', $user->id)->where('type', $type)->exists();
        if ($exists) {
            return null;
        }

        $def = self::getAchievementMeta($type);
        if ($def['title'] === $type && !isset(self::TYPES[$type])) {
            return null;
        }

        return Achievement::create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $def['title'],
            'description' => $def['desc'],
            'meta' => $meta,
            'achieved_at' => now(),
        ]);
    }

    /** 将已解锁成就转为前端 id 列表 */
    public function toFrontendIds(array $achievements): array
    {
        $ids = [];
        foreach ($achievements as $row) {
            $type = (string) ($row['type'] ?? '');
            if ($type === '') {
                continue;
            }
            $ids[] = self::LEGACY_TYPE_ALIASES[$type] ?? $type;
        }

        return array_values(array_unique($ids));
    }

    /** 批量检查所有可触发的成就 */
    public function checkAll(User $user): array
    {
        $new = [];
        $user = $user->fresh() ?? $user;

        $totalQuestions = LearningRecord::where('user_id', $user->id)->count();
        if ($totalQuestions >= 1) {
            $a = $this->checkAndAward($user, 'first_practice');
            if ($a) {
                $new[] = $a;
            }
        }
        if ($totalQuestions >= 100) {
            $a = $this->checkAndAward($user, 'hundred_questions');
            if ($a) {
                $new[] = $a;
            }
        }
        if ($totalQuestions >= 500) {
            $a = $this->checkAndAward($user, 'five_hundred_q');
            if ($a) {
                $new[] = $a;
            }
        }
        if ($totalQuestions >= 1000) {
            $a = $this->checkAndAward($user, 'thousand_q');
            if ($a) {
                $new[] = $a;
            }
        }

        $correctCount = LearningRecord::where('user_id', $user->id)->where('is_correct', true)->count();
        if ($totalQuestions > 0 && ($correctCount / $totalQuestions) >= 0.9) {
            $a = $this->checkAndAward($user, 'accuracy_90', [
                'accuracy' => round(($correctCount / $totalQuestions) * 100),
            ]);
            if ($a) {
                $new[] = $a;
            }
        }

        $streak = $this->reportService->getStreakDays($user);
        if ($streak >= 3) {
            $a = $this->checkAndAward($user, 'streak_3');
            if ($a) {
                $new[] = $a;
            }
        }
        if ($streak >= 7) {
            $a = $this->checkAndAward($user, 'streak_7');
            if ($a) {
                $new[] = $a;
            }
        }
        if ($streak >= 30) {
            $a = $this->checkAndAward($user, 'streak_30');
            if ($a) {
                $new[] = $a;
            }
        }

        $cleared = HeartDemon::where('user_id', $user->id)->where('is_mastered', true)->count();
        if ($cleared >= 10) {
            $a = $this->checkAndAward($user, 'master_demon', ['cleared' => $cleared]);
            if ($a) {
                $new[] = $a;
            }
        }

        $realmDisplayIndex = $this->getRealmDisplayIndex($user);
        $realmGroupIndex = $this->getRealmGroupIndex($user);
        if ($realmDisplayIndex >= 3) {
            $a = $this->checkAndAward($user, 'realm_l3');
            if ($a) {
                $new[] = $a;
            }
        }
        if ($realmDisplayIndex >= 6) {
            $a = $this->checkAndAward($user, 'realm_l6');
            if ($a) {
                $new[] = $a;
            }
        }
        if ($realmGroupIndex >= 1) {
            $a = $this->checkAndAward($user, 'realm_z1');
            if ($a) {
                $new[] = $a;
            }
        }
        if ($realmGroupIndex >= 2) {
            $a = $this->checkAndAward($user, 'realm_j1');
            if ($a) {
                $new[] = $a;
            }
        }
        if ($realmGroupIndex >= 3) {
            $a = $this->checkAndAward($user, 'realm_y1');
            if ($a) {
                $new[] = $a;
            }
        }

        $examSCount = ExamResult::where('user_id', $user->id)->where('grade', 'S')->count();
        if ($examSCount >= 1) {
            $a = $this->checkAndAward($user, 'exam_s');
            if ($a) {
                $new[] = $a;
            }
        }

        $examACount = ExamResult::where('user_id', $user->id)->whereIn('grade', ['A', 'S'])->count();
        if ($examACount >= 3) {
            $a = $this->checkAndAward($user, 'exam_a', ['count' => $examACount]);
            if ($a) {
                $new[] = $a;
            }
        }

        $inviteCount = $this->getInviteCount($user);
        if ($inviteCount >= 3) {
            $a = $this->checkAndAward($user, 'invite_3', ['count' => $inviteCount]);
            if ($a) {
                $new[] = $a;
            }
        }
        if ($inviteCount >= 10) {
            $a = $this->checkAndAward($user, 'invite_10', ['count' => $inviteCount]);
            if ($a) {
                $new[] = $a;
            }
        }

        return $new;
    }

    public function onLevelSubmit(User $user, array $results, int $accuracy): array
    {
        $new = $this->checkAll($user);

        $batchSize = count($results);
        if ($batchSize >= 10 && $accuracy === 100) {
            $a = $this->checkAndAward($user, 'perfect_10', ['batch_size' => $batchSize]);
            if ($a) {
                $new[] = $a;
            }
        }

        return $new;
    }

    public function onExamSubmit(User $user, string $grade): array
    {
        return $this->checkAll($user);
    }

    public function onBreakthrough(User $user): array
    {
        $new = $this->checkAll($user);
        $a = $this->checkAndAward($user, 'realm_breakthrough');
        if ($a) {
            $new[] = $a;
        }

        return $new;
    }

    public function onInviteRegistered(User $inviter): array
    {
        return $this->checkAll($inviter);
    }

    public function onShare(User $user): array
    {
        $new = [];
        $a = $this->checkAndAward($user, 'first_share');
        if ($a) {
            $new[] = $a;
        }

        return $new;
    }

    public function getUserAchievements(int $userId): array
    {
        return Achievement::where('user_id', $userId)->orderByDesc('achieved_at')->get()->toArray();
    }

    private function getRealmDisplayIndex(User $user): int
    {
        $idx = $this->realmService->getCultivationRealmIndex(
            $this->realmService->resolveCurrentRealm($user)
        );

        return $idx < 0 ? 1 : $idx + 1;
    }

    private function getRealmGroupIndex(User $user): int
    {
        $idx = $this->realmService->getCultivationRealmIndex(
            $this->realmService->resolveCurrentRealm($user)
        );

        return $idx < 0 ? 0 : intdiv($idx, 9);
    }

    private function getInviteCount(User $user): int
    {
        $code = trim((string) ($user->invite_code ?? ''));
        if ($code === '') {
            return 0;
        }

        return User::where('invited_by', $code)->count();
    }
}
