(() => {
"use strict";

const $ = id => document.getElementById(id);
const API = '/api';
const STAT_NAMES = ['HP','ATK','DEF','AGI','INT','LUK'];
const RARITY_COLOR = { Umum:'#9ca3af', Langka:'#34d399', Epik:'#60a5fa', Legendaris:'#c084fc', Mitos:'#fbbf24', Transenden:'#ffffff' };
const SLOT_LABELS = { weapon:'Senjata', armor:'Zirah', accessory:'Aksesori' };
const SLOT_ICONS = { weapon:'⚔️', armor:'🛡️', accessory:'💍' };
let TOKEN = localStorage.getItem('ga_token') || null;
let USERNAME = localStorage.getItem('ga_username') || null;
let currentHunter = null, activeBattle = null, battleBusy = false, shownLogCount = 0, battleInventoryCache = null;
let charOpts = {
  gender: 'male', hair: 'short', hairColor: '#5a3825',
  skin: '#f5c49c', outfit: 'tshirt', outfitColor: '#2d7a3a',
  shoes: 'boots'
};

/* ====== DYNAMIC PIXEL ART SPRITE SYSTEM ====== */
const _EYES = '#1a1a2e', _MOUTH = '#cc6060', _PANTS = '#2a4a8a';

// Hair style grids — 5 rows each (rows 0-4 of 16x16)
const HAIR_SHORT = [
  '0000000000000000',
  '0000000000000000',
  '0000000000000000',
  '0000000000000000',
  '0000022222000000',
];
const HAIR_SPIKY = [
  '0000002002000000',
  '0000000000000000',
  '0000020002000000',
  '0000222222200000',
  '0000022222000000',
];
const HAIR_LONG = [
  '0000000000000000',
  '0000000000000000',
  '0000000000000000',
  '0000022222000000',
  '0000222222200000',
];
// Female long hair extends down the sides
const HAIR_LONG_F = [
  '0000000000000000',
  '0000000000000000',
  '0000000000000000',
  '0000022222000000',
  '0000222222200000',
];

// Head grid — rows 5-7 (face)
const HEAD_MALE = [
  '0000021111200000',
  '0000026116200000',
  '0000021191200000',
  '0000001111000000',
  '0000000110000000',
];
const HEAD_FEMALE = [
  '0000021111200000',
  '0000026116200000',
  '0000021191200000',
  '0000001111000000',
  '0000000110000000',
];

// Body grids — rows 10-12 (torso)
const BODY_TSHIRT = [
  '0000033333000000',
  '0000733333370000',
  '0000733333370000',
  '0000733333370000',
];
const BODY_ARMOR = [
  '0000033333000000',
  '0007333333337000',
  '0000733333370000',
  '0000033333000000',
];
const BODY_ROBE = [
  '0000033333000000',
  '0000333333300000',
  '0003333333330000',
  '0003333333330000',
];
// Female body has slight variation
const BODY_TSHIRT_F = [
  '0000033333000000',
  '0000733333370000',
  '0000733333370000',
  '0000233333320000',
];
const BODY_ARMOR_F = [
  '0000033333000000',
  '0007333333337000',
  '0000733333370000',
  '0000233333320000',
];
const BODY_ROBE_F = [
  '0000033333000000',
  '0000333333300000',
  '0003333333330000',
  '0002333333332000',
];

// Legs & shoes — rows 14-15
const LEGS_NORMAL = [
  '0000004444000000',
  '0000004004000000',
];
const SHOES_BOOTS = [
  '0000005555000000',
  '0000005005000000',
];
const SHOES_SANDALS = [
  '0000005555000000',
  '0000000550000000',
];
const SHOES_HEAVY = [
  '0000055555000000',
  '0000055005500000',
];

// Helper: parse string grid into number grid
function parseGrid(lines) {
  return lines.map(line => line.split('').map(Number));
}

// Build a full 16x16 sprite from character options
function generateCharSprite(opts) {
  const g = opts.gender || 'male';
  const isF = g === 'female';
  const rows = Array.from({length:16}, () => Array(16).fill(0));

  // Hair (rows 0-4)
  const hairMap = { short: HAIR_SHORT, spiky: HAIR_SPIKY, long: isF ? HAIR_LONG_F : HAIR_LONG };
  const hairData = parseGrid(hairMap[opts.hair] || HAIR_SHORT);
  for (let y = 0; y < hairData.length; y++)
    for (let x = 0; x < 16; x++) if (hairData[y][x] === 2) rows[y][x] = 2;

  // Head (rows 5-9)
  const headData = parseGrid(isF ? HEAD_FEMALE : HEAD_MALE);
  for (let y = 0; y < headData.length; y++)
    for (let x = 0; x < 16; x++) if (headData[y][x] !== 0) rows[5 + y][x] = headData[y][x];

  // Female long hair extends to sides of head
  if (isF && (opts.hair === 'long')) {
    for (let y = 5; y <= 11; y++) {
      // Find leftmost and rightmost face pixel
      let left = 16, right = 0;
      for (let x = 0; x < 16; x++) if (rows[y][x] === 1) { left = Math.min(left, x); right = Math.max(right, x); }
      if (left < 16) { rows[y][left - 1] = 2; rows[y][right + 1] = 2; }
    }
  }

  // Body (rows 10-13)
  const bodyMap = { tshirt: isF ? BODY_TSHIRT_F : BODY_TSHIRT, armor: isF ? BODY_ARMOR_F : BODY_ARMOR, robe: isF ? BODY_ROBE_F : BODY_ROBE };
  const bodyData = parseGrid(bodyMap[opts.outfit] || BODY_TSHIRT);
  for (let y = 0; y < bodyData.length; y++)
    for (let x = 0; x < 16; x++) if (bodyData[y][x] !== 0) rows[10 + y][x] = bodyData[y][x];

  // Legs (rows 14-15)
  const legsData = parseGrid(LEGS_NORMAL);
  for (let y = 0; y < legsData.length; y++)
    for (let x = 0; x < 16; x++) if (legsData[y][x] !== 0) rows[14 + y][x] = legsData[y][x];

  // Shoes (row 15 override)
  const shoesMap = { boots: SHOES_BOOTS, sandals: SHOES_SANDALS, heavy: SHOES_HEAVY };
  const shoesData = parseGrid(shoesMap[opts.shoes] || SHOES_BOOTS);
  for (let x = 0; x < 16; x++) if (shoesData[0][x] !== 0) rows[14][x] = shoesData[0][x];
  if (shoesData[1]) for (let x = 0; x < 16; x++) if (shoesData[1][x] !== 0) rows[15][x] = shoesData[1][x];

  // Build color map
  const skin = opts.skin || '#f5c49c';
  const skinDark = darken(skin, 0.15);
  const colors = {
    0: null,
    1: skin,       // skin
    2: opts.hairColor || '#5a3825',  // hair
    3: opts.outfitColor || '#2d7a3a', // outfit
    4: _PANTS,     // pants
    5: '#4a3728',  // shoes
    6: _EYES,      // eyes
    7: skin,       // hands
    8: skinDark,   // nose
    9: _MOUTH,     // mouth
  };
  return { grid: rows, colors };
}

// Simple darken helper
function darken(hex, amount) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return '#' + [r,g,b].map(c => Math.max(0, Math.floor(c * (1 - amount))).toString(16).padStart(2,'0')).join('');
}

function renderCharSprite(canvas, opts) {
  if (!canvas) return;
  const { grid, colors } = generateCharSprite(opts);
  const ctx = canvas.getContext('2d');
  canvas.width = 16; canvas.height = 16;
  ctx.clearRect(0, 0, 16, 16);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const c = colors[grid[y][x]];
      if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
    }
}

