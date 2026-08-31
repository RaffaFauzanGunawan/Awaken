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

async function migrate() {
  // Pastikan tabel hunters ada dulu
  const huntersExist = await tableExists('hunters');
  if (!huntersExist) {
    console.log('⚠️  Tabel hunters belum ada — skip migration (jalankan schema.sql dulu).');
    return;
  }

  await addColumn('hunters', 'gold', '`gold` INT UNSIGNED NOT NULL DEFAULT 20');
  await addColumn('hunters', 'hp_current', '`hp_current` INT UNSIGNED NULL');
  await addColumn('hunters', 'mp_current', '`mp_current` INT UNSIGNED NULL');
  await addColumn('hunters', 'inventory', "`inventory` JSON NULL");
  await addColumn('hunters', 'equipped', "`equipped` JSON NULL");

  if (!(await tableExists('active_battles'))) {
    await pool.query(`
      CREATE TABLE \`active_battles\` (
        \`hunter_id\` INT UNSIGNED NOT NULL PRIMARY KEY,
        \`gate_rank\` VARCHAR(4) NOT NULL,
        \`state\` JSON NOT NULL,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`hunter_id\`) REFERENCES \`hunters\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('  + tabel active_battles');
  }

  await pool.query(`UPDATE hunters SET inventory = ? WHERE inventory IS NULL`, [
    JSON.stringify([{ id: 'hp_potion', qty: 2 }, { id: 'mp_potion', qty: 1 }]),
  ]);
  await pool.query(`UPDATE hunters SET equipped = ? WHERE equipped IS NULL`, [
    JSON.stringify({ weapon: null, armor: null }),
  ]);
  await pool.query('UPDATE hunters SET hp_current = stat_hp WHERE hp_current IS NULL');

  // v7: gender, kosmetik untuk karakter pixel
  await addColumn('hunters', 'gender', "`gender` VARCHAR(8) NOT NULL DEFAULT 'male'");
  await addColumn('hunters', 'cosmetics', '`cosmetics` JSON NULL');
  await addColumn('hunters', 'equipped_cosmetics', '`equipped_cosmetics` JSON NULL');

  if (await tableExists('battles')) {
    try {
      await pool.query("ALTER TABLE `battles` MODIFY `result` ENUM('menang','kalah','kabur') NOT NULL");
    } catch (err) {
      // sudah sesuai atau tidak bisa diubah — abaikan
    }
    if (!(await columnExists('battles', 'gold_gained'))) {
      await addColumn('battles', 'gold_gained', '`gold_gained` INT UNSIGNED NOT NULL DEFAULT 0');
    }
    if (!(await columnExists('battles', 'loot_json'))) {
      await addColumn('battles', 'loot_json', '`loot_json` JSON NULL');
    }
  }
}

module.exports = migrate;
