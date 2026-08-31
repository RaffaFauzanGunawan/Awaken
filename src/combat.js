const { RARITY_POWER, SKILL_DEFS, ITEMS, enrichSkill, rollLoot } = require('./gameData');

function rand() { return Math.random(); }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function buffAmount(buffs, stat) {
  return (buffs || []).filter((b) => b.stat === stat).reduce((s, b) => s + b.amount, 0);
}

function liveStat(base, buffs, stat) {
  return (base[stat] || 0) + buffAmount(buffs, stat);
}

function hasShield(buffs) {
  return (buffs || []).some((b) => b.kind === 'shield');
}

function hasReflect(buffs) {
  return (buffs || []).some((b) => b.kind === 'reflect');
}

function tickBuffs(buffs) {
  return (buffs || []).map((b) => ({ ...b, turns: b.turns - 1 })).filter((b) => b.turns > 0);
}

function tickCooldowns(cds) {
  const next = {};
  for (const [k, v] of Object.entries(cds || {})) {
    if (v - 1 > 0) next[k] = v - 1;
  }
  return next;
}

function critChance(luk, extra = 0) {
  return clamp(0.04 + luk * 0.0025 + extra, 0.04, 0.4);
}

function rollDamage(raw, luk, extraCrit = 0) {
  const variance = 0.88 + rand() * 0.24;
  let dmg = Math.max(1, Math.round(raw * variance));
  let crit = false;
  if (rand() < critChance(luk, extraCrit)) {
    dmg = Math.max(1, Math.round(dmg * 1.5));
    crit = true;
  }
  return { dmg, crit };
}

function incomingDamage(raw, defenderBuffs, defending) {
  let dmg = raw;
  if (defending) dmg = Math.round(dmg * 0.5);
  if (hasShield(defenderBuffs)) dmg = Math.round(dmg * 0.6);
  return Math.max(1, dmg);
}

function createBattleState(hunterView, monster) {
  const skills = (hunterView.skills || []).map(enrichSkill);
  return {
    status: 'active',
    turn: 1,
    gateRank: monster.gateRank,
    hunterName: hunterView.name,
    hunterMaxHp: hunterView.stats.HP,
    hunterHp: Math.min(hunterView.hpCurrent, hunterView.stats.HP),
    hunterMp: Math.min(hunterView.mpCurrent, hunterView.mpMax),
    hunterMaxMp: hunterView.mpMax,
    stats: { ...hunterView.stats },
    skills,
    inventory: (hunterView.inventory || []).map((x) => ({ ...x })),
    hunterBuffs: [],
    defending: false,
    monster: {
      name: monster.name,
      icon: monster.icon,
      hp: monster.hp,
      maxHp: monster.hp,
      atk: monster.atk,
      def: monster.def,
      agi: monster.agi,
      xpReward: monster.xpReward,
      gateRank: monster.gateRank,
      gateColor: monster.gateColor,
    },
    monsterBuffs: [],
    monsterPoison: 0,
    monsterPoisonTurns: 0,
    cooldowns: {},
    log: [`${monster.icon} ${monster.name} menghadang di Gerbang ${monster.gateRank}!`],
    result: null,
    rewards: null,
  };
}

function pushLog(state, line) {
  state.log.push(line);
  if (state.log.length > 80) state.log = state.log.slice(-80);
}

function applyHeal(state, amount) {
  const before = state.hunterHp;
  state.hunterHp = Math.min(state.hunterMaxHp, state.hunterHp + amount);
  return state.hunterHp - before;
}

function applyMp(state, amount) {
  const before = state.hunterMp;
  state.hunterMp = Math.min(state.hunterMaxMp, state.hunterMp + amount);
  return state.hunterMp - before;
}

function finishIfDead(state) {
  if (state.monster.hp <= 0 && state.hunterHp > 0) {
    state.monster.hp = 0;
    state.status = 'won';
    state.result = 'menang';
    state.rewards = rollLoot(state.gateRank);
    pushLog(state, `${state.monster.name} tumbang!`);
    return true;
  }
  if (state.hunterHp <= 0) {
    state.hunterHp = 0;
    state.status = 'lost';
    state.result = 'kalah';
    pushLog(state, 'Pemburu terdesak dan tumbang.');
    return true;
  }
  return false;
}

function monsterTurn(state) {
  if (state.monsterPoisonTurns > 0) {
    const tick = state.monsterPoison;
    state.monster.hp -= tick;
    state.monsterPoisonTurns -= 1;
    pushLog(state, `${state.monster.name} terkena racun — ${tick} damage.`);
    if (finishIfDead(state)) return;
  }

  const hunterAgi = liveStat(state.stats, state.hunterBuffs, 'AGI');
  if (rand() < clamp((hunterAgi - state.monster.agi) * 0.004, 0, 0.18)) {
    pushLog(state, `${state.monster.name} menyerang, tetapi kamu menghindar!`);
    return;
  }

  const raw = Math.max(1, Math.round(state.monster.atk - liveStat(state.stats, state.hunterBuffs, 'DEF') * 0.5));
  const rolled = rollDamage(raw, 8, 0);
  let dmg = incomingDamage(rolled.dmg, state.hunterBuffs, state.defending);
  state.hunterHp -= dmg;
  pushLog(state, `${state.monster.name} menyerang — ${dmg} damage${rolled.crit ? ' (kritikal!)' : ''}.`);

  if (hasReflect(state.hunterBuffs)) {
    const bounce = Math.max(1, Math.round(dmg * 0.35));
    state.monster.hp -= bounce;
    pushLog(state, `Pantulan zirah — ${bounce} damage ke ${state.monster.name}.`);
  }
}

