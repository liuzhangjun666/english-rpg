<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReadingPassage extends Model
{
    protected $table = 'reading_passages';

    protected $fillable = [
        'passage_code',
        'level_tag',
        'grade_level',
        'realm',
        'stage',
        'title',
        'content',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    public function questions(): HasMany
    {
        return $this->hasMany(ReadingQuestion::class, 'passage_id');
    }
}

