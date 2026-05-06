<?php

return [
    /*
    | API 频率限制
    | 使用 Laravel 内置 RateLimiter
    | 在 AppServiceProvider 或 RouteServiceProvider 中注册
    */
    'api' => [
        'global' => '60,1',        // 全局：60次/分钟
        'auth' => '10,1',          // 登录注册：10次/分钟
        'exam' => '5,1',           // 渡劫：5次/分钟
        'submit' => '20,1',        // 提交：20次/分钟
    ],
];
