<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'phone' => '1' . fake()->numerify('##########'),
            'nickname' => '道友' . fake()->numerify('####'),
            'realm' => 'L1',
            'realm_stage' => 1,
            'exp' => 0,
            'spirit_power' => 100,
            'spirit_power_max' => 100,
            'spirit_stone' => 0,
            'spirit_power_date' => now()->format('Y-m-d'),
            'daily_minutes' => 0,
            'daily_minutes_date' => now()->format('Y-m-d'),
        ];
    }
}
