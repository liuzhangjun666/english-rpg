<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Mail extends Model
{
    protected $table = 'levelup_mails';

    protected $fillable = [
        'title',
        'body',
        'type',
        'sender',
        'rewards',
        'action',
        'is_broadcast',
        'target_user_id',
        'published_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'rewards' => 'array',
            'is_broadcast' => 'boolean',
            'published_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    /** 已发布且未过期 */
    public function scopeActive(Builder $query): Builder
    {
        $now = now();

        return $query
            ->where(fn ($q) => $q->whereNull('published_at')->orWhere('published_at', '<=', $now))
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', $now));
    }

    /** 对指定用户可见：全员广播 或 定向给该用户 */
    public function scopeVisibleTo(Builder $query, int $userId): Builder
    {
        return $query->where(function ($q) use ($userId) {
            $q->where('is_broadcast', true)
              ->orWhere('target_user_id', $userId);
        });
    }
}
