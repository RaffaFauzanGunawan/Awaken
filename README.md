# Gerbang Awakening

Sistem "awakening" bertema manhwa dungeon/gate dengan progresi RPG dan
**pertarungan bergiliran (turn-based)**:

1. **Awakening (sekali per akun)** — RNG berbobot menentukan peringkat, kelas,
   elemen, dan 3 skill awal Pemburu-mu.
2. **Jelajahi Gerbang** — pilih peringkat Gerbang yang levelmu sudah cukup
   untuk memasukinya, lalu bertarung **giliran demi giliran**: Serang, pakai
   Skill, pakai Item, atau Kabur. Setiap aksi dihitung di server.
3. **Gerbang terkunci berdasar Level** — Gerbang peringkat tinggi (S, SS,
   SSS, dst) butuh Level Pemburu minimum untuk dimasuki, terlepas dari
   peringkat Awakening-mu sendiri. Coba masuk sebelum cukup level akan ditolak
   server dengan pesan jelas.
4. **Skill aktif** — setiap skill hasil Awakening punya efek nyata saat
   dipakai dalam pertarungan: serangan kuat, pemulihan HP, buff ATK/DEF/AGI,
   debuff ke musuh, atau racun (damage bertahap), lengkap dengan cooldown.
5. **Inventaris & Perlengkapan** — menang pertarungan punya peluang
   menjatuhkan item (ramuan atau perlengkapan). Ramuan dipakai saat
   bertarung untuk pulih HP atau mereset cooldown skill; perlengkapan
   (senjata/zirah/aksesori) di-equip permanen untuk menambah stat efektif.
6. **Naik Level** — menang, kalah, atau kabur tetap dapat XP (kabur = 0 XP).
   Setiap naik level dapat 5 poin stat yang bisa dialokasikan sendiri.
7. **Papan Peringkat** — bersaing dengan pemain lain berdasarkan level & skor
   kekuatan.

Semua perhitungan RNG dan pertarungan dilakukan di server (bukan browser)
supaya tidak bisa dicurangi lewat DevTools — termasuk tiap giliran
pertarungan, yang divalidasi ulang di server (cooldown skill, kepemilikan
item, dsb) sebelum dieksekusi.

## Struktur

```
gerbang-awakening/
├─ server.js              entry point Express
├─ schema.sql              skema database MySQL (v3: + inventory & battle_sessions)
├─ .env.example             contoh konfigurasi
├─ src/
│  ├─ db.js                 koneksi pool MySQL
│  ├─ rng.js                RNG awakening (rank/kelas/elemen/skill) + generator monster
│  ├─ skills.js              pustaka EFEK skill (kind, power, cooldown) dipakai battleEngine
│  ├─ items.js                pustaka item (konsumabel + perlengkapan) & drop table
│  ├─ battleEngine.js         mesin pertarungan giliran (logika murni, tanpa DB)
│  ├─ middleware/auth.js    verifikasi JWT
│  └─ routes/
│     ├─ auth.js            register / login / me
│     ├─ hunters.js         awaken (sekali) / lihat karakter / alokasi stat / reset
│     ├─ gate.js            masuk Gerbang (cek lock level) → sesi giliran → aksi → hasil
│     ├─ inventory.js         lihat / equip / unequip item
│     ├─ battles.js         riwayat pertarungan
│     ├─ leaderboard.js     papan peringkat publik (urut level & power)
│     └─ odds.js            info peluang awakening + syarat level tiap Gerbang
└─ public/                  frontend statis (disajikan oleh Express)
   ├─ index.html
   ├─ styles.css
   └─ app.js                 termasuk kontroler Arena Pertarungan & Inventaris
```

## Jalankan di komputer lokal

### 1. Siapkan database

```bash
mysql -u root -p < schema.sql
```

> **Dari v1 (gacha reroll):** struktur `hunters` berubah total. Hapus dulu
> database lama: `DROP DATABASE IF EXISTS gerbang_awakening;` lalu jalankan
> `schema.sql` dari awal.
>
> **Dari v2 (battle instan) ke v3 (giliran/turn-based):** tabel baru
> (`hunter_inventory`, `battle_sessions`) otomatis dibuat tanpa perlu drop
> database. Cukup jalankan sekali secara manual untuk memperluas kolom hasil
> pertarungan supaya menerima "kabur":
> ```sql
> ALTER TABLE battles MODIFY COLUMN result ENUM('menang','kalah','kabur') NOT NULL;
> ```

### 2. Konfigurasi environment

```bash
cp .env.example .env
```

