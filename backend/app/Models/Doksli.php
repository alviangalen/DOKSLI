<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Doksli extends Model
{
    use HasUuids;

    protected $table = 'dokslis';
    protected $fillable = ['name', 'description', 'view_count'];

    public function files(): HasMany
    {
        return $this->hasMany(FileEntry::class, 'doksli_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class, 'doksli_id')
            ->whereNull('parent_id')
            ->with(['replies' => function ($q) {
                $q->orderBy('posted_at', 'asc');
            }])
            ->orderBy('posted_at', 'desc');
    }

    public function allComments(): HasMany
    {
        return $this->hasMany(Comment::class, 'doksli_id');
    }
}
