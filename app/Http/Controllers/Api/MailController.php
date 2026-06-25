<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MailController extends Controller
{
    public function __construct(private readonly MailService $mailService) {}

    /** GET /api/mail/inbox */
    public function inbox(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->mailService->inbox($request->user()),
        ]);
    }

    /** POST /api/mail/read */
    public function markRead(Request $request): JsonResponse
    {
        $data = $request->validate([
            'message_id' => 'required|string|max:64',
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->mailService->markRead($request->user(), $data['message_id']),
        ]);
    }
}
