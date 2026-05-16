<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HeartDemon;
use App\Models\LearningRecord;
use App\Models\User;
use App\Support\CultivationProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeaderboardController extends Controller
{
    /** GET /api/leaderboard?type=streak|volume|accuracy|demon_clear|realm */
    public function index(Request $request): JsonResponse
    {
        $type = $request->query('type', 'streak');
        $limit = max(10, min(100, (int) $request->query('limit', 50)));
        $user = $request->user();

        $rows = match ($type) {
            'volume' => $this->weeklyVolume($limit),
            'accuracy' => $this->weeklyAccuracy($limit),
            'demon_clear' => $this->demonClear($limit),
            'realm' => $this->realmProgress($limit),
            default => $this->streakBoard($limit),
        };

        $leaderboard = [];
        $myRank = null;
        $totalUsers = max(1, (int) User::count());
        foreach ($rows as $idx => $row) {
            $rank = $idx + 1;
            $leaderboard[] = [
                'rank' => $rank,
                'user_id' => (int) $row['user_id'],
                'nickname' => (string) $row['nickname'],
                'realm' => (string) ($row['realm'] ?? ''),
                'realm_name' => $this->getRealmName((string) ($row['realm'] ?? '')),
                'realm_stage' => (int) ($row['realm_stage'] ?? 1),
                'metric' => (float) ($row['metric'] ?? 0),
                'metric_text' => (string) ($row['metric_text'] ?? ''),
            ];
            if ((int) $row['user_id'] === (int) $user->id) {
                $myRank = $rank;
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'type' => $type,
                'leaderboard' => $leaderboard,
                'my_rank' => $myRank,
                'my_percentile' => $myRank ? max(1, (int) round((1 - (($myRank - 1) / $totalUsers)) * 100)) : null,
            ],
        ]);
    }

    private function weeklyVolume(int $limit): array
    {
        $from = now()->subDays(6)->startOfDay();
        $rows = LearningRecord::where('created_at', '>=', $from)
            ->selectRaw('user_id, COUNT(*) as metric')
            ->groupBy('user_id')
            ->orderByDesc('metric')
            ->limit($limit)
            ->get();

        return $this->withUserMeta($rows->map(fn ($r) => [
            'user_id' => (int) $r->user_id,
            'metric' => (int) $r->metric,
            'metric_text' => (int) $r->metric . ' 题',
        ])->toArray());
    }

    private function weeklyAccuracy(int $limit): array
    {
        $from = now()->subDays(6)->startOfDay();
        $rows = LearningRecord::where('created_at', '>=', $from)
            ->selectRaw('user_id, COUNT(*) as total, SUM(CASE WHEN is_correct=1 THEN 1 ELSE 0 END) as correct')
            ->groupBy('user_id')
            ->havingRaw('COUNT(*) >= 20')
            ->get()
            ->map(function ($r) {
                $total = max(1, (int) $r->total);
                $acc = (int) round(((int) $r->correct / $total) * 100);
                return [
                    'user_id' => (int) $r->user_id,
                    'metric' => $acc,
                    'metric_text' => $acc . '%',
                ];
            })
            ->sortByDesc('metric')
            ->take($limit)
            ->values()
            ->toArray();

        return $this->withUserMeta($rows);
    }

    private function demonClear(int $limit): array
    {
        $rows = HeartDemon::where('is_mastered', true)
            ->selectRaw('user_id, COUNT(*) as metric')
            ->groupBy('user_id')
            ->orderByDesc('metric')
            ->limit($limit)
            ->get();

        return $this->withUserMeta($rows->map(fn ($r) => [
            'user_id' => (int) $r->user_id,
            'metric' => (int) $r->metric,
            'metric_text' => (int) $r->metric . ' 题',
        ])->toArray());
    }

    private function streakBoard(int $limit): array
    {
        $from = now()->subDays(90)->startOfDay();
        $rows = LearningRecord::where('created_at', '>=', $from)
            ->selectRaw('user_id, DATE(created_at) as d')
            ->groupBy('user_id', DB::raw('DATE(created_at)'))
            ->orderByDesc('d')
            ->get()
            ->groupBy('user_id');

        $items = [];
        foreach ($rows as $userId => $dates) {
            $dateList = $dates->pluck('d')->values()->all();
            $streak = $this->calcStreak($dateList);
            if ($streak <= 0) continue;
            $items[] = [
                'user_id' => (int) $userId,
                'metric' => $streak,
                'metric_text' => $streak . ' 天',
            ];
        }

        usort($items, fn ($a, $b) => ((int) $b['metric']) <=> ((int) $a['metric']));
        return $this->withUserMeta(array_slice($items, 0, $limit));
    }

    private function realmProgress(int $limit): array
    {
        $realmOrder = [];
        $idx = 1;
        foreach (['L', 'Z', 'J', 'Y', 'H', 'X', 'T', 'D', 'U'] as $prefix) {
            for ($layer = 1; $layer <= 9; $layer++) {
                $realmOrder[$prefix . $layer] = $idx++;
            }
        }
        $orderSql = collect($realmOrder)->map(fn ($v, $k) => "WHEN '$k' THEN $v")->implode(' ');

        return User::query()
            ->orderByRaw("CASE realm {$orderSql} ELSE 99 END")
            ->orderByDesc('realm_stage')
            ->orderByDesc('exp')
            ->limit($limit)
            ->get(['id as user_id', 'nickname', 'realm', 'realm_stage', 'exp'])
            ->map(fn ($u) => [
                'user_id' => (int) $u->user_id,
                'nickname' => $u->nickname,
                'realm' => $u->realm,
                'realm_stage' => (int) $u->realm_stage,
                'metric' => (int) $u->exp,
                'metric_text' => (int) $u->exp . ' 经验',
            ])->toArray();
    }

    private function withUserMeta(array $items): array
    {
        if (!$items) return [];
        $ids = array_values(array_unique(array_map(fn ($x) => (int) $x['user_id'], $items)));
        $users = User::whereIn('id', $ids)->get(['id', 'nickname', 'realm', 'realm_stage'])->keyBy('id');

        $merged = [];
        foreach ($items as $item) {
            $u = $users->get((int) $item['user_id']);
            if (!$u) continue;
            $merged[] = array_merge($item, [
                'nickname' => (string) $u->nickname,
                'realm' => (string) $u->realm,
                'realm_stage' => (int) $u->realm_stage,
            ]);
        }
        return $merged;
    }

    private function calcStreak(array $dates): int
    {
        if (empty($dates)) return 0;
        $set = array_flip($dates);
        $today = now()->format('Y-m-d');
        $check = isset($set[$today]) ? $today : now()->subDay()->format('Y-m-d');
        $streak = 0;
        while (isset($set[$check])) {
            $streak++;
            $check = date('Y-m-d', strtotime($check . ' -1 day'));
        }
        return $streak;
    }

    private function getRealmName(string $realm): string
    {
        return CultivationProfile::realmName($realm);
    }
}
