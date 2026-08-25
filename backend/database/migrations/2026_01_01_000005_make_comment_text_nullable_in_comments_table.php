<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Ensure comment_text column is nullable in PostgreSQL
        DB::statement('ALTER TABLE comments ALTER COLUMN comment_text DROP NOT NULL;');
    }

    public function down(): void
    {
        DB::statement("UPDATE comments SET comment_text = '' WHERE comment_text IS NULL;");
        DB::statement('ALTER TABLE comments ALTER COLUMN comment_text SET NOT NULL;');
    }
};
