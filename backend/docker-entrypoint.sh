#!/usr/bin/env bash
set -e

# Buat file .env dari .env.example jika belum ada
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        touch .env
    fi
    chmod 666 .env
fi

echo "==> Menunggu database PostgreSQL (${DB_HOST:-postgres}:${DB_PORT:-5432}) siap..."
until pg_isready -h "${DB_HOST:-postgres}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-doksli_user}" >/dev/null 2>&1; do
    sleep 1
done
echo "==> PostgreSQL siap terhubung!"

# Pastikan folder storage dan cache memiliki izin akses penuh
mkdir -p "${DOKSLI_STORAGE_PATH:-/mnt/storage}/uploads" \
         storage/framework/cache/data \
         storage/framework/sessions \
         storage/framework/views \
         storage/logs \
         bootstrap/cache
chmod -R 777 "${DOKSLI_STORAGE_PATH:-/mnt/storage}" storage bootstrap/cache 2>/dev/null || true

# Generate APP_KEY jika belum ada
if [ -z "$APP_KEY" ]; then
    echo "==> APP_KEY belum di-set, membuat APP_KEY baru..."
    export APP_KEY=$(php artisan key:generate --show)
fi

# Jalankan migrasi database
echo "==> Menjalankan migrasi database..."
php artisan migrate --force

echo "==> DOKSLI Backend siap dijalankan!"
exec "$@"
