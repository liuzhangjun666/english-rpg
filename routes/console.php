<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\File;
use App\Models\Question;
use App\Models\VocabularyWord;
use App\Models\User;
use App\Services\RealmService;
use App\Support\CultivationProfile;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('vocab:import-json {file=database/data/elementary_vocab_questions.json} {--replace : Delete old EV-* questions before import}', function () {
    $fileArg = (string) $this->argument('file');
    $filePath = base_path($fileArg);

    if (!File::exists($filePath)) {
        $this->error("Import file not found: {$filePath}");
        return 1;
    }

    $raw = File::get($filePath);
    $payload = json_decode($raw, true);
    if (!is_array($payload) || !is_array($payload['questions'] ?? null)) {
        $this->error('Invalid import JSON format. Expected root.questions array.');
        return 1;
    }

    $questions = $payload['questions'];
    if ($this->option('replace')) {
        $deleted = Question::where('question_id', 'like', 'EV-%')->delete();
        $this->info("Deleted existing EV questions: {$deleted}");
    }

    $allowed = ['question_id', 'type', 'realm', 'stage', 'question', 'options', 'correct_answer', 'explanation', 'word', 'listening_text'];
    $created = 0;
    $updated = 0;

    foreach ($questions as $row) {
        if (!is_array($row)) {
            continue;
        }
        $questionId = (string) ($row['question_id'] ?? '');
        if ($questionId === '') {
            continue;
        }

        $record = Arr::only($row, $allowed);
        $record['type'] = 'vocab';
        $record['realm'] = (string) ($record['realm'] ?? 'L1');
        $record['stage'] = str_pad((string) ($record['stage'] ?? '01'), 2, '0', STR_PAD_LEFT);
        $record['options'] = is_array($record['options'] ?? null) ? $record['options'] : [];
        $record['question'] = (string) ($record['question'] ?? '');
        $record['correct_answer'] = (string) ($record['correct_answer'] ?? 'A');
        $record['word'] = (string) ($record['word'] ?? '');

        $exists = Question::where('question_id', $questionId)->exists();
        Question::updateOrCreate(['question_id' => $questionId], $record);
        if ($exists) {
            $updated++;
        } else {
            $created++;
        }
    }

    $source = (string) ($payload['source'] ?? '');
    $this->info("Imported vocabulary questions from JSON: {$fileArg}");
    if ($source !== '') {
        $this->line("Source Excel: {$source}");
    }
    $this->line("Created: {$created}");
    $this->line("Updated: {$updated}");
    $this->line("Total processed: " . ($created + $updated));
    return 0;
})->purpose('Import elementary vocabulary questions from generated JSON file');

