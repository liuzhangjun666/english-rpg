<?php

use App\Http\Controllers\Api\AchievementController;
use App\Http\Controllers\Api\AiAskController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\WritingController;
use App\Http\Controllers\Api\CurrencyController;
use App\Http\Controllers\Api\DailyTaskController;
use App\Http\Controllers\Api\ExamController;
use App\Http\Controllers\Api\GrammarController;
use App\Http\Controllers\Api\HeartDemonController;
use App\Http\Controllers\Api\LeaderboardController;
use App\Http\Controllers\Api\MallController;
use App\Http\Controllers\Api\MailController;
use App\Http\Controllers\Api\ParentController;
use App\Http\Controllers\Api\PetController;
use App\Http\Controllers\Api\PracticeLevelController;
use App\Http\Controllers\Api\MijingChallengeController;
use App\Http\Controllers\Api\ReadingAdventureController;
use App\Http\Controllers\Api\ReadingBankController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\ShareController;
use App\Http\Controllers\Api\SkillPracticeController;
use App\Http\Controllers\Api\SmsController;
use App\Http\Controllers\Api\StoryController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VocabAssessmentController;
use App\Http\Controllers\Api\VocabController;
use App\Http\Controllers\Api\WanyaoTowerController;
use Illuminate\Support\Facades\Route;

