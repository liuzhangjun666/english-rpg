<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaderboardController extends Controller
{
    /** GET /api/leaderboard?type=realm|exp|streak */
    public function index(Request $request): JsonResponse
    {
        $type = $request->query('type', 'realm');
        $users = [];

        switch ($type) {
            case 'realm':
                // 境界榜：按境界等级+修为排序
                $realmOrder = ['L1'=>1,'L2'=>2,'L3'=>3,'L4'=>4,'L5'=>5,'L6'=>6,'L7'=>7,'L8'=>8,'L9'=>9,'Z1'=>10,'Z2'=>11,'Z3'=>12,'J1'=>13,'J2'=>14,'J3'=>15,'Y1'=>16,'Y2'=>17,'Y3'=>18,'H1'=>19,'H2'=>20,'H3'=>21,'D1'=>22,'D2'=>23,'D3'=>24];
                $users = User::orderByRaw("CASE realm ".collect($realmOrder)->map(fn($v,$k)=>"WHEN '$k' THEN $v")->implode(' ')." ELSE 99 END")
                    ->orderByDesc('exp')->limit(50)->get(['id','nickname','realm','realm_stage','exp']);
                break;
            case 'exp':
                $users = User::orderByDesc('exp')->limit(50)->get(['id','nickname','realm','realm_stage','exp']);
                break;
            case 'streak':
                // 连续修炼榜（从学习记录中聚合）
                $users = User::orderByDesc('daily_minutes')->limit(50)->get(['id','nickname','realm','realm_stage','exp','daily_minutes']);
                break;
            default:
                $users = User::orderByDesc('exp')->limit(50)->get(['id','nickname','realm','realm_stage','exp']);
        }

        // 取当前用户排名
        $ranked = [];
        $rankMap = [];
        foreach ($users as $i => $u) {
            $rank = $i + 1;
            $rankMap[$u->id] = $rank;
            $ranked[] = [
                'rank' => $rank,
                'nickname' => $u->nickname,
                'realm' => $u->realm,
                'realm_name' => $this->getRealmName($u->realm),
                'stage' => $u->realm_stage,
                'exp' => $u->exp,
            ];
        }

        $myRank = $rankMap[$request->user()->id] ?? null;

        return response()->json([
            'success' => true,
            'data' => [
                'type' => $type,
                'leaderboard' => $ranked,
                'my_rank' => $myRank,
            ],
        ]);
    }

    private function getRealmName(string $realm): string
    {
        $map = ['L1'=>'练气初','L2'=>'练气中','L3'=>'练气后','L4'=>'筑基','L5'=>'筑基中','L6'=>'筑基后','J1'=>'金丹','Y1'=>'元婴','H1'=>'化神','D1'=>'大乘'];
        return $map[$realm] ?? $realm;
    }
}
