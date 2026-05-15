<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WritingPrompt extends Model
{
    protected $table = 'levelup_writing_prompts';

    protected $fillable = [
        'prompt_id',
        'writing_type',
        'realm',
        'stage',
        'title',
        'topic',
        'passage',
        'word_limit_min',
        'word_limit_max',
        'scoring_criteria',
    ];

    protected function casts(): array
    {
        return [
            'scoring_criteria' => 'array',
        ];
    }

    public function results(): HasMany
    {
        return $this->hasMany(WritingResult::class, 'prompt_id', 'prompt_id');
    }
}
