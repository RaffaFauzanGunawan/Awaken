// Mesin RNG & pertarungan sistem Awakening.
// Semua dihitung di server supaya tidak bisa dicurangi lewat DevTools.

// `unlock` = level minimum Pemburu untuk bisa memasuki Gerbang peringkat ini
// (lihat src/routes/gate.js). Rank Awakening (di atas) tetap independen dari
// level — seorang Pemburu bisa "terlahir" berbakat rank tinggi tapi tetap
// harus naik level dulu sebelum boleh masuk Gerbang tinggi.
const RANKS = [
  { code: 'E',   weight: 35,   color: '#8b8d98', min: 40,  max: 75,  unlock: 1  },
  { code: 'D',   weight: 25,   color: '#34d399', min: 75,  max: 120, unlock: 5  },
  { code: 'C',   weight: 18,   color: '#22d3ee', min: 120, max: 175, unlock: 10 },
  { code: 'B',   weight: 12,   color: '#60a5fa', min: 175, max: 245, unlock: 18 },
  { code: 'A',   weight: 6.5,  color: '#c084fc', min: 245, max: 330, unlock: 28 },
  { code: 'S',   weight: 2.2,  color: '#fb923c', min: 330, max: 430, unlock: 40 },
  { code: 'SS',  weight: 0.25, color: '#fbbf24', min: 430, max: 560, unlock: 58 },
  { code: 'SSS', weight: 0.05, color: '#ff6b6b', min: 560, max: 700, unlock: 80 },
];

const ELEMENTS = [
  { name: 'Api',        icon: '🔥', weight: 15, color: '#fb7185' },
  { name: 'Air',         icon: '💧', weight: 15, color: '#38bdf8' },
  { name: 'Angin',       icon: '🍃', weight: 15, color: '#4ade80' },
  { name: 'Tanah',       icon: '🪨', weight: 14, color: '#d6a15b' },
  { name: 'Petir',       icon: '⚡', weight: 14, color: '#facc15' },
  { name: 'Cahaya',      icon: '🌟', weight: 12, color: '#fde68a' },
  { name: 'Kegelapan',   icon: '🌑', weight: 12, color: '#a78bfa' },
  { name: 'Kehampaan',   icon: '🌀', weight: 3,  color: '#7c3aed' },
];

const CLASSES = [
  { name: 'Petarung',    icon: '⚔️', pool: ['Hantaman Baja', 'Amukan Prajurit', 'Tebasan Berantai', 'Benteng Raga'] },
  { name: 'Penyihir',    icon: '🔮', pool: ['Bola Api Arcane', 'Rantai Petir', 'Perisai Mana', 'Ledakan Elemen'] },
  { name: 'Pembunuh',    icon: '🗡️', pool: ['Langkah Bayangan', 'Sayatan Senyap', 'Racun Mematikan', 'Kilat Belati'] },
  { name: 'Pelindung',   icon: '🛡️', pool: ['Tembok Baja', 'Provokasi', 'Pantulan Pukulan', 'Regenerasi Zirah'] },
  { name: 'Penyembuh',   icon: '✨', pool: ['Cahaya Penyembuh', 'Berkat Suci', 'Kebangkitan', 'Perisai Cahaya'] },
  { name: 'Pemanah',     icon: '🏹', pool: ['Panah Berduri', 'Hujan Anak Panah', 'Mata Elang', 'Panah Penembus'] },
  { name: 'Pemanggil',   icon: '🕯️', pool: ['Panggil Roh Penjaga', 'Ikatan Kontrak', 'Legiun Bayangan', 'Segel Pemanggilan'] },
  { name: 'Nekromanser', icon: '💀', pool: ['Bangkitkan Mayat', 'Kutukan Layu', 'Cengkeraman Kubur', 'Wabah Jiwa'] },
];

const GENERAL_SKILLS = ['Mata Elang Pemburu', 'Intuisi Bertarung', 'Regenerasi Cepat', 'Langkah Angin', 'Fokus Absolut', 'Insting Pemburu'];

const SKILL_RARITY = [
  { name: 'Umum',       weight: 55, color: '#9ca3af' },
  { name: 'Langka',     weight: 28, color: '#34d399' },
  { name: 'Epik',       weight: 12, color: '#60a5fa' },
  { name: 'Legendaris', weight: 4,  color: '#c084fc' },
  { name: 'Mitos',      weight: 1,  color: '#fbbf24' },
];

const EPITHETS_HIGH = ['Yang Ditakuti Gerbang', 'Sang Penakluk Dungeon', 'Bayangan Kehancuran', 'Penguasa Tanpa Mahkota', 'Legenda yang Terbangun', 'Sang Pemutus Takdir'];
const EPITHETS_LOW = ['si Pemula Gerbang', 'Pencari Cahaya Pertama', 'Penjelajah Awal', 'Bibit yang Bangkit'];

const MONSTERS = [
  ['Goblin Perusak', '👺'], ['Serigala Bayangan', '🐺'], ['Slime Beracun', '🟢'],
  ['Orc Penjaga', '👹'], ['Laba-laba Raksasa', '🕷️'], ['Zombie Gerbang', '🧟'],
  ['Iblis Kecil', '😈'], ['Golem Batu', '🗿'], ['Naga Muda', '🐉'], ['Ratu Bayangan', '👻'],
  ['Kelelawar Wabah', '🦇'], ['Penjaga Kristal', '🔷'],
];

// Boss cuma muncul di wave ke-5 (gelombang terakhir tiap kunjungan Gerbang).
const BOSS_MONSTERS = [
  ['Raja Goblin', '👑👺'], ['Naga Purba Gerbang', '🐲'], ['Jenderal Zombie', '🧟‍♂️'],
  ['Ratu Laba-laba Purba', '🕸️'], ['Golem Inti Kegelapan', '⬛'], ['Manticore Bayangan', '🦂'],
  ['Iblis Penjaga Gerbang', '👹👑'], ['Leviathan Kerdil', '🐋'],
];

