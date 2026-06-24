<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class WanyaoTowerProgress extends Model
{
    protected $table = 'wanyao_tower_progress';
    protected $primaryKey = 'user_id';
    public $incrementing = false;
    protected $fillable = ['user_id','current_floor','highest_floor','current_run_id'];
    // DB 列默认值（current_floor=1 / highest_floor=0）不会自动注入 firstOrCreate 新建的
    // 内存模型，导致用户首次 status/start 时读到 null。在模型层补默认值，保证新实例与 DB 一致。
    protected $attributes = ['current_floor' => 1, 'highest_floor' => 0];
    public function user() { return $this->belongsTo(User::class); }
    public function currentRun() { return $this->belongsTo(WanyaoTowerRun::class, 'current_run_id'); }
}
