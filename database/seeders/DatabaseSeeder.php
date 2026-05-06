<?php

namespace Database\Seeders;

use App\Models\LevelConfig;
use App\Models\Question;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedLevelConfig();
        $this->call(QuestionSeeder::class);
        $this->call(QuestionExpansionSeeder::class);
    }

    private function seedLevelConfig(): void
    {
        $levels = [];
        $realmNames = ['L1' => '练气初', 'L2' => '练气初', 'L3' => '练气初'];
        $order = 0;

        // 词汇关卡 L1-01 ~ L3-09
        foreach (['L1', 'L2', 'L3'] as $realm) {
            for ($s = 1; $s <= 9; $s++) {
                $order++;
                $stageStr = str_pad((string)$s, 2, '0', STR_PAD_LEFT);
                $levels[] = [
                    'level_id' => "{$realm}-{$stageStr}",
                    'realm' => $realm,
                    'stage' => $s,
                    'type' => 'vocab',
                    'title' => "{$realmNames[$realm]}·采药识灵{$stageStr}",
                    'description' => "第{$s}关：采药识灵",
                    'question_count' => $s <= 3 ? 15 : ($s <= 6 ? 18 : 20),
                    'exp_reward' => 10 + $s * 5,
                    'unlock_condition' => $s === 1 ? null : ($s === 10 ? "exam:{$realm}" : "{$realm}-" . str_pad((string)($s - 1), 2, '0', STR_PAD_LEFT)),
                    'sort_order' => $order,
                ];
            }
        }

        // 语法关卡 L1-01 ~ L3-09
        foreach (['L1', 'L2', 'L3'] as $realm) {
            for ($s = 1; $s <= 9; $s++) {
                $order++;
                $stageStr = str_pad((string)$s, 2, '0', STR_PAD_LEFT);
                $levels[] = [
                    'level_id' => "{$realm}-{$stageStr}-grammar",
                    'realm' => $realm,
                    'stage' => $s,
                    'type' => 'grammar',
                    'title' => "{$realmNames[$realm]}·基础功法{$stageStr}",
                    'description' => "第{$s}关：基础功法",
                    'question_count' => 10,
                    'exp_reward' => 8 + $s * 4,
                    'unlock_condition' => "{$realm}-{$stageStr}",
                    'sort_order' => $order,
                ];
            }
        }

        foreach ($levels as $level) {
            LevelConfig::create($level);
        }

        echo "Seeded " . count($levels) . " level configs.\n";
    }
}