// Kelipatan kekuatan monster tiap wave (indeks 0 = wave 1). Wave 5 (Boss)
// dihitung terpisah lewat formula khusus di bawah, bukan lewat tabel ini.
const WAVE_MULTIPLIER = [1, 1.35, 1.75, 2.2];

const STAT_NAMES = ['HP', 'ATK', 'DEF', 'AGI', 'INT', 'LUK'];

function pickWeighted(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const it of items) {
    if (r < it.weight) return it;
    r -= it.weight;
  }
  return items[items.length - 1];
}
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pickOne(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// HP mendapat porsi lebih besar supaya terasa seperti "nyawa", sisanya dibagi ke stat lain.
function distributeStats(total) {
  const hpShare = 0.45 + Math.random() * 0.15;
  const hp = Math.round(total * hpShare);
  const remaining = total - hp;
  const names = ['ATK', 'DEF', 'AGI', 'INT', 'LUK'];
  const raws = names.map(() => Math.random() + 0.15);
  const sum = raws.reduce((a, b) => a + b, 0);
  const vals = raws.map((r) => Math.round((r / sum) * remaining));
  const diff = remaining - vals.reduce((a, b) => a + b, 0);
  vals[0] += diff;
  const out = { HP: Math.max(30, hp) };
  names.forEach((n, i) => { out[n] = Math.max(1, vals[i]); });
  return out;
}

function computePower(stats, level, skills) {
  const base = (level || 1) * 20
    + stats.HP * 0.4 + stats.ATK * 2 + stats.DEF * 2
    + stats.AGI * 1.5 + stats.INT * 1.2 + stats.LUK * 1;
  const skillBonus = (skills || []).reduce((a, s) => {
    const rIdx = SKILL_RARITY.findIndex((r) => r.name === (s.rarity ? s.rarity.name : s.rarityName));
    return a + (rIdx + 1) * 15;
  }, 0);
  return Math.round(base + skillBonus);
}

function xpToNext(level) {
  return Math.round(60 + (level - 1) * 35);
}

function rollHunter(name) {
  const rank = pickWeighted(RANKS);
  const element = pickWeighted(ELEMENTS);
  const cls = pickOne(CLASSES);
  const statTotal = randInt(rank.min, rank.max);
  const stats = distributeStats(statTotal);

  const sourcePool = [...cls.pool, ...GENERAL_SKILLS];
  const uniqueNames = [];
  while (uniqueNames.length < 3) {
    const n = uniqueNames.length === 0 ? pickOne(cls.pool) : pickOne(sourcePool);
    if (!uniqueNames.includes(n)) uniqueNames.push(n);
  }
  const skills = uniqueNames.map((n) => ({ name: n, rarity: pickWeighted(SKILL_RARITY) }));

  const idx = RANKS.findIndex((r) => r.code === rank.code);
  const title = idx >= 5
    ? pickOne(EPITHETS_HIGH)
    : (idx <= 1 ? pickOne(EPITHETS_LOW) : `${cls.name} ${element.name}`);

  const power = computePower(stats, 1, skills);

  return {
    name: (name && String(name).trim()) || `Pemburu-${randInt(1000, 9999)}`,
    title, rank, element, class: cls, stats, skills, power,
  };
}

// wave: 1-4 = monster biasa (makin kuat tiap wave), 5 = Boss (HP jauh lebih
// tebal + pukulan lebih berat, nama & ikon dari pool BOSS_MONSTERS terpisah).
function generateMonster(gateRankCode, wave = 1) {
  const rankObj = RANKS.find((r) => r.code === gateRankCode) || RANKS[0];
  const baseBudget = randInt(rankObj.min, rankObj.max) * 0.55;
  const isBoss = wave >= 5;

  if (!isBoss) {
    const mult = WAVE_MULTIPLIER[Math.min(wave, WAVE_MULTIPLIER.length) - 1] || 1;
    const budget = baseBudget * mult;
    const hp = Math.round(budget * 0.5) + 15;
    const atk = Math.round(budget * 0.22) + 3;
    const def = Math.round(budget * 0.14) + 1;
    const agi = Math.round(budget * 0.14) + 1;
    const xpReward = Math.round(budget * 0.9) + 10;
    const [name, icon] = pickOne(MONSTERS);
    return { name, icon, hp, atk, def, agi, xpReward, gateRank: rankObj.code, gateColor: rankObj.color, wave, isBoss: false };
  }

  // Boss: darah jauh lebih tebal dan pukulan lebih berat dari monster biasa.
  const bossBudget = baseBudget * 2.6;
  const hp = Math.round(bossBudget * 0.62) + 60;
  const atk = Math.round(bossBudget * 0.26) + 10;
  const def = Math.round(bossBudget * 0.16) + 5;
  const agi = Math.round(bossBudget * 0.12) + 2;
  const xpReward = Math.round(bossBudget * 1.3) + 50;
  const [name, icon] = pickOne(BOSS_MONSTERS);
  return { name, icon, hp, atk, def, agi, xpReward, gateRank: rankObj.code, gateColor: rankObj.color, wave, isBoss: true };
}

// Catatan: simulasi pertarungan instan yang lama sudah digantikan sistem
// giliran interaktif di src/battleEngine.js (dipakai oleh src/routes/gate.js).

module.exports = {
  RANKS, ELEMENTS, CLASSES, SKILL_RARITY, STAT_NAMES, GENERAL_SKILLS,
  rollHunter, generateMonster, computePower, xpToNext,
};
