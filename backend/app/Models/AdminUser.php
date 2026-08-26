<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminUser extends Model
{
    use HasUuids;

    protected $table = 'admin_users';

    protected $fillable = [
        'username',
        'password',
        'api_token',
        'token_expires_at',
        'last_login_at',
        'last_login_ip',
    ];

    protected $hidden = [
        'password',
        'api_token',
    ];

    protected function casts(): array
    {
        return [
            'token_expires_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    /**
     * Generate and save a secure session token valid for 24 hours.
     */
    public function generateToken(string $ip = null): string
    {
        $token = hash('sha256', Str::random(60) . microtime());
        $this->update([
            'api_token' => $token,
            'token_expires_at' => now()->addHours(24),
            'last_login_at' => now(),
            'last_login_ip' => $ip,
        ]);
        return $token;
    }

    /**
     * Invalidate session token.
     */
    public function revokeToken(): void
    {
        $this->update([
            'api_token' => null,
            'token_expires_at' => null,
        ]);
    }

    /**
     * Change admin password with Bcrypt hashing.
     */
    public function changePassword(string $newPassword): void
    {
        $this->update([
            'password' => Hash::make($newPassword),
        ]);
    }
}
