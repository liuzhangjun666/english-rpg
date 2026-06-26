<?php

return [

    'code_ttl_seconds' => (int) env('SMS_CODE_TTL_SECONDS', 300),
    'code_max_attempts' => (int) env('SMS_CODE_MAX_ATTEMPTS', 5),
    'send_cooldown_seconds' => (int) env('SMS_SEND_COOLDOWN_SECONDS', 60),
    'daily_limit' => (int) env('SMS_DAILY_LIMIT', 10),
    'skip_daily_limit' => filter_var(env('SMS_SKIP_DAILY_LIMIT', false), FILTER_VALIDATE_BOOLEAN),

    'debug_bypass_enabled' => filter_var(env('SMS_DEBUG_BYPASS_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
    'debug_bypass_code' => env('SMS_DEBUG_BYPASS_CODE', '888888'),
    // Windows 本地 PHP 常缺 CA 证书；生产环境务必保持 true
    'http_verify_ssl' => filter_var(env('SMS_HTTP_VERIFY_SSL', true), FILTER_VALIDATE_BOOLEAN),

    'tencent' => [
        'secret_id' => env('TENCENTCLOUD_SECRET_ID', env('TENCENT_SMS_SECRET_ID')),
        'secret_key' => env('TENCENTCLOUD_SECRET_KEY', env('TENCENT_SMS_SECRET_KEY')),
        'sdk_app_id' => env('TENCENTCLOUD_SMS_SDK_APP_ID', env('TENCENT_SMS_APP_ID')),
        'sign_name' => env('TENCENTCLOUD_SMS_SIGN_NAME', env('TENCENT_SMS_SIGN', 'LevelUp英语修仙')),
        'template_id' => env('TENCENTCLOUD_SMS_TEMPLATE_ID', env('TENCENT_SMS_TEMPLATE_ID')),
        'template_extra_params' => env('TENCENTCLOUD_SMS_TEMPLATE_EXTRA_PARAMS', '5'),
        'region' => env('TENCENTCLOUD_SMS_REGION', 'ap-guangzhou'),
        'endpoint' => env('TENCENTCLOUD_SMS_ENDPOINT', 'sms.tencentcloudapi.com'),
        'timeout' => (int) env('TENCENTCLOUD_SMS_TIMEOUT', 15),
    ],

];
