const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');
const { ITEM_LIBRARY, SLOTS, getStatBonusesFromEquipped, addStats } = require('../items');
const { getPetBonus } = require('../pets');
const { computePower } = require('../rng');

const router = express.Router();

async function getHunterRow(userId) {
  const [rows] = await pool.query('SELECT * FROM hunters WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

async function getInventoryRows(hunterId) {
  const [rows] = await pool.query('SELECT * FROM hunter_inventory WHERE hunter_id = ?', [hunterId]);
  return rows;
}

function mapInventoryRow(row) {
  const item = ITEM_LIBRARY[row.item_key];
  if (!item) return null;
  return {
    id: row.id,
    key: row.item_key,
    name: item.name,
    icon: item.icon,
    type: item.type,
    rarity: item.rarity,
    desc: item.desc,
    slot: item.slot || null,
    stat: item.stat || null,
    amount: item.amount || null,
    healPct: item.healPct || null,
    resetCooldowns: !!item.resetCooldowns,
    qty: row.qty,
    equipped: !!row.equipped,
  };
}

async function getEquippedBonuses(hunterId) {
  const rows = await getInventoryRows(hunterId);
  const equippedKeys = rows.filter((r) => r.equipped).map((r) => r.item_key);
  return getStatBonusesFromEquipped(equippedKeys);
}

async function getEquippedMap(hunterId) {
  const rows = await getInventoryRows(hunterId);
  const map = { weapon: null, armor: null, accessory: null };
  rows.filter((r) => r.equipped).forEach((r) => {
    const item = ITEM_LIBRARY[r.item_key];
    if (item && item.slot) map[item.slot] = mapInventoryRow(r);
  });
  return map;
}

async function recomputeHunterPower(hunterId) {
  const [rows] = await pool.query('SELECT * FROM hunters WHERE id = ?', [hunterId]);
  const hunter = rows[0];
  if (!hunter) return;
  const baseStats = {
    HP: hunter.stat_hp, ATK: hunter.stat_atk, DEF: hunter.stat_def,
    AGI: hunter.stat_agi, INT: hunter.stat_int, LUK: hunter.stat_luk,
  };
  const bonuses = await getEquippedBonuses(hunterId);
  const petBonus = getPetBonus(hunter.active_pet_key);
  const effectiveStats = addStats(addStats(baseStats, bonuses), petBonus);
  const skills = typeof hunter.skills === 'string' ? JSON.parse(hunter.skills) : hunter.skills;
  const power = computePower(effectiveStats, hunter.level, skills);
  await pool.query('UPDATE hunters SET power = ? WHERE id = ?', [power, hunterId]);
}

async function hasActiveBattle(hunterId) {
  const [rows] = await pool.query('SELECT state FROM battle_sessions WHERE hunter_id = ?', [hunterId]);
  if (rows.length === 0) return false;
  const state = typeof rows[0].state === 'string' ? JSON.parse(rows[0].state) : rows[0].state;
  // Sesi yang sudah berstatus "over" seharusnya sudah terhapus — kalau masih ada
  // (sisa dari kejadian lampau), jangan anggap ini memblokir equip/unequip.
  return !state.over;
}

router.get('/mine', requireAuth, async (req, res) => {
  try {
    const hunter = await getHunterRow(req.userId);
    if (!hunter) return res.status(404).json({ error: 'Kamu belum melakukan Awakening.' });
    const rows = await getInventoryRows(hunter.id);
    const items = rows.map(mapInventoryRow).filter(Boolean).sort((a, b) => {
      if (a.type !== b.type) return a.type === 'equipment' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    const equipped = { weapon: null, armor: null, accessory: null };
    items.forEach((it) => { if (it.equipped && it.slot) equipped[it.slot] = it; });
    res.json({ items, equipped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat inventaris.' });
  }
});

router.post('/equip', requireAuth, async (req, res) => {
  const { inventoryId } = req.body;
  if (!inventoryId) return res.status(400).json({ error: 'inventoryId wajib diisi.' });
  try {
    const hunter = await getHunterRow(req.userId);
    if (!hunter) return res.status(404).json({ error: 'Kamu belum melakukan Awakening.' });
    if (await hasActiveBattle(hunter.id)) {
      return res.status(400).json({ error: 'Tidak bisa mengganti perlengkapan saat sedang bertarung.' });
    }

    const [rows] = await pool.query('SELECT * FROM hunter_inventory WHERE id = ? AND hunter_id = ?', [inventoryId, hunter.id]);
    const row = rows[0];
    if (!row) return res.status(404).json({ error: 'Item tidak ditemukan di inventarismu.' });
    const item = ITEM_LIBRARY[row.item_key];
    if (!item || item.type !== 'equipment') {
      return res.status(400).json({ error: 'Item ini bukan perlengkapan yang bisa di-equip.' });
    }

    const sameSlotKeys = Object.entries(ITEM_LIBRARY)
      .filter(([, it]) => it.type === 'equipment' && it.slot === item.slot)
      .map(([key]) => key);
    if (sameSlotKeys.length) {
      await pool.query(
        `UPDATE hunter_inventory SET equipped = 0 WHERE hunter_id = ? AND item_key IN (${sameSlotKeys.map(() => '?').join(',')})`,
        [hunter.id, ...sameSlotKeys]
      );
    }
    await pool.query('UPDATE hunter_inventory SET equipped = 1 WHERE id = ?', [row.id]);
    await recomputeHunterPower(hunter.id);

    res.json({ ok: true, equipped: await getEquippedMap(hunter.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal meng-equip item.' });
  }
});

router.post('/unequip', requireAuth, async (req, res) => {
  const { slot } = req.body;
  if (!SLOTS.includes(slot)) return res.status(400).json({ error: 'Slot tidak valid.' });
  try {
    const hunter = await getHunterRow(req.userId);
    if (!hunter) return res.status(404).json({ error: 'Kamu belum melakukan Awakening.' });
    if (await hasActiveBattle(hunter.id)) {
      return res.status(400).json({ error: 'Tidak bisa mengganti perlengkapan saat sedang bertarung.' });
    }

    const slotKeys = Object.entries(ITEM_LIBRARY)
      .filter(([, it]) => it.type === 'equipment' && it.slot === slot)
      .map(([key]) => key);
    if (slotKeys.length) {
      await pool.query(
        `UPDATE hunter_inventory SET equipped = 0 WHERE hunter_id = ? AND item_key IN (${slotKeys.map(() => '?').join(',')})`,
        [hunter.id, ...slotKeys]
      );
    }
    await recomputeHunterPower(hunter.id);

    res.json({ ok: true, equipped: await getEquippedMap(hunter.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal melepas perlengkapan.' });
  }
});

module.exports = router;
module.exports.getEquippedBonuses = getEquippedBonuses;
module.exports.getEquippedMap = getEquippedMap;
module.exports.getInventoryRows = getInventoryRows;
module.exports.mapInventoryRow = mapInventoryRow;
module.exports.recomputeHunterPower = recomputeHunterPower;
module.exports.hasActiveBattle = hasActiveBattle;
