const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const {
  RAR, PRIV, PRIV_ORDER, ITEMS, LIMITED, CASES, PROMOS,
  AVATARS, START_BALANCE, FREE_COOLDOWN, TOPUP_MAX, TOPUP_COOLDOWN,
  MULTI_MAX, BATTLE_PLAYERS, BATTLE_ROUNDS, BATTLE_EXPIRE,
} = require('./data');

const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
const LUCK_MAX = 1000000;

/* ================= Экономика игр v7.1 (понижена) ================= */
const GAME_WHEEL = [{m:0,w:12},{m:0.5,w:6},{m:1.5,w:4},{m:2,w:2},{m:3,w:1},{m:5,w:0.5}];
const GAME_PLINKO = [6,2,1.2,1,0.8,0.6,0.5,0.6,0.8,1,1.2,2,6];
const GAME_SLOTS = [['🍒',40,4],['🍋',28,6],['🔔',16,10],['⭐',8,20],['💎',3,50],['7️⃣',1,120]];
const GAME_KENO = {
  1:{1:2.5},
  2:{2:9},
  3:{2:1.6,3:14},
  4:{3:5,4:28},
  5:{3:2.2,4:9,5:70},
  6:{3:2,4:5,5:30,6:150},
  7:{4:2.5,5:8,6:45,7:220},
  8:{4:2,5:5,6:18,7:90,8:400},
  9:{4:1.5,5:3.5,6:11,7:40,8:140,9:500},
  10:{5:1.5,6:3.5,7:12,8:45,9:200,10:500},
};
const COIN_MULT = 1.85;
const DICE_FAIR = 90;
const CRASH_EDGE = 0.88;
const MINES_FEE = 0.85;
const TOWER_STEP = 1.26, TOWER_FEE = 0.93;
const ROULETTE_COLOR = 1.95, ROULETTE_ZERO = 10;
const LIMBO_EDGE = 0.90;
const HILO_EDGE = 0.85;

/* ================= Косметика курицы (цены от 1 трлн) ================= */
const COSMETICS = [
  {id:'hat_cap',   type:'hat',     name:'🧢 Кепка',              price:1000000000000},
  {id:'hat_fedora',type:'hat',     name:'🎩 Шляпа мафиози',      price:2000000000000},
  {id:'hat_crown', type:'hat',     name:'👑 Золотая корона',     price:5000000000000},
  {id:'hat_halo',  type:'hat',     name:'😇 Нимб',               price:10000000000000},
  {id:'gl_red',    type:'glasses', name:'👓 Красные очки',       price:1500000000000},
  {id:'gl_vip',    type:'glasses', name:'🕶 VIP-очки',           price:5000000000000},
  {id:'gl_space',  type:'glasses', name:'🛸 Космический визор',  price:8000000000000},
  {id:'gun_dual',  type:'gun',     name:'🔫 Два пистолета',      price:3000000000000},
  {id:'gun_gold',  type:'gun',     name:'🔫 Золотые пистолеты',  price:15000000000000},
  {id:'aura_gold', type:'aura',    name:'✨ Золотая аура',       price:30000000000000},
  {id:'aura_fire', type:'aura',    name:'🔥 Огненная аура',      price:60000000000000},
  {id:'aura_rainbow',type:'aura',  name:'🌈 Радужная аура',      price:100000000000000},
];

/* ================= База ================= */
let db;
function freshDB(){ return {users:{},tokens:{},feed:[],promos:{},nextId:1}; }
try { db = JSON.parse(fs.readFileSync(DB_FILE,'utf8')); } catch(e){ db = freshDB(); }
if (!db.promos) db.promos = {};

function migrateUser(u){
  if (u.banned === true){ u.banUntil = -1; u.banReason = u.banReason || 'Нарушение правил'; }
  delete u.banned;
  if (typeof u.banUntil !== 'number') u.banUntil = 0;
  if (typeof u.banReason !== 'string') u.banReason = '';
  if (typeof u.topupAt !== 'number') u.topupAt = 0;
  if (typeof u.privilege === 'undefined') u.privilege = null;
  if (typeof u.luck !== 'number') u.luck = 0;
  if (!Array.isArray(u.cosmetics)) u.cosmetics = [];
  if (!u.outfit || typeof u.outfit !== 'object') u.outfit = {};
  if (!u.stats) u.stats = {opened:0,upgrades:0,best:null};
  if (!Array.isArray(u.inventory)) u.inventory = [];
  if (!Array.isArray(u.history)) u.history = [];
  if (!Array.isArray(u.usedPromos)) u.usedPromos = [];
}
Object.values(db.users).forEach(migrateUser);

let saveT = null;
function save(){ clearTimeout(saveT); saveT = setTimeout(() => { try { fs.writeFileSync(DB_FILE, JSON.stringify(db)); } catch(e){} }, 300); }
process.on('SIGINT', () => { try { fs.writeFileSync(DB_FILE, JSON.stringify(db)); } catch(e){} process.exit(0); });

/* ================= Утилиты ================= */
const itV = id => ITEMS[id][3];
const dropTotal = cs => cs.drops.reduce((s,d)=>s+d[1],0);
function bestItem(cs){ let b = cs.drops[0][0]; for (const [id] of cs.drops) if (itV(id) > itV(b)) b = id; return b; }
function pickDrop(cs, luck){
  if (luck && luck > 0){
    const chance = Math.min(1, luck / LUCK_MAX);
    if (Math.random() < chance) return bestItem(cs);
  }
  let r = Math.random()*dropTotal(cs);
  for (const [id,w] of cs.drops){ if ((r-=w) < 0) return id; }
  return cs.drops[0][0];
}
const newUid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);
const newId = p => p + Math.random().toString(36).slice(2,10);
const hash = (pw,salt) => crypto.scryptSync(String(pw),salt,64).toString('hex');
function pubUser(u){ const {passHash,salt,nameLower,...rest} = u; return rest; }
function findByName(n){ const l = String(n).toLowerCase(); return Object.values(db.users).find(u => u.nameLower === l); }
function addHist(u,dir,title,amount){ u.history.unshift({dir,title,amount,ts:Date.now()}); if (u.history.length > 60) u.history.length = 60; }
function credit(u,amount,title){ u.balance += amount; addHist(u,'in',title,amount); }
function addFeed(user,item){ db.feed.unshift({user,item,ts:Date.now()}); if (db.feed.length > 30) db.feed.length = 30; }
function isBanned(u){ return u.banUntil === -1 || (u.banUntil > 0 && Date.now() < u.banUntil); }
function banRights(u){
  if (u.admin) return {forever:true,max:Infinity};
  const p = PRIV[u.privilege];
  if (p && p.ban > 0) return {forever:false,max:p.ban};
  return null;
}
function recordBest(u, id){
  if (!u.stats.best || itV(id) > u.stats.best.v)
    u.stats.best = {e:ITEMS[id][0], n:ITEMS[id][1], v:itV(id)};
}
const NAME_A = ['Neon','Ghost','Pixel','Lucky','Turbo','Cyber','Hyper','Risky','Shadow','Nova'];
const NAME_B = ['Wolf','Fox','Bear','Hawk','Shark','Cat','Viper','Bull','Owl','Ape'];
const botName = () => NAME_A[Math.floor(Math.random()*NAME_A.length)] + NAME_B[Math.floor(Math.random()*NAME_B.length)] + Math.floor(Math.random()*99);

