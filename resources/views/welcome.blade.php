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
        $viteEntries = ['resources/js/main.js'];
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
    <div id="app">
        <div id="game-container"></div>
        <video
            class="hall-aura-video hall-aura-video-a active"
            muted
            playsinline
            preload="auto"
            src="/effects/hall_gold_aura.mp4">
        </video>

        <video
            class="hall-aura-video hall-aura-video-b"
            muted
            playsinline
            preload="auto"
            src="/effects/hall_gold_aura.mp4">
        </video>
        <div id="ui-overlay"></div>
    </div>
    <script>
    document.addEventListener('DOMContentLoaded', function () {
        const videos = Array.from(document.querySelectorAll('.hall-aura-video'));
        if (videos.length < 2) return;

        const FADE_SECONDS = 0.6;
        let activeIndex = 0;
        let switching = false;
        let hallActive = false;

        const isHallHash = () => {
            const hash = window.location.hash || '';
            if (!hash) return true;
            return hash.startsWith('#hall');
        };

        const pauseAll = () => {
            videos.forEach((video) => {
                video.classList.remove('active');
                video.pause();
                try {
                    video.currentTime = 0;
                } catch (e) {}
            });
        };

        const ensurePlaying = () => {
            const current = videos[activeIndex];
            if (!current) return;
            current.classList.add('active');
            const playPromise = current.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {});
            }
        };

        const syncHallVideoState = () => {
            hallActive = isHallHash() && !document.hidden;
            if (!hallActive) {
                switching = false;
                pauseAll();
                return;
            }
            ensurePlaying();
        };

        videos.forEach((video, index) => {
            video.muted = true;
            video.playsInline = true;
            video.loop = false;
            video.currentTime = 0;

            if (index === 0) {
                video.classList.add('active');
            } else {
                video.classList.remove('active');
                video.pause();
            }
        });

        function switchVideo() {
            if (switching || !hallActive) return;
            switching = true;

            const current = videos[activeIndex];
            const nextIndex = (activeIndex + 1) % videos.length;
            const next = videos[nextIndex];

            try {
                next.currentTime = 0;
            } catch (e) {}

            next.play().catch(() => {});
            next.classList.add('active');
            current.classList.remove('active');

            setTimeout(() => {
                if (!hallActive) {
                    switching = false;
                    pauseAll();
                    return;
                }
                current.pause();
                try {
                    current.currentTime = 0;
                } catch (e) {}
                activeIndex = nextIndex;
                switching = false;
            }, FADE_SECONDS * 1000);
        }

        videos.forEach((video) => {
            video.addEventListener('timeupdate', function () {
                if (!hallActive || !video.duration || switching) return;
                if (video.classList.contains('active') && video.currentTime >= video.duration - FADE_SECONDS) {
                    switchVideo();
                }
            });

            video.addEventListener('ended', function () {
                if (hallActive && video.classList.contains('active')) {
                    switchVideo();
                }
            });
        });

        window.addEventListener('hashchange', syncHallVideoState);
        document.addEventListener('visibilitychange', syncHallVideoState);
        syncHallVideoState();
    });
    </script>
</body>
</html>
