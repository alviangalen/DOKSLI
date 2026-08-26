<?php

namespace App\Http\Middleware;

use App\Models\AdminUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminAuthMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken() ?: $request->header('X-Admin-Token');

        if (!$token) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized: Token autentikasi admin tidak ditemukan.',
            ], 401);
        }

        $admin = AdminUser::where('api_token', $token)
            ->where('token_expires_at', '>', now())
            ->first();

        if (!$admin) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized: Sesi admin telah berakhir atau tidak valid. Silakan login kembali.',
            ], 401);
        }

        // Attach authenticated admin to request attribute
        $request->attributes->set('auth_admin', $admin);

        return $next($request);
    }
}
