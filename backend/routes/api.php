<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\DoksliController;
use App\Http\Middleware\AdminAuthMiddleware;
use Illuminate\Support\Facades\Route;

// ─── Public API Endpoints (with rate limiting) ────────────────────────────────
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/dokslis', [DoksliController::class, 'index']);
    Route::post('/dokslis', [DoksliController::class, 'store']);
    Route::get('/dokslis/{id}', [DoksliController::class, 'show']);
    Route::post('/dokslis/{id}/view', [DoksliController::class, 'incrementView']);
    Route::post('/dokslis/{id}/comments', [DoksliController::class, 'addComment']);
    Route::get('/comments/image/{filename}', [DoksliController::class, 'serveCommentImage']);
    Route::get('/files/{id}/view', [DoksliController::class, 'serveFile']);
});

// ─── Admin Authentication (Strict Brute-Force Rate Limiting: 5 attempts/min) ──
Route::post('/admin/login', [AdminController::class, 'login'])->middleware('throttle:5,1');

// ─── Protected Admin Panel Endpoints ──────────────────────────────────────────
Route::prefix('admin')->middleware(AdminAuthMiddleware::class)->group(function () {
    Route::get('/me', [AdminController::class, 'me']);
    Route::get('/stats', [AdminController::class, 'stats']);
    Route::get('/dokslis', [AdminController::class, 'dokslis']);
    Route::delete('/dokslis/{id}', [AdminController::class, 'deleteDoksli']);
    Route::delete('/comments/{id}', [AdminController::class, 'deleteComment']);
    Route::post('/change-password', [AdminController::class, 'changePassword']);
    Route::post('/logout', [AdminController::class, 'logout']);
});
