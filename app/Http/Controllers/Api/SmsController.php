<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SmsController extends Controller
{
    private SmsService $smsService;

    public function __construct(SmsService $smsService)
    {
        $this->smsService = $smsService;
    }

    /**
     * 发送验证码
     * POST /api/sms/send
     */
    public function send(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'phone' => 'required|string|size:11',
            'action' => 'nullable|string|in:login,register,bind',
        ], [
            'phone.required' => '请输入手机号',
            'phone.size' => '请输入11位手机号',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $action = $request->action ?? 'login';

        if ($action === 'register' && User::where('phone', $request->phone)->exists()) {
            return response()->json([
                'success' => false,
                'code' => 'PHONE_ALREADY_REGISTERED',
                'next_action' => 'login',
                'message' => '该手机号已被注册，请返回登录页面进行登录',
            ]);
        }

        $result = $this->smsService->send($request->phone, $action);

        if (!$result['success']) {
            $status = match ($result['code'] ?? null) {
                'SMS_RESEND_COOLDOWN', 'SMS_DAILY_LIMIT' => 429,
                default => 503,
            };

            return response()->json([
                'success' => false,
                'code' => $result['code'] ?? 'SMS_SEND_FAILED',
                'message' => $result['message'],
                'retry_after' => $result['retry_after'] ?? null,
            ], $status);
        }

        $response = ['success' => true, 'message' => $result['message']];

        // 开发环境返回验证码方便调试
        if (isset($result['debug_code'])) {
            $response['debug_code'] = $result['debug_code'];
        }

        return response()->json($response);
    }
}
