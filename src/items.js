// Pustaka item — konsumabel (dipakai saat pertarungan) dan perlengkapan
// (equip permanen, menambah stat). Semua definisi statis di kode (seperti
// RANKS/CLASSES di rng.js), hanya kepemilikannya yang disimpan di database
// (tabel hunter_inventory, lihat schema.sql).

const RARITY_ORDER = ['Umum', 'Langka', 'Epik', 'Legendaris', 'Mitos'];
const RARITY_COLOR = {
  Umum: '#9ca3af', Langka: '#34d399', Epik: '#60a5fa', Legendaris: '#c084fc', Mitos: '#fbbf24',
};

const ITEM_LIBRARY = {
  // ---- Konsumabel (dipakai saat pertarungan) ----
  potion_small:  { name: 'Ramuan Kecil',     icon: '🧪', type: 'consumable', rarity: 'Umum',       healPct: 0.25, desc: 'Memulihkan 25% HP maksimum.' },
  potion_medium: { name: 'Ramuan Sedang',     icon: '🧪', type: 'consumable', rarity: 'Langka',     healPct: 0.45, desc: 'Memulihkan 45% HP maksimum.' },
  potion_large:  { name: 'Ramuan Besar',      icon: '🧪', type: 'consumable', rarity: 'Epik',       healPct: 0.75, desc: 'Memulihkan 75% HP maksimum.' },
  elixir_phoenix:{ name: 'Eliksir Phoenix',    icon: '🔥', type: 'consumable', rarity: 'Legendaris', healPct: 1.00, desc: 'Memulihkan HP sepenuhnya.' },
  serum_adrenal: { name: 'Serum Adrenalin',    icon: '💉', type: 'consumable', rarity: 'Epik',       resetCooldowns: true, desc: 'Mereset semua cooldown skill seketika.' },

  // ---- Senjata (ATK) ----
  weapon_rusty:  { name: 'Pedang Karatan',    icon: '🗡️', type: 'equipment', slot: 'weapon', rarity: 'Umum',       stat: 'ATK', amount: 8  },
  weapon_steel:  { name: 'Pedang Baja',        icon: '⚔️', type: 'equipment', slot: 'weapon', rarity: 'Langka',     stat: 'ATK', amount: 18 },
  weapon_dragon: { name: 'Pedang Naga',        icon: '🐉', type: 'equipment', slot: 'weapon', rarity: 'Epik',       stat: 'ATK', amount: 32 },
  weapon_legend: { name: 'Pedang Legenda',     icon: '✨', type: 'equipment', slot: 'weapon', rarity: 'Legendaris', stat: 'ATK', amount: 55 },
  weapon_mythic: { name: 'Pedang Dewa Naga',   icon: '🌌', type: 'equipment', slot: 'weapon', rarity: 'Mitos',      stat: 'ATK', amount: 85 },

  // ---- Zirah (DEF) ----
  armor_leather: { name: 'Zirah Kulit',       icon: '🥋', type: 'equipment', slot: 'armor', rarity: 'Umum',       stat: 'DEF', amount: 8  },
  armor_steel:   { name: 'Zirah Baja',         icon: '🛡️', type: 'equipment', slot: 'armor', rarity: 'Langka',     stat: 'DEF', amount: 18 },
  armor_dragon:  { name: 'Zirah Naga',         icon: '🩸', type: 'equipment', slot: 'armor', rarity: 'Epik',       stat: 'DEF', amount: 32 },
  armor_divine:  { name: 'Zirah Dewa',         icon: '👑', type: 'equipment', slot: 'armor', rarity: 'Legendaris', stat: 'DEF', amount: 55 },

  // ---- Aksesori (AGI / INT / LUK) ----
  acc_windcloak: { name: 'Jubah Angin',       icon: '🧣', type: 'equipment', slot: 'accessory', rarity: 'Langka', stat: 'AGI', amount: 10 },
  acc_manacharm: { name: 'Jimat Mana',         icon: '🔮', type: 'equipment', slot: 'accessory', rarity: 'Langka', stat: 'INT', amount: 10 },
  acc_luckring:  { name: 'Cincin Keberuntungan', icon: '💍', type: 'equipment', slot: 'accessory', rarity: 'Langka', stat: 'LUK', amount: 10 },
  acc_shadowwing:{ name: 'Sayap Bayangan',     icon: '🦋', type: 'equipment', slot: 'accessory', rarity: 'Epik',   stat: 'AGI', amount: 22 },
  acc_arcanecrown:{ name: 'Mahkota Arcane',    icon: '🌙', type: 'equipment', slot: 'accessory', rarity: 'Epik',   stat: 'INT', amount: 22 },
  acc_goldenhour:{ name: 'Jam Pasir Emas',     icon: '⏳', type: 'equipment', slot: 'accessory', rarity: 'Epik',   stat: 'LUK', amount: 22 },
};

const SLOTS = ['weapon', 'armor', 'accessory'];

function getItem(key) {
  return ITEM_LIBRARY[key] || null;
}

// Bobot rarity item yang bisa didapat, bergeser makin bagus makin tinggi
// peringkat Gerbang (rankIndex 0=E .. 7=SSS).
function rollItemDrop(rankIndex) {
  const idx = Math.max(0, Math.min(7, rankIndex));
  const weights = [
    Math.max(6, 50 - idx * 6),  // Umum
    26 + idx * 1.4,               // Langka
    13 + idx * 2.2,               // Epik
    4 + idx * 2.2,                // Legendaris
    1 + idx * 1.1,                // Mitos
  ];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let rarity = RARITY_ORDER[0];
  for (let i = 0; i < RARITY_ORDER.length; i++) {
    if (r < weights[i]) { rarity = RARITY_ORDER[i]; break; }
    r -= weights[i];
  }
  const pool = Object.entries(ITEM_LIBRARY).filter(([, it]) => it.rarity === rarity);
  if (pool.length === 0) return { key: 'potion_small', ...ITEM_LIBRARY.potion_small };
  const [key, item] = pool[Math.floor(Math.random() * pool.length)];
  return { key, ...item };
}

// dropChance meningkat sedikit demi sedikit sesuai peringkat Gerbang.
function dropChance(rankIndex) {
  const idx = Math.max(0, Math.min(7, rankIndex));
  return 0.35 + idx * 0.03;
}

// Hitung total bonus stat dari daftar item_key yang sedang di-equip.
function getStatBonusesFromEquipped(equippedKeys) {
  const bonus = { HP: 0, ATK: 0, DEF: 0, AGI: 0, INT: 0, LUK: 0 };
  (equippedKeys || []).forEach((key) => {
    const item = ITEM_LIBRARY[key];
    if (item && item.type === 'equipment' && bonus[item.stat] !== undefined) {
      bonus[item.stat] += item.amount;
    }
  });
  return bonus;
}

function addStats(base, bonus) {
  const out = {};
  Object.keys(base).forEach((k) => { out[k] = base[k] + (bonus[k] || 0); });
  return out;
}

// Harga jual di Toko, berdasarkan rarity item.
const PRICE_BY_RARITY = { Umum: 40, Langka: 120, Epik: 320, Legendaris: 800, Mitos: 2000 };
function getItemPrice(key) {
  const item = ITEM_LIBRARY[key];
  return item ? (PRICE_BY_RARITY[item.rarity] || 100) : 100;
}

module.exports = {
  ITEM_LIBRARY, SLOTS, RARITY_COLOR, RARITY_ORDER, PRICE_BY_RARITY,
  getItem, rollItemDrop, dropChance, getStatBonusesFromEquipped, addStats, getItemPrice,
};
