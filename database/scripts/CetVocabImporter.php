<?php

use App\Models\VocabularyWord;
use Illuminate\Support\Facades\Http;

/**
 * 从 KyleBing/english-vocabulary 拉取四六级词库并转为 vocabulary_words 格式。
 */
class CetVocabImporter
{
    private const SOURCES = [
        'CET4' => 'https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/json_original/json-simple/CET4luan_1.json',
        'CET6' => 'https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/json_original/json-simple/CET6luan_1.json',
    ];

    /** @return array{created:int,updated:int,skipped:int,exported:array<int,array<string,mixed>>} */
    public function importToDatabase(bool $writeJson = true): array
    {
        $exported = [];
        $created = 0;
        $updated = 0;
        $skipped = 0;

        foreach (self::SOURCES as $cetLevel => $url) {
            $rows = $this->fetchAndConvert($url, $cetLevel);
            foreach ($rows as $row) {
                $lemma = (string) $row['lemma'];
                $existing = VocabularyWord::query()->where('lemma', $lemma)->first();

                if (!$existing) {
                    VocabularyWord::create($row);
                    $created++;
                    $exported[] = $row;
                    continue;
                }

                $merged = $this->mergeExisting($existing, $row, $cetLevel);
                if ($merged === null) {
                    $skipped++;
                    continue;
                }

                $existing->fill($merged);
                $existing->save();
                $updated++;
                $exported[] = array_merge($row, [
                    'level_tag' => $existing->level_tag,
                    'grade_level' => $existing->grade_level,
                    'meanings' => $existing->meanings,
                ]);
            }
        }

        if ($writeJson) {
            $path = database_path('seeders/data/vocabulary_words_import_大学四六级.json');
            file_put_contents(
                $path,
                json_encode($exported, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
            );
        }

        return compact('created', 'updated', 'skipped', 'exported');
    }

    /** @return list<array<string,mixed>> */
    public function fetchAndConvert(string $url, string $cetLevel): array
    {
        $response = Http::withoutVerifying()->timeout(120)->get($url);
        if (!$response->successful()) {
            throw new RuntimeException("Failed to download vocabulary: {$url} (HTTP {$response->status()})");
        }

        $payload = $response->json();
        if (!is_array($payload)) {
            throw new RuntimeException("Invalid vocabulary JSON from {$url}");
        }

        $out = [];
        foreach ($payload as $item) {
            if (!is_array($item)) {
                continue;
            }
            $lemma = trim((string) ($item['word'] ?? ''));
            if ($lemma === '') {
                continue;
            }

            $meanings = [];
            $posParts = [];
            foreach ($item['translations'] ?? [] as $tr) {
                if (!is_array($tr)) {
                    continue;
                }
                $text = trim((string) ($tr['translation'] ?? ''));
                if ($text !== '') {
                    $meanings[] = $text;
                }
                $pos = trim((string) ($tr['type'] ?? ''));
                if ($pos !== '') {
                    $posParts[] = $pos;
                }
            }
            $meanings = array_values(array_unique(array_filter($meanings)));
            if ($meanings === []) {
                continue;
            }

            $examples = [];
            foreach ($item['phrases'] ?? [] as $phrase) {
                if (!is_array($phrase)) {
                    continue;
                }
                $p = trim((string) ($phrase['phrase'] ?? ''));
                $t = trim((string) ($phrase['translation'] ?? ''));
                if ($p !== '' && $t !== '') {
                    $examples[] = "{$p} — {$t}";
                }
            }

            $out[] = [
                'lemma' => $lemma,
                'phonetic' => isset($item['ukphone']) ? (string) $item['ukphone'] : (isset($item['usphone']) ? (string) $item['usphone'] : null),
                'pos' => $posParts !== [] ? implode('/', array_unique($posParts)) : null,
                'level_tag' => '大学',
                'grade_level' => $cetLevel,
                'meanings' => $meanings,
                'examples' => $examples !== [] ? array_slice($examples, 0, 5) : null,
            ];
        }

        return $out;
    }

    /** @param array<string,mixed> $incoming */
    private function mergeExisting(VocabularyWord $existing, array $incoming, string $cetLevel): ?array
    {
        $grade = trim((string) ($existing->grade_level ?? ''));
        if ($grade !== '' && str_contains($grade, $cetLevel)) {
            return null;
        }

        $grades = array_filter(array_map('trim', explode(',', $grade)));
        $grades[] = $cetLevel;
        $grades = array_values(array_unique($grades));

        $meanings = array_values(array_unique(array_merge(
            is_array($existing->meanings) ? $existing->meanings : [],
            is_array($incoming['meanings'] ?? null) ? $incoming['meanings'] : [],
        )));

        $examples = array_values(array_unique(array_merge(
            is_array($existing->examples) ? $existing->examples : [],
            is_array($incoming['examples'] ?? null) ? $incoming['examples'] : [],
        )));

        $levelTag = (string) ($existing->level_tag ?? '');
        if (!in_array($levelTag, ['小学', '初中', '高中'], true)) {
            $levelTag = '大学';
        }

        return [
            'phonetic' => $existing->phonetic ?: ($incoming['phonetic'] ?? null),
            'pos' => $existing->pos ?: ($incoming['pos'] ?? null),
            'level_tag' => $levelTag,
            'grade_level' => implode(',', $grades),
            'meanings' => $meanings,
            'examples' => $examples !== [] ? array_slice($examples, 0, 8) : null,
        ];
    }
}
