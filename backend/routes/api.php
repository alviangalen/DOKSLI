<?php

use App\Http\Controllers\DoksliController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:60,1')->group(function () {
    Route::get('/dokslis', [DoksliController::class, 'index']);
    Route::post('/dokslis', [DoksliController::class, 'store']);
    Route::get('/dokslis/{id}', [DoksliController::class, 'show']);
    Route::post('/dokslis/{id}/view', [DoksliController::class, 'incrementView']);
    Route::post('/dokslis/{id}/comments', [DoksliController::class, 'addComment']);
    Route::get('/comments/image/{filename}', [DoksliController::class, 'serveCommentImage']);
    Route::get('/files/{id}/view', [DoksliController::class, 'serveFile']);
});
