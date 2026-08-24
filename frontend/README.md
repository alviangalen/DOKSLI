# DOKSLI

**DOKSLI** adalah platform web modern untuk berbagi dokumen, metadata, dan file meme original secara anonim tanpa perlu registrasi akun. Seluruh file yang diunggah disimpan secara aman.

---

## Menjalankan dengan Docker (Paling Direkomendasikan)

Dengan Docker & Docker Compose, seluruh aplikasi (Frontend React/Nginx, Backend Laravel, Database PostgreSQL, dan Storage Volume) dapat langsung dijalankan tanpa perlu setup manual di host.

### Prasyarat
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/)

### 1. Konfigurasi Environment (`.env`)

Salin template environment [`.env.docker.example`](file:///.env.docker.example) menjadi `.env` di direktori root proyek:

```bash
cp .env.docker.example .env
```

Buka file `.env` tersebut dan sesuaikan konfigurasinya (terutama jika digunakan di lingkungan produksi):

```env
# =================================================================
# DOKSLI Docker Environment Configuration
# =================================================================

# Port Mapping di Host
FRONTEND_PORT=80        # Port untuk akses Web Frontend
BACKEND_PORT=8000       # Port untuk akses REST API Backend langsung
DB_PORT=5432            # Port database PostgreSQL di host

# Backend Application Settings
APP_NAME=DOKSLI
APP_ENV=production      # Set 'local' untuk development atau 'production' untuk server produksi
APP_DEBUG=false         # Set 'true' untuk debug atau 'false' untuk produksi
APP_KEY=                # Biarkan kosong jika ingin di-generate otomatis saat start container
APP_URL=http://localhost # Sesuaikan dengan domain/IP publik server Anda

# Database Credentials
DB_DATABASE=doksli
DB_USERNAME=doksli_user
DB_PASSWORD=doksli_password # Ganti dengan password yang kuat untuk lingkungan produksi
```

> **Catatan**: Saat menggunakan Docker, Anda **cukup mengonfigurasi satu file `.env` di direktori root**. Docker Compose akan secara otomatis menyalurkan variabel environment ini ke container Backend, Frontend, dan Database PostgreSQL.

### 2. Jalankan Container
Dari direktori root proyek `DOKSLI`:

```bash
docker compose up -d --build
```

### 3. Akses Aplikasi
- **Web Frontend (UI)**: [http://localhost](http://localhost) (atau port sesuai `FRONTEND_PORT`)
- **Backend REST API**: [http://localhost:8000/api](http://localhost:8000/api) atau melalui proxy [http://localhost/api](http://localhost/api)
- **Database PostgreSQL**: `localhost:5432` (User, Password, dan DB sesuai `.env`)

### 4. Perintah Bermanfaat
```bash
# Melihat log backend
docker compose logs -f backend

# Melihat status semua container
docker compose ps

# Menghentikan container
docker compose down

# Menghentikan dan menghapus volume database & storage
docker compose down -v
```

---

## Menjalankan Manual Tanpa Docker (Development)

### Persyaratan Sistem (Prerequisites)

- **PHP** >= 8.3 dengan ekstensi: `pdo_pgsql`, `pgsql`, `xml`, `fileinfo`, `mbstring`, `curl`, `gd`, `zip`
- **Composer** (Package Manager PHP)
- **Node.js** >= 18 & npm / pnpm
- **PostgreSQL Database**
- **Direktori Linux Storage**: `/mnt/storage`

---

### 1. Persiapan Direktori Storage Linux

Pastikan direktori `/mnt/storage` sudah dibuat dan memiliki izin akses:

```bash
sudo mkdir -p /mnt/storage/uploads
sudo chown -R $USER:$USER /mnt/storage
sudo chmod -R 775 /mnt/storage
```

---

### 2. Setup Backend (Laravel + PostgreSQL)

1. Masuk ke folder backend:
   ```bash
   cd backend
   ```

2. Konfigurasi file `.env`:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
   *Pastikan parameter database (`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`) pada `backend/.env` sudah sesuai dengan database PostgreSQL lokal Anda.*

3. Jalankan migrasi database:
   ```bash
   php artisan migrate
   ```

4. Jalankan server Backend Laravel:
   ```bash
   php artisan serve --host=0.0.0.0 --port=8000
   ```
   *Backend REST API akan aktif di `http://localhost:8000/api`.*

---

### 3. Setup Frontend (React)

Buka terminal baru:

1. Masuk ke folder frontend dan install dependensi:
   ```bash
   cd frontend
   npm install
   ```

2. Jalankan server Frontend:
   ```bash
   npm run dev
   ```
   *Frontend akan aktif di URL yang tampil pada terminal (default `http://localhost:5173`).*

---

## Daftar Endpoint REST API

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/dokslis` | Mendapatkan daftar semua Doksli beserta jumlah file & komentar |
| `POST` | `/api/dokslis` | Membuat Doksli baru & mengunggah file ke `/mnt/storage` |
| `GET` | `/api/dokslis/{id}` | Mengambil detail Doksli, daftar file, dan komentar |
| `POST` | `/api/dokslis/{id}/comments` | Menambahkan komentar baru (Anonim & Disanitasi) |
| `POST` | `/api/dokslis/{id}/view` | Menambah view count Doksli |
| `GET` | `/api/files/{id}/view` | Menampilkan atau mengunduh file secara aman dari `/mnt/storage` |

---

## Catatan Konfigurasi Upload File Besar (PHP)

Jika mengunggah file berukuran di atas 2 MB (hingga 100 MB), pastikan konfigurasi PHP (`php.ini` atau Docker environment) mengizinkan ukuran tersebut:

```ini
upload_max_filesize = 100M
post_max_size = 100M
memory_limit = 512M
```