Sesuaikan `DB_USER`/`DB_PASSWORD`, dan ganti `JWT_SECRET` dengan string acak
yang panjang.

### 3. Install & jalankan

```bash
npm install
npm start
```

Buka **http://localhost:3000**.

## Taruh online (deploy)

Panduan lengkap ada di **DEPLOY.md** — pakai Railway (gratis untuk mulai,
mendukung Node.js + MySQL dalam satu tempat, tanpa perlu VPS/server sendiri).

## Alur pemakaian

1. Daftar akun.
2. Klik **"Masuki Gerbang"** pertama kali → proses Awakening (sekali seumur
   akun).
3. Setelah punya karakter, pilih peringkat Gerbang (yang terkunci ditandai
   🔒 beserta level yang dibutuhkan) lalu **"Masuki Gerbang"** — masuk ke
   **Arena Pertarungan**:
   - **⚔️ Serang** — serangan dasar berdasarkan ATK vs DEF musuh.
   - **✨ Skill** — buka daftar 3 skill Pemburu, masing-masing dengan efek
     dan cooldown sendiri (abu-abu/nonaktif kalau masih cooldown).
   - **🎒 Item** — pakai ramuan dari inventaris (mis. pulihkan HP) tanpa
     keluar dari pertarungan.
   - **🏃 Kabur** — coba melarikan diri (peluang berdasar AGI vs AGI
     musuh); gagal berarti musuh dapat serangan gratis.
   - HP selalu pulih penuh sebelum pertarungan BARU dimulai (tidak ada
     sistem "mati permanen") — tapi di TENGAH pertarungan, HP yang hilang
     nyata dan bisa membuatmu kalah kalau tidak dikelola.
   - Menutup/refresh halaman di tengah pertarungan aman — sesi tersimpan di
     server dan otomatis dilanjutkan saat kembali.
4. Menang punya peluang menjatuhkan item — cek **"Inventaris"** dari menu
   atas untuk equip perlengkapan (klik salah satu dari 3 slot di kartu
   Lisensi Pemburu juga membuka modal yang sama).
5. Alokasikan poin stat dari kartu Lisensi Pemburu setiap kali punya poin
   tersisa.
6. Cek **"Riwayat Pertarungan"** dan **"Papan Peringkat"** dari menu atas.
7. **"Reset Karakter"** (di bagian bawah kartu, tautan kecil berwarna merah
   saat di-hover) menghapus karakter, inventaris, sesi pertarungan, dan
   riwayat secara permanen, lalu mengembalikanmu ke layar Awakening.

## Menyesuaikan keseimbangan game

Semua angka yang memengaruhi kesulitan/kecepatan progres kini tersebar per
tanggung jawab:

- **`src/rng.js`**
  - `RANKS` — peluang, rentang stat awal, dan **`unlock`** (level minimum
    untuk memasuki Gerbang peringkat itu).
  - `distributeStats()` — porsi HP vs stat lain saat awakening.
  - `generateMonster()` — seberapa kuat monster relatif terhadap rank
    Gerbang yang dipilih (`budget * 0.55`, dst).
  - `xpToNext()` — kurva XP yang dibutuhkan tiap level.
- **`src/skills.js`** — `SKILL_LIBRARY` memetakan tiap nama skill ke efek
  mekanis (`kind`: attack/heal/buff_*/debuff_*/dot), `power` (multiplier),
  dan `cooldown` (jumlah giliran). `RARITY_MULT` mengatur seberapa besar
  rarity skill memperkuat efeknya.
- **`src/items.js`** — `ITEM_LIBRARY` (semua ramuan & perlengkapan beserta
  efek/bonus statnya), `rollItemDrop()` dan `dropChance()` untuk peluang
  & rarity item yang dijatuhkan tiap kemenangan (naik seiring peringkat
  Gerbang).
- **`src/battleEngine.js`** — rumus damage/heal/buff/debuff/dot
  (`basicAttackDamage`, `skillAttackDamage`, dst), durasi status
  (`STATUS_DURATION`), dan batas ronde jaga-jaga (`MAX_TURNS`).
- Poin stat per level-up: cari `statPoints += 5` di `src/routes/gate.js`.

## Catatan keamanan

- Password disimpan sebagai hash (bcrypt).
- API pakai JWT lewat header `Authorization: Bearer <token>`.
- Setiap aksi pertarungan (serang/skill/item/kabur) divalidasi ulang di
  server terhadap state sesi tersimpan (`battle_sessions`) — client tidak
  bisa memalsukan damage, melewati cooldown, atau memakai item yang tidak
  dimiliki.
- Jangan commit file `.env` — sudah ada di `.gitignore`.
