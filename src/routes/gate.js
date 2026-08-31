const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');
const { computePower, xpToNext, RANKS } = require('../rng');
const { getSkillEffect, KIND_LABEL } = require('../skills');
const { ITEM_LIBRARY, addStats, rollItemDrop, dropChance } = require('../items');
const { rollPetDrop, getPetBonus } = require('../pets');
const { startBattle, spawnNextWave, applyPlayerAction } = require('../battleEngine');
const { getHunterRow, buildFullHunterPayload } = require('./hunters');
const inventoryHelpers = require('./inventory');

const router = express.Router();
const VALID_RANKS = RANKS.map((r) => r.code);

function toPublicState(battleId, state) {
  return {
    battleId,
    gateRank: state.gateRank,
    wave: state.wave,
    maxWave: state.maxWave,
    turnNo: state.turnNo,
    over: state.over,
    outcome: state.outcome,
    hunter: { hp: state.hunterHp, maxHp: state.hunterMaxHp, stats: state.hunterStats },
    skills: state.skills.map((sk, i) => {
      const effect = getSkillEffect(sk.name);
      return {
        name: sk.name, rarity: sk.rarity, cooldown: state.cooldowns[i],
        kind: effect.kind, kindLabel: KIND_LABEL[effect.kind] || 'Skill', desc: effect.desc,
      };
    }),
    statuses: state.statuses,
    monster: { ...state.monster, hp: state.monsterHp, maxHp: state.monsterMaxHp },
    log: state.log,
  };
}

async function getActiveSession(hunterId) {
  const [rows] = await pool.query('SELECT * FROM battle_sessions WHERE hunter_id = ?', [hunterId]);
  if (!rows.length) return null;
  const row = rows[0];
  return { id: row.id, state: typeof row.state === 'string' ? JSON.parse(row.state) : row.state };
}

