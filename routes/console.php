<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\File;
use App\Models\Question;

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
