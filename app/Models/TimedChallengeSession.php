<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TimedChallengeSession extends Model
{
    protected $table = 'levelup_timed_challenge_sessions';

    protected $fillable = [
        'challenge_id',
        'user_id',
        'module_type',
        'level',
        'stage',
        'duration_sec',
        'spirit_cost',
        'status',
        'started_at',
        'ended_at',
        'total_answered',
        'correct_count',
        'final_score',
        'current_combo',
        'highest_combo',
        'asked_question_ids',
        'weak_tag_stats',
        'rewards_granted',
        'exp_gained',
        'points_gained',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'asked_question_ids' => 'array',
            'weak_tag_stats' => 'array',
            'rewards_granted' => 'boolean',
        ];
    }
}

