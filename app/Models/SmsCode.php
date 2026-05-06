<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SmsCode extends Model
{
    protected $table = 'levelup_sms_codes';

    protected $fillable = [
        'phone', 'code', 'action', 'expires_at', 'used_at', 'attempts',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
    ];

    public function scopeValid($query, string $phone, string $code, string $action = 'login')
    {
        return $query->where('phone', $phone)
            ->where('code', $code)
            ->where('action', $action)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->where('attempts', '<', 5);
    }
}
