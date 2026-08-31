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

/* ================================================================
   PIXEL ART CHARACTER SYSTEM — CUSTOMIZABLE
   ================================================================ */
// Color slots: k=skin h=hair s=shirt p=pants o=shoes e=eye m=mouth
// Each sprite part is 16x16. ' ' = transparent. Letters = color slot.

// ----- DEFAULT CHARACTER DATA -----
const DEFAULT_CHAR_DATA = {
  gender: 'male',
  hairStyle: 0,     // 0-4
  eyeStyle: 0,      // 0-2
  mouthStyle: 0,    // 0-2
  hairColor: '#5a3825',
  skinColor: '#f5c49c',
  eyeColor: '#1a1a2e',
  shirtColor: '#2d7a3a',
  pantsColor: '#2a4a8a',
  shoeColor: '#4a3728',
  shirtStyle: 0,    // 0-3
  pantsStyle: 0,    // 0-2
  shoeStyle: 0,     // 0-2
  headAccessory: -1, // -1=none, 0-4
};

// ----- SKIN COLOR PALETTE -----
const SKIN_COLORS = [
  { name: 'Putih', color: '#fce4c8' },
  { name: 'Kuning', color: '#f5c49c' },
  { name: 'Sawo Matang', color: '#d49670' },
  { name: 'Cokelat', color: '#b07050' },
  { name: 'Gelap', color: '#8b5e3c' },
];

// ----- HAIR COLOR PALETTE -----
const HAIR_COLORS = [
  { name: 'Hitam', color: '#1a1a1a' },
  { name: 'Cokelat', color: '#5a3825' },
  { name: 'Pirang', color: '#d4a050' },
  { name: 'Merah', color: '#b03030' },
  { name: 'Pink', color: '#c05080' },
  { name: 'Biru', color: '#3060b0' },
  { name: 'Ungu', color: '#7040a0' },
  { name: 'Hijau', color: '#308040' },
  { name: 'Putih', color: '#e0e0e0' },
  { name: 'Oranye', color: '#d07020' },
];

// ----- BASE BODY (skin layer) -----
// Only skin pixels - hair/eyes/mouth/clothes go on top
const BASE_BODY_MALE = [
  '                ',
  '                ',
  '                ',
  '                ',
  '      kkkk      ',
  '      kkkk      ',
  '     kkkkkk     ',
  '      kkkk      ',
  '      kkkk      ',
  '       kk       ',
  '     ssssss     ',
  '   s ssssss s   ',
  '   s ssssss s   ',
  '   s ssssss s   ',
  '      pppp      ',
  '      pppp      ',
];

const BASE_BODY_FEMALE = [
  '                ',
  '                ',
  '                ',
  '                ',
  '      kkkk      ',
  '      kkkk      ',
  '     kkkkkk     ',
  '      kkkk      ',
  '      kkkk      ',
  '       kk       ',
  '     ssssss     ',
  '   s ssssss s   ',
  '   s ssssss s   ',
  '   s ssssss s   ',
  '       pp       ',
  '      pppp      ',
];

