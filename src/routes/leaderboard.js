const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT h.*, u.username AS owner_username
       FROM hunters h
       JOIN users u ON u.id = h.user_id
       ORDER BY h.level DESC, h.power DESC
       LIMIT 50`
    );

    const list = rows.map((row) => ({
      id: row.id,
      name: row.name,
      title: row.title,
      power: row.power,
      level: row.level,
      date: row.created_at,
      owner: row.owner_username,
      rank: { code: row.rank_code, color: row.rank_color },
      class: { name: row.class_name, icon: row.class_icon },
      element: { name: row.element_name, icon: row.element_icon, color: row.element_color },
    }));

    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat papan peringkat.' });
  }
});

module.exports = router;
