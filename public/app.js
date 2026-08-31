(() => {
"use strict";

const API = '/api';
const STAT_NAMES = ['HP', 'ATK', 'DEF', 'AGI', 'INT', 'LUK'];
const RARITY_COLOR = { Umum: '#9ca3af', Langka: '#34d399', Epik: '#60a5fa', Legendaris: '#c084fc', Mitos: '#fbbf24', Transenden: '#ffffff' };
const SLOT_LABELS = { weapon: 'Senjata', armor: 'Zirah', accessory: 'Aksesori' };
const SLOT_ICONS = { weapon: '⚔️', armor: '🛡️', accessory: '💍' };
let TOKEN = localStorage.getItem('ga_token') || null;
let USERNAME = localStorage.getItem('ga_username') || null;
let currentHunter = null;
let activeBattle = null;
let battleBusy = false;
let shownLogCount = 0;
let battleInventoryCache = null;
let selectedGender = 'male';
let pendingCosmetics = [];

/* ============ BATTLE ANIMATION STATE ============ */
let battleAnim = {
  hunterX: 0, hunterY: 0,
  monsterX: 0, monsterY: 0,
  hunterBaseX: 120, monsterBaseX: 0,
  hunterBaseY: 0, monsterBaseY: 0,
  damageNumbers: [],
  hunterFlash: 0,
  monsterShake: 0,
  monsterFlash: 0,
  hunterAttackT: 0,
  attackActive: false,
  particles: [],
  flashOverlay: 0,
  flashColor: '#ffffff',
};
let battleAnimFrame = null;

/* ============ PIXEL ART SPRITE DATA ============ */
// 16x16 sprites. Each row = 16 hex chars. Space = transparent.
// Palette: 0=bg 1=skin 2=hair 3=shirt 4=pants 5=boots 6=eyes 7=skin2 8=skin3 9=sleeve A=undershirt B=eye_white
const SPRITE_PALETTE = {
  '0': null, '1': '#f5c49c', '2': '#5a3825', '3': '#2d7a3a', '4': '#2a4a8a',
  '5': '#4a3728', '6': '#1a1a2e', '7': '#e8b088', '8': '#d49670', '9': '#1e6b2e',
  'a': '#228b22', 'b': '#ffffff', 'c': '#f0d4b8', 'd': '#cc7744', 'e': '#c06030',
  'f': '#d4a070'
};

// Female palette (pink hair, different shirt)
const SPRITE_PALETTE_FEMALE = {
  ...SPRITE_PALETTE,
  '2': '#c05080', // pink hair
  '3': '#8b2252', // maroon shirt
  '9': '#701842', // darker sleeve
  'a': '#902060', // undershirt pink
};

const SPRITE_MALE = [
  '    2222      ',
  '   222222     ',
  '  22111122    ',
  '  21611612    ',
  '  21711172    ',
  '  22111122    ',
  '   221122     ',
  '    3333      ',
  '  9 3333 9    ',
  '  9 3333 9    ',
  '  9 3333 9    ',
  '   1 33 1       ',
  '    1441      ',
  '    4444      ',
  '    4  4      ',
  '    5  5      ',
];

const SPRITE_FEMALE = [
  '    2222      ',
  '   222222     ',
  '  22111122    ',
  '  21611612    ',
  '  21711172    ',
  '  21111112    ',
  '   211112     ',
  '   2 33 2     ',
  '  9 3333 9    ',
  '  9 3333 9    ',
  '  9 3333 9    ',
  '  2 1331 2    ',
  '  2 1441 2    ',
  '    4444      ',
  '    4  4      ',
  '    5  5      ',
];

// Cosmetic overlay sprites (same 16x16, rendered on top)
const COSMETIC_OVERLAYS = {
  hat_warrior: [
    '                ',
    '                ',
    '                ',
    '    dddddddd    ',
    '   dddddddddd   ',
    '   ddeeeeddd    ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
  hat_wizard: [
    '                ',
    '        c       ',
    '       ccc      ',
    '      cccccc    ',
    '     cccddcc    ',
    '    cccddddcc   ',
    '    cddddddc    ',
    '    cddddddc    ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
  weapon_sword: [
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '           fff  ',
    '           fff  ',
    '           ddd  ',
    '           ddd  ',
    '           ddd  ',
    '           d    ',
    '                ',
    '                ',
    '                ',
  ],
  weapon_staff: [
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '          cc    ',
    '          cc    ',
    '          cc    ',
    '          cc    ',
    '          cc    ',
    '          cc    ',
    '          cc    ',
    '          cc    ',
    '          cc    ',
    '          cc    ',
    '                ',
  ],
  hat_helm: [
    '                ',
    '                ',
    '                ',
    '    dddddddd    ',
    '   dddddddddd   ',
    '   dd6dddd6dd   ',
    '   dddddddddd   ',
    '   dddddddddd   ',
    '    dddddddd    ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
  hat_crown: [
    '                ',
    '                ',
    '   f f ff f f   ',
    '   fffffffffff  ',
    '   fffdeedff f  ',
    '   fffffffffff  ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
  hat_halo: [
    '                ',
    '                ',
    '     bbbbb      ',
    '    b     b     ',
    '    b     b     ',
    '     bbbbb      ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
  weapon_scythe: [
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '           ccc  ',
    '          cc    ',
    '          cc    ',
    '          cc    ',
    '          cc    ',
    '          cc    ',
    '          cc    ',
    '          cc    ',
    '          cc    ',
    '                ',
  ],
};

const COSMETIC_DEFS = [
  { id: 'hat_warrior', name: 'Topi Petarung', icon: '🎩', rarity: 'Langka', desc: 'Topi kulit untuk petarung jalanan.' },
  { id: 'hat_wizard', name: 'Topi Penyihir', icon: '🧙', rarity: 'Epik', desc: 'Topi tinggi penyihir agung.' },
  { id: 'hat_helm', name: 'Helm Zirah', icon: '⛑️', rarity: 'Legendaris', desc: 'Helm pelindung dari baja sejati.' },
  { id: 'hat_crown', name: 'Mahkota Dewa', icon: '👑', rarity: 'Mitos', desc: 'Mahkota emas bersinar.' },
  { id: 'hat_halo', name: 'Halo Ilahi', icon: '😇', rarity: 'Transenden', desc: 'Halo putih keabadian.' },
  { id: 'weapon_sword', name: 'Pedang Terpasang', icon: '🗡️', rarity: 'Langka', desc: 'Pedang ditampilkan di tangan.' },
  { id: 'weapon_staff', name: 'Tongkat Sihir', icon: '🪄', rarity: 'Epik', desc: 'Tongkat bersinar di tangan.' },
  { id: 'weapon_scythe', name: 'Sabit Kematian', icon: '⚔️', rarity: 'Legendaris', desc: 'Sabit menebas jiwa.' },
];

/* ============ MONSTER SPRITE DATA ============ */
const MONSTER_SPRITE_DEFAULT = [
  '    4444      ',
  '   444444     ',
  '  44666644    ',
  '  46b66b64    ',
  '  46444464    ',
  '  44444444    ',
  '   444444     ',
  '    4444      ',
  '   444444     ',
  '  44444444    ',
  '  44444444    ',
  '   444444     ',
  '    44 44     ',
  '    44 44     ',
  '   44   44    ',
  '   44   44    ',
];

const MONSTER_PALETTE_DEFAULT = {
  '0': null, '4': '#5a2d2d', '6': '#ff4444', 'b': '#ffffff',
};

// Boss is bigger/more menacing
const MONSTER_SPRITE_BOSS = [
  '   444444     ',
  '  44444444    ',
  ' 4446666644   ',
  ' 46b6666b64   ',
  ' 4666666664   ',
  ' 4444444444   ',
  '  44444444    ',
  '  44444444    ',
  ' 4444444444   ',
  ' 4444444444   ',
  '444444444444  ',
  ' 4444444444   ',
  '  44  44 44   ',
  '  44  44 44   ',
  ' 444  444 44  ',
  ' 444  444 44  ',
];

/* ============ API HELPER ============ */
async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || 'Terjadi kesalahan.');
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ============ EMBER PARTICLES ============ */
function spawnEmbers() {
  const host = document.getElementById('embers');
  host.innerHTML = '';
  const n = window.innerWidth < 600 ? 12 : 22;
  for (let i = 0; i < n; i++) {
    const e = document.createElement('div');
    e.className = 'ember';
    const size = Math.floor(Math.random() * 3) + 2;
    e.style.width = size + 'px'; e.style.height = size + 'px';
    e.style.left = Math.floor(Math.random() * 100) + 'vw';
    e.style.setProperty('--dx', (Math.floor(Math.random() * 80) - 40) + 'px');
    e.style.color = Math.random() > 0.5 ? '#5eead4' : '#a78bfa';
    e.style.animation = `drift ${Math.floor(Math.random() * 12) + 10}s linear ${Math.floor(Math.random() * 10)}s infinite`;
    host.appendChild(e);
  }
}
spawnEmbers();

/* ============ PIXEL ART RENDERER ============ */
function renderSpriteToCanvas(canvas, spriteData, palette, scale) {
  scale = scale || 1;
  const ctx = canvas.getContext('2d');
  const size = 16;
  canvas.width = size;
  canvas.height = size;
  ctx.clearRect(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    const row = spriteData[y] || '';
    for (let x = 0; x < size; x++) {
      const ch = row[x] || ' ';
      if (ch === ' ') continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function renderHunterSprite(canvas, gender, cosmetics) {
  const spriteData = gender === 'female' ? SPRITE_FEMALE : SPRITE_MALE;
  const palette = gender === 'female' ? SPRITE_PALETTE_FEMALE : SPRITE_PALETTE;
  renderSpriteToCanvas(canvas, spriteData, palette);
  // Render cosmetic overlays
  if (cosmetics && cosmetics.length > 0) {
    const ctx = canvas.getContext('2d');
    const cosPalette = gender === 'female' ? SPRITE_PALETTE_FEMALE : SPRITE_PALETTE;
    cosmetics.forEach((cosId) => {
      const overlay = COSMETIC_OVERLAYS[cosId];
      if (!overlay) return;
      for (let y = 0; y < 16; y++) {
        const row = overlay[y] || '';
        for (let x = 0; x < 16; x++) {
          const ch = row[x] || ' ';
          if (ch === ' ') continue;
          const color = cosPalette[ch] || SPRITE_PALETTE[ch] || '#cccccc';
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    });
  }
}

function renderMonsterSprite(canvas, isBoss) {
  const spriteData = isBoss ? MONSTER_SPRITE_BOSS : MONSTER_SPRITE_DEFAULT;
  const palette = MONSTER_PALETTE_DEFAULT;
  renderSpriteToCanvas(canvas, spriteData, palette);
}

/* ============ THEME SYSTEM ============ */
function getTheme() { return localStorage.getItem('ga_theme') || 'dark'; }
function setTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('ga_theme', theme);
  document.querySelectorAll('.theme-opt').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}
setTheme(getTheme());

document.getElementById('btn-settings-main').addEventListener('click', () => {
  document.getElementById('settings-overlay').classList.remove('hidden');
});
document.getElementById('btn-settings-nav').addEventListener('click', () => {
  document.getElementById('settings-overlay').classList.remove('hidden');
});
document.getElementById('btn-settings-close').addEventListener('click', () => {
  document.getElementById('settings-overlay').classList.add('hidden');
});
document.querySelectorAll('.theme-opt').forEach((btn) => {
  btn.addEventListener('click', () => setTheme(btn.dataset.theme));
});

/* ============ MAIN MENU ============ */
const mainMenu = document.getElementById('main-menu');
const authScreen = document.getElementById('auth-screen');
const creationScreen = document.getElementById('creation-screen');
const appEl = document.getElementById('app');
const appHeader = document.getElementById('app-header');
const navLoggedIn = document.getElementById('nav-loggedin');
const navUsername = document.getElementById('nav-username');

function showMainMenu() {
  mainMenu.classList.remove('hidden');
  authScreen.classList.add('hidden');
  creationScreen.classList.add('hidden');
  appEl.classList.add('hidden');
  appHeader.classList.add('hidden');
}

function showAuth() {
  mainMenu.classList.add('hidden');
  authScreen.classList.remove('hidden');
  creationScreen.classList.add('hidden');
  appEl.classList.add('hidden');
  appHeader.classList.remove('hidden');
}

function showCreation() {
  mainMenu.classList.add('hidden');
  authScreen.classList.add('hidden');
  creationScreen.classList.remove('hidden');
  appEl.classList.add('hidden');
  appHeader.classList.remove('hidden');
  // Render preview sprites
  renderHunterSprite(document.getElementById('preview-male'), 'male', []);
  renderHunterSprite(document.getElementById('preview-female'), 'female', []);
}

function showGame() {
  mainMenu.classList.add('hidden');
  authScreen.classList.add('hidden');
  creationScreen.classList.add('hidden');
  appEl.classList.remove('hidden');
  appHeader.classList.remove('hidden');
  navLoggedIn.classList.remove('hidden');
  navUsername.textContent = USERNAME;
}

// Exit button
document.getElementById('btn-exit-web').addEventListener('click', () => {
  if (confirm('Yakin ingin keluar dari Gerbang Awakening?')) {
    window.close();
    // Fallback: navigate away
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:monospace;color:#888;">Terima kasih telah bermain!</div>';
  }
});

// Start Game button
document.getElementById('btn-start-game').addEventListener('click', () => {
  if (TOKEN) {
    bootAuth();
  } else {
    showAuth();
  }
});

/* ============ AUTH SCREEN ============ */
document.querySelectorAll('.auth-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    document.getElementById('form-login').classList.toggle('hidden', target !== 'login');
    document.getElementById('form-register').classList.toggle('hidden', target !== 'register');
  });
});

async function showApp() {
  authScreen.classList.add('hidden');
  creationScreen.classList.add('hidden');
  appHeader.classList.remove('hidden');
  navLoggedIn.classList.remove('hidden');
  navUsername.textContent = USERNAME;
  loadOdds();
  await Promise.all([refreshHunter(), refreshAvatar()]);
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    const data = await api('/auth/login', { method: 'POST', body: { username, password } });
    TOKEN = data.token; USERNAME = data.username;
    localStorage.setItem('ga_token', TOKEN);
    localStorage.setItem('ga_username', USERNAME);
    await showApp();
  } catch (err) {
    errEl.textContent = err.message;
  }
});

document.getElementById('form-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('register-error');
  errEl.textContent = '';
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  try {
    const data = await api('/auth/register', { method: 'POST', body: { username, password } });
    TOKEN = data.token; USERNAME = data.username;
    localStorage.setItem('ga_token', TOKEN);
    localStorage.setItem('ga_username', USERNAME);
    await showApp();
  } catch (err) {
    errEl.textContent = err.message;
  }
});

document.getElementById('btn-logout').addEventListener('click', () => {
  TOKEN = null; USERNAME = null; currentHunter = null; activeBattle = null;
  localStorage.removeItem('ga_token');
  localStorage.removeItem('ga_username');
  document.getElementById('battle-result').classList.remove('show');
  navLoggedIn.classList.add('hidden');
  showMainMenu();
});

document.getElementById('btn-back-to-login').addEventListener('click', () => {
  showAuth();
});

async function bootAuth() {
  if (!TOKEN) { showAuth(); return; }
  try {
    const me = await api('/auth/me', { auth: true });
    USERNAME = me.username;
    localStorage.setItem('ga_username', USERNAME);
    await showApp();
  } catch (err) {
    TOKEN = null; USERNAME = null;
    localStorage.removeItem('ga_token');
    localStorage.removeItem('ga_username');
    showAuth();
  }
}

/* ============ CHARACTER CREATION ============ */
document.querySelectorAll('.gender-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.gender-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedGender = btn.dataset.gender;
    // Update previews
    renderHunterSprite(document.getElementById('preview-male'), 'male', []);
    renderHunterSprite(document.getElementById('preview-female'), 'female', []);
  });
});

document.getElementById('btn-create-character').addEventListener('click', async () => {
  const errEl = document.getElementById('creation-error');
  errEl.textContent = '';
  const nameInput = document.getElementById('creation-name-input');
  const name = nameInput.value.trim();

  // Store gender in localStorage for this session
  localStorage.setItem('ga_gender', selectedGender);

  try {
    const hunter = await api('/hunters/awaken', {
      method: 'POST',
      auth: true,
      body: { name: name || undefined, gender: selectedGender }
    });
    currentHunter = hunter;
    await showApp();
  } catch (err) {
    errEl.textContent = err.message;
  }
});

/* ============ HUNTER STATE ============ */
async function refreshHunter() {
  try {
    currentHunter = await api('/hunters/mine', { auth: true });
  } catch (err) {
    currentHunter = null;
  }
  applyHunterState();
  if (currentHunter) await checkActiveBattle();
}

async function refreshHunterQuiet() {
  try {
    currentHunter = await api('/hunters/mine', { auth: true });
    if (currentHunter) renderCharacter(currentHunter);
  } catch (err) { /* diamkan */ }
}

function applyHunterState() {
  const fightControls = document.getElementById('fight-controls');
  const charSection = document.getElementById('character-section');
  const eyebrow = document.getElementById('hero-eyebrow');
  const title = document.getElementById('hero-title');
  const sub = document.getElementById('hero-sub');
  const gateLabel = document.getElementById('gate-label');

  if (!currentHunter) {
    // No hunter — show creation screen
    showCreation();
    return;
  }

  appEl.classList.remove('hidden');
  fightControls.classList.remove('hidden');
  charSection.classList.remove('hidden');
  eyebrow.textContent = '— Gerbang Menanti —';
  title.innerHTML = `Selamat datang kembali,<br><em>${escapeHtml(currentHunter.name)}</em>`;
  sub.textContent = 'Pilih peringkat Gerbang, hadapi monsternya secara giliran, dan kumpulkan XP untuk naik level.';
  gateLabel.textContent = `Peringkat Pemburu: ${currentHunter.rank.code}`;
  populateGateSelect(currentHunter);
  renderCharacter(currentHunter);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ============ ODDS PANEL ============ */
async function loadOdds() {
  try {
    const data = await api('/odds');
    renderOdds(data.ranks, data.elements);
    populateGateSelectRanks(data.ranks);
  } catch (err) { /* opsional */ }
}

let RANK_LIST = [];
function populateGateSelectRanks(ranks) {
  RANK_LIST = ranks;
  if (currentHunter) populateGateSelect(currentHunter);
}
function populateGateSelect(hunter) {
  const sel = document.getElementById('gate-rank-select');
  if (RANK_LIST.length === 0 || !hunter) return;
  const prevValue = sel.value;
  sel.innerHTML = '';
  let bestUnlockedCode = null;
  RANK_LIST.forEach((r) => {
    const locked = hunter.level < r.unlockLevel;
    const opt = document.createElement('option');
    opt.value = r.code;
    opt.disabled = locked;
    opt.textContent = locked
      ? `🔒 Gerbang Peringkat ${r.code} (Butuh Lv. ${r.unlockLevel})`
      : `Gerbang Peringkat ${r.code}`;
    sel.appendChild(opt);
    if (!locked) bestUnlockedCode = r.code;
  });
  const stillValid = RANK_LIST.some((r) => r.code === prevValue && hunter.level >= r.unlockLevel);
  sel.value = stillValid ? prevValue : (bestUnlockedCode || RANK_LIST[0].code);
  updateGateLockHint(hunter);
}
function updateGateLockHint(hunter) {
  const hint = document.getElementById('gate-lock-hint');
  if (hunter.nextGateUnlock) {
    hint.textContent = `🔒 Gerbang ${hunter.nextGateUnlock.code} akan terbuka di Level ${hunter.nextGateUnlock.level} (level kamu sekarang: ${hunter.level}).`;
    hint.classList.remove('hidden');
  } else {
    hint.classList.add('hidden');
  }
}

function renderOdds(ranks, elements) {
  const totalR = ranks.reduce((s, r) => s + r.weight, 0);
  const totalE = elements.reduce((s, r) => s + r.weight, 0);
  const panel = document.getElementById('odds-panel');
  let html = '<h4>Peluang Peringkat Awakening</h4>';
  ranks.forEach((r) => {
    const pct = (r.weight / totalR) * 100;
    html += `<div class="odds-row">
      <div class="odds-badge" style="border:1px solid ${r.color};color:${r.color}">${r.code}</div>
      <div class="odds-bar"><div class="odds-fill" style="width:${Math.max(pct, 0.4)}%;background:${r.color}"></div></div>
      <div class="odds-pct">${pct < 1 ? pct.toFixed(2) : pct.toFixed(1)}%</div>
    </div>`;
  });
  html += '<h4 style="margin-top:16px">Peluang Elemen</h4>';
  elements.forEach((el) => {
    const pct = (el.weight / totalE) * 100;
    html += `<div class="odds-row">
      <div class="odds-badge" style="border:1px solid ${el.color};color:${el.color};font-size:14px">${el.icon}</div>
      <div class="odds-bar"><div class="odds-fill" style="width:${pct}%;background:${el.color}"></div></div>
      <div class="odds-pct">${pct.toFixed(1)}%</div>
    </div>`;
  });
  panel.innerHTML = html;
}

document.getElementById('odds-toggle').addEventListener('click', (e) => {
  const panel = document.getElementById('odds-panel');
  const open = panel.classList.toggle('open');
  e.target.setAttribute('aria-expanded', open);
  e.target.textContent = open ? 'Sembunyikan peluang ↑' : 'Lihat peluang peringkat & elemen awakening ↓';
});

/* ============ SYSTEM LOG ============ */
function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }

function addLogLine(text, cls = '') {
  const log = document.getElementById('syslog');
  const p = document.createElement('p');
  if (cls) p.className = cls;
  p.innerHTML = text;
  log.appendChild(p);
  return p;
}

/* ============ FIGHT FLOW ============ */
const btnFight = document.getElementById('btn-fight');

async function doEnterGate() {
  const gateRank = document.getElementById('gate-rank-select').value;
  btnFight.disabled = true;
  btnFight.textContent = 'Gerbang Terbuka…';
  document.getElementById('syslog').innerHTML = '';
  const stage = document.getElementById('gate-stage');
  stage.classList.add('charging');

  try {
    addLogLine(`[SISTEM] Memasuki Gerbang Peringkat ${gateRank}&hellip;`);
    await sleep(700);
    addLogLine('[SISTEM] Anomali terdeteksi di dalam Gerbang&hellip;', 'dim');
    await sleep(700);

    const state = await api('/gate/enter', { method: 'POST', auth: true, body: { gateRank } });

    stage.classList.remove('charging');
    stage.classList.add('burst');
    await sleep(150);
    addLogLine(`[SISTEM] ${state.monster.icon} ${state.monster.name} muncul!`);
    stage.classList.remove('burst');
    await sleep(400);

    enterBattleArena(state, true);
    document.getElementById('battle-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    stage.classList.remove('charging'); stage.classList.remove('burst');
    addLogLine(`[SISTEM] ${err.message}`, 'dim');
  }

  btnFight.disabled = false;
  btnFight.textContent = 'Masuki Gerbang';
}
btnFight.addEventListener('click', doEnterGate);

async function checkActiveBattle() {
  try {
    const state = await api('/gate/active', { auth: true });
    if (state) {
      enterBattleArena(state, false);
      addLogLine('[SISTEM] Melanjutkan pertarungan yang tertunda&hellip;', 'dim');
      document.getElementById('battle-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (err) { /* diamkan */ }
}

/* ---- Battle Arena rendering & controls ---- */
function resetBattleLogDisplay() {
  document.getElementById('battle-log').innerHTML = '';
  shownLogCount = 0;
}

async function revealNewLogLines(state, animate) {
  const host = document.getElementById('battle-log');
  const newLines = state.log.slice(shownLogCount);
  for (const line of newLines) {
    const p = document.createElement('p');
    p.textContent = line;
    host.appendChild(p);
    host.scrollTop = host.scrollHeight;
    if (animate) await sleep(260);
  }
  shownLogCount = state.log.length;
}

function addBattleErrorLine(text) {
  const host = document.getElementById('battle-log');
  const p = document.createElement('p');
  p.textContent = text;
  p.style.color = 'var(--danger)';
  host.appendChild(p);
  host.scrollTop = host.scrollHeight;
}

function renderWaveClearNotice(wc) {
  const host = document.getElementById('battle-log');
  const p = document.createElement('p');
  p.style.color = wc.isBoss ? 'var(--gold)' : '#34d399';
  p.style.fontWeight = '700';
  const parts = [`✓ Wave ${wc.wave} bersih! +${wc.xpGained} XP · 🪙 +${wc.coinsGained}`];
  if (wc.itemDrop) parts.push(`🎁 ${wc.itemDrop.icon} ${wc.itemDrop.name}`);
  if (wc.petDrop) {
    parts.push(wc.petDrop.alreadyOwned
      ? `(peliharaan ${wc.petDrop.name} sudah dimiliki)`
      : `🐾 ${wc.petDrop.icon} ${wc.petDrop.name} bergabung!`);
  }
  p.textContent = parts.join(' · ');
  host.appendChild(p);
  host.scrollTop = host.scrollHeight;
}

function startBattleLoop() {
  if (battleAnimFrame) cancelAnimationFrame(battleAnimFrame);
  const loop = () => {
    if (activeBattle && !activeBattle.over) {
      renderBattleCanvas(activeBattle);
      battleAnimFrame = requestAnimationFrame(loop);
    }
  };
  battleAnimFrame = requestAnimationFrame(loop);
}
function stopBattleLoop() {
  if (battleAnimFrame) { cancelAnimationFrame(battleAnimFrame); battleAnimFrame = null; }
}

function enterBattleArena(state, isFresh) {
  activeBattle = state;
  resetBattleLogDisplay();
  document.getElementById('battle-banner').classList.add('hidden');
  document.getElementById('battle-xp').classList.add('hidden');
  document.getElementById('item-drop-banner').classList.add('hidden');
  document.getElementById('levelup-banner').classList.add('hidden');
  document.getElementById('battle-continue-row').classList.add('hidden');
  document.getElementById('battle-actions').classList.remove('hidden');
  hideSubmenus();
  document.getElementById('battle-result').classList.add('show');
  renderBattleArena(state);
  renderBattleCanvas(state);
  startBattleLoop();

  if (state.over) {
    setBattleActionsEnabled(false);
    revealNewLogLines(state, isFresh).then(() => showBattleOutcome(state));
    return;
  }

  battleBusy = true;
  setBattleActionsEnabled(false);
  revealNewLogLines(state, isFresh).then(() => {
    battleBusy = false;
    if (activeBattle && !activeBattle.over) setBattleActionsEnabled(true);
  });
}

function setBattleActionsEnabled(enabled) {
  ['act-attack', 'act-skill-toggle', 'act-item-toggle', 'act-flee'].forEach((id) => {
    document.getElementById(id).disabled = !enabled;
  });
}

function hideSubmenus() {
  document.getElementById('skill-menu').classList.add('hidden');
  document.getElementById('item-menu').classList.add('hidden');
  document.getElementById('act-skill-toggle').classList.remove('active');
  document.getElementById('act-item-toggle').classList.remove('active');
}

function toggleSubmenu(menuId, btnId) {
  const menu = document.getElementById(menuId);
  const wasOpen = !menu.classList.contains('hidden');
  hideSubmenus();
  if (wasOpen) return;
  menu.classList.remove('hidden');
  document.getElementById(btnId).classList.add('active');
  if (menuId === 'skill-menu') renderSkillMenu(activeBattle);
  if (menuId === 'item-menu') loadInventoryForBattleMenu();
}

document.getElementById('act-attack').addEventListener('click', () => sendBattleAction('attack'));
document.getElementById('act-flee').addEventListener('click', () => sendBattleAction('flee'));
document.getElementById('act-skill-toggle').addEventListener('click', () => toggleSubmenu('skill-menu', 'act-skill-toggle'));
document.getElementById('act-item-toggle').addEventListener('click', () => toggleSubmenu('item-menu', 'act-item-toggle'));

function renderSkillMenu(state) {
  const host = document.getElementById('skill-menu');
  host.innerHTML = '';
  state.skills.forEach((sk, i) => {
    const btn = document.createElement('button');
    btn.className = 'submenu-item';
    btn.disabled = sk.cooldown > 0;
    btn.innerHTML = `
      <span class="si-icon">✨</span>
      <span class="si-info">
        <span class="si-name">${escapeHtml(sk.name)} <span style="color:${sk.rarity.color};font-size:9px">${sk.rarity.name}</span></span>
        <span class="si-desc">${escapeHtml(sk.kindLabel)} — ${escapeHtml(sk.desc)}</span>
      </span>
      <span class="si-badge cd">${sk.cooldown > 0 ? '⏳ ' + sk.cooldown : 'Siap'}</span>
    `;
    if (sk.cooldown === 0) btn.addEventListener('click', () => sendBattleAction('skill', { skillIndex: i }));
    host.appendChild(btn);
  });
}

async function loadInventoryForBattleMenu() {
  const host = document.getElementById('item-menu');
  host.innerHTML = '<div class="submenu-empty">Memuat&hellip;</div>';
  try {
    const data = await api('/inventory/mine', { auth: true });
    battleInventoryCache = data.items.filter((it) => it.type === 'consumable' && it.qty > 0);
    if (battleInventoryCache.length === 0) {
      host.innerHTML = '<div class="submenu-empty">Tidak ada item yang bisa dipakai. Cek Inventaris untuk melihat semua item.</div>';
      return;
    }
    host.innerHTML = '';
    battleInventoryCache.forEach((it) => {
      const btn = document.createElement('button');
      btn.className = 'submenu-item';
      btn.innerHTML = `
        <span class="si-icon">${it.icon}</span>
        <span class="si-info">
          <span class="si-name">${escapeHtml(it.name)}</span>
          <span class="si-desc">${escapeHtml(it.desc)}</span>
        </span>
        <span class="si-badge qty">×${it.qty}</span>
      `;
      btn.addEventListener('click', () => sendBattleAction('item', { inventoryId: it.id }));
      host.appendChild(btn);
    });
  } catch (err) {
    host.innerHTML = `<div class="submenu-empty">Gagal memuat item: ${escapeHtml(err.message)}</div>`;
  }
}

function triggerAttackAnimation(type) {
  battleAnim.attackActive = true;
  battleAnim.hunterAttackT = 0;
  if (type === 'flee') return;
  battleAnim.monsterFlash = 12;
  // Add damage numbers
  const dmg = Math.floor(Math.random() * 30) + 10;
  battleAnim.damageNumbers.push({
    text: '-' + dmg, x: battleAnim.monsterX + 30, y: battleAnim.monsterY - 10,
    vy: -1.5, life: 40, color: '#ff4444', size: 14,
  });
}

function triggerHealAnimation() {
  battleAnim.damageNumbers.push({
    text: '+' + Math.floor(Math.random() * 20 + 5),
    x: battleAnim.hunterX + 30, y: battleAnim.hunterY - 10,
    vy: -1.5, life: 40, color: '#44ff88', size: 14,
  });
  battleAnim.hunterFlash = 10;
}

function triggerSkillAnimation() {
  battleAnim.monsterFlash = 18;
  battleAnim.flashOverlay = 8;
  battleAnim.flashColor = 'rgba(167,139,250,0.3)';
  for (let i = 0; i < 12; i++) {
    battleAnim.particles.push({
      x: battleAnim.monsterX + 36,
      y: battleAnim.monsterY + 36,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 3 - 1,
      life: 25 + Math.random() * 15,
      color: Math.random() > 0.5 ? '#a78bfa' : '#5eead4',
      size: 2 + Math.random() * 3,
    });
  }
  const dmg = Math.floor(Math.random() * 50) + 20;
  battleAnim.damageNumbers.push({
    text: '-' + dmg, x: battleAnim.monsterX + 20, y: battleAnim.monsterY - 15,
    vy: -2, life: 50, color: '#a78bfa', size: 16,
  });
}

async function sendBattleAction(action, extra) {
  if (battleBusy || !activeBattle || activeBattle.over) return;
  battleBusy = true;
  setBattleActionsEnabled(false);
  hideSubmenus();
  try {
    // Trigger attack animation BEFORE API call
    if (action === 'attack') triggerAttackAnimation('attack');
    else if (action === 'skill') triggerSkillAnimation();
    else if (action === 'item') triggerHealAnimation();

    // Wait for attack animation to play
    if (action !== 'flee') await sleep(400);

    const newState = await api('/gate/action', { method: 'POST', auth: true, body: Object.assign({ action }, extra || {}) });
    activeBattle = newState;
    renderBattleArena(newState);
    if (newState.waveCleared) {
      if (newState.hunterProfile) currentHunter = newState.hunterProfile;
      renderWaveClearNotice(newState.waveCleared);
    }
    await revealNewLogLines(newState, true);
    if (newState.over) {
      await sleep(250);
      showBattleOutcome(newState);
    }
  } catch (err) {
    addBattleErrorLine(`[SISTEM] ${err.message}`);
  } finally {
    battleBusy = false;
    if (activeBattle && !activeBattle.over) setBattleActionsEnabled(true);
  }
}

function renderStatusChips(statuses) {
  const host = document.getElementById('battle-statuses');
  host.innerHTML = '';
  (statuses || []).forEach((st) => {
    const span = document.createElement('span');
    if (st.type === 'dot') {
      span.className = 'status-chip dot';
      span.textContent = `☠ ${st.amount}/gil (${st.turnsLeft})`;
    } else {
      const isBuff = st.amount > 0;
      span.className = 'status-chip ' + (isBuff ? 'buff' : 'debuff');
      span.textContent = `${isBuff ? '▲' : '▼'} ${st.stat} ${isBuff ? '+' : ''}${st.amount} (${st.turnsLeft})`;
    }
    host.appendChild(span);
  });
}

/* ============ BATTLE CANVAS RENDERING ============ */
function renderBattleArena(state) {
  // HUD info
  document.getElementById('battle-turn-display').textContent = `Giliran ${state.turnNo}`;
  document.getElementById('hud-hunter-name').textContent = currentHunter ? currentHunter.name : 'Pemburu';
  document.getElementById('hud-hunter-hp').textContent = `${Math.max(0, state.hunter.hp)} / ${state.hunter.maxHp}`;
  const hunterPct = Math.max(0, Math.min(100, (state.hunter.hp / state.hunter.maxHp) * 100));
  const hunterFill = document.getElementById('hud-hunter-hp-fill');
  hunterFill.style.width = hunterPct + '%';
  hunterFill.classList.toggle('low', hunterPct <= 25);

  document.getElementById('hud-monster-name').textContent = `${state.monster.name} (${state.monster.gateRank})`;
  document.getElementById('hud-monster-hp').textContent = `${Math.max(0, state.monster.hp)} / ${state.monster.maxHp}`;
  const monsterPct = Math.max(0, Math.min(100, (state.monster.hp / state.monster.maxHp) * 100));
  const monsterFill = document.getElementById('hud-monster-hp-fill');
  monsterFill.style.width = monsterPct + '%';
  monsterFill.classList.toggle('low', monsterPct <= 25);

  renderStatusChips(state.statuses.hunter.concat(state.statuses.monster || []));
}

function renderBattleCanvas(state) {
  if (!state || !state.monster) return;
  const canvas = document.getElementById('battle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 800, H = 280;
  canvas.width = W;
  canvas.height = H;
  const isDark = getTheme() !== 'light';

  // Init base positions
  const spriteSize = 80;
  const isBoss = state.monster.isBoss;
  const monsterSpriteSize = isBoss ? 96 : 72;
  battleAnim.hunterBaseX = 100;
  battleAnim.hunterBaseY = H * 0.35 - 5;
  battleAnim.monsterBaseX = W - 110 - monsterSpriteSize;
  battleAnim.monsterBaseY = H * 0.35 - (isBoss ? 10 : 0);

  // Update animation
  if (battleAnim.attackActive) {
    battleAnim.hunterAttackT += 0.08;
    if (battleAnim.hunterAttackT >= 1) {
      battleAnim.attackActive = false;
      battleAnim.hunterAttackT = 0;
    }
  }
  if (battleAnim.monsterFlash > 0) battleAnim.monsterFlash--;
  if (battleAnim.hunterFlash > 0) battleAnim.hunterFlash--;
  if (battleAnim.monsterShake > 0) battleAnim.monsterShake--;
  if (battleAnim.flashOverlay > 0) battleAnim.flashOverlay--;
  battleAnim.damageNumbers = battleAnim.damageNumbers.filter((d) => { d.y += d.vy; d.life--; return d.life > 0; });
  battleAnim.particles = battleAnim.particles.filter((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--; return p.life > 0; });

  // Compute animated positions
  let hx = battleAnim.hunterBaseX, hy = battleAnim.hunterBaseY;
  let mx = battleAnim.monsterBaseX, my = battleAnim.monsterBaseY;
  if (battleAnim.attackActive) {
    const t = battleAnim.hunterAttackT;
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const progress = t < 0.5 ? ease * 2 : 2 - ease * 2;
    hx += (W * 0.28 - battleAnim.hunterBaseX) * Math.min(1, progress);
  }
  if (battleAnim.monsterShake > 0) {
    mx += (Math.random() - 0.5) * 6;
    my += (Math.random() - 0.5) * 4;
  }
  battleAnim.hunterX = hx; battleAnim.hunterY = hy;
  battleAnim.monsterX = mx; battleAnim.monsterY = my;

  // --- DRAW BACKGROUND ---
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  skyGrad.addColorStop(0, isDark ? '#080c18' : '#b0b8d0');
  skyGrad.addColorStop(1, isDark ? '#0c1020' : '#c0c8e0');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H * 0.6);

  // Stars
  if (isDark) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 137 + 50) % W;
      const sy = (i * 89 + 20) % (H * 0.55);
      const twinkle = Math.sin(Date.now() * 0.002 + i) * 0.3 + 0.7;
      ctx.globalAlpha = twinkle * 0.6;
      ctx.fillRect(sx, sy, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // Ground
  const groundGrad = ctx.createLinearGradient(0, H * 0.58, 0, H);
  groundGrad.addColorStop(0, isDark ? '#162012' : '#8aa070');
  groundGrad.addColorStop(1, isDark ? '#0c1008' : '#6a7a50');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, H * 0.58, W, H * 0.42);
  ctx.strokeStyle = isDark ? 'rgba(94,234,212,0.12)' : 'rgba(13,148,136,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H * 0.6); ctx.lineTo(W, H * 0.6); ctx.stroke();

  // Ground details
  ctx.fillStyle = isDark ? 'rgba(94,234,212,0.06)' : 'rgba(13,148,136,0.1)';
  for (let i = 0; i < 12; i++) {
    const rx = (i * 73 + 20) % W;
    const ry = H * 0.62 + (i * 17 % 25);
    ctx.fillRect(rx, ry, 3 + (i % 3), 2);
  }

  // --- DRAW HUNTER ---
  const gender = localStorage.getItem('ga_gender') || 'male';
  const cosmetics = (currentHunter && currentHunter.cosmetics) || [];
  const equippedCos = (currentHunter && currentHunter.equippedCosmetics) || [];

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(hx + spriteSize / 2, hy + spriteSize + 4, spriteSize * 0.3, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sprite
  const hunterCanvas = document.createElement('canvas');
  hunterCanvas.width = 16; hunterCanvas.height = 16;
  renderHunterSprite(hunterCanvas, gender, equippedCos);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(hunterCanvas, hx, hy, spriteSize, spriteSize);

  // Glow
  ctx.shadowColor = isDark ? 'rgba(94,234,212,0.5)' : 'rgba(13,148,136,0.4)';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = isDark ? 'rgba(94,234,212,0.25)' : 'rgba(13,148,136,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(hx + 6, hy + 6, spriteSize - 12, spriteSize - 12);
  ctx.shadowBlur = 0;

  // Flash overlay when hunter gets hit
  if (battleAnim.hunterFlash > 0) {
    ctx.fillStyle = 'rgba(251,113,133,' + (battleAnim.hunterFlash / 12 * 0.4) + ')';
    ctx.fillRect(hx, hy, spriteSize, spriteSize);
  }

  // --- DRAW MONSTER ---
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(mx + monsterSpriteSize / 2, my + monsterSpriteSize + 4, monsterSpriteSize * 0.3, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sprite
  const monsterCanvas = document.createElement('canvas');
  monsterCanvas.width = 16; monsterCanvas.height = 16;
  renderMonsterSprite(monsterCanvas, isBoss);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(monsterCanvas, mx, my, monsterSpriteSize, monsterSpriteSize);

  // Glow
  ctx.shadowColor = isBoss ? 'rgba(251,113,133,0.6)' : 'rgba(251,113,133,0.35)';
  ctx.shadowBlur = isBoss ? 18 : 10;
  ctx.strokeStyle = isBoss ? 'rgba(251,113,133,0.35)' : 'rgba(251,113,133,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + 6, my + 6, monsterSpriteSize - 12, monsterSpriteSize - 12);
  ctx.shadowBlur = 0;

  // Flash overlay when monster gets hit
  if (battleAnim.monsterFlash > 0) {
    const flashAlpha = battleAnim.monsterFlash / 18 * 0.5;
    ctx.fillStyle = 'rgba(255,255,255,' + flashAlpha + ')';
    ctx.fillRect(mx, my, monsterSpriteSize, monsterSpriteSize);
  }

  // --- DRAW ATTACK LINE (when attacking) ---
  if (battleAnim.attackActive && battleAnim.hunterAttackT > 0.3 && battleAnim.hunterAttackT < 0.7) {
    const lineAlpha = Math.sin((battleAnim.hunterAttackT - 0.3) / 0.4 * Math.PI);
    ctx.strokeStyle = 'rgba(94,234,212,' + (lineAlpha * 0.6) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx + spriteSize, hy + spriteSize * 0.5);
    ctx.lineTo(mx, my + monsterSpriteSize * 0.5);
    ctx.stroke();
    // Slash particles
    for (let i = 0; i < 3; i++) {
      const px = hx + spriteSize + (mx - hx - spriteSize) * Math.random();
      const py = hy + spriteSize * 0.3 + Math.random() * spriteSize * 0.4;
      ctx.fillStyle = 'rgba(94,234,212,' + (lineAlpha * 0.8) + ')';
      ctx.fillRect(px, py, 2, 2);
    }
  }

  // --- DRAW PARTICLES ---
  battleAnim.particles.forEach((p) => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.min(1, p.life / 10);
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  ctx.globalAlpha = 1;

  // --- DRAW DAMAGE NUMBERS ---
  battleAnim.damageNumbers.forEach((d) => {
    const alpha = Math.min(1, d.life / 15);
    ctx.font = 'bold ' + d.size + 'px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,' + (alpha * 0.5) + ')';
    ctx.fillText(d.text, d.x + 1, d.y + 1);
    ctx.fillStyle = d.color.replace(')', ',' + alpha + ')').replace('rgb', 'rgba');
    if (!d.color.includes('rgba')) ctx.globalAlpha = alpha;
    ctx.fillStyle = d.color;
    ctx.fillText(d.text, d.x, d.y);
    ctx.globalAlpha = 1;
  });

  // --- FLASH OVERLAY ---
  if (battleAnim.flashOverlay > 0) {
    ctx.fillStyle = battleAnim.flashColor;
    ctx.fillRect(0, 0, W, H);
  }

  // --- VS INDICATOR ---
  ctx.fillStyle = isDark ? 'rgba(167,139,250,0.12)' : 'rgba(124,58,237,0.08)';
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.5, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = 'bold 14px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isDark ? 'rgba(167,139,250,0.5)' : 'rgba(124,58,237,0.4)';
  ctx.fillText('VS', W / 2, H * 0.5);
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillStyle = isDark ? 'rgba(94,234,212,0.4)' : 'rgba(13,148,136,0.4)';
  ctx.fillText(`Gerbang ${state.gateRank} · Wave ${state.wave}/${state.maxWave}`, W / 2, H * 0.5 + 18);
}

function showBattleOutcome(state) {
  stopBattleLoop();
  renderBattleArena(state);
  renderBattleCanvas(state);
  document.getElementById('battle-actions').classList.add('hidden');
  hideSubmenus();

  const RESULT_LABEL = { menang: '⚔ Kemenangan!', kalah: '✕ Mundur dari Pertempuran', kabur: '🏃 Berhasil Kabur' };
  const RESULT_CLASS = { menang: 'win', kalah: 'lose', kabur: 'flee' };
  const result = state.outcome ? state.outcome.result : 'kalah';

  const banner = document.getElementById('battle-banner');
  banner.textContent = RESULT_LABEL[result] || '';
  banner.className = 'battle-banner ' + (RESULT_CLASS[result] || '');
  banner.classList.remove('hidden');

  const xpEl = document.getElementById('battle-xp');
  if (typeof state.xpGained === 'number') {
    const coinsPart = state.coinsGained > 0 ? ` · 🪙 +${state.coinsGained}` : '';
    xpEl.innerHTML = `+<b>${state.xpGained}</b> XP${coinsPart}`;
    xpEl.classList.remove('hidden');
  }

  const dropEl = document.getElementById('item-drop-banner');
  if (state.itemDrop) {
    const c = RARITY_COLOR[state.itemDrop.rarity] || 'var(--arcane)';
    dropEl.innerHTML = `🎁 Item didapat: <b>${state.itemDrop.icon} ${escapeHtml(state.itemDrop.name)}</b> <span style="color:${c}">(${state.itemDrop.rarity})</span>`;
    dropEl.classList.remove('hidden');
  } else {
    dropEl.classList.add('hidden');
  }

  const levelupBanner = document.getElementById('levelup-banner');
  if (state.leveledUp) {
    levelupBanner.textContent = `🎉 Naik ${state.levelsGained} Level! Sekarang Level ${state.hunterProfile.level} — +${state.levelsGained * 5} poin stat untuk dialokasikan.`;
    levelupBanner.classList.remove('hidden');
  } else {
    levelupBanner.classList.add('hidden');
  }

  document.getElementById('battle-continue-row').classList.remove('hidden');

  if (state.hunterProfile) {
    currentHunter = state.hunterProfile;
    renderCharacter(currentHunter);
  }
}

document.getElementById('btn-battle-continue').addEventListener('click', () => {
  stopBattleLoop();
  activeBattle = null;
  document.getElementById('battle-result').classList.remove('show');
  document.getElementById('battle-actions').classList.remove('hidden');
  if (currentHunter) populateGateSelect(currentHunter);
  document.getElementById('gate-stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* ============ CHARACTER SHEET RENDER ============ */
function renderCharacter(hunter) {
  document.getElementById('lic-id').textContent = 'PB-' + hunter.id + ' · LISENSI PEMBURU';
  document.getElementById('lic-name').textContent = hunter.name;
  document.getElementById('lic-title').textContent = '"' + hunter.title + '"';
  document.getElementById('lic-class').innerHTML = `<span class="ic">${hunter.class.icon}</span>${hunter.class.name}`;
  document.getElementById('lic-element').innerHTML = `<span class="ic">${hunter.element.icon}</span>${hunter.element.name}`;
  document.getElementById('lic-level-pill').innerHTML = `<span class="level-pill">Lv. ${hunter.level}</span>`;

  const genderLabel = hunter.gender === 'female' ? '👩 Cewek' : '👨 Cowok';
  document.getElementById('lic-gender').textContent = genderLabel;

  document.getElementById('lic-power').textContent = hunter.power.toLocaleString('id-ID');
  document.getElementById('lic-coins').textContent = (hunter.coins || 0).toLocaleString('id-ID');

  const xpPct = Math.min(100, (hunter.xp / hunter.xpToNext) * 100);
  document.getElementById('xp-fill').style.width = xpPct + '%';
  document.getElementById('xp-nums').textContent = `${hunter.xp} / ${hunter.xpToNext} XP`;

  const rankEl = document.getElementById('lic-rank');
  rankEl.textContent = hunter.rank.code;
  rankEl.className = 'rank-badge' + (hunter.rank.code === 'SSS' ? ' sss' : '');
  rankEl.style.setProperty('--rankcolor', hunter.rank.color);
  rankEl.style.setProperty('--rankglow2', hunter.rank.color + '55');

  const licenseEl = document.getElementById('license');
  licenseEl.className = 'license' + (hunter.rank.code === 'SSS' ? ' sss' : '');
  licenseEl.style.setProperty('--rankglow', hunter.rank.color + '22');

  const pointsHost = document.getElementById('points-banner-host');
  if (hunter.statPoints > 0) {
    pointsHost.innerHTML = `<div class="points-banner"><div class="msg">Kamu punya <b>${hunter.statPoints}</b> poin stat yang belum dialokasikan.</div></div>`;
  } else {
    pointsHost.innerHTML = '';
  }

  // Character pixel art preview
  const charCanvas = document.getElementById('lic-char-canvas');
  const gender = hunter.gender || localStorage.getItem('ga_gender') || 'male';
  const cosmetics = hunter.cosmetics || pendingCosmetics || [];
  renderHunterSprite(charCanvas, gender, cosmetics);

  // Cosmetics display
  const cosHost = document.getElementById('lic-cosmetics');
  cosHost.innerHTML = '';
  const equipped = (hunter.equippedCosmetics || []).length > 0 ? hunter.equippedCosmetics : [];
  equipped.forEach((cosId) => {
    const def = COSMETIC_DEFS.find((c) => c.id === cosId);
    if (!def) return;
    const badge = document.createElement('span');
    badge.className = 'cosmetic-badge equipped';
    badge.textContent = `${def.icon} ${def.name}`;
    cosHost.appendChild(badge);
  });
  if (equipped.length === 0) {
    const badge = document.createElement('span');
    badge.className = 'cosmetic-badge';
    badge.textContent = '🎨 Belum ada kosmetik terpasang';
    badge.addEventListener('click', openCosmeticsModal);
    cosHost.appendChild(badge);
  } else {
    const badge = document.createElement('span');
    badge.className = 'cosmetic-badge';
    badge.textContent = '⚙️ Ganti Kosmetik';
    badge.addEventListener('click', openCosmeticsModal);
    cosHost.appendChild(badge);
  }

  const statsGrid = document.getElementById('lic-stats');
  statsGrid.innerHTML = '';
  STAT_NAMES.forEach((name) => {
    const val = hunter.stats[name];
    const eff = hunter.effectiveStats ? hunter.effectiveStats[name] : val;
    const row = document.createElement('div');
    row.className = 'stat-alloc-row';
    row.innerHTML = `
      <div class="stat-name">${name}</div>
      <div class="stat-val">${val}${eff !== val ? ` <span style="color:var(--mana);font-size:10px">→${eff}</span>` : ''}</div>
      <button class="stat-plus" data-stat="${name}" ${hunter.statPoints > 0 ? '' : 'disabled'} aria-label="Tambah ${name}">+</button>
    `;
    statsGrid.appendChild(row);
  });
  statsGrid.querySelectorAll('.stat-plus').forEach((btn) => {
    btn.addEventListener('click', () => allocateStat(btn.dataset.stat));
  });

  renderEquipSlots(hunter.equipment, 'lic-equip-slots', true);

  const skillsHost = document.getElementById('lic-skills');
  skillsHost.innerHTML = '';
  hunter.skills.forEach((s) => {
    const row = document.createElement('div');
    row.className = 'skill';
    row.innerHTML = `<span class="sn">${s.name}</span><span class="sr" style="background:${s.rarity.color}22;color:${s.rarity.color};border:1px solid ${s.rarity.color}55">${s.rarity.name}</span>`;
    skillsHost.appendChild(row);
  });
}

async function allocateStat(stat) {
  try {
    const updated = await api('/hunters/allocate', { method: 'POST', auth: true, body: { stat } });
    currentHunter = updated;
    renderCharacter(updated);
  } catch (err) { /* diamkan */ }
}

/* ============ COSMETICS SYSTEM ============ */
async function openCosmeticsModal() {
  document.getElementById('cosmetics-error').textContent = '';
  openModal('cosmetics-overlay');
  const listHost = document.getElementById('cosmetics-list');
  listHost.innerHTML = '<div class="list-empty">Memuat&hellip;</div>';
  try {
    const data = await api('/hunters/cosmetics', { auth: true });
    renderCosmeticsList(data.owned || [], data.equipped || []);
    // Preview
    const gender = currentHunter ? currentHunter.gender : (localStorage.getItem('ga_gender') || 'male');
    renderHunterSprite(document.getElementById('cosmetic-preview-canvas'), gender, data.equipped || []);
  } catch (err) {
    listHost.innerHTML = `<div class="list-empty">Gagal memuat kosmetik: ${escapeHtml(err.message)}</div>`;
  }
}

function renderCosmeticsList(owned, equipped) {
  const host = document.getElementById('cosmetics-list');
  const equippedSet = new Set(equipped);

  if (owned.length === 0) {
    host.innerHTML = '<div class="list-empty">Belum ada kosmetik.<br>Semoga beruntung di Gacha Kosmetik!</div>';
    return;
  }

  host.innerHTML = '';
  owned.forEach((cosId) => {
    const def = COSMETIC_DEFS.find((c) => c.id === cosId);
    if (!def) return;
    const isEquipped = equippedSet.has(cosId);
    const rarityColor = RARITY_COLOR[def.rarity] || 'var(--ink-2)';
    const row = document.createElement('div');
    row.className = 'list-item';
    row.style.cursor = 'default';
    row.innerHTML = `
      <div class="list-badge" style="--c:${rarityColor}">${def.icon}</div>
      <div class="list-info">
        <div class="rn">${escapeHtml(def.name)} <span style="color:${rarityColor}">— ${def.rarity}</span></div>
        <div class="rm">${escapeHtml(def.desc)}</div>
      </div>
      <div>
        <button class="mini-btn ${isEquipped ? '' : 'primary'}" data-cos-action="${isEquipped ? 'unequip' : 'equip'}" data-cos-id="${cosId}">
          ${isEquipped ? 'Lepas' : 'Pakai'}
        </button>
      </div>
    `;
    host.appendChild(row);
  });

  host.querySelectorAll('[data-cos-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.cosAction;
      const cosId = btn.dataset.cosId;
      try {
        if (action === 'equip') {
          await api('/hunters/cosmetics/equip', { method: 'POST', auth: true, body: { cosmeticId: cosId } });
        } else {
          await api('/hunters/cosmetics/unequip', { method: 'POST', auth: true, body: { cosmeticId: cosId } });
        }
        await openCosmeticsModal();
        await refreshHunterQuiet();
      } catch (err) {
        document.getElementById('cosmetics-error').textContent = err.message;
      }
    });
  });
}

document.getElementById('cosmetics-close').addEventListener('click', () => closeModal('cosmetics-overlay'));

/* ============ EQUIPMENT & INVENTORY ============ */
function renderEquipSlots(equipment, hostId, clickable) {
  const host = document.getElementById(hostId);
  host.innerHTML = '';
  ['weapon', 'armor', 'accessory'].forEach((slot) => {
    const item = equipment ? equipment[slot] : null;
    const box = document.createElement('div');
    box.className = 'equip-slot ' + (item ? 'filled' : 'empty');
    if (item) box.style.setProperty('--slotcolor', RARITY_COLOR[item.rarity] || '');
    box.innerHTML = `
      <div class="es-icon">${item ? item.icon : SLOT_ICONS[slot]}</div>
      <div class="es-label">${SLOT_LABELS[slot]}</div>
      <div class="es-name">${item ? escapeHtml(item.name) : 'Kosong'}</div>
    `;
    if (clickable) box.addEventListener('click', openInventoryModal);
    host.appendChild(box);
  });
}

function setInventoryError(msg) {
  document.getElementById('inventory-error').textContent = msg || '';
}

async function openInventoryModal() {
  openModal('inventory-overlay');
  await loadInventoryModal();
}

async function loadInventoryModal() {
  setInventoryError('');
  const listHost = document.getElementById('inventory-list');
  listHost.innerHTML = '<div class="list-empty">Memuat&hellip;</div>';
  try {
    const data = await api('/inventory/mine', { auth: true });
    renderEquipSlots(data.equipped, 'inv-equip-slots', false);
    renderInventoryList(data.items);
  } catch (err) {
    listHost.innerHTML = `<div class="list-empty">Gagal memuat inventaris: ${escapeHtml(err.message)}</div>`;
  }
}

function renderInventoryList(items) {
  const host = document.getElementById('inventory-list');
  if (!items || items.length === 0) {
    host.innerHTML = '<div class="list-empty">Inventaris masih kosong.<br>Menangkan pertarungan di Gerbang untuk mendapat item.</div>';
    return;
  }
  host.innerHTML = '';
  items.forEach((it) => {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.style.cursor = 'default';
    const rarityColor = RARITY_COLOR[it.rarity] || 'var(--text-muted)';
    let actionHtml;
    if (it.type === 'equipment') {
      actionHtml = it.equipped
        ? `<button class="mini-btn" data-unequip="${it.slot}">Lepas</button>`
        : `<button class="mini-btn primary" data-equip="${it.id}">Pakai</button>`;
    } else {
      actionHtml = `<span style="font-size:10.5px;color:var(--text-muted);white-space:nowrap">×${it.qty} · dipakai saat bertarung</span>`;
    }
    row.innerHTML = `
      <div class="list-badge" style="--c:${rarityColor}">${it.icon}</div>
      <div class="list-info">
        <div class="rn">${escapeHtml(it.name)} <span style="color:${rarityColor}">— ${it.rarity}</span></div>
        <div class="rm">${escapeHtml(it.desc)}</div>
      </div>
      <div>${actionHtml}</div>
    `;
    host.appendChild(row);
  });
  host.querySelectorAll('[data-equip]').forEach((btn) => {
    btn.addEventListener('click', () => equipItem(Number(btn.dataset.equip)));
  });
  host.querySelectorAll('[data-unequip]').forEach((btn) => {
    btn.addEventListener('click', () => unequipSlot(btn.dataset.unequip));
  });
}

async function equipItem(inventoryId) {
  setInventoryError('');
  try {
    await api('/inventory/equip', { method: 'POST', auth: true, body: { inventoryId } });
    await loadInventoryModal();
    await refreshHunterQuiet();
  } catch (err) {
    setInventoryError(err.message);
  }
}

async function unequipSlot(slot) {
  setInventoryError('');
  try {
    await api('/inventory/unequip', { method: 'POST', auth: true, body: { slot } });
    await loadInventoryModal();
    await refreshHunterQuiet();
  } catch (err) {
    setInventoryError(err.message);
  }
}

document.getElementById('btn-inventory').addEventListener('click', openInventoryModal);
document.getElementById('inventory-close').addEventListener('click', () => closeModal('inventory-overlay'));

/* ============ SHOP MODAL ============ */
let shopTimerInterval = null;
let shopRefreshesAt = null;

function setShopError(msg) {
  document.getElementById('shop-error').textContent = msg || '';
}

async function openShopModal() {
  openModal('shop-overlay');
  await loadShopModal();
}

async function loadShopModal() {
  setShopError('');
  document.getElementById('shop-coins').textContent = (currentHunter ? currentHunter.coins || 0 : 0).toLocaleString('id-ID');
  const listHost = document.getElementById('shop-list');
  listHost.innerHTML = '<div class="list-empty">Memuat&hellip;</div>';
  try {
    const data = await api('/shop', { auth: true });
    shopRefreshesAt = new Date(data.refreshesAt).getTime();
    startShopCountdown();
    renderShopList(data.items);
  } catch (err) {
    listHost.innerHTML = `<div class="list-empty">Gagal memuat Toko: ${escapeHtml(err.message)}</div>`;
  }
}

function startShopCountdown() {
  if (shopTimerInterval) clearInterval(shopTimerInterval);
  const tick = () => {
    const el = document.getElementById('shop-timer');
    if (!shopRefreshesAt) { el.textContent = 'Refresh dalam --:--'; return; }
    const remaining = shopRefreshesAt - Date.now();
    if (remaining <= 0) {
      el.textContent = 'Merefresh…';
      if (document.getElementById('shop-overlay').classList.contains('open')) loadShopModal();
      return;
    }
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    el.textContent = `Refresh dalam ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  tick();
  shopTimerInterval = setInterval(tick, 1000);
}

function renderShopList(items) {
  const host = document.getElementById('shop-list');
  if (!items || items.length === 0) {
    host.innerHTML = '<div class="list-empty">Toko sedang kosong. Coba lagi sebentar.</div>';
    return;
  }
  const coins = currentHunter ? currentHunter.coins || 0 : 0;
  host.innerHTML = '';
  items.forEach((it) => {
    const rarityColor = RARITY_COLOR[it.rarity] || 'var(--text-muted)';
    const affordable = coins >= it.price;
    const row = document.createElement('div');
    row.className = 'list-item';
    row.style.cursor = 'default';
    row.innerHTML = `
      <div class="list-badge" style="--c:${rarityColor}">${it.icon}</div>
      <div class="list-info">
        <div class="rn">${escapeHtml(it.name)} <span style="color:${rarityColor}">— ${it.rarity}</span></div>
        <div class="rm">${escapeHtml(it.desc || (it.type === 'equipment' ? `${it.stat} +${it.amount}` : ''))}</div>
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
        <span class="shop-item-price">🪙 ${it.price.toLocaleString('id-ID')}</span>
        <button class="mini-btn primary" data-buy="${it.key}" ${affordable ? '' : 'disabled'}>Beli</button>
      </div>
    `;
    host.appendChild(row);
  });
  host.querySelectorAll('[data-buy]').forEach((btn) => {
    btn.addEventListener('click', () => buyShopItem(btn.dataset.buy));
  });
}

async function buyShopItem(itemKey) {
  setShopError('');
  try {
    const data = await api('/shop/buy', { method: 'POST', auth: true, body: { itemKey } });
    if (currentHunter) currentHunter.coins = data.coins;
    document.getElementById('shop-coins').textContent = data.coins.toLocaleString('id-ID');
    document.getElementById('lic-coins').textContent = data.coins.toLocaleString('id-ID');
    await loadShopModal();
  } catch (err) {
    setShopError(err.message);
  }
}

document.getElementById('btn-shop').addEventListener('click', openShopModal);
document.getElementById('shop-close').addEventListener('click', closeShopModal);

document.getElementById('btn-copy').addEventListener('click', () => {
  if (!currentHunter) return;
  const h = currentHunter;
  const text = `⟡ LISENSI PEMBURU ⟡\nNama: ${h.name}  "${h.title}"\nLevel ${h.level}  |  Peringkat: ${h.rank.code}  |  Kelas: ${h.class.name}  |  Elemen: ${h.element.name}\nStat — HP ${h.stats.HP} · ATK ${h.stats.ATK} · DEF ${h.stats.DEF} · AGI ${h.stats.AGI} · INT ${h.stats.INT} · LUK ${h.stats.LUK}\nSkill: ${h.skills.map((s) => s.name + ' [' + s.rarity.name + ']').join(', ')}\nSkor Kekuatan: ${h.power}\n— Gerbang Awakening`;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('btn-copy');
    const orig = btn.textContent;
    btn.textContent = 'Tersalin ✓';
    setTimeout(() => (btn.textContent = orig), 1500);
  }).catch(() => {});
});

document.getElementById('btn-reset-char').addEventListener('click', async () => {
  if (!confirm('Yakin ingin mereset karakter? Level, stat, dan riwayat pertarunganmu akan hilang permanen.')) return;
  try {
    await api('/hunters/mine', { method: 'DELETE', auth: true });
    currentHunter = null;
    activeBattle = null;
    pendingCosmetics = [];
    localStorage.removeItem('ga_gender');
    document.getElementById('battle-result').classList.remove('show');
    document.getElementById('gate-rank-select').innerHTML = '';
    showCreation();
  } catch (err) { /* diamkan */ }
});

/* ============ BATTLE HISTORY MODAL ============ */
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.getElementById('btn-roster').addEventListener('click', async () => {
  openModal('roster-overlay');
  const list = document.getElementById('roster-list');
  const summary = document.getElementById('roster-summary');
  list.innerHTML = '<div class="list-empty">Memuat&hellip;</div>';
  summary.innerHTML = '';
  try {
    const battles = await api('/battles/mine', { auth: true });
    renderBattleHistory(battles);
  } catch (err) {
    list.innerHTML = `<div class="list-empty">Gagal memuat riwayat: ${err.message}</div>`;
  }
});
document.getElementById('roster-close').addEventListener('click', () => closeModal('roster-overlay'));

function renderBattleHistory(battles) {
  const summary = document.getElementById('roster-summary');
  const list = document.getElementById('roster-list');
  if (battles.length === 0) {
    summary.innerHTML = '';
    list.innerHTML = '<div class="list-empty">Belum ada pertarungan.<br>Masuki Gerbang untuk mulai bertarung.</div>';
    return;
  }
  const wins = battles.filter((b) => b.result === 'menang').length;
  summary.innerHTML = `
    <div><strong>${battles.length}</strong>Pertarungan Tercatat</div>
    <div><strong style="color:#34d399">${wins}</strong>Kemenangan</div>
  `;
  list.innerHTML = '';
  battles.forEach((b) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.style.cursor = 'default';
    const resultColor = b.result === 'menang' ? '#34d399' : (b.result === 'kabur' ? '#7d7fa0' : '#fb7185');
    item.innerHTML = `
      <div class="list-badge" style="--c:${resultColor}">${b.monsterIcon}</div>
      <div class="list-info">
        <div class="rn">${b.monsterName} <span style="color:${resultColor}">— ${b.result}</span></div>
        <div class="rm">Gerbang ${b.gateRank} · +${b.xpGained} XP${b.coinsGained > 0 ? ` · 🪙 +${b.coinsGained}` : ''}${b.levelsGained > 0 ? ` · +${b.levelsGained} Level` : ''} · ${new Date(b.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    `;
    list.appendChild(item);
  });
}

/* ============ LEADERBOARD MODAL ============ */
document.getElementById('btn-leaderboard').addEventListener('click', async () => {
  openModal('leaderboard-overlay');
  const list = document.getElementById('leaderboard-list');
  list.innerHTML = '<div class="list-empty">Memuat&hellip;</div>';
  try {
    const board = await api('/leaderboard');
    renderLeaderboard(board);
  } catch (err) {
    list.innerHTML = `<div class="list-empty">Gagal memuat papan peringkat: ${err.message}</div>`;
  }
});
document.getElementById('leaderboard-close').addEventListener('click', () => closeModal('leaderboard-overlay'));

function renderLeaderboard(board) {
  const summary = document.getElementById('leaderboard-summary');
  const list = document.getElementById('leaderboard-list');
  if (board.length === 0) {
    summary.innerHTML = '';
    list.innerHTML = '<div class="list-empty">Belum ada Pemburu di papan peringkat.<br>Jadilah yang pertama membuka Gerbang.</div>';
    return;
  }
  summary.innerHTML = `<div><strong>${board.length}</strong>Pemburu Tercatat</div>`;
  list.innerHTML = '';
  board.forEach((h, i) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.style.cursor = 'default';
    item.innerHTML = `
      <div class="list-rank-num">#${i + 1}</div>
      <div class="list-badge" style="--c:${h.rank.color}">${h.rank.code}</div>
      <div class="list-info">
        <div class="rn">${h.name} <span style="color:var(--text-muted)">— ${h.owner}</span></div>
        <div class="rm">Lv. ${h.level} · ${h.class.name} · ${h.element.name} · Skor ${h.power.toLocaleString('id-ID')}</div>
      </div>
    `;
    list.appendChild(item);
  });
}

function closeShopModal() {
  closeModal('shop-overlay');
  if (shopTimerInterval) { clearInterval(shopTimerInterval); shopTimerInterval = null; }
}

/* ============ GACHA ============ */
function setGachaError(msg) {
  document.getElementById('gacha-error').textContent = msg || '';
}

async function openGachaModal() {
  setGachaError('');
  document.getElementById('gacha-weapon-result').innerHTML = '';
  document.getElementById('gacha-skill-result').innerHTML = '';
  document.getElementById('gacha-cosmetic-result').innerHTML = '';
  document.getElementById('gacha-coins').textContent = (currentHunter ? currentHunter.coins || 0 : 0).toLocaleString('id-ID');
  openModal('gacha-overlay');
  if (currentHunter && currentHunter.pendingSkill) {
    renderPendingSkillChoice(currentHunter.pendingSkill, currentHunter.skills);
  }
}

document.getElementById('btn-gacha').addEventListener('click', openGachaModal);
document.getElementById('gacha-close').addEventListener('click', () => closeModal('gacha-overlay'));

document.getElementById('btn-pull-weapon').addEventListener('click', async () => {
  setGachaError('');
  try {
    const data = await api('/gacha/weapon', { method: 'POST', auth: true });
    currentHunter = data.hunter;
    document.getElementById('gacha-coins').textContent = currentHunter.coins.toLocaleString('id-ID');
    renderCharacter(currentHunter);
    const rarityColor = RARITY_COLOR[data.weapon.rarity] || 'var(--text-muted)';
    const host = document.getElementById('gacha-weapon-result');
    host.innerHTML = `
      <div class="gacha-reveal">
        <div class="icon">${data.weapon.icon}</div>
        <div class="info">
          <div class="n">${escapeHtml(data.weapon.name)}</div>
          <div class="r" style="color:${rarityColor}">${data.weapon.rarity} · +${data.weapon.amount} ${data.weapon.stat} · masuk ke Inventaris</div>
        </div>
      </div>
    `;
  } catch (err) {
    setGachaError(err.message);
  }
});

document.getElementById('btn-pull-skill').addEventListener('click', async () => {
  setGachaError('');
  try {
    const data = await api('/gacha/skill', { method: 'POST', auth: true });
    currentHunter = data.hunter;
    document.getElementById('gacha-coins').textContent = currentHunter.coins.toLocaleString('id-ID');
    renderPendingSkillChoice(data.skill, currentHunter.skills);
  } catch (err) {
    setGachaError(err.message);
  }
});

function renderPendingSkillChoice(skill, currentSkills) {
  const rarityColor = RARITY_COLOR[skill.rarity.name] || 'var(--text-muted)';
  const host = document.getElementById('gacha-skill-result');
  let choicesHtml = currentSkills.map((s, i) => `
    <button class="skill-slot-btn" data-assign-slot="${i}">
      <span>Ganti slot ${i + 1}: <b style="color:var(--text-primary)">${escapeHtml(s.name)}</b></span>
      <span style="color:${s.rarity.color}">${s.rarity.name}</span>
    </button>
  `).join('');

  host.innerHTML = `
    <div class="gacha-reveal" style="margin-bottom:10px;">
      <div class="icon">📖</div>
      <div class="info">
        <div class="n">${escapeHtml(skill.name)}</div>
        <div class="r" style="color:${rarityColor}">${skill.rarity.name}</div>
      </div>
    </div>
    <p class="hint" style="margin-bottom:4px;">Pilih skill mana yang mau digantikan:</p>
    <div class="skill-slot-choices">
      ${choicesHtml}
      <button class="skill-slot-btn" id="btn-discard-skill" style="color:var(--danger); text-align:center; justify-content:center;">Buang skill ini</button>
    </div>
  `;

  host.querySelectorAll('[data-assign-slot]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      setGachaError('');
      try {
        const data = await api('/gacha/skill/assign', { method: 'POST', auth: true, body: { slotIndex: Number(btn.dataset.assignSlot) } });
        currentHunter = data.hunter;
        renderCharacter(currentHunter);
        host.innerHTML = '<p class="hint">Skill baru terpasang.</p>';
      } catch (err) {
        setGachaError(err.message);
      }
    });
  });

  document.getElementById('btn-discard-skill').addEventListener('click', async () => {
    setGachaError('');
    try {
      const data = await api('/gacha/skill/discard', { method: 'POST', auth: true });
      currentHunter = data.hunter;
      host.innerHTML = '<p class="hint">Skill hasil gacha dibuang.</p>';
    } catch (err) {
      setGachaError(err.message);
    }
  });
}

// Cosmetic Gacha
document.getElementById('btn-pull-cosmetic').addEventListener('click', async () => {
  setGachaError('');
  try {
    const data = await api('/gacha/cosmetic', { method: 'POST', auth: true });
    currentHunter = data.hunter;
    document.getElementById('gacha-coins').textContent = currentHunter.coins.toLocaleString('id-ID');
    renderCharacter(currentHunter);

    const def = COSMETIC_DEFS.find((c) => c.id === data.cosmetic.id);
    const rarityColor = RARITY_COLOR[data.cosmetic.rarity] || 'var(--text-muted)';
    const host = document.getElementById('gacha-cosmetic-result');
    host.innerHTML = `
      <div class="gacha-reveal">
        <div class="icon">${def ? def.icon : '🎨'}</div>
        <div class="info">
          <div class="n">${escapeHtml(data.cosmetic.name)}</div>
          <div class="r" style="color:${rarityColor}">${data.cosmetic.rarity} · ${data.cosmetic.alreadyOwned ? 'Sudah dimiliki' : 'Baru didapat!'} · Bisa dipakai di Kosmetik</div>
        </div>
      </div>
    `;
  } catch (err) {
    setGachaError(err.message);
  }
});

/* ============ PROFILE / AVATAR ============ */
let currentAvatar = null;
let pendingAvatarDataUrl = null;

function updateNavAvatar(avatar) {
  currentAvatar = avatar;
  const img = document.getElementById('nav-avatar-img');
  const fallback = document.getElementById('nav-avatar-fallback');
  if (avatar) {
    img.src = avatar;
    img.classList.remove('hidden');
    fallback.classList.add('hidden');
  } else {
    img.classList.add('hidden');
    img.removeAttribute('src');
    fallback.classList.remove('hidden');
  }
}

async function refreshAvatar() {
  try {
    const me = await api('/auth/me', { auth: true });
    updateNavAvatar(me.avatar || null);
  } catch (err) { /* diamkan */ }
}

function resizeImageToDataUrl(img, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const minSide = Math.min(img.width, img.height);
  const sx = (img.width - minSide) / 2;
  const sy = (img.height - minSide) / 2;
  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.82);
}

document.getElementById('btn-profile').addEventListener('click', () => {
  document.getElementById('profile-error').textContent = '';
  pendingAvatarDataUrl = null;
  document.getElementById('btn-save-avatar').disabled = true;
  const img = document.getElementById('profile-preview-img');
  const fb = document.getElementById('profile-preview-fallback');
  if (currentAvatar) {
    img.src = currentAvatar; img.classList.remove('hidden'); fb.classList.add('hidden');
  } else {
    img.classList.add('hidden'); fb.classList.remove('hidden');
  }
  openModal('profile-overlay');
});
document.getElementById('profile-close').addEventListener('click', () => closeModal('profile-overlay'));

document.getElementById('profile-file-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const errEl = document.getElementById('profile-error');
  errEl.textContent = '';
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    errEl.textContent = 'Ukuran file terlalu besar (maks 8MB).';
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      pendingAvatarDataUrl = resizeImageToDataUrl(img, 160);
      const previewImg = document.getElementById('profile-preview-img');
      previewImg.src = pendingAvatarDataUrl;
      previewImg.classList.remove('hidden');
      document.getElementById('profile-preview-fallback').classList.add('hidden');
      document.getElementById('btn-save-avatar').disabled = false;
    };
    img.onerror = () => { errEl.textContent = 'Gagal membaca gambar. Coba file lain.'; };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

document.getElementById('btn-save-avatar').addEventListener('click', async () => {
  if (!pendingAvatarDataUrl) return;
  const errEl = document.getElementById('profile-error');
  errEl.textContent = '';
  try {
    const data = await api('/auth/avatar', { method: 'PUT', auth: true, body: { avatar: pendingAvatarDataUrl } });
    updateNavAvatar(data.avatar);
    pendingAvatarDataUrl = null;
    closeModal('profile-overlay');
  } catch (err) {
    errEl.textContent = err.message;
  }
});

document.getElementById('btn-remove-avatar').addEventListener('click', async () => {
  const errEl = document.getElementById('profile-error');
  errEl.textContent = '';
  try {
    await api('/auth/avatar', { method: 'PUT', auth: true, body: { avatar: null } });
    updateNavAvatar(null);
    pendingAvatarDataUrl = null;
    document.getElementById('profile-preview-img').classList.add('hidden');
    document.getElementById('profile-preview-fallback').classList.remove('hidden');
    document.getElementById('btn-save-avatar').disabled = true;
  } catch (err) {
    errEl.textContent = err.message;
  }
});

/* ============ PETS ============ */
async function openPetsModal() {
  document.getElementById('pets-error').textContent = '';
  document.getElementById('pet-flavor-msg').classList.add('hidden');
  openModal('pets-overlay');
  const listHost = document.getElementById('pets-list');
  listHost.className = '';
  listHost.innerHTML = '<div class="list-empty">Memuat&hellip;</div>';
  try {
    const data = await api('/pets/mine', { auth: true });
    renderPetsList(data.pets, data.activePetKey);
  } catch (err) {
    listHost.innerHTML = `<div class="list-empty">Gagal memuat peliharaan: ${escapeHtml(err.message)}</div>`;
  }
}

function renderPetsList(pets, activeKey) {
  const host = document.getElementById('pets-list');
  if (!pets || pets.length === 0) {
    host.className = '';
    host.innerHTML = '<div class="list-empty">Belum ada peliharaan.<br>Menangkan pertarungan di Gerbang untuk berpeluang mendapat peliharaan — makin tinggi wave/Boss, makin besar peluangnya.</div>';
    return;
  }
  host.className = 'pet-grid';
  host.innerHTML = '';
  pets.forEach((p) => {
    const isActive = p.key === activeKey;
    const rarityColor = RARITY_COLOR[p.rarity] || 'var(--text-muted)';
    const card = document.createElement('div');
    card.className = 'pet-card' + (isActive ? ' active' : '');
    card.innerHTML = `
      ${isActive ? '<span class="pet-active-badge">Aktif</span>' : ''}
      <div class="pet-icon">${p.icon}</div>
      <div class="pet-name">${escapeHtml(p.name)}</div>
      <div class="pet-rarity" style="color:${rarityColor}">${p.rarity}</div>
      <div class="pet-bonus">+${p.amount} ${p.stat}</div>
      <div class="pet-actions">
        <button class="mini-btn" data-act="${isActive ? 'deactivate' : 'activate'}" data-key="${p.key}">${isActive ? 'Nonaktifkan' : 'Jadikan Aktif'}</button>
        <button class="mini-btn" data-interact="${p.key}">Interaksi</button>
      </div>
    `;
    host.appendChild(card);
  });

  host.querySelectorAll('[data-act]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const activating = btn.dataset.act === 'activate';
      try {
        await api('/pets/activate', { method: 'POST', auth: true, body: { petKey: activating ? btn.dataset.key : null } });
        await refreshHunter();
        await openPetsModal();
      } catch (err) {
        document.getElementById('pets-error').textContent = err.message;
      }
    });
  });

  host.querySelectorAll('[data-interact]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        const res = await api('/pets/interact', { method: 'POST', auth: true, body: { petKey: btn.dataset.interact } });
        const msgEl = document.getElementById('pet-flavor-msg');
        msgEl.textContent = res.message;
        msgEl.classList.remove('hidden');
      } catch (err) {
        document.getElementById('pets-error').textContent = err.message;
      }
    });
  });
}

document.getElementById('btn-pets').addEventListener('click', openPetsModal);
document.getElementById('pets-close').addEventListener('click', () => closeModal('pets-overlay'));

/* ============ MODAL CLOSE HELPERS ============ */
['roster-overlay', 'leaderboard-overlay', 'inventory-overlay', 'pets-overlay', 'profile-overlay', 'gacha-overlay', 'cosmetics-overlay'].forEach((id) => {
  document.getElementById(id).addEventListener('click', (e) => {
    if (e.target.id === id) closeModal(id);
  });
});
document.getElementById('shop-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'shop-overlay') closeShopModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal('roster-overlay'); closeModal('leaderboard-overlay'); closeModal('inventory-overlay');
    closeModal('pets-overlay'); closeModal('profile-overlay'); closeModal('gacha-overlay');
    closeModal('cosmetics-overlay'); closeShopModal();
    document.getElementById('settings-overlay').classList.add('hidden');
  }
});

/* ============ BOOT ============ */
// Always start at main menu
showMainMenu();
spawnEmbers();

})();