// ----- HAIR STYLES -----
const HAIR_STYLES_MALE = [
  // 0: Short crop
  [
    '                ',
    '                ',
    '                ',
    '     hhhhhh     ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '     hhhhhh     ',
    '     h  hhh     ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
  // 1: Spiky
  [
    '                ',
    '                ',
    '       hh       ',
    '   h hh   hh h  ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '     hhhhhh     ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
  // 2: Long flowing
  [
    '                ',
    '                ',
    '                ',
    '     hhhhhh     ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '     hhhhhh     ',
    '     hhhh h     ',
    '     hhhh       ',
    '     hhhh       ',
    '     hhhh       ',
    '      hh        ',
    '                ',
    '                ',
    '                ',
  ],
  // 3: Mohawk
  [
    '                ',
    '                ',
    '       hh       ',
    '       hh       ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '     hhhhhh     ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
  // 4: Buzz cut
  [
    '                ',
    '                ',
    '                ',
    '     hhhhhh     ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '     hhhhhh     ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
];

const HAIR_STYLES_FEMALE = [
  // 0: Long straight
  [
    '                ',
    '                ',
    '                ',
    '     hhhhhh     ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '     hhhhhh     ',
    '     hhhh       ',
    '     hhhh       ',
    '     hhhh       ',
    '     hhhh       ',
    '     hhhh       ',
    '      hh        ',
    '                ',
    '                ',
  ],
  // 1: Ponytail
  [
    '                ',
    '                ',
    '                ',
    '     hhhhhh     ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '     hhhhhh     ',
    '     hhhh       ',
    '       hhhh     ',
    '        hhhh    ',
    '         hhh    ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
  // 2: Twin tails
  [
    '                ',
    '                ',
    '                ',
    '     hhhhhh     ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '     hhhhhh     ',
    '    hh    hh    ',
    '    hh    hh    ',
    '    hh    hh    ',
    '    hh    hh    ',
    '     h    h     ',
    '                ',
    '                ',
    '                ',
  ],
  // 3: Bob
  [
    '                ',
    '                ',
    '                ',
    '     hhhhhh     ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '     hhhhhh     ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
  // 4: Curly
  [
    '                ',
    '                ',
    '     hh  hh     ',
    '    hhhhhhhh    ',
    '   hhhhhhhhhh   ',
    '    hhhhhhhh    ',
    '    hhhhhhhh    ',
    '     hhhhhh     ',
    '     hhhh       ',
    '     hhhh       ',
    '      hh        ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
];

// ----- EYE STYLES -----
const EYE_STYLES = [
  // 0: Normal
  [
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '   eek  eek    ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
  // 1: Angry
  [
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '   ee   ee     ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
  // 2: Cute (big)
  [
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '  eekk eekk    ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
];

// ----- MOUTH STYLES -----
const MOUTH_STYLES = [
  // 0: Smile
  [
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '    mm          ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
  // 1: Neutral
  [
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '    mmmm        ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
  // 2: Open (surprised)
  [
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '    mmmm        ',
    '    mmmm        ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
];

// ----- SHIRT STYLES -----
const SHIRT_STYLES = [
  // 0: T-shirt
  [
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '     ssssss     ',
    '   s ssssss s   ',
    '   s ssssss s   ',
    '   s ssssss s   ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
  // 1: Armor
  [
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '    ssssssss    ',
    '   ssssssssss   ',
    '   ssssssssss   ',
    '   ssssssssss   ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
  // 2: Robe
  [
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '     ssssss     ',
    '    ssssssss    ',
    '   ssssssssss   ',
    '   ssssssssss   ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
  // 3: Vest
  [
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '     ssssss     ',
    '   s ssssss s   ',
    '     ssssss     ',
    '     ssssss     ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
];

// ----- PANTS STYLES -----
const PANTS_STYLES = [
  // 0: Long pants
  [
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
    '                ',
    '                ',
    '                ',
    '      pppp      ',
    '      p  p      ',
    '      p  p      ',
  ],
  // 1: Shorts
  [
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
    '                ',
    '                ',
    '                ',
    '      pppp      ',
    '                ',
    '                ',
  ],
  // 2: Skirt
  [
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
    '                ',
    '                ',
    '                ',
    '      pppp      ',
    '     pppppp     ',
    '                ',
  ],
];

// ----- SHOE STYLES -----
const SHOE_STYLES = [
  // 0: Boots
  [
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
    '                ',
    '                ',
    '                ',
    '                ',
    '      oo        ',
    '      oo        ',
  ],
  // 1: Sandals
  [
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
    '                ',
    '                ',
    '                ',
    '                ',
    '     o  o       ',
    '                ',
  ],
  // 2: Heavy boots
  [
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
    '                ',
    '                ',
    '                ',
    '                ',
    '     oo         ',
    '    oooo        ',
  ],
];

// ----- HEAD ACCESSORIES -----
const HEAD_ACCESSORIES = [
  // 0: Crown
  [
    '                ',
    '                ',
    '     o o o      ',
    '    oooooooo    ',
    '    oodeeddo    ',
    '    oooooooo    ',
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
  // 1: Halo
  [
    '                ',
    '                ',
    '     oooooo     ',
    '    o      o    ',
    '    o      o    ',
    '     oooooo     ',
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
  // 2: Horns
  [
    '                ',
    '                ',
    '  oo        oo  ',
    '   oo      oo   ',
    '    oooooooo    ',
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
    '                ',
  ],
  // 3: Headband
  [
    '                ',
    '                ',
    '                ',
    '   oooooooooo   ',
    '   oodeeddo     ',
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
    '                ',
  ],
  // 4: Tiara
  [
    '                ',
    '                ',
    '       oo       ',
    '      oooo      ',
    '   oooooooooo   ',
    '    oodeeddo    ',
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
];

// ----- COMPOSE CHARACTER SPRITE -----
function composeCharacter(charData, width, height) {
  width = width || 16;
  height = height || 16;
  const gender = charData.gender || 'male';

  // Color map
  const colorMap = {
    k: charData.skinColor || '#f5c49c',
    h: charData.hairColor || '#5a3825',
    e: charData.eyeColor || '#1a1a2e',
    m: '#cc6060',
    s: charData.shirtColor || '#2d7a3a',
    p: charData.pantsColor || '#2a4a8a',
    o: charData.shoeColor || '#4a3728',
    d: '#ffdd44',
  };

  // Start with base body
  const base = gender === 'female' ? BASE_BODY_FEMALE : BASE_BODY_MALE;
  const grid = base.map((row) => [...row]);

  // Layer: Hair
  const hairStyles = gender === 'female' ? HAIR_STYLES_FEMALE : HAIR_STYLES_MALE;
  const hairIdx = Math.min(charData.hairStyle || 0, hairStyles.length - 1);
  const hair = hairStyles[hairIdx];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = (hair[y] || '')[x] || ' ';
      if (ch !== ' ') grid[y][x] = ch;
    }
  }

  // Layer: Eyes
  const eyeIdx = Math.min(charData.eyeStyle || 0, EYE_STYLES.length - 1);
  const eyes = EYE_STYLES[eyeIdx];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = (eyes[y] || '')[x] || ' ';
      if (ch !== ' ') grid[y][x] = ch;
    }
  }

  // Layer: Mouth
  const mouthIdx = Math.min(charData.mouthStyle || 0, MOUTH_STYLES.length - 1);
  const mouth = MOUTH_STYLES[mouthIdx];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = (mouth[y] || '')[x] || ' ';
      if (ch !== ' ') grid[y][x] = ch;
    }
  }

  // Layer: Shirt
  const shirtIdx = Math.min(charData.shirtStyle || 0, SHIRT_STYLES.length - 1);
  const shirt = SHIRT_STYLES[shirtIdx];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = (shirt[y] || '')[x] || ' ';
      if (ch !== ' ') grid[y][x] = ch;
    }
  }

  // Layer: Pants
  const pantsIdx = Math.min(charData.pantsStyle || 0, PANTS_STYLES.length - 1);
  const pants = PANTS_STYLES[pantsIdx];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = (pants[y] || '')[x] || ' ';
      if (ch !== ' ') grid[y][x] = ch;
    }
  }

  // Layer: Shoes
  const shoeIdx = Math.min(charData.shoeStyle || 0, SHOE_STYLES.length - 1);
  const shoes = SHOE_STYLES[shoeIdx];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = (shoes[y] || '')[x] || ' ';
      if (ch !== ' ') grid[y][x] = ch;
    }
  }

  // Layer: Head accessory
  const headIdx = charData.headAccessory;
  if (headIdx >= 0 && headIdx < HEAD_ACCESSORIES.length) {
    const acc = HEAD_ACCESSORIES[headIdx];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const ch = (acc[y] || '')[x] || ' ';
        if (ch !== ' ') grid[y][x] = ch;
      }
    }
  }

  return { grid, colorMap };
}

function renderCharacterToCanvas(canvas, charData) {
  const { grid, colorMap } = composeCharacter(charData);
  const ctx = canvas.getContext('2d');
  canvas.width = 16;
  canvas.height = 16;
  ctx.clearRect(0, 0, 16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = grid[y][x];
      if (ch === ' ') continue;
      const color = colorMap[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function getCharDataFromHunter(hunter) {
  if (hunter && hunter.characterData) return { ...DEFAULT_CHAR_DATA, ...hunter.characterData };
  const saved = localStorage.getItem('ga_char_data');
  if (saved) {
    try { return { ...DEFAULT_CHAR_DATA, ...JSON.parse(saved) }; } catch (e) {}
  }
  return { ...DEFAULT_CHAR_DATA, gender: hunter?.gender || localStorage.getItem('ga_gender') || 'male' };
}

/* ================================================================
   BATTLE ANIMATION STATE
   ================================================================ */
let battleAnim = {
  hunterX: 0, hunterY: 0,
  monsterX: 0, monsterY: 0,
  hunterBaseX: 100, monsterBaseX: 0,
  hunterBaseY: 0, monsterBaseY: 0,
  damageNumbers: [],
  hunterFlash: 0, monsterShake: 0, monsterFlash: 0,
  hunterAttackT: 0, attackActive: false,
  particles: [], flashOverlay: 0, flashColor: '#ffffff',
};
let battleAnimFrame = null;

/* ================================================================
   COSMETIC SYSTEM
   ================================================================ */
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

/* ================================================================
   API HELPER
   ================================================================ */
async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) { const err = new Error((data && data.error) || 'Terjadi kesalahan.'); err.status = res.status; throw err; }
  return data;
}

/* ================================================================
   EMBER PARTICLES
   ================================================================ */
function spawnEmbers() {
  const host = document.getElementById('embers');
  if (!host) return;
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

/* ================================================================
   THEME SYSTEM
   ================================================================ */
function getTheme() { return localStorage.getItem('ga_theme') || 'dark'; }
function setTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('ga_theme', theme);
  document.querySelectorAll('.theme-opt').forEach((btn) => { btn.classList.toggle('active', btn.dataset.theme === theme); });
}
setTheme(getTheme());
document.getElementById('btn-settings-main')?.addEventListener('click', () => { document.getElementById('settings-overlay').classList.remove('hidden'); });
document.getElementById('btn-settings-nav')?.addEventListener('click', () => { document.getElementById('settings-overlay').classList.remove('hidden'); });
document.getElementById('btn-settings-close')?.addEventListener('click', () => { document.getElementById('settings-overlay').classList.add('hidden'); });
document.querySelectorAll('.theme-opt').forEach((btn) => { btn.addEventListener('click', () => setTheme(btn.dataset.theme)); });

/* ================================================================
   MAIN MENU & SCREEN MANAGEMENT
   ================================================================ */
const $ = (id) => document.getElementById(id);
const mainMenu = $('main-menu');
const authScreen = $('auth-screen');
const creationScreen = $('creation-screen');
const appEl = $('app');
const appHeader = $('app-header');
const navLoggedIn = $('nav-loggedin');
const navUsername = $('nav-username');

function showMainMenu() { mainMenu?.classList.remove('hidden'); authScreen?.classList.add('hidden'); creationScreen?.classList.add('hidden'); appEl?.classList.add('hidden'); appHeader?.classList.add('hidden'); }
function showAuth() { mainMenu?.classList.add('hidden'); authScreen?.classList.remove('hidden'); creationScreen?.classList.add('hidden'); appEl?.classList.add('hidden'); appHeader?.classList.remove('hidden'); }
function showCreation() { mainMenu?.classList.add('hidden'); authScreen?.classList.add('hidden'); creationScreen?.classList.remove('hidden'); appEl?.classList.add('hidden'); appHeader?.classList.remove('hidden'); renderCreationPreview(); }

// Start Game
$('btn-start-game')?.addEventListener('click', () => { if (TOKEN) bootAuth(); else showAuth(); });
$('btn-exit-web')?.addEventListener('click', () => { if (confirm('Yakin ingin keluar?')) { window.close(); document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:monospace;color:#888;">Terima kasih!</div>'; } });

/* ================================================================
   AUTH SCREEN
   ================================================================ */
document.querySelectorAll('.auth-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    $('form-login').classList.toggle('hidden', target !== 'login');
    $('form-register').classList.toggle('hidden', target !== 'register');
  });
});

async function showApp() {
  authScreen?.classList.add('hidden');
  creationScreen?.classList.add('hidden');
  appHeader?.classList.remove('hidden');
  navLoggedIn?.classList.remove('hidden');
  navUsername.textContent = USERNAME;
  loadOdds();
  await Promise.all([refreshHunter(), refreshAvatar()]);
}

$('form-login')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = $('login-error'); errEl.textContent = '';
  const username = $('login-username').value.trim();
  const password = $('login-password').value;
  try { const data = await api('/auth/login', { method: 'POST', body: { username, password } }); TOKEN = data.token; USERNAME = data.username; localStorage.setItem('ga_token', TOKEN); localStorage.setItem('ga_username', USERNAME); await showApp(); }
  catch (err) { errEl.textContent = err.message; }
});

$('form-register')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = $('register-error'); errEl.textContent = '';
  const username = $('reg-username').value.trim();
  const password = $('reg-password').value;
  try { const data = await api('/auth/register', { method: 'POST', body: { username, password } }); TOKEN = data.token; USERNAME = data.username; localStorage.setItem('ga_token', TOKEN); localStorage.setItem('ga_username', USERNAME); await showApp(); }
  catch (err) { errEl.textContent = err.message; }
});

$('btn-logout')?.addEventListener('click', () => {
  TOKEN = null; USERNAME = null; currentHunter = null; activeBattle = null;
  localStorage.removeItem('ga_token'); localStorage.removeItem('ga_username');
  $('battle-result')?.classList.remove('show');
  navLoggedIn?.classList.add('hidden');
  showMainMenu();
});

$('btn-back-to-login')?.addEventListener('click', () => showAuth());

async function bootAuth() {
  if (!TOKEN) { showAuth(); return; }
  try { const me = await api('/auth/me', { auth: true }); USERNAME = me.username; localStorage.setItem('ga_username', USERNAME); await showApp(); }
  catch (err) { TOKEN = null; USERNAME = null; localStorage.removeItem('ga_token'); localStorage.removeItem('ga_username'); showAuth(); }
}

/* ================================================================
   CHARACTER CREATION — FULL CUSTOMIZATION
   ================================================================ */
let charCreationData = { ...DEFAULT_CHAR_DATA };

function renderCreationPreview() {
  const gender = charCreationData.gender;
  charCreationData.gender = gender;
  const canvas = $('preview-character');
  if (canvas) renderCharacterToCanvas(canvas, charCreationData);
  // Update option labels
  updateCreationLabels();
}

function updateCreationLabels() {
  const g = charCreationData;
  const hairStyles = g.gender === 'female' ? ['Panjang', 'Ponytail', 'Twintail', 'Bob', 'Curly'] : ['Pendek', 'Spiky', 'Panjang', 'Mohawk', 'Buzz'];
  const setText = (id, txt) => { const el = $(id); if (el) el.textContent = txt; };
  setText('opt-hair-style', hairStyles[g.hairStyle % hairStyles.length]);
  setText('opt-eye-style', ['Normal', 'Marah', 'Lucu'][g.eyeStyle % 3]);
  setText('opt-mouth-style', ['Senyum', 'Netral', 'Kaget'][g.mouthStyle % 3]);
  setText('opt-hair-color', g.hairColor);
  setText('opt-skin-color', SKIN_COLORS.find((c) => c.color === g.skinColor)?.name || 'Custom');
  setText('opt-shirt-style', ['Kaos', 'Zirah', 'Jubah', 'Vest'][g.shirtStyle % 4]);
  setText('opt-pants-style', ['Panjang', 'Pendek', 'Rok'][g.pantsStyle % 3]);
  setText('opt-shoe-style', ['Boots', 'Sandal', 'Heavy'][g.shoeStyle % 3]);
  setText('opt-head-style', g.headAccessory < 0 ? 'Tidak Ada' : ['Mahkota', 'Halo', 'Tanduk', 'Headband', 'Tiara'][g.headAccessory % 5]);
  // Color swatches
  const hairSwatch = $('swatch-hair'); if (hairSwatch) hairSwatch.style.background = g.hairColor;
  const skinSwatch = $('swatch-skin'); if (skinSwatch) skinSwatch.style.background = g.skinColor;
  const shirtSwatch = $('swatch-shirt'); if (shirtSwatch) shirtSwatch.style.background = g.shirtColor;
  const pantsSwatch = $('swatch-pants'); if (pantsSwatch) pantsSwatch.style.background = g.pantsColor;
  const shoeSwatch = $('swatch-shoe'); if (shoeSwatch) shoeSwatch.style.background = g.shoeColor;
}

// Creation option cycle buttons
document.querySelectorAll('.creation-opt-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const field = btn.dataset.field;
    const dir = parseInt(btn.dataset.dir) || 1;
    const g = charCreationData;

    if (field === 'gender') {
      g.gender = g.gender === 'male' ? 'female' : 'male';
      selectedGender = g.gender;
    } else if (field === 'hairStyle') {
      const max = g.gender === 'female' ? HAIR_STYLES_FEMALE.length : HAIR_STYLES_MALE.length;
      g.hairStyle = ((g.hairStyle + dir) % max + max) % max;
    } else if (field === 'eyeStyle') {
      g.eyeStyle = ((g.eyeStyle + dir) % EYE_STYLES.length + EYE_STYLES.length) % EYE_STYLES.length;
    } else if (field === 'mouthStyle') {
      g.mouthStyle = ((g.mouthStyle + dir) % MOUTH_STYLES.length + MOUTH_STYLES.length) % MOUTH_STYLES.length;
    } else if (field === 'hairColor') {
      const idx = HAIR_COLORS.findIndex((c) => c.color === g.hairColor);
      const next = ((idx + dir) % HAIR_COLORS.length + HAIR_COLORS.length) % HAIR_COLORS.length;
      g.hairColor = HAIR_COLORS[next].color;
    } else if (field === 'skinColor') {
      const idx = SKIN_COLORS.findIndex((c) => c.color === g.skinColor);
      const next = ((idx + dir) % SKIN_COLORS.length + SKIN_COLORS.length) % SKIN_COLORS.length;
      g.skinColor = SKIN_COLORS[next].color;
    } else if (field === 'shirtStyle') {
      g.shirtStyle = ((g.shirtStyle + dir) % SHIRT_STYLES.length + SHIRT_STYLES.length) % SHIRT_STYLES.length;
    } else if (field === 'shirtColor') {
      const colors = ['#2d7a3a', '#8b2252', '#1a1a8a', '#8a3a1a', '#4a1a6a', '#1a6a6a', '#6a6a1a', '#aa2222'];
      const idx = colors.indexOf(g.shirtColor);
      const next = ((idx + dir) % colors.length + colors.length) % colors.length;
      g.shirtColor = colors[next];
    } else if (field === 'pantsStyle') {
      g.pantsStyle = ((g.pantsStyle + dir) % PANTS_STYLES.length + PANTS_STYLES.length) % PANTS_STYLES.length;
    } else if (field === 'pantsColor') {
      const colors = ['#2a4a8a', '#1a1a1a', '#4a4a4a', '#8a2a2a', '#2a6a2a', '#6a4a2a'];
      const idx = colors.indexOf(g.pantsColor);
      const next = ((idx + dir) % colors.length + colors.length) % colors.length;
      g.pantsColor = colors[next];
    } else if (field === 'shoeStyle') {
      g.shoeStyle = ((g.shoeStyle + dir) % SHOE_STYLES.length + SHOE_STYLES.length) % SHOE_STYLES.length;
    } else if (field === 'shoeColor') {
      const colors = ['#4a3728', '#1a1a1a', '#3a3a3a', '#6a3a1a', '#2a2a5a'];
      const idx = colors.indexOf(g.shoeColor);
      const next = ((idx + dir) % colors.length + colors.length) % colors.length;
      g.shoeColor = colors[next];
    } else if (field === 'headAccessory') {
      g.headAccessory = ((g.headAccessory + 1 + 1) % (HEAD_ACCESSORIES.length + 1)) - 1;
    }
    renderCreationPreview();
  });
});

