<?php

return [
    /** 每位道友每日可开启的普通秘境次数 */
    'daily_plays' => (int) env('MIJING_DAILY_PLAYS', 1),

    /** 每位道友每周可开启的世界挑战次数 */
    'boss_weekly_plays' => (int) env('MIJING_BOSS_WEEKLY_PLAYS', 1),

    /**
     * 按最终得分档位发放奖励（从高到低匹配，取首个满足 min_score 的档位）。
     */
    'score_tiers' => [
        'normal' => [
            ['min_score' => 300, 'exp' => 45, 'spirit_stone' => 12],
            ['min_score' => 220, 'exp' => 33, 'spirit_stone' => 8],
            ['min_score' => 120, 'exp' => 18, 'spirit_stone' => 5],
            ['min_score' => 1, 'exp' => 5, 'spirit_stone' => 0],
        ],
        'boss' => [
            ['min_score' => 400, 'exp' => 70, 'spirit_stone' => 20],
            ['min_score' => 300, 'exp' => 50, 'spirit_stone' => 14],
            ['min_score' => 180, 'exp' => 30, 'spirit_stone' => 8],
            ['min_score' => 1, 'exp' => 8, 'spirit_stone' => 0],
        ],
    ],
];
