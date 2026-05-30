<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserLearningProfile extends Model
{
    protected $table = 'levelup_user_learning_profiles';

    protected $fillable = [
        'user_id',
        'school_stage',
        'learning_goal',
        'initial_assessment_done',
        'initial_level',
        'current_level',
        'initial_realm',
        'current_realm',
        'current_stage',
        'vocabulary_realm',
        'vocabulary_level',
    ];

    protected function casts(): array
    {
        return [
            'initial_assessment_done' => 'integer',
            'initial_level' => 'integer',
            'current_level' => 'integer',
            'vocabulary_level' => 'integer',
        ];
    }
}
