<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HeartDemon extends Model
{
    protected $table = 'levelup_heart_demons';

    protected $fillable = [
        'user_id', 'question_id', 'word', 'realm', 'type',
        'wrong_count', 'reviewed_count', 'mastery',
        'last_wrong_at', 'last_reviewed_at', 'next_review_at', 'is_mastered',
    ];

    protected function casts(): array
    {
        return [
            'last_wrong_at' => 'datetime',
            'last_reviewed_at' => 'datetime',
            'next_review_at' => 'datetime',
            'is_mastered' => 'boolean',
        ];
    }
}
