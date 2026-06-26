<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserItem extends Model
{
    protected $table = 'levelup_user_items';
    public $timestamps = false;
    protected $fillable = ['user_id', 'item_id', 'quantity', 'purchased_at', 'expires_at'];
    protected function casts(): array { return ['purchased_at' => 'datetime', 'expires_at' => 'datetime']; }
}
