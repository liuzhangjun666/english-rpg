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
        'is_guest',
        'guest_key',
        'story_progress',
        'progress_currency',
        'current_chapter',
        'current_node',
        'dao_heart',
        'story_keys',
        'unlocked_nodes',
        // 邀请系统：migration 2026_05_01_000007 增加的字段，没加进 fillable 会让
        // ShareRewardService::getInviteCode() 的 mass-assignment 静默失败，
        // 导致新用户永远没有邀请码。
        'invite_code',
        'invited_by',
        'share_enabled',
        'invite_first_clear_rewarded_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'guest_key',
    ];

    protected function casts(): array
    {
        return [
            'vip_expired_at' => 'datetime',
            'last_login_at' => 'datetime',
            'initiation_completed_at' => 'datetime',
            'spirit_power_last_recover_at' => 'datetime',
            'invite_first_clear_rewarded_at' => 'datetime',
            'password' => 'hashed',
            'is_minor' => 'boolean',
            'is_guest' => 'boolean',
            'parent_verified' => 'boolean',
            'cultivation_energy' => 'integer',
            'vocabulary' => 'integer',
            'grammar' => 'integer',
            'reading' => 'integer',
            'listening' => 'integer',
            'writing' => 'integer',
            'speaking' => 'integer',
            'story_progress' => 'array',
            'progress_currency' => 'array',
            'current_chapter' => 'string',
            'current_node' => 'string',
            'dao_heart' => 'integer',
            'story_keys' => 'integer',
            'unlocked_nodes' => 'array',
        ];
    }
}
