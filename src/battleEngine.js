// Mesin pertarungan giliran (turn-based). Logika murni, tidak menyentuh
// database — dipanggil oleh src/routes/gate.js yang menangani penyimpanan
// state ke tabel `battle_sessions` di antara tiap giliran.

const { generateMonster } = require('./rng');
const { getSkillEffect, rarityMult } = require('./skills');

const STATUS_DURATION = 3;
const MAX_TURNS = 30;

function variance() { return 0.85 + Math.random() * 0.3; }

function basicAttackDamage(atk, def) {
  return Math.max(1, Math.round((atk - def * 0.5) * variance()));
}

function skillAttackDamage(atk, int, monsterDef, effect, rarityName) {
  const base = atk * 0.75 + int * 0.4;
  const mult = effect.power * rarityMult(rarityName);
  return Math.max(1, Math.round(base * mult * variance() - monsterDef * 0.5));
}

function skillHealAmount(int, maxHp, effect, rarityName) {
  const base = int * 1.0 + maxHp * 0.10;
  const mult = effect.power * rarityMult(rarityName);
  return Math.max(1, Math.round(base * mult));
}

function buffAmount(baseStatValue, effect, rarityName) {
  const pct = 0.25 * rarityMult(rarityName) * effect.power;
  return Math.max(1, Math.round(baseStatValue * pct));
}

function debuffAmount(monsterBaseStatValue, effect, rarityName) {
  const pct = 0.22 * rarityMult(rarityName) * effect.power;
  return Math.max(1, Math.round(monsterBaseStatValue * pct));
}

function dotTickAmount(atk, int, effect, rarityName) {
  const base = atk * 0.3 + int * 0.25;
  const mult = effect.power * rarityMult(rarityName);
  return Math.max(1, Math.round(base * mult));
}

function effectiveStat(baseVal, statusList, statName) {
  const bonus = statusList.filter((st) => st.stat === statName).reduce((a, st) => a + st.amount, 0);
  return Math.max(0, baseVal + bonus);
}

// Mulai pertarungan baru. `effectiveStats` = stat dasar + bonus perlengkapan
// yang sedang di-equip (dihitung oleh route sebelum memanggil ini).
function startBattle({ effectiveStats, skills, gateRank }) {
  const monster = generateMonster(gateRank, 1);

  const state = {
    gateRank,
    wave: 1,
    maxWave: 5,
    turnNo: 1,
    hunterMaxHp: effectiveStats.HP,
    hunterHp: effectiveStats.HP,
    hunterStats: effectiveStats,
    skills: skills.map((s) => ({ name: s.name, rarity: s.rarity })),
    cooldowns: skills.map(() => 0),
    statuses: { hunter: [], monster: [] },
    monster: {
      name: monster.name, icon: monster.icon, atk: monster.atk, def: monster.def, agi: monster.agi,
      gateRank: monster.gateRank, gateColor: monster.gateColor, xpReward: monster.xpReward, isBoss: monster.isBoss,
    },
    monsterMaxHp: monster.hp,
    monsterHp: monster.hp,
    log: [],
    over: false,
    outcome: null,
  };

  state.log.push(`${monster.icon} ${monster.name} muncul dari kabut Gerbang!`);

  if (monster.agi > effectiveStats.AGI) {
    const dmg = basicAttackDamage(monster.atk, effectiveStats.DEF);
    state.hunterHp = Math.max(0, state.hunterHp - dmg);
    state.log.push(`${monster.name} lebih gesit dan menyerang duluan — ${dmg} damage ke Pemburu!`);
    if (state.hunterHp <= 0) {
      state.over = true;
      state.outcome = { result: 'kalah' };
    }
  }

  return state;
}

