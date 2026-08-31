// Sistem Peliharaan (Pet). Pet didapat secara acak setelah menang di Gerbang,
// kelangkaannya mengikuti tabel bobot yang sama dengan rarity skill/item.
// Satu pet aktif memberi bonus kecil ke salah satu stat Pemburu.

const { SKILL_RARITY } = require('./rng');

const PET_LIBRARY = {
  kucing_liar:    { name: 'Kucing Liar',        icon: '🐱', rarity: 'Umum',       stat: 'LUK', amount: 3,  desc: 'Suka mengeong minta perhatian di sela pertarungan.' },
  anjing_penjaga: { name: 'Anjing Penjaga',      icon: '🐶', rarity: 'Umum',       stat: 'DEF', amount: 3,  desc: 'Setia menjaga punggung Pemburu.' },
  kelinci_gerbang:{ name: 'Kelinci Gerbang',     icon: '🐰', rarity: 'Umum',       stat: 'AGI', amount: 3,  desc: 'Lincah melompat di antara reruntuhan Gerbang.' },

  rubah_bayangan: { name: 'Rubah Bayangan',      icon: '🦊', rarity: 'Langka',     stat: 'AGI', amount: 7,  desc: 'Bergerak nyaris tak terlihat di kegelapan.' },
  burung_hantu:   { name: 'Burung Hantu Arcane', icon: '🦉', rarity: 'Langka',     stat: 'INT', amount: 7,  desc: 'Matanya menyimpan sisa-sisa mana kuno.' },
  kura_kura_baja: { name: 'Kura-kura Baja',      icon: '🐢', rarity: 'Langka',     stat: 'DEF', amount: 7,  desc: 'Cangkangnya sekeras zirah Pemburu kelas atas.' },

  elang_petir:    { name: 'Elang Petir',         icon: '🦅', rarity: 'Epik',       stat: 'ATK', amount: 14, desc: 'Cakarnya berdesir listrik setiap mengepak.' },
  serigala_es:    { name: 'Serigala Es',         icon: '🐺', rarity: 'Epik',       stat: 'ATK', amount: 14, desc: 'Napasnya membekukan udara di sekitarnya.' },
  kupu_mistis:    { name: 'Kupu-kupu Mistis',    icon: '🦋', rarity: 'Epik',       stat: 'LUK', amount: 14, desc: 'Sayapnya menaburkan serbuk keberuntungan.' },

  griffin_muda:   { name: 'Griffin Muda',        icon: '🦁', rarity: 'Legendaris', stat: 'ATK', amount: 28, desc: 'Separuh singa, separuh elang raksasa — masih remaja tapi sudah menggetarkan.' },
  phoenix_kecil:  { name: 'Phoenix Kecil',       icon: '🐦‍🔥', rarity: 'Legendaris', stat: 'HP',  amount: 60, desc: 'Bulunya menyala pelan, seolah tak pernah benar-benar padam.' },

  naga_purba:     { name: 'Naga Purba Mini',     icon: '🐉', rarity: 'Mitos',      stat: 'ATK', amount: 55, desc: 'Konon menetas dari telur yang tertidur ribuan tahun di dasar Gerbang.' },
};

function petsByRarity(rarityName) {
  return Object.entries(PET_LIBRARY)
    .filter(([, p]) => p.rarity === rarityName)
    .map(([key]) => key);
}

function pickWeighted(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const it of items) {
    if (r < it.weight) return it;
    r -= it.weight;
  }
  return items[items.length - 1];
}

// Peluang pet drop per kemenangan. Boss (wave 5) jauh lebih murah hati.
function petDropChance(wave, isBoss) {
  if (isBoss) return 0.45;
  return Math.min(0.22, 0.08 + (wave - 1) * 0.03);
}

// Mengembalikan { key, ...data } kalau berhasil drop, atau null kalau tidak.
function rollPetDrop(wave, isBoss) {
  if (Math.random() >= petDropChance(wave, isBoss)) return null;
  const rarityDef = pickWeighted(SKILL_RARITY);
  const pool = petsByRarity(rarityDef.name);
  if (pool.length === 0) return null;
  const key = pool[Math.floor(Math.random() * pool.length)];
  return { key, ...PET_LIBRARY[key] };
}

const ZERO_BONUS = { HP: 0, ATK: 0, DEF: 0, AGI: 0, INT: 0, LUK: 0 };

function getPetBonus(activePetKey) {
  const pet = activePetKey ? PET_LIBRARY[activePetKey] : null;
  if (!pet) return { ...ZERO_BONUS };
  return { ...ZERO_BONUS, [pet.stat]: pet.amount };
}

const FLAVOR_MESSAGES = [
  '{pet} mengusap-usap kakimu dengan senang.',
  '{pet} menatapmu penuh percaya, siap diajak bertarung kapan saja.',
  '{pet} melompat kegirangan saat kamu mendekat.',
  '{pet} tertidur nyenyak di pundakmu sejenak.',
  '{pet} mengibaskan ekornya cepat — sepertinya senang!',
  '{pet} menyandarkan kepala di tanganmu, minta dielus lagi.',
  '{pet} berputar-putar riang mengelilingimu.',
];

function randomFlavor(petName) {
  const template = FLAVOR_MESSAGES[Math.floor(Math.random() * FLAVOR_MESSAGES.length)];
  return template.replace('{pet}', petName);
}

module.exports = {
  PET_LIBRARY, petDropChance, rollPetDrop, getPetBonus, randomFlavor,
};
