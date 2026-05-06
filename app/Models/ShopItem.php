<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopItem extends Model
{
    protected $table = 'levelup_mall_items';
    protected $fillable = ['item_id', 'name', 'description', 'category', 'price_stones', 'icon', 'effect', 'is_active'];
    protected function casts(): array { return ['effect' => 'array', 'is_active' => 'boolean']; }
}

class UserItem extends Model
{
    protected $table = 'levelup_user_items';
    protected $fillable = ['user_id', 'item_id', 'quantity', 'purchased_at', 'expires_at'];
    protected function casts(): array { return ['purchased_at' => 'datetime', 'expires_at' => 'datetime']; }
}