/* Удача в играх: шанс лучшего исхода = luck / LUCK_MAX */
function luckWin(u){
  const l = u.luck || 0;
  if (l <= 0) return false;
  return Math.random() < Math.min(1, l / LUCK_MAX);
}

/* ================= Приложение ================= */
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));

const minesGames = new Map();
const crashGames = new Map();
const towerGames = new Map();
const battles = new Map();

function sweepBattles(){
  const now = Date.now();
  for (const [id,b] of battles){
    if (b.status === 'done' && now - b.finishedAt > BATTLE_EXPIRE) battles.delete(id);
    else if (b.status === 'waiting' && now - b.createdAt > BATTLE_EXPIRE){
      const host = db.users[b.players[0].uid];
      if (host){ credit(host, b.price*BATTLE_ROUNDS, '⚔️ Битва отменена (возврат)'); }
      battles.delete(id);
    }
  }
}

function auth(req,res,next){
  const t = (req.headers.authorization||'').replace('Bearer ','');
  const u = db.tokens[t] ? db.users[db.tokens[t]] : null;
  if (!u) return res.status(401).json({error:'Требуется вход'});
  if (isBanned(u)) return res.status(403).json({banned:true,reason:u.banReason||'Причина не указана',until:u.banUntil});
  if (u.banUntil > 0){ u.banUntil = 0; u.banReason = ''; }
  req.user = u; next();
}
const admin = (req,res,next) => req.user.admin ? next() : res.status(403).json({error:'Нет прав администратора'});

/* ---------- Конфиг ---------- */
app.get('/api/config', (req,res) => {
  res.json({rar:RAR,items:ITEMS,cases:CASES,priv:PRIV,privOrder:PRIV_ORDER,limited:[...LIMITED],
    topupMax:TOPUP_MAX,topupCooldown:TOPUP_COOLDOWN,startBalance:START_BALANCE,multiMax:MULTI_MAX,
    wheelSegs:GAME_WHEEL,plinkoMults:GAME_PLINKO,slotsSyms:GAME_SLOTS,kenoPay:GAME_KENO,
    battlePlayers:BATTLE_PLAYERS,battleRounds:BATTLE_ROUNDS,luckMax:LUCK_MAX,
    cosmetics:COSMETICS,
    eco:{coin:COIN_MULT,dice:DICE_FAIR,crash:CRASH_EDGE,mines:MINES_FEE,tower:TOWER_STEP,
         rouletteColor:ROULETTE_COLOR,rouletteZero:ROULETTE_ZERO,limbo:LIMBO_EDGE,hilo:HILO_EDGE}});
});

/* ---------- Регистрация / вход ---------- */
app.post('/api/register', (req,res) => {
  const name = String(req.body.name||'').trim(), pass = String(req.body.password||'');
  if (!/^[\wа-яё-]{2,16}$/i.test(name)) return res.status(400).json({error:'Ник: 2–16 символов (буквы, цифры, _ -)'});
  if (pass.length < 3) return res.status(400).json({error:'Пароль минимум 3 символа'});
  if (findByName(name)) return res.status(400).json({error:'Ник уже занят'});
  const salt = crypto.randomBytes(16).toString('hex');
  const u = {id:'u'+(db.nextId++),name,nameLower:name.toLowerCase(),salt,passHash:hash(pass,salt),
    createdAt:Date.now(),admin:false,privilege:null,luck:0,banUntil:0,banReason:'',topupAt:0,
    balance:START_BALANCE,freeAt:0,avatar:AVATARS[Math.floor(Math.random()*AVATARS.length)],
    joined:Date.now(),ref:Math.random().toString(36).slice(2,10),
    cosmetics:[],outfit:{},
    stats:{opened:0,upgrades:0,best:null},inventory:[],history:[],usedPromos:[]};
  addHist(u,'in','Стартовый бонус',START_BALANCE);
  db.users[u.id] = u;
  const token = crypto.randomBytes(24).toString('hex');
  db.tokens[token] = u.id; save();
  res.json({token,user:pubUser(u)});
});
app.post('/api/login', (req,res) => {
  const u = findByName(req.body.name);
  if (!u) return res.status(401).json({error:'Неверный ник или пароль'});
  if (u.passHash !== hash(req.body.password||'',u.salt)) return res.status(401).json({error:'Неверный ник или пароль'});
  if (isBanned(u)) return res.status(403).json({banned:true,reason:u.banReason||'Причина не указана',until:u.banUntil});
  if (u.banUntil > 0){ u.banUntil = 0; u.banReason = ''; }
  const token = crypto.randomBytes(24).toString('hex');
  db.tokens[token] = u.id; save();
  res.json({token,user:pubUser(u)});
});
app.post('/api/me', auth, (req,res) => res.json({user:pubUser(req.user)}));
app.post('/api/feed', auth, (req,res) => res.json({feed:db.feed}));
app.post('/api/logout', auth, (req,res) => {
  const t = (req.headers.authorization||'').replace('Bearer ','');
  delete db.tokens[t]; save(); res.json({ok:true});
});

/* ---------- Кейсы ---------- */
app.post('/api/open-case', auth, (req,res) => {
  const cs = CASES.find(c => c.id === req.body.caseId);
  if (!cs) return res.status(400).json({error:'Кейс не найден'});
  let count = Math.max(1, Math.min(MULTI_MAX, Math.floor(+req.body.count || 1)));
  if (cs.free) count = 1;
  if (cs.free){
    if (Date.now() < req.user.freeAt) return res.status(400).json({error:'Фри-кейс ещё не доступен'});
    req.user.freeAt = Date.now() + FREE_COOLDOWN;
  } else {
    const cost = cs.price * count;
    if (req.user.balance < cost) return res.status(400).json({error:'Недостаточно HC', need:cost - req.user.balance});
    req.user.balance -= cost;
    addHist(req.user,'out','Кейс «'+cs.name+'» ×'+count,cost);
  }
  const results = [];
  for (let i = 0; i < count; i++){
    const item = pickDrop(cs, req.user.luck);
    const entry = {uid:newUid(),id:item,case:cs.id,ts:Date.now()};
    req.user.inventory.unshift(entry);
    req.user.stats.opened++;
    recordBest(req.user,item);
    addFeed(req.user.name,item);
    results.push({item,entry});
  }
  save();
  res.json({results,items:results.map(r => r.item),balance:req.user.balance,
            freeAt:req.user.freeAt,opened:req.user.stats.opened,count});
});

