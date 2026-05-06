<?php

namespace Tests\Unit;

use App\Services\ExamService;
use Tests\TestCase;

class ExamServiceTest extends TestCase
{
    private ExamService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ExamService();
    }

    public function test_grade_S()
    {
        $results = array_fill(0, 30, ['correct' => true]);
        $grade = $this->service->grade($results);

        $this->assertEquals('S', $grade['grade']);
        $this->assertTrue($grade['passed']);
        $this->assertEquals(100, $grade['score']);
        $this->assertEquals(30, $grade['correct']);
    }

    public function test_grade_A()
    {
        $results = array_fill(0, 27, ['correct' => true]);
        $results = array_merge($results, array_fill(0, 3, ['correct' => false]));

        $grade = $this->service->grade($results);

        $this->assertEquals('A', $grade['grade']);
        $this->assertTrue($grade['passed']);
    }

    public function test_grade_B()
    {
        $results = array_fill(0, 22, ['correct' => true]);
        $results = array_merge($results, array_fill(0, 8, ['correct' => false]));

        $grade = $this->service->grade($results);
        $this->assertEquals('B', $grade['grade']);
        $this->assertTrue($grade['passed']);
    }

    public function test_grade_C()
    {
        $results = array_fill(0, 18, ['correct' => true]);
        $results = array_merge($results, array_fill(0, 12, ['correct' => false]));

        $grade = $this->service->grade($results);

        $this->assertEquals('C', $grade['grade']);
        $this->assertTrue($grade['passed']);
    }

    public function test_grade_D_fails()
    {
        $results = array_fill(0, 10, ['correct' => true]);
        $results = array_merge($results, array_fill(0, 20, ['correct' => false]));

        $grade = $this->service->grade($results);

        $this->assertEquals('D', $grade['grade']);
        $this->assertFalse($grade['passed']);
    }

    public function test_calculate_reward()
    {
        $gradeResult = ['grade' => 'S', 'score' => 100, 'passed' => true, 'total' => 30, 'correct' => 30];
        $reward = $this->service->calculateReward($gradeResult);

        $this->assertEquals(300, $reward['exp_gained']); // 100 * 3.0
        $this->assertEquals(3.0, $reward['multiplier']);
        $this->assertGreaterThan(0, $reward['stones_gained']);
    }

    public function test_calculate_reward_D()
    {
        $gradeResult = ['grade' => 'D', 'score' => 30, 'passed' => false, 'total' => 30, 'correct' => 9];
        $reward = $this->service->calculateReward($gradeResult);

        $this->assertEquals(50, $reward['exp_gained']); // 100 * 0.5
        $this->assertEquals(0, $reward['stones_gained']);
    }

    public function test_can_take_exam()
    {
        $user = new \App\Models\User();
        $user->spirit_power = 30;

        $check = $this->service->canTakeExam($user, 'L1');
        $this->assertTrue($check['allowed']);
    }

    public function test_cannot_take_exam_low_spirit()
    {
        $user = new \App\Models\User();
        $user->spirit_power = 10;

        $check = $this->service->canTakeExam($user, 'L1');
        $this->assertFalse($check['allowed']);
    }
}
