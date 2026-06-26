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
    // 表用 purchased_at 代替 created_at，且无 updated_at 列，因此关闭自动时间戳，
    // 否则 UserItem::create() 会尝试写入不存在的 created_at/updated_at 而报错。
    public $timestamps = false;
    protected $fillable = ['user_id', 'item_id', 'quantity', 'purchased_at', 'expires_at'];
    protected function casts(): array { return ['purchased_at' => 'datetime', 'expires_at' => 'datetime']; }
}
