<?php

namespace Tests\Feature;

use App\Models\ListeningPassage;
use App\Services\ListeningImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListeningImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_imports_grouped_listening_payload(): void
    {
        $payload = [
            'import_source' => 'test_import',
            'realm' => 'Z1',
            'grade_level' => '初二',
            'level_tag' => '初中',
            'passages' => [
                [
                    'passage_no' => 1,
                    'listening_text' => 'Tom likes apples. Amy likes oranges.',
                    'questions' => [
                        [
                            'sub_id' => '1-1',
                            'content' => "1．Who likes apples?\nA．Tom\nB．Amy\nC．Jack",
                            'answer' => 'A',
                        ],
                        [
                            'sub_id' => '1-2',
                            'content' => "2．Who likes oranges?\nA．Tom\nB．Amy\nC．Jack",
                            'answer' => 'B',
                        ],
                    ],
                ],
            ],
        ];

        $stats = app(ListeningImportService::class)->importFromPayload($payload);

        $this->assertSame(1, $stats['passages']);
        $this->assertSame(2, $stats['questions']);
        $this->assertDatabaseHas('listening_passages', [
            'passage_code' => 'LP-Z1-G8-01',
            'grade_level' => '初二',
        ]);
        $this->assertSame(2, ListeningPassage::first()->questions()->count());
    }
}
