<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LearningRecord;
use App\Models\Question;
use App\Services\AchievementService;
use App\Services\CurrencyService;
use App\Services\HeartDemonService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GrammarController extends Controller
{
    private CurrencyService $currencyService;
    private HeartDemonService $demonService;
    private AchievementService $achievementService;

    private const DEMO_QUESTIONS = [
        [
            'question_id' => 'GRAMMAR-DEMO-001',
            'type' => 'grammar',
            'question' => 'Ling ___ to the sect library every morning.',
            'options' => ['A' => 'go', 'B' => 'goes', 'C' => 'going', 'D' => 'went'],
            'correct_answer' => 'B',
            'explanation' => 'Third-person singular in present simple takes -s/-es.',
        ],
        [
            'question_id' => 'GRAMMAR-DEMO-002',
            'type' => 'grammar',
            'question' => 'They ___ practicing sword skills right now.',
            'options' => ['A' => 'is', 'B' => 'are', 'C' => 'was', 'D' => 'be'],
            'correct_answer' => 'B',
            'explanation' => 'Plural subject "they" uses "are" in present continuous.',
        ],
        [
            'question_id' => 'GRAMMAR-DEMO-003',
            'type' => 'grammar',
            'question' => 'Yesterday, Mei ___ a new spell in class.',
            'options' => ['A' => 'learn', 'B' => 'learns', 'C' => 'learned', 'D' => 'learning'],
            'correct_answer' => 'C',
            'explanation' => 'Past time marker "yesterday" requires past tense.',
        ],
        [
            'question_id' => 'GRAMMAR-DEMO-004',
            'type' => 'grammar',
            'question' => 'If it rains, we ___ in the hall.',
            'options' => ['A' => 'train', 'B' => 'trained', 'C' => 'will train', 'D' => 'training'],
            'correct_answer' => 'C',
            'explanation' => 'First conditional: If + present, will + base verb.',
        ],
        [
            'question_id' => 'GRAMMAR-DEMO-005',
            'type' => 'grammar',
            'question' => 'This is the disciple ___ solved the riddle.',
            'options' => ['A' => 'which', 'B' => 'whose', 'C' => 'who', 'D' => 'whom'],
            'correct_answer' => 'C',
            'explanation' => '"Who" is used for people as a subject relative pronoun.',
        ],
        [
            'question_id' => 'GRAMMAR-DEMO-006',
            'type' => 'grammar',
            'question' => 'There ___ three spirit stones on the table.',
            'options' => ['A' => 'is', 'B' => 'are', 'C' => 'was', 'D' => 'be'],
            'correct_answer' => 'B',
            'explanation' => 'Plural noun "stones" takes "are".',
        ],
        [
            'question_id' => 'GRAMMAR-DEMO-007',
            'type' => 'grammar',
            'question' => 'Master Han told us ___ noisy in the library.',
            'options' => ['A' => 'not be', 'B' => 'not to be', 'C' => 'to not', 'D' => 'be not'],
            'correct_answer' => 'B',
            'explanation' => 'tell + object + not to do.',
        ],
        [
            'question_id' => 'GRAMMAR-DEMO-008',
            'type' => 'grammar',
            'question' => 'By the time class started, Ling ___ his notes.',
            'options' => ['A' => 'finishes', 'B' => 'finished', 'C' => 'had finished', 'D' => 'has finished'],
            'correct_answer' => 'C',
            'explanation' => 'An earlier past action before another past action uses past perfect.',
        ],
        [
            'question_id' => 'GRAMMAR-DEMO-009',
            'type' => 'grammar',
            'question' => 'The scroll is ___ than the one we used yesterday.',
            'options' => ['A' => 'difficult', 'B' => 'more difficult', 'C' => 'most difficult', 'D' => 'difficulty'],
            'correct_answer' => 'B',
            'explanation' => 'Comparative form for long adjectives uses "more + adjective".',
        ],
        [
            'question_id' => 'GRAMMAR-DEMO-010',
            'type' => 'grammar',
            'question' => '___ you finish the task, report to the elder.',
            'options' => ['A' => 'Before', 'B' => 'After', 'C' => 'Until', 'D' => 'Since'],
            'correct_answer' => 'B',
            'explanation' => 'Meaning requires sequence: first finish, then report.',
        ],
        [
            'question_id' => 'GRAMMAR-DEMO-011',
            'type' => 'grammar',
            'question' => 'Neither Ling nor Mei ___ late for class.',
            'options' => ['A' => 'are', 'B' => 'were', 'C' => 'is', 'D' => 'be'],
            'correct_answer' => 'C',
            'explanation' => 'With neither...nor..., verb agrees with the nearest subject (Mei).',
        ],
        [
            'question_id' => 'GRAMMAR-DEMO-012',
            'type' => 'grammar',
            'question' => 'I look forward to ___ more ancient texts.',
            'options' => ['A' => 'read', 'B' => 'reads', 'C' => 'reading', 'D' => 'be read'],
            'correct_answer' => 'C',
            'explanation' => '"look forward to" is followed by a gerund.',
        ],
    ];

    public function __construct(CurrencyService $currencyService, HeartDemonService $demonService, AchievementService $achievementService)
    {
        $this->currencyService = $currencyService;
        $this->demonService = $demonService;
        $this->achievementService = $achievementService;
    }

    /**
     * GET /api/grammar/questions?level=L1&stage=01
     */
    public function questions(Request $request): JsonResponse
    {
        $level = $request->query('level', 'L1');
        $stage = $request->query('stage', '01');
        $user = $request->user();

        $normalCount = 10;
        $allQuestions = $this->demonService->getInjectedQuestions($user->id, 'grammar', $level, $stage, $normalCount);

        if (empty($allQuestions)) {
            $allQuestions = $this->demoQuestionsForStage($level, $stage, $normalCount);
        }

        $demonCount = count(array_filter($allQuestions, fn ($q) => !empty($q['_is_demon'])));

        return response()->json([
            'success' => true,
            'data' => [
                'level' => $level,
                'stage' => $stage,
                'questions' => $allQuestions,
                'total' => count($allQuestions),
                'spirit_cost' => count($allQuestions) - $demonCount,
                'demon_injected' => $demonCount,
                'is_demo' => $this->isDemoQuestionList($allQuestions),
            ],
        ]);
    }

    /**
     * POST /api/grammar/submit-batch
     */
    public function submitBatch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'level' => 'required|string',
            'stage' => 'required|string',
            'answers' => 'required|array',
            'answers.*.question_id' => 'required|string',
            'answers.*.answer' => 'required|string',
            'reported_wrong_ids' => 'sometimes|array',
            'reported_wrong_ids.*' => 'string',
        ]);

        $user = $request->user();
        $reportedWrongIds = collect($data['reported_wrong_ids'] ?? [])->flip();
        $results = [];
        $demoAnswerMap = $this->demoAnswerMap();

        foreach ($data['answers'] as $ans) {
            $question = Question::where('question_id', $ans['question_id'])->first();
            $correctAnswer = $question?->correct_answer ?? ($demoAnswerMap[$ans['question_id']] ?? null);
            $correct = $correctAnswer !== null && $correctAnswer === $ans['answer'];

            $results[] = [
                'question_id' => $ans['question_id'],
                'correct' => $correct,
            ];

            LearningRecord::create([
                'user_id' => $user->id,
                'activity_type' => 'grammar',
                'activity_id' => $data['level'] . '-' . $data['stage'],
                'question_id' => $ans['question_id'],
                'is_correct' => $correct,
                'exp_gained' => $correct ? CurrencyService::EXP_PER_CORRECT : 0,
                'spirit_cost' => CurrencyService::SPIRIT_COST_PER_QUESTION,
                'time_spent' => 0,
                'answer_data' => $ans,
            ]);

            // Only real DB questions enter heart-demon lifecycle.
            if ($question) {
                if (!$correct) {
                    if (!isset($reportedWrongIds[$ans['question_id']])) {
                        $this->demonService->recordWrong($user->id, $ans['question_id'], 'grammar', $data['level']);
                    }
                } else {
                    $this->demonService->recordCorrect($user->id, $ans['question_id']);
                }
            }
        }

        $settlement = $this->currencyService->settleBatch($user, $results, count($data['answers']));
        $newAchs = $this->achievementService->onLevelSubmit($user, $results, $settlement['accuracy']);

        return response()->json([
            'success' => true,
            'data' => array_merge($settlement, ['new_achievements' => $newAchs]),
        ]);
    }

    private function demoQuestionsForStage(string $level, string $stage, int $count): array
    {
        $normalizedStage = max(1, (int) ltrim($stage, '0'));
        $pool = self::DEMO_QUESTIONS;

        // Rotate by stage to keep each stage feeling slightly different.
        $offset = ($normalizedStage - 1) % count($pool);
        $rotated = array_merge(array_slice($pool, $offset), array_slice($pool, 0, $offset));
        $picked = array_slice($rotated, 0, min($count, count($rotated)));

        return array_map(function (array $q) use ($level, $stage) {
            $q['realm'] = $level;
            $q['stage'] = $stage;
            return $q;
        }, $picked);
    }

    private function demoAnswerMap(): array
    {
        $map = [];
        foreach (self::DEMO_QUESTIONS as $q) {
            $map[$q['question_id']] = $q['correct_answer'];
        }
        return $map;
    }

    private function isDemoQuestionList(array $questions): bool
    {
        if (empty($questions)) {
            return false;
        }

        $allDemoIds = array_flip(array_map(fn ($q) => $q['question_id'], self::DEMO_QUESTIONS));
        foreach ($questions as $q) {
            if (!isset($allDemoIds[$q['question_id'] ?? ''])) {
                return false;
            }
        }

        return true;
    }
}
