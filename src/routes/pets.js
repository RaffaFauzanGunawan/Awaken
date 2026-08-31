const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');
const { PET_LIBRARY, randomFlavor } = require('../pets');
const { getHunterRow } = require('./hunters');
const { recomputeHunterPower } = require('./inventory');

const router = express.Router();

router.get('/mine', requireAuth, async (req, res) => {
  try {
    const hunter = await getHunterRow(req.userId);
    if (!hunter) return res.status(404).json({ error: 'Kamu belum melakukan Awakening.' });

    const [rows] = await pool.query('SELECT * FROM hunter_pets WHERE hunter_id = ? ORDER BY obtained_at DESC', [hunter.id]);
    const pets = rows.map((r) => {
      const def = PET_LIBRARY[r.pet_key];
      if (!def) return null;
      return { key: r.pet_key, ...def, obtainedAt: r.obtained_at, active: r.pet_key === hunter.active_pet_key };
    }).filter(Boolean);

    res.json({ pets, activePetKey: hunter.active_pet_key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat Peliharaan.' });
  }
});

router.post('/activate', requireAuth, async (req, res) => {
  try {
    const { petKey } = req.body || {};
    const hunter = await getHunterRow(req.userId);
    if (!hunter) return res.status(404).json({ error: 'Kamu belum melakukan Awakening.' });

    if (petKey) {
      const [owned] = await pool.query('SELECT id FROM hunter_pets WHERE hunter_id = ? AND pet_key = ?', [hunter.id, petKey]);
      if (owned.length === 0) return res.status(400).json({ error: 'Kamu belum memiliki peliharaan ini.' });
    }

    await pool.query('UPDATE hunters SET active_pet_key = ? WHERE id = ?', [petKey || null, hunter.id]);
    await recomputeHunterPower(hunter.id);

    res.json({ ok: true, activePetKey: petKey || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengaktifkan peliharaan.' });
  }
});

router.post('/interact', requireAuth, async (req, res) => {
  try {
    const { petKey } = req.body || {};
    const def = petKey ? PET_LIBRARY[petKey] : null;
    if (!def) return res.status(400).json({ error: 'Peliharaan tidak dikenal.' });

    const hunter = await getHunterRow(req.userId);
    if (!hunter) return res.status(404).json({ error: 'Kamu belum melakukan Awakening.' });

    const [owned] = await pool.query('SELECT id FROM hunter_pets WHERE hunter_id = ? AND pet_key = ?', [hunter.id, petKey]);
    if (owned.length === 0) return res.status(400).json({ error: 'Kamu belum memiliki peliharaan ini.' });

    res.json({ message: randomFlavor(def.name) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal berinteraksi dengan peliharaan.' });
  }
});

module.exports = router;
