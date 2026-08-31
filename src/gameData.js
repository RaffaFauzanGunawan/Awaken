// Katalog Gerbang, skill, dan item. Semua angka keseimbangan ada di sini.

const GATE_UNLOCK = {
  E: 1,
  D: 3,
  C: 6,
  B: 10,
  A: 16,
  S: 24,
  SS: 34,
  SSS: 45,
};

const REST_GOLD_COST = 12;

const RARITY_POWER = {
  Umum: 1,
  Langka: 1.1,
  Epik: 1.2,
  Legendaris: 1.35,
  Mitos: 1.5,
  Transenden: 1.8,
};

const SKILL_DEFS = {
  'Hantaman Baja':       { type: 'phys',   mp: 8,  cd: 0, power: 1.5,  desc: 'Pukulan fisik berat.' },
  'Amukan Prajurit':     { type: 'phys',   mp: 14, cd: 2, power: 2.05, desc: 'Serangan dahsyat, cooldown 2 giliran.' },
  'Tebasan Berantai':    { type: 'phys',   mp: 12, cd: 1, power: 0.95, hits: 2, desc: 'Dua tebasan berturut-turut.' },
  'Benteng Raga':        { type: 'buff',   mp: 10, cd: 3, stat: 'DEF', amount: 12, turns: 3, desc: 'Naikkan DEF selama 3 giliran.' },

  'Bola Api Arcane':     { type: 'magic',  mp: 10, cd: 0, power: 1.55, desc: 'Ledakan sihir elemen.' },
  'Rantai Petir':        { type: 'magic',  mp: 13, cd: 1, power: 1.15, hits: 2, desc: 'Dua halilintar berantai.' },
  'Perisai Mana':        { type: 'shield', mp: 9,  cd: 2, turns: 2, desc: 'Kurangi damage masuk 40% selama 2 giliran.' },
  'Ledakan Elemen':      { type: 'magic',  mp: 16, cd: 2, power: 2.15, desc: 'Sihir area yang menghancurkan.' },

  'Langkah Bayangan':    { type: 'buff',   mp: 8,  cd: 3, stat: 'AGI', amount: 10, turns: 3, desc: 'Naikkan AGI selama 3 giliran.' },
  'Sayatan Senyap':      { type: 'phys',   mp: 11, cd: 1, power: 1.75, critBonus: 0.2, desc: 'Sayatan tajam, peluang kritis lebih tinggi.' },
  'Racun Mematikan':     { type: 'poison', mp: 12, cd: 2, power: 0.7, poison: 8, turns: 3, desc: 'Damage awal + racun 3 giliran.' },
  'Kilat Belati':        { type: 'phys',   mp: 9,  cd: 0, power: 1.35, desc: 'Tusukan cepat.' },

  'Tembok Baja':         { type: 'shield', mp: 8,  cd: 2, turns: 3, desc: 'Zirah kuat, kurangi damage 40%.' },
  'Provokasi':           { type: 'buff',   mp: 6,  cd: 2, stat: 'DEF', amount: 8, turns: 2, desc: 'Tarik perhatian, naikkan DEF.' },
  'Pantulan Pukulan':    { type: 'phys',   mp: 12, cd: 2, power: 1.4, reflect: 0.35, desc: 'Serang dan pantulkan sebagian damage berikutnya.' },
  'Regenerasi Zirah':    { type: 'heal',   mp: 10, cd: 1, power: 0.9, desc: 'Pulihkan HP berdasarkan DEF.' },

  'Cahaya Penyembuh':    { type: 'heal',   mp: 9,  cd: 0, power: 1.35, desc: 'Sembuhkan luka dengan INT.' },
  'Berkat Suci':         { type: 'heal',   mp: 12, cd: 2, power: 1.1, stat: 'ATK', amount: 6, turns: 2, desc: 'Heal + buff ATK.' },
  'Kebangkitan':         { type: 'heal',   mp: 16, cd: 3, power: 2.2, desc: 'Pemulihan besar.' },
  'Perisai Cahaya':      { type: 'shield', mp: 10, cd: 2, turns: 3, desc: 'Perisai suci menahan damage.' },

  'Panah Berduri':       { type: 'phys',   mp: 8,  cd: 0, power: 1.45, desc: 'Panah menusuk zirah.' },
  'Hujan Anak Panah':    { type: 'phys',   mp: 14, cd: 2, power: 0.8, hits: 3, desc: 'Tiga panah sekaligus.' },
  'Mata Elang':          { type: 'buff',   mp: 7,  cd: 3, stat: 'LUK', amount: 12, turns: 3, desc: 'Naikkan LUK (kritis) 3 giliran.' },
  'Panah Penembus':      { type: 'phys',   mp: 13, cd: 1, power: 1.85, pierce: 0.5, desc: 'Abaikan sebagian DEF musuh.' },

  'Panggil Roh Penjaga': { type: 'magic',  mp: 12, cd: 1, power: 1.6, desc: 'Roh penjaga menyerang.' },
  'Ikatan Kontrak':      { type: 'buff',   mp: 9,  cd: 3, stat: 'INT', amount: 10, turns: 3, desc: 'Naikkan INT selama 3 giliran.' },
  'Legiun Bayangan':     { type: 'magic',  mp: 16, cd: 2, power: 0.85, hits: 3, desc: 'Tiga bayangan menyerang.' },
  'Segel Pemanggilan':   { type: 'magic',  mp: 14, cd: 2, power: 1.95, desc: 'Segel meledak di tubuh musuh.' },

  'Bangkitkan Mayat':    { type: 'magic',  mp: 11, cd: 1, power: 1.5, desc: 'Mayat menyerang atas perintahmu.' },
  'Kutukan Layu':        { type: 'poison', mp: 10, cd: 2, power: 0.6, poison: 10, turns: 3, desc: 'Kutukan merusak tiap giliran.' },
  'Cengkeraman Kubur':   { type: 'magic',  mp: 13, cd: 1, power: 1.7, desc: 'Tarikan dari bawah tanah.' },
  'Wabah Jiwa':          { type: 'magic',  mp: 15, cd: 2, power: 2.0, desc: 'Wabah menggerogoti nyawa.' },

  'Mata Elang Pemburu':  { type: 'buff',   mp: 7,  cd: 3, stat: 'LUK', amount: 10, turns: 3, desc: 'Intuisi pemburu — LUK naik.' },
  'Intuisi Bertarung':   { type: 'buff',   mp: 8,  cd: 3, stat: 'ATK', amount: 10, turns: 3, desc: 'ATK naik selama 3 giliran.' },
  'Regenerasi Cepat':    { type: 'heal',   mp: 10, cd: 1, power: 1.15, desc: 'Pulihkan HP sedang.' },
  'Langkah Angin':       { type: 'buff',   mp: 7,  cd: 2, stat: 'AGI', amount: 12, turns: 3, desc: 'AGI naik, lebih sulit kena serangan.' },
  'Fokus Absolut':       { type: 'buff',   mp: 9,  cd: 3, stat: 'INT', amount: 10, turns: 3, desc: 'INT naik selama 3 giliran.' },
  'Insting Pemburu':     { type: 'phys',   mp: 9,  cd: 0, power: 1.4, critBonus: 0.15, desc: 'Serangan instingtif.' },
};

