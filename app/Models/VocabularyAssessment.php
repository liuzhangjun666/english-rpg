<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VocabularyAssessment extends Model
{
    protected $table = 'levelup_vocabulary_assessments';

    protected $fillable = [
        'user_id',
        'school_stage',
        'learning_goal',
        'start_level',
        'current_level',
        'final_level',
        'total_questions',
        'answered_count',
        'correct_count',
        'accuracy',
        'final_realm',
        'final_stage',
        'level_result_json',
        'suggestion_json',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'start_level' => 'integer',
            'current_level' => 'integer',
            'final_level' => 'integer',
            'total_questions' => 'integer',
            'answered_count' => 'integer',
            'correct_count' => 'integer',
            'accuracy' => 'float',
            'level_result_json' => 'array',
            'suggestion_json' => 'array',
        ];
    }
}
