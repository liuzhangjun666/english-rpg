<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VocabProgress extends Model
{
    protected $table = 'levelup_vocab_progress';

    protected $fillable = [
        'user_id',
        'word',
        'status',
        'mastery_score',
        'correct_count',
        'error_count',
        'last_reviewed_at',
        'next_review_at',
    ];

    protected function casts(): array
    {
        return [
            'last_reviewed_at' => 'datetime',
            'next_review_at' => 'datetime',
        ];
    }
}
