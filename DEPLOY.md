# Menaruh Gerbang Awakening Online (Railway)

Railway dipilih karena bisa menjalankan Node.js **dan** menyediakan database
MySQL terkelola dalam satu tempat, tanpa perlu mengurus server sendiri, dan
punya paket gratis untuk mulai. Prosesnya kurang lebih 10–15 menit.

Kalau kamu sudah punya preferensi lain (Render, VPS sendiri, dsb) prinsipnya
sama saja: siapkan MySQL, set environment variable, deploy kode Node.js-nya.
Bagian akhir file ini menjelaskan alternatif itu.

## 1. Unggah kode ke GitHub

Railway men-deploy dari repository GitHub.

```bash
cd gerbang-awakening
git init
git add .
git commit -m "Gerbang Awakening"
```

Buat repository baru di GitHub (bisa privat), lalu:

```bash
git remote add origin https://github.com/USERNAME/gerbang-awakening.git
git branch -M main
git push -u origin main
```

> `.env` sudah otomatis diabaikan lewat `.gitignore` — jangan pernah commit
> file itu karena berisi kredensial.

## 2. Buat project di Railway

1. Buka [railway.app](https://railway.app) → daftar/masuk (bisa pakai akun
   GitHub).
2. **New Project → Deploy from GitHub repo** → pilih repo
   `gerbang-awakening` yang baru di-push.
3. Railway otomatis mendeteksi ini project Node.js dan menjalankan
   `npm install` + `npm start`.

## 3. Tambahkan database MySQL

1. Di dalam project yang sama, klik **New → Database → Add MySQL**.
2. Railway otomatis membuat instance MySQL dan menyediakan environment
   variable seperti `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`,
   `MYSQLDATABASE`.

## 4. Hubungkan environment variable

Buka service **Node.js**-mu di Railway → tab **Variables** → tambahkan:

| Variable       | Nilai                                          |
|----------------|-------------------------------------------------|
| `DB_HOST`      | `${{MySQL.MYSQLHOST}}`                          |
| `DB_PORT`      | `${{MySQL.MYSQLPORT}}`                          |
| `DB_USER`      | `${{MySQL.MYSQLUSER}}`                          |
| `DB_PASSWORD`  | `${{MySQL.MYSQLPASSWORD}}`                      |
| `DB_NAME`      | `${{MySQL.MYSQLDATABASE}}`                      |
| `JWT_SECRET`   | string acak yang panjang (buat sendiri)         |

Railway mendukung referensi `${{ServiceName.VARIABLE}}` untuk otomatis
mengambil nilai dari service MySQL — jadi kamu tidak perlu menyalin manual.
`PORT` tidak perlu diisi manual, Railway sudah menyediakannya otomatis dan
`server.js` sudah membaca `process.env.PORT`.

## 5. Import skema database

Ambil kredensial koneksi publik MySQL dari tab **Connect** di service MySQL
Railway, lalu dari komputermu:

```bash
mysql -h <MYSQLHOST> -P <MYSQLPORT> -u <MYSQLUSER> -p<MYSQLPASSWORD> < schema.sql
```

(Skema ini membuat database `gerbang_awakening` sendiri — kalau Railway sudah
menyediakan nama database default berbeda, sesuaikan `DB_NAME` di step 4 agar
cocok, atau edit baris `CREATE DATABASE` / `USE` di `schema.sql`.)

## 6. Deploy & buka

Railway otomatis redeploy tiap kali kamu `git push`. Setelah build selesai,
buka tab **Settings → Networking → Generate Domain** untuk mendapat URL
publik seperti `https://gerbang-awakening-production.up.railway.app`.

Selesai — website-nya sudah bisa diakses siapa saja secara online.

## Alternatif: hosting Node.js lain + database terpisah

Kalau ingin pakai Render/Fly.io/VPS untuk Node.js-nya dan PlanetScale/Aiven
untuk MySQL-nya, langkahnya sama secara konsep:

1. Deploy folder ini sebagai Node.js app (perintah start: `npm start`,
   pastikan `npm install` dijalankan saat build).
2. Buat database MySQL di penyedia pilihanmu, jalankan `schema.sql` ke sana.
3. Set environment variable `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`,
   `DB_NAME`, `JWT_SECRET` di dashboard hosting sesuai kredensial database.
4. Pastikan hosting mengekspos variable `PORT` (kebanyakan platform modern
   melakukan ini otomatis).

## Setelah online

- Ganti `JWT_SECRET` production dengan string acak yang benar-benar baru
  (jangan pakai contoh dari `.env.example`).
- Backup database secara berkala lewat fitur backup platform hosting-mu.
- Kalau butuh custom domain (misal `gerbangawakening.com`), semua platform
  di atas punya menu **Custom Domain** — tinggal arahkan DNS domainmu ke
  sana.
