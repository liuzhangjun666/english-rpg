<?php

namespace Database\Seeders;

use App\Models\RechargeProduct;
use Illuminate\Database\Seeder;

class RechargeProductSeeder extends Seeder
{
    public function run(): void
    {
        self::seed();
    }

    public static function seed(): void
    {
        $products = [
            [
                'product_key' => 'jade_60',
                'name' => '小袋仙玉',
                'description' => '60 仙玉，初入仙府',
                'category' => 'jade_pack',
                'price_cents' => 600,
                'jade_amount' => 60,
                'bonus_jade' => 60,
                'sort_order' => 10,
                'limits' => ['first_bonus_jade' => 60],
            ],
            [
                'product_key' => 'jade_300',
                'name' => '中袋仙玉',
                'description' => '300 仙玉，修行常备',
                'category' => 'jade_pack',
                'price_cents' => 3000,
                'jade_amount' => 300,
                'bonus_jade' => 150,
                'sort_order' => 20,
                'limits' => ['first_bonus_jade' => 150],
            ],
            [
                'product_key' => 'jade_680',
                'name' => '大袋仙玉',
                'description' => '680 仙玉，灵脉充沛',
                'category' => 'jade_pack',
                'price_cents' => 6800,
                'jade_amount' => 680,
                'bonus_jade' => 200,
                'sort_order' => 30,
                'limits' => ['first_bonus_jade' => 200],
            ],
            [
                'product_key' => 'jade_1280',
                'name' => '宝袋仙玉',
                'description' => '1280 仙玉，宗门供奉',
                'category' => 'jade_pack',
                'price_cents' => 12800,
                'jade_amount' => 1280,
                'bonus_jade' => 320,
                'sort_order' => 40,
                'limits' => ['first_bonus_jade' => 320],
            ],
            [
                'product_key' => 'vip_monthly',
                'name' => '月卡仙籍',
                'description' => '30 天加速：灵力上限+20%、恢复加速、修为+15%',
                'category' => 'vip_monthly',
                'price_cents' => 1800,
                'jade_amount' => 180,
                'vip_days' => 30,
                'vip_type' => 'monthly',
                'sort_order' => 50,
            ],
            [
                'product_key' => 'vip_yearly',
                'name' => '年卡仙籍',
                'description' => '365 天加速权益，另赠 500 仙玉',
                'category' => 'vip_yearly',
                'price_cents' => 16800,
                'jade_amount' => 500,
                'vip_days' => 365,
                'vip_type' => 'yearly',
                'sort_order' => 60,
            ],
        ];

        foreach ($products as $product) {
            RechargeProduct::query()->updateOrCreate(
                ['product_key' => $product['product_key']],
                $product
            );
        }
    }
}
