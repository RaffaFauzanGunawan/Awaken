const express = require('express');
const { RANKS, ELEMENTS } = require('../rng');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    ranks: RANKS.map((r) => ({ code: r.code, color: r.color, weight: r.weight, unlockLevel: r.unlock })),
    elements: ELEMENTS.map((e) => ({ name: e.name, icon: e.icon, color: e.color, weight: e.weight })),
  });
});

module.exports = router;