/* ---------- Инвентарь / кошелёк ---------- */
app.post('/api/sell', auth, (req,res) => {
  const i = req.user.inventory.findIndex(x => x.uid === req.body.uid);
  if (i < 0) return res.status(400).json({error:'Предмет не найден'});
  if (LIMITED.has(req.user.inventory[i].id)) return res.status(400).json({error:'🔒 Лимитные предметы нельзя продать'});
  const inv = req.user.inventory.splice(i,1)[0];
  credit(req.user,itV(inv.id),'Продажа: '+ITEMS[inv.id][1]);
  save(); res.json({balance:req.user.balance});
});
app.post('/api/sell-all', auth, (req,res) => {
  const keep = [];
  let sum = 0, soldCount = 0;
  for (const x of req.user.inventory){
    if (LIMITED.has(x.id)) keep.push(x);
    else { sum += itV(x.id); soldCount++; }
  }
  req.user.inventory = keep;
  if (sum > 0) credit(req.user,sum,'Продажа всего инвентаря');
  save(); res.json({balance:req.user.balance,soldCount,kept:keep.length});
});
app.post('/api/topup', auth, (req,res) => {
  const v = Math.floor(+req.body.amount||0);
  if (v < 1) return res.status(400).json({error:'Некорректная сумма'});
  if (v > TOPUP_MAX) return res.status(400).json({error:'Слишком большая сумма'});
  if (!req.user.admin){
    const p = PRIV[req.user.privilege];
    const cd = p ? p.cd*1000 : TOPUP_COOLDOWN;
    const left = req.user.topupAt + cd - Date.now();
    if (left > 0) return res.status(400).json({error:'Подожди '+Math.ceil(left/1000)+' сек'});
  }
  req.user.topupAt = Date.now();
  credit(req.user,v,req.user.admin?'👑 Админ: пополнение':'Пополнение (демо)');
  save(); res.json({balance:req.user.balance,topupAt:req.user.topupAt});
});
app.post('/api/withdraw', auth, (req,res) => {
  const v = Math.floor(+req.body.amount||0);
  if (v < 1) return res.status(400).json({error:'Некорректная сумма'});
  if (v > req.user.balance) return res.status(400).json({error:'Сумма превышает баланс'});
  req.user.balance -= v;
  addHist(req.user,'out','Вывод средств (заявка)',v);
  save(); res.json({balance:req.user.balance});
});
app.post('/api/reset', auth, (req,res) => {
  const a = req.user.admin, pr = req.user.privilege, lk = req.user.luck,
        cs = req.user.cosmetics, of = req.user.outfit;
  Object.assign(req.user,{balance:START_BALANCE,freeAt:0,topupAt:0,stats:{opened:0,upgrades:0,best:null},
    inventory:[],history:[],usedPromos:[],admin:a,privilege:pr,luck:lk,cosmetics:cs,outfit:of});
  addHist(req.user,'in','Стартовый бонус',START_BALANCE);
  save(); res.json({user:pubUser(req.user)});
});

/* ---------- Топ ---------- */
app.post('/api/top', auth, (req,res) => {
  const all = Object.values(db.users).sort((a,b) => b.balance-a.balance);
  const myIdx = all.findIndex(u => u.id === req.user.id);
  res.json({top:all.slice(0,50).map((u,i) => ({place:i+1,name:u.name,avatar:u.avatar,balance:u.balance,
    admin:!!u.admin,priv:u.privilege||null,isMe:u.id===req.user.id})),
    me: myIdx >= 0 ? {place:myIdx+1,total:all.length} : null});
});

/* ---------- Промокоды ---------- */
app.post('/api/promo', auth, (req,res) => {
  const code = String(req.body.code||'').trim().toUpperCase();
  if (!code) return res.status(400).json({error:'Введите промокод'});
  const dyn = db.promos[code];
  if (dyn){
    if (dyn.expiresAt && Date.now() > dyn.expiresAt) return res.status(400).json({error:'Срок действия промокода истёк'});
    if (dyn.maxUses > 0 && dyn.uses >= dyn.maxUses) return res.status(400).json({error:'Лимит активаций исчерпан'});
    if (req.user.usedPromos.includes(code)) return res.status(400).json({error:'Промокод уже использован'});
    req.user.usedPromos.push(code);
    dyn.uses++; dyn.activatedBy.push(req.user.name);
    if (dyn.activatedBy.length > 50) dyn.activatedBy.shift();
    const entries = [];
    let msg = '🎁 Промокод активирован';
    if (dyn.amount){ credit(req.user,dyn.amount,'Промокод '+code); msg = '🎁 +'+dyn.amount.toLocaleString('ru-RU')+' HC'; }
    const give = id => { const e = {uid:newUid(),id,case:'promo',ts:Date.now()}; req.user.inventory.unshift(e); entries.push(e); msg += ' · '+ITEMS[id][0]+' '+ITEMS[id][1]; };
    if (dyn.itemId && ITEMS[dyn.itemId]) give(dyn.itemId);
    if (dyn.caseId){
      const cs = CASES.find(c => c.id === dyn.caseId);
      if (cs){ const id = pickDrop(cs, 0); const e = {uid:newUid(),id,case:'promo',ts:Date.now()};
        req.user.inventory.unshift(e); entries.push(e);
        msg += ' · кейс «'+cs.name+'» → '+ITEMS[id][0]+' '+ITEMS[id][1]; addFeed(req.user.name,id); }
    }
    if (dyn.privilege && PRIV[dyn.privilege]){
      if (PRIV_ORDER.indexOf(dyn.privilege) > PRIV_ORDER.indexOf(req.user.privilege)){
        req.user.privilege = dyn.privilege;
        msg += ' · 🎖 Привилегия '+PRIV[dyn.privilege].label+'!';
      } else msg += ' · привилегия уже есть';
    }
    save();
    return res.json({message:msg,entries,balance:req.user.balance,privilege:req.user.privilege});
  }
  const p = PROMOS[code];
  if (!p) return res.status(400).json({error:'Промокод не найден'});
  if (p.admin){
    if (req.user.admin) return res.json({message:'👑 Админка уже активна'});
    req.user.admin = true; save();
    return res.json({message:'👑 Админ-панель активирована',admin:true});
  }
  if (req.user.usedPromos.includes(code)) return res.status(400).json({error:'Промокод уже использован'});
  req.user.usedPromos.push(code);
  const entries = [];
  let msg = '🎁 Промокод активирован';
  if (p.amount){ credit(req.user,p.amount,'Промокод '+code); msg = '🎁 +'+p.amount.toLocaleString('ru-RU')+' HC'; }
  const give = id => { const e = {uid:newUid(),id,case:'promo',ts:Date.now()}; req.user.inventory.unshift(e); entries.push(e); msg += ' · '+ITEMS[id][0]+' '+ITEMS[id][1]; };
  if (p.item){
    if (p.item === 'randomRare'){ const pool = Object.keys(ITEMS).filter(id => ITEMS[id][2]==='rare'); give(pool[Math.floor(Math.random()*pool.length)]); }
    else if (p.item === 'any'){ const pool = Object.keys(ITEMS); give(pool[Math.floor(Math.random()*pool.length)]); }
    else if (ITEMS[p.item]) give(p.item);
  }
  if (p.case){
    const cs = CASES.find(c => c.id === p.case);
    if (cs){ const id = pickDrop(cs, 0); const e = {uid:newUid(),id,case:'promo',ts:Date.now()};
      req.user.inventory.unshift(e); entries.push(e);
      msg = '🎁 Кейс «'+cs.name+'» → '+ITEMS[id][0]+' '+ITEMS[id][1]; addFeed(req.user.name,id); }
  }
  save(); res.json({message:msg,entries,balance:req.user.balance});
});

