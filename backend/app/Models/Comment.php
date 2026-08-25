<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Comment extends Model
{
    use HasUuids;

    protected $table = 'comments';
    protected $fillable = [
        'doksli_id',
        'comment_text',
        'posted_at',
        'ip_address',
    ];

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
}