Artisan::command('grammar:import-json {file=database/data/elementary_grammar_from_xiaoxue_cihuiti.json} {--replace= : Delete old questions with matching prefix before import}', function () {
    $fileArg = (string) $this->argument('file');
    $filePath = base_path($fileArg);

    if (!File::exists($filePath)) {
        $this->error("Import file not found: {$filePath}");
        return 1;
    }

    $raw = File::get($filePath);
    $payload = json_decode($raw, true);
    if (!is_array($payload) || !is_array($payload['questions'] ?? null)) {
        $this->error('Invalid import JSON format. Expected root.questions array.');
        return 1;
    }

    $questions = $payload['questions'];
    $replacePrefix = (string) $this->option('replace');
    if ($replacePrefix !== '') {
        $deleted = Question::where('question_id', 'like', $replacePrefix . '-%')->delete();
        $this->info("Deleted existing {$replacePrefix}-* questions: {$deleted}");
    }

    $allowed = [
        'question_id', 'type', 'play_mode', 'scene', 'education_stage', 'grade_level',
        'realm', 'stage', 'question', 'options', 'correct_answer', 'explanation', 'word', 'listening_text',
    ];
    $created = 0;
    $updated = 0;

    foreach ($questions as $row) {
        if (!is_array($row)) {
            continue;
        }
        $questionId = (string) ($row['question_id'] ?? '');
        if ($questionId === '') {
            continue;
        }

        $record = Arr::only($row, $allowed);
        $record['type'] = 'grammar';
        $record['realm'] = (string) ($record['realm'] ?? 'L1');
        $record['stage'] = str_pad((string) ($record['stage'] ?? '01'), 2, '0', STR_PAD_LEFT);
        $record['options'] = is_array($record['options'] ?? null) ? $record['options'] : [];
        $record['question'] = (string) ($record['question'] ?? '');
        $record['correct_answer'] = (string) ($record['correct_answer'] ?? 'A');
        $record['word'] = (string) ($record['word'] ?? '');

        $exists = Question::where('question_id', $questionId)->exists();
        Question::updateOrCreate(['question_id' => $questionId], $record);
        if ($exists) {
            $updated++;
        } else {
            $created++;
        }
    }

    $sources = $payload['sources'] ?? [];
    $this->info("Imported grammar questions from JSON: {$fileArg}");
    if (is_array($sources) && !empty($sources)) {
        foreach ($sources as $source) {
            $this->line("Source Excel: {$source}");
        }
    }
    $this->line("Created: {$created}");
    $this->line("Updated: {$updated}");
    $this->line("Total processed: " . ($created + $updated));
    return 0;
})->purpose('Import elementary grammar questions from generated JSON file');

