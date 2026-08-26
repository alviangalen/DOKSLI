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

# Sinkronisasi konfigurasi Database dari Docker Environment ke .env
if [ -n "$DB_HOST" ]; then
    sed -i "s|^DB_HOST=.*|DB_HOST=${DB_HOST}|" .env 2>/dev/null || true
fi
if [ -n "$DB_DATABASE" ]; then
    sed -i "s|^DB_DATABASE=.*|DB_DATABASE=${DB_DATABASE}|" .env 2>/dev/null || true
fi
if [ -n "$DB_USERNAME" ]; then
    sed -i "s|^DB_USERNAME=.*|DB_USERNAME=${DB_USERNAME}|" .env 2>/dev/null || true
fi
if [ -n "$DB_PASSWORD" ]; then
    sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD}|" .env 2>/dev/null || true
fi

# Sinkronisasi konfigurasi Admin Credentials
if [ -n "$ADMIN_USERNAME" ]; then
    if grep -q "^ADMIN_USERNAME=" .env; then
        sed -i "s|^ADMIN_USERNAME=.*|ADMIN_USERNAME=${ADMIN_USERNAME}|" .env 2>/dev/null || true
    else
        echo "ADMIN_USERNAME=${ADMIN_USERNAME}" >> .env
    fi
fi
if [ -n "$ADMIN_PASSWORD" ]; then
    if grep -q "^ADMIN_PASSWORD=" .env; then
        sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${ADMIN_PASSWORD}|" .env 2>/dev/null || true
    else
        echo "ADMIN_PASSWORD=${ADMIN_PASSWORD}" >> .env
    fi
fi

echo "==> Menunggu database PostgreSQL (${DB_HOST:-postgres}:${DB_PORT:-5432}) siap..."
until pg_isready -h "${DB_HOST:-postgres}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-doksli_user}" >/dev/null 2>&1; do
    sleep 1
done
echo "==> PostgreSQL siap terhubung!"

# Pastikan folder storage dan cache memiliki izin akses penuh
mkdir -p "${DOKSLI_STORAGE_PATH:-/mnt/storage}/uploads" \
         "${DOKSLI_STORAGE_PATH:-/mnt/storage}/comment_images" \
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
