// Pustaka efek skill — menghubungkan nama skill (dari rng.js) ke mekanik nyata
// yang dipakai sistem pertarungan giliran (battleEngine.js).
//
// kind:
//   'attack'      -> damage langsung ke monster (skala dari ATK+INT pemburu)
//   'heal'        -> pulihkan HP pemburu sendiri
//   'buff_atk'    -> naikkan ATK pemburu sendiri selama beberapa giliran
//   'buff_def'    -> naikkan DEF pemburu sendiri selama beberapa giliran
//   'buff_agi'    -> naikkan AGI pemburu sendiri selama beberapa giliran
//   'debuff_atk'  -> turunkan ATK monster selama beberapa giliran
//   'debuff_def'  -> turunkan DEF monster selama beberapa giliran
//   'dot'         -> racun/bakar — damage bertahap ke monster tiap giliran
//
// cooldown: jumlah giliran pemburu sendiri sebelum skill ini bisa dipakai lagi
//           (0 = bisa dipakai tiap giliran).

const SKILL_LIBRARY = {
  // ---- Petarung ----
  'Hantaman Baja':     { kind: 'attack',     power: 1.6, cooldown: 2, desc: 'Hantaman berat yang meremukkan pertahanan.' },
  'Amukan Prajurit':    { kind: 'buff_atk',   power: 1.0, cooldown: 3, desc: 'Amarah membara, ATK meningkat sementara.' },
  'Tebasan Berantai':   { kind: 'attack',     power: 1.35, cooldown: 1, desc: 'Rentetan tebasan cepat beruntun.' },
  'Benteng Raga':       { kind: 'buff_def',   power: 1.0, cooldown: 3, desc: 'Tubuh mengeras bagai benteng, DEF meningkat.' },

  // ---- Penyihir ----
  'Bola Api Arcane':    { kind: 'attack',     power: 1.7, cooldown: 2, desc: 'Ledakan api arcane menghantam musuh.' },
  'Rantai Petir':        { kind: 'attack',     power: 1.5, cooldown: 2, desc: 'Petir menyambar berantai ke musuh.' },
  'Perisai Mana':        { kind: 'buff_def',   power: 1.0, cooldown: 3, desc: 'Lapisan mana melindungi dari serangan.' },
  'Ledakan Elemen':      { kind: 'attack',     power: 2.0, cooldown: 3, desc: 'Ledakan elemen dahsyat, damage besar.' },

  // ---- Pembunuh ----
  'Langkah Bayangan':    { kind: 'buff_agi',   power: 1.0, cooldown: 3, desc: 'Menyatu dengan bayangan, AGI meningkat.' },
  'Sayatan Senyap':      { kind: 'attack',     power: 1.6, cooldown: 2, desc: 'Sayatan senyap menembus pertahanan.' },
  'Racun Mematikan':     { kind: 'dot',        power: 1.3, cooldown: 3, desc: 'Racun mematikan menggerogoti musuh tiap giliran.' },
  'Kilat Belati':        { kind: 'attack',     power: 1.3, cooldown: 1, desc: 'Lemparan belati secepat kilat.' },

  // ---- Pelindung ----
  'Tembok Baja':         { kind: 'buff_def',   power: 1.3, cooldown: 3, desc: 'Pertahanan sekokoh tembok baja.' },
  'Provokasi':           { kind: 'debuff_atk', power: 1.0, cooldown: 3, desc: 'Memancing amarah musuh, ATK musuh menurun.' },
  'Pantulan Pukulan':     { kind: 'attack',     power: 1.5, cooldown: 2, desc: 'Memantulkan pukulan musuh berlipat ganda.' },
  'Regenerasi Zirah':     { kind: 'heal',       power: 1.0, cooldown: 3, desc: 'Zirah meregenerasi HP secara ajaib.' },

  // ---- Penyembuh ----
  'Cahaya Penyembuh':     { kind: 'heal',       power: 1.1, cooldown: 2, desc: 'Cahaya suci memulihkan luka.' },
  'Berkat Suci':          { kind: 'buff_atk',   power: 1.1, cooldown: 3, desc: 'Berkat suci menajamkan serangan.' },
  'Kebangkitan':          { kind: 'heal',       power: 1.8, cooldown: 4, desc: 'Pemulihan besar, nyaris membangkitkan.' },
  'Perisai Cahaya':       { kind: 'buff_def',   power: 1.1, cooldown: 3, desc: 'Perisai cahaya menahan serangan musuh.' },

  // ---- Pemanah ----
  'Panah Berduri':        { kind: 'dot',        power: 1.15, cooldown: 2, desc: 'Duri panah terus berdarah tiap giliran.' },
  'Hujan Anak Panah':      { kind: 'attack',     power: 1.8, cooldown: 2, desc: 'Hujan panah menghujam dari segala arah.' },
  'Mata Elang':            { kind: 'buff_atk',   power: 1.0, cooldown: 3, desc: 'Bidikan presisi, ATK meningkat.' },
  'Panah Penembus':        { kind: 'attack',     power: 1.65, cooldown: 2, desc: 'Panah menembus pertahanan musuh.' },

  // ---- Pemanggil ----
  'Panggil Roh Penjaga':   { kind: 'buff_def',   power: 1.0, cooldown: 3, desc: 'Roh penjaga menahan serangan musuh.' },
  'Ikatan Kontrak':        { kind: 'buff_atk',   power: 1.0, cooldown: 3, desc: 'Kontrak roh menambah kekuatan serangan.' },
  'Legiun Bayangan':       { kind: 'attack',     power: 1.7, cooldown: 3, desc: 'Legiun bayangan menyerang serentak.' },
  'Segel Pemanggilan':     { kind: 'debuff_def', power: 1.0, cooldown: 3, desc: 'Segel melemahkan pertahanan musuh.' },

  // ---- Nekromanser ----
  'Bangkitkan Mayat':      { kind: 'attack',     power: 1.6, cooldown: 2, desc: 'Mayat bangkit dan menerkam musuh.' },
  'Kutukan Layu':          { kind: 'dot',        power: 1.25, cooldown: 3, desc: 'Kutukan melayukan musuh perlahan.' },
  'Cengkeraman Kubur':     { kind: 'debuff_atk', power: 1.0, cooldown: 3, desc: 'Tangan kubur melemahkan serangan musuh.' },
  'Wabah Jiwa':            { kind: 'dot',        power: 1.5, cooldown: 3, desc: 'Wabah jiwa menggerogoti musuh dengan ganas.' },

  // ---- Skill Umum ----
  'Mata Elang Pemburu':    { kind: 'buff_atk',   power: 1.0, cooldown: 3, desc: 'Insting pemburu menajamkan serangan.' },
  'Intuisi Bertarung':     { kind: 'buff_def',   power: 1.0, cooldown: 3, desc: 'Intuisi tajam membaca serangan musuh.' },
  'Regenerasi Cepat':      { kind: 'heal',       power: 1.0, cooldown: 2, desc: 'Tubuh pulih lebih cepat dari biasanya.' },
  'Langkah Angin':         { kind: 'buff_agi',   power: 1.0, cooldown: 3, desc: 'Kaki seringan angin, AGI meningkat.' },
  'Fokus Absolut':         { kind: 'attack',     power: 1.9, cooldown: 3, desc: 'Konsentrasi penuh, satu pukulan telak.' },
  'Insting Pemburu':       { kind: 'debuff_def', power: 1.0, cooldown: 2, desc: 'Menemukan titik lemah pertahanan musuh.' },
};

// Multiplier tambahan berdasar rarity skill (Umum..Mitos).
const RARITY_MULT = {
  Umum: 1.0,
  Langka: 1.2,
  Epik: 1.45,
  Legendaris: 1.75,
  Mitos: 2.15,
};

const KIND_LABEL = {
  attack: 'Serangan',
  heal: 'Pemulihan',
  buff_atk: 'Buff ATK',
  buff_def: 'Buff DEF',
  buff_agi: 'Buff AGI',
  debuff_atk: 'Debuff ATK Musuh',
  debuff_def: 'Debuff DEF Musuh',
  dot: 'Racun',
};

function getSkillEffect(name) {
  return SKILL_LIBRARY[name] || { kind: 'attack', power: 1.3, cooldown: 2, desc: 'Serangan andalan Pemburu.' };
}

function rarityMult(rarityName) {
  return RARITY_MULT[rarityName] || 1.0;
}

module.exports = { SKILL_LIBRARY, RARITY_MULT, KIND_LABEL, getSkillEffect, rarityMult };
