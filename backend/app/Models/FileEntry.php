<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FileEntry extends Model
{
    use HasUuids;

    protected $table = 'files';
    protected $fillable = [
        'doksli_id',
        'original_name',
        'stored_name',
        'mime_type',
        'file_size',
        'storage_path',
    ];

    public function doksli(): BelongsTo
    {
        return $this->belongsTo(Doksli::class, 'doksli_id');
    }
}
