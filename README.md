# DOKSLI

**DOKSLI** adalah platform web modern untuk berbagi dokumen, metadata, dan file meme original secara anonim tanpa perlu registrasi akun. Seluruh file yang diunggah disimpan secara aman.

---

## ⚙️ Persyaratan Sistem (Prerequisites)

- **PHP** >= 8.2 dengan ekstensi: `pdo_pgsql`, `pgsql`, `xml`, `fileinfo`, `mbstring`, `curl`
- **Composer** (Package Manager PHP)
- **Node.js** >= 18 & npm / pnpm
- **PostgreSQL Database**
- **Direktori Linux Storage**: `/mnt/storage`

---

## Panduan Instalasi & Menjalankan

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

2. Konfigurasi file `.env` (pastikan kredensial PostgreSQL sesuai):
   ```env
   DB_CONNECTION=pgsql
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_DATABASE=doksli
   DB_USERNAME=doksli_user
   DB_PASSWORD=doksli_password

   FILESYSTEM_DISK=mnt_storage
   DOKSLI_STORAGE_PATH=/mnt/storage
   ```

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
   *Frontend akan aktif di URL yang tampil pada terminal (default `http://localhost:8443` atau `http://localhost:5173`).*

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

Jika mengunggah file berukuran di atas 2 MB (hingga 100 MB), pastikan konfigurasi PHP (`php.ini`) mengizinkan ukuran tersebut:

```ini
upload_max_filesize = 100M
post_max_size = 100M
memory_limit = 512M
```
