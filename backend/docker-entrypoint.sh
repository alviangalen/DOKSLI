#!/usr/bin/env bash
set -e

echo "==> Menunggu database PostgreSQL (${DB_HOST:-postgres}:${DB_PORT:-5432}) siap..."
until pg_isready -h "${DB_HOST:-postgres}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-doksli_user}" >/dev/null 2>&1; do
    sleep 1
done
echo "==> PostgreSQL siap terhubung!"

# Pastikan folder storage /mnt/storage tersedia dan memiliki izin akses
mkdir -p "${DOKSLI_STORAGE_PATH:-/mnt/storage}/uploads"
chmod -R 777 "${DOKSLI_STORAGE_PATH:-/mnt/storage}" 2>/dev/null || true
chmod -R 777 storage bootstrap/cache 2>/dev/null || true

# Generate APP_KEY jika belum ada di environment
if [ -z "$APP_KEY" ]; then
    echo "==> APP_KEY belum di-set, membuat APP_KEY baru..."
    php artisan key:generate --force
fi

# Jalankan migrasi database
echo "==> Menjalankan migrasi database..."
php artisan migrate --force

echo "==> DOKSLI Backend siap dijalankan!"
exec "$@"
