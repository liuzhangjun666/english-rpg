<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\StoryProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoryController extends Controller
{
    public function __construct(private readonly StoryProgressService $storyService)
    {
    }

    public function sync(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_chapter' => 'nullable|string|max:32',
            'current_node' => 'nullable|string|max:64',
            'dao_heart' => 'nullable|integer|min:0|max:9999',
            'story_keys' => 'nullable|integer|min:0|max:9999',
            'unlocked_nodes' => 'nullable|array',
            'unlocked_nodes.*' => 'string|max:64',
            'story_progress' => 'nullable|array',
            'progress_currency' => 'nullable|array',
        ]);

        $snapshot = $this->storyService->sync($request->user(), $data);

        return response()->json([
            'success' => true,
            'data' => $snapshot,
        ]);
    }

    public function choice(Request $request): JsonResponse
    {
        $data = $request->validate([
            'chapter_id' => 'required|string|max:32',
            'node_id' => 'nullable|string|max:64',
            'selected_branch_id' => 'nullable|string|max:64',
            'next_chapter_id' => 'nullable|string|max:32',
            'dao_heart' => 'nullable|integer|min:0|max:9999',
            'story_keys' => 'nullable|integer|min:0|max:9999',
        ]);

        $snapshot = $this->storyService->applyChoice($request->user(), $data);

        return response()->json([
            'success' => true,
            'data' => $snapshot,
        ]);
    }
}

