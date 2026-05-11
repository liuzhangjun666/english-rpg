<?php

use App\Http\Controllers\Api\AchievementController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CurrencyController;
use App\Http\Controllers\Api\ExamController;
use App\Http\Controllers\Api\GrammarController;
use App\Http\Controllers\Api\HeartDemonController;
use App\Http\Controllers\Api\LeaderboardController;
use App\Http\Controllers\Api\MallController;
use App\Http\Controllers\Api\ParentController;
use App\Http\Controllers\Api\ReadingAdventureController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\ShareController;
use App\Http\Controllers\Api\SkillPracticeController;
use App\Http\Controllers\Api\SmsController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VocabController;
use Illuminate\Support\Facades\Route;

// 短信验证码（无需认证）
Route::post('/sms/send', [SmsController::class, 'send']);

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::prefix('user')->group(function () {
        Route::get('/profile', [UserController::class, 'profile']);
        Route::put('/profile', [UserController::class, 'updateProfile']);
        Route::get('/stats', [UserController::class, 'stats']);
    });

    Route::prefix('currency')->group(function () {
        Route::post('/daily-check', [CurrencyController::class, 'dailyCheck']);
        Route::get('/stones', [CurrencyController::class, 'stones']);
    });

    Route::prefix('vocab')->group(function () {
        Route::get('/questions', [VocabController::class, 'questions']);
        Route::post('/submit-batch', [VocabController::class, 'submitBatch']);
    });

    Route::prefix('grammar')->group(function () {
        Route::get('/questions', [GrammarController::class, 'questions']);
        Route::post('/submit-batch', [GrammarController::class, 'submitBatch']);
    });

    Route::prefix('reading')->group(function () {
        Route::get('/chapters', [ReadingAdventureController::class, 'chapters']);
        Route::get('/chapters/{chapterId}', [ReadingAdventureController::class, 'chapter']);
        Route::post('/submit-adventure', [ReadingAdventureController::class, 'submit']);
    });

    Route::prefix('{type}')
        ->whereIn('type', ['listening', 'speaking', 'reading', 'writing'])
        ->group(function () {
            Route::get('/questions', [SkillPracticeController::class, 'questions']);
            Route::post('/submit-batch', [SkillPracticeController::class, 'submitBatch']);
        });

    Route::prefix('exam')->group(function () {
        Route::get('/current', [ExamController::class, 'current']);
        Route::post('/start', [ExamController::class, 'start']);
        Route::post('/submit', [ExamController::class, 'submit']);
        Route::get('/history', [ExamController::class, 'history']);
    });

    Route::prefix('review')->group(function () {
        Route::get('/list', [ReviewController::class, 'list']);
        Route::post('/submit', [ReviewController::class, 'submit']);
    });

    Route::prefix('demons')->group(function () {
        Route::get('/', [HeartDemonController::class, 'index']);
        Route::get('/pre-exam', [HeartDemonController::class, 'preExam']);
        Route::post('/review-submit', [HeartDemonController::class, 'reviewSubmit']);
        Route::post('/report-wrong', [HeartDemonController::class, 'reportWrong']);
        Route::post('/clear', [HeartDemonController::class, 'clearMastered']);
    });

    Route::prefix('parent')->group(function () {
        Route::post('/bind', [ParentController::class, 'bind']);
        Route::get('/dashboard', [ParentController::class, 'dashboard']);
        Route::get('/report', [ParentController::class, 'report']);
    });

    Route::prefix('share')->group(function () {
        Route::get('/info', [ShareController::class, 'info']);
        Route::post('/toggle', [ShareController::class, 'toggle']);
    });

    Route::prefix('achievements')->group(function () {
        Route::get('/', [AchievementController::class, 'index']);
    });

    Route::prefix('leaderboard')->group(function () {
        Route::get('/', [LeaderboardController::class, 'index']);
    });

    Route::prefix('mall')->group(function () {
        Route::get('/items', [MallController::class, 'items']);
        Route::post('/buy', [MallController::class, 'buy']);
    });
});
