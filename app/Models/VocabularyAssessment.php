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
        'vocab_current_level',
        'grammar_current_level',
        'final_level',
        'vocab_final_level',
        'grammar_final_level',
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
            'vocab_current_level' => 'integer',
            'grammar_current_level' => 'integer',
            'final_level' => 'integer',
            'vocab_final_level' => 'integer',
            'grammar_final_level' => 'integer',
            'total_questions' => 'integer',
            'answered_count' => 'integer',
            'correct_count' => 'integer',
            'accuracy' => 'float',
            'level_result_json' => 'array',
            'suggestion_json' => 'array',
        ];
    }
}
