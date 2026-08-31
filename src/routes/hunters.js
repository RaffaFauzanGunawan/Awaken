const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');
const { rollHunter, computePower, xpToNext, STAT_NAMES, RANKS } = require('../rng');
const { PET_LIBRARY, getPetBonus } = require('../pets');
const inventory = require('./inventory');

const router = express.Router();

const ALLOC_COLUMN = {
  HP: 'stat_hp', ATK: 'stat_atk', DEF: 'stat_def',
  AGI: 'stat_agi', INT: 'stat_int', LUK: 'stat_luk',
};

const ZERO_BONUS = { HP: 0, ATK: 0, DEF: 0, AGI: 0, INT: 0, LUK: 0 };

function mapHunterRow(row, bonuses) {
  const stats = {
    HP: row.stat_hp, ATK: row.stat_atk, DEF: row.stat_def,
    AGI: row.stat_agi, INT: row.stat_int, LUK: row.stat_luk,
  };
  const bonus = bonuses || ZERO_BONUS;
  const effectiveStats = {};
  Object.keys(stats).forEach((k) => { effectiveStats[k] = stats[k] + (bonus[k] || 0); });
  const skills = (typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills)
    .map((s) => ({ name: s.name, rarity: { name: s.rarityName, color: s.rarityColor } }));
  const nextUnlockedRank = RANKS.find((r) => r.unlock > row.level);
  const activePet = row.active_pet_key && PET_LIBRARY[row.active_pet_key]
    ? { key: row.active_pet_key, ...PET_LIBRARY[row.active_pet_key] }
    : null;
  const pendingSkill = row.pending_skill
    ? (typeof row.pending_skill === 'string' ? JSON.parse(row.pending_skill) : row.pending_skill)
    : null;
  const gender = row.gender || 'male';
  const cosmetics = row.cosmetics
    ? (typeof row.cosmetics === 'string' ? JSON.parse(row.cosmetics) : row.cosmetics)
    : [];
  const equippedCosmetics = row.equipped_cosmetics
    ? (typeof row.equipped_cosmetics === 'string' ? JSON.parse(row.equipped_cosmetics) : row.equipped_cosmetics)
    : [];
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    power: row.power,
    level: row.level,
    xp: row.xp,
    xpToNext: xpToNext(row.level),
    statPoints: row.stat_points,
    coins: row.coins,
    date: row.created_at,
    rank: { code: row.rank_code, color: row.rank_color },
    class: { name: row.class_name, icon: row.class_icon },
    element: { name: row.element_name, icon: row.element_icon, color: row.element_color },
    stats,
    effectiveStats,
    skills,
    username: row.owner_username,
    nextGateUnlock: nextUnlockedRank ? { code: nextUnlockedRank.code, level: nextUnlockedRank.unlock } : null,
    activePet,
    pendingSkill,
    gender,
    cosmetics,
    equippedCosmetics,
  };
}

