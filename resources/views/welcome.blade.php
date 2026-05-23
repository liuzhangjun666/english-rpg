<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>LevelUp 英语修仙</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#d4a843">
    <link rel="manifest" href="/manifest.webmanifest">
    @php
        $viteEntries = ['resources/js/main.js', 'resources/js/vue/main.ts'];
        $hotFile = public_path('hot');
        $shouldUseDevServer = false;

        if (file_exists($hotFile)) {
            $hotUrl = trim((string) file_get_contents($hotFile));
            $probeUrl = rtrim($hotUrl, '/') . '/@vite/client';
            $ctx = stream_context_create([
                'http' => [
                    'method' => 'GET',
                    'timeout' => 0.35,
                ],
            ]);
            $probe = @file_get_contents($probeUrl, false, $ctx);
            $shouldUseDevServer = is_string($probe) && str_contains($probe, 'vite');
        }
    @endphp

    @if ($shouldUseDevServer)
        @vite($viteEntries)
    @else
        {{
            Illuminate\Support\Facades\Vite::useHotFile(storage_path('framework/vite.disabled.hot'))
                ->withEntryPoints($viteEntries)
        }}
    @endif
</head>
<body>
    <script>
        window.__VUE_MIGRATION_ACTIVE__ = true;
    </script>
    <div id="app">
        <div id="game-container"></div>
        <div id="ui-overlay">
            <div id="vue-app"></div>
        </div>
    </div>
</body>
</html>
