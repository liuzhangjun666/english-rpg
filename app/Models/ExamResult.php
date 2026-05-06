<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamResult extends Model
{
    protected $table = 'levelup_exam_results';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'realm',
        'score',
        'total_questions',
        'correct_count',
        'time_spent',
        'grade',
        'passed',
        'breakdown',
    ];

    protected function casts(): array
    {
        return [
            'passed' => 'boolean',
            'breakdown' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