// Monster sprites
const MONSTER_DEFAULT = [
  [0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0],
  [0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0],
  [0,0,0,0,4,4,6,4,4,6,4,4,0,0,0,0],
  [0,0,0,0,4,4,4,4,4,4,4,4,0,0,0,0],
  [0,0,0,0,4,4,4,4,4,4,4,4,0,0,0,0],
  [0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0],
  [0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0],
  [0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0],
  [0,0,0,0,4,4,4,4,4,4,4,4,0,0,0,0],
  [0,0,0,0,4,4,4,4,4,4,4,4,0,0,0,0],
  [0,0,0,0,0,4,4,0,0,4,4,0,0,0,0,0],
  [0,0,0,0,0,4,4,0,0,4,4,0,0,0,0,0],
  [0,0,0,0,4,4,4,0,0,4,4,4,0,0,0,0],
  [0,0,0,0,4,4,4,0,0,4,4,4,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const MONSTER_BOSS = [
  [0,0,0,0,0,0,4,4,4,4,4,4,0,0,0,0],
  [0,0,0,0,0,4,4,4,4,4,4,4,4,0,0,0],
  [0,0,0,0,4,4,6,4,4,4,6,4,4,0,0,0],
  [0,0,0,0,4,4,4,4,4,4,4,4,4,0,0,0],
  [0,0,0,0,4,4,4,4,4,4,4,4,4,0,0,0],
  [0,0,0,0,4,4,4,4,4,4,4,4,4,0,0,0],
  [0,0,0,0,0,4,4,4,4,4,4,4,0,0,0,0],
  [0,0,0,0,0,4,4,4,4,4,4,4,0,0,0,0],
  [0,0,0,0,4,4,4,4,4,4,4,4,4,4,0,0],
  [0,0,0,0,4,4,4,4,4,4,4,4,4,4,0,0],
  [0,0,0,4,4,4,4,4,4,4,4,4,4,4,0,0],
  [0,0,0,0,4,4,0,0,0,0,4,4,0,0,0,0],
  [0,0,0,0,4,4,0,0,0,0,4,4,0,0,0,0],
  [0,0,0,4,4,4,0,0,0,0,4,4,4,0,0,0],
  [0,0,0,4,4,4,0,0,0,0,4,4,4,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const MONSTER_COLORS = { 0:null, 4:'#5a2d2d', 6:'#ff4444' };

function renderGenderPreviews() {
  renderCharSprite($('creation-canvas'), charOpts);
}

/* ====== BATTLE ANIMATION STATE ====== */
let battleAnim = {
  hunterX:0, hunterY:0, monsterX:0, monsterY:0,
  hunterBaseX:100, monsterBaseX:0, hunterBaseY:0, monsterBaseY:0,
  damageNumbers:[], hunterFlash:0, monsterShake:0, monsterFlash:0,
  hunterAttackT:0, attackActive:false, particles:[], flashOverlay:0, flashColor:'#fff',
};
let battleAnimFrame = null;

/* ====== COSMETIC DEFINITIONS ====== */
const COSMETIC_DEFS = [
  { id:'hat_warrior', name:'Topi Petarung', icon:'🎩', rarity:'Langka', desc:'Topi kulit petarung.' },
  { id:'hat_wizard', name:'Topi Penyihir', icon:'🧙', rarity:'Epik', desc:'Topi tinggi penyihir.' },
  { id:'hat_helm', name:'Helm Zirah', icon:'⛑️', rarity:'Legendaris', desc:'Helm baja sejati.' },
  { id:'hat_crown', name:'Mahkota Dewa', icon:'👑', rarity:'Mitos', desc:'Mahkota emas.' },
  { id:'hat_halo', name:'Halo Ilahi', icon:'😇', rarity:'Transenden', desc:'Halo keabadian.' },
  { id:'weapon_sword', name:'Pedang', icon:'🗡️', rarity:'Langka', desc:'Pedang terpasang.' },
  { id:'weapon_staff', name:'Tongkat Sihir', icon:'🪄', rarity:'Epik', desc:'Tongkat bersinar.' },
  { id:'weapon_scythe', name:'Sabit Kematian', icon:'⚔️', rarity:'Legendaris', desc:'Sabit menebas.' },
];

/* ====== API ====== */
async function api(path, { method='GET', body, auth=false } = {}) {
  const headers = { 'Content-Type':'application/json' };
  if (auth && TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 304) return null;
  let data = null; try { data = await res.json(); } catch(e) {}
  if (!res.ok) { const err = new Error((data && data.error) || 'Terjadi kesalahan.'); err.status = res.status; throw err; }
  return data;
}

/* ====== EMBERS ====== */
function spawnEmbers() {
  const host = $('embers'); if (!host) return; host.innerHTML = '';
  for (let i = 0; i < 20; i++) {
    const e = document.createElement('div'); e.className = 'ember';
    const s = Math.floor(Math.random()*3)+2;
    e.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}vw;--dx:${Math.random()*80-40}px;color:${Math.random()>0.5?'#5eead4':'#a78bfa'};animation:drift ${10+Math.random()*12}s linear ${Math.random()*10}s infinite`;
    host.appendChild(e);
  }
}
spawnEmbers();

/* ====== THEME ====== */
function getTheme() { return localStorage.getItem('ga_theme') || 'dark'; }
function setTheme(t) { document.body.setAttribute('data-theme',t); localStorage.setItem('ga_theme',t); document.querySelectorAll('.theme-opt').forEach(b=>b.classList.toggle('active',b.dataset.theme===t)); }
setTheme(getTheme());
$('btn-settings-main')?.addEventListener('click',()=>$('settings-overlay')?.classList.remove('hidden'));
$('btn-settings-nav')?.addEventListener('click',()=>$('settings-overlay')?.classList.remove('hidden'));
$('btn-settings-close')?.addEventListener('click',()=>$('settings-overlay')?.classList.add('hidden'));
document.querySelectorAll('.theme-opt').forEach(b=>b.addEventListener('click',()=>setTheme(b.dataset.theme)));

/* ====== SCREEN MANAGEMENT ====== */
const mainMenu=$('main-menu'), authScreen=$('auth-screen'), creationScreen=$('creation-screen'), appEl=$('app'), appHeader=$('app-header'), navLoggedIn=$('nav-loggedin'), navUsername=$('nav-username');

function showMainMenu(){ mainMenu?.classList.remove('hidden'); authScreen?.classList.add('hidden'); creationScreen?.classList.add('hidden'); appEl?.classList.add('hidden'); appHeader?.classList.add('hidden'); document.body.classList.add('menu-open'); }
function showAuth(){ mainMenu?.classList.add('hidden'); authScreen?.classList.remove('hidden'); creationScreen?.classList.add('hidden'); appEl?.classList.add('hidden'); appHeader?.classList.remove('hidden'); document.body.classList.remove('menu-open'); }
function showCreation(){ mainMenu?.classList.add('hidden'); authScreen?.classList.add('hidden'); creationScreen?.classList.remove('hidden'); appEl?.classList.add('hidden'); appHeader?.classList.remove('hidden'); document.body.classList.remove('menu-open'); renderGenderPreviews(); }

$('btn-start-game')?.addEventListener('click',()=>{ if(TOKEN)bootAuth(); else showAuth(); });
$('btn-exit-web')?.addEventListener('click',()=>{ if(confirm('Yakin keluar?')){window.close();document.body.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:monospace;color:#888">Terima kasih!</div>';} });

/* ====== AUTH ====== */
document.querySelectorAll('.auth-tab').forEach(t=>t.addEventListener('click',()=>{
  document.querySelectorAll('.auth-tab').forEach(x=>x.classList.remove('active')); t.classList.add('active');
  $('form-login').classList.toggle('hidden',t.dataset.tab!=='login'); $('form-register').classList.toggle('hidden',t.dataset.tab!=='register');
}));

async function showApp(){
  mainMenu?.classList.add('hidden');
  document.body.classList.remove('menu-open');
  authScreen?.classList.add('hidden'); creationScreen?.classList.add('hidden');
  appHeader?.classList.remove('hidden'); navLoggedIn?.classList.remove('hidden');
  navUsername.textContent = USERNAME; loadOdds();
  await Promise.all([refreshHunter(),refreshAvatar()]);
}

$('form-login')?.addEventListener('submit',async e=>{
  e.preventDefault(); $('login-error').textContent='';
  try{const d=await api('/auth/login',{method:'POST',body:{username:$('login-username').value.trim(),password:$('login-password').value}});TOKEN=d.token;USERNAME=d.username;localStorage.setItem('ga_token',TOKEN);localStorage.setItem('ga_username',USERNAME);await showApp();}
  catch(err){$('login-error').textContent=err.message;}
});
$('form-register')?.addEventListener('submit',async e=>{
  e.preventDefault(); $('register-error').textContent='';
  try{const d=await api('/auth/register',{method:'POST',body:{username:$('reg-username').value.trim(),password:$('reg-password').value}});TOKEN=d.token;USERNAME=d.username;localStorage.setItem('ga_token',TOKEN);localStorage.setItem('ga_username',USERNAME);await showApp();}
  catch(err){$('register-error').textContent=err.message;}
});
$('btn-logout')?.addEventListener('click',()=>{TOKEN=null;USERNAME=null;currentHunter=null;activeBattle=null;localStorage.removeItem('ga_token');localStorage.removeItem('ga_username');$('battle-result')?.classList.remove('show');navLoggedIn?.classList.add('hidden');showMainMenu();});
$('btn-back-to-login')?.addEventListener('click',()=>showAuth());

async function bootAuth(){
  if(!TOKEN){showAuth();return;}
  try{const me=await api('/auth/me',{auth:true});if(!me||!me.username)throw new Error('Session expired');USERNAME=me.username;localStorage.setItem('ga_username',USERNAME);await showApp();}
  catch(err){TOKEN=null;USERNAME=null;localStorage.removeItem('ga_token');localStorage.removeItem('ga_username');showAuth();}
}

/* ====== CHARACTER CREATION ====== */
// Option button handlers
document.querySelectorAll('.creation-opt-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const field = btn.dataset.field;
    const value = btn.dataset.value;
    if (!field) return;
    // Toggle active within same field
    btn.closest('.creation-opt-row').querySelectorAll('.creation-opt-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    charOpts[field] = value;
    renderGenderPreviews();
  });
});

$('btn-create-character')?.addEventListener('click',async()=>{
  $('creation-error').textContent='';
  try{const h=await api('/hunters/awaken',{method:'POST',auth:true,body:{name:$('creation-name-input')?.value?.trim()||undefined,gender:charOpts.gender,characterData:charOpts}});currentHunter=h;await showApp();}
  catch(err){$('creation-error').textContent=err.message;}
});

/* ====== HUNTER STATE ====== */
async function refreshHunter(){try{currentHunter=await api('/hunters/mine',{auth:true});}catch(e){currentHunter=null;}applyHunterState();if(currentHunter)await checkActiveBattle();}
async function refreshHunterQuiet(){try{currentHunter=await api('/hunters/mine',{auth:true});if(currentHunter)renderCharacter(currentHunter);}catch(e){}}

function applyHunterState(){
  if(!currentHunter){showCreation();return;}
  appEl?.classList.remove('hidden'); $('fight-controls')?.classList.remove('hidden'); $('character-section')?.classList.remove('hidden');
  $('hero-eyebrow').textContent='— Gerbang Menanti —';
  $('hero-title').innerHTML=`Selamat datang,<br><em>${esc(currentHunter.name)}</em>`;
  $('hero-sub').textContent='Pilih peringkat Gerbang, hadapi monster, kumpulkan XP.';
  $('gate-label').textContent=`Peringkat: ${currentHunter.rank.code}`;
  populateGateSelect(currentHunter); renderCharacter(currentHunter);
}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}

/* ====== ODDS & GATE ====== */
let RANK_LIST=[];
async function loadOdds(){try{const d=await api('/odds');renderOdds(d.ranks,d.elements);populateGateSelectRanks(d.ranks);}catch(e){}}
function populateGateSelectRanks(r){RANK_LIST=r;if(currentHunter)populateGateSelect(currentHunter);}
function populateGateSelect(h){
  const sel=$('gate-rank-select');if(!sel||!RANK_LIST.length||!h)return;const pv=sel.value;sel.innerHTML='';let best=null;
  RANK_LIST.forEach(r=>{const locked=h.level<r.unlockLevel;const o=document.createElement('option');o.value=r.code;o.disabled=locked;o.textContent=locked?`🔒 ${r.code} (Lv.${r.unlockLevel})`:`Gerbang ${r.code}`;sel.appendChild(o);if(!locked)best=r.code;});
  sel.value=RANK_LIST.some(r=>r.code===pv&&h.level>=r.unlockLevel)?pv:(best||RANK_LIST[0].code);
  const hint=$('gate-lock-hint');if(h.nextGateUnlock){hint.textContent=`🔒 Gerbang ${h.nextGateUnlock.code} di Lv.${h.nextGateUnlock.level}`;hint.classList.remove('hidden');}else hint.classList.add('hidden');
}
function renderOdds(ranks,elements){
  const tR=ranks.reduce((s,r)=>s+r.weight,0),tE=elements.reduce((s,r)=>s+r.weight,0);const p=$('odds-panel');
  let h='<h4>Peluang Peringkat</h4>';ranks.forEach(r=>{const pct=(r.weight/tR)*100;h+=`<div class="odds-row"><div class="odds-badge" style="border:1px solid ${r.color};color:${r.color}">${r.code}</div><div class="odds-bar"><div class="odds-fill" style="width:${Math.max(pct,0.4)}%;background:${r.color}"></div></div><div class="odds-pct">${pct<1?pct.toFixed(2):pct.toFixed(1)}%</div></div>`;});
  h+='<h4 style="margin-top:16px">Peluang Elemen</h4>';elements.forEach(el=>{const pct=(el.weight/tE)*100;h+=`<div class="odds-row"><div class="odds-badge" style="border:1px solid ${el.color};color:${el.color};font-size:14px">${el.icon}</div><div class="odds-bar"><div class="odds-fill" style="width:${pct}%;background:${el.color}"></div></div><div class="odds-pct">${pct.toFixed(1)}%</div></div>`;});
  p.innerHTML=h;
}
$('odds-toggle')?.addEventListener('click',e=>{const p=$('odds-panel');const o=p.classList.toggle('open');e.target.setAttribute('aria-expanded',o);e.target.textContent=o?'Sembunyikan ↑':'Lihat peluang ↓';});

/* ====== HELPERS ====== */
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function addLogLine(text,cls=''){const l=$('syslog');const p=document.createElement('p');if(cls)p.className=cls;p.innerHTML=text;l.appendChild(p);return p;}

/* ====== FIGHT ====== */
$('btn-fight')?.addEventListener('click',async()=>{
  const gateRank=$('gate-rank-select').value;const btn=$('btn-fight');btn.disabled=true;btn.textContent='Gerbang Terbuka…';
  $('syslog').innerHTML='';const stg=$('gate-stage');stg.classList.add('charging');
  try{addLogLine(`[SISTEM] Memasuki Gerbang ${gateRank}&hellip;`);await sleep(700);addLogLine('[SISTEM] Anomali terdeteksi&hellip;','dim');await sleep(700);
  const state=await api('/gate/enter',{method:'POST',auth:true,body:{gateRank}});stg.classList.remove('charging');stg.classList.add('burst');await sleep(150);
  addLogLine(`[SISTEM] ${state.monster.icon} ${state.monster.name} muncul!`);stg.classList.remove('burst');await sleep(400);
  enterBattleArena(state,true);$('battle-result')?.scrollIntoView({behavior:'smooth',block:'start'});}
  catch(err){stg.classList.remove('charging');stg.classList.remove('burst');addLogLine(`[SISTEM] ${err.message}`,'dim');}
  btn.disabled=false;btn.textContent='Masuki Gerbang';
});
async function checkActiveBattle(){try{const s=await api('/gate/active',{auth:true});if(s){enterBattleArena(s,false);addLogLine('[SISTEM] Melanjutkan pertarungan&hellip;','dim');$('battle-result')?.scrollIntoView({behavior:'smooth',block:'start'});}}catch(e){}}

/* ====== BATTLE ARENA ====== */
function resetBattleLogDisplay(){$('battle-log').innerHTML='';shownLogCount=0;}
async function revealNewLogLines(state,anim){const h=$('battle-log');const nl=state.log.slice(shownLogCount);for(const l of nl){const p=document.createElement('p');p.textContent=l;h.appendChild(p);h.scrollTop=h.scrollHeight;if(anim)await sleep(260);}shownLogCount=state.log.length;}
function addBattleErrorLine(t){const h=$('battle-log');const p=document.createElement('p');p.textContent=t;p.style.color='var(--danger)';h.appendChild(p);h.scrollTop=h.scrollHeight;}
function renderWaveClearNotice(wc){const h=$('battle-log');const p=document.createElement('p');p.style.color=wc.isBoss?'var(--gold)':'#34d399';p.style.fontWeight='700';const parts=[`✓ Wave ${wc.wave} bersih! +${wc.xpGained} XP · 🪙+${wc.coinsGained}`];if(wc.itemDrop)parts.push(`🎁 ${wc.itemDrop.icon} ${wc.itemDrop.name}`);if(wc.petDrop)parts.push(wc.petDrop.alreadyOwned?'(sudah ada)':`🐾 ${wc.petDrop.icon} ${wc.petDrop.name}!`);p.textContent=parts.join(' · ');h.appendChild(p);h.scrollTop=h.scrollHeight;}

function startBattleLoop(){if(battleAnimFrame)cancelAnimationFrame(battleAnimFrame);const loop=()=>{if(activeBattle&&!activeBattle.over){renderBattleCanvas(activeBattle);battleAnimFrame=requestAnimationFrame(loop);}};battleAnimFrame=requestAnimationFrame(loop);}
function stopBattleLoop(){if(battleAnimFrame){cancelAnimationFrame(battleAnimFrame);battleAnimFrame=null;}}

function enterBattleArena(state,isFresh){
  activeBattle=state;resetBattleLogDisplay();
  ['battle-banner','battle-xp','item-drop-banner','levelup-banner','battle-continue-row'].forEach(id=>$(id)?.classList.add('hidden'));
  $('battle-actions')?.classList.remove('hidden');hideSubmenus();$('battle-result')?.classList.add('show');
  renderBattleArena(state);renderBattleCanvas(state);startBattleLoop();
  if(state.over){setBattleActionsEnabled(false);revealNewLogLines(state,isFresh).then(()=>showBattleOutcome(state));return;}
  battleBusy=true;setBattleActionsEnabled(false);
  revealNewLogLines(state,isFresh).then(()=>{battleBusy=false;if(activeBattle&&!activeBattle.over)setBattleActionsEnabled(true);});
}
function setBattleActionsEnabled(en){['act-attack','act-skill-toggle','act-item-toggle','act-flee'].forEach(id=>{if($(id))$(id).disabled=!en;});}
function hideSubmenus(){$('skill-menu')?.classList.add('hidden');$('item-menu')?.classList.add('hidden');$('act-skill-toggle')?.classList.remove('active');$('act-item-toggle')?.classList.remove('active');}
function toggleSubmenu(mId,bId){const m=$(mId);const was=!m.classList.contains('hidden');hideSubmenus();if(was)return;m.classList.remove('hidden');$(bId).classList.add('active');if(mId==='skill-menu')renderSkillMenu(activeBattle);if(mId==='item-menu')loadInventoryForBattleMenu();}

$('act-attack')?.addEventListener('click',()=>sendBattleAction('attack'));
$('act-flee')?.addEventListener('click',()=>sendBattleAction('flee'));
$('act-skill-toggle')?.addEventListener('click',()=>toggleSubmenu('skill-menu','act-skill-toggle'));
$('act-item-toggle')?.addEventListener('click',()=>toggleSubmenu('item-menu','act-item-toggle'));

function renderSkillMenu(state){const h=$('skill-menu');h.innerHTML='';state.skills.forEach((sk,i)=>{const b=document.createElement('button');b.className='submenu-item';b.disabled=sk.cooldown>0;b.innerHTML=`<span class="si-icon">✨</span><span class="si-info"><span class="si-name">${esc(sk.name)} <span style="color:${sk.rarity.color};font-size:9px">${sk.rarity.name}</span></span><span class="si-desc">${esc(sk.kindLabel)} — ${esc(sk.desc)}</span></span><span class="si-badge cd">${sk.cooldown>0?'⏳ '+sk.cooldown:'Siap'}</span>`;if(sk.cooldown===0)b.addEventListener('click',()=>sendBattleAction('skill',{skillIndex:i}));h.appendChild(b);});}
async function loadInventoryForBattleMenu(){const h=$('item-menu');h.innerHTML='<div class="submenu-empty">Memuat&hellip;</div>';try{const d=await api('/inventory/mine',{auth:true});battleInventoryCache=d.items.filter(it=>it.type==='consumable'&&it.qty>0);if(!battleInventoryCache.length){h.innerHTML='<div class="submenu-empty">Tidak ada item.</div>';return;}h.innerHTML='';battleInventoryCache.forEach(it=>{const b=document.createElement('button');b.className='submenu-item';b.innerHTML=`<span class="si-icon">${it.icon}</span><span class="si-info"><span class="si-name">${esc(it.name)}</span><span class="si-desc">${esc(it.desc)}</span></span><span class="si-badge qty">×${it.qty}</span>`;b.addEventListener('click',()=>sendBattleAction('item',{inventoryId:it.id}));h.appendChild(b);});}catch(e){h.innerHTML=`<div class="submenu-empty">Error: ${esc(e.message)}</div>`;}}

function triggerAttackAnimation(){battleAnim.attackActive=true;battleAnim.hunterAttackT=0;battleAnim.monsterFlash=12;battleAnim.damageNumbers.push({text:'-'+(Math.floor(Math.random()*30)+10),x:battleAnim.monsterX+30,y:battleAnim.monsterY-10,vy:-1.5,life:40,color:'#ff4444',size:14});}
function triggerHealAnimation(){battleAnim.damageNumbers.push({text:'+'+(Math.floor(Math.random()*20)+5),x:battleAnim.hunterX+30,y:battleAnim.hunterY-10,vy:-1.5,life:40,color:'#44ff88',size:14});battleAnim.hunterFlash=10;}
function triggerSkillAnimation(){battleAnim.monsterFlash=18;battleAnim.flashOverlay=8;battleAnim.flashColor='rgba(167,139,250,0.3)';for(let i=0;i<12;i++)battleAnim.particles.push({x:battleAnim.monsterX+36,y:battleAnim.monsterY+36,vx:(Math.random()-0.5)*4,vy:-Math.random()*3-1,life:25+Math.random()*15,color:Math.random()>0.5?'#a78bfa':'#5eead4',size:2+Math.random()*3});battleAnim.damageNumbers.push({text:'-'+(Math.floor(Math.random()*50)+20),x:battleAnim.monsterX+20,y:battleAnim.monsterY-15,vy:-2,life:50,color:'#a78bfa',size:16});}

async function sendBattleAction(action,extra){
  if(battleBusy||!activeBattle||activeBattle.over)return;battleBusy=true;setBattleActionsEnabled(false);hideSubmenus();
  try{if(action==='attack')triggerAttackAnimation();else if(action==='skill')triggerSkillAnimation();else if(action==='item')triggerHealAnimation();if(action!=='flee')await sleep(400);
  const ns=await api('/gate/action',{method:'POST',auth:true,body:Object.assign({action},extra||{})});activeBattle=ns;renderBattleArena(ns);
  if(ns.waveCleared){if(ns.hunterProfile)currentHunter=ns.hunterProfile;renderWaveClearNotice(ns.waveCleared);}await revealNewLogLines(ns,true);
  if(ns.over){await sleep(250);showBattleOutcome(ns);}}catch(e){addBattleErrorLine(`[SISTEM] ${e.message}`);}
  finally{battleBusy=false;if(activeBattle&&!activeBattle.over)setBattleActionsEnabled(true);}
}

function renderStatusChips(statuses){const h=$('battle-statuses');if(!h)return;h.innerHTML='';(statuses||[]).forEach(st=>{const s=document.createElement('span');if(st.type==='dot'){s.className='status-chip dot';s.textContent=`☠ ${st.amount}/gil (${st.turnsLeft})`;}else{const b=st.amount>0;s.className='status-chip '+(b?'buff':'debuff');s.textContent=`${b?'▲':'▼'} ${st.stat} ${b?'+':''}${st.amount} (${st.turnsLeft})`;}h.appendChild(s);});}

function renderBattleArena(state){
  $('battle-turn-display').textContent=`Giliran ${state.turnNo}`;
  $('hud-hunter-name').textContent=currentHunter?currentHunter.name:'Pemburu';
  $('hud-hunter-hp').textContent=`${Math.max(0,state.hunter.hp)} / ${state.hunter.maxHp}`;
  const hp=Math.max(0,Math.min(100,(state.hunter.hp/state.hunter.maxHp)*100));const hf=$('hud-hunter-hp-fill');hf.style.width=hp+'%';hf.classList.toggle('low',hp<=25);
  $('hud-monster-name').textContent=`${state.monster.name} (${state.monster.gateRank})`;
  $('hud-monster-hp').textContent=`${Math.max(0,state.monster.hp)} / ${state.monster.maxHp}`;
  const mp=Math.max(0,Math.min(100,(state.monster.hp/state.monster.maxHp)*100));const mf=$('hud-monster-hp-fill');mf.style.width=mp+'%';mf.classList.toggle('low',mp<=25);
  renderStatusChips((state.statuses.hunter||[]).concat(state.statuses.monster||[]));
}

/* ====== BATTLE CANVAS ====== */
function renderBattleCanvas(state){
  if(!state||!state.monster)return;const canvas=$('battle-canvas');if(!canvas)return;const ctx=canvas.getContext('2d');
  const W=800,H=280;canvas.width=W;canvas.height=H;const isDark=getTheme()!=='light';
  const spSz=80,isBoss=state.monster.isBoss,mSpSz=isBoss?96:72;
  battleAnim.hunterBaseX=100;battleAnim.hunterBaseY=H*0.35-5;battleAnim.monsterBaseX=W-110-mSpSz;battleAnim.monsterBaseY=H*0.35-(isBoss?10:0);
  if(battleAnim.attackActive){battleAnim.hunterAttackT+=0.08;if(battleAnim.hunterAttackT>=1){battleAnim.attackActive=false;battleAnim.hunterAttackT=0;}}
  if(battleAnim.monsterFlash>0)battleAnim.monsterFlash--;if(battleAnim.hunterFlash>0)battleAnim.hunterFlash--;if(battleAnim.monsterShake>0)battleAnim.monsterShake--;if(battleAnim.flashOverlay>0)battleAnim.flashOverlay--;
  battleAnim.damageNumbers=battleAnim.damageNumbers.filter(d=>{d.y+=d.vy;d.life--;return d.life>0;});
  battleAnim.particles=battleAnim.particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.08;p.life--;return p.life>0;});
  let hx=battleAnim.hunterBaseX,hy=battleAnim.hunterBaseY,mx=battleAnim.monsterBaseX,my=battleAnim.monsterBaseY;
  if(battleAnim.attackActive){const t=battleAnim.hunterAttackT;const ease=t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;const p=t<0.5?ease*2:2-ease*2;hx+=(W*0.28-battleAnim.hunterBaseX)*Math.min(1,p);}
  if(battleAnim.monsterShake>0){mx+=(Math.random()-0.5)*6;my+=(Math.random()-0.5)*4;}
  battleAnim.hunterX=hx;battleAnim.hunterY=hy;battleAnim.monsterX=mx;battleAnim.monsterY=my;
  // Sky
  const sg=ctx.createLinearGradient(0,0,0,H*0.6);sg.addColorStop(0,isDark?'#080c18':'#b0b8d0');sg.addColorStop(1,isDark?'#0c1020':'#c0c8e0');ctx.fillStyle=sg;ctx.fillRect(0,0,W,H*0.6);
  if(isDark){ctx.fillStyle='rgba(255,255,255,0.5)';for(let i=0;i<40;i++){ctx.globalAlpha=(Math.sin(Date.now()*0.002+i)*0.3+0.7)*0.6;ctx.fillRect((i*137+50)%W,(i*89+20)%(H*0.55),1,1);}ctx.globalAlpha=1;}
  // Ground
  const gg=ctx.createLinearGradient(0,H*0.58,0,H);gg.addColorStop(0,isDark?'#162012':'#8aa070');gg.addColorStop(1,isDark?'#0c1008':'#6a7a50');ctx.fillStyle=gg;ctx.fillRect(0,H*0.58,W,H*0.42);
  ctx.strokeStyle=isDark?'rgba(94,234,212,0.12)':'rgba(13,148,136,0.15)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,H*0.6);ctx.lineTo(W,H*0.6);ctx.stroke();
  ctx.fillStyle=isDark?'rgba(94,234,212,0.06)':'rgba(13,148,136,0.1)';for(let i=0;i<12;i++)ctx.fillRect((i*73+20)%W,H*0.62+(i*17%25),3+(i%3),2);
  // Hunter
  const hOpts = currentHunter?.characterData || charOpts;
  const {grid:hGrid, colors:hColors} = generateCharSprite(hOpts);
  ctx.fillStyle='rgba(0,0,0,0.25)';ctx.beginPath();ctx.ellipse(hx+spSz/2,hy+spSz+4,spSz*0.3,5,0,0,Math.PI*2);ctx.fill();
  ctx.imageSmoothingEnabled=false;
  // Draw hunter pixel by pixel
  for(let y=0;y<hGrid.length;y++)for(let x=0;x<(hGrid[y]||[]).length;x++){const c=hColors[hGrid[y][x]];if(!c)continue;ctx.fillStyle=c;ctx.fillRect(hx+x*(spSz/16),hy+y*(spSz/16),spSz/16+0.5,spSz/16+0.5);}
  ctx.shadowColor=isDark?'rgba(94,234,212,0.5)':'rgba(13,148,136,0.4)';ctx.shadowBlur=14;ctx.strokeStyle=isDark?'rgba(94,234,212,0.25)':'rgba(13,148,136,0.2)';ctx.lineWidth=1;ctx.strokeRect(hx+6,hy+6,spSz-12,spSz-12);ctx.shadowBlur=0;
  if(battleAnim.hunterFlash>0){ctx.fillStyle='rgba(251,113,133,'+(battleAnim.hunterFlash/12*0.4)+')';ctx.fillRect(hx,hy,spSz,spSz);}
  // Monster
  const mGrid=isBoss?MONSTER_BOSS:MONSTER_DEFAULT;
  ctx.fillStyle='rgba(0,0,0,0.25)';ctx.beginPath();ctx.ellipse(mx+mSpSz/2,my+mSpSz+4,mSpSz*0.3,5,0,0,Math.PI*2);ctx.fill();
  for(let y=0;y<mGrid.length;y++)for(let x=0;x<(mGrid[y]||[]).length;x++){const c=MONSTER_COLORS[mGrid[y][x]];if(!c)continue;ctx.fillStyle=c;ctx.fillRect(mx+x*(mSpSz/16),my+y*(mSpSz/16),mSpSz/16+0.5,mSpSz/16+0.5);}
  ctx.shadowColor=isBoss?'rgba(251,113,133,0.6)':'rgba(251,113,133,0.35)';ctx.shadowBlur=isBoss?18:10;ctx.strokeStyle=isBoss?'rgba(251,113,133,0.35)':'rgba(251,113,133,0.2)';ctx.lineWidth=1;ctx.strokeRect(mx+6,my+6,mSpSz-12,mSpSz-12);ctx.shadowBlur=0;
  if(battleAnim.monsterFlash>0){ctx.fillStyle='rgba(255,255,255,'+(battleAnim.monsterFlash/18*0.5)+')';ctx.fillRect(mx,my,mSpSz,mSpSz);}
  // Attack line
  if(battleAnim.attackActive&&battleAnim.hunterAttackT>0.3&&battleAnim.hunterAttackT<0.7){const la=Math.sin((battleAnim.hunterAttackT-0.3)/0.4*Math.PI);ctx.strokeStyle='rgba(94,234,212,'+(la*0.6)+')';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(hx+spSz,hy+spSz*0.5);ctx.lineTo(mx,my+mSpSz*0.5);ctx.stroke();for(let i=0;i<3;i++){ctx.fillStyle='rgba(94,234,212,'+(la*0.8)+')';ctx.fillRect(hx+spSz+(mx-hx-spSz)*Math.random(),hy+spSz*0.3+Math.random()*spSz*0.4,2,2);}}
  // Particles & damage
  battleAnim.particles.forEach(p=>{ctx.fillStyle=p.color;ctx.globalAlpha=Math.min(1,p.life/10);ctx.fillRect(p.x,p.y,p.size,p.size);});ctx.globalAlpha=1;
  battleAnim.damageNumbers.forEach(d=>{const a=Math.min(1,d.life/15);ctx.font='bold '+d.size+'px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='rgba(0,0,0,'+(a*0.5)+')';ctx.fillText(d.text,d.x+1,d.y+1);ctx.fillStyle=d.color;ctx.globalAlpha=a;ctx.fillText(d.text,d.x,d.y);ctx.globalAlpha=1;});
  if(battleAnim.flashOverlay>0){ctx.fillStyle=battleAnim.flashColor;ctx.fillRect(0,0,W,H);}
  // VS
  ctx.fillStyle=isDark?'rgba(167,139,250,0.12)':'rgba(124,58,237,0.08)';ctx.beginPath();ctx.arc(W/2,H*0.5,24,0,Math.PI*2);ctx.fill();
  ctx.font='bold 14px Cinzel,serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=isDark?'rgba(167,139,250,0.5)':'rgba(124,58,237,0.4)';ctx.fillText('VS',W/2,H*0.5);
  ctx.font='9px "JetBrains Mono",monospace';ctx.fillStyle=isDark?'rgba(94,234,212,0.4)':'rgba(13,148,136,0.4)';ctx.fillText(`Gerbang ${state.gateRank} · Wave ${state.wave}/${state.maxWave}`,W/2,H*0.5+18);
}

function showBattleOutcome(state){
  stopBattleLoop();renderBattleArena(state);renderBattleCanvas(state);$('battle-actions')?.classList.add('hidden');hideSubmenus();
  const L={menang:'⚔ Kemenangan!',kalah:'✕ Mundur',kabur:'🏃 Kabur'},C={menang:'win',kalah:'lose',kabur:'flee'};
  const r=state.outcome?state.outcome.result:'kalah';const b=$('battle-banner');b.textContent=L[r]||'';b.className='battle-banner '+(C[r]||'');b.classList.remove('hidden');
  const xp=$('battle-xp');if(typeof state.xpGained==='number'){xp.innerHTML=`+<b>${state.xpGained}</b> XP${state.coinsGained>0?' · 🪙+'+state.coinsGained:''}`;xp.classList.remove('hidden');}else xp.classList.add('hidden');
  const dl=$('item-drop-banner');if(state.itemDrop){const c=RARITY_COLOR[state.itemDrop.rarity]||'var(--arcane)';dl.innerHTML=`🎁 <b>${state.itemDrop.icon} ${esc(state.itemDrop.name)}</b> <span style="color:${c}">(${state.itemDrop.rarity})</span>`;dl.classList.remove('hidden');}else dl.classList.add('hidden');
  const lv=$('levelup-banner');if(state.leveledUp){lv.textContent=`🎉 Naik ${state.levelsGained} Level! Lv.${state.hunterProfile.level}`;lv.classList.remove('hidden');}else lv.classList.add('hidden');
  $('battle-continue-row')?.classList.remove('hidden');if(state.hunterProfile){currentHunter=state.hunterProfile;renderCharacter(currentHunter);}
}
$('btn-battle-continue')?.addEventListener('click',()=>{stopBattleLoop();activeBattle=null;$('battle-result')?.classList.remove('show');$('battle-actions')?.classList.remove('hidden');if(currentHunter)populateGateSelect(currentHunter);$('gate-stage')?.scrollIntoView({behavior:'smooth',block:'start'});});

/* ====== CHARACTER SHEET ====== */
function renderCharacter(h){
  if(!h)return;$('lic-id').textContent='PB-'+h.id+' · LISENSI PEMBURU';$('lic-name').textContent=h.name;$('lic-title').textContent='"'+h.title+'"';
  $('lic-class').innerHTML=`<span class="ic">${h.class.icon}</span>${h.class.name}`;$('lic-element').innerHTML=`<span class="ic">${h.element.icon}</span>${h.element.name}`;
  $('lic-level-pill').innerHTML=`<span class="level-pill">Lv. ${h.level}</span>`;$('lic-gender').textContent=h.gender==='female'?'👩 Perempuan':'👨 Laki-laki';
  $('lic-power').textContent=h.power.toLocaleString('id-ID');$('lic-coins').textContent=(h.coins||0).toLocaleString('id-ID');
  const xp=Math.min(100,(h.xp/h.xpToNext)*100);$('xp-fill').style.width=xp+'%';$('xp-nums').textContent=`${h.xp} / ${h.xpToNext} XP`;
  const re=$('lic-rank');re.textContent=h.rank.code;re.className='rank-badge'+(h.rank.code==='SSS'?' sss':'');re.style.setProperty('--rankcolor',h.rank.color);re.style.setProperty('--rankglow2',h.rank.color+'55');
  const le=$('license');le.className='license'+(h.rank.code==='SSS'?' sss':'');le.style.setProperty('--rankglow',h.rank.color+'22');
  $('points-banner-host').innerHTML=h.statPoints>0?`<div class="points-banner"><div class="msg">Kamu punya <b>${h.statPoints}</b> poin stat.</div></div>`:'';
  // Char preview
  const cc=$('lic-char-canvas');if(cc){renderCharSprite(cc, h.characterData || {gender:h.gender, hair:'short', hairColor:'#5a3825', skin:'#f5c49c', outfit:'tshirt', outfitColor:'#2d7a3a', shoes:'boots'});}
  // Cosmetics
  const cos=$('lic-cosmetics');cos.innerHTML='';(h.equippedCosmetics||[]).forEach(ci=>{const d=COSMETIC_DEFS.find(c=>c.id===ci);if(!d)return;const b=document.createElement('span');b.className='cosmetic-badge equipped';b.textContent=`${d.icon} ${d.name}`;cos.appendChild(b);});
  const ab=document.createElement('span');ab.className='cosmetic-badge';ab.textContent=(h.equippedCosmetics||[]).length?'⚙️ Ganti':'🎨 Kosmetik';ab.addEventListener('click',openCosmeticsModal);cos.appendChild(ab);
  // Stats
  const sg=$('lic-stats');sg.innerHTML='';STAT_NAMES.forEach(n=>{const v=h.stats[n];const e=h.effectiveStats?h.effectiveStats[n]:v;const r=document.createElement('div');r.className='stat-alloc-row';r.innerHTML=`<div class="stat-name">${n}</div><div class="stat-val">${v}${e!==v?` <span style="color:var(--mana);font-size:10px">→${e}</span>`:''}</div><button class="stat-plus" data-stat="${n}" ${h.statPoints>0?'':'disabled'}>+</button>`;sg.appendChild(r);});
  sg.querySelectorAll('.stat-plus').forEach(b=>b.addEventListener('click',()=>allocStat(b.dataset.stat)));
  renderEquipSlots(h.equipment,'lic-equip-slots',true);
  const sk=$('lic-skills');sk.innerHTML='';h.skills.forEach(s=>{const r=document.createElement('div');r.className='skill';r.innerHTML=`<span class="sn">${s.name}</span><span class="sr" style="background:${s.rarity.color}22;color:${s.rarity.color};border:1px solid ${s.rarity.color}55">${s.rarity.name}</span>`;sk.appendChild(r);});
}
async function allocStat(stat){try{const u=await api('/hunters/allocate',{method:'POST',auth:true,body:{stat}});currentHunter=u;renderCharacter(u);}catch(e){}}

/* ====== EQUIPMENT & INVENTORY ====== */
function renderEquipSlots(eq,hid,click){const h=$(hid);if(!h)return;h.innerHTML='';['weapon','armor','accessory'].forEach(s=>{const it=eq?eq[s]:null;const b=document.createElement('div');b.className='equip-slot '+(it?'filled':'empty');if(it)b.style.setProperty('--slotcolor',RARITY_COLOR[it.rarity]||'');b.innerHTML=`<div class="es-icon">${it?it.icon:SLOT_ICONS[s]}</div><div class="es-label">${SLOT_LABELS[s]}</div><div class="es-name">${it?esc(it.name):'Kosong'}</div>`;if(click)b.addEventListener('click',openInventoryModal);h.appendChild(b);});}
async function openInventoryModal(){openModal('inventory-overlay');const h=$('inventory-list');h.innerHTML='<div class="list-empty">Memuat&hellip;</div>';try{const d=await api('/inventory/mine',{auth:true});renderEquipSlots(d.equipped,'inv-equip-slots',false);renderInvList(d.items);}catch(e){h.innerHTML=`<div class="list-empty">Error: ${esc(e.message)}</div>`;}}
function renderInvList(items){const h=$('inventory-list');if(!items?.length){h.innerHTML='<div class="list-empty">Kosong.</div>';return;}h.innerHTML='';items.forEach(it=>{const r=document.createElement('div');r.className='list-item';r.style.cursor='default';const rc=RARITY_COLOR[it.rarity]||'var(--text-muted)';let a=it.type==='equipment'?(it.equipped?`<button class="mini-btn" data-unequip="${it.slot}">Lepas</button>`:`<button class="mini-btn primary" data-equip="${it.id}">Pakai</button>`):`<span style="font-size:10.5px;color:var(--text-muted)">×${it.qty}</span>`;r.innerHTML=`<div class="list-badge" style="--c:${rc}">${it.icon}</div><div class="list-info"><div class="rn">${esc(it.name)} <span style="color:${rc}">— ${it.rarity}</span></div><div class="rm">${esc(it.desc)}</div></div><div>${a}</div>`;h.appendChild(r);});
  h.querySelectorAll('[data-equip]').forEach(b=>b.addEventListener('click',async()=>{try{await api('/inventory/equip',{method:'POST',auth:true,body:{inventoryId:Number(b.dataset.equip)}});await openInventoryModal();await refreshHunterQuiet();}catch(e){$('inventory-error').textContent=e.message;}}));
  h.querySelectorAll('[data-unequip]').forEach(b=>b.addEventListener('click',async()=>{try{await api('/inventory/unequip',{method:'POST',auth:true,body:{slot:b.dataset.unequip}});await openInventoryModal();await refreshHunterQuiet();}catch(e){$('inventory-error').textContent=e.message;}}));}
$('btn-inventory')?.addEventListener('click',openInventoryModal);$('inventory-close')?.addEventListener('click',()=>closeModal('inventory-overlay'));

/* ====== SHOP ====== */
let shopTI=null,shopRA=null;
async function openShopModal(){openModal('shop-overlay');$('shop-coins').textContent=(currentHunter?.coins||0).toLocaleString('id-ID');const h=$('shop-list');h.innerHTML='<div class="list-empty">Memuat&hellip;</div>';try{const d=await api('/shop',{auth:true});shopRA=new Date(d.refreshesAt).getTime();startShopCD();renderShop(d.items);}catch(e){h.innerHTML=`<div class="list-empty">Error: ${esc(e.message)}</div>`;}}
function startShopCD(){if(shopTI)clearInterval(shopTI);const tick=()=>{const el=$('shop-timer');if(!shopRA){el.textContent='--:--';return;}const r=shopRA-Date.now();if(r<=0){el.textContent='Merefresh…';if($('shop-overlay')?.classList.contains('open'))openShopModal();return;}el.textContent=`Refresh ${String(Math.floor(r/60000)).padStart(2,'0')}:${String(Math.floor((r%60000)/1000)).padStart(2,'0')}`;};tick();shopTI=setInterval(tick,1000);}
function renderShop(items){const h=$('shop-list');if(!items?.length){h.innerHTML='<div class="list-empty">Kosong.</div>';return;}const c=currentHunter?.coins||0;h.innerHTML='';items.forEach(it=>{const rc=RARITY_COLOR[it.rarity]||'var(--text-muted)';const r=document.createElement('div');r.className='list-item';r.style.cursor='default';r.innerHTML=`<div class="list-badge" style="--c:${rc}">${it.icon}</div><div class="list-info"><div class="rn">${esc(it.name)} <span style="color:${rc}">— ${it.rarity}</span></div><div class="rm">${esc(it.desc||'')}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px"><span class="shop-item-price">🪙 ${it.price.toLocaleString('id-ID')}</span><button class="mini-btn primary" data-buy="${it.key}" ${c>=it.price?'':'disabled'}>Beli</button></div>`;h.appendChild(r);});
  h.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',async()=>{try{const d=await api('/shop/buy',{method:'POST',auth:true,body:{itemKey:b.dataset.buy}});if(currentHunter)currentHunter.coins=d.coins;$('shop-coins').textContent=d.coins.toLocaleString('id-ID');$('lic-coins').textContent=d.coins.toLocaleString('id-ID');await openShopModal();}catch(e){$('shop-error').textContent=e.message;}}));}
$('btn-shop')?.addEventListener('click',openShopModal);$('shop-close')?.addEventListener('click',()=>{closeModal('shop-overlay');if(shopTI){clearInterval(shopTI);shopTI=null;}});
$('btn-copy')?.addEventListener('click',()=>{if(!currentHunter)return;const h=currentHunter;navigator.clipboard.writeText(`⟡ LISENSI ⟡\n${h.name} "${h.title}"\nLv.${h.level} | ${h.rank.code} | ${h.class.name} | ${h.element.name}\nHP ${h.stats.HP} ATK ${h.stats.ATK} DEF ${h.stats.DEF} AGI ${h.stats.AGI} INT ${h.stats.INT} LUK ${h.stats.LUK}\nPower: ${h.power}`).then(()=>{$('btn-copy').textContent='Tersalin ✓';setTimeout(()=>$('btn-copy').textContent='Salin',1500);}).catch(()=>{});});
$('btn-reset-char')?.addEventListener('click',async()=>{if(!confirm('Reset karakter? Semua progress hilang.'))return;try{await api('/hunters/mine',{method:'DELETE',auth:true});currentHunter=null;activeBattle=null;localStorage.removeItem('ga_gender');$('battle-result')?.classList.remove('show');$('gate-rank-select').innerHTML='';showCreation();}catch(e){}});

/* ====== MODALS ====== */
function openModal(id){$(id)?.classList.add('open');}function closeModal(id){$(id)?.classList.remove('open');}
$('btn-leaderboard')?.addEventListener('click',async()=>{openModal('leaderboard-overlay');const l=$('leaderboard-list');l.innerHTML='<div class="list-empty">Memuat&hellip;</div>';try{const b=await api('/leaderboard');const s=$('leaderboard-summary');if(!b.length){s.innerHTML='';l.innerHTML='<div class="list-empty">Kosong.</div>';return;}s.innerHTML=`<div><strong>${b.length}</strong>Pemburu</div>`;l.innerHTML='';b.forEach((h,i)=>{const r=document.createElement('div');r.className='list-item';r.style.cursor='default';r.innerHTML=`<div class="list-rank-num">#${i+1}</div><div class="list-badge" style="--c:${h.rank.color}">${h.rank.code}</div><div class="list-info"><div class="rn">${h.name}</div><div class="rm">Lv.${h.level} · ${h.class.name} · ${h.power.toLocaleString('id-ID')}</div></div>`;l.appendChild(r);});}catch(e){l.innerHTML=`<div class="list-empty">Error</div>`;}});
$('leaderboard-close')?.addEventListener('click',()=>closeModal('leaderboard-overlay'));
$('btn-roster')?.addEventListener('click',async()=>{openModal('roster-overlay');const l=$('roster-list');l.innerHTML='<div class="list-empty">Memuat&hellip;</div>';$('roster-summary').innerHTML='';try{const b=await api('/battles/mine',{auth:true});const s=$('roster-summary');if(!b.length){s.innerHTML='';l.innerHTML='<div class="list-empty">Belum ada.</div>';return;}const w=b.filter(x=>x.result==='menang').length;s.innerHTML=`<div><strong>${b.length}</strong>Pertarungan</div><div><strong style="color:#34d399">${w}</strong>Menang</div>`;l.innerHTML='';b.forEach(x=>{const r=document.createElement('div');r.className='list-item';r.style.cursor='default';const c=x.result==='menang'?'#34d399':x.result==='kabur'?'#7d7fa0':'#fb7185';r.innerHTML=`<div class="list-badge" style="--c:${c}">${x.monsterIcon}</div><div class="list-info"><div class="rn">${x.monsterName} <span style="color:${c}">— ${x.result}</span></div><div class="rm">Gerbang ${x.gateRank} · +${x.xpGained} XP · ${new Date(x.date).toLocaleDateString('id-ID',{day:'numeric',month:'short'})}</div></div>`;l.appendChild(r);});}catch(e){l.innerHTML=`<div class="list-empty">Error</div>`;}});
$('roster-close')?.addEventListener('click',()=>closeModal('roster-overlay'));

/* ====== GACHA ====== */
$('btn-gacha')?.addEventListener('click',async()=>{$('gacha-error').textContent='';['gacha-weapon-result','gacha-skill-result','gacha-cosmetic-result'].forEach(id=>$(id).innerHTML='');$('gacha-coins').textContent=(currentHunter?.coins||0).toLocaleString('id-ID');openModal('gacha-overlay');if(currentHunter?.pendingSkill)renderPendingSkill(currentHunter.pendingSkill,currentHunter.skills);});
$('gacha-close')?.addEventListener('click',()=>closeModal('gacha-overlay'));
$('btn-pull-weapon')?.addEventListener('click',async()=>{$('gacha-error').textContent='';try{const d=await api('/gacha/weapon',{method:'POST',auth:true});currentHunter=d.hunter;$('gacha-coins').textContent=currentHunter.coins.toLocaleString('id-ID');renderCharacter(currentHunter);const rc=RARITY_COLOR[d.weapon.rarity]||'var(--text-muted)';$('gacha-weapon-result').innerHTML=`<div class="gacha-reveal"><div class="icon">${d.weapon.icon}</div><div class="info"><div class="n">${esc(d.weapon.name)}</div><div class="r" style="color:${rc}">${d.weapon.rarity} · +${d.weapon.amount} ${d.weapon.stat}</div></div></div>`;}catch(e){$('gacha-error').textContent=e.message;}});
$('btn-pull-skill')?.addEventListener('click',async()=>{$('gacha-error').textContent='';try{const d=await api('/gacha/skill',{method:'POST',auth:true});currentHunter=d.hunter;$('gacha-coins').textContent=currentHunter.coins.toLocaleString('id-ID');renderPendingSkill(d.skill,currentHunter.skills);}catch(e){$('gacha-error').textContent=e.message;}});
function renderPendingSkill(skill,cs){const rc=RARITY_COLOR[skill.rarity.name]||'var(--text-muted)';const h=$('gacha-skill-result');h.innerHTML=`<div class="gacha-reveal" style="margin-bottom:10px"><div class="icon">📖</div><div class="info"><div class="n">${esc(skill.name)}</div><div class="r" style="color:${rc}">${skill.rarity.name}</div></div></div><p class="hint" style="margin-bottom:4px">Ganti skill:</p><div class="skill-slot-choices">${cs.map((s,i)=>`<button class="skill-slot-btn" data-as="${i}"><span>Slot ${i+1}: <b style="color:var(--text-primary)">${esc(s.name)}</b></span><span style="color:${s.rarity.color}">${s.rarity.name}</span></button>`).join('')}<button class="skill-slot-btn" id="btn-discard-skill" style="color:var(--danger);text-align:center;justify-content:center">Buang</button></div>`;h.querySelectorAll('[data-as]').forEach(b=>b.addEventListener('click',async()=>{$('gacha-error').textContent='';try{const d=await api('/gacha/skill/assign',{method:'POST',auth:true,body:{slotIndex:Number(b.dataset.as)}});currentHunter=d.hunter;renderCharacter(currentHunter);h.innerHTML='<p class="hint">Terpasang.</p>';}catch(e){$('gacha-error').textContent=e.message;}}));$('btn-discard-skill')?.addEventListener('click',async()=>{$('gacha-error').textContent='';try{const d=await api('/gacha/skill/discard',{method:'POST',auth:true});currentHunter=d.hunter;h.innerHTML='<p class="hint">Dibuang.</p>';}catch(e){$('gacha-error').textContent=e.message;}});}
$('btn-pull-cosmetic')?.addEventListener('click',async()=>{$('gacha-error').textContent='';try{const d=await api('/gacha/cosmetic',{method:'POST',auth:true});currentHunter=d.hunter;$('gacha-coins').textContent=currentHunter.coins.toLocaleString('id-ID');renderCharacter(currentHunter);const def=COSMETIC_DEFS.find(c=>c.id===d.cosmetic.id);const rc=RARITY_COLOR[d.cosmetic.rarity]||'var(--text-muted)';$('gacha-cosmetic-result').innerHTML=`<div class="gacha-reveal"><div class="icon">${def?.icon||'🎨'}</div><div class="info"><div class="n">${esc(d.cosmetic.name)}</div><div class="r" style="color:${rc}">${d.cosmetic.rarity} · ${d.cosmetic.alreadyOwned?'Sudah':'Baru!'}</div></div></div>`;}catch(e){$('gacha-error').textContent=e.message;}});

/* ====== COSMETICS ====== */
async function openCosmeticsModal(){$('cosmetics-error').textContent='';openModal('cosmetics-overlay');const h=$('cosmetics-list');h.innerHTML='<div class="list-empty">Memuat&hellip;</div>';try{const d=await api('/hunters/cosmetics',{auth:true});renderCosList(d.owned||[],d.equipped||[]);const opts=currentHunter?.characterData||{gender:currentHunter?.gender||'male',hair:'short',hairColor:'#5a3825',skin:'#f5c49c',outfit:'tshirt',outfitColor:'#2d7a3a',shoes:'boots'};renderCharSprite($('cosmetic-preview-canvas'),opts);}catch(e){h.innerHTML=`<div class="list-empty">Error: ${esc(e.message)}</div>`;}}
function renderCosList(owned,equipped){const h=$('cosmetics-list');const es=new Set(equipped);if(!owned.length){h.innerHTML='<div class="list-empty">Belum ada kosmetik.</div>';return;}h.innerHTML='';owned.forEach(ci=>{const d=COSMETIC_DEFS.find(c=>c.id===ci);if(!d)return;const isE=es.has(ci);const rc=RARITY_COLOR[d.rarity]||'var(--text-muted)';const r=document.createElement('div');r.className='list-item';r.style.cursor='default';r.innerHTML=`<div class="list-badge" style="--c:${rc}">${d.icon}</div><div class="list-info"><div class="rn">${esc(d.name)} <span style="color:${rc}">— ${d.rarity}</span></div><div class="rm">${esc(d.desc)}</div></div><div><button class="mini-btn ${isE?'':'primary'}" data-ca="${isE?'unequip':'equip'}" data-cid="${ci}">${isE?'Lepas':'Pakai'}</button></div>`;h.appendChild(r);});
  h.querySelectorAll('[data-ca]').forEach(b=>b.addEventListener('click',async()=>{try{if(b.dataset.ca==='equip')await api('/hunters/cosmetics/equip',{method:'POST',auth:true,body:{cosmeticId:b.dataset.cid}});else await api('/hunters/cosmetics/unequip',{method:'POST',auth:true,body:{cosmeticId:b.dataset.cid}});await openCosmeticsModal();await refreshHunterQuiet();}catch(e){$('cosmetics-error').textContent=e.message;}}));}
$('cosmetics-close')?.addEventListener('click',()=>closeModal('cosmetics-overlay'));

/* ====== PETS ====== */
$('btn-pets')?.addEventListener('click',async()=>{$('pets-error').textContent='';$('pet-flavor-msg')?.classList.add('hidden');openModal('pets-overlay');const h=$('pets-list');h.innerHTML='<div class="list-empty">Memuat&hellip;</div>';try{const d=await api('/pets/mine',{auth:true});renderPetsList(d.pets,d.activePetKey);}catch(e){h.innerHTML=`<div class="list-empty">Error</div>`;}});
function renderPetsList(pets,ak){const h=$('pets-list');if(!pets?.length){h.innerHTML='<div class="list-empty">Belum ada.</div>';return;}h.className='pet-grid';h.innerHTML='';pets.forEach(p=>{const a=p.key===ak;const rc=RARITY_COLOR[p.rarity]||'var(--text-muted)';const c=document.createElement('div');c.className='pet-card'+(a?' active':'');c.innerHTML=`${a?'<span class="pet-active-badge">Aktif</span>':''}<div class="pet-icon">${p.icon}</div><div class="pet-name">${esc(p.name)}</div><div class="pet-rarity" style="color:${rc}">${p.rarity}</div><div class="pet-bonus">+${p.amount} ${p.stat}</div><div class="pet-actions"><button class="mini-btn" data-pa="${a?'deactivate':'activate'}" data-pk="${p.key}">${a?'Nonaktifkan':'Aktifkan'}</button><button class="mini-btn" data-pi="${p.key}">Interaksi</button></div>`;h.appendChild(c);});
  h.querySelectorAll('[data-pa]').forEach(b=>b.addEventListener('click',async()=>{try{await api('/pets/activate',{method:'POST',auth:true,body:{petKey:b.dataset.pa==='activate'?b.dataset.pk:null}});await refreshHunter();$('btn-pets').click();}catch(e){$('pets-error').textContent=e.message;}}));
  h.querySelectorAll('[data-pi]').forEach(b=>b.addEventListener('click',async()=>{try{const r=await api('/pets/interact',{method:'POST',auth:true,body:{petKey:b.dataset.pi}});const m=$('pet-flavor-msg');m.textContent=r.message;m.classList.remove('hidden');}catch(e){$('pets-error').textContent=e.message;}}));}
$('pets-close')?.addEventListener('click',()=>closeModal('pets-overlay'));

/* ====== PROFILE ====== */
let curAvatar=null,pendingAvatar=null;
function updateNavAvatar(a){curAvatar=a;const i=$('nav-avatar-img'),f=$('nav-avatar-fallback');if(a){i.src=a;i.classList.remove('hidden');f.classList.add('hidden');}else{i.classList.add('hidden');i.removeAttribute('src');f.classList.remove('hidden');}}
async function refreshAvatar(){try{const m=await api('/auth/me',{auth:true});updateNavAvatar(m.avatar||null);}catch(e){}}
$('btn-profile')?.addEventListener('click',()=>{$('profile-error').textContent='';pendingAvatar=null;$('btn-save-avatar').disabled=true;const i=$('profile-preview-img'),f=$('profile-preview-fallback');if(curAvatar){i.src=curAvatar;i.classList.remove('hidden');f.classList.add('hidden');}else{i.classList.add('hidden');f.classList.remove('hidden');}openModal('profile-overlay');});
$('profile-close')?.addEventListener('click',()=>closeModal('profile-overlay'));
$('profile-file-input')?.addEventListener('change',e=>{const f=e.target.files[0];$('profile-error').textContent='';if(!f)return;if(f.size>8*1024*1024){$('profile-error').textContent='Terlalu besar.';return;}const r=new FileReader();r.onload=ev=>{const img=new Image();img.onload=()=>{const cv=document.createElement('canvas');cv.width=160;cv.height=160;const cx=cv.getContext('2d');const m=Math.min(img.width,img.height);cx.drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,160,160);pendingAvatar=cv.toDataURL('image/jpeg',0.82);$('profile-preview-img').src=pendingAvatar;$('profile-preview-img').classList.remove('hidden');$('profile-preview-fallback').classList.add('hidden');$('btn-save-avatar').disabled=false;};img.src=ev.target.result;};r.readAsDataURL(f);});
$('btn-save-avatar')?.addEventListener('click',async()=>{if(!pendingAvatar)return;$('profile-error').textContent='';try{const d=await api('/auth/avatar',{method:'PUT',auth:true,body:{avatar:pendingAvatar}});updateNavAvatar(d.avatar);pendingAvatar=null;closeModal('profile-overlay');}catch(e){$('profile-error').textContent=e.message;}});
$('btn-remove-avatar')?.addEventListener('click',async()=>{$('profile-error').textContent='';try{await api('/auth/avatar',{method:'PUT',auth:true,body:{avatar:null}});updateNavAvatar(null);pendingAvatar=null;$('profile-preview-img').classList.add('hidden');$('profile-preview-fallback').classList.remove('hidden');$('btn-save-avatar').disabled=true;}catch(e){$('profile-error').textContent=e.message;}});

/* ====== MODAL CLOSE ====== */
['roster-overlay','leaderboard-overlay','inventory-overlay','pets-overlay','profile-overlay','gacha-overlay','cosmetics-overlay'].forEach(id=>$(id)?.addEventListener('click',e=>{if(e.target.id===id)closeModal(id);}));
$('shop-overlay')?.addEventListener('click',e=>{if(e.target.id==='shop-overlay'){closeModal('shop-overlay');if(shopTI){clearInterval(shopTI);shopTI=null;}}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){['roster-overlay','leaderboard-overlay','inventory-overlay','pets-overlay','profile-overlay','gacha-overlay','cosmetics-overlay'].forEach(closeModal);closeModal('shop-overlay');$('settings-overlay')?.classList.add('hidden');}});

/* ====== BOOT ====== */
console.log('🎮 Gerbang Awakening v9.0 loaded');
showMainMenu();
spawnEmbers();
})();
