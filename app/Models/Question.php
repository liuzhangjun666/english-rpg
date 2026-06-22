<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    protected $table = 'levelup_questions';

    protected $fillable = [
        'question_id',
        'type',
        'play_mode',
        'scene',
        'education_stage',
        'grade_level',
        'assessment_level',
        'is_assessment',
        'expected_time',
        'realm',
        'stage',
        'word_id',
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
            'assessment_level' => 'integer',
            'is_assessment' => 'integer',
            'expected_time' => 'integer',
        ];
    }

    public function vocabularyWord()
    {
        return $this->belongsTo(VocabularyWord::class, 'word_id');
    }
}