/* ---------- Апгрейдер ---------- */
app.post('/api/upgrade', auth, (req,res) => {
  const uids = Array.isArray(req.body.uids)?req.body.uids:[];
  const target = String(req.body.target||'');
  if (!ITEMS[target]) return res.status(400).json({error:'Цель не найдена'});
  const items = [];
  for (const uid of uids){
    const inv = req.user.inventory.find(x => x.uid === uid);
    if (!inv) return res.status(400).json({error:'Предмет не найден'});
    items.push(inv);
  }
  if (!items.length) return res.status(400).json({error:'Выберите предметы'});
  const inVal = items.reduce((s,x) => s+itV(x.id),0);
  if (itV(target) <= inVal) return res.status(400).json({error:'Цель должна быть дороже входа'});
  let chance = Math.min(95,Math.max(1,inVal/itV(target)*90));
  if (!req.user.admin){
    const p = PRIV[req.user.privilege];
    if (p && p.upg) chance = Math.min(95,chance*(1+p.upg/100));
  }
  const win = Math.random()*100 < chance;
  const inNames = items.map(x => ITEMS[x.id][1]).join(' + ');
  req.user.inventory = req.user.inventory.filter(x => !uids.includes(x.uid));
  req.user.stats.upgrades++;
  let entry = null;
  if (win){
    entry = {uid:newUid(),id:target,case:'upgrade',ts:Date.now()};
    req.user.inventory.unshift(entry);
    recordBest(req.user,target);
    addHist(req.user,'in','Апгрейд: '+inNames+' → '+ITEMS[target][1],itV(target));
    addFeed(req.user.name,target);
  } else addHist(req.user,'out','Апгрейд не удался ('+inNames+')',inVal);
  save(); res.json({win,chance:+chance.toFixed(2),entry,balance:req.user.balance});
});

