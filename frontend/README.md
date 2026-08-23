# 📂 DOKSLI

**DOKSLI** adalah platform web modern untuk berbagi dokumen, metadata, dan file meme original secara anonim tanpa perlu registrasi akun. Seluruh file yang diunggah disimpan secara aman di direktori Linux Storage (`/mnt/storage`) dengan perlindungan keamanan terhadap SQL Injection, XSS, dan eksekusi file berbahaya.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4
- **Backend**: Laravel 12 (PHP 8.5+), RESTful API
- **Database**: PostgreSQL
- **Storage**: Linux Filesystem (`/mnt/storage/uploads`)

---

## 📁 Struktur Direktori

```
DOKSLI/
├── frontend/             # Aplikasi Frontend React + Vite + Tailwind CSS v4
│   ├── src/
│   │   ├── api/          # Client API penghubung ke Backend Laravel
│   │   │   └── doksliApi.ts
│   │   ├── App.tsx       # UI Aplikasi Utama
│   │   ├── index.css     # Styling Tailwind CSS
│   │   └── main.tsx      # Entry point React
│   ├── package.json
│   └── vite.config.ts
│
├── backend/              # Aplikasi Backend REST API Laravel
│   ├── app/
│   │   ├── Http/Controllers/DoksliController.php
│   │   └── Models/       # Model Doksli, FileEntry, Comment
│   ├── config/           # Konfigurasi Storage (/mnt/storage), CORS, Database
│   ├── database/         # Migrasi PostgreSQL
│   ├── routes/api.php    # Endpoint REST API
│   └── .env
│
├── package.json          # Root helper script
└── README.md
```

---

## 🔒 Fitur Keamanan (Security Hardening)

1. **Anti SQL Injection**:
   - 100% menggunakan Laravel Eloquent ORM dan PDO Parameterized Binding. Tidak ada query SQL string concatenation mentah.
2. **Anti XSS (Cross-Site Scripting)**:
   - Sanitasi teks judul, deskripsi, dan komentar menggunakan `htmlspecialchars(strip_tags(...), ENT_QUOTES, 'UTF-8')`.
3. **Pengamanan File Upload & Anti Eksekusi Script**:
   - File yang disimpan di `/mnt/storage` diubah namanya menjadi **UUID acak** untuk mencegah eksploitasi *Path Traversal* (`../`) dan *File Enumeration*.
   - Pemblokiran otomatis terhadap ekstensi file eksekusi (`.php`, `.phtml`, `.phar`, `.exe`, `.sh`, `.js`, `.html`, `.htm`).
   - File disajikan melalui endpoint API terisolasi dengan header keamanan `X-Content-Type-Options: nosniff`.
4. **Rate Limiting**:
   - Middleware `throttle:60,1` untuk mencegah spamming komentar dan serangan brute force upload.

---

## ⚙️ Persyaratan Sistem (Prerequisites)

- **PHP** >= 8.2 dengan ekstensi: `pdo_pgsql`, `pgsql`, `xml`, `fileinfo`, `mbstring`, `curl`
- **Composer** (Package Manager PHP)
- **Node.js** >= 18 & npm / pnpm
- **PostgreSQL Database**
- **Direktori Linux Storage**: `/mnt/storage`

---

## 🚀 Panduan Instalasi & Menjalankan

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

## 📡 Daftar Endpoint REST API

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/dokslis` | Mendapatkan daftar semua Doksli beserta jumlah file & komentar |
| `POST` | `/api/dokslis` | Membuat Doksli baru & mengunggah file ke `/mnt/storage` |
| `GET` | `/api/dokslis/{id}` | Mengambil detail Doksli, daftar file, dan komentar |
| `POST` | `/api/dokslis/{id}/comments` | Menambahkan komentar baru (Anonim & Disanitasi) |
| `POST` | `/api/dokslis/{id}/view` | Menambah view count Doksli |
| `GET` | `/api/files/{id}/view` | Menampilkan atau mengunduh file secara aman dari `/mnt/storage` |

---

## 💡 Catatan Konfigurasi Upload File Besar (PHP)

Jika mengunggah file berukuran di atas 2 MB (hingga 100 MB), pastikan konfigurasi PHP (`php.ini`) mengizinkan ukuran tersebut:

```ini
upload_max_filesize = 100M
post_max_size = 100M
memory_limit = 512M
```
