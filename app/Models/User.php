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
        'school_grade',
        'avatar_url',
        'realm',
        'realm_stage',
        'exp',
        'current_realm',
        'cultivation_energy',
        'vocabulary',
        'grammar',
        'reading',
        'listening',
        'writing',
        'speaking',
        'spirit_power',
        'spirit_power_max',
        'spirit_stone',
        'spirit_power_date',
        'spirit_power_last_recover_at',
        'vip_type',
        'vip_expired_at',
        'is_minor',
        'parent_phone',
        'parent_verified',
        'daily_minutes',
        'daily_minutes_date',
        'password',
        'last_login_at',
        'initiation_completed_at',
        'tutorial_step',
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
            'initiation_completed_at' => 'datetime',
            'spirit_power_last_recover_at' => 'datetime',
            'password' => 'hashed',
            'is_minor' => 'boolean',
            'parent_verified' => 'boolean',
            'cultivation_energy' => 'integer',
            'vocabulary' => 'integer',
            'grammar' => 'integer',
            'reading' => 'integer',
            'listening' => 'integer',
            'writing' => 'integer',
            'speaking' => 'integer',
        ];
    }
}
