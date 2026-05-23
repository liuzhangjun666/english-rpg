$ErrorActionPreference = 'Stop'

$baseUrl = 'http://127.0.0.1:8000'
$paths = @(
    '/',
    '/hall',
    '/practice',
    '/reading',
    '/exam',
    '/mijing',
    '/mall',
    '/leaderboard'
)

try {
    $health = Invoke-WebRequest -Uri "$baseUrl/" -UseBasicParsing -TimeoutSec 5
} catch {
    Write-Host "SMOKE_SKIPPED: Laravel server is not reachable at $baseUrl"
    Write-Host "Start backend first: php artisan serve --host=127.0.0.1 --port=8000"
    exit 2
}

if ($health.StatusCode -ne 200) {
    Write-Error "SMOKE_FAILED: root route returned $($health.StatusCode)"
}

$failed = @()
foreach ($path in $paths) {
    try {
        $res = Invoke-WebRequest -Uri "$baseUrl$path" -UseBasicParsing -TimeoutSec 8
        if ($res.StatusCode -ne 200) {
            $failed += "$path => $($res.StatusCode)"
            continue
        }
        Write-Host "OK $path"
    } catch {
        $failed += "$path => $($_.Exception.Message)"
    }
}

if ($failed.Count -gt 0) {
    Write-Error ("SMOKE_FAILED:`n" + ($failed -join "`n"))
}

Write-Host 'SMOKE_PASS'
