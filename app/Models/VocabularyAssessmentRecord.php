<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VocabularyAssessmentRecord extends Model
{
    protected $table = 'levelup_vocabulary_assessment_records';

    public $timestamps = false;

    protected $fillable = [
        'assessment_id',
        'user_id',
        'question_id',
        'question_type',
        'assessment_level',
        'play_mode',
        'user_answer',
        'correct_answer',
        'is_correct',
        'expected_time',
        'time_spent',
        'level_before',
        'level_after',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'assessment_level' => 'integer',
            'is_correct' => 'integer',
            'expected_time' => 'integer',
            'time_spent' => 'integer',
            'level_before' => 'integer',
            'level_after' => 'integer',
            'created_at' => 'datetime',
        ];
    }
}
