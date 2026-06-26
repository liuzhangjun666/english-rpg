<?php

namespace Database\Seeders;

use App\Services\MallService;
use Illuminate\Database\Seeder;

class MallItemSeeder extends Seeder
{
    public function run(): void
    {
        MallService::seedItems();
        echo "Seeded mall items.\n";
    }
}
