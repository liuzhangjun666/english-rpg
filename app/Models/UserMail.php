<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserMail extends Model
{
    protected $table = 'levelup_user_mails';

    protected $fillable = [
        'user_id',
        'mail_id',
        'read_at',
        'claimed_at',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
            'claimed_at' => 'datetime',
        ];
    }
}
