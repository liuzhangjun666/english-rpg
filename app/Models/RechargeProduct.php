<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RechargeProduct extends Model
{
    protected $table = 'levelup_recharge_products';

    protected $fillable = [
        'product_key',
        'name',
        'description',
        'category',
        'price_cents',
        'jade_amount',
        'bonus_jade',
        'vip_days',
        'vip_type',
        'payload',
        'limits',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'price_cents' => 'integer',
            'jade_amount' => 'integer',
            'bonus_jade' => 'integer',
            'vip_days' => 'integer',
            'payload' => 'array',
            'limits' => 'array',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
