<?php

use App\Models\VocabularyWord;
use App\Support\VocabularyMeaningNormalizer;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $updated = 0;

        VocabularyWord::query()
            ->whereNotNull('meanings')
            ->orderBy('id')
            ->chunkById(200, function ($words) use (&$updated) {
                foreach ($words as $word) {
                    $original = is_array($word->meanings) ? $word->meanings : [];
                    $normalized = VocabularyMeaningNormalizer::normalize($original);
                    if (json_encode($original, JSON_UNESCAPED_UNICODE) === json_encode($normalized, JSON_UNESCAPED_UNICODE)) {
                        continue;
                    }

                    $word->update(['meanings' => $normalized]);
                    $updated++;
                }
            });

        echo "Normalized vocabulary meanings: {$updated}\n";
    }

    public function down(): void
    {
        // 数据修复不可安全回滚
    }
};
