<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VocabularyWord extends Model
{
    protected $table = 'vocabulary_words';

    protected $fillable = [
        'lemma',
        'phonetic',
        'pos',
        'grade_level',
        'level_tag',
        'tier',
        'theme',
        'meanings',
        'examples',
    ];

    protected function casts(): array
    {
        return [
            'meanings' => 'array',
            'examples' => 'array',
        ];
    }
}

