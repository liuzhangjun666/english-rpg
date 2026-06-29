<?php

return [
    'enabled' => env('RECHARGE_ENABLED', true),

    /** 开发/测试：创建订单后可调 mock 接口完成支付 */
    'mock_pay' => env('RECHARGE_MOCK_PAY', env('APP_ENV', 'production') !== 'production'),

    'jade_per_cny' => (int) env('RECHARGE_JADE_PER_CNY', 10),
    'jade_to_stone_rate' => (int) env('RECHARGE_JADE_TO_STONE_RATE', 10),

    'minor_single_limit_cents' => (int) env('RECHARGE_MINOR_SINGLE_LIMIT_CENTS', 5000),
    'minor_monthly_limit_cents' => (int) env('RECHARGE_MINOR_MONTHLY_LIMIT_CENTS', 20000),

    'order_expire_minutes' => (int) env('RECHARGE_ORDER_EXPIRE_MINUTES', 30),

    'wechat' => [
        'app_id' => env('WECHAT_PAY_APP_ID', ''),
        'mch_id' => env('WECHAT_PAY_MCH_ID', ''),
        'api_key' => env('WECHAT_PAY_API_KEY', ''),
        'notify_url' => env('WECHAT_PAY_NOTIFY_URL', ''),
    ],
];
