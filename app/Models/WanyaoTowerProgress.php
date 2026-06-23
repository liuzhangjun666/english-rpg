<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class WanyaoTowerProgress extends Model
{
    protected $table = 'wanyao_tower_progress';
    protected $primaryKey = 'user_id';
    public $incrementing = false;
    protected $fillable = ['user_id','current_floor','highest_floor','current_run_id'];
    public function user() { return $this->belongsTo(User::class); }
    public function currentRun() { return $this->belongsTo(WanyaoTowerRun::class, 'current_run_id'); }
}
