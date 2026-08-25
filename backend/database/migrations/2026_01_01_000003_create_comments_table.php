<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('doksli_id')->constrained('dokslis')->cascadeOnDelete();
            $table->foreignUuid('parent_id')->nullable()->constrained('comments')->cascadeOnDelete();
            $table->text('comment_text')->nullable();
            $table->string('image_path')->nullable();
            $table->timestamp('posted_at');
            $table->string('ip_address')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};