Artisan::command('grammar:generate-junior {--import : Import into database after generation} {--replace=JGV-Z1 : Delete existing questions with this prefix before import}', function () {
    require_once base_path('database/scripts/JuniorGrammarGenerator.php');

    $generator = new JuniorGrammarGenerator();
    $questions = $generator->generate();
    $stageCounts = $generator->stageCounts($questions);

    $payload = [
        'sources' => ['database/scripts/JuniorGrammarGenerator.php'],
        'summary' => [
            'total_questions' => count($questions),
            'stage_counts' => $stageCounts,
            'education_stage' => '初中',
            'realm' => 'Z1',
            'grades' => ['七年级', '八年级', '九年级'],
        ],
        'questions' => $questions,
    ];

    $outFile = base_path('database/data/junior_grammar_z1.json');
    File::put($outFile, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    $this->info('Generated junior grammar JSON: ' . $outFile);
    $this->line('Total questions: ' . count($questions));
    foreach ($stageCounts as $stage => $count) {
        $this->line("  {$stage}: {$count}");
    }

    if (!$this->option('import')) {
        $this->comment('Run with --import to load into database, or: php artisan grammar:import-json database/data/junior_grammar_z1.json --replace=JGV-Z1');
        return 0;
    }

    $replacePrefix = (string) $this->option('replace');
    if ($replacePrefix !== '') {
        $deleted = Question::where('question_id', 'like', $replacePrefix . '-%')->delete();
        $this->info("Deleted existing {$replacePrefix}-* questions: {$deleted}");
    }

    $allowed = [
        'question_id', 'type', 'play_mode', 'scene', 'education_stage', 'grade_level',
        'realm', 'stage', 'question', 'options', 'correct_answer', 'explanation', 'word', 'listening_text',
    ];
    $created = 0;
    $updated = 0;

    foreach ($questions as $row) {
        $questionId = (string) ($row['question_id'] ?? '');
        if ($questionId === '') {
            continue;
        }

        $record = Arr::only($row, $allowed);
        $record['type'] = 'grammar';
        $record['realm'] = (string) ($record['realm'] ?? 'Z1');
        $record['stage'] = str_pad((string) ($record['stage'] ?? '01'), 2, '0', STR_PAD_LEFT);
        $record['options'] = is_array($record['options'] ?? null) ? $record['options'] : [];
        $record['question'] = (string) ($record['question'] ?? '');
        $record['correct_answer'] = (string) ($record['correct_answer'] ?? 'A');
        $record['word'] = (string) ($record['word'] ?? '');

        $exists = Question::where('question_id', $questionId)->exists();
        Question::updateOrCreate(['question_id' => $questionId], $record);
        if ($exists) {
            $updated++;
        } else {
            $created++;
        }
    }

    $this->info('Imported junior grammar questions.');
    $this->line("Created: {$created}");
    $this->line("Updated: {$updated}");

    $zCount = Question::where('type', 'grammar')->where('realm', 'like', 'Z%')->count();
    $this->line("Z-realm grammar in DB: {$zCount}");

    return 0;
})->purpose('Generate and optionally import junior high (Z1) grammar questions');

Artisan::command('grammar:generate-senior {--import : Import into database after generation} {--replace=JGV-J1 : Delete existing questions with this prefix before import}', function () {
    require_once base_path('database/scripts/SeniorGrammarGenerator.php');

    $generator = new SeniorGrammarGenerator();
    $questions = $generator->generate();
    $stageCounts = $generator->stageCounts($questions);

    $payload = [
        'sources' => ['database/scripts/SeniorGrammarGenerator.php'],
        'summary' => [
            'total_questions' => count($questions),
            'stage_counts' => $stageCounts,
            'education_stage' => '高中',
            'realm' => 'J1',
            'grades' => ['高一', '高二', '高三'],
        ],
        'questions' => $questions,
    ];

    $outFile = base_path('database/data/senior_grammar_j1.json');
    File::put($outFile, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    $this->info('Generated senior grammar JSON: ' . $outFile);
    $this->line('Total questions: ' . count($questions));
    foreach ($stageCounts as $stage => $count) {
        $this->line("  {$stage}: {$count}");
    }

    if (!$this->option('import')) {
        $this->comment('Run with --import to load into database, or: php artisan grammar:import-json database/data/senior_grammar_j1.json --replace=JGV-J1');
        return 0;
    }

    $replacePrefix = (string) $this->option('replace');
    if ($replacePrefix !== '') {
        $deleted = Question::where('question_id', 'like', $replacePrefix . '-%')->delete();
        $this->info("Deleted existing {$replacePrefix}-* questions: {$deleted}");
    }

    $allowed = [
        'question_id', 'type', 'play_mode', 'scene', 'education_stage', 'grade_level',
        'realm', 'stage', 'question', 'options', 'correct_answer', 'explanation', 'word', 'listening_text',
    ];
    $created = 0;
    $updated = 0;

    foreach ($questions as $row) {
        $questionId = (string) ($row['question_id'] ?? '');
        if ($questionId === '') {
            continue;
        }

        $record = Arr::only($row, $allowed);
        $record['type'] = 'grammar';
        $record['realm'] = (string) ($record['realm'] ?? 'J1');
        $record['stage'] = str_pad((string) ($record['stage'] ?? '01'), 2, '0', STR_PAD_LEFT);
        $record['options'] = is_array($record['options'] ?? null) ? $record['options'] : [];
        $record['question'] = (string) ($record['question'] ?? '');
        $record['correct_answer'] = (string) ($record['correct_answer'] ?? 'A');
        $record['word'] = (string) ($record['word'] ?? '');

        $exists = Question::where('question_id', $questionId)->exists();
        Question::updateOrCreate(['question_id' => $questionId], $record);
        if ($exists) {
            $updated++;
        } else {
            $created++;
        }
    }

    $this->info('Imported senior grammar questions.');
    $this->line("Created: {$created}");
    $this->line("Updated: {$updated}");

    $jCount = Question::where('type', 'grammar')->where('realm', 'like', 'J%')->count();
    $this->line("J-realm grammar in DB: {$jCount}");

    return 0;
})->purpose('Generate and optionally import senior high (J1) grammar questions');

Artisan::command('grammar:generate-university {--import : Import into database after generation} {--replace=JGV-Y1 : Delete existing questions with this prefix before import}', function () {
    require_once base_path('database/scripts/UniversityGrammarGenerator.php');

    $generator = new UniversityGrammarGenerator();
    $questions = $generator->generate();
    $stageCounts = $generator->stageCounts($questions);

    $payload = [
        'sources' => ['database/scripts/UniversityGrammarGenerator.php'],
        'summary' => [
            'total_questions' => count($questions),
            'stage_counts' => $stageCounts,
            'education_stage' => '大学',
            'realm' => 'Y1',
            'grades' => ['大一', '大二', '大三', '大四'],
        ],
        'questions' => $questions,
    ];

    $outFile = base_path('database/data/university_grammar_y1.json');
    File::put($outFile, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    $this->info('Generated university grammar JSON: ' . $outFile);
    $this->line('Total questions: ' . count($questions));
    foreach ($stageCounts as $stage => $count) {
        $this->line("  {$stage}: {$count}");
    }

    if (!$this->option('import')) {
        $this->comment('Run with --import to load into database, or: php artisan grammar:import-json database/data/university_grammar_y1.json --replace=JGV-Y1');
        return 0;
    }

    $replacePrefix = (string) $this->option('replace');
    if ($replacePrefix !== '') {
        $deleted = Question::where('question_id', 'like', $replacePrefix . '-%')->delete();
        $this->info("Deleted existing {$replacePrefix}-* questions: {$deleted}");
    }

    $allowed = [
        'question_id', 'type', 'play_mode', 'scene', 'education_stage', 'grade_level',
        'realm', 'stage', 'question', 'options', 'correct_answer', 'explanation', 'word', 'listening_text',
    ];
    $created = 0;
    $updated = 0;

    foreach ($questions as $row) {
        $questionId = (string) ($row['question_id'] ?? '');
        if ($questionId === '') {
            continue;
        }

        $record = Arr::only($row, $allowed);
        $record['type'] = 'grammar';
        $record['realm'] = (string) ($record['realm'] ?? 'Y1');
        $record['stage'] = str_pad((string) ($record['stage'] ?? '01'), 2, '0', STR_PAD_LEFT);
        $record['options'] = is_array($record['options'] ?? null) ? $record['options'] : [];
        $record['question'] = (string) ($record['question'] ?? '');
        $record['correct_answer'] = (string) ($record['correct_answer'] ?? 'A');
        $record['word'] = (string) ($record['word'] ?? '');

        $exists = Question::where('question_id', $questionId)->exists();
        Question::updateOrCreate(['question_id' => $questionId], $record);
        if ($exists) {
            $updated++;
        } else {
            $created++;
        }
    }

    $this->info('Imported university grammar questions.');
    $this->line("Created: {$created}");
    $this->line("Updated: {$updated}");

    $yCount = Question::where('type', 'grammar')->where('realm', 'like', 'Y%')->count();
    $this->line("Y-realm grammar in DB: {$yCount}");

    return 0;
})->purpose('Generate and optionally import university (Y1) grammar questions');

Artisan::command('vocab:import-cet {--no-json : Do not write vocabulary_words_import_大学四六级.json}', function () {
    require_once base_path('database/scripts/CetVocabImporter.php');

    $this->info('Downloading CET4/CET6 vocabulary from KyleBing/english-vocabulary ...');

    try {
        $importer = new CetVocabImporter();
        $result = $importer->importToDatabase(!$this->option('no-json'));
    } catch (Throwable $e) {
        $this->error($e->getMessage());
        return 1;
    }

    $this->info('CET vocabulary import finished.');
    $this->line("Created: {$result['created']}");
    $this->line("Updated (merged CET tag): {$result['updated']}");
    $this->line("Skipped (already tagged): {$result['skipped']}");

    $cet4 = VocabularyWord::query()->where('level_tag', '大学')->where('grade_level', 'like', '%CET4%')->count();
    $cet6Only = VocabularyWord::query()
        ->where(function ($q) {
            $q->where('level_tag', '大学')->orWhere('grade_level', 'like', '%CET6%');
        })
        ->where('grade_level', 'like', '%CET6%')
        ->count();
    $university = VocabularyWord::query()->where('level_tag', '大学')->count();

    $this->line("University level_tag rows: {$university}");
    $this->line("Rows with CET4 tag: {$cet4}");
    $this->line("Rows with CET6 tag: {$cet6Only}");

    if (!$this->option('no-json')) {
        $this->line('JSON saved: database/seeders/data/vocabulary_words_import_大学四六级.json');
    }

    return 0;
})->purpose('Download and import university CET4/CET6 vocabulary');

Artisan::command('users:sync-grade-realm {--dry-run : 仅预览，不落库}', function () {
    $dryRun = (bool) $this->option('dry-run');
    /** @var RealmService $realmService */
    $realmService = app(RealmService::class);

    $scanned = 0;
    $changed = 0;

    User::query()
        ->whereNotNull('school_grade')
        ->where('school_grade', '<>', '')
        ->orderBy('id')
        ->chunkById(200, function ($users) use (&$scanned, &$changed, $dryRun, $realmService) {
            foreach ($users as $user) {
                $scanned++;
                $target = CultivationProfile::initialRealmBySchoolGrade((string) $user->school_grade);
                $targetRealm = (string) ($target['realm'] ?? 'L1');
                $targetStage = max(1, (int) ($target['realm_stage'] ?? 1));
                $targetCurrentRealm = $realmService->composeCurrentRealm($targetRealm, $targetStage);

                $realmChanged = (string) ($user->realm ?? '') !== $targetRealm;
                $stageChanged = (int) ($user->realm_stage ?? 0) !== $targetStage;
                $currentRealmChanged = (string) ($user->current_realm ?? '') !== $targetCurrentRealm;

                if (!$realmChanged && !$stageChanged && !$currentRealmChanged) {
                    continue;
                }

                $changed++;
                if ($dryRun) {
                    $this->line("User#{$user->id} {$user->school_grade}: {$user->realm}{$user->realm_stage} -> {$targetRealm}{$targetStage}");
                    continue;
                }

                $user->update([
                    'realm' => $targetRealm,
                    'realm_stage' => $targetStage,
                    'current_realm' => $targetCurrentRealm,
                ]);
            }
        });

    $this->info("扫描用户: {$scanned}");
    $this->info($dryRun ? "可同步用户: {$changed}" : "已同步用户: {$changed}");

    return 0;
})->purpose('按当前年级批量同步用户境界');

Artisan::command('vocab:import-excel {file} {--sheet=0}', function () {
    $fileArg = (string) $this->argument('file');
    $sheetIndex = (int) $this->option('sheet');
    $filePath = $fileArg;
    if (!str_starts_with($fileArg, 'C:\\') && !str_starts_with($fileArg, 'D:\\')) {
        $filePath = base_path($fileArg);
    }

    if (!File::exists($filePath)) {
        $this->error("Excel 文件不存在: {$filePath}");
        return 1;
    }

    $this->info("读取 Excel: {$filePath}");

    try {
        $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReaderForFile($filePath);
        $spreadsheet = $reader->load($filePath);
    } catch (\Throwable $e) {
        $this->error('无法读取 Excel 文件: ' . $e->getMessage());
        return 1;
    }

    $sheet = $spreadsheet->getSheet($sheetIndex);
    $rows = $sheet->toArray(null, true, true, true);
    if (empty($rows)) {
        $this->error('Excel 内容为空');
        return 1;
    }

    // 识别表头
    $headerRow = array_shift($rows);
    $columns = [];
    foreach ($headerRow as $col => $value) {
        $label = trim((string) $value);
        if ($label === '') {
            continue;
        }
        $lower = mb_strtolower($label);
        if (str_contains($lower, 'word') || str_contains($lower, '单词')) {
            $columns['lemma'] = $col;
        } elseif (str_contains($lower, '音标')) {
            $columns['phonetic'] = $col;
        } elseif (str_contains($lower, '词性')) {
            $columns['pos'] = $col;
        } elseif (str_contains($lower, '年级')) {
            $columns['grade_level'] = $col;
        } elseif (str_contains($lower, '难度') || str_contains($lower, 'level')) {
            $columns['level_tag'] = $col;
        } elseif (str_contains($lower, '义') || str_contains($lower, '释义') || str_contains($lower, '中文')) {
            $columns['meanings'] = $col;
        } elseif (str_contains($lower, '例句') || str_contains($lower, '例子')) {
            $columns['examples'] = $col;
        }
    }

    if (empty($columns['lemma'])) {
        $this->error('无法在表头中识别“单词/word”列，请确认首行包含类似「单词」或「Word」的表头。');
        return 1;
    }

    $created = 0;
    $updated = 0;

    foreach ($rows as $row) {
        $lemmaCol = $columns['lemma'];
        $lemma = trim((string) ($row[$lemmaCol] ?? ''));
        if ($lemma === '') {
            continue;
        }

        $data = [
            'lemma' => $lemma,
            'phonetic' => isset($columns['phonetic']) ? trim((string) ($row[$columns['phonetic']] ?? '')) : null,
            'pos' => isset($columns['pos']) ? trim((string) ($row[$columns['pos']] ?? '')) : null,
            'grade_level' => isset($columns['grade_level']) ? trim((string) ($row[$columns['grade_level']] ?? '')) : null,
            'level_tag' => isset($columns['level_tag']) ? trim((string) ($row[$columns['level_tag']] ?? '')) : null,
        ];

        if (isset($columns['meanings'])) {
            $cn = trim((string) ($row[$columns['meanings']] ?? ''));
            $data['meanings'] = $cn !== '' ? [$cn] : null;
        }

        if (isset($columns['examples'])) {
            $ex = trim((string) ($row[$columns['examples']] ?? ''));
            $data['examples'] = $ex !== '' ? [$ex] : null;
        }

        /** @var \App\Models\VocabularyWord $word */
        $word = VocabularyWord::query()->where('lemma', $lemma)->first();
        if ($word) {
            $word->fill($data);
            $word->save();
            $updated++;
        } else {
            VocabularyWord::create($data);
            $created++;
        }
    }

    $this->info("导入完成：新增 {$created} 条，更新 {$updated} 条。");
    return 0;
})->purpose('从 Excel 导入词汇到 vocabulary_words 表');

Artisan::command('vocab:import-words-json {file}', function () {
    $fileArg = (string) $this->argument('file');
    $filePath = $fileArg;
    if (!str_starts_with($fileArg, 'C:\\') && !str_starts_with($fileArg, 'D:\\')) {
        $filePath = base_path($fileArg);
    }

    if (!File::exists($filePath)) {
        $this->error("Import file not found: {$filePath}");
        return 1;
    }

    $raw = File::get($filePath);
    $payload = json_decode($raw, true);
    if (!is_array($payload)) {
        $this->error('Invalid JSON: expected root array');
        return 1;
    }

    $created = 0;
    $updated = 0;

    foreach ($payload as $row) {
        if (!is_array($row)) continue;
        $lemma = trim((string) ($row['lemma'] ?? ''));
        if ($lemma === '') continue;

        $record = [
            'lemma' => $lemma,
            'phonetic' => isset($row['phonetic']) ? (string) $row['phonetic'] : null,
            'pos' => isset($row['pos']) ? (string) $row['pos'] : null,
            'grade_level' => isset($row['grade_level']) ? (string) $row['grade_level'] : null,
            'level_tag' => isset($row['level_tag']) ? (string) $row['level_tag'] : null,
            'meanings' => $row['meanings'] ?? null,
            'examples' => $row['examples'] ?? null,
        ];

        // Normalize meanings/examples into arrays when they exist.
        foreach (['meanings', 'examples'] as $k) {
            if (isset($record[$k]) && $record[$k] !== null && !is_array($record[$k])) {
                $record[$k] = [(string) $record[$k]];
            }
        }

        $exists = VocabularyWord::query()->where('lemma', $lemma)->exists();
        VocabularyWord::updateOrCreate(['lemma' => $lemma], array_filter($record, fn ($v) => $v !== null));
        if ($exists) $updated++; else $created++;
    }

    $this->info("Import words done. Created={$created}, Updated={$updated}, File={$fileArg}");
    return 0;
})->purpose('Import vocabulary_words from JSON (exported by tools/import_vocabulary_excel_to_json.py)');

Artisan::command('vocab:prune-legacy-questions {--dry-run : Only show counts}', function () {
    $dry = (bool) $this->option('dry-run');
    $count = Question::query()->whereIn('type', ['vocab', 'vocabulary'])->count();
    $this->info("Legacy vocab questions in levelup_questions: {$count}");
    if ($dry || $count <= 0) {
        return 0;
    }
    $deleted = Question::query()->whereIn('type', ['vocab', 'vocabulary'])->delete();
    $this->info("Deleted legacy vocab questions: {$deleted}");
    return 0;
})->purpose('Delete legacy vocabulary questions from levelup_questions (after migrating to vocabulary_words)');

Artisan::command('reading:import-json {file}', function () {
    $fileArg = (string) $this->argument('file');
    $filePath = $fileArg;
    if (!str_starts_with($fileArg, 'C:\\') && !str_starts_with($fileArg, 'D:\\')) {
        $filePath = base_path($fileArg);
    }

    if (!File::exists($filePath)) {
        $this->error("Import file not found: {$filePath}");
        return 1;
    }

    $raw = File::get($filePath);
    $payload = json_decode($raw, true);
    if (!is_array($payload) || !is_array($payload['passages'] ?? null)) {
        $this->error('Invalid JSON: expected root.passages array');
        return 1;
    }

    $createdPassages = 0;
    $createdQuestions = 0;

    foreach ($payload['passages'] as $p) {
        if (!is_array($p)) {
            continue;
        }
        $content = trim((string) ($p['content'] ?? ''));
        if ($content === '') {
            continue;
        }
        $passage = \App\Models\ReadingPassage::create([
            'passage_code' => $p['passage_code'] ?? null,
            'level_tag' => $p['level_tag'] ?? null,
            'grade_level' => $p['grade_level'] ?? null,
            'realm' => $p['realm'] ?? null,
            'stage' => $p['stage'] ?? null,
            'title' => $p['title'] ?? null,
            'content' => $content,
            'meta' => $p['meta'] ?? null,
        ]);
        $createdPassages++;

        $qs = $p['questions'] ?? [];
        if (!is_array($qs)) {
            continue;
        }
        foreach ($qs as $idx => $q) {
            if (!is_array($q)) {
                continue;
            }
            $question = trim((string) ($q['question'] ?? ''));
            $correct = (string) ($q['correct_answer'] ?? '');
            if ($question === '' || $correct === '') {
                continue;
            }
            \App\Models\ReadingQuestion::create([
                'passage_id' => $passage->id,
                'question_no' => (int) ($q['question_no'] ?? ($idx + 1)),
                'question_type' => (string) ($q['question_type'] ?? 'tf'),
                'question' => $question,
                'options' => $q['options'] ?? null,
                'correct_answer' => $correct,
                'answer_accept' => $q['answer_accept'] ?? null,
                'explanation' => $q['explanation'] ?? null,
            ]);
            $createdQuestions++;
        }
    }

    $this->info("Imported reading passages: {$createdPassages}");
    $this->info("Imported reading questions: {$createdQuestions}");
    return 0;
})->purpose('Import reading passages/questions from JSON into reading_passages & reading_questions');

Artisan::command('reading:generate-json', function () {
    require_once base_path('database/scripts/JuniorReadingGenerator.php');
    require_once base_path('database/scripts/SeniorReadingGenerator.php');
    require_once base_path('database/scripts/UniversityReadingGenerator.php');

    $junior = (new JuniorReadingGenerator())->generate();
    $senior = (new SeniorReadingGenerator())->generateAll();
    $y1 = (new UniversityReadingGenerator())->forRealm('Y1');
    $h1 = (new UniversityReadingGenerator())->forRealm('H1');

    $files = [
        'database/data/junior_reading_z1.json' => [
            'summary' => ['realm' => 'Z1', 'education_stage' => '初中', 'total_passages' => count($junior)],
            'passages' => $junior,
        ],
        'database/data/senior_reading_j1.json' => [
            'summary' => ['realm' => 'J1', 'education_stage' => '高中', 'total_passages' => count($senior)],
            'passages' => $senior,
        ],
        'database/data/university_reading_y1.json' => [
            'summary' => ['realm' => 'Y1', 'education_stage' => '大学', 'total_passages' => count($y1)],
            'passages' => $y1,
        ],
        'database/data/graduate_reading_h1.json' => [
            'summary' => ['realm' => 'H1', 'education_stage' => '研究生', 'total_passages' => count($h1)],
            'passages' => $h1,
        ],
    ];

    foreach ($files as $path => $payload) {
        $full = base_path($path);
        File::put($full, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        $this->line('Wrote ' . $path . ' (' . count($payload['passages']) . ' passages)');
    }

    $this->info('Reading JSON export complete.');
    return 0;
})->purpose('Export generated junior/senior/university reading passages to JSON');

Artisan::command('reading:seed {--fresh-passages : Delete all reading passages before seeding}', function () {
    if ($this->option('fresh-passages')) {
        \App\Models\ReadingQuestion::query()->delete();
        \App\Models\ReadingPassage::query()->delete();
        $this->warn('Cleared reading_passages and reading_questions.');
    }

    $this->call('db:seed', [
        '--class' => 'Database\\Seeders\\ReadingBankSeeder',
        '--force' => true,
    ]);

    $counts = \App\Models\ReadingPassage::query()
        ->selectRaw('realm, count(*) as total')
        ->groupBy('realm')
        ->orderBy('realm')
        ->pluck('total', 'realm');

    $this->info('Reading bank seeded.');
    foreach ($counts as $realm => $total) {
        $this->line("  {$realm}: {$total} passages");
    }

    return 0;
})->purpose('Import elementary/junior reading JSON and generate senior reading passages');

Artisan::command('app:bootstrap-content {--fresh : Run migrate:fresh before seeding}', function () {
    if ($this->option('fresh')) {
        $this->call('migrate:fresh', ['--force' => true]);
    } else {
        $this->call('migrate', ['--force' => true]);
    }

    $this->call('db:seed', ['--force' => true]);

    $grammarFile = base_path('database/data/elementary_grammar_from_xiaoxue_cihuiti.json');
    if (File::exists($grammarFile)) {
        $this->call('grammar:import-json', [
            'file' => 'database/data/elementary_grammar_from_xiaoxue_cihuiti.json',
            '--replace' => 'GR',
        ]);
    } else {
        $this->warn('Grammar import skipped: elementary_grammar_from_xiaoxue_cihuiti.json not found.');
    }

    $this->call('db:seed', [
        '--class' => 'Database\\Seeders\\VocabAssessmentBankSeeder',
        '--force' => true,
    ]);

    $this->info('Content bootstrap complete (L1–H1 realms).');
    $this->line('See DEPLOY.md for production checklist.');
    return 0;
})->purpose('One-shot migrate + seed + import grammar for launch-ready content');
