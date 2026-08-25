<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('comments', function (Blueprint $table) {
            if (!Schema::hasColumn('comments', 'parent_id')) {
                $table->foreignUuid('parent_id')->nullable()->after('doksli_id')->constrained('comments')->cascadeOnDelete();
            }
            if (!Schema::hasColumn('comments', 'image_path')) {
                $table->string('image_path')->nullable()->after('comment_text');
            }
        });
    }

    public function down(): void
    {
        Schema::table('comments', function (Blueprint $table) {
            if (Schema::hasColumn('comments', 'parent_id')) {
                $table->dropForeign(['parent_id']);
                $table->dropColumn('parent_id');
            }
            if (Schema::hasColumn('comments', 'image_path')) {
                $table->dropColumn('image_path');
            }
        });
    }
};
