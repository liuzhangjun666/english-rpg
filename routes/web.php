<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/login', function () {
    return view('welcome');
})->name('login');

Route::get('/{path?}', function () {
    return view('welcome');
})->where('path', '^(?!api|build|storage|effects|images|fonts|sw\.js|manifest\.webmanifest).*$');
