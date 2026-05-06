<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LearningRecord extends Model
{
    protected $table = 'levelup_learning_records';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'activity_type',
        'activity_id',
        'question_id',
        'is_correct',
        'exp_gained',
        'spirit_cost',
        'time_spent',
        'answer_data',
    ];

    protected function casts(): array
    {
        return [
            'is_correct' => 'boolean',
            'answer_data' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
