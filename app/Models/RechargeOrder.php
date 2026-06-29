<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RechargeOrder extends Model
{
    protected $table = 'levelup_recharge_orders';

    protected $fillable = [
        'order_no',
        'user_id',
        'product_key',
        'amount_cents',
        'currency',
        'status',
        'pay_channel',
        'provider_trade_no',
        'paid_at',
        'client_meta',
    ];

    protected function casts(): array
    {
        return [
            'amount_cents' => 'integer',
            'paid_at' => 'datetime',
            'client_meta' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
