<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WritingResult extends Model
{
    protected $table = 'levelup_writing_results';

    protected $fillable = [
        'user_id',
        'prompt_id',
        'content',
        'word_count',
        'ai_score',
        'ai_feedback',
        'ai_details',
        'exp_gained',
        'stones_gained',
    ];

    protected function casts(): array
    {
        return [
            'ai_details' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function prompt(): BelongsTo
    {
        return $this->belongsTo(WritingPrompt::class, 'prompt_id', 'prompt_id');
    }
}
