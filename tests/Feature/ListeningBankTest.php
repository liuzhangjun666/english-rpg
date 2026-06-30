<?php

namespace Tests\Feature;

use App\Models\ListeningPassage;
use App\Models\ListeningQuestion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ListeningBankTest extends TestCase
{
    use RefreshDatabase;

    public function test_listening_questions_grouped_by_passage(): void
    {
        $user = User::factory()->create(['realm' => 'L1']);
        Sanctum::actingAs($user);

        $passage = ListeningPassage::create([
            'passage_code' => 'LP-L1-01-01',
            'realm' => 'L1',
            'stage' => '01',
            'title' => '测试材料',
            'listening_text' => 'Tom likes apples. Amy likes oranges.',
            'word' => 'food',
        ]);

        $q1 = ListeningQuestion::create([
            'passage_id' => $passage->id,
            'question_no' => 1,
            'question' => 'Who likes apples?',
            'options' => ['A' => 'Tom', 'B' => 'Amy'],
            'correct_answer' => 'A',
        ]);
        $q2 = ListeningQuestion::create([
            'passage_id' => $passage->id,
            'question_no' => 2,
            'question' => 'Who likes oranges?',
            'options' => ['A' => 'Tom', 'B' => 'Amy'],
            'correct_answer' => 'B',
        ]);

        $response = $this->getJson('/api/listening/questions?stage=01');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data.questions')
            ->assertJsonPath('data.questions.0.passage_id', 'LP-' . $passage->id)
            ->assertJsonPath('data.questions.0.listening_text', 'Tom likes apples. Amy likes oranges.')
            ->assertJsonPath('data.questions.0.question_no_in_passage', 1)
            ->assertJsonPath('data.questions.0.passage_question_total', 2)
            ->assertJsonPath('data.questions.1.question_id', 'LQ-' . $q2->id)
            ->assertJsonPath('data.questions.1.question_no_in_passage', 2);

        $submit = $this->postJson('/api/listening/submit-batch', [
            'level' => 'L1',
            'stage' => '01',
            'answers' => [
                ['question_id' => 'LQ-' . $q1->id, 'answer' => 'A'],
                ['question_id' => 'LQ-' . $q2->id, 'answer' => 'B'],
            ],
        ]);

        $submit->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.correct_count', 2);
    }
}