const ITEMS = {
  hp_potion: {
    id: 'hp_potion', name: 'Ramuan HP', icon: '🧪', type: 'consumable',
    healHp: 45, desc: 'Pulihkan 45 HP.', dropWeight: 40,
  },
  hp_potion_plus: {
    id: 'hp_potion_plus', name: 'Ramuan HP+ ', icon: '💉', type: 'consumable',
    healHp: 90, desc: 'Pulihkan 90 HP.', dropWeight: 12,
  },
  mp_potion: {
    id: 'mp_potion', name: 'Ramuan MP', icon: '🔷', type: 'consumable',
    healMp: 30, desc: 'Pulihkan 30 MP.', dropWeight: 28,
  },
  elixir: {
    id: 'elixir', name: 'Eliksir', icon: '✨', type: 'consumable',
    healHp: 9999, healMp: 9999, desc: 'Pulihkan HP dan MP penuh.', dropWeight: 3,
  },
  tonic_atk: {
    id: 'tonic_atk', name: 'Tonik Amarah', icon: '🍖', type: 'consumable',
    battleOnly: true, stat: 'ATK', amount: 10, turns: 4,
    desc: 'ATK +10 selama 4 giliran (hanya di pertarungan).', dropWeight: 10,
  },
  rusty_sword: {
    id: 'rusty_sword', name: 'Pedang Karat', icon: '🗡️', type: 'equip', slot: 'weapon',
    atk: 6, desc: 'Senjata pemula. ATK +6.', dropWeight: 8,
  },
  steel_sword: {
    id: 'steel_sword', name: 'Pedang Baja', icon: '⚔️', type: 'equip', slot: 'weapon',
    atk: 14, desc: 'ATK +14.', dropWeight: 4,
  },
  shadow_blade: {
    id: 'shadow_blade', name: 'Belati Bayangan', icon: '🌑', type: 'equip', slot: 'weapon',
    atk: 22, agi: 6, desc: 'ATK +22, AGI +6.', dropWeight: 1.5,
  },
  leather_vest: {
    id: 'leather_vest', name: 'Rompi Kulit', icon: '🧥', type: 'equip', slot: 'armor',
    def: 6, desc: 'DEF +6.', dropWeight: 8,
  },
  iron_mail: {
    id: 'iron_mail', name: 'Baju Zirah Besi', icon: '🛡️', type: 'equip', slot: 'armor',
    def: 14, hp: 20, desc: 'DEF +14, HP +20.', dropWeight: 4,
  },
  dragon_scale: {
    id: 'dragon_scale', name: 'Zirah Sisik Naga', icon: '🐉', type: 'equip', slot: 'armor',
    def: 24, hp: 40, desc: 'DEF +24, HP +40.', dropWeight: 1.2,
  },
};

