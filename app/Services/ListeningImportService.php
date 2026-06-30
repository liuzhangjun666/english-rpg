<?php

namespace App\Services;

use App\Models\ListeningPassage;
use App\Models\ListeningQuestion;
use App\Support\ListeningQuestionParser;
use Illuminate\Support\Facades\DB;

class ListeningImportService
{
    /**
     * @param  array<string, mixed>  $payload
     * @return array{passages: int, questions: int, skipped: int}
     */
    public function importFromPayload(array $payload, bool $replace = false): array
    {
        $realm = strtoupper((string) ($payload['realm'] ?? 'Z1'));
        $gradeLevel = (string) ($payload['grade_level'] ?? '初二');
        $levelTag = (string) ($payload['level_tag'] ?? '初中');
        $importSource = (string) ($payload['import_source'] ?? basename((string) ($payload['source'] ?? 'import')));
        $passages = $payload['passages'] ?? [];

        if (!is_array($passages) || $passages === []) {
            throw new \InvalidArgumentException('导入数据缺少 passages');
        }

        $stats = ['passages' => 0, 'questions' => 0, 'skipped' => 0];

        DB::transaction(function () use ($passages, $realm, $gradeLevel, $levelTag, $importSource, $replace, &$stats) {
            if ($replace) {
                $this->deleteImportedPassages($realm, $importSource);
            }

            foreach ($passages as $entry) {
                if (!is_array($entry)) {
                    $stats['skipped']++;
                    continue;
                }

                $passageNo = (int) ($entry['passage_no'] ?? 0);
                $listeningText = trim((string) ($entry['listening_text'] ?? ''));
                $questions = $entry['questions'] ?? [];

                if ($passageNo <= 0 || $listeningText === '' || !is_array($questions) || $questions === []) {
                    $stats['skipped']++;
                    continue;
                }

                $stage = str_pad((string) ((($passageNo - 1) % 9) + 1), 2, '0', STR_PAD_LEFT);
                $passageCode = sprintf('LP-%s-G8-%02d', $realm, $passageNo);

                $passage = ListeningPassage::updateOrCreate(
                    ['passage_code' => $passageCode],
                    [
                        'realm' => $realm,
                        'stage' => $stage,
                        'level_tag' => $levelTag,
                        'grade_level' => $gradeLevel,
                        'title' => sprintf('初二听力·大题%d', $passageNo),
                        'listening_text' => $listeningText,
                        'word' => 'dialogue',
                        'meta' => [
                            'import_source' => $importSource,
                            'passage_no' => $passageNo,
                            'grade_level' => $gradeLevel,
                        ],
                    ]
                );

                ListeningQuestion::query()->where('passage_id', $passage->id)->delete();

                $questionNo = 0;
                foreach ($questions as $rawQuestion) {
                    if (!is_array($rawQuestion)) {
                        $stats['skipped']++;
                        continue;
                    }

                    $parsed = ListeningQuestionParser::parseContent((string) ($rawQuestion['content'] ?? ''));
                    $answer = strtoupper(trim((string) ($rawQuestion['answer'] ?? '')));
                    if ($parsed['question'] === '' || count($parsed['options']) < 2 || $answer === '') {
                        $stats['skipped']++;
                        continue;
                    }

                    if (!isset($parsed['options'][$answer])) {
                        $stats['skipped']++;
                        continue;
                    }

                    $questionNo++;
                    ListeningQuestion::create([
                        'passage_id' => $passage->id,
                        'question_no' => $questionNo,
                        'question' => $parsed['question'],
                        'options' => $parsed['options'],
                        'correct_answer' => $answer,
                        'explanation' => null,
                        'word' => 'dialogue',
                    ]);
                    $stats['questions']++;
                }

                if ($questionNo === 0) {
                    $passage->delete();
                    $stats['skipped']++;
                    continue;
                }

                $stats['passages']++;
            }
        });

        return $stats;
    }

    private function deleteImportedPassages(string $realm, string $importSource): void
    {
        $passages = ListeningPassage::query()
            ->where('realm', $realm)
            ->where('meta->import_source', $importSource)
            ->get();

        foreach ($passages as $passage) {
            ListeningQuestion::query()->where('passage_id', $passage->id)->delete();
            $passage->delete();
        }
    }
}
