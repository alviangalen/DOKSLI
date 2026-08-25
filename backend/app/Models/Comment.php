<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Comment extends Model
{
    use HasUuids;

    protected $table = 'comments';
    protected $fillable = [
        'doksli_id',
        'parent_id',
        'comment_text',
        'image_path',
        'posted_at',
        'ip_address',
    ];

    protected $appends = ['image_url'];

    protected function casts(): array
    {
        return [
            'posted_at' => 'datetime',
        ];
    }

    public function doksli(): BelongsTo
    {
        return $this->belongsTo(Doksli::class, 'doksli_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Comment::class, 'parent_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(Comment::class, 'parent_id')->with('replies')->orderBy('posted_at', 'asc');
    }

    public function getImageUrlAttribute(): ?string
    {
        if (!$this->image_path) {
            return null;
        }

        if (str_starts_with($this->image_path, 'http://') || str_starts_with($this->image_path, 'https://')) {
            return $this->image_path;
        }

        return '/api/comments/image/' . basename($this->image_path);
    }
}
