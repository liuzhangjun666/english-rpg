<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>LevelUp 英语修仙</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @vite(['resources/css/game.css', 'resources/js/main.js'])
</head>
<body>
    <div id="app">
        <div id="game-container"></div>
        <div id="ui-overlay"></div>
    </div>
</body>
</html>