router.get('/active', requireAuth, async (req, res) => {
  try {
    const row = await getHunterRow(req.userId);
    if (!row) return res.json(null);
    const session = await getActiveSession(row.id);
    if (session && session.state.over) {
      // Sesi yang semestinya sudah selesai & terhapus tapi masih tersisa — bersihkan
      // supaya tidak muncul sebagai "pertarungan tertunda" yang sudah kalah/HP 0.
      await pool.query('DELETE FROM battle_sessions WHERE id = ?', [session.id]);
      return res.json(null);
    }
    res.json(session ? toPublicState(session.id, session.state) : null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat sesi pertarungan.' });
  }
});

router.post('/enter', requireAuth, async (req, res) => {
  try {
    const gateRank = req.body && req.body.gateRank;
    if (!VALID_RANKS.includes(gateRank)) {
      return res.status(400).json({ error: 'Peringkat Gerbang tidak valid.' });
    }

    const row = await getHunterRow(req.userId);
    if (!row) return res.status(400).json({ error: 'Kamu belum bangkit. Lakukan Awakening dulu untuk membangkitkan kekuatanmu.' });

    const rankObj = RANKS.find((r) => r.code === gateRank);
    if (row.level < rankObj.unlock) {
      return res.status(403).json({
        error: `🔒 Gerbang Peringkat ${gateRank} terkunci untuk Pemburu Level ${row.level}. Butuh Level ${rankObj.unlock}.`,
      });
    }

    // Kalau sudah ada pertarungan aktif (misal setelah refresh halaman), lanjutkan itu.
    // Kalau sesi yang ditemukan ternyata sudah berstatus "over" (semestinya sudah
    // dihapus tapi entah kenapa masih tersisa), anggap sampah dan mulai baru.
    const existing = await getActiveSession(row.id);
    if (existing) {
      if (existing.state.over) {
        await pool.query('DELETE FROM battle_sessions WHERE id = ?', [existing.id]);
      } else {
        return res.json(toPublicState(existing.id, existing.state));
      }
    }

    const baseStats = {
      HP: row.stat_hp, ATK: row.stat_atk, DEF: row.stat_def,
      AGI: row.stat_agi, INT: row.stat_int, LUK: row.stat_luk,
    };
    const bonuses = await inventoryHelpers.getEquippedBonuses(row.id);
    const petBonus = getPetBonus(row.active_pet_key);
    const effectiveStats = addStats(addStats(baseStats, bonuses), petBonus);
    const skills = (typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills)
      .map((s) => ({ name: s.name, rarity: { name: s.rarityName, color: s.rarityColor } }));

    const state = startBattle({ effectiveStats, skills, gateRank });

    const [result] = await pool.query(
      'INSERT INTO battle_sessions (hunter_id, gate_rank, state) VALUES (?, ?, ?)',
      [row.id, gateRank, JSON.stringify(state)]
    );

    res.json(toPublicState(result.insertId, state));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi gangguan saat memasuki Gerbang.' });
  }
});

router.post('/action', requireAuth, async (req, res) => {
  try {
    const { action, skillIndex, inventoryId } = req.body || {};
    if (!['attack', 'skill', 'item', 'flee'].includes(action)) {
      return res.status(400).json({ error: 'Aksi tidak dikenal.' });
    }

    const row = await getHunterRow(req.userId);
    if (!row) return res.status(400).json({ error: 'Kamu belum bangkit.' });

    const [sessRows] = await pool.query('SELECT * FROM battle_sessions WHERE hunter_id = ?', [row.id]);
    if (!sessRows.length) return res.status(400).json({ error: 'Tidak ada pertarungan yang sedang berlangsung. Masuki Gerbang dulu.' });
    const sessionId = sessRows[0].id;
    let state = typeof sessRows[0].state === 'string' ? JSON.parse(sessRows[0].state) : sessRows[0].state;

    if (state.over) {
      return res.status(400).json({ error: 'Pertarungan ini sudah berakhir.' });
    }

    let engineAction = null;
    let consumedInventoryRow = null;

    if (action === 'attack') {
      engineAction = { type: 'attack' };
    } else if (action === 'skill') {
      const idx = Number(skillIndex);
      if (!Number.isInteger(idx) || idx < 0 || idx >= state.skills.length) {
        return res.status(400).json({ error: 'Skill tidak valid.' });
      }
      if (state.cooldowns[idx] > 0) {
        return res.status(400).json({ error: `Skill ini masih cooldown ${state.cooldowns[idx]} giliran lagi.` });
      }
      engineAction = { type: 'skill', skillIndex: idx };
    } else if (action === 'item') {
      if (!inventoryId) return res.status(400).json({ error: 'Item tidak dipilih.' });
      const [invRows] = await pool.query('SELECT * FROM hunter_inventory WHERE id = ? AND hunter_id = ?', [inventoryId, row.id]);
      const invRow = invRows[0];
      if (!invRow || invRow.qty < 1) return res.status(400).json({ error: 'Item tidak tersedia di inventarismu.' });
      const item = ITEM_LIBRARY[invRow.item_key];
      if (!item || item.type !== 'consumable') {
        return res.status(400).json({ error: 'Item ini tidak bisa dipakai saat bertarung.' });
      }
      consumedInventoryRow = invRow;
      engineAction = { type: 'item', itemEffect: { name: item.name, healPct: item.healPct, resetCooldowns: item.resetCooldowns } };
    } else if (action === 'flee') {
      engineAction = { type: 'flee' };
    }

    const applied = applyPlayerAction(state, engineAction);
    state = applied.state;

    if (consumedInventoryRow) {
      if (consumedInventoryRow.qty <= 1) {
        await pool.query('DELETE FROM hunter_inventory WHERE id = ?', [consumedInventoryRow.id]);
      } else {
        await pool.query('UPDATE hunter_inventory SET qty = qty - 1 WHERE id = ?', [consumedInventoryRow.id]);
      }
    }

    if (!state.over) {
      await pool.query('UPDATE battle_sessions SET state = ? WHERE id = ?', [JSON.stringify(state), sessionId]);
      return res.json(toPublicState(sessionId, state));
    }

    // ---- Monster wave ini tumbang/pertarungan berakhir: hitung reward dulu ----
    const result = state.outcome.result; // 'menang' | 'kalah' | 'kabur'
    const wave = state.wave;
    const isBoss = !!state.monster.isBoss;
    let xpGained = 0;
    let coinsGained = 0;
    if (result === 'menang') {
      xpGained = state.monster.xpReward;
      coinsGained = Math.max(5, Math.round(state.monster.xpReward * 0.5));
    } else if (result === 'kalah') {
      xpGained = Math.max(3, Math.round(state.monster.xpReward * 0.25));
    }

    let level = row.level;
    let xp = row.xp;
    let statPoints = row.stat_points;
    const applyXp = (gained) => {
      xp += gained;
      let gainedLevels = 0;
      while (xp >= xpToNext(level)) {
        xp -= xpToNext(level);
        level += 1;
        statPoints += 5;
        gainedLevels += 1;
      }
      return gainedLevels;
    };
    let levelsGained = applyXp(xpGained);

    await pool.query(
      `INSERT INTO battles (hunter_id, gate_rank, monster_name, monster_icon, result, xp_gained, coins_gained, levels_gained)
       VALUES (?,?,?,?,?,?,?,?)`,
      [row.id, state.gateRank, state.monster.name, state.monster.icon, result, xpGained, coinsGained, levelsGained]
    );

    let itemDrop = null;
    let petDrop = null;
    if (result === 'menang') {
      const rankIndex = VALID_RANKS.indexOf(state.gateRank);
      const waveDropChance = isBoss ? 0.85 : Math.min(0.9, dropChance(rankIndex) * (1 + (wave - 1) * 0.18));
      if (Math.random() < waveDropChance) {
        const dropped = rollItemDrop(rankIndex);
        await pool.query(
          `INSERT INTO hunter_inventory (hunter_id, item_key, qty) VALUES (?, ?, 1)
           ON DUPLICATE KEY UPDATE qty = qty + 1`,
          [row.id, dropped.key]
        );
        itemDrop = dropped;
      }

      const droppedPet = rollPetDrop(wave, isBoss);
      if (droppedPet) {
        const [petInsert] = await pool.query(
          `INSERT INTO hunter_pets (hunter_id, pet_key) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE hunter_id = hunter_id`,
          [row.id, droppedPet.key]
        );
        petDrop = { ...droppedPet, alreadyOwned: petInsert.affectedRows === 0 };
      }
    }

    let totalCoinsGained = coinsGained;
    let waveClearedInfo = null;
    let finalResult = result;

    // Wave belum selesai (bukan Boss & belum kalah/kabur) → coba lanjut ke monster
    // berikutnya di sesi yang sama. HP, cooldown skill, dan buff TIDAK dipulihkan.
    if (result === 'menang' && wave < state.maxWave) {
      spawnNextWave(state);
      waveClearedInfo = { wave, isBoss, xpGained, coinsGained, itemDrop, petDrop };

      if (!state.over) {
        const bonuses2 = await inventoryHelpers.getEquippedBonuses(row.id);
        const petBonus2 = getPetBonus(row.active_pet_key);
        const effectiveStats2 = addStats(addStats({
          HP: row.stat_hp, ATK: row.stat_atk, DEF: row.stat_def,
          AGI: row.stat_agi, INT: row.stat_int, LUK: row.stat_luk,
        }, bonuses2), petBonus2);
        const skillsRaw2 = typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills;
        const power2 = computePower(effectiveStats2, level, skillsRaw2.map((s) => ({ rarity: { name: s.rarityName } })));

        await pool.query(
          'UPDATE hunters SET level = ?, xp = ?, stat_points = ?, power = ?, coins = coins + ? WHERE user_id = ?',
          [level, xp, statPoints, power2, coinsGained, req.userId]
        );
        await pool.query('UPDATE battle_sessions SET state = ? WHERE id = ?', [JSON.stringify(state), sessionId]);

        const updatedRow = await getHunterRow(req.userId);
        return res.json({
          ...toPublicState(sessionId, state),
          waveCleared: waveClearedInfo,
          hunterProfile: await buildFullHunterPayload(updatedRow),
        });
      }

      // Monster wave baru langsung menyerang duluan dan menghabisi Pemburu (HP sudah
      // kritis dari wave sebelumnya) → dungeon berakhir DI SINI JUGA. Wajib dituntaskan
      // (hitung reward + hapus sesi) supaya tidak ada sesi "kalah" yang nyangkut permanen.
      finalResult = state.outcome.result; // 'kalah'
      const secondXpGained = Math.max(3, Math.round(state.monster.xpReward * 0.25));
      levelsGained += applyXp(secondXpGained);
      xpGained = secondXpGained; // xp final yang ditampilkan mengacu ke kejadian terakhir
      totalCoinsGained = coinsGained; // tidak ada coin tambahan dari kekalahan instan ini

      await pool.query(
        `INSERT INTO battles (hunter_id, gate_rank, monster_name, monster_icon, result, xp_gained, coins_gained, levels_gained)
         VALUES (?,?,?,?,?,?,?,?)`,
        [row.id, state.gateRank, state.monster.name, state.monster.icon, 'kalah', secondXpGained, 0, 0]
      );
    }

    // ---- Dungeon run benar-benar berakhir (Boss tumbang, kalah, atau kabur) ----
    const bonusesFinal = await inventoryHelpers.getEquippedBonuses(row.id);
    const petBonusFinal = getPetBonus(row.active_pet_key);
    const effectiveStatsFinal = addStats(addStats({
      HP: row.stat_hp, ATK: row.stat_atk, DEF: row.stat_def,
      AGI: row.stat_agi, INT: row.stat_int, LUK: row.stat_luk,
    }, bonusesFinal), petBonusFinal);
    const skillsRawFinal = typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills;
    const newPower = computePower(effectiveStatsFinal, level, skillsRawFinal.map((s) => ({ rarity: { name: s.rarityName } })));

    await pool.query(
      'UPDATE hunters SET level = ?, xp = ?, stat_points = ?, power = ?, coins = coins + ? WHERE user_id = ?',
      [level, xp, statPoints, newPower, totalCoinsGained, req.userId]
    );
    await pool.query('DELETE FROM battle_sessions WHERE id = ?', [sessionId]);

    const updatedRow = await getHunterRow(req.userId);

    res.json({
      ...toPublicState(sessionId, state),
      outcome: { result: finalResult },
      waveCleared: waveClearedInfo,
      xpGained,
      coinsGained: totalCoinsGained,
      leveledUp: levelsGained > 0,
      levelsGained,
      itemDrop,
      petDrop,
      wavesCleared: waveClearedInfo ? waveClearedInfo.wave : (result === 'menang' ? wave : wave - 1),
      hunterProfile: await buildFullHunterPayload(updatedRow),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi gangguan saat memproses aksi pertarungan.' });
  }
});

module.exports = router;
