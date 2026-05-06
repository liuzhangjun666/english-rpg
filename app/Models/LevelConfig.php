<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LevelConfig extends Model
{
    protected $table = 'levelup_level_config';

    protected $fillable = [
        'level_id',
        'realm',
        'stage',
        'type',
        'title',
        'description',
        'question_count',
        'exp_reward',
        'unlock_condition',
        'sort_order',
    ];
}
