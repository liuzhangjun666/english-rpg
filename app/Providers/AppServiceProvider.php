<?php

namespace App\Providers;

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // 刷新令牌只能用于 /auth/refresh 的手动校验，禁止作为访问令牌通过 auth:sanctum 鉴权，
        // 否则长寿命的刷新凭证就等同于一个 7 天可用的访问令牌（最小权限原则）。
        Sanctum::authenticateAccessTokensUsing(
            function (PersonalAccessToken $accessToken, bool $isValid) {
                if ($accessToken->name === AuthController::REFRESH_TOKEN_NAME) {
                    return false;
                }

                return $isValid;
            }
        );
    }
}