// Create character button
$('btn-create-character')?.addEventListener('click', async () => {
  const errEl = $('creation-error'); errEl.textContent = '';
  const nameInput = $('creation-name-input');
  const name = nameInput ? nameInput.value.trim() : '';
  selectedGender = charCreationData.gender;
  localStorage.setItem('ga_gender', selectedGender);
  localStorage.setItem('ga_char_data', JSON.stringify(charCreationData));

  try {
    const hunter = await api('/hunters/awaken', { method: 'POST', auth: true, body: { name: name || undefined, gender: selectedGender, characterData: charCreationData } });
    currentHunter = hunter;
    await showApp();
  } catch (err) { errEl.textContent = err.message; }
});

/* ================================================================
   HUNTER STATE
   ================================================================ */
async function refreshHunter() {
  try { currentHunter = await api('/hunters/mine', { auth: true }); } catch (err) { currentHunter = null; }
  applyHunterState();
  if (currentHunter) await checkActiveBattle();
}

async function refreshHunterQuiet() {
  try { currentHunter = await api('/hunters/mine', { auth: true }); if (currentHunter) renderCharacter(currentHunter); } catch (err) {}
}

function applyHunterState() {
  if (!currentHunter) { showCreation(); return; }
  appEl?.classList.remove('hidden');
  $('fight-controls')?.classList.remove('hidden');
  $('character-section')?.classList.remove('hidden');
  $('hero-eyebrow').textContent = '— Gerbang Menanti —';
  $('hero-title').innerHTML = `Selamat datang kembali,<br><em>${escapeHtml(currentHunter.name)}</em>`;
  $('hero-sub').textContent = 'Pilih peringkat Gerbang, hadapi monsternya, dan kumpulkan XP.';
  $('gate-label').textContent = `Peringkat: ${currentHunter.rank.code}`;
  populateGateSelect(currentHunter);
  renderCharacter(currentHunter);
}

function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

/* ================================================================
   ODDS & GATE SELECT
   ================================================================ */
let RANK_LIST = [];
async function loadOdds() {
  try { const data = await api('/odds'); renderOdds(data.ranks, data.elements); populateGateSelectRanks(data.ranks); } catch (err) {}
}
function populateGateSelectRanks(ranks) { RANK_LIST = ranks; if (currentHunter) populateGateSelect(currentHunter); }
function populateGateSelect(hunter) {
  const sel = $('gate-rank-select'); if (!sel || RANK_LIST.length === 0 || !hunter) return;
  const prevValue = sel.value; sel.innerHTML = '';
  let best = null;
  RANK_LIST.forEach((r) => {
    const locked = hunter.level < r.unlockLevel;
    const opt = document.createElement('option'); opt.value = r.code; opt.disabled = locked;
    opt.textContent = locked ? `🔒 Peringkat ${r.code} (Lv.${r.unlockLevel})` : `Gerbang Peringkat ${r.code}`;
    sel.appendChild(opt); if (!locked) best = r.code;
  });
  sel.value = RANK_LIST.some((r) => r.code === prevValue && hunter.level >= r.unlockLevel) ? prevValue : (best || RANK_LIST[0].code);
  const hint = $('gate-lock-hint');
  if (hunter.nextGateUnlock) { hint.textContent = `🔒 Gerbang ${hunter.nextGateUnlock.code} terbuka di Lv.${hunter.nextGateUnlock.level}`; hint.classList.remove('hidden'); }
  else { hint.classList.add('hidden'); }
}
function renderOdds(ranks, elements) {
  const totalR = ranks.reduce((s, r) => s + r.weight, 0);
  const totalE = elements.reduce((s, r) => s + r.weight, 0);
  const panel = $('odds-panel');
  let html = '<h4>Peluang Peringkat</h4>';
  ranks.forEach((r) => { const pct = (r.weight / totalR) * 100; html += `<div class="odds-row"><div class="odds-badge" style="border:1px solid ${r.color};color:${r.color}">${r.code}</div><div class="odds-bar"><div class="odds-fill" style="width:${Math.max(pct,0.4)}%;background:${r.color}"></div></div><div class="odds-pct">${pct<1?pct.toFixed(2):pct.toFixed(1)}%</div></div>`; });
  html += '<h4 style="margin-top:16px">Peluang Elemen</h4>';
  elements.forEach((el) => { const pct = (el.weight / totalE) * 100; html += `<div class="odds-row"><div class="odds-badge" style="border:1px solid ${el.color};color:${el.color};font-size:14px">${el.icon}</div><div class="odds-bar"><div class="odds-fill" style="width:${pct}%;background:${el.color}"></div></div><div class="odds-pct">${pct.toFixed(1)}%</div></div>`; });
  panel.innerHTML = html;
}
$('odds-toggle')?.addEventListener('click', (e) => { const panel = $('odds-panel'); const open = panel.classList.toggle('open'); e.target.setAttribute('aria-expanded', open); e.target.textContent = open ? 'Sembunyikan peluang ↑' : 'Lihat peluang peringkat & elemen awakening ↓'; });

/* ================================================================
   SYSTEM LOG & SLEEP
   ================================================================ */
function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }
function addLogLine(text, cls = '') { const log = $('syslog'); const p = document.createElement('p'); if (cls) p.className = cls; p.innerHTML = text; log.appendChild(p); return p; }

/* ================================================================
   FIGHT FLOW
   ================================================================ */