function endRound(state) {
  state.defending = false;
  state.hunterBuffs = tickBuffs(state.hunterBuffs);
  state.monsterBuffs = tickBuffs(state.monsterBuffs);
  state.cooldowns = tickCooldowns(state.cooldowns);
  state.turn += 1;
}

function useSkill(state, skillName) {
  const skill = (state.skills || []).find((s) => s.name === skillName);
  if (!skill) return { error: 'Skill itu tidak kamu miliki.' };
  const def = SKILL_DEFS[skill.name] || skill;
  if ((state.cooldowns[skill.name] || 0) > 0) {
    return { error: `Skill masih cooldown (${state.cooldowns[skill.name]} giliran).` };
  }
  if (state.hunterMp < def.mp) return { error: 'MP tidak cukup.' };

  state.hunterMp -= def.mp;
  if (def.cd > 0) state.cooldowns[skill.name] = def.cd + 1;

  const rarity = (skill.rarity && skill.rarity.name) || 'Umum';
  const rMul = RARITY_POWER[rarity] || 1;
  const atk = liveStat(state.stats, state.hunterBuffs, 'ATK');
  const intel = liveStat(state.stats, state.hunterBuffs, 'INT');
  const defStat = liveStat(state.stats, state.hunterBuffs, 'DEF');
  const luk = liveStat(state.stats, state.hunterBuffs, 'LUK');
  const pierce = def.pierce || 0;
  const monsterDef = state.monster.def * (1 - pierce);

  const hits = def.hits || 1;
  if (def.type === 'phys' || def.type === 'magic' || def.type === 'poison') {
    const baseStat = def.type === 'magic' ? intel : atk;
    let total = 0;
    for (let i = 0; i < hits; i++) {
      const raw = Math.max(1, (baseStat * (def.power || 1) * rMul) - monsterDef * 0.5);
      const rolled = rollDamage(raw, luk, def.critBonus || 0);
      state.monster.hp -= rolled.dmg;
      total += rolled.dmg;
      pushLog(state, `${skill.name} — ${rolled.dmg} damage${rolled.crit ? ' (kritikal!)' : ''}${hits > 1 ? ` [${i + 1}/${hits}]` : ''}.`);
    }
    if (def.reflect) {
      state.hunterBuffs.push({ kind: 'reflect', stat: '_', amount: 0, turns: 2 });
    }
    if (def.type === 'poison' && def.poison) {
      state.monsterPoison = Math.round(def.poison * rMul);
      state.monsterPoisonTurns = def.turns || 3;
      pushLog(state, `${state.monster.name} terkena racun!`);
    }
    return { ok: true, dealt: total };
  }

  if (def.type === 'heal') {
    const raw = Math.round((intel * 0.7 + defStat * 0.35) * (def.power || 1) * rMul + 12);
    const healed = applyHeal(state, raw);
    pushLog(state, `${skill.name} memulihkan ${healed} HP.`);
    if (def.stat && def.amount) {
      state.hunterBuffs.push({ kind: 'stat', stat: def.stat, amount: def.amount, turns: def.turns || 2 });
      pushLog(state, `${def.stat} naik selama ${def.turns || 2} giliran.`);
    }
    return { ok: true };
  }

  if (def.type === 'buff') {
    state.hunterBuffs.push({ kind: 'stat', stat: def.stat, amount: def.amount, turns: def.turns || 3 });
    pushLog(state, `${skill.name} — ${def.stat} +${def.amount} selama ${def.turns || 3} giliran.`);
    return { ok: true };
  }

  if (def.type === 'shield') {
    state.hunterBuffs.push({ kind: 'shield', stat: '_', amount: 0, turns: def.turns || 2 });
    pushLog(state, `${skill.name} membentuk perisai (${def.turns || 2} giliran).`);
    return { ok: true };
  }

  return { error: 'Skill tidak dikenali.' };
}

function validateAction(state, action) {
  const type = action && action.type;
  if (!['attack', 'defend', 'skill', 'item', 'flee'].includes(type)) {
    return 'Aksi tidak valid.';
  }
  if (type === 'skill') {
    const skill = (state.skills || []).find((s) => s.name === action.skillName);
    if (!skill) return 'Skill itu tidak kamu miliki.';
    const def = SKILL_DEFS[skill.name] || skill;
    if ((state.cooldowns[skill.name] || 0) > 0) {
      return `Skill masih cooldown (${state.cooldowns[skill.name]} giliran).`;
    }
    if (state.hunterMp < def.mp) return 'MP tidak cukup.';
  }
  if (type === 'item') {
    const item = ITEMS[action.itemId];
    if (!item || item.type !== 'consumable') return 'Item itu tidak bisa dipakai di sini.';
    const row = (state.inventory || []).find((x) => x.id === action.itemId);
    if (!row || row.qty < 1) return 'Item tidak ada di tas.';
  }
  return null;
}

