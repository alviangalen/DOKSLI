<?php

namespace App\Http\Controllers;

use App\Models\AdminUser;
use App\Models\Comment;
use App\Models\Doksli;
use App\Models\FileEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class AdminController extends Controller
{
    /**
     * Admin Login with brute force rate limiting and credential validation.
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => 'required|string|max:100',
            'password' => 'required|string|max:255',
        ]);

        // Auto-seed default admin if database is empty
        if (AdminUser::count() === 0) {
            $defaultUsername = env('ADMIN_USERNAME', 'admin');
            $defaultPassword = env('ADMIN_PASSWORD', 'admin12345');
            AdminUser::create([
                'username' => $defaultUsername,
                'password' => Hash::make($defaultPassword),
            ]);
        }

        $admin = AdminUser::where('username', $validated['username'])->first();

        if (!$admin || !Hash::check($validated['password'], $admin->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Username atau password admin salah.',
            ], 401);
        }

        $token = $admin->generateToken($request->ip());

        return response()->json([
            'status' => 'success',
            'message' => 'Login admin berhasil.',
            'data' => [
                'username' => $admin->username,
                'token' => $token,
                'expires_at' => $admin->token_expires_at?->toISOString(),
            ],
        ]);
    }

    /**
     * Check current admin auth status.
     */
    public function me(Request $request): JsonResponse
    {
        /** @var AdminUser $admin */
        $admin = $request->attributes->get('auth_admin');

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $admin->id,
                'username' => $admin->username,
                'last_login_at' => $admin->last_login_at?->toISOString(),
                'last_login_ip' => $admin->last_login_ip,
            ],
        ]);
    }

    /**
     * Admin Dashboard Statistics.
     */
    public function stats(): JsonResponse
    {
        $totalDokslis = Doksli::count();
        $totalFiles = FileEntry::count();
        $totalComments = Comment::count();
        $totalStorageBytes = (int) FileEntry::sum('file_size');
        $totalViews = (int) Doksli::sum('view_count');

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_dokslis' => $totalDokslis,
                'total_files' => $totalFiles,
                'total_comments' => $totalComments,
                'total_storage_bytes' => $totalStorageBytes,
                'total_views' => $totalViews,
            ],
        ]);
    }

    /**
     * Get all Dokslis for management.
     */
    public function dokslis(Request $request): JsonResponse
    {
        $search = $request->query('search');

        $query = Doksli::withCount(['files', 'comments'])
            ->with(['files' => function ($q) {
                $q->select('id', 'doksli_id', 'original_name', 'mime_type', 'file_size', 'created_at');
            }]);

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        $dokslis = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json([
            'status' => 'success',
            'data' => $dokslis,
        ]);
    }

    /**
     * Delete a DOKSLI and permanently wipe its physical files from /mnt/storage.
     */
    public function deleteDoksli(string $id): JsonResponse
    {
        $doksli = Doksli::with(['files', 'allComments'])->findOrFail($id);
        $disk = Storage::disk('mnt_storage');

        // Delete all physical attached document/image files
        foreach ($doksli->files as $file) {
            if ($file->storage_path && $disk->exists($file->storage_path)) {
                $disk->delete($file->storage_path);
            }
        }

        // Delete all physical attached comment images
        foreach ($doksli->allComments as $comment) {
            if ($comment->image_path && !str_starts_with($comment->image_path, 'http')) {
                if ($disk->exists($comment->image_path)) {
                    $disk->delete($comment->image_path);
                }
            }
        }

        // Delete Doksli record from DB (foreign keys cascade to files and comments)
        $doksli->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Doksli beserta seluruh file terkait berhasil dihapus permanen.',
        ]);
    }

    /**
     * Delete a specific Comment and its physical attachment image.
     */
    public function deleteComment(string $id): JsonResponse
    {
        $comment = Comment::with('replies')->findOrFail($id);
        $disk = Storage::disk('mnt_storage');

        // Delete comment attachment if present
        if ($comment->image_path && !str_starts_with($comment->image_path, 'http')) {
            if ($disk->exists($comment->image_path)) {
                $disk->delete($comment->image_path);
            }
        }

        // Delete replies attachments
        foreach ($comment->replies as $reply) {
            if ($reply->image_path && !str_starts_with($reply->image_path, 'http')) {
                if ($disk->exists($reply->image_path)) {
                    $disk->delete($reply->image_path);
                }
            }
        }

        $comment->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Komentar berhasil dihapus.',
        ]);
    }

    /**
     * Change admin password with validation and Bcrypt hashing.
     */
    public function changePassword(Request $request): JsonResponse
    {
        /** @var AdminUser $admin */
        $admin = $request->attributes->get('auth_admin');

        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|max:100',
        ], [
            'new_password.min' => 'Password baru minimal harus 8 karakter.',
        ]);

        if (!Hash::check($validated['current_password'], $admin->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Password saat ini salah.',
            ], 422);
        }

        $admin->changePassword($validated['new_password']);

        return response()->json([
            'status' => 'success',
            'message' => 'Password admin berhasil diperbarui!',
        ]);
    }

    /**
     * Logout and revoke session token.
     */
    public function logout(Request $request): JsonResponse
    {
        /** @var AdminUser $admin */
        $admin = $request->attributes->get('auth_admin');

        if ($admin) {
            $admin->revokeToken();
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Logout berhasil.',
        ]);
    }
}
