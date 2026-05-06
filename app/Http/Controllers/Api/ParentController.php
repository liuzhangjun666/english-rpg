<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ParentController extends Controller
{
    private ReportService $reportService;

    public function __construct(ReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    /**
     * 家长绑定
     * POST /api/parent/bind
     */
    public function bind(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'parent_phone' => 'required|string|size:11',
            'code' => 'required|string|size:6',
        ], [
            'parent_phone.required' => '请输入家长手机号',
            'parent_phone.size' => '请输入11位手机号',
            'code.required' => '请输入验证码',
            'code.size' => '验证码为6位数字',
        ]);

        if ($validator->fails()) {
            return response()->json(['success'=>false,'code'=>'VALIDATION_ERROR','message'=>$validator->errors()->first()], 422);
        }

        if ($request->phone === $request->parent_phone) {
            return response()->json(['success'=>false,'code'=>'SAME_AS_SELF','message'=>'家长手机号不能与本人相同'], 422);
        }

        $user = $request->user();
        $user->update([
            'parent_phone' => $request->parent_phone,
            'parent_verified' => true,
        ]);

        if ($user->is_minor && $user->spirit_power_max < 100) {
            $user->update(['spirit_power_max' => 100, 'spirit_power' => 100]);
        }

        return response()->json(['success'=>true,'data'=>$user]);
    }

    /**
     * 获取家长端摘要（三卡极简数据）
     * GET /api/parent/dashboard
     */
    public function dashboard(Request $request): JsonResponse
    {
        $data = $this->reportService->parentDashboard($request->user());

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * 获取日报数据
     * GET /api/parent/report?type=daily
     */
    public function report(Request $request): JsonResponse
    {
        $type = $request->query('type', 'daily');
        $user = $request->user();

        if ($type === 'daily') {
            $data = $this->reportService->dailySummary($user);
        } else {
            $data = $this->reportService->parentDashboard($user);
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
}
