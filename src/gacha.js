// Sistem Gacha: 100 coin per tarikan. Dua jenis terpisah — senjata (masuk
// langsung ke inventaris) dan skill (hasilnya "pending", pemain pilih sendiri
// mau menggantikan skill yang mana lewat endpoint /skill/assign).

const { SKILL_RARITY, CLASSES, GENERAL_SKILLS } = require('./rng');
const { ITEM_LIBRARY } = require('./items');

const GACHA_COST = 100;

function pickWeighted(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const it of items) {
    if (r < it.weight) return it;
    r -= it.weight;
  }
  return items[items.length - 1];
}

const WEAPON_KEYS_BY_RARITY = SKILL_RARITY.reduce((acc, r) => {
  acc[r.name] = Object.entries(ITEM_LIBRARY)
    .filter(([, it]) => it.type === 'equipment' && it.slot === 'weapon' && it.rarity === r.name)
    .map(([key]) => key);
  return acc;
}, {});

// Menarik satu senjata acak (rarity berbobot sama seperti rarity skill).
// Kalau tingkat rarity yang kena undian kebetulan belum punya senjata,
// otomatis turun ke tingkat terdekat di bawahnya supaya tidak pernah gagal.
function rollGachaWeapon() {
  const rarityDef = pickWeighted(SKILL_RARITY);
  let idx = SKILL_RARITY.findIndex((r) => r.name === rarityDef.name);
  while (idx >= 0 && WEAPON_KEYS_BY_RARITY[SKILL_RARITY[idx].name].length === 0) idx -= 1;
  if (idx < 0) idx = 0;
  const pool = WEAPON_KEYS_BY_RARITY[SKILL_RARITY[idx].name];
  const key = pool[Math.floor(Math.random() * pool.length)];
  return { key, ...ITEM_LIBRARY[key] };
}

// Menarik satu skill acak dari pool kelas Pemburu + pool umum (pool yang sama
// dipakai saat Awakening pertama kali).
function rollGachaSkill(className) {
  const classDef = CLASSES.find((c) => c.name === className);
  const pool = [...(classDef ? classDef.pool : []), ...GENERAL_SKILLS];
  const name = pool[Math.floor(Math.random() * pool.length)];
  const rarity = pickWeighted(SKILL_RARITY);
  return { name, rarity: { name: rarity.name, color: rarity.color } };
}

module.exports = { GACHA_COST, rollGachaWeapon, rollGachaSkill };