// Dipanggil setelah monster wave saat ini dikalahkan dan wave < maxWave.
// HP, cooldown skill, dan buff Pemburu TIDAK dipulihkan — inilah yang
// membuat wave belakangan (terutama Boss di wave 5) terasa berat kalau
// pemain sudah babak belur di wave sebelumnya.
function spawnNextWave(state) {
  state.wave += 1;
  const monster = generateMonster(state.gateRank, state.wave);

  state.monster = {
    name: monster.name, icon: monster.icon, atk: monster.atk, def: monster.def, agi: monster.agi,
    gateRank: monster.gateRank, gateColor: monster.gateColor, xpReward: monster.xpReward, isBoss: monster.isBoss,
  };
  state.monsterMaxHp = monster.hp;
  state.monsterHp = monster.hp;
  state.statuses.monster = [];
  state.turnNo = 1;
  state.over = false;
  state.outcome = null;

  const events = [];
  if (monster.isBoss) {
    events.push(`⚠️ Gelombang terakhir! ${monster.icon} ${monster.name} — Boss Gerbang — bangkit dari kegelapan!`);
  } else {
    events.push(`${monster.icon} ${monster.name} muncul menggantikan lawan sebelumnya (Wave ${state.wave}/${state.maxWave}).`);
  }

  const hunterAgiVal = effectiveStat(state.hunterStats.AGI, state.statuses.hunter, 'AGI');
  if (monster.agi > hunterAgiVal) {
    const dmg = basicAttackDamage(monster.atk, state.hunterStats.DEF);
    state.hunterHp = Math.max(0, state.hunterHp - dmg);
    events.push(`${monster.name} lebih gesit dan menyerang duluan — ${dmg} damage ke Pemburu!`);
    if (state.hunterHp <= 0) {
      state.over = true;
      state.outcome = { result: 'kalah' };
    }
  }

  state.log.push(...events);
  return events;
}

