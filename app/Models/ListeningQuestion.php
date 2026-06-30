<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ListeningQuestion extends Model
{
    protected $table = 'listening_questions';

    protected $fillable = [
        'passage_id',
        'question_no',
        'question',
        'options',
        'correct_answer',
        'explanation',
        'word',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
        ];
    }

    public function passage(): BelongsTo
    {
        return $this->belongsTo(ListeningPassage::class, 'passage_id');
    }
}