// 短信验证码（无需认证）
Route::post('/sms/send', [SmsController::class, 'send']);

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    // 刷新必须在 auth:sanctum 之外：访问令牌过期后正靠它恢复会话，凭据是独立的刷新令牌。
    Route::post('/refresh', [AuthController::class, 'refresh']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/password/send-code', [AuthController::class, 'sendSetPasswordCode']);
    Route::post('/auth/password', [AuthController::class, 'updatePassword']);

    Route::prefix('user')->group(function () {
        Route::get('/profile', [UserController::class, 'profile']);
        Route::put('/profile', [UserController::class, 'updateProfile']);
        Route::post('/avatar', [UserController::class, 'uploadAvatar']);
        Route::patch('/tutorial-step', [UserController::class, 'updateTutorialStep']);
        Route::post('/complete-tutorial', [UserController::class, 'completeTutorial']);
        Route::get('/stats', [UserController::class, 'stats']);
        Route::get('/learning-progress', [UserController::class, 'learningProgress']);
        Route::get('/analytics', [UserController::class, 'analytics']);
        Route::post('/consume-spirit', [UserController::class, 'consumeSpirit']);
    });

    Route::prefix('story')->group(function () {
        Route::post('/sync', [StoryController::class, 'sync']);
        Route::post('/choice', [StoryController::class, 'choice']);
    });

    Route::prefix('currency')->group(function () {
        Route::post('/daily-check', [CurrencyController::class, 'dailyCheck']);
        Route::get('/stones', [CurrencyController::class, 'stones']);
        Route::post('/redeem-scroll', [CurrencyController::class, 'redeemScroll']);
    });

    Route::prefix('daily')->group(function () {
        Route::get('/tasks', [DailyTaskController::class, 'index']);
        Route::post('/tasks/claim', [DailyTaskController::class, 'claim']);
        Route::post('/signin', [DailyTaskController::class, 'signIn']);
    });

    Route::get('/mail/inbox', [MailController::class, 'inbox']);
    Route::post('/mail/read', [MailController::class, 'markRead']);
    Route::post('/mail/claim', [MailController::class, 'claim']);
    Route::post('/ai-ask', [AiAskController::class, 'ask']);

    Route::prefix('pet')->group(function () {
        Route::get('/garden', [PetController::class, 'garden']);
        Route::post('/select', [PetController::class, 'select']);
        Route::post('/interact', [PetController::class, 'interact']);
    });

    Route::get('/practice/levels/{type}', [PracticeLevelController::class, 'show'])
        ->whereIn('type', ['vocab', 'grammar', 'listening', 'speaking', 'writing']);

    Route::prefix('vocab')->group(function () {
        Route::get('/questions', [VocabController::class, 'questions']);
        Route::post('/submit-batch', [VocabController::class, 'submitBatch']);
    });

    Route::prefix('vocab-assessment')->group(function () {
        Route::get('/status', [VocabAssessmentController::class, 'status']);
        Route::post('/start', [VocabAssessmentController::class, 'start']);
        Route::get('/next-question', [VocabAssessmentController::class, 'nextQuestion']);
        Route::post('/submit-answer', [VocabAssessmentController::class, 'submitAnswer']);
        Route::post('/finish', [VocabAssessmentController::class, 'finish']);
    });

    Route::prefix('grammar')->group(function () {
        Route::get('/questions', [GrammarController::class, 'questions']);
        Route::post('/submit-batch', [GrammarController::class, 'submitBatch']);
    });

    Route::prefix('reading')->group(function () {
        Route::get('/questions', [ReadingBankController::class, 'questions']);
        Route::post('/submit-batch', [ReadingBankController::class, 'submitBatch']);
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

    // 写作模块（独立路由，覆盖上方通用路由的 writing 部分）
    Route::prefix('writing')->group(function () {
        Route::get('/prompts', [WritingController::class, 'prompts']);
        Route::post('/submit-one', [WritingController::class, 'submitOne']);
    });

    Route::prefix('exam')->group(function () {
        Route::get('/current', [ExamController::class, 'current']);
        Route::post('/breakthrough', [ExamController::class, 'breakthrough']);
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
        Route::post('/report-wrongs', [HeartDemonController::class, 'reportWrongs']);
        Route::post('/clear', [HeartDemonController::class, 'clearMastered']);
        Route::post('/clear-mastered', [HeartDemonController::class, 'clearMastered']);
    });

    Route::prefix('wanyao-tower')->group(function () {
        Route::get('/status',    [WanyaoTowerController::class, 'status']);
        Route::get('/run/{runId}', [WanyaoTowerController::class, 'show'])->whereNumber('runId');
        Route::post('/start',    [WanyaoTowerController::class, 'start'])->middleware('throttle:3,1');
        Route::post('/answer',   [WanyaoTowerController::class, 'answer']);
        Route::post('/settle',   [WanyaoTowerController::class, 'settle']);
        Route::post('/abandon',  [WanyaoTowerController::class, 'abandon']);
    });

    Route::prefix('parent')->group(function () {
        Route::post('/bind', [ParentController::class, 'bind']);
        Route::get('/dashboard', [ParentController::class, 'dashboard']);
        Route::get('/report', [ParentController::class, 'report']);
    });

    Route::prefix('share')->group(function () {
        Route::get('/info', [ShareController::class, 'info']);
        Route::post('/toggle', [ShareController::class, 'toggle']);
        Route::post('/record', [ShareController::class, 'record']);
    });

    Route::prefix('achievements')->group(function () {
        Route::get('/', [AchievementController::class, 'index']);
    });

    Route::prefix('leaderboard')->group(function () {
        Route::get('/', [LeaderboardController::class, 'index']);
    });

    Route::prefix('mall')->group(function () {
        Route::get('/items', [MallController::class, 'items']);
        Route::get('/inventory', [MallController::class, 'inventory']);
        Route::get('/buffs', [MallController::class, 'buffs']);
        Route::post('/buy', [MallController::class, 'buy']);
        Route::post('/use', [MallController::class, 'useItem']);
    });

    Route::prefix('mijing/timed-challenge')->group(function () {
        Route::get('/status', [MijingChallengeController::class, 'status']);
        Route::post('/start', [MijingChallengeController::class, 'start']);
        Route::post('/next-question', [MijingChallengeController::class, 'nextQuestion']);
        Route::post('/submit-answer', [MijingChallengeController::class, 'submitAnswer']);
        Route::post('/finish', [MijingChallengeController::class, 'finish']);
    });
});