// Terapkan satu aksi pemain (sudah tervalidasi oleh route: skillIndex valid,
// cooldown 0, item cukup, dll). action:
//   { type: 'attack' }
//   { type: 'skill', skillIndex }
//   { type: 'item', itemEffect: { name, healPct?, resetCooldowns? } }
//   { type: 'flee' }
function applyPlayerAction(state, action) {
  const s = state;
  if (s.over) return { state: s, events: [] };

  const events = [];
  let monsterActsAfter = true;

  if (action.type === 'attack') {
    const atkVal = effectiveStat(s.hunterStats.ATK, s.statuses.hunter, 'ATK');
    const defVal = effectiveStat(s.monster.def, s.statuses.monster, 'DEF');
    const dmg = basicAttackDamage(atkVal, defVal);
    s.monsterHp = Math.max(0, s.monsterHp - dmg);
    events.push(`Pemburu menyerang — ${dmg} damage ke ${s.monster.name}.`);
  } else if (action.type === 'skill') {
    const idx = action.skillIndex;
    const skillDef = s.skills[idx];
    const effect = getSkillEffect(skillDef.name);
    const rarityName = skillDef.rarity.name;
    events.push(`Pemburu menggunakan ${skillDef.name}!`);

    if (effect.kind === 'attack') {
      const atkVal = effectiveStat(s.hunterStats.ATK, s.statuses.hunter, 'ATK');
      const intVal = effectiveStat(s.hunterStats.INT, s.statuses.hunter, 'INT');
      const defVal = effectiveStat(s.monster.def, s.statuses.monster, 'DEF');
      const dmg = skillAttackDamage(atkVal, intVal, defVal, effect, rarityName);
      s.monsterHp = Math.max(0, s.monsterHp - dmg);
      events.push(`${dmg} damage ke ${s.monster.name}.`);
    } else if (effect.kind === 'heal') {
      const intVal = effectiveStat(s.hunterStats.INT, s.statuses.hunter, 'INT');
      const heal = skillHealAmount(intVal, s.hunterMaxHp, effect, rarityName);
      const before = s.hunterHp;
      s.hunterHp = Math.min(s.hunterMaxHp, s.hunterHp + heal);
      events.push(`Pemburu pulih ${s.hunterHp - before} HP.`);
    } else if (effect.kind === 'buff_atk' || effect.kind === 'buff_def' || effect.kind === 'buff_agi') {
      const stat = effect.kind.split('_')[1].toUpperCase();
      const amt = buffAmount(s.hunterStats[stat], effect, rarityName);
      s.statuses.hunter.push({ stat, amount: amt, turnsLeft: STATUS_DURATION, label: skillDef.name });
      events.push(`${stat} Pemburu meningkat +${amt} selama ${STATUS_DURATION} giliran.`);
    } else if (effect.kind === 'debuff_atk' || effect.kind === 'debuff_def') {
      const stat = effect.kind.split('_')[1].toUpperCase();
      const baseVal = stat === 'ATK' ? s.monster.atk : s.monster.def;
      const amt = debuffAmount(baseVal, effect, rarityName);
      s.statuses.monster.push({ stat, amount: -amt, turnsLeft: STATUS_DURATION, label: skillDef.name });
      events.push(`${stat} ${s.monster.name} menurun -${amt} selama ${STATUS_DURATION} giliran.`);
    } else if (effect.kind === 'dot') {
      const atkVal = effectiveStat(s.hunterStats.ATK, s.statuses.hunter, 'ATK');
      const intVal = effectiveStat(s.hunterStats.INT, s.statuses.hunter, 'INT');
      const tick = dotTickAmount(atkVal, intVal, effect, rarityName);
      s.statuses.monster.push({ type: 'dot', stat: null, amount: tick, turnsLeft: STATUS_DURATION, label: skillDef.name });
      events.push(`${s.monster.name} teracuni — akan menerima ${tick} damage tiap giliran.`);
    }

    s.cooldowns[idx] = effect.cooldown;
  } else if (action.type === 'item') {
    events.push(`Pemburu menggunakan ${action.itemEffect.name}.`);
    if (action.itemEffect.healPct) {
      const heal = Math.round(s.hunterMaxHp * action.itemEffect.healPct);
      const before = s.hunterHp;
      s.hunterHp = Math.min(s.hunterMaxHp, s.hunterHp + heal);
      events.push(`Pulih ${s.hunterHp - before} HP.`);
    }
    if (action.itemEffect.resetCooldowns) {
      s.cooldowns = s.cooldowns.map(() => 0);
      events.push('Semua cooldown skill ter-reset!');
    }
  } else if (action.type === 'flee') {
    const agiVal = effectiveStat(s.hunterStats.AGI, s.statuses.hunter, 'AGI');
    const chance = Math.max(0.15, Math.min(0.9, 0.5 + (agiVal - s.monster.agi) * 0.01));
    if (Math.random() < chance) {
      events.push('Pemburu berhasil kabur dari pertempuran!');
      s.over = true;
      s.outcome = { result: 'kabur' };
      monsterActsAfter = false;
    } else {
      events.push('Pemburu gagal kabur!');
    }
  }

  // Monster tumbang dari aksi pemburu?
  if (!s.over && s.monsterHp <= 0) {
    events.push(`${s.monster.name} tumbang!`);
    s.over = true;
    s.outcome = { result: 'menang' };
    monsterActsAfter = false;
  }

  // Tick racun/DOT ke monster sebelum monster membalas.
  if (!s.over) {
    s.statuses.monster.filter((st) => st.type === 'dot').forEach((st) => {
      s.monsterHp = Math.max(0, s.monsterHp - st.amount);
      events.push(`${s.monster.name} menerima ${st.amount} damage racun (${st.label}).`);
    });
    if (s.monsterHp <= 0) {
      events.push(`${s.monster.name} tumbang akibat racun!`);
      s.over = true;
      s.outcome = { result: 'menang' };
      monsterActsAfter = false;
    }
  }

  // Giliran monster membalas.
  if (monsterActsAfter && !s.over) {
    const monsterAtkVal = effectiveStat(s.monster.atk, s.statuses.monster, 'ATK');
    const hunterDefVal = effectiveStat(s.hunterStats.DEF, s.statuses.hunter, 'DEF');
    const dmg = basicAttackDamage(monsterAtkVal, hunterDefVal);
    s.hunterHp = Math.max(0, s.hunterHp - dmg);
    events.push(`${s.monster.name} membalas — ${dmg} damage ke Pemburu.`);
    if (s.hunterHp <= 0) {
      events.push('Pemburu terdesak dan mundur dari pertempuran.');
      s.over = true;
      s.outcome = { result: 'kalah' };
    }
  }

  // Batas ronde jaga-jaga (mencegah pertarungan buntu selamanya).
  if (!s.over && s.turnNo >= MAX_TURNS) {
    const win = (s.hunterHp / s.hunterMaxHp) >= (s.monsterHp / s.monsterMaxHp);
    events.push('Pertempuran berlarut-larut — kedua pihak mundur untuk menilai keadaan.');
    s.over = true;
    s.outcome = { result: win ? 'menang' : 'kalah' };
  }

  // Turunkan cooldown & durasi status di akhir ronde.
  s.cooldowns = s.cooldowns.map((c) => Math.max(0, c - 1));
  s.statuses.hunter = s.statuses.hunter
    .map((st) => ({ ...st, turnsLeft: st.turnsLeft - 1 }))
    .filter((st) => {
      if (st.turnsLeft <= 0) { events.push(`Efek ${st.label} pada Pemburu berakhir.`); return false; }
      return true;
    });
  s.statuses.monster = s.statuses.monster
    .map((st) => ({ ...st, turnsLeft: st.turnsLeft - 1 }))
    .filter((st) => {
      if (st.turnsLeft <= 0) { events.push(`Efek ${st.label} pada ${s.monster.name} berakhir.`); return false; }
      return true;
    });

  s.turnNo += 1;
  s.log.push(...events);

  return { state: s, events };
}

module.exports = { startBattle, spawnNextWave, applyPlayerAction, STATUS_DURATION, MAX_TURNS };
