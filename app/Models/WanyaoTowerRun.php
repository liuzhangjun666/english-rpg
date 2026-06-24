<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class WanyaoTowerRun extends Model
{
    protected $table = 'wanyao_tower_runs';
    protected $fillable = [
        'user_id','floor','questions_json','boss_question_id',
        'status','correct_count','started_at','ended_at',
    ];
    protected $casts = [
        'questions_json' => 'array',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];
    public function user() { return $this->belongsTo(User::class); }
}
