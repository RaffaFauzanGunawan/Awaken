const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');
const { ITEM_LIBRARY, getItemPrice } = require('../items');
const { getHunterRow } = require('./hunters');

const router = express.Router();

const SHOP_SIZE = 6;
const REFRESH_MS = 60 * 60 * 1000; // 1 jam

function pickShopItems() {
  const keys = Object.keys(ITEM_LIBRARY);
  const shuffled = [...keys].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, SHOP_SIZE).map((key) => ({ key, price: getItemPrice(key) }));
}

async function regenerateShop() {
  const items = pickShopItems();
  await pool.query(
    `INSERT INTO shop_state (id, items, refreshed_at) VALUES (1, ?, NOW())
     ON DUPLICATE KEY UPDATE items = VALUES(items), refreshed_at = VALUES(refreshed_at)`,
    [JSON.stringify(items)]
  );
  return { items, refreshedAt: Date.now() };
}

async function getOrRefreshShop() {
  const [rows] = await pool.query('SELECT * FROM shop_state WHERE id = 1');
  if (rows.length === 0) return regenerateShop();

  const row = rows[0];
  const refreshedAt = new Date(row.refreshed_at).getTime();
  if (Date.now() - refreshedAt >= REFRESH_MS) return regenerateShop();

  const items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
  return { items, refreshedAt };
}

function toPublicShop(shop) {
  return {
    items: shop.items
      .map(({ key, price }) => {
        const item = ITEM_LIBRARY[key];
        if (!item) return null;
        return { key, price, ...item };
      })
      .filter(Boolean),
    refreshesAt: new Date(shop.refreshedAt + REFRESH_MS).toISOString(),
  };
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const shop = await getOrRefreshShop();
    res.json(toPublicShop(shop));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat Toko.' });
  }
});

router.post('/buy', requireAuth, async (req, res) => {
  try {
    const { itemKey } = req.body || {};
    if (!itemKey || !ITEM_LIBRARY[itemKey]) {
      return res.status(400).json({ error: 'Item tidak dikenal.' });
    }

    const shop = await getOrRefreshShop();
    const entry = shop.items.find((it) => it.key === itemKey);
    if (!entry) {
      return res.status(400).json({ error: 'Item ini sudah tidak ada di Toko (mungkin baru saja refresh).' });
    }

    const hunter = await getHunterRow(req.userId);
    if (!hunter) return res.status(404).json({ error: 'Kamu belum memiliki Pemburu.' });
    if (hunter.coins < entry.price) {
      return res.status(400).json({ error: `Coin tidak cukup. Butuh ${entry.price}, kamu punya ${hunter.coins}.` });
    }

    await pool.query('UPDATE hunters SET coins = coins - ? WHERE id = ?', [entry.price, hunter.id]);
    await pool.query(
      `INSERT INTO hunter_inventory (hunter_id, item_key, qty) VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE qty = qty + 1`,
      [hunter.id, itemKey]
    );

    const updated = await getHunterRow(req.userId);
    res.json({ ok: true, coins: updated.coins, item: { key: itemKey, ...ITEM_LIBRARY[itemKey] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal membeli item.' });
  }
});

module.exports = router;
