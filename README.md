# Belajar Vibe Coding

## Tentang Aplikasi
Aplikasi ini adalah backend API (RESTful) yang dibangun menggunakan Bun, framework Elysia, Drizzle ORM, dan MySQL. Aplikasi ini menyediakan fitur dasar manajemen pengguna (User Management) dan autentikasi sederhana berbasis token (Register, Login, Get Current User, dan Logout).

## Arsitektur & Struktur File
Proyek ini menggunakan struktur direktori berbasis domain dan pemisahan *concern* untuk menjaga kebersihan kode:

- `src/`: Folder utama yang berisi kode sumber aplikasi.
  - `index.ts`: File *entry point* aplikasi, di mana server Elysia diinisialisasi dan *routes* didaftarkan.
  - `db/`: Folder konfigurasi database.
    - `db.ts`: Pengaturan koneksi ke database menggunakan Drizzle dan `mysql2`.
    - `schema.ts`: Definisi skema tabel database (menggunakan Drizzle schema).
  - `routes/`: Folder yang berisi definisi endpoint API (misal: `users-route.ts`).
  - `services/`: Folder yang berisi logika bisnis aplikasi, seperti fungsi registrasi dan autentikasi (misal: `users-service.ts`).
- `tests/`: Folder untuk *testing* aplikasi (misal: `users.test.ts`, `db-helper.ts`).
- `drizzle/`: Folder hasil *generate* dari Drizzle Kit yang berisi file *migration*.

## API yang Tersedia

### General
- `GET /`: Mengembalikan pesan *welcome*.
- `GET /users`: Mengambil daftar seluruh pengguna.

### Authentication & Users (`/api/users`)
- `POST /api/users`: Registrasi pengguna baru.
  - Body: `name`, `email`, `password`
- `POST /api/users/login`: Login pengguna.
  - Body: `email`, `password`
  - Response: Mengembalikan `token` sesi.
- `GET /api/users/current`: Mengambil data pengguna yang sedang login.
  - Header: `Authorization: Bearer <token>`
- `DELETE /api/users/logout`: Logout dan menghapus sesi pengguna.
  - Header: `Authorization: Bearer <token>`

## Schema Database
Terdapat dua tabel utama dalam database:

1. **users**
   - `id` (Int, Primary Key, Auto Increment)
   - `name` (VarChar 255, Not Null)
   - `email` (VarChar 255, Not Null, Unique)
   - `password` (VarChar 255, Not Null)
   - `createdAt` (Timestamp, Default Now)

2. **sessions**
   - `id` (Int, Primary Key, Auto Increment)
   - `token` (VarChar 255, Not Null)
   - `userId` (Int, Not Null, Foreign Key ke `users.id`)
   - `createdAt` (Timestamp, Default Now)

## Technology Stack
- **Bun**: Runtime JavaScript/TypeScript yang super cepat sekaligus *package manager*.
- **Elysia**: Web framework yang ergonomis dan sangat cepat untuk Bun.
- **Drizzle ORM**: ORM *type-safe* untuk berinteraksi dengan database.
- **MySQL**: Relational Database Management System.
- **TypeScript**: Bahasa pemrograman dengan *static typing*.

## Library yang Digunakan
- `elysia` (Web framework)
- `drizzle-orm` (ORM)
- `mysql2` (MySQL driver)
- `drizzle-kit` (Database migration & schema generation - *Dev Dependency*)
- `@types/bun` & `typescript` (*Dev Dependency*)

## Cara Setup Project

1. Pastikan Anda telah menginstal [Bun](https://bun.sh/) dan MySQL.
2. Clone atau unduh repositori ini.
3. Install semua dependencies:
   ```bash
   bun install
   ```
4. Buat file `.env` berdasarkan `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *Catatan: Sesuaikan URL koneksi database MySQL pada `DATABASE_URL` di dalam file `.env`.*
5. Buat database di server MySQL Anda (sesuai nama database di `.env`, contoh: `belajar_vibe_coding`).
6. *Generate* dan *push* skema database ke MySQL:
   ```bash
   bun run db:generate
   bun run db:push
   ```

## Cara Run Aplikasi

Untuk menjalankan aplikasi dalam mode *development* (dengan fitur *hot-reload*):

```bash
bun run dev
```

Aplikasi akan berjalan di `http://localhost:3000` (atau port default Elysia).

## Cara Test Aplikasi

Aplikasi ini dilengkapi dengan test menggunakan test runner bawaan Bun. Untuk menjalankan test:

```bash
bun test
```
