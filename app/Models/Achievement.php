<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Achievement extends Model
{
    protected $table = 'levelup_achievements';
    protected $fillable = ['user_id', 'type', 'title', 'description', 'meta', 'achieved_at'];
    protected function casts(): array { return ['meta' => 'array', 'achieved_at' => 'datetime']; }
}