const STARTER_INVENTORY = [
  { id: 'hp_potion', qty: 3 },
  { id: 'mp_potion', qty: 1 },
];

const EMPTY_EQUIPPED = { weapon: null, armor: null };

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (e) { return fallback; }
}

function mpMax(stats, level) {
  return Math.max(20, Math.round(16 + (stats.INT || 0) * 0.5 + (level || 1) * 2));
}

function applyEquipment(baseStats, equipped) {
  const stats = { ...baseStats };
  const eq = equipped || EMPTY_EQUIPPED;
  for (const slot of ['weapon', 'armor']) {
    const id = eq[slot];
    const item = id ? ITEMS[id] : null;
    if (!item || item.type !== 'equip') continue;
    if (item.atk) stats.ATK += item.atk;
    if (item.def) stats.DEF += item.def;
    if (item.agi) stats.AGI += item.agi;
    if (item.int) stats.INT += item.int;
    if (item.luk) stats.LUK += item.luk;
    if (item.hp) stats.HP += item.hp;
  }
  return stats;
}

function inventoryQty(inv, id) {
  const row = (inv || []).find((x) => x.id === id);
  return row ? row.qty : 0;
}

function addItem(inv, id, qty = 1) {
  const next = (inv || []).map((x) => ({ ...x }));
  const row = next.find((x) => x.id === id);
  if (row) row.qty += qty;
  else next.push({ id, qty });
  return next.filter((x) => x.qty > 0);
}

function removeItem(inv, id, qty = 1) {
  const next = (inv || []).map((x) => ({ ...x }));
  const row = next.find((x) => x.id === id);
  if (!row || row.qty < qty) return null;
  row.qty -= qty;
  return next.filter((x) => x.qty > 0);
}

function enrichSkill(skill) {
  const def = SKILL_DEFS[skill.name] || { type: 'phys', mp: 8, cd: 0, power: 1.3, desc: 'Teknik pemburu.' };
  return {
    name: skill.name,
    rarity: skill.rarity || { name: skill.rarityName, color: skill.rarityColor },
    ...def,
  };
}

function rollLoot(gateRankCode) {
  const rankOrder = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
  const idx = Math.max(0, rankOrder.indexOf(gateRankCode));
  const gold = 6 + idx * 7 + Math.floor(Math.random() * (8 + idx * 4));
  const drops = [];
  const dropChance = 0.42 + idx * 0.04;
  if (Math.random() < dropChance) {
    const pool = Object.values(ITEMS).filter((it) => {
      if (it.id === 'dragon_scale' || it.id === 'shadow_blade') return idx >= 5;
      if (it.id === 'steel_sword' || it.id === 'iron_mail' || it.id === 'elixir') return idx >= 3;
      if (it.id === 'hp_potion_plus') return idx >= 2;
      return true;
    });
    const total = pool.reduce((s, i) => s + i.dropWeight, 0);
    let r = Math.random() * total;
    let picked = pool[pool.length - 1];
    for (const it of pool) {
      if (r < it.dropWeight) { picked = it; break; }
      r -= it.dropWeight;
    }
    drops.push({ id: picked.id, qty: 1, name: picked.name, icon: picked.icon });
  }
  return { gold, drops };
}

function publicItem(id) {
  const it = ITEMS[id];
  if (!it) return null;
  return {
    id: it.id, name: it.name, icon: it.icon, type: it.type, slot: it.slot || null,
    desc: it.desc, battleOnly: !!it.battleOnly,
  };
}

module.exports = {
  GATE_UNLOCK, REST_GOLD_COST, RARITY_POWER, SKILL_DEFS, ITEMS,
  STARTER_INVENTORY, EMPTY_EQUIPPED,
  parseJson, mpMax, applyEquipment, inventoryQty, addItem, removeItem,
  enrichSkill, rollLoot, publicItem,
};
