<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LearningRecord;
use App\Models\Question;
use App\Services\CurrencyService;
use App\Services\HeartDemonService;
use App\Services\AchievementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GrammarController extends Controller
{
    private CurrencyService $currencyService;
    private HeartDemonService $demonService;
    private AchievementService $achievementService;

    public function __construct(CurrencyService $currencyService, HeartDemonService $demonService, AchievementService $achievementService)
    {
        $this->currencyService = $currencyService;
        $this->demonService = $demonService;
        $this->achievementService = $achievementService;
    }

    /** GET /api/grammar/questions?level=L1&stage=01 — 带心魔注入 */
    public function questions(Request $request): JsonResponse
    {
        $level = $request->query('level', 'L1');
        $stage = $request->query('stage', '01');
        $user = $request->user();

        $normalCount = 10;
        $allQuestions = $this->demonService->getInjectedQuestions($user->id, 'grammar', $level, $stage, $normalCount);

        if (empty($allQuestions)) {
            return response()->json(['success'=>false,'code'=>'NO_QUESTIONS','message'=>'该关卡暂无题目'], 404);
        }

        $demonCount = count(array_filter($allQuestions, fn($q) => !empty($q['_is_demon'])));

        return response()->json([
            'success' => true,
            'data' => [
                'level' => $level, 'stage' => $stage,
                'questions' => $allQuestions,
                'total' => count($allQuestions),
                'spirit_cost' => count($allQuestions) - $demonCount,
                'demon_injected' => $demonCount,
            ],
        ]);
    }

    /** POST /api/grammar/submit-batch — 含心魔记录 + 成就检查 */
    public function submitBatch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'level'=>'required|string','stage'=>'required|string',
            'answers'=>'required|array','answers.*.question_id'=>'required|string','answers.*.answer'=>'required|string',
        ]);
        $user = $request->user();
        $results = [];

        foreach ($data['answers'] as $ans) {
            $question = Question::where('question_id', $ans['question_id'])->first();
            $correct = $question && $question->correct_answer === $ans['answer'];
            $results[] = ['question_id' => $ans['question_id'], 'correct' => $correct];

            LearningRecord::create([
                'user_id' => $user->id, 'activity_type' => 'grammar',
                'activity_id' => $data['level'].'-'.$data['stage'],
                'question_id' => $ans['question_id'], 'is_correct' => $correct,
                'exp_gained' => $correct ? CurrencyService::EXP_PER_CORRECT : 0,
                'spirit_cost' => CurrencyService::SPIRIT_COST_PER_QUESTION,
                'time_spent' => 0, 'answer_data' => $ans,
            ]);

            if (!$correct) {
                $this->demonService->recordWrong($user->id, $ans['question_id'], 'grammar', $data['level']);
            } else {
                $this->demonService->recordCorrect($user->id, $ans['question_id']);
            }
        }

        $settlement = $this->currencyService->settleBatch($user, $results, count($data['answers']));

        // 成就检查
        $newAchs = $this->achievementService->onLevelSubmit($user, $results, $settlement['accuracy']);

        return response()->json([
            'success'=>true,
            'data'=>array_merge($settlement, ['new_achievements'=>$newAchs]),
        ]);
    }
}
