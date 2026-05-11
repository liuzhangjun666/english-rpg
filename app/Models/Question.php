<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    protected $table = 'levelup_questions';

    protected $fillable = [
        'question_id',
        'type',
        'realm',
        'stage',
        'listening_text',
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
}
