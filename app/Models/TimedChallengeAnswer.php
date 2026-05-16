<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TimedChallengeAnswer extends Model
{
    protected $table = 'levelup_timed_challenge_answers';

    protected $fillable = [
        'session_id',
        'question_id',
        'knowledge_tag',
        'user_answer',
        'is_correct',
        'elapsed_ms',
        'score_delta',
    ];

    protected function casts(): array
    {
        return [
            'is_correct' => 'boolean',
        ];
    }
}