async function getHunterRow(userId) {
  const [rows] = await pool.query('SELECT * FROM hunters WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

async function buildFullHunterPayload(row) {
  if (!row) return null;
  const [bonuses, equipment] = await Promise.all([
    inventory.getEquippedBonuses(row.id),
    inventory.getEquippedMap(row.id),
  ]);
  const petBonus = getPetBonus(row.active_pet_key);
  const combinedBonus = {};
  Object.keys(bonuses).forEach((k) => { combinedBonus[k] = bonuses[k] + (petBonus[k] || 0); });
  return { ...mapHunterRow(row, combinedBonus), equipment };
}

router.get('/mine', requireAuth, async (req, res) => {
  try {
    const row = await getHunterRow(req.userId);
    res.json(await buildFullHunterPayload(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat data Pemburu.' });
  }
});

router.post('/awaken', requireAuth, async (req, res) => {
  try {
    const existing = await getHunterRow(req.userId);
    if (existing) {
      return res.status(409).json({ error: 'Kamu sudah memiliki Pemburu aktif. Gunakan Reset Karakter jika ingin mengulang dari awal.' });
    }

    const name = req.body && req.body.name ? String(req.body.name).slice(0, 24) : req.username;
    const gender = (req.body && req.body.gender === 'female') ? 'female' : 'male';
    const hunter = rollHunter(name);
    const skillsJson = JSON.stringify(
      hunter.skills.map((s) => ({ name: s.name, rarityName: s.rarity.name, rarityColor: s.rarity.color }))
    );

    const [result] = await pool.query(
      `INSERT INTO hunters
        (user_id, name, title, rank_code, rank_color, class_name, class_icon,
         element_name, element_icon, element_color, level, xp, stat_points,
         stat_hp, stat_atk, stat_def, stat_agi, stat_int, stat_luk, skills, power)
       VALUES (?,?,?,?,?,?,?,?,?,?,1,0,0,?,?,?,?,?,?,?,?)`,
      [
        req.userId, hunter.name, hunter.title, hunter.rank.code, hunter.rank.color,
        hunter.class.name, hunter.class.icon,
        hunter.element.name, hunter.element.icon, hunter.element.color,
        hunter.stats.HP, hunter.stats.ATK, hunter.stats.DEF, hunter.stats.AGI, hunter.stats.INT, hunter.stats.LUK,
        skillsJson, hunter.power,
      ]
    );

    // Set gender — toleran jika kolom belum ada (migrasi belum dijalankan)
    try {
      await pool.query('UPDATE hunters SET gender = ? WHERE id = ?', [gender, result.insertId]);
    } catch (e) { /* kolom gender mungkin belum ada */ }

    // Bekal awal supaya Pemburu baru tidak masuk Gerbang dengan tangan kosong.
    await pool.query(
      'INSERT INTO hunter_inventory (hunter_id, item_key, qty) VALUES (?, ?, 2)',
      [result.insertId, 'potion_small']
    );

    const row = await getHunterRow(req.userId);
    res.status(201).json(await buildFullHunterPayload(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gerbang gagal terbuka. Coba lagi.' });
  }
});

router.post('/allocate', requireAuth, async (req, res) => {
  try {
    const stat = req.body && req.body.stat;
    if (!STAT_NAMES.includes(stat)) {
      return res.status(400).json({ error: 'Stat tidak dikenal.' });
    }

    const row = await getHunterRow(req.userId);
    if (!row) return res.status(404).json({ error: 'Kamu belum memiliki Pemburu.' });
    if (row.stat_points < 1) return res.status(400).json({ error: 'Tidak ada poin stat tersisa.' });

    const column = ALLOC_COLUMN[stat];
    const newStats = {
      HP: row.stat_hp, ATK: row.stat_atk, DEF: row.stat_def,
      AGI: row.stat_agi, INT: row.stat_int, LUK: row.stat_luk,
    };
    newStats[stat] += 1;
    const bonuses = await inventory.getEquippedBonuses(row.id);
    const petBonus = getPetBonus(row.active_pet_key);
    const effectiveNewStats = {};
    Object.keys(newStats).forEach((k) => { effectiveNewStats[k] = newStats[k] + (bonuses[k] || 0) + (petBonus[k] || 0); });
    const skills = typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills;
    const newPower = computePower(effectiveNewStats, row.level, skills.map((s) => ({ rarity: { name: s.rarityName } })));

    await pool.query(
      `UPDATE hunters SET ${column} = ${column} + 1, stat_points = stat_points - 1, power = ? WHERE user_id = ?`,
      [newPower, req.userId]
    );

    const updated = await getHunterRow(req.userId);
    res.json(await buildFullHunterPayload(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengalokasikan poin stat.' });
  }
});

router.delete('/mine', requireAuth, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM hunters WHERE user_id = ?', [req.userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Kamu belum memiliki Pemburu.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mereset karakter.' });
  }
});

/* ============ COSMETICS ============ */
const VALID_COSMETICS = ['hat_warrior', 'hat_wizard', 'hat_helm', 'hat_crown', 'hat_halo', 'weapon_sword', 'weapon_staff', 'weapon_scythe'];

router.get('/cosmetics', requireAuth, async (req, res) => {
  try {
    const row = await getHunterRow(req.userId);
    if (!row) return res.status(404).json({ error: 'Kamu belum memiliki Pemburu.' });
    const owned = row.cosmetics ? (typeof row.cosmetics === 'string' ? JSON.parse(row.cosmetics) : row.cosmetics) : [];
    const equipped = row.equipped_cosmetics ? (typeof row.equipped_cosmetics === 'string' ? JSON.parse(row.equipped_cosmetics) : row.equipped_cosmetics) : [];
    res.json({ owned, equipped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat kosmetik.' });
  }
});

router.post('/cosmetics/equip', requireAuth, async (req, res) => {
  try {
    const { cosmeticId } = req.body || {};
    if (!VALID_COSMETICS.includes(cosmeticId)) {
      return res.status(400).json({ error: 'Kosmetik tidak valid.' });
    }
    const row = await getHunterRow(req.userId);
    if (!row) return res.status(404).json({ error: 'Kamu belum memiliki Pemburu.' });
    const owned = row.cosmetics ? (typeof row.cosmetics === 'string' ? JSON.parse(row.cosmetics) : row.cosmetics) : [];
    if (!owned.includes(cosmeticId)) {
      return res.status(400).json({ error: 'Kamu belum memiliki kosmetik ini.' });
    }
    let equipped = row.equipped_cosmetics ? (typeof row.equipped_cosmetics === 'string' ? JSON.parse(row.equipped_cosmetics) : row.equipped_cosmetics) : [];
    if (!equipped.includes(cosmeticId)) equipped.push(cosmeticId);
    try {
      await pool.query('UPDATE hunters SET equipped_cosmetics = ? WHERE id = ?', [JSON.stringify(equipped), row.id]);
    } catch (e) { return res.status(500).json({ error: 'Fitur kosmetik belum tersedia. Jalankan migrasi database terlebih dahulu.' }); }
    res.json({ ok: true, equipped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memasang kosmetik.' });
  }
});

router.post('/cosmetics/unequip', requireAuth, async (req, res) => {
  try {
    const { cosmeticId } = req.body || {};
    const row = await getHunterRow(req.userId);
    if (!row) return res.status(404).json({ error: 'Kamu belum memiliki Pemburu.' });
    let equipped = row.equipped_cosmetics ? (typeof row.equipped_cosmetics === 'string' ? JSON.parse(row.equipped_cosmetics) : row.equipped_cosmetics) : [];
    equipped = equipped.filter((c) => c !== cosmeticId);
    try {
      await pool.query('UPDATE hunters SET equipped_cosmetics = ? WHERE id = ?', [JSON.stringify(equipped), row.id]);
    } catch (e) { return res.status(500).json({ error: 'Fitur kosmetik belum tersedia. Jalankan migrasi database terlebih dahulu.' }); }
    res.json({ ok: true, equipped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal melepas kosmetik.' });
  }
});

module.exports = router;
module.exports.mapHunterRow = mapHunterRow;
module.exports.getHunterRow = getHunterRow;
module.exports.buildFullHunterPayload = buildFullHunterPayload;
