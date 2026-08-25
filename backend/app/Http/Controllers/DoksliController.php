<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Doksli;
use App\Models\FileEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DoksliController extends Controller
{
    public function index(): JsonResponse
    {
        $dokslis = Doksli::withCount(['files', 'allComments as comments_count'])
            ->with(['files' => function ($query) {
                $query->select('id', 'doksli_id', 'original_name', 'mime_type', 'file_size', 'created_at');
            }])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $dokslis,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'files' => 'nullable|array',
            'files.*' => 'file|max:102400',
        ], [
            'name.required' => 'Nama Doksli wajib diisi.',
            'files.*.file' => 'File yang diupload tidak valid.',
            'files.*.max' => 'Ukuran file tidak boleh melebihi 100MB.',
        ]);

        $doksli = Doksli::create([
            'name' => htmlspecialchars(strip_tags($validated['name']), ENT_QUOTES, 'UTF-8'),
            'description' => isset($validated['description']) ? htmlspecialchars(strip_tags($validated['description']), ENT_QUOTES, 'UTF-8') : null,
            'view_count' => 0,
        ]);

        if ($request->hasFile('files')) {
            $disk = Storage::disk('mnt_storage');
            foreach ($request->file('files') as $file) {
                $originalName = basename($file->getClientOriginalName());
                $mimeType = $file->getMimeType() ?? 'application/octet-stream';
                $fileSize = $file->getSize();
                $extension = strtolower($file->getClientOriginalExtension());

                $blockedExts = ['php', 'phtml', 'phar', 'exe', 'sh', 'js', 'html', 'htm', 'cgi', 'pl'];
                if (in_array($extension, $blockedExts)) {
                    continue;
                }

                $storedName = (string) Str::uuid() . ($extension ? '.' . $extension : '');
                $path = $file->storeAs('uploads', $storedName, 'mnt_storage');

                FileEntry::create([
                    'doksli_id' => $doksli->id,
                    'original_name' => $originalName,
                    'stored_name' => $storedName,
                    'mime_type' => $mimeType,
                    'file_size' => $fileSize,
                    'storage_path' => $path,
                ]);
            }
        }

        $doksli->load(['files', 'comments']);

        return response()->json([
            'status' => 'success',
            'message' => 'Doksli berhasil dibuat.',
            'data' => $doksli,
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $doksli = Doksli::with(['files', 'comments'])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $doksli,
        ]);
    }

    public function incrementView(string $id): JsonResponse
    {
        $doksli = Doksli::findOrFail($id);
        $doksli->increment('view_count');

        return response()->json([
            'status' => 'success',
            'view_count' => $doksli->view_count,
        ]);
    }

    public function addComment(Request $request, string $id): JsonResponse
    {
        $doksli = Doksli::findOrFail($id);

        $validated = $request->validate([
            'text' => 'nullable|string|max:2000',
            'parent_id' => 'nullable|uuid|exists:comments,id',
            'image' => 'nullable|file|mimes:jpeg,jpg,png,gif,webp|max:10240',
            'image_url' => 'nullable|url|max:2048',
        ]);

        if (empty($validated['text']) && !$request->hasFile('image') && empty($validated['image_url'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Komentar tidak boleh kosong (masukkan teks, gambar, atau GIF).',
            ], 422);
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $extension = strtolower($file->getClientOriginalExtension());
            $storedName = (string) Str::uuid() . ($extension ? '.' . $extension : '');
            $imagePath = $file->storeAs('comment_images', $storedName, 'mnt_storage');
        } elseif (!empty($validated['image_url'])) {
            $imagePath = $validated['image_url'];
        }

        $sanitizedText = isset($validated['text']) && trim($validated['text']) !== ''
            ? htmlspecialchars(strip_tags($validated['text']), ENT_QUOTES, 'UTF-8')
            : null;

        $comment = Comment::create([
            'doksli_id' => $doksli->id,
            'parent_id' => $validated['parent_id'] ?? null,
            'comment_text' => $sanitizedText,
            'image_path' => $imagePath,
            'posted_at' => now(),
            'ip_address' => hash('sha256', $request->ip() ?? ''),
        ]);

        $comment->load('replies');

        return response()->json([
            'status' => 'success',
            'data' => $comment,
        ], 201);
    }

    public function serveCommentImage(string $filename): BinaryFileResponse|JsonResponse
    {
        $disk = Storage::disk('mnt_storage');
        $cleanName = basename($filename);
        $path = 'comment_images/' . $cleanName;

        if (!$disk->exists($path)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gambar komentar tidak ditemukan.',
            ], 404);
        }

        $fullPath = $disk->path($path);
        $mimeType = @mime_content_type($fullPath) ?: 'image/jpeg';

        return response()->file($fullPath, [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    public function serveFile(string $id): BinaryFileResponse|JsonResponse
    {
        $fileEntry = FileEntry::findOrFail($id);
        $disk = Storage::disk('mnt_storage');

        if (!$disk->exists($fileEntry->storage_path)) {
            return response()->json([
                'status' => 'error',
                'message' => 'File tidak ditemukan di storage.',
            ], 404);
        }

        $fullPath = $disk->path($fileEntry->storage_path);

        return response()->file($fullPath, [
            'Content-Type' => $fileEntry->mime_type,
            'Content-Disposition' => 'inline; filename="' . addslashes($fileEntry->original_name) . '"',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