$('btn-fight')?.addEventListener('click', async () => {
  const gateRank = $('gate-rank-select').value;
  const btn = $('btn-fight'); btn.disabled = true; btn.textContent = 'Gerbang Terbuka…';
  $('syslog').innerHTML = '';
  const stage = $('gate-stage'); stage.classList.add('charging');
  try {
    addLogLine(`[SISTEM] Memasuki Gerbang Peringkat ${gateRank}&hellip;`); await sleep(700);
    addLogLine('[SISTEM] Anomali terdeteksi&hellip;', 'dim'); await sleep(700);
    const state = await api('/gate/enter', { method: 'POST', auth: true, body: { gateRank } });
    stage.classList.remove('charging'); stage.classList.add('burst'); await sleep(150);
    addLogLine(`[SISTEM] ${state.monster.icon} ${state.monster.name} muncul!`); stage.classList.remove('burst'); await sleep(400);
    enterBattleArena(state, true);
    $('battle-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) { stage.classList.remove('charging'); stage.classList.remove('burst'); addLogLine(`[SISTEM] ${err.message}`, 'dim'); }
  btn.disabled = false; btn.textContent = 'Masuki Gerbang';
});

async function checkActiveBattle() {
  try { const state = await api('/gate/active', { auth: true }); if (state) { enterBattleArena(state, false); addLogLine('[SISTEM] Melanjutkan pertarungan&hellip;', 'dim'); $('battle-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } } catch (err) {}
}

/* ================================================================
   BATTLE ARENA
   ================================================================ */
function resetBattleLogDisplay() { $('battle-log').innerHTML = ''; shownLogCount = 0; }
async function revealNewLogLines(state, animate) {
  const host = $('battle-log');
  const newLines = state.log.slice(shownLogCount);
  for (const line of newLines) { const p = document.createElement('p'); p.textContent = line; host.appendChild(p); host.scrollTop = host.scrollHeight; if (animate) await sleep(260); }
  shownLogCount = state.log.length;
}
function addBattleErrorLine(text) { const host = $('battle-log'); const p = document.createElement('p'); p.textContent = text; p.style.color = 'var(--danger)'; host.appendChild(p); host.scrollTop = host.scrollHeight; }
function renderWaveClearNotice(wc) {
  const host = $('battle-log'); const p = document.createElement('p');
  p.style.color = wc.isBoss ? 'var(--gold)' : '#34d399'; p.style.fontWeight = '700';
  const parts = [`✓ Wave ${wc.wave} bersih! +${wc.xpGained} XP · 🪙 +${wc.coinsGained}`];
  if (wc.itemDrop) parts.push(`🎁 ${wc.itemDrop.icon} ${wc.itemDrop.name}`);
  if (wc.petDrop) parts.push(wc.petDrop.alreadyOwned ? `(sudah dimiliki)` : `🐾 ${wc.petDrop.icon} ${wc.petDrop.name}!`);
  p.textContent = parts.join(' · '); host.appendChild(p); host.scrollTop = host.scrollHeight;
}

function startBattleLoop() {
  if (battleAnimFrame) cancelAnimationFrame(battleAnimFrame);
  const loop = () => { if (activeBattle && !activeBattle.over) { renderBattleCanvas(activeBattle); battleAnimFrame = requestAnimationFrame(loop); } };
  battleAnimFrame = requestAnimationFrame(loop);
}
function stopBattleLoop() { if (battleAnimFrame) { cancelAnimationFrame(battleAnimFrame); battleAnimFrame = null; } }

function enterBattleArena(state, isFresh) {
  activeBattle = state; resetBattleLogDisplay();
  ['battle-banner', 'battle-xp', 'item-drop-banner', 'levelup-banner', 'battle-continue-row'].forEach((id) => $(id)?.classList.add('hidden'));
  $('battle-actions')?.classList.remove('hidden'); hideSubmenus();
  $('battle-result')?.classList.add('show');
  renderBattleArena(state); renderBattleCanvas(state); startBattleLoop();
  if (state.over) { setBattleActionsEnabled(false); revealNewLogLines(state, isFresh).then(() => showBattleOutcome(state)); return; }
  battleBusy = true; setBattleActionsEnabled(false);
  revealNewLogLines(state, isFresh).then(() => { battleBusy = false; if (activeBattle && !activeBattle.over) setBattleActionsEnabled(true); });
}

function setBattleActionsEnabled(enabled) { ['act-attack', 'act-skill-toggle', 'act-item-toggle', 'act-flee'].forEach((id) => { if ($(id)) $(id).disabled = !enabled; }); }
function hideSubmenus() { $('skill-menu')?.classList.add('hidden'); $('item-menu')?.classList.add('hidden'); $('act-skill-toggle')?.classList.remove('active'); $('act-item-toggle')?.classList.remove('active'); }
function toggleSubmenu(menuId, btnId) { const menu = $(menuId); const wasOpen = !menu.classList.contains('hidden'); hideSubmenus(); if (wasOpen) return; menu.classList.remove('hidden'); $(btnId).classList.add('active'); if (menuId === 'skill-menu') renderSkillMenu(activeBattle); if (menuId === 'item-menu') loadInventoryForBattleMenu(); }

$('act-attack')?.addEventListener('click', () => sendBattleAction('attack'));
$('act-flee')?.addEventListener('click', () => sendBattleAction('flee'));
$('act-skill-toggle')?.addEventListener('click', () => toggleSubmenu('skill-menu', 'act-skill-toggle'));
$('act-item-toggle')?.addEventListener('click', () => toggleSubmenu('item-menu', 'act-item-toggle'));

function renderSkillMenu(state) {
  const host = $('skill-menu'); host.innerHTML = '';
  state.skills.forEach((sk, i) => {
    const btn = document.createElement('button'); btn.className = 'submenu-item'; btn.disabled = sk.cooldown > 0;
    btn.innerHTML = `<span class="si-icon">✨</span><span class="si-info"><span class="si-name">${escapeHtml(sk.name)} <span style="color:${sk.rarity.color};font-size:9px">${sk.rarity.name}</span></span><span class="si-desc">${escapeHtml(sk.kindLabel)} — ${escapeHtml(sk.desc)}</span></span><span class="si-badge cd">${sk.cooldown > 0 ? '⏳ ' + sk.cooldown : 'Siap'}</span>`;
    if (sk.cooldown === 0) btn.addEventListener('click', () => sendBattleAction('skill', { skillIndex: i }));
    host.appendChild(btn);
  });
}

async function loadInventoryForBattleMenu() {
  const host = $('item-menu'); host.innerHTML = '<div class="submenu-empty">Memuat&hellip;</div>';
  try {
    const data = await api('/inventory/mine', { auth: true });
    battleInventoryCache = data.items.filter((it) => it.type === 'consumable' && it.qty > 0);
    if (!battleInventoryCache.length) { host.innerHTML = '<div class="submenu-empty">Tidak ada item.</div>'; return; }
    host.innerHTML = '';
    battleInventoryCache.forEach((it) => {
      const btn = document.createElement('button'); btn.className = 'submenu-item';
      btn.innerHTML = `<span class="si-icon">${it.icon}</span><span class="si-info"><span class="si-name">${escapeHtml(it.name)}</span><span class="si-desc">${escapeHtml(it.desc)}</span></span><span class="si-badge qty">×${it.qty}</span>`;
      btn.addEventListener('click', () => sendBattleAction('item', { inventoryId: it.id }));
      host.appendChild(btn);
    });
  } catch (err) { host.innerHTML = `<div class="submenu-empty">Error: ${escapeHtml(err.message)}</div>`; }
}

/* Battle animations */
function triggerAttackAnimation(type) {
  battleAnim.attackActive = true; battleAnim.hunterAttackT = 0;
  if (type === 'flee') return;
  battleAnim.monsterFlash = 12;
  battleAnim.damageNumbers.push({ text: '-' + (Math.floor(Math.random() * 30) + 10), x: battleAnim.monsterX + 30, y: battleAnim.monsterY - 10, vy: -1.5, life: 40, color: '#ff4444', size: 14 });
}
function triggerHealAnimation() {
  battleAnim.damageNumbers.push({ text: '+' + (Math.floor(Math.random() * 20) + 5), x: battleAnim.hunterX + 30, y: battleAnim.hunterY - 10, vy: -1.5, life: 40, color: '#44ff88', size: 14 });
  battleAnim.hunterFlash = 10;
}
function triggerSkillAnimation() {
  battleAnim.monsterFlash = 18; battleAnim.flashOverlay = 8; battleAnim.flashColor = 'rgba(167,139,250,0.3)';
  for (let i = 0; i < 12; i++) { battleAnim.particles.push({ x: battleAnim.monsterX + 36, y: battleAnim.monsterY + 36, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3 - 1, life: 25 + Math.random() * 15, color: Math.random() > 0.5 ? '#a78bfa' : '#5eead4', size: 2 + Math.random() * 3 }); }
  battleAnim.damageNumbers.push({ text: '-' + (Math.floor(Math.random() * 50) + 20), x: battleAnim.monsterX + 20, y: battleAnim.monsterY - 15, vy: -2, life: 50, color: '#a78bfa', size: 16 });
}

async function sendBattleAction(action, extra) {
  if (battleBusy || !activeBattle || activeBattle.over) return;
  battleBusy = true; setBattleActionsEnabled(false); hideSubmenus();
  try {
    if (action === 'attack') triggerAttackAnimation('attack');
    else if (action === 'skill') triggerSkillAnimation();
    else if (action === 'item') triggerHealAnimation();
    if (action !== 'flee') await sleep(400);
    const newState = await api('/gate/action', { method: 'POST', auth: true, body: Object.assign({ action }, extra || {}) });
    activeBattle = newState; renderBattleArena(newState);
    if (newState.waveCleared) { if (newState.hunterProfile) currentHunter = newState.hunterProfile; renderWaveClearNotice(newState.waveCleared); }
    await revealNewLogLines(newState, true);
    if (newState.over) { await sleep(250); showBattleOutcome(newState); }
  } catch (err) { addBattleErrorLine(`[SISTEM] ${err.message}`); }
  finally { battleBusy = false; if (activeBattle && !activeBattle.over) setBattleActionsEnabled(true); }
}

function renderStatusChips(statuses) {
  const host = $('battle-statuses'); if (!host) return; host.innerHTML = '';
  (statuses || []).forEach((st) => {
    const span = document.createElement('span');
    if (st.type === 'dot') { span.className = 'status-chip dot'; span.textContent = `☠ ${st.amount}/gil (${st.turnsLeft})`; }
    else { const isBuff = st.amount > 0; span.className = 'status-chip ' + (isBuff ? 'buff' : 'debuff'); span.textContent = `${isBuff ? '▲' : '▼'} ${st.stat} ${isBuff ? '+' : ''}${st.amount} (${st.turnsLeft})`; }
    host.appendChild(span);
  });
}

function renderBattleArena(state) {
  $('battle-turn-display').textContent = `Giliran ${state.turnNo}`;
  $('hud-hunter-name').textContent = currentHunter ? currentHunter.name : 'Pemburu';
  $('hud-hunter-hp').textContent = `${Math.max(0, state.hunter.hp)} / ${state.hunter.maxHp}`;
  const hp = Math.max(0, Math.min(100, (state.hunter.hp / state.hunter.maxHp) * 100));
  const hf = $('hud-hunter-hp-fill'); hf.style.width = hp + '%'; hf.classList.toggle('low', hp <= 25);
  $('hud-monster-name').textContent = `${state.monster.name} (${state.monster.gateRank})`;
  $('hud-monster-hp').textContent = `${Math.max(0, state.monster.hp)} / ${state.monster.maxHp}`;
  const mp = Math.max(0, Math.min(100, (state.monster.hp / state.monster.maxHp) * 100));
  const mf = $('hud-monster-hp-fill'); mf.style.width = mp + '%'; mf.classList.toggle('low', mp <= 25);
  renderStatusChips((state.statuses.hunter || []).concat(state.statuses.monster || []));
}

/* Battle Canvas Rendering */
function renderBattleCanvas(state) {
  if (!state || !state.monster) return;
  const canvas = $('battle-canvas'); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 800, H = 280;
  canvas.width = W; canvas.height = H;
  const isDark = getTheme() !== 'light';

  const spriteSize = 80;
  const isBoss = state.monster.isBoss;
  const monsterSpriteSize = isBoss ? 96 : 72;
  battleAnim.hunterBaseX = 100; battleAnim.hunterBaseY = H * 0.35 - 5;
  battleAnim.monsterBaseX = W - 110 - monsterSpriteSize; battleAnim.monsterBaseY = H * 0.35 - (isBoss ? 10 : 0);

  if (battleAnim.attackActive) { battleAnim.hunterAttackT += 0.08; if (battleAnim.hunterAttackT >= 1) { battleAnim.attackActive = false; battleAnim.hunterAttackT = 0; } }
  if (battleAnim.monsterFlash > 0) battleAnim.monsterFlash--;
  if (battleAnim.hunterFlash > 0) battleAnim.hunterFlash--;
  if (battleAnim.monsterShake > 0) battleAnim.monsterShake--;
  if (battleAnim.flashOverlay > 0) battleAnim.flashOverlay--;
  battleAnim.damageNumbers = battleAnim.damageNumbers.filter((d) => { d.y += d.vy; d.life--; return d.life > 0; });
  battleAnim.particles = battleAnim.particles.filter((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--; return p.life > 0; });

  let hx = battleAnim.hunterBaseX, hy = battleAnim.hunterBaseY;
  let mx = battleAnim.monsterBaseX, my = battleAnim.monsterBaseY;
  if (battleAnim.attackActive) { const t = battleAnim.hunterAttackT; const ease = t < 0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; const p = t < 0.5 ? ease*2 : 2-ease*2; hx += (W*0.28 - battleAnim.hunterBaseX) * Math.min(1,p); }
  if (battleAnim.monsterShake > 0) { mx += (Math.random()-0.5)*6; my += (Math.random()-0.5)*4; }
  battleAnim.hunterX = hx; battleAnim.hunterY = hy; battleAnim.monsterX = mx; battleAnim.monsterY = my;

  // Sky
  const skyG = ctx.createLinearGradient(0,0,0,H*0.6);
  skyG.addColorStop(0, isDark ? '#080c18' : '#b0b8d0');
  skyG.addColorStop(1, isDark ? '#0c1020' : '#c0c8e0');
  ctx.fillStyle = skyG; ctx.fillRect(0,0,W,H*0.6);

  // Stars
  if (isDark) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let i=0;i<40;i++) { const sx=(i*137+50)%W; const sy=(i*89+20)%(H*0.55); ctx.globalAlpha = (Math.sin(Date.now()*0.002+i)*0.3+0.7)*0.6; ctx.fillRect(sx,sy,1,1); } ctx.globalAlpha=1; }

  // Ground
  const gndG = ctx.createLinearGradient(0,H*0.58,0,H);
  gndG.addColorStop(0, isDark ? '#162012' : '#8aa070');
  gndG.addColorStop(1, isDark ? '#0c1008' : '#6a7a50');
  ctx.fillStyle = gndG; ctx.fillRect(0,H*0.58,W,H*0.42);
  ctx.strokeStyle = isDark ? 'rgba(94,234,212,0.12)' : 'rgba(13,148,136,0.15)';
  ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,H*0.6); ctx.lineTo(W,H*0.6); ctx.stroke();
  ctx.fillStyle = isDark ? 'rgba(94,234,212,0.06)' : 'rgba(13,148,136,0.1)';
  for (let i=0;i<12;i++) { ctx.fillRect((i*73+20)%W, H*0.62+(i*17%25), 3+(i%3), 2); }

  // Hunter
  const charData = getCharDataFromHunter(currentHunter);
  const hunterCanvas = document.createElement('canvas'); hunterCanvas.width=16; hunterCanvas.height=16;
  renderCharacterToCanvas(hunterCanvas, charData);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(hx+spriteSize/2, hy+spriteSize+4, spriteSize*0.3, 5, 0, 0, Math.PI*2); ctx.fill();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(hunterCanvas, hx, hy, spriteSize, spriteSize);
  ctx.shadowColor = isDark ? 'rgba(94,234,212,0.5)' : 'rgba(13,148,136,0.4)'; ctx.shadowBlur=14;
  ctx.strokeStyle = isDark ? 'rgba(94,234,212,0.25)' : 'rgba(13,148,136,0.2)'; ctx.lineWidth=1;
  ctx.strokeRect(hx+6,hy+6,spriteSize-12,spriteSize-12); ctx.shadowBlur=0;
  if (battleAnim.hunterFlash > 0) { ctx.fillStyle = 'rgba(251,113,133,'+(battleAnim.hunterFlash/12*0.4)+')'; ctx.fillRect(hx,hy,spriteSize,spriteSize); }

  // Monster
  const monsterCanvas = document.createElement('canvas'); monsterCanvas.width=16; monsterCanvas.height=16;
  const monsterData = isBoss ? MONSTER_SPRITE_BOSS : MONSTER_SPRITE_DEFAULT;
  renderSpriteToCanvas(monsterCanvas, monsterData, MONSTER_PALETTE_DEFAULT);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(mx+monsterSpriteSize/2, my+monsterSpriteSize+4, monsterSpriteSize*0.3, 5, 0, 0, Math.PI*2); ctx.fill();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(monsterCanvas, mx, my, monsterSpriteSize, monsterSpriteSize);
  ctx.shadowColor = isBoss ? 'rgba(251,113,133,0.6)' : 'rgba(251,113,133,0.35)'; ctx.shadowBlur=isBoss?18:10;
  ctx.strokeStyle = isBoss ? 'rgba(251,113,133,0.35)' : 'rgba(251,113,133,0.2)'; ctx.lineWidth=1;
  ctx.strokeRect(mx+6,my+6,monsterSpriteSize-12,monsterSpriteSize-12); ctx.shadowBlur=0;
  if (battleAnim.monsterFlash > 0) { ctx.fillStyle = 'rgba(255,255,255,'+(battleAnim.monsterFlash/18*0.5)+')'; ctx.fillRect(mx,my,monsterSpriteSize,monsterSpriteSize); }

  // Attack line
  if (battleAnim.attackActive && battleAnim.hunterAttackT > 0.3 && battleAnim.hunterAttackT < 0.7) {
    const la = Math.sin((battleAnim.hunterAttackT-0.3)/0.4*Math.PI);
    ctx.strokeStyle = 'rgba(94,234,212,'+(la*0.6)+')'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(hx+spriteSize, hy+spriteSize*0.5); ctx.lineTo(mx, my+monsterSpriteSize*0.5); ctx.stroke();
    for (let i=0;i<3;i++) { const px=hx+spriteSize+(mx-hx-spriteSize)*Math.random(); const py=hy+spriteSize*0.3+Math.random()*spriteSize*0.4; ctx.fillStyle='rgba(94,234,212,'+(la*0.8)+')'; ctx.fillRect(px,py,2,2); }
  }

  // Particles & damage numbers
  battleAnim.particles.forEach((p) => { ctx.fillStyle=p.color; ctx.globalAlpha=Math.min(1,p.life/10); ctx.fillRect(p.x,p.y,p.size,p.size); }); ctx.globalAlpha=1;
  battleAnim.damageNumbers.forEach((d) => { const a=Math.min(1,d.life/15); ctx.font='bold '+d.size+'px "JetBrains Mono",monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='rgba(0,0,0,'+(a*0.5)+')'; ctx.fillText(d.text,d.x+1,d.y+1); ctx.fillStyle=d.color; ctx.globalAlpha=a; ctx.fillText(d.text,d.x,d.y); ctx.globalAlpha=1; });
  if (battleAnim.flashOverlay > 0) { ctx.fillStyle=battleAnim.flashColor; ctx.fillRect(0,0,W,H); }

  // VS
  ctx.fillStyle = isDark ? 'rgba(167,139,250,0.12)' : 'rgba(124,58,237,0.08)';
  ctx.beginPath(); ctx.arc(W/2,H*0.5,24,0,Math.PI*2); ctx.fill();
  ctx.font='bold 14px Cinzel,serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle = isDark ? 'rgba(167,139,250,0.5)' : 'rgba(124,58,237,0.4)'; ctx.fillText('VS',W/2,H*0.5);
  ctx.font='9px "JetBrains Mono",monospace';
  ctx.fillStyle = isDark ? 'rgba(94,234,212,0.4)' : 'rgba(13,148,136,0.4)';
  ctx.fillText(`Gerbang ${state.gateRank} · Wave ${state.wave}/${state.maxWave}`,W/2,H*0.5+18);
}

/* Battle outcome */
function showBattleOutcome(state) {
  stopBattleLoop(); renderBattleArena(state); renderBattleCanvas(state);
  $('battle-actions')?.classList.add('hidden'); hideSubmenus();
  const LABELS = { menang: '⚔ Kemenangan!', kalah: '✕ Mundur', kabur: '🏃 Berhasil Kabur' };
  const CLASSES = { menang: 'win', kalah: 'lose', kabur: 'flee' };
  const result = state.outcome ? state.outcome.result : 'kalah';
  const banner = $('battle-banner'); banner.textContent = LABELS[result] || ''; banner.className = 'battle-banner ' + (CLASSES[result] || ''); banner.classList.remove('hidden');
  const xpEl = $('battle-xp');
  if (typeof state.xpGained === 'number') { const cp = state.coinsGained > 0 ? ` · 🪙 +${state.coinsGained}` : ''; xpEl.innerHTML = `+<b>${state.xpGained}</b> XP${cp}`; xpEl.classList.remove('hidden'); }
  const dropEl = $('item-drop-banner');
  if (state.itemDrop) { const c = RARITY_COLOR[state.itemDrop.rarity] || 'var(--arcane)'; dropEl.innerHTML = `🎁 <b>${state.itemDrop.icon} ${escapeHtml(state.itemDrop.name)}</b> <span style="color:${c}">(${state.itemDrop.rarity})</span>`; dropEl.classList.remove('hidden'); } else { dropEl.classList.add('hidden'); }
  const lvEl = $('levelup-banner');
  if (state.leveledUp) { lvEl.textContent = `🎉 Naik ${state.levelsGained} Level! Lv.${state.hunterProfile.level}`; lvEl.classList.remove('hidden'); } else { lvEl.classList.add('hidden'); }
  $('battle-continue-row')?.classList.remove('hidden');
  if (state.hunterProfile) { currentHunter = state.hunterProfile; renderCharacter(currentHunter); }
}

$('btn-battle-continue')?.addEventListener('click', () => {
  stopBattleLoop(); activeBattle = null;
  $('battle-result')?.classList.remove('show'); $('battle-actions')?.classList.remove('hidden');
  if (currentHunter) populateGateSelect(currentHunter);
  $('gate-stage')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* ================================================================
   CHARACTER SHEET
   ================================================================ */
function renderCharacter(hunter) {
  if (!hunter) return;
  $('lic-id').textContent = 'PB-' + hunter.id + ' · LISENSI PEMBURU';
  $('lic-name').textContent = hunter.name;
  $('lic-title').textContent = '"' + hunter.title + '"';
  $('lic-class').innerHTML = `<span class="ic">${hunter.class.icon}</span>${hunter.class.name}`;
  $('lic-element').innerHTML = `<span class="ic">${hunter.element.icon}</span>${hunter.element.name}`;
  $('lic-level-pill').innerHTML = `<span class="level-pill">Lv. ${hunter.level}</span>`;
  $('lic-gender').textContent = hunter.gender === 'female' ? '👩 Cewek' : '👨 Cowok';
  $('lic-power').textContent = hunter.power.toLocaleString('id-ID');
  $('lic-coins').textContent = (hunter.coins || 0).toLocaleString('id-ID');
  const xpPct = Math.min(100, (hunter.xp / hunter.xpToNext) * 100);
  $('xp-fill').style.width = xpPct + '%';
  $('xp-nums').textContent = `${hunter.xp} / ${hunter.xpToNext} XP`;
  const rankEl = $('lic-rank'); rankEl.textContent = hunter.rank.code;
  rankEl.className = 'rank-badge' + (hunter.rank.code === 'SSS' ? ' sss' : '');
  rankEl.style.setProperty('--rankcolor', hunter.rank.color);
  rankEl.style.setProperty('--rankglow2', hunter.rank.color + '55');
  const licEl = $('license'); licEl.className = 'license' + (hunter.rank.code === 'SSS' ? ' sss' : ''); licEl.style.setProperty('--rankglow', hunter.rank.color + '22');
  $('points-banner-host').innerHTML = hunter.statPoints > 0 ? `<div class="points-banner"><div class="msg">Kamu punya <b>${hunter.statPoints}</b> poin stat belum dialokasikan.</div></div>` : '';

  // Character preview
  const charCanvas = $('lic-char-canvas');
  if (charCanvas) { const cd = getCharDataFromHunter(hunter); renderCharacterToCanvas(charCanvas, cd); }

  // Cosmetics
  const cosHost = $('lic-cosmetics'); cosHost.innerHTML = '';
  const equipped = hunter.equippedCosmetics || [];
  equipped.forEach((cosId) => { const def = COSMETIC_DEFS.find((c) => c.id === cosId); if (!def) return; const b = document.createElement('span'); b.className = 'cosmetic-badge equipped'; b.textContent = `${def.icon} ${def.name}`; cosHost.appendChild(b); });
  const addBtn = document.createElement('span'); addBtn.className = 'cosmetic-badge'; addBtn.textContent = equipped.length ? '⚙️ Ganti Kosmetik' : '🎨 Belum ada kosmetik';
  addBtn.addEventListener('click', openCosmeticsModal); cosHost.appendChild(addBtn);

  // Stats
  const sg = $('lic-stats'); sg.innerHTML = '';
  STAT_NAMES.forEach((name) => {
    const val = hunter.stats[name]; const eff = hunter.effectiveStats ? hunter.effectiveStats[name] : val;
    const row = document.createElement('div'); row.className = 'stat-alloc-row';
    row.innerHTML = `<div class="stat-name">${name}</div><div class="stat-val">${val}${eff!==val?` <span style="color:var(--mana);font-size:10px">→${eff}</span>`:''}</div><button class="stat-plus" data-stat="${name}" ${hunter.statPoints>0?'':'disabled'}>+</button>`;
    sg.appendChild(row);
  });
  sg.querySelectorAll('.stat-plus').forEach((btn) => { btn.addEventListener('click', () => allocateStat(btn.dataset.stat)); });

  // Equipment & Skills
  renderEquipSlots(hunter.equipment, 'lic-equip-slots', true);
  const sk = $('lic-skills'); sk.innerHTML = '';
  hunter.skills.forEach((s) => { const r = document.createElement('div'); r.className = 'skill'; r.innerHTML = `<span class="sn">${s.name}</span><span class="sr" style="background:${s.rarity.color}22;color:${s.rarity.color};border:1px solid ${s.rarity.color}55">${s.rarity.name}</span>`; sk.appendChild(r); });
}

async function allocateStat(stat) {
  try { const u = await api('/hunters/allocate', { method: 'POST', auth: true, body: { stat } }); currentHunter = u; renderCharacter(u); } catch (err) {}
}

/* ================================================================
   EQUIPMENT & INVENTORY
   ================================================================ */
function renderEquipSlots(equipment, hostId, clickable) {
  const host = $(hostId); if (!host) return; host.innerHTML = '';
  ['weapon', 'armor', 'accessory'].forEach((slot) => {
    const item = equipment ? equipment[slot] : null;
    const box = document.createElement('div'); box.className = 'equip-slot ' + (item ? 'filled' : 'empty');
    if (item) box.style.setProperty('--slotcolor', RARITY_COLOR[item.rarity] || '');
    box.innerHTML = `<div class="es-icon">${item ? item.icon : SLOT_ICONS[slot]}</div><div class="es-label">${SLOT_LABELS[slot]}</div><div class="es-name">${item ? escapeHtml(item.name) : 'Kosong'}</div>`;
    if (clickable) box.addEventListener('click', openInventoryModal);
    host.appendChild(box);
  });
}

async function openInventoryModal() { openModal('inventory-overlay'); const h = $('inventory-list'); h.innerHTML = '<div class="list-empty">Memuat&hellip;</div>'; try { const d = await api('/inventory/mine', { auth: true }); renderEquipSlots(d.equipped, 'inv-equip-slots', false); renderInventoryList(d.items); } catch (e) { h.innerHTML = `<div class="list-empty">Error: ${escapeHtml(e.message)}</div>`; } }
function renderInventoryList(items) {
  const h = $('inventory-list'); if (!items || !items.length) { h.innerHTML = '<div class="list-empty">Inventaris kosong.</div>'; return; }
  h.innerHTML = '';
  items.forEach((it) => {
    const r = document.createElement('div'); r.className = 'list-item'; r.style.cursor = 'default';
    const rc = RARITY_COLOR[it.rarity] || 'var(--text-muted)';
    let act = it.type === 'equipment' ? (it.equipped ? `<button class="mini-btn" data-unequip="${it.slot}">Lepas</button>` : `<button class="mini-btn primary" data-equip="${it.id}">Pakai</button>`) : `<span style="font-size:10.5px;color:var(--text-muted)">×${it.qty}</span>`;
    r.innerHTML = `<div class="list-badge" style="--c:${rc}">${it.icon}</div><div class="list-info"><div class="rn">${escapeHtml(it.name)} <span style="color:${rc}">— ${it.rarity}</span></div><div class="rm">${escapeHtml(it.desc)}</div></div><div>${act}</div>`;
    h.appendChild(r);
  });
  h.querySelectorAll('[data-equip]').forEach((b) => { b.addEventListener('click', async () => { try { await api('/inventory/equip', { method: 'POST', auth: true, body: { inventoryId: Number(b.dataset.equip) } }); await openInventoryModal(); await refreshHunterQuiet(); } catch (e) { $('inventory-error').textContent = e.message; } }); });
  h.querySelectorAll('[data-unequip]').forEach((b) => { b.addEventListener('click', async () => { try { await api('/inventory/unequip', { method: 'POST', auth: true, body: { slot: b.dataset.unequip } }); await openInventoryModal(); await refreshHunterQuiet(); } catch (e) { $('inventory-error').textContent = e.message; } }); });
}
$('btn-inventory')?.addEventListener('click', openInventoryModal);
$('inventory-close')?.addEventListener('click', () => closeModal('inventory-overlay'));

/* ================================================================
   SHOP
   ================================================================ */
let shopTimerInterval = null, shopRefreshesAt = null;
async function openShopModal() { openModal('shop-overlay'); $('shop-coins').textContent = (currentHunter?.coins || 0).toLocaleString('id-ID'); const h = $('shop-list'); h.innerHTML = '<div class="list-empty">Memuat&hellip;</div>'; try { const d = await api('/shop', { auth: true }); shopRefreshesAt = new Date(d.refreshesAt).getTime(); startShopCountdown(); renderShopList(d.items); } catch (e) { h.innerHTML = `<div class="list-empty">Error: ${escapeHtml(e.message)}</div>`; } }
function startShopCountdown() { if (shopTimerInterval) clearInterval(shopTimerInterval); const tick = () => { const el = $('shop-timer'); if (!shopRefreshesAt) { el.textContent = '--:--'; return; } const r = shopRefreshesAt - Date.now(); if (r <= 0) { el.textContent = 'Merefresh…'; if ($('shop-overlay')?.classList.contains('open')) openShopModal(); return; } el.textContent = `Refresh ${String(Math.floor(r/60000)).padStart(2,'0')}:${String(Math.floor((r%60000)/1000)).padStart(2,'0')}`; }; tick(); shopTimerInterval = setInterval(tick, 1000); }
function renderShopList(items) {
  const h = $('shop-list'); if (!items?.length) { h.innerHTML = '<div class="list-empty">Toko kosong.</div>'; return; }
  const coins = currentHunter?.coins || 0; h.innerHTML = '';
  items.forEach((it) => { const rc = RARITY_COLOR[it.rarity] || 'var(--text-muted)'; const r = document.createElement('div'); r.className = 'list-item'; r.style.cursor = 'default'; r.innerHTML = `<div class="list-badge" style="--c:${rc}">${it.icon}</div><div class="list-info"><div class="rn">${escapeHtml(it.name)} <span style="color:${rc}">— ${it.rarity}</span></div><div class="rm">${escapeHtml(it.desc||'')}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px"><span class="shop-item-price">🪙 ${it.price.toLocaleString('id-ID')}</span><button class="mini-btn primary" data-buy="${it.key}" ${coins>=it.price?'':'disabled'}>Beli</button></div>`; h.appendChild(r); });
  h.querySelectorAll('[data-buy]').forEach((b) => { b.addEventListener('click', async () => { try { const d = await api('/shop/buy', { method: 'POST', auth: true, body: { itemKey: b.dataset.buy } }); if (currentHunter) currentHunter.coins = d.coins; $('shop-coins').textContent = d.coins.toLocaleString('id-ID'); $('lic-coins').textContent = d.coins.toLocaleString('id-ID'); await openShopModal(); } catch (e) { $('shop-error').textContent = e.message; } }); });
}
$('btn-shop')?.addEventListener('click', openShopModal);
$('shop-close')?.addEventListener('click', () => { closeModal('shop-overlay'); if (shopTimerInterval) { clearInterval(shopTimerInterval); shopTimerInterval = null; } });

/* Copy license */
$('btn-copy')?.addEventListener('click', () => { if (!currentHunter) return; const h = currentHunter; const t = `⟡ LISENSI PEMBURU ⟡\nNama: ${h.name} "${h.title}"\nLv.${h.level} | Rank: ${h.rank.code} | ${h.class.name} | ${h.element.name}\nHP ${h.stats.HP} · ATK ${h.stats.ATK} · DEF ${h.stats.DEF} · AGI ${h.stats.AGI} · INT ${h.stats.INT} · LUK ${h.stats.LUK}\nSkill: ${h.skills.map(s=>s.name+' ['+s.rarity.name+']').join(', ')}\nPower: ${h.power}\n— Gerbang Awakening`; navigator.clipboard.writeText(t).then(() => { $('btn-copy').textContent = 'Tersalin ✓'; setTimeout(() => $('btn-copy').textContent = 'Salin Ringkasan', 1500); }).catch(() => {}); });

$('btn-reset-char')?.addEventListener('click', async () => {
  if (!confirm('Reset karakter? Semua progress akan hilang.')) return;
  try { await api('/hunters/mine', { method: 'DELETE', auth: true }); currentHunter = null; activeBattle = null; localStorage.removeItem('ga_gender'); localStorage.removeItem('ga_char_data'); $('battle-result')?.classList.remove('show'); $('gate-rank-select').innerHTML = ''; showCreation(); } catch (err) {}
});

/* ================================================================
   MODALS
   ================================================================ */
function openModal(id) { $(id)?.classList.add('open'); }
function closeModal(id) { $(id)?.classList.remove('open'); }

/* Leaderboard */
$('btn-leaderboard')?.addEventListener('click', async () => { openModal('leaderboard-overlay'); const l = $('leaderboard-list'); l.innerHTML = '<div class="list-empty">Memuat&hellip;</div>'; try { const b = await api('/leaderboard'); renderLeaderboard(b); } catch (e) { l.innerHTML = `<div class="list-empty">Error: ${e.message}</div>`; } });
function renderLeaderboard(b) { const s = $('leaderboard-summary'); const l = $('leaderboard-list'); if (!b.length) { s.innerHTML=''; l.innerHTML='<div class="list-empty">Belum ada Pemburu.</div>'; return; } s.innerHTML=`<div><strong>${b.length}</strong>Pemburu</div>`; l.innerHTML=''; b.forEach((h,i) => { const r=document.createElement('div'); r.className='list-item'; r.style.cursor='default'; r.innerHTML=`<div class="list-rank-num">#${i+1}</div><div class="list-badge" style="--c:${h.rank.color}">${h.rank.code}</div><div class="list-info"><div class="rn">${h.name} <span style="color:var(--text-muted)">— ${h.owner}</span></div><div class="rm">Lv.${h.level} · ${h.class.name} · ${h.element.name} · ${h.power.toLocaleString('id-ID')}</div></div>`; l.appendChild(r); }); }
$('leaderboard-close')?.addEventListener('click', () => closeModal('leaderboard-overlay'));

/* Battle History */
$('btn-roster')?.addEventListener('click', async () => { openModal('roster-overlay'); const l = $('roster-list'); l.innerHTML = '<div class="list-empty">Memuat&hellip;</div>'; $('roster-summary').innerHTML=''; try { const b = await api('/battles/mine', { auth: true }); renderBattleHistory(b); } catch (e) { l.innerHTML = `<div class="list-empty">Error: ${e.message}</div>`; } });
function renderBattleHistory(battles) { const s=$('roster-summary'); const l=$('roster-list'); if (!battles.length) { s.innerHTML=''; l.innerHTML='<div class="list-empty">Belum ada pertarungan.</div>'; return; } const w=battles.filter(b=>b.result==='menang').length; s.innerHTML=`<div><strong>${battles.length}</strong>Pertarungan</div><div><strong style="color:#34d399">${w}</strong>Menang</div>`; l.innerHTML=''; battles.forEach(b => { const r=document.createElement('div'); r.className='list-item'; r.style.cursor='default'; const c=b.result==='menang'?'#34d399':b.result==='kabur'?'#7d7fa0':'#fb7185'; r.innerHTML=`<div class="list-badge" style="--c:${c}">${b.monsterIcon}</div><div class="list-info"><div class="rn">${b.monsterName} <span style="color:${c}">— ${b.result}</span></div><div class="rm">Gerbang ${b.gateRank} · +${b.xpGained} XP${b.coinsGained>0?' · 🪙+'+b.coinsGained:''} · ${new Date(b.date).toLocaleDateString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div></div>`; l.appendChild(r); }); }
$('roster-close')?.addEventListener('click', () => closeModal('roster-overlay'));

/* Gacha */
$('btn-gacha')?.addEventListener('click', async () => { $('gacha-error').textContent=''; ['gacha-weapon-result','gacha-skill-result','gacha-cosmetic-result'].forEach(id => $(id).innerHTML=''); $('gacha-coins').textContent=(currentHunter?.coins||0).toLocaleString('id-ID'); openModal('gacha-overlay'); if (currentHunter?.pendingSkill) renderPendingSkillChoice(currentHunter.pendingSkill, currentHunter.skills); });
$('gacha-close')?.addEventListener('click', () => closeModal('gacha-overlay'));

$('btn-pull-weapon')?.addEventListener('click', async () => { $('gacha-error').textContent=''; try { const d = await api('/gacha/weapon', { method: 'POST', auth: true }); currentHunter = d.hunter; $('gacha-coins').textContent = currentHunter.coins.toLocaleString('id-ID'); renderCharacter(currentHunter); const rc=RARITY_COLOR[d.weapon.rarity]||'var(--text-muted)'; $('gacha-weapon-result').innerHTML=`<div class="gacha-reveal"><div class="icon">${d.weapon.icon}</div><div class="info"><div class="n">${escapeHtml(d.weapon.name)}</div><div class="r" style="color:${rc}">${d.weapon.rarity} · +${d.weapon.amount} ${d.weapon.stat}</div></div></div>`; } catch(e) { $('gacha-error').textContent=e.message; } });

$('btn-pull-skill')?.addEventListener('click', async () => { $('gacha-error').textContent=''; try { const d = await api('/gacha/skill', { method: 'POST', auth: true }); currentHunter = d.hunter; $('gacha-coins').textContent = currentHunter.coins.toLocaleString('id-ID'); renderPendingSkillChoice(d.skill, currentHunter.skills); } catch(e) { $('gacha-error').textContent=e.message; } });

function renderPendingSkillChoice(skill, currentSkills) {
  const rc=RARITY_COLOR[skill.rarity.name]||'var(--text-muted)'; const h=$('gacha-skill-result');
  h.innerHTML=`<div class="gacha-reveal" style="margin-bottom:10px"><div class="icon">📖</div><div class="info"><div class="n">${escapeHtml(skill.name)}</div><div class="r" style="color:${rc}">${skill.rarity.name}</div></div></div><p class="hint" style="margin-bottom:4px">Pilih skill mana yang mau digantikan:</p><div class="skill-slot-choices">${currentSkills.map((s,i)=>`<button class="skill-slot-btn" data-assign-slot="${i}"><span>Ganti slot ${i+1}: <b style="color:var(--text-primary)">${escapeHtml(s.name)}</b></span><span style="color:${s.rarity.color}">${s.rarity.name}</span></button>`).join('')}<button class="skill-slot-btn" id="btn-discard-skill" style="color:var(--danger);text-align:center;justify-content:center">Buang skill ini</button></div>`;
  h.querySelectorAll('[data-assign-slot]').forEach((b) => { b.addEventListener('click', async () => { $('gacha-error').textContent=''; try { const d = await api('/gacha/skill/assign', { method: 'POST', auth: true, body: { slotIndex: Number(b.dataset.assignSlot) } }); currentHunter=d.hunter; renderCharacter(currentHunter); h.innerHTML='<p class="hint">Skill baru terpasang.</p>'; } catch(e) { $('gacha-error').textContent=e.message; } }); });
  $('btn-discard-skill')?.addEventListener('click', async () => { $('gacha-error').textContent=''; try { const d = await api('/gacha/skill/discard', { method: 'POST', auth: true }); currentHunter=d.hunter; h.innerHTML='<p class="hint">Dibuang.</p>'; } catch(e) { $('gacha-error').textContent=e.message; } });
}

$('btn-pull-cosmetic')?.addEventListener('click', async () => { $('gacha-error').textContent=''; try { const d = await api('/gacha/cosmetic', { method: 'POST', auth: true }); currentHunter=d.hunter; $('gacha-coins').textContent=currentHunter.coins.toLocaleString('id-ID'); renderCharacter(currentHunter); const def=COSMETIC_DEFS.find(c=>c.id===d.cosmetic.id); const rc=RARITY_COLOR[d.cosmetic.rarity]||'var(--text-muted)'; $('gacha-cosmetic-result').innerHTML=`<div class="gacha-reveal"><div class="icon">${def?.icon||'🎨'}</div><div class="info"><div class="n">${escapeHtml(d.cosmetic.name)}</div><div class="r" style="color:${rc}">${d.cosmetic.rarity} · ${d.cosmetic.alreadyOwned?'Sudah dimiliki':'Baru!'}</div></div></div>`; } catch(e) { $('gacha-error').textContent=e.message; } });

/* Cosmetics modal */
async function openCosmeticsModal() { $('cosmetics-error').textContent=''; openModal('cosmetics-overlay'); const h=$('cosmetics-list'); h.innerHTML='<div class="list-empty">Memuat&hellip;</div>'; try { const d = await api('/hunters/cosmetics', { auth: true }); renderCosmeticsList(d.owned||[], d.equipped||[]); const cd = getCharDataFromHunter(currentHunter); renderCharacterToCanvas($('cosmetic-preview-canvas'), cd); } catch(e) { h.innerHTML=`<div class="list-empty">Error: ${escapeHtml(e.message)}</div>`; } }
function renderCosmeticsList(owned, equipped) {
  const h=$('cosmetics-list'); const es=new Set(equipped);
  if (!owned.length) { h.innerHTML='<div class="list-empty">Belum ada kosmetik.<br>Gacha Kosmetik untuk mendapat!</div>'; return; }
  h.innerHTML='';
  owned.forEach((cid) => { const def=COSMETIC_DEFS.find(c=>c.id===cid); if (!def) return; const isE=es.has(cid); const rc=RARITY_COLOR[def.rarity]||'var(--text-muted)'; const r=document.createElement('div'); r.className='list-item'; r.style.cursor='default'; r.innerHTML=`<div class="list-badge" style="--c:${rc}">${def.icon}</div><div class="list-info"><div class="rn">${escapeHtml(def.name)} <span style="color:${rc}">— ${def.rarity}</span></div><div class="rm">${escapeHtml(def.desc)}</div></div><div><button class="mini-btn ${isE?'':'primary'}" data-cos-action="${isE?'unequip':'equip'}" data-cos-id="${cid}">${isE?'Lepas':'Pakai'}</button></div>`; h.appendChild(r); });
  h.querySelectorAll('[data-cos-action]').forEach((b) => { b.addEventListener('click', async () => { try { if (b.dataset.cosAction==='equip') await api('/hunters/cosmetics/equip', { method:'POST', auth:true, body:{cosmeticId:b.dataset.cosId} }); else await api('/hunters/cosmetics/unequip', { method:'POST', auth:true, body:{cosmeticId:b.dataset.cosId} }); await openCosmeticsModal(); await refreshHunterQuiet(); } catch(e) { $('cosmetics-error').textContent=e.message; } }); });
}
$('cosmetics-close')?.addEventListener('click', () => closeModal('cosmetics-overlay'));

/* Pets */
$('btn-pets')?.addEventListener('click', async () => { $('pets-error').textContent=''; $('pet-flavor-msg')?.classList.add('hidden'); openModal('pets-overlay'); const h=$('pets-list'); h.innerHTML='<div class="list-empty">Memuat&hellip;</div>'; try { const d = await api('/pets/mine', { auth: true }); renderPetsList(d.pets, d.activePetKey); } catch(e) { h.innerHTML=`<div class="list-empty">Error: ${escapeHtml(e.message)}</div>`; } });
function renderPetsList(pets, activeKey) { const h=$('pets-list'); if (!pets?.length) { h.innerHTML='<div class="list-empty">Belum ada peliharaan.</div>'; return; } h.className='pet-grid'; h.innerHTML=''; pets.forEach(p => { const isA=p.key===activeKey; const rc=RARITY_COLOR[p.rarity]||'var(--text-muted)'; const c=document.createElement('div'); c.className='pet-card'+(isA?' active':''); c.innerHTML=`${isA?'<span class="pet-active-badge">Aktif</span>':''}<div class="pet-icon">${p.icon}</div><div class="pet-name">${escapeHtml(p.name)}</div><div class="pet-rarity" style="color:${rc}">${p.rarity}</div><div class="pet-bonus">+${p.amount} ${p.stat}</div><div class="pet-actions"><button class="mini-btn" data-act="${isA?'deactivate':'activate'}" data-key="${p.key}">${isA?'Nonaktifkan':'Aktifkan'}</button><button class="mini-btn" data-interact="${p.key}">Interaksi</button></div>`; h.appendChild(c); });
  h.querySelectorAll('[data-act]').forEach(b => { b.addEventListener('click', async () => { try { await api('/pets/activate', { method:'POST', auth:true, body:{petKey:b.dataset.act==='activate'?b.dataset.key:null} }); await refreshHunter(); $('btn-pets').click(); } catch(e) { $('pets-error').textContent=e.message; } }); });
  h.querySelectorAll('[data-interact]').forEach(b => { b.addEventListener('click', async () => { try { const r = await api('/pets/interact', { method:'POST', auth:true, body:{petKey:b.dataset.interact} }); const m=$('pet-flavor-msg'); m.textContent=r.message; m.classList.remove('hidden'); } catch(e) { $('pets-error').textContent=e.message; } }); });
}
$('pets-close')?.addEventListener('click', () => closeModal('pets-overlay'));

/* Profile */
let currentAvatar = null, pendingAvatarDataUrl = null;
function updateNavAvatar(a) { currentAvatar=a; const img=$('nav-avatar-img'); const fb=$('nav-avatar-fallback'); if(a){img.src=a;img.classList.remove('hidden');fb.classList.add('hidden');}else{img.classList.add('hidden');img.removeAttribute('src');fb.classList.remove('hidden');} }
async function refreshAvatar() { try { const me=await api('/auth/me',{auth:true}); updateNavAvatar(me.avatar||null); } catch(e){} }
$('btn-profile')?.addEventListener('click', () => { $('profile-error').textContent=''; pendingAvatarDataUrl=null; $('btn-save-avatar').disabled=true; const img=$('profile-preview-img'); const fb=$('profile-preview-fallback'); if(currentAvatar){img.src=currentAvatar;img.classList.remove('hidden');fb.classList.add('hidden');}else{img.classList.add('hidden');fb.classList.remove('hidden');} openModal('profile-overlay'); });
$('profile-close')?.addEventListener('click', () => closeModal('profile-overlay'));
$('profile-file-input')?.addEventListener('change', (e) => { const f=e.target.files[0]; $('profile-error').textContent=''; if(!f)return; if(f.size>8*1024*1024){$('profile-error').textContent='Terlalu besar (maks 8MB).';return;} const r=new FileReader(); r.onload=(ev)=>{const img=new Image();img.onload=()=>{const cv=document.createElement('canvas');cv.width=160;cv.height=160;const cx=cv.getContext('2d');const ms=Math.min(img.width,img.height);cx.drawImage(img,(img.width-ms)/2,(img.height-ms)/2,ms,ms,0,0,160,160);pendingAvatarDataUrl=cv.toDataURL('image/jpeg',0.82);$('profile-preview-img').src=pendingAvatarDataUrl;$('profile-preview-img').classList.remove('hidden');$('profile-preview-fallback').classList.add('hidden');$('btn-save-avatar').disabled=false;};img.onerror=()=>$('profile-error').textContent='Gagal baca gambar.';img.src=ev.target.result;}; r.readAsDataURL(f); });
$('btn-save-avatar')?.addEventListener('click', async () => { if(!pendingAvatarDataUrl)return; $('profile-error').textContent=''; try { const d=await api('/auth/avatar',{method:'PUT',auth:true,body:{avatar:pendingAvatarDataUrl}}); updateNavAvatar(d.avatar); pendingAvatarDataUrl=null; closeModal('profile-overlay'); } catch(e) { $('profile-error').textContent=e.message; } });
$('btn-remove-avatar')?.addEventListener('click', async () => { $('profile-error').textContent=''; try { await api('/auth/avatar',{method:'PUT',auth:true,body:{avatar:null}}); updateNavAvatar(null); pendingAvatarDataUrl=null; $('profile-preview-img').classList.add('hidden'); $('profile-preview-fallback').classList.remove('hidden'); $('btn-save-avatar').disabled=true; } catch(e) { $('profile-error').textContent=e.message; } });

/* Modal close helpers */
['roster-overlay','leaderboard-overlay','inventory-overlay','pets-overlay','profile-overlay','gacha-overlay','cosmetics-overlay'].forEach((id) => { $(id)?.addEventListener('click', (e) => { if (e.target.id===id) closeModal(id); }); });
$('shop-overlay')?.addEventListener('click', (e) => { if (e.target.id==='shop-overlay') { closeModal('shop-overlay'); if(shopTimerInterval){clearInterval(shopTimerInterval);shopTimerInterval=null;} } });
document.addEventListener('keydown', (e) => { if(e.key==='Escape') { ['roster-overlay','leaderboard-overlay','inventory-overlay','pets-overlay','profile-overlay','gacha-overlay','cosmetics-overlay'].forEach(closeModal); closeModal('shop-overlay'); $('settings-overlay')?.classList.add('hidden'); } });

/* ================================================================
   MONSTER SPRITES
   ================================================================ */
const MONSTER_PALETTE_DEFAULT = { '0':null, '4':'#5a2d2d', '6':'#ff4444', 'b':'#ffffff' };
const MONSTER_SPRITE_DEFAULT = ['    4444      ','   444444     ','  44666644    ','  46b66b64    ','  46444464    ','  44444444    ','   444444     ','    4444      ','   444444     ','  44444444    ','  44444444    ','   444444     ','    44 44     ','    44 44     ','   44   44    ','   44   44    '];
const MONSTER_SPRITE_BOSS = ['   444444     ','  44444444    ',' 4446666644   ',' 46b6666b64   ',' 4666666664   ',' 4444444444   ','  44444444    ','  44444444    ',' 4444444444   ',' 4444444444   ','444444444444  ',' 4444444444   ','  44  44 44   ','  44  44 44   ',' 444  444 44  ',' 444  444 44  '];

function renderSpriteToCanvas(canvas, spriteData, palette) {
  const ctx = canvas.getContext('2d'); canvas.width=16; canvas.height=16; ctx.clearRect(0,0,16,16);
  for(let y=0;y<16;y++){const row=spriteData[y]||'';for(let x=0;x<16;x++){const ch=row[x]||' ';if(ch===' ')continue;const c=palette[ch];if(!c)continue;ctx.fillStyle=c;ctx.fillRect(x,y,1,1);}}
}

/* ================================================================
   BOOT
   ================================================================ */
showMainMenu();
spawnEmbers();

})();
