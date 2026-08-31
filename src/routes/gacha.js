const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');
const { GACHA_COST, rollGachaWeapon, rollGachaSkill } = require('../gacha');
const { computePower } = require('../rng');
const { getHunterRow, buildFullHunterPayload } = require('./hunters');
const inventoryHelpers = require('./inventory');
const { getPetBonus } = require('../pets');

const router = express.Router();

router.post('/weapon', requireAuth, async (req, res) => {
  try {
    const hunter = await getHunterRow(req.userId);
    if (!hunter) return res.status(404).json({ error: 'Kamu belum melakukan Awakening.' });
    if (hunter.coins < GACHA_COST) {
      return res.status(400).json({ error: `Coin tidak cukup. Butuh ${GACHA_COST}, kamu punya ${hunter.coins}.` });
    }

    const weapon = rollGachaWeapon();

    await pool.query('UPDATE hunters SET coins = coins - ? WHERE id = ?', [GACHA_COST, hunter.id]);
    await pool.query(
      `INSERT INTO hunter_inventory (hunter_id, item_key, qty) VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE qty = qty + 1`,
      [hunter.id, weapon.key]
    );

    const updatedRow = await getHunterRow(req.userId);
    res.json({ ok: true, weapon, hunter: await buildFullHunterPayload(updatedRow) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menarik gacha senjata.' });
  }
});

router.post('/skill', requireAuth, async (req, res) => {
  try {
    const hunter = await getHunterRow(req.userId);
    if (!hunter) return res.status(404).json({ error: 'Kamu belum melakukan Awakening.' });
    if (hunter.coins < GACHA_COST) {
      return res.status(400).json({ error: `Coin tidak cukup. Butuh ${GACHA_COST}, kamu punya ${hunter.coins}.` });
    }

    const skill = rollGachaSkill(hunter.class_name);
    const pendingJson = JSON.stringify(skill);

    await pool.query(
      'UPDATE hunters SET coins = coins - ?, pending_skill = ? WHERE id = ?',
      [GACHA_COST, pendingJson, hunter.id]
    );

    const updatedRow = await getHunterRow(req.userId);
    res.json({ ok: true, skill, hunter: await buildFullHunterPayload(updatedRow) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menarik gacha skill.' });
  }
});

router.post('/skill/assign', requireAuth, async (req, res) => {
  try {
    const { slotIndex } = req.body || {};
    const idx = Number(slotIndex);

    const hunter = await getHunterRow(req.userId);
    if (!hunter) return res.status(404).json({ error: 'Kamu belum melakukan Awakening.' });
    if (!hunter.pending_skill) return res.status(400).json({ error: 'Tidak ada skill hasil gacha yang menunggu dipasang.' });

    const skills = typeof hunter.skills === 'string' ? JSON.parse(hunter.skills) : hunter.skills;
    if (!Number.isInteger(idx) || idx < 0 || idx >= skills.length) {
      return res.status(400).json({ error: 'Slot skill tidak valid.' });
    }

    const pending = typeof hunter.pending_skill === 'string' ? JSON.parse(hunter.pending_skill) : hunter.pending_skill;
    skills[idx] = { name: pending.name, rarityName: pending.rarity.name, rarityColor: pending.rarity.color };

    const baseStats = {
      HP: hunter.stat_hp, ATK: hunter.stat_atk, DEF: hunter.stat_def,
      AGI: hunter.stat_agi, INT: hunter.stat_int, LUK: hunter.stat_luk,
    };
    const bonuses = await inventoryHelpers.getEquippedBonuses(hunter.id);
    const petBonus = getPetBonus(hunter.active_pet_key);
    const effectiveStats = {};
    Object.keys(baseStats).forEach((k) => { effectiveStats[k] = baseStats[k] + (bonuses[k] || 0) + (petBonus[k] || 0); });
    const newPower = computePower(effectiveStats, hunter.level, skills.map((s) => ({ rarity: { name: s.rarityName } })));

    await pool.query(
      'UPDATE hunters SET skills = ?, pending_skill = NULL, power = ? WHERE id = ?',
      [JSON.stringify(skills), newPower, hunter.id]
    );

    const updatedRow = await getHunterRow(req.userId);
    res.json({ ok: true, hunter: await buildFullHunterPayload(updatedRow) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memasang skill baru.' });
  }
});

router.post('/skill/discard', requireAuth, async (req, res) => {
  try {
    const hunter = await getHunterRow(req.userId);
    if (!hunter) return res.status(404).json({ error: 'Kamu belum melakukan Awakening.' });

    await pool.query('UPDATE hunters SET pending_skill = NULL WHERE id = ?', [hunter.id]);
    const updatedRow = await getHunterRow(req.userId);
    res.json({ ok: true, hunter: await buildFullHunterPayload(updatedRow) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal membuang skill hasil gacha.' });
  }
});

/* ============ COSMETIC GACHA ============ */
const COSMETIC_POOL = [
  { id: 'hat_warrior', name: 'Topi Petarung', rarity: 'Langka', weight: 30 },
  { id: 'hat_wizard', name: 'Topi Penyihir', rarity: 'Epik', weight: 20 },
  { id: 'hat_helm', name: 'Helm Zirah', rarity: 'Legendaris', weight: 10 },
  { id: 'weapon_sword', name: 'Pedang Terpasang', rarity: 'Langka', weight: 25 },
  { id: 'weapon_staff', name: 'Tongkat Sihir', rarity: 'Epik', weight: 15 },
];

function rollCosmetic() {
  const total = COSMETIC_POOL.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of COSMETIC_POOL) {
    if (r < c.weight) return c;
    r -= c.weight;
  }
  return COSMETIC_POOL[COSMETIC_POOL.length - 1];
}

router.post('/cosmetic', requireAuth, async (req, res) => {
  try {
    const hunter = await getHunterRow(req.userId);
    if (!hunter) return res.status(404).json({ error: 'Kamu belum melakukan Awakening.' });
    if (hunter.coins < GACHA_COST) {
      return res.status(400).json({ error: `Coin tidak cukup. Butuh ${GACHA_COST}, kamu punya ${hunter.coins}.` });
    }

    const cosmetic = rollCosmetic();
    const owned = hunter.cosmetics ? (typeof hunter.cosmetics === 'string' ? JSON.parse(hunter.cosmetics) : hunter.cosmetics) : [];
    const alreadyOwned = owned.includes(cosmetic.id);
    if (!alreadyOwned) {
      owned.push(cosmetic.id);
    }

    await pool.query(
      'UPDATE hunters SET coins = coins - ? WHERE id = ?',
      [GACHA_COST, hunter.id]
    );
    // Simpan kosmetik — toleran jika kolom belum ada (migrasi belum dijalankan)
    try {
      await pool.query('UPDATE hunters SET cosmetics = ? WHERE id = ?', [JSON.stringify(owned), hunter.id]);
    } catch (e) { /* kolom cosmetics mungkin belum ada */ }

    const updatedRow = await getHunterRow(req.userId);
    res.json({
      ok: true,
      cosmetic: { id: cosmetic.id, name: cosmetic.name, rarity: cosmetic.rarity, alreadyOwned },
      hunter: await buildFullHunterPayload(updatedRow),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menarik gacha kosmetik.' });
  }
});

module.exports = router;
