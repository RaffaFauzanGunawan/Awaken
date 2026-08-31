const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

router.get('/mine', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.* FROM battles b
       JOIN hunters h ON h.id = b.hunter_id
       WHERE h.user_id = ?
       ORDER BY b.created_at DESC
       LIMIT 30`,
      [req.userId]
    );
    res.json(rows.map((r) => ({
      id: r.id,
      gateRank: r.gate_rank,
      monsterName: r.monster_name,
      monsterIcon: r.monster_icon,
      result: r.result,
      xpGained: r.xp_gained,
      coinsGained: r.coins_gained,
      levelsGained: r.levels_gained,
      date: r.created_at,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat riwayat pertarungan.' });
  }
});

module.exports = router;
