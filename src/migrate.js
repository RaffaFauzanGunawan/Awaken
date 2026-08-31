const pool = require('./db');

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(rows[0].c) > 0;
}

async function addColumn(table, column, ddl) {
  try {
    if (await columnExists(table, column)) return;
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
    console.log(`  + kolom ${table}.${column}`);
  } catch (err) {
    console.error(`  ⚠ Gagal tambah kolom ${table}.${column}: ${err.message}`);
  }
}

async function tableExists(table) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return Number(rows[0].c) > 0;
}

async function createTableIfNotExists(name, ddl) {
  if (await tableExists(name)) return;
  try {
    await pool.query(ddl);
    console.log(`  + tabel ${name} (baru dibuat)`);
  } catch (err) {
    console.error(`  ⚠ Gagal buat tabel ${name}: ${err.message}`);
  }
}

async function migrate() {
  console.log('🔄 Menjalankan database migration...');

  // ========== BUAT SEMUA TABEL YANG DIPERLUKAN ==========

  await createTableIfNotExists('users', `
    CREATE TABLE \`users\` (
      \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      \`username\` VARCHAR(20) NOT NULL UNIQUE,
      \`password_hash\` VARCHAR(255) NOT NULL,
      \`avatar\` MEDIUMTEXT NULL,
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await createTableIfNotExists('hunters', `
    CREATE TABLE \`hunters\` (
      \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      \`user_id\` INT UNSIGNED NOT NULL,
      \`name\` VARCHAR(40) NOT NULL,
      \`title\` VARCHAR(120) NOT NULL,
      \`rank_code\` VARCHAR(4) NOT NULL,
      \`rank_color\` VARCHAR(10) NOT NULL,
      \`class_name\` VARCHAR(40) NOT NULL,
      \`class_icon\` VARCHAR(10) NOT NULL,
      \`element_name\` VARCHAR(40) NOT NULL,
      \`element_icon\` VARCHAR(10) NOT NULL,
      \`element_color\` VARCHAR(10) NOT NULL,
      \`level\` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
      \`xp\` INT UNSIGNED NOT NULL DEFAULT 0,
      \`stat_points\` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      \`coins\` INT UNSIGNED NOT NULL DEFAULT 0,
      \`active_pet_key\` VARCHAR(40) NULL,
      \`pending_skill\` JSON NULL,
      \`gender\` VARCHAR(8) NOT NULL DEFAULT 'male',
      \`cosmetics\` JSON NULL,
      \`equipped_cosmetics\` JSON NULL,
      \`stat_hp\` INT UNSIGNED NOT NULL,
      \`stat_atk\` INT UNSIGNED NOT NULL,
      \`stat_def\` INT UNSIGNED NOT NULL,
      \`stat_agi\` INT UNSIGNED NOT NULL,
      \`stat_int\` INT UNSIGNED NOT NULL,
      \`stat_luk\` INT UNSIGNED NOT NULL,
      \`skills\` JSON NOT NULL,
      \`power\` INT UNSIGNED NOT NULL,
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
      UNIQUE KEY \`uniq_hunter_user\` (\`user_id\`),
      INDEX \`idx_hunters_power\` (\`power\` DESC),
      INDEX \`idx_hunters_level\` (\`level\` DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await createTableIfNotExists('battles', `
    CREATE TABLE \`battles\` (
      \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      \`hunter_id\` INT UNSIGNED NOT NULL,
      \`gate_rank\` VARCHAR(4) NOT NULL,
      \`monster_name\` VARCHAR(60) NOT NULL,
      \`monster_icon\` VARCHAR(10) NOT NULL,
      \`result\` ENUM('menang','kalah','kabur') NOT NULL,
      \`xp_gained\` INT UNSIGNED NOT NULL DEFAULT 0,
      \`coins_gained\` INT UNSIGNED NOT NULL DEFAULT 0,
      \`levels_gained\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`hunter_id\`) REFERENCES \`hunters\`(\`id\`) ON DELETE CASCADE,
      INDEX \`idx_battles_hunter\` (\`hunter_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await createTableIfNotExists('hunter_inventory', `
    CREATE TABLE \`hunter_inventory\` (
      \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      \`hunter_id\` INT UNSIGNED NOT NULL,
      \`item_key\` VARCHAR(40) NOT NULL,
      \`qty\` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
      \`equipped\` TINYINT(1) NOT NULL DEFAULT 0,
      \`obtained_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`hunter_id\`) REFERENCES \`hunters\`(\`id\`) ON DELETE CASCADE,
      UNIQUE KEY \`uniq_hunter_item\` (\`hunter_id\`, \`item_key\`),
      INDEX \`idx_inventory_hunter\` (\`hunter_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await createTableIfNotExists('battle_sessions', `
    CREATE TABLE \`battle_sessions\` (
      \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      \`hunter_id\` INT UNSIGNED NOT NULL,
      \`gate_rank\` VARCHAR(4) NOT NULL,
      \`state\` JSON NOT NULL,
      \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (\`hunter_id\`) REFERENCES \`hunters\`(\`id\`) ON DELETE CASCADE,
      UNIQUE KEY \`uniq_battle_hunter\` (\`hunter_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await createTableIfNotExists('shop_state', `
    CREATE TABLE \`shop_state\` (
      \`id\` TINYINT UNSIGNED PRIMARY KEY DEFAULT 1,
      \`items\` JSON NOT NULL,
      \`refreshed_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await createTableIfNotExists('hunter_pets', `
    CREATE TABLE \`hunter_pets\` (
      \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      \`hunter_id\` INT UNSIGNED NOT NULL,
      \`pet_key\` VARCHAR(40) NOT NULL,
      \`obtained_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`hunter_id\`) REFERENCES \`hunters\`(\`id\`) ON DELETE CASCADE,
      UNIQUE KEY \`uniq_hunter_pet\` (\`hunter_id\`, \`pet_key\`),
      INDEX \`idx_pets_hunter\` (\`hunter_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ========== TAMBAH KOLOM LAMA YANG MUNGKIN BELUM ADA ==========

  await addColumn('hunters', 'gold', '`gold` INT UNSIGNED NOT NULL DEFAULT 20');
  await addColumn('hunters', 'hp_current', '`hp_current` INT UNSIGNED NULL');
  await addColumn('hunters', 'mp_current', '`mp_current` INT UNSIGNED NULL');
  await addColumn('hunters', 'inventory', "`inventory` JSON NULL");
  await addColumn('hunters', 'equipped', "`equipped` JSON NULL");

  // v7: gender, kosmetik
  await addColumn('hunters', 'gender', "`gender` VARCHAR(8) NOT NULL DEFAULT 'male'");
  await addColumn('hunters', 'cosmetics', '`cosmetics` JSON NULL');
  await addColumn('hunters', 'equipped_cosmetics', '`equipped_cosmetics` JSON NULL');
  await addColumn('hunters', 'character_data', '`character_data` JSON NULL');

  // ========== ISI DEFAULT DATA ==========

  try {
    await pool.query(`UPDATE hunters SET inventory = ? WHERE inventory IS NULL`, [
      JSON.stringify([{ id: 'hp_potion', qty: 2 }, { id: 'mp_potion', qty: 1 }]),
    ]);
    await pool.query(`UPDATE hunters SET equipped = ? WHERE equipped IS NULL`, [
      JSON.stringify({ weapon: null, armor: null }),
    ]);
    await pool.query('UPDATE hunters SET hp_current = stat_hp WHERE hp_current IS NULL');
  } catch (err) {
    // toleran — tabel mungkin kosong
  }

  console.log('✅ Database migration selesai.');
}

module.exports = migrate;
