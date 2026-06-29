<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JadeLedger extends Model
{
    public $timestamps = false;

    protected $table = 'levelup_jade_ledger';

    protected $fillable = [
        'user_id',
        'delta',
        'balance_after',
        'source_type',
        'source_id',
        'remark',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'delta' => 'integer',
            'balance_after' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