function useItemInBattle(state, itemId) {
  const item = ITEMS[itemId];
  if (!item || item.type !== 'consumable') return { error: 'Item itu tidak bisa dipakai di sini.' };
  const row = (state.inventory || []).find((x) => x.id === itemId);
  if (!row || row.qty < 1) return { error: 'Item tidak ada di tas.' };
  row.qty -= 1;
  state.inventory = state.inventory.filter((x) => x.qty > 0);

  if (item.healHp) {
    const healed = applyHeal(state, item.healHp);
    pushLog(state, `Memakai ${item.name} — pulih ${healed} HP.`);
  }
  if (item.healMp) {
    const gained = applyMp(state, item.healMp);
    pushLog(state, `Memakai ${item.name} — pulih ${gained} MP.`);
  }
  if (item.stat && item.amount) {
    state.hunterBuffs.push({ kind: 'stat', stat: item.stat, amount: item.amount, turns: item.turns || 3 });
    pushLog(state, `${item.name} — ${item.stat} +${item.amount}.`);
  }
  return { ok: true };
}

function playerAct(next, action) {
  const type = action.type;
  if (type === 'attack') {
    const atk = liveStat(next.stats, next.hunterBuffs, 'ATK');
    const luk = liveStat(next.stats, next.hunterBuffs, 'LUK');
    const raw = Math.max(1, atk - next.monster.def * 0.5);
    const rolled = rollDamage(raw, luk, 0);
    next.monster.hp -= rolled.dmg;
    pushLog(next, `Serangan dasar — ${rolled.dmg} damage${rolled.crit ? ' (kritikal!)' : ''}.`);
    return;
  }
  if (type === 'defend') {
    next.defending = true;
    pushLog(next, 'Kamu bertahan. Damage masuk berkurang giliran ini.');
    return;
  }
  if (type === 'skill') {
    useSkill(next, action.skillName);
    return;
  }
  if (type === 'item') {
    useItemInBattle(next, action.itemId);
    return;
  }
  if (type === 'flee') {
    const agi = liveStat(next.stats, next.hunterBuffs, 'AGI');
    const chance = clamp(0.32 + (agi - next.monster.agi) * 0.012, 0.12, 0.8);
    if (rand() < chance) {
      next.status = 'fled';
      next.result = 'kabur';
      pushLog(next, 'Kamu berhasil kabur dari Gerbang!');
    } else {
      pushLog(next, 'Gagal kabur!');
    }
  }
}

function resolveAction(state, action) {
  if (!state || state.status !== 'active') {
    return { error: 'Tidak ada pertarungan yang sedang berjalan.' };
  }

  const invalid = validateAction(state, action);
  if (invalid) return { error: invalid };

  const next = JSON.parse(JSON.stringify(state));
  const hunterFirst = liveStat(next.stats, next.hunterBuffs, 'AGI') >= next.monster.agi;

  const afterBoth = () => {
    if (next.status === 'active') finishIfDead(next);
    if (next.status === 'active') endRound(next);
  };

  if (hunterFirst) {
    playerAct(next, action);
    if (next.status !== 'active') return { state: next };
    if (finishIfDead(next)) return { state: next };
    monsterTurn(next);
    afterBoth();
  } else {
    monsterTurn(next);
    if (finishIfDead(next)) return { state: next };
    playerAct(next, action);
    afterBoth();
  }

  return { state: next };
}

function publicBattle(state) {
  if (!state) return null;
  return {
    status: state.status,
    result: state.result,
    turn: state.turn,
    gateRank: state.gateRank,
    hunter: {
      name: state.hunterName,
      hp: state.hunterHp,
      maxHp: state.hunterMaxHp,
      mp: state.hunterMp,
      maxMp: state.hunterMaxMp,
    },
    monster: {
      name: state.monster.name,
      icon: state.monster.icon,
      hp: Math.max(0, state.monster.hp),
      maxHp: state.monster.maxHp,
      atk: state.monster.atk,
      def: state.monster.def,
      agi: state.monster.agi,
      gateRank: state.monster.gateRank,
      gateColor: state.monster.gateColor,
    },
    skills: (state.skills || []).map((s) => ({
      name: s.name,
      mp: s.mp,
      cd: s.cd,
      desc: s.desc,
      type: s.type,
      rarity: s.rarity,
      cooldownLeft: state.cooldowns[s.name] || 0,
    })),
    inventory: state.inventory,
    log: state.log,
    rewards: state.rewards,
    defending: state.defending,
    buffs: state.hunterBuffs,
  };
}

module.exports = { createBattleState, resolveAction, publicBattle };
