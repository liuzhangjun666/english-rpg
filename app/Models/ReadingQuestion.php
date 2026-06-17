<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReadingQuestion extends Model
{
    protected $table = 'reading_questions';

    protected $fillable = [
        'passage_id',
        'question_no',
        'question_type',
        'question',
        'options',
        'correct_answer',
        'answer_accept',
        'explanation',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'answer_accept' => 'array',
        ];
    }

    public function passage(): BelongsTo
    {
        return $this->belongsTo(ReadingPassage::class, 'passage_id');
    }
}

