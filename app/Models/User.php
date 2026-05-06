<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'levelup_users';

    protected $fillable = [
        'phone',
        'nickname',
        'avatar_url',
        'realm',
        'realm_stage',
        'exp',
        'spirit_power',
        'spirit_power_max',
        'spirit_stone',
        'spirit_power_date',
        'vip_type',
        'vip_expired_at',
        'is_minor',
        'parent_phone',
        'parent_verified',
        'daily_minutes',
        'daily_minutes_date',
        'password',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'vip_expired_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'is_minor' => 'boolean',
            'parent_verified' => 'boolean',
        ];
    }
}