/* ---------- Игры v7.1 (пониженная экономика + удача) ---------- */
app.post('/api/game/coin', auth, (req,res) => {
  const bet = Math.floor(+req.body.bet||0), side = req.body.side==='tails'?'tails':'heads';
  if (bet < 1 || bet > req.user.balance) return res.status(400).json({error:'Некорректная ставка'});
  req.user.balance -= bet; addHist(req.user,'out','Ставка: Coin Flip',bet);
  let result = Math.random() < .5 ? 'heads' : 'tails';
  if (luckWin(req.user)) result = side;
  const win = result === side;
  let payout = 0;
  if (win){ payout = Math.round(bet*COIN_MULT); credit(req.user,payout,'Coin Flip выигрыш'); }
  save(); res.json({result,win,payout,balance:req.user.balance});
});
app.post('/api/game/dice', auth, (req,res) => {
  const bet = Math.floor(+req.body.bet||0), target = Math.min(98,Math.max(2,Math.floor(+req.body.target||50)));
  if (bet < 1 || bet > req.user.balance) return res.status(400).json({error:'Некорректная ставка'});
  req.user.balance -= bet; addHist(req.user,'out','Ставка: Dice',bet);
  let roll = +(Math.random()*100).toFixed(2);
  if (luckWin(req.user)) roll = +(Math.random()*target*0.99).toFixed(2);
  const win = roll < target;
  let payout = 0;
  if (win){ payout = Math.round(bet*DICE_FAIR/target); credit(req.user,payout,'Dice выигрыш x'+(DICE_FAIR/target).toFixed(2)); }
  save(); res.json({roll,win,payout,balance:req.user.balance});
});
app.post('/api/game/mines/start', auth, (req,res) => {
  const bet = Math.floor(+req.body.bet||0), count = [3,5,10].includes(+req.body.count)?+req.body.count:3;
  if (bet < 1 || bet > req.user.balance) return res.status(400).json({error:'Некорректная ставка'});
  req.user.balance -= bet; addHist(req.user,'out','Ставка: Mines',bet);
  const idx = [...Array(25).keys()];
  for (let i = idx.length-1;i > 0;i--){ const j = Math.floor(Math.random()*(i+1)); [idx[i],idx[j]]=[idx[j],idx[i]]; }
  minesGames.set(req.user.id,{bet,count,mineSet:new Set(idx.slice(0,count)),opened:new Set(),mult:1,picks:0});
  save(); res.json({ok:true,balance:req.user.balance});
});
app.post('/api/game/mines/pick', auth, (req,res) => {
  const g = minesGames.get(req.user.id);
  if (!g) return res.status(400).json({error:'Нет активной игры'});
  const cell = +req.body.cell;
  if (!(cell >= 0 && cell < 25) || g.opened.has(cell)) return res.status(400).json({error:'Некорректная клетка'});
  if (g.mineSet.has(cell)){ minesGames.delete(req.user.id); save(); return res.json({boom:true,mines:[...g.mineSet],balance:req.user.balance}); }
  g.opened.add(cell);
  g.mult *= (25-g.picks)/(25-g.count-g.picks); g.picks++;
  if (g.picks >= 25-g.count){
    const payout = Math.round(g.bet*g.mult*MINES_FEE);
    credit(req.user,payout,'Mines выигрыш x'+(g.mult*MINES_FEE).toFixed(2));
    minesGames.delete(req.user.id); save();
    return res.json({finished:true,win:true,payout,mult:g.mult*MINES_FEE,mines:[...g.mineSet],balance:req.user.balance});
  }
  save();
  res.json({gem:true,mult:+(g.mult*MINES_FEE).toFixed(4),next:+(g.mult*(25-g.picks)/(25-g.count-g.picks)*MINES_FEE).toFixed(4)});
});
app.post('/api/game/mines/cash', auth, (req,res) => {
  const g = minesGames.get(req.user.id);
  if (!g) return res.status(400).json({error:'Нет активной игры'});
  const payout = Math.round(g.bet*g.mult*MINES_FEE);
  credit(req.user,payout,'Mines выигрыш x'+(g.mult*MINES_FEE).toFixed(2));
  const mines = [...g.mineSet];
  minesGames.delete(req.user.id); save();
  res.json({win:true,payout,mult:+(g.mult*MINES_FEE).toFixed(4),mines,balance:req.user.balance});
});
app.post('/api/game/crash/start', auth, (req,res) => {
  const bet = Math.floor(+req.body.bet||0);
  if (bet < 1 || bet > req.user.balance) return res.status(400).json({error:'Некорректная ставка'});
  req.user.balance -= bet; addHist(req.user,'out','Ставка: Crash',bet);
  let crashAt = Math.min(250, Math.max(1.01, CRASH_EDGE/(1-Math.random())));
  if (luckWin(req.user)) crashAt = 250;
  crashGames.set(req.user.id,{startTs:Date.now(),crashAt,bet});
  save(); res.json({ok:true,balance:req.user.balance});
});
app.post('/api/game/crash/cash', auth, (req,res) => {
  const g = crashGames.get(req.user.id);
  if (!g) return res.status(400).json({error:'Нет активной игры'});
  const mult = Math.exp(0.00019*(Date.now()-g.startTs));
  if (mult >= g.crashAt){ crashGames.delete(req.user.id); save(); return res.json({win:false,mult:+g.crashAt.toFixed(2),balance:req.user.balance}); }
  const payout = Math.round(g.bet*mult);
  credit(req.user,payout,'Crash выигрыш x'+mult.toFixed(2));
  crashGames.delete(req.user.id); save();
  res.json({win:true,mult:+mult.toFixed(2),payout,balance:req.user.balance});
});
app.post('/api/game/wheel', auth, (req,res) => {
  const bet = Math.floor(+req.body.bet||0);
  if (bet < 1 || bet > req.user.balance) return res.status(400).json({error:'Некорректная ставка'});
  req.user.balance -= bet; addHist(req.user,'out','Ставка: Wheel',bet);
  let seg = 0;
  if (luckWin(req.user)){
    let best = 0;
    for (let i = 0; i < GAME_WHEEL.length; i++) if (GAME_WHEEL[i].m > GAME_WHEEL[best].m) best = i;
    seg = best;
  } else {
    const total = GAME_WHEEL.reduce((s,x)=>s+x.w,0);
    let r = Math.random()*total;
    for (let i = 0; i < GAME_WHEEL.length; i++){ if ((r -= GAME_WHEEL[i].w) < 0){ seg = i; break; } }
  }
  const m = GAME_WHEEL[seg].m;
  let payout = 0;
  if (m > 0){ payout = Math.round(bet*m); credit(req.user,payout,'Wheel выигрыш x'+m); }
  save(); res.json({seg,mult:m,payout,balance:req.user.balance});
});
app.post('/api/game/plinko', auth, (req,res) => {
  const bet = Math.floor(+req.body.bet||0);
  if (bet < 1 || bet > req.user.balance) return res.status(400).json({error:'Некорректная ставка'});
  req.user.balance -= bet; addHist(req.user,'out','Ставка: Plinko',bet);
  let k = 0;
  if (luckWin(req.user)){ k = Math.random() < .5 ? 0 : 12; }
  else { for (let i = 0; i < 12; i++) if (Math.random() < .5) k++; }
  const m = GAME_PLINKO[k], payout = Math.round(bet*m);
  if (payout > 0) credit(req.user,payout,'Plinko выигрыш x'+m);
  save(); res.json({slot:k,mult:m,payout,balance:req.user.balance});
});
app.post('/api/game/tower/start', auth, (req,res) => {
  const bet = Math.floor(+req.body.bet||0);
  if (bet < 1 || bet > req.user.balance) return res.status(400).json({error:'Некорректная ставка'});
  req.user.balance -= bet; addHist(req.user,'out','Ставка: Tower',bet);
  const bombs = [];
  for (let i = 0; i < 8; i++) bombs.push(Math.floor(Math.random()*3));
  towerGames.set(req.user.id,{bet,floor:0,bombs});
  save(); res.json({ok:true,balance:req.user.balance});
});
app.post('/api/game/tower/pick', auth, (req,res) => {
  const g = towerGames.get(req.user.id);
  if (!g) return res.status(400).json({error:'Нет активной игры'});
  const cell = +req.body.cell;
  if (!(cell >= 0 && cell < 3)) return res.status(400).json({error:'Некорректная клетка'});
  if (g.bombs[g.floor] === cell){ const bombs = g.bombs; towerGames.delete(req.user.id); save(); return res.json({boom:true,bombs,balance:req.user.balance}); }
  g.floor++;
  const mult = +Math.pow(TOWER_STEP,g.floor).toFixed(2);
  if (g.floor >= 8){
    const payout = Math.round(g.bet*mult*TOWER_FEE);
    credit(req.user,payout,'Tower выигрыш x'+mult);
    towerGames.delete(req.user.id); save();
    return res.json({safe:true,floor:g.floor,mult,finished:true,payout,balance:req.user.balance});
  }
  save(); res.json({safe:true,floor:g.floor,mult,next:+Math.pow(TOWER_STEP,g.floor+1).toFixed(2)});
});
app.post('/api/game/tower/cash', auth, (req,res) => {
  const g = towerGames.get(req.user.id);
  if (!g || g.floor === 0) return res.status(400).json({error:'Нет активной игры'});
  const mult = +Math.pow(TOWER_STEP,g.floor).toFixed(2);
  const payout = Math.round(g.bet*mult*TOWER_FEE);
  credit(req.user,payout,'Tower выигрыш x'+mult);
  towerGames.delete(req.user.id); save();
  res.json({win:true,mult,payout,bombs:g.bombs,balance:req.user.balance});
});
app.post('/api/game/slots', auth, (req,res) => {
  const bet = Math.floor(+req.body.bet||0);
  if (bet < 1 || bet > req.user.balance) return res.status(400).json({error:'Некорректная ставка'});
  req.user.balance -= bet; addHist(req.user,'out','Ставка: Slots',bet);
  const total = GAME_SLOTS.reduce((s,x)=>s+x[1],0);
  let a, b, c, mult = 0;
  if (luckWin(req.user)){
    const top = GAME_SLOTS[GAME_SLOTS.length-1][0];
    a = b = c = top;
  } else {
    const pickOne = () => { let r = Math.random()*total; for (const s of GAME_SLOTS){ if ((r -= s[1]) < 0) return s; } return GAME_SLOTS[0]; };
    a = pickOne(); b = pickOne(); c = pickOne();
  }
  if (a[0] === b[0] && b[0] === c[0]) mult = a[2];
  let payout = 0;
  if (mult > 0){ payout = Math.round(bet*mult); credit(req.user,payout,'Slots джекпот x'+mult); }
  save(); res.json({reels:[a[0],b[0],c[0]],mult,payout,balance:req.user.balance});
});
app.post('/api/game/roulette', auth, (req,res) => {
  const bet = Math.floor(+req.body.bet||0);
  const pick = ['red','black','green'].includes(req.body.pick) ? req.body.pick : 'red';
  if (bet < 1 || bet > req.user.balance) return res.status(400).json({error:'Некорректная ставка'});
  req.user.balance -= bet; addHist(req.user,'out','Ставка: Roulette',bet);
  let num = Math.floor(Math.random()*37);
  if (luckWin(req.user)){
    num = pick === 'green' ? 0 : (pick === 'red' ? [1,3,5,7,9][Math.floor(Math.random()*5)] : [2,4,6,8][Math.floor(Math.random()*4)]);
  }
  const color = num === 0 ? 'green' : (ROULETTE_RED.has(num) ? 'red' : 'black');
  const win = color === pick;
  const mult = pick === 'green' ? ROULETTE_ZERO : ROULETTE_COLOR;
  let payout = 0;
  if (win){ payout = Math.round(bet*mult); credit(req.user,payout,'Roulette выигрыш x'+mult); }
  save(); res.json({num,color,win,mult,payout,balance:req.user.balance});
});
app.post('/api/game/limbo', auth, (req,res) => {
  const bet = Math.floor(+req.body.bet||0);
  const target = Math.min(1000, Math.max(1.01, +req.body.target || 2));
  if (bet < 1 || bet > req.user.balance) return res.status(400).json({error:'Некорректная ставка'});
  req.user.balance -= bet; addHist(req.user,'out','Ставка: Limbo x'+target.toFixed(2),bet);
  let result = Math.min(1000, Math.max(1, LIMBO_EDGE/(1 - Math.random())));
  if (luckWin(req.user)) result = target;
  const win = result >= target;
  let payout = 0;
  if (win){ payout = Math.round(bet*target); credit(req.user,payout,'Limbo выигрыш x'+target.toFixed(2)); }
  save(); res.json({result:+result.toFixed(2),target,win,payout,balance:req.user.balance});
});
const HILO_VAL = {'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14};
const HILO_RANKS = Object.keys(HILO_VAL);
const HILO_SUITS = ['♠','♥','♦','♣'];
function hiloCard(){ return {r:HILO_RANKS[Math.floor(Math.random()*13)], s:HILO_SUITS[Math.floor(Math.random()*4)]}; }
app.post('/api/game/hilo', auth, (req,res) => {
  const bet = Math.floor(+req.body.bet||0);
  const pick = req.body.pick === 'lo' ? 'lo' : 'hi';
  if (bet < 1 || bet > req.user.balance) return res.status(400).json({error:'Некорректная ставка'});
  const cur = hiloCard();
  const v1 = HILO_VAL[cur.r];
  const pHi = (14 - v1) / 13, pLo = (v1 - 2) / 13;
  const p = pick === 'hi' ? pHi : pLo;
  if (p <= 0) return res.status(400).json({error:'Нет смысла ставить «'+pick+'» на карту '+cur.r});
  req.user.balance -= bet; addHist(req.user,'out','Ставка: Hi-Lo '+pick.toUpperCase(),bet);
  let next;
  if (luckWin(req.user)){
    const pool = HILO_RANKS.filter(rr => pick === 'hi' ? HILO_VAL[rr] > v1 : HILO_VAL[rr] < v1);
    next = {r: pool[Math.floor(Math.random()*pool.length)], s: HILO_SUITS[Math.floor(Math.random()*4)]};
  } else {
    next = hiloCard();
  }
  const v2 = HILO_VAL[next.r];
  let win = false, mult = 0, push = false;
  if (v2 === v1){ push = true; win = true; mult = 1; }
  else if ((pick === 'hi' && v2 > v1) || (pick === 'lo' && v2 < v1)){ win = true; mult = Math.round(HILO_EDGE/p * 100)/100; }
  let payout = 0;
  if (win){ payout = Math.round(bet*mult); if (payout > 0) credit(req.user,payout,'Hi-Lo выигрыш x'+mult.toFixed(2)); }
  save();
  res.json({cur:cur.r+cur.s, next:next.r+next.s, win, push, mult, payout, balance:req.user.balance});
});
app.post('/api/game/keno', auth, (req,res) => {
  const bet = Math.floor(+req.body.bet||0);
  const picks = [...new Set((Array.isArray(req.body.picks)?req.body.picks:[]).map(x => Math.floor(+x)))]
    .filter(x => x >= 1 && x <= 40);
  const n = picks.length;
  if (n < 1 || n > 10) return res.status(400).json({error:'Выбери от 1 до 10 чисел'});
  if (bet < 1 || bet > req.user.balance) return res.status(400).json({error:'Некорректная ставка'});
  req.user.balance -= bet; addHist(req.user,'out','Ставка: Keno ×'+n,bet);
  const pool = [...Array(40).keys()].map(i => i+1);
  for (let i = pool.length-1;i > 0;i--){ const j = Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  let drawn, hits;
  if (luckWin(req.user)){
    drawn = picks.slice();
    const rest = pool.filter(x => !picks.includes(x));
    while (drawn.length < 10){
      const idx = Math.floor(Math.random()*rest.length);
      drawn.push(rest.splice(idx,1)[0]);
    }
    hits = n;
  } else {
    drawn = pool.slice(0,10);
    hits = picks.filter(x => drawn.includes(x)).length;
  }
  const table = GAME_KENO[n] || {};
  const mult = table[hits] || 0;
  let payout = 0;
  if (mult > 0){ payout = Math.round(bet*mult); credit(req.user,payout,'Keno выигрыш x'+mult); }
  save(); res.json({drawn, picks, hits, mult, payout, balance:req.user.balance});
});

/* ---------- ⚔️ Битвы (без изменений v7) ---------- */
function battleView(b){
  return {id:b.id, caseId:b.caseId, caseName:b.caseName, caseEmoji:b.caseEmoji, price:b.price,
    playersCount:b.playersCount, status:b.status,
    players:b.players.map(p => ({name:p.name, avatar:p.avatar, isBot:p.isBot, isMe:p.uid === b.viewUid,
      items:p.items || [], total:(p.items||[]).reduce((s,id) => s+itV(id),0)})),
    winnerIdx:b.winnerIdx ?? null, rounds:b.rounds || null};
}
function runBattle(b){
  const cs = CASES.find(c => c.id === b.caseId);
  b.rounds = [];
  for (let r = 0; r < BATTLE_ROUNDS; r++){
    const round = b.players.map(p => pickDrop(cs, p.luck));
    b.rounds.push(round);
    b.players.forEach((p,i) => p.items.push(round[i]));
  }
  const totals = b.players.map(p => p.items.reduce((s,id) => s+itV(id),0));
  let maxT = Math.max(...totals);
  const tied = totals.map((t,i) => t === maxT ? i : -1).filter(i => i >= 0);
  b.winnerIdx = tied[Math.floor(Math.random()*tied.length)];
  const winner = b.players[b.winnerIdx];
  const allItems = b.players.flatMap(p => p.items);
  const allValue = allItems.reduce((s,id) => s+itV(id),0);
  b.status = 'done';
  b.finishedAt = Date.now();
  if (!winner.isBot){
    const u = db.users[winner.uid];
    if (u){
      allItems.forEach(id => {
        const e = {uid:newUid(), id, case:'battle', ts:Date.now()};
        u.inventory.unshift(e);
        recordBest(u,id);
      });
      addHist(u,'in','⚔️ Битва: победа +'+allItems.length+' предметов',allValue);
      addFeed(u.name, bestItem(cs));
    }
  }
  save();
}
app.post('/api/battle/create', auth, (req,res) => {
  sweepBattles();
  const cs = CASES.find(c => c.id === req.body.caseId);
  if (!cs) return res.status(400).json({error:'Кейс не найден'});
  if (cs.free) return res.status(400).json({error:'Фри-кейс нельзя использовать в битвах'});
  const playersCount = +req.body.playersCount;
  if (!BATTLE_PLAYERS.includes(playersCount)) return res.status(400).json({error:'Только 2, 4 или 6 игроков'});
  const fillBots = !!req.body.fillBots;
  const cost = cs.price * BATTLE_ROUNDS;
  if (req.user.balance < cost) return res.status(400).json({error:'Нужно '+cost.toLocaleString('ru-RU')+' HC (5 кейсов)', need:cost-req.user.balance});
  req.user.balance -= cost;
  addHist(req.user,'out','⚔️ Битва: взнос («'+cs.name+'» ×'+BATTLE_ROUNDS+')',cost);
  const b = {
    id:newId('b'), caseId:cs.id, caseName:cs.name, caseEmoji:cs.e, price:cs.price,
    playersCount, rounds:BATTLE_ROUNDS,
    players:[{uid:req.user.id, name:req.user.name, avatar:req.user.avatar, luck:req.user.luck||0, items:[], isBot:false}],
    status:'waiting', createdAt:Date.now(), viewUid:req.user.id,
  };
  if (fillBots){
    while (b.players.length < playersCount){
      b.players.push({uid:'bot'+newId(''), name:botName(), avatar:'🤖', luck:0, items:[], isBot:true});
    }
    runBattle(b);
    save();
    return res.json({battle:battleView(b), result:{winnerIdx:b.winnerIdx, isMe:b.winnerIdx===0}, balance:req.user.balance});
  }
  battles.set(b.id, b);
  save();
  res.json({battle:battleView(b), balance:req.user.balance});
});
app.post('/api/battle/list', auth, (req,res) => {
  sweepBattles();
  const list = [...battles.values()].filter(b => b.status === 'waiting')
    .sort((a,b) => b.createdAt-a.createdAt)
    .map(b => ({id:b.id, caseId:b.caseId, caseName:b.caseName, caseEmoji:b.caseEmoji, price:b.price,
      playersCount:b.playersCount, joined:b.players.length,
      players:b.players.map(p => ({name:p.name, avatar:p.avatar, isBot:p.isBot}))}));
  res.json({list});
});
app.post('/api/battle/join', auth, (req,res) => {
  sweepBattles();
  const b = battles.get(String(req.body.battleId||''));
  if (!b) return res.status(404).json({error:'Битва не найдена'});
  if (b.status !== 'waiting') return res.status(400).json({error:'Битва уже началась'});
  if (b.players.some(p => p.uid === req.user.id)) return res.status(400).json({error:'Ты уже в этой битве'});
  if (b.players.length >= b.playersCount) return res.status(400).json({error:'Битва заполнена'});
  const cost = b.price * BATTLE_ROUNDS;
  if (req.user.balance < cost) return res.status(400).json({error:'Нужно '+cost.toLocaleString('ru-RU')+' HC', need:cost-req.user.balance});
  req.user.balance -= cost;
  addHist(req.user,'out','⚔️ Битва: взнос («'+b.caseName+'» ×'+BATTLE_ROUNDS+')',cost);
  b.players.push({uid:req.user.id, name:req.user.name, avatar:req.user.avatar, luck:req.user.luck||0, items:[], isBot:false});
  let result = null;
  if (b.players.length >= b.playersCount){
    b.viewUid = req.user.id;
    runBattle(b);
    result = {winnerIdx:b.winnerIdx, isMe:b.winnerIdx === b.players.findIndex(p => p.uid === req.user.id)};
  }
  save();
  res.json({battle:battleView(b), result, balance:req.user.balance});
});
app.post('/api/battle/fill-bots', auth, (req,res) => {
  const b = battles.get(String(req.body.battleId||''));
  if (!b) return res.status(404).json({error:'Битва не найдена'});
  if (b.status !== 'waiting') return res.status(400).json({error:'Битва уже началась'});
  const host = b.players[0];
  if (host.uid !== req.user.id) return res.status(403).json({error:'Только создатель может начать с ботами'});
  while (b.players.length < b.playersCount){
    b.players.push({uid:'bot'+newId(''), name:botName(), avatar:'🤖', luck:0, items:[], isBot:true});
  }
  b.viewUid = req.user.id;
  runBattle(b);
  save();
  res.json({battle:battleView(b), result:{winnerIdx:b.winnerIdx, isMe:b.winnerIdx===0}, balance:req.user.balance});
});
app.post('/api/battle/state', auth, (req,res) => {
  sweepBattles();
  const b = battles.get(String(req.body.battleId||''));
  if (!b) return res.status(404).json({error:'Битва не найдена'});
  b.viewUid = req.user.id;
  res.json({battle:battleView(b)});
});

/* ---------- 🐔 Косметика курицы ---------- */
app.post('/api/cosmetics', auth, (req,res) => {
  res.json({catalog:COSMETICS, owned:req.user.cosmetics, outfit:req.user.outfit, balance:req.user.balance});
});
app.post('/api/cosmetics/buy', auth, (req,res) => {
  const item = COSMETICS.find(c => c.id === req.body.id);
  if (!item) return res.status(404).json({error:'Косметика не найдена'});
  if (req.user.cosmetics.includes(item.id)) return res.status(400).json({error:'Уже куплено'});
  if (req.user.balance < item.price) return res.status(400).json({error:'Недостаточно HC', need:item.price-req.user.balance});
  req.user.balance -= item.price;
  req.user.cosmetics.push(item.id);
  addHist(req.user,'out','🐔 Косметика: '+item.name,item.price);
  save();
  res.json({ok:true, owned:req.user.cosmetics, balance:req.user.balance});
});
app.post('/api/cosmetics/wear', auth, (req,res) => {
  const id = req.body.id || null;
  if (id){
    const item = COSMETICS.find(c => c.id === id);
    if (!item) return res.status(404).json({error:'Косметика не найдена'});
    if (!req.user.cosmetics.includes(id)) return res.status(400).json({error:'Сначала купи эту косметику'});
    req.user.outfit[item.type] = id;
  } else {
    const type = String(req.body.type||'');
    if (['hat','glasses','gun','aura'].includes(type)) req.user.outfit[type] = null;
  }
  save();
  res.json({ok:true, outfit:req.user.outfit});
});

/* ---------- Админ ---------- */
app.post('/api/admin/users', auth, admin, (req,res) => {
  res.json({users:Object.values(db.users)
    .map(u => ({id:u.id,name:u.name,avatar:u.avatar,balance:u.balance,items:u.inventory.length,
      banUntil:u.banUntil,banReason:u.banReason,admin:u.admin,priv:u.privilege||null,luck:u.luck||0,joined:u.createdAt}))
    .sort((a,b) => b.joined-a.joined)});
});
function getTarget(req,res){ const t = db.users[req.body.userId]; if (!t){ res.status(404).json({error:'Игрок не найден'}); return null; } return t; }
app.post('/api/admin/give', auth, admin, (req,res) => {
  const t = getTarget(req,res); if (!t) return;
  const amount = Math.floor(+req.body.amount||0);
  if (!amount) return res.status(400).json({error:'Укажите сумму'});
  t.balance = Math.max(0,t.balance+amount);
  addHist(t,amount>0?'in':'out',amount>0?'👑 Админ: начисление':'👑 Админ: списание',Math.abs(amount));
  save(); res.json({ok:true,balance:t.balance});
});
app.post('/api/admin/give-item', auth, admin, (req,res) => {
  const t = getTarget(req,res); if (!t) return;
  const id = req.body.itemId;
  if (!ITEMS[id]) return res.status(400).json({error:'Предмет не найден'});
  t.inventory.unshift({uid:newUid(),id,case:'admin',ts:Date.now()});
  addHist(t,'in','👑 Админ: выдан '+ITEMS[id][1],itV(id));
  save(); res.json({ok:true});
});
app.post('/api/admin/setluck', auth, admin, (req,res) => {
  const t = getTarget(req,res); if (!t) return;
  let luck = Math.floor(+req.body.luck||0);
  luck = Math.max(0, Math.min(LUCK_MAX, luck));
  t.luck = luck;
  addHist(t,'in','🍀 Удача: '+luck.toLocaleString('ru-RU'),0);
  save(); res.json({ok:true,luck:t.luck});
});
app.post('/api/admin/ban', auth, (req,res) => {
  const t = getTarget(req,res); if (!t) return;
  if (t.id === req.user.id) return res.status(400).json({error:'Нельзя выдать бан самому себе'});
  const rights = banRights(req.user);
  if (!rights) return res.status(403).json({error:'У тебя нет прав на бан'});
  const minutes = +req.body.minutes;
  const reason = String(req.body.reason||'').trim().slice(0,200) || 'Причина не указана';
  if (minutes === -1){ if (!rights.forever) return res.status(400).json({error:'Банить навсегда может только админ'}); t.banUntil = -1; }
  else if (minutes > 0){ if (minutes > rights.max) return res.status(400).json({error:'Твой лимит бана: до '+rights.max+' мин'}); t.banUntil = Date.now()+minutes*60000; }
  else return res.status(400).json({error:'Некорректный срок бана'});
  if (t.admin && !req.user.admin) return res.status(400).json({error:'Нельзя забанить администратора'});
  t.banReason = reason; save(); res.json({ok:true,banUntil:t.banUntil,reason});
});
app.post('/api/admin/unban', auth, (req,res) => {
  const t = getTarget(req,res); if (!t) return;
  if (!banRights(req.user)) return res.status(403).json({error:'У тебя нет прав на разбан'});
  if (t.admin && !req.user.admin) return res.status(400).json({error:'Нельзя снимать бан с администратора'});
  t.banUntil = 0; t.banReason = ''; save(); res.json({ok:true});
});
app.post('/api/admin/reset', auth, admin, (req,res) => {
  const t = getTarget(req,res); if (!t) return;
  t.balance = START_BALANCE; t.inventory = []; t.history = [];
  t.stats = {opened:0,upgrades:0,best:null}; t.usedPromos = []; t.freeAt = 0; t.topupAt = 0;
  addHist(t,'in','Стартовый бонус',START_BALANCE);
  save(); res.json({ok:true});
});
app.post('/api/admin/setpriv', auth, admin, (req,res) => {
  const t = getTarget(req,res); if (!t) return;
  const pv = req.body.privilege;
  t.privilege = PRIV[pv] ? pv : null;
  save(); res.json({ok:true,privilege:t.privilege});
});
app.post('/api/admin/promos', auth, admin, (req,res) => res.json({promos:db.promos}));
app.post('/api/admin/promo-create', auth, admin, (req,res) => {
  const code = String(req.body.code||'').trim().toUpperCase().replace(/\s+/g,'');
  if (!/^[A-Z0-9_]{3,20}$/.test(code)) return res.status(400).json({error:'Код: 3–20 символов (A-Z, 0-9, _)'});
  if (PROMOS[code] || db.promos[code]) return res.status(400).json({error:'Такой промокод уже существует'});
  const amount = Math.max(0,Math.floor(+req.body.amount||0));
  const itemId = ITEMS[req.body.itemId]?req.body.itemId:null;
  const caseId = CASES.find(c => c.id === req.body.caseId)?req.body.caseId:null;
  const privilege = PRIV[req.body.privilege]?req.body.privilege:null;
  const maxUses = Math.max(0,Math.floor(+req.body.maxUses||0));
  const expiresDays = Math.max(0,Math.floor(+req.body.expiresDays||0));
  if (!amount && !itemId && !caseId && !privilege) return res.status(400).json({error:'Добавь хотя бы одну награду'});
  db.promos[code] = {amount:amount||null,itemId,caseId,privilege,maxUses,expiresDays,
    expiresAt:expiresDays>0?Date.now()+expiresDays*86400000:0,createdBy:req.user.name,createdAt:Date.now(),uses:0,activatedBy:[]};
  save(); res.json({ok:true});
});
app.post('/api/admin/promo-delete', auth, admin, (req,res) => {
  const code = String(req.body.code||'').trim().toUpperCase();
  if (!db.promos[code]) return res.status(400).json({error:'Промокод не найден'});
  delete db.promos[code]; save(); res.json({ok:true});
});

app.use('/api',(req,res) => res.status(404).json({error:'Не найдено'}));
app.listen(PORT, () => console.log('✅ HC Gifts v7.1 (слоты=тройки, экономика понижена, удача в играх, косметика курицы): http://localhost:'+PORT));