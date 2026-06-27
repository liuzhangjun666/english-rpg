<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$phone = $argv[1] ?? '';
if ($phone === '') {
    fwrite(STDERR, "Usage: php tools/delete_user_by_phone.php <phone>\n");
    exit(1);
}

$user = User::query()->where('phone', $phone)->first();
if (!$user) {
    echo "NOT_FOUND phone={$phone}\n";
    exit(0);
}

$userId = (int) $user->id;
echo "Found user id={$userId} phone={$user->phone} nickname={$user->nickname}\n";

DB::transaction(function () use ($userId, $user): void {
    $assessmentIds = DB::table('levelup_vocabulary_assessments')
        ->where('user_id', $userId)
        ->pluck('id');

    if ($assessmentIds->isNotEmpty()) {
        DB::table('levelup_vocabulary_assessment_records')
            ->whereIn('assessment_id', $assessmentIds)
            ->delete();
    }

    DB::table('levelup_vocabulary_assessment_records')->where('user_id', $userId)->delete();
    DB::table('levelup_vocabulary_assessments')->where('user_id', $userId)->delete();
    DB::table('levelup_user_learning_profiles')->where('user_id', $userId)->delete();
    DB::table('levelup_learning_records')->where('user_id', $userId)->delete();
    DB::table('levelup_vocab_progress')->where('user_id', $userId)->delete();
    DB::table('levelup_exam_results')->where('user_id', $userId)->delete();
    DB::table('levelup_heart_demons')->where('user_id', $userId)->delete();
    DB::table('levelup_achievements')->where('user_id', $userId)->delete();
    DB::table('levelup_user_items')->where('user_id', $userId)->delete();
    DB::table('levelup_writing_results')->where('user_id', $userId)->delete();
    DB::table('levelup_demon_metrics')->where('user_id', $userId)->delete();
    DB::table('levelup_user_mails')->where('user_id', $userId)->delete();
    DB::table('levelup_sms_codes')->where('phone', $user->phone)->delete();

    $sessionIds = DB::table('levelup_timed_challenge_sessions')
        ->where('user_id', $userId)
        ->pluck('id');
    if ($sessionIds->isNotEmpty()) {
        DB::table('levelup_timed_challenge_answers')->whereIn('session_id', $sessionIds)->delete();
    }
    DB::table('levelup_timed_challenge_sessions')->where('user_id', $userId)->delete();

    DB::table('wanyao_tower_runs')->where('user_id', $userId)->delete();
    DB::table('wanyao_tower_progress')->where('user_id', $userId)->delete();

    DB::table('personal_access_tokens')
        ->where('tokenable_type', User::class)
        ->where('tokenable_id', $userId)
        ->delete();

    DB::table('sessions')->where('user_id', $userId)->delete();

    DB::table('levelup_users')->where('invited_by', $userId)->update(['invited_by' => null]);

    DB::table('levelup_users')->where('id', $userId)->delete();
});

echo "DELETED user id={$userId} phone={$phone}\n";
