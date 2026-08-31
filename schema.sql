-- Skema database Gerbang Awakening (v6 - gacha senjata & skill)
-- Jalankan: mysql -u root -p < schema.sql
--
-- CATATAN MIGRASI dari v1 (gacha reroll): struktur tabel `hunters` berubah
-- total (satu Pemburu per akun). Hapus dulu database lama kalau ingin mulai
-- bersih dari v1:
--   DROP DATABASE IF EXISTS gerbang_awakening;
-- lalu jalankan file ini dari awal.
--
-- CATATAN MIGRASI dari v2 (battle instan) ke v3 (turn-based): tabel baru
-- (`hunter_inventory`, `battle_sessions`) otomatis dibuat oleh CREATE TABLE
-- IF NOT EXISTS di bawah tanpa perlu drop database. Yang perlu dijalankan
-- manual satu kali hanya perluasan kolom `result` di tabel `battles` supaya
-- menerima hasil "kabur" (fitur baru: melarikan diri dari pertarungan):
--   ALTER TABLE battles MODIFY COLUMN result ENUM('menang','kalah','kabur') NOT NULL;
--
-- CATATAN MIGRASI dari v3 ke v4 (coin & shop): tabel baru (`shop_state`)
-- otomatis dibuat oleh CREATE TABLE IF NOT EXISTS di bawah. Yang perlu
-- dijalankan manual satu kali:
--   ALTER TABLE hunters ADD COLUMN coins INT UNSIGNED NOT NULL DEFAULT 0 AFTER stat_points;
--   ALTER TABLE battles ADD COLUMN coins_gained INT UNSIGNED NOT NULL DEFAULT 0 AFTER xp_gained;
--
-- CATATAN MIGRASI dari v4 ke v5 (wave/boss per Gerbang, sistem Pet, foto
-- profil): tabel baru (`hunter_pets`) otomatis dibuat oleh CREATE TABLE IF
-- NOT EXISTS di bawah. Wave/boss TIDAK butuh migrasi tabel (state pertarungan
-- disimpan sebagai JSON di `battle_sessions.state`, otomatis kompatibel).
-- Yang perlu dijalankan manual satu kali:
--   ALTER TABLE users ADD COLUMN avatar MEDIUMTEXT NULL AFTER password_hash;
--   ALTER TABLE hunters ADD COLUMN active_pet_key VARCHAR(40) NULL AFTER coins;
--
-- CATATAN MIGRASI dari v5 ke v6 (gacha senjata & skill, 100 coin per tarik):
-- tidak ada tabel baru. Yang perlu dijalankan manual satu kali:
--   ALTER TABLE hunters ADD COLUMN pending_skill JSON NULL AFTER active_pet_key;
--
-- CATATAN MIGRASI dari v6 ke v7 (gender, kosmetik, light/dark mode, battle landscape):
-- tidak ada tabel baru. Yang perlu dijalankan manual satu kali:
--   ALTER TABLE hunters ADD COLUMN gender VARCHAR(8) NOT NULL DEFAULT 'male' AFTER pending_skill;
--   ALTER TABLE hunters ADD COLUMN cosmetics JSON NULL AFTER gender;
--   ALTER TABLE hunters ADD COLUMN equipped_cosmetics JSON NULL AFTER cosmetics;

CREATE DATABASE IF NOT EXISTS `gerbang_awakening`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `gerbang_awakening`;

CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username`      VARCHAR(20) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `avatar`        MEDIUMTEXT NULL,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Satu baris = satu karakter Pemburu, dimiliki tepat satu akun (UNIQUE user_id).
CREATE TABLE IF NOT EXISTS `hunters` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`       INT UNSIGNED NOT NULL,
  `name`          VARCHAR(40) NOT NULL,
  `title`         VARCHAR(120) NOT NULL,
  `rank_code`     VARCHAR(4) NOT NULL,
  `rank_color`    VARCHAR(10) NOT NULL,
  `class_name`    VARCHAR(40) NOT NULL,
  `class_icon`    VARCHAR(10) NOT NULL,
  `element_name`  VARCHAR(40) NOT NULL,
  `element_icon`  VARCHAR(10) NOT NULL,
  `element_color` VARCHAR(10) NOT NULL,
  `level`         SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `xp`            INT UNSIGNED NOT NULL DEFAULT 0,
  `stat_points`   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `coins`         INT UNSIGNED NOT NULL DEFAULT 0,
  `active_pet_key` VARCHAR(40) NULL,
  `pending_skill` JSON NULL,
  `gender`        VARCHAR(8) NOT NULL DEFAULT 'male',
  `cosmetics`     JSON NULL,
  `equipped_cosmetics` JSON NULL,
  `stat_hp`       INT UNSIGNED NOT NULL,
  `stat_atk`      INT UNSIGNED NOT NULL,
  `stat_def`      INT UNSIGNED NOT NULL,
  `stat_agi`      INT UNSIGNED NOT NULL,
  `stat_int`      INT UNSIGNED NOT NULL,
  `stat_luk`      INT UNSIGNED NOT NULL,
  `skills`        JSON NOT NULL,
  `power`         INT UNSIGNED NOT NULL,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uniq_hunter_user` (`user_id`),
  INDEX `idx_hunters_power` (`power` DESC),
  INDEX `idx_hunters_level` (`level` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Riwayat pertarungan di Gerbang.
CREATE TABLE IF NOT EXISTS `battles` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `hunter_id`     INT UNSIGNED NOT NULL,
  `gate_rank`     VARCHAR(4) NOT NULL,
  `monster_name`  VARCHAR(60) NOT NULL,
  `monster_icon`  VARCHAR(10) NOT NULL,
  `result`        ENUM('menang','kalah','kabur') NOT NULL,
  `xp_gained`     INT UNSIGNED NOT NULL DEFAULT 0,
  `coins_gained`  INT UNSIGNED NOT NULL DEFAULT 0,
  `levels_gained` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`hunter_id`) REFERENCES `hunters`(`id`) ON DELETE CASCADE,
  INDEX `idx_battles_hunter` (`hunter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Item yang dimiliki tiap Pemburu. Definisi item (nama, ikon, efek, rarity)
-- statis di kode (src/items.js) — tabel ini hanya menyimpan kepemilikan.
-- `item_key` merujuk ke ITEM_LIBRARY. Konsumabel dipakai saat pertarungan
-- (qty berkurang / baris terhapus saat habis); perlengkapan bisa di-equip
-- (kolom `equipped`) untuk menambah stat efektif Pemburu.
CREATE TABLE IF NOT EXISTS `hunter_inventory` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `hunter_id`     INT UNSIGNED NOT NULL,
  `item_key`      VARCHAR(40) NOT NULL,
  `qty`           SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `equipped`      TINYINT(1) NOT NULL DEFAULT 0,
  `obtained_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`hunter_id`) REFERENCES `hunters`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uniq_hunter_item` (`hunter_id`, `item_key`),
  INDEX `idx_inventory_hunter` (`hunter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pertarungan Gerbang yang sedang berlangsung (sistem giliran/turn-based).
-- Maksimal satu sesi aktif per Pemburu (UNIQUE hunter_id) — kalau halaman
-- di-refresh di tengah pertarungan, sesi ini dipakai untuk melanjutkan.
-- Seluruh state pertarungan (HP, cooldown skill, buff/debuff aktif, log)
-- disimpan sebagai satu kolom JSON supaya perhitungan tetap di server dan
-- tidak bisa dimanipulasi lewat DevTools.
CREATE TABLE IF NOT EXISTS `battle_sessions` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `hunter_id`     INT UNSIGNED NOT NULL,
  `gate_rank`     VARCHAR(4) NOT NULL,
  `state`         JSON NOT NULL,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`hunter_id`) REFERENCES `hunters`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uniq_battle_hunter` (`hunter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Toko global (satu baris tunggal, id selalu 1) — daftar item yang sedang
-- dijual beserta waktu terakhir di-refresh. Rotasi tiap jam ditangani di
-- src/routes/shop.js: kalau `refreshed_at` sudah lebih dari 1 jam, server
-- otomatis mengganti `items` dengan 6 item acak baru.
CREATE TABLE IF NOT EXISTS `shop_state` (
  `id`            TINYINT UNSIGNED PRIMARY KEY DEFAULT 1,
  `items`         JSON NOT NULL,
  `refreshed_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Koleksi peliharaan (Pet) milik tiap Pemburu. Unik per (hunter_id, pet_key)
-- — pet adalah koleksi, bukan barang yang bisa ditumpuk qty-nya.
CREATE TABLE IF NOT EXISTS `hunter_pets` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `hunter_id`     INT UNSIGNED NOT NULL,
  `pet_key`       VARCHAR(40) NOT NULL,
  `obtained_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`hunter_id`) REFERENCES `hunters`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uniq_hunter_pet` (`hunter_id`, `pet_key`),
  INDEX `idx_pets_hunter` (`hunter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
