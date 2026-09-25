const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');

/* ================= Игровые данные ================= */
const ITEMS = {
  candy:['🍬','Конфета','common',30],        lolli:['🍭','Лоллипоп','common',35],
  coffee:['☕','Кофе','common',50],           balloon:['🎈','Шарик','common',50],
  donut:['🍩','Пончик','common',60],          pizza:['🍕','Пицца','common',70],
  cactus:['🌵','Кактус','common',80],         frog:['🐸','Жаба-мем','common',90],
  heart:['❤️','Сердце','rare',140],           rose:['🌹','Роза','rare',130],
  pumpkin:['🎃','Тыква','rare',210],          cake:['🎂','Торт','rare',160],
  teddy:['🧸','Мишка Тедди','rare',170],      shades:['🕶️','Очки','rare',200],
  snow:['⛄','Снеговик','rare',280],          headphones:['🎧','Наушники','rare',230],
  skate:['🛹','Скейт','rare',260],            palm:['🌴','Пальма','rare',290],
  cherry:['🌸','Сакура','rare',310],          watch:['⌚','Часы','rare',300],
  champagne:['🍾','Шампанское','rare',340],   rocket:['🚀','Ракета','rare',380],
  gamepad:['🎮','Геймпад','epic',620],        robot:['🤖','Робот','epic',720],
  ring:['💍','Кольцо','epic',820],            diamond:['💎','Бриллиант','epic',950],
  moai:['🗿','Моаи','epic',1050],             planet:['🪐','Планета','epic',1150],
  crown:['👑','Корона','epic',1300],          star:['🌟','Звезда','legendary',3200],
  unicorn:['🦄','Единорог','legendary',4500], dragon:['🐉','Дракон','legendary',6000],
  trophy:['🏆','Кубок','legendary',7500],     phoenix:['🔥','Феникс','legendary',9000],
  ufo:['👽','НЛО','legendary',12000],         thor:['⚡','Молот Тора','legendary',15000],
  comet:['☄️','Комета','legendary',20000],    blackhole:['🕳️','Чёрная дыра','legendary',30000],
};
const CASES = [
  {id:'free', name:'Free Case', e:'🍀', price:0, free:true, drops:[
    ['candy',2200],['lolli',2000],['coffee',1400],['balloon',1200],['donut',1000],['pizza',800],
    ['cactus',500],['frog',400],['rose',350],['cake',100],['headphones',40],['gamepad',8],['star',1]]},
  {id:'sweet', name:'Sweet Case', e:'🍬', price:75, drops:[
    ['candy',2400],['lolli',2200],['coffee',1600],['balloon',1400],['donut',1000],['pizza',700],
    ['cactus',300],['frog',180],['rose',140],['teddy',60],['star',2]]},
  {id:'starter', name:'Starter Case', e:'🎒', price:150, drops:[
    ['candy',900],['lolli',900],['coffee',800],['balloon',750],['donut',600],['pizza',500],
    ['cactus',350],['frog',400],['rose',1100],['teddy',700],['cake',500],['shades',260],
    ['headphones',140],['rocket',60],['gamepad',45],['robot',18],['star',2]]},
  {id:'party', name:'Party Case', e:'🎉', price:300, drops:[
    ['balloon',800],['donut',500],['pizza',400],['frog',350],['rose',1100],['teddy',950],['cake',850],
    ['shades',700],['headphones',550],['skate',400],['watch',250],['champagne',200],['rocket',150],
    ['gamepad',130],['robot',90],['ring',45],['diamond',20],['crown',8],['star',14],['unicorn',4]]},
  {id:'gift', name:'Gift Case', e:'🎁', price:500, drops:[
    ['rose',800],['teddy',750],['cake',700],['shades',650],['headphones',600],['skate',480],
    ['watch',420],['champagne',400],['rocket',300],['gamepad',320],['robot',260],['ring',180],
    ['diamond',110],['moai',60],['planet',55],['crown',35],['star',30],['unicorn',14],['dragon',6]]},
  {id:'neon', name:'Neon City', e:'🌃', price:750, drops:[
    ['shades',600],['headphones',700],['skate',650],['watch',550],['champagne',500],['rocket',420],
    ['gamepad',520],['robot',430],['ring',340],['diamond',260],['moai',160],['planet',140],
    ['crown',95],['star',85],['unicorn',45],['dragon',25],['trophy',8]]},
  {id:'premium', name:'Premium Case', e:'💼', price:1000, drops:[
    ['rose',300],['teddy',280],['cake',260],['shades',250],['headphones',260],['skate',230],
    ['watch',220],['champagne',210],['rocket',200],['gamepad',520],['robot',480],['ring',420],
    ['diamond',360],['moai',260],['planet',240],['crown',180],['star',200],['unicorn',130],
    ['dragon',90],['trophy',40]]},
  {id:'love', name:'Love Case', e:'💝', price:1200, drops:[
    ['heart',900],['rose',800],['teddy',700],['cake',600],['cherry',500],['champagne',400],
    ['ring',350],['diamond',150],['crown',60],['star',90],['unicorn',40],['dragon',18],['trophy',8],['phoenix',3]]},
  {id:'cyber', name:'Cyber Case', e:'🤖', price:1600, drops:[
    ['headphones',200],['champagne',150],['watch',260],['rocket',420],['gamepad',520],['robot',480],
    ['ring',380],['diamond',340],['moai',240],['planet',220],['crown',170],['star',150],
    ['unicorn',105],['dragon',75],['trophy',45],['phoenix',18],['ufo',4]]},
  {id:'halloween', name:'Halloween', e:'🎃', price:1800, drops:[
    ['pumpkin',700],['cactus',300],['frog',400],['shades',500],['rocket',350],['moai',400],
    ['planet',300],['crown',180],['star',200],['dragon',120],['phoenix',60],['ufo',20]]},
  {id:'royal', name:'Royal Case', e:'👑', price:2200, drops:[
    ['rose',150],['champagne',120],['gamepad',250],['robot',220],['ring',420],['diamond',400],
    ['moai',320],['planet',300],['crown',260],['star',240],['unicorn',170],['dragon',130],
    ['trophy',90],['phoenix',55],['ufo',14]]},
  {id:'winter', name:'Winter Case', e:'❄️', price:2600, drops:[
    ['snow',700],['cake',400],['watch',350],['champagne',300],['diamond',400],['planet',300],
    ['crown',200],['star',260],['unicorn',160],['dragon',110],['trophy',70],['phoenix',30],['ufo',8]]},
  {id:'space', name:'Space Case', e:'🚀', price:3000, drops:[
    ['champagne',150],['rocket',500],['gamepad',260],['robot',240],['diamond',440],['moai',420],
    ['planet',560],['crown',380],['star',340],['unicorn',260],['dragon',210],['trophy',160],
    ['phoenix',105],['ufo',30],['comet',6]]},
  {id:'elite', name:'Elite Case', e:'💠', price:4000, drops:[
    ['robot',180],['ring',220],['moai',340],['planet',400],['diamond',460],['crown',430],
    ['star',380],['unicorn',300],['dragon',250],['trophy',200],['phoenix',150],['ufo',45],['comet',10]]},
  {id:'mythic', name:'Mythic Case', e:'🔮', price:5000, drops:[
    ['champagne',120],['rocket',260],['ring',140],['moai',230],['planet',260],['diamond',280],
    ['crown',300],['star',420],['unicorn',360],['dragon',320],['trophy',270],['phoenix',210],
    ['ufo',60],['comet',14]]},
  {id:'golden', name:'Golden Case', e:'🥇', price:6500, drops:[
    ['rocket',80],['planet',170],['moai',140],['diamond',200],['crown',240],['star',380],
    ['unicorn',320],['dragon',280],['trophy',280],['phoenix',230],['ufo',90],['comet',30]]},
  {id:'dragon', name:"Dragon's Hoard", e:'🐉', price:7500, drops:[
    ['rocket',60],['moai',120],['planet',140],['diamond',160],['crown',190],['star',320],
    ['unicorn',360],['dragon',520],['trophy',420],['phoenix',480],['ufo',180],['comet',80]]},
  {id:'inferno', name:'Inferno Case', e:'🔥', price:8000, drops:[
    ['crown',350],['star',500],['unicorn',420],['dragon',380],['trophy',340],['phoenix',280],
    ['ufo',130],['comet',40],['blackhole',6]]},
  {id:'legend', name:'Legend Case', e:'👽', price:9500, drops:[
    ['ring',70],['moai',110],['planet',130],['diamond',150],['crown',200],['star',420],
    ['unicorn',400],['dragon',380],['trophy',360],['phoenix',340],['ufo',360],['comet',320]]},
  {id:'quantum', name:'Quantum Case', e:'⚛️', price:11000, drops:[
    ['star',520],['unicorn',460],['dragon',430],['trophy',400],['phoenix',330],['ufo',170],
    ['comet',60],['blackhole',12]]},
  {id:'godlike', name:'Godlike Case', e:'🌠', price:15000, drops:[
    ['star',600],['unicorn',520],['dragon',500],['trophy',470],['phoenix',400],['ufo',230],
    ['comet',90],['blackhole',25],['thor',40]]},
  {id:'ultimate', name:'Ultimate Case', e:'🌈', price:25000, drops:[
    ['dragon',600],['trophy',550],['phoenix',500],['ufo',350],['comet',160],['blackhole',60],['thor',120]]},
];

/* Промокоды. NERES — админка. Смени перед запуском для игроков! */
const PROMOS = {
  NERES:  {admin:true},
  HC1000: {amount:1000},
  HC5000: {amount:5000},
  GIFT:   {item:'randomRare'},
};

const AVATARS = ['🦊','🐼','🐸','🦁','🐯','🐙','🦄','🐨','🐺','🐵','🦉','🐳'];
const START_BALANCE = 1000;
const FREE_COOLDOWN = 10 * 60 * 1000;

/* ================= База (JSON-файл) ================= */
let db;
function freshDB(){ return { users:{}, tokens:{}, feed:[], nextId:1 }; }
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e){ db = freshDB(); }
let saveT = null;
function save(){
  clearTimeout(saveT);
  saveT = setTimeout(() => { try { fs.writeFileSync(DB_FILE, JSON.stringify(db)); } catch(e){} }, 300);
}
process.on('SIGINT', () => { try { fs.writeFileSync(DB_FILE, JSON.stringify(db)); } catch(e){} process.exit(0); });

/* ================= Утилиты ================= */
const itV = id => ITEMS[id][3];
const dropTotal = cs => cs.drops.reduce((s,d)=>s+d[1],0);
function pickDrop(cs){ let r = Math.random()*dropTotal(cs); for (const [id,w] of cs.drops){ if ((r-=w) < 0) return id; } return cs.drops[0][0]; }
const newUid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);
const hash = (pw, salt) => crypto.scryptSync(String(pw), salt, 64).toString('hex');
function pubUser(u){ const {passHash, salt, nameLower, ...rest} = u; return rest; }
function findByName(n){ const l = String(n).toLowerCase(); return Object.values(db.users).find(u => u.nameLower === l); }
function addHist(u, dir, title, amount){
  u.history.unshift({dir, title, amount, ts:Date.now()});
  if (u.history.length > 60) u.history.length = 60;
}
function credit(u, amount, title){ u.balance += amount; addHist(u, 'in', title, amount); }
function addFeed(user, item){ db.feed.unshift({user, item, ts:Date.now()}); if (db.feed.length > 30) db.feed.length = 30; }

/* ================= Приложение ================= */
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const minesGames = new Map();
const crashGames = new Map();

function auth(req, res, next){
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  const u = db.tokens[t] ? db.users[db.tokens[t]] : null;
  if (!u) return res.status(401).json({error:'Требуется вход'});
  if (u.banned) return res.status(403).json({banned:true, error:'Аккаунт заблокирован'});
  req.user = u; next();
}
const admin = (req,res,next) => req.user.admin ? next() : res.status(403).json({error:'Нет прав администратора'});

/* ---------- Регистрация / вход ---------- */
app.post('/api/register', (req,res) => {
  const name = String(req.body.name||'').trim();
  const pass = String(req.body.password||'');
  if (!/^[\wа-яё-]{2,16}$/i.test(name)) return res.status(400).json({error:'Ник: 2–16 символов (буквы, цифры, _ -)'});
  if (pass.length < 3) return res.status(400).json({error:'Пароль минимум 3 символа'});
  if (findByName(name)) return res.status(400).json({error:'Ник уже занят'});
  const salt = crypto.randomBytes(16).toString('hex');
  const u = {
    id: 'u' + (db.nextId++), name, nameLower: name.toLowerCase(), salt, passHash: hash(pass, salt),
    createdAt: Date.now(), banned:false, admin:false,
    balance: START_BALANCE, freeAt: 0,
    avatar: AVATARS[Math.floor(Math.random()*AVATARS.length)],
    joined: Date.now(), ref: Math.random().toString(36).slice(2,10),
    stats: {opened:0, upgrades:0, best:null},
    inventory: [], history: [], usedPromos: [],
  };
  addHist(u, 'in', 'Стартовый бонус', START_BALANCE);
  db.users[u.id] = u;
  const token = crypto.randomBytes(24).toString('hex');
  db.tokens[token] = u.id; save();
  res.json({token, user: pubUser(u)});
});

app.post('/api/login', (req,res) => {
  const u = findByName(req.body.name);
  if (!u) return res.status(401).json({error:'Неверный ник или пароль'});
  if (u.passHash !== hash(req.body.password||'', u.salt)) return res.status(401).json({error:'Неверный ник или пароль'});
  if (u.banned) return res.status(403).json({banned:true, error:'Аккаунт заблокирован'});
  const token = crypto.randomBytes(24).toString('hex');
  db.tokens[token] = u.id; save();
  res.json({token, user: pubUser(u)});
});

app.post('/api/me', auth, (req,res) => res.json({user: pubUser(req.user)}));
app.post('/api/feed', auth, (req,res) => res.json({feed: db.feed}));
app.post('/api/logout', auth, (req,res) => {
  const t = (req.headers.authorization||'').replace('Bearer ','');
  delete db.tokens[t]; save(); res.json({ok:true});
});

/* ---------- Кейсы ---------- */
app.post('/api/open-case', auth, (req,res) => {
  const cs = CASES.find(c => c.id === req.body.caseId);
  if (!cs) return res.status(400).json({error:'Кейс не найден'});
  if (cs.free){
    if (Date.now() < req.user.freeAt) return res.status(400).json({error:'Фри-кейс ещё не доступен'});
    req.user.freeAt = Date.now() + FREE_COOLDOWN;
  } else {
    if (req.user.balance < cs.price) return res.status(400).json({error:'Недостаточно HC', need: cs.price - req.user.balance});
    req.user.balance -= cs.price;
    addHist(req.user, 'out', 'Кейс «' + cs.name + '»', cs.price);
  }
  const item = pickDrop(cs);
  const entry = {uid:newUid(), id:item, case:cs.id, ts:Date.now()};
  req.user.inventory.unshift(entry);
  req.user.stats.opened++;
  if (!req.user.stats.best || itV(item) > req.user.stats.best.v)
    req.user.stats.best = {e:ITEMS[item][0], n:ITEMS[item][1], v:itV(item)};
  addFeed(req.user.name, item);
  save();
  res.json({item, entry, balance:req.user.balance, freeAt:req.user.freeAt, opened:req.user.stats.opened});
});

/* ---------- Инвентарь / кошелёк ---------- */
app.post('/api/sell', auth, (req,res) => {
  const i = req.user.inventory.findIndex(x => x.uid === req.body.uid);
  if (i < 0) return res.status(400).json({error:'Предмет не найден'});
  const inv = req.user.inventory.splice(i,1)[0];
  credit(req.user, itV(inv.id), 'Продажа: ' + ITEMS[inv.id][1]);
  save(); res.json({balance:req.user.balance});
});
app.post('/api/sell-all', auth, (req,res) => {
  const sum = req.user.inventory.reduce((s,x) => s + itV(x.id), 0);
  req.user.inventory = [];
  if (sum > 0) credit(req.user, sum, 'Продажа всего инвентаря');
  save(); res.json({balance:req.user.balance});
});
app.post('/api/topup', auth, (req,res) => {
  const v = Math.floor(+req.body.amount || 0);
  if (v < 1 || v > 1000000) return res.status(400).json({error:'Сумма 1–1 000 000'});
  credit(req.user, v, 'Пополнение (демо, бесплатно)');
  save(); res.json({balance:req.user.balance});
});
app.post('/api/withdraw', auth, (req,res) => {
  const v = Math.floor(+req.body.amount || 0);
  if (v < 1) return res.status(400).json({error:'Некорректная сумма'});
  if (v > req.user.balance) return res.status(400).json({error:'Сумма превышает баланс'});
  req.user.balance -= v;
  addHist(req.user, 'out', 'Вывод средств (заявка)', v);
  save(); res.json({balance:req.user.balance});
});
app.post('/api/reset', auth, (req,res) => {
  const wasAdmin = req.user.admin;
  Object.assign(req.user, {
    balance: START_BALANCE, freeAt: 0, stats: {opened:0, upgrades:0, best:null},
    inventory: [], history: [], usedPromos: [], admin: wasAdmin,
  });
  addHist(req.user, 'in', 'Стартовый бонус', START_BALANCE);
  save(); res.json({user: pubUser(req.user)});
});

/* ---------- Промокоды ---------- */
app.post('/api/promo', auth, (req,res) => {
  const code = String(req.body.code||'').trim().toUpperCase();
  const p = PROMOS[code];
  if (!p) return res.status(400).json({error:'Промокод не найден'});
  if (p.admin){
    if (req.user.admin) return res.json({message:'👑 Админка уже активна'});
    req.user.admin = true; save();
    return res.json({message:'👑 Админ-панель активирована', admin:true});
  }
  if (req.user.usedPromos.includes(code)) return res.status(400).json({error:'Промокод уже использован'});
  req.user.usedPromos.push(code);
  let msg = '🎁 Промокод активирован';
  if (p.amount){ credit(req.user, p.amount, 'Промокод ' + code); msg = '🎁 +' + p.amount.toLocaleString('ru-RU') + ' HC'; }
  if (p.item === 'randomRare'){
    const rares = Object.keys(ITEMS).filter(id => ITEMS[id][2] === 'rare');
    const id = rares[Math.floor(Math.random()*rares.length)];
    req.user.inventory.unshift({uid:newUid(), id, case:'promo', ts:Date.now()});
    msg += ' · предмет ' + ITEMS[id][0] + ' ' + ITEMS[id][1];
  }
  save(); res.json({message:msg, balance:req.user.balance});
});

/* ---------- Апгрейдер ---------- */
app.post('/api/upgrade', auth, (req,res) => {
  const uids = Array.isArray(req.body.uids) ? req.body.uids : [];
  const target = String(req.body.target||'');
  if (!ITEMS[target]) return res.status(400).json({error:'Цель не найдена'});
  const items = [];
  for (const uid of uids){
    const inv = req.user.inventory.find(x => x.uid === uid);
    if (!inv) return res.status(400).json({error:'Предмет не найден'});
    items.push(inv);
  }
  if (!items.length) return res.status(400).json({error:'Выберите предметы'});
  const inVal = items.reduce((s,x) => s + itV(x.id), 0);
  if (itV(target) <= inVal) return res.status(400).json({error:'Цель должна быть дороже входа'});
  const chance = Math.min(95, Math.max(1, inVal/itV(target)*90));
  const win = Math.random()*100 < chance;
  const inNames = items.map(x => ITEMS[x.id][1]).join(' + ');
  req.user.inventory = req.user.inventory.filter(x => !uids.includes(x.uid));
  req.user.stats.upgrades++;
  let entry = null;
  if (win){
    entry = {uid:newUid(), id:target, case:'upgrade', ts:Date.now()};
    req.user.inventory.unshift(entry);
    if (!req.user.stats.best || itV(target) > req.user.stats.best.v)
      req.user.stats.best = {e:ITEMS[target][0], n:ITEMS[target][1], v:itV(target)};
    addHist(req.user, 'in', 'Апгрейд: ' + inNames + ' → ' + ITEMS[target][1], itV(target));
    addFeed(req.user.name, target);
  } else {
    addHist(req.user, 'out', 'Апгрейд не удался (' + inNames + ')', inVal);
  }
  save();
  res.json({win, chance, entry, balance:req.user.balance});
});

/* ---------- Мини-игры ---------- */
app.post('/api/game/coin', auth, (req,res) => {
  const bet = Math.floor(+req.body.bet || 0);
  const side = req.body.side === 'tails' ? 'tails' : 'heads';
  if (bet < 1 || bet > req.user.balance) return res.status(400).json({error:'Некорректная ставка'});
  req.user.balance -= bet; addHist(req.user, 'out', 'Ставка: Coin Flip', bet);
  const result = Math.random() < .5 ? 'heads' : 'tails';
  const win = result === side;
  let payout = 0;
  if (win){ payout = Math.round(bet*1.96); credit(req.user, payout, 'Coin Flip выигрыш'); }
  save(); res.json({result, win, payout, balance:req.user.balance});
});

app.post('/api/game/dice', auth, (req,res) => {
  const bet = Math.floor(+req.body.bet || 0);
  const target = Math.min(98, Math.max(2, Math.floor(+req.body.target || 50)));
  if (bet < 1 || bet > req.user.balance) return res.status(400).json({error:'Некорректная ставка'});
  req.user.balance -= bet; addHist(req.user, 'out', 'Ставка: Dice', bet);
  const roll = +(Math.random()*100).toFixed(2);
  const win = roll < target;
  let payout = 0;
  if (win){ payout = Math.round(bet*99/target); credit(req.user, payout, 'Dice выигрыш x' + (99/target).toFixed(2)); }
  save(); res.json({roll, win, payout, balance:req.user.balance});
});

app.post('/api/game/mines/start', auth, (req,res) => {
  const bet = Math.floor(+req.body.bet || 0);
  const count = [3,5,10].includes(+req.body.count) ? +req.body.count : 3;
  if (bet < 1 || bet > req.user.balance) return res.status(400).json({error:'Некорректная ставка'});
  req.user.balance -= bet; addHist(req.user, 'out', 'Ставка: Mines', bet);
  const idx = [...Array(25).keys()];
  for (let i = idx.length-1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); [idx[i],idx[j]] = [idx[j],idx[i]]; }
  minesGames.set(req.user.id, {bet, count, mineSet:new Set(idx.slice(0,count)), opened:new Set(), mult:1, picks:0});
  save(); res.json({ok:true, balance:req.user.balance});
});
app.post('/api/game/mines/pick', auth, (req,res) => {
  const g = minesGames.get(req.user.id);
  if (!g) return res.status(400).json({error:'Нет активной игры'});
  const cell = +req.body.cell;
  if (!(cell >= 0 && cell < 25) || g.opened.has(cell)) return res.status(400).json({error:'Некорректная клетка'});
  if (g.mineSet.has(cell)){
    minesGames.delete(req.user.id);
    save();
    return res.json({boom:true, mines:[...g.mineSet], balance:req.user.balance});
  }
  g.opened.add(cell);
  g.mult *= (25 - g.picks) / (25 - g.count - g.picks);
  g.picks++;
  if (g.picks >= 25 - g.count){
    const payout = Math.round(g.bet * g.mult * 0.97);
    credit(req.user, payout, 'Mines выигрыш x' + (g.mult*0.97).toFixed(2));
    minesGames.delete(req.user.id); save();
    return res.json({finished:true, win:true, payout, mult:g.mult*0.97, mines:[...g.mineSet], balance:req.user.balance});
  }
  save();
  res.json({gem:true, mult:+(g.mult*0.97).toFixed(4), next:+(g.mult*(25-g.picks)/(25-g.count-g.picks)*0.97).toFixed(4)});
});
app.post('/api/game/mines/cash', auth, (req,res) => {
  const g = minesGames.get(req.user.id);
  if (!g) return res.status(400).json({error:'Нет активной игры'});
  const payout = Math.round(g.bet * g.mult * 0.97);
  credit(req.user, payout, 'Mines выигрыш x' + (g.mult*0.97).toFixed(2));
  const mines = [...g.mineSet];
  minesGames.delete(req.user.id); save();
  res.json({win:true, payout, mult:+(g.mult*0.97).toFixed(4), mines, balance:req.user.balance});
});

app.post('/api/game/crash/start', auth, (req,res) => {
  const bet = Math.floor(+req.body.bet || 0);
  if (bet < 1 || bet > req.user.balance) return res.status(400).json({error:'Некорректная ставка'});
  req.user.balance -= bet; addHist(req.user, 'out', 'Ставка: Crash', bet);
  const crashAt = Math.min(250, Math.max(1.01, 0.99/(1 - Math.random())));
  crashGames.set(req.user.id, {startTs:Date.now(), crashAt, bet});
  save(); res.json({ok:true, balance:req.user.balance});
});
app.post('/api/game/crash/cash', auth, (req,res) => {
  const g = crashGames.get(req.user.id);
  if (!g) return res.status(400).json({error:'Нет активной игры'});
  const mult = Math.exp(0.00019 * (Date.now() - g.startTs));
  if (mult >= g.crashAt){
    crashGames.delete(req.user.id); save();
    return res.json({win:false, mult:+g.crashAt.toFixed(2), balance:req.user.balance});
  }
  const payout = Math.round(g.bet * mult);
  credit(req.user, payout, 'Crash выигрыш x' + mult.toFixed(2));
  crashGames.delete(req.user.id); save();
  res.json({win:true, mult:+mult.toFixed(2), payout, balance:req.user.balance});
});

/* ---------- Админ-панель ---------- */
app.post('/api/admin/users', auth, admin, (req,res) => {
  const list = Object.values(db.users)
    .map(u => ({id:u.id, name:u.name, avatar:u.avatar, balance:u.balance, items:u.inventory.length, banned:u.banned, admin:u.admin, joined:u.createdAt}))
    .sort((a,b) => b.joined - a.joined);
  res.json({users:list});
});
function getTarget(req,res){
  const t = db.users[req.body.userId];
  if (!t){ res.status(404).json({error:'Игрок не найден'}); return null; }
  return t;
}
app.post('/api/admin/give', auth, admin, (req,res) => {
  const t = getTarget(req,res); if (!t) return;
  const amount = Math.floor(+req.body.amount || 0);
  if (!amount) return res.status(400).json({error:'Укажите сумму'});
  t.balance = Math.max(0, t.balance + amount);
  addHist(t, amount > 0 ? 'in' : 'out', amount > 0 ? '👑 Админ: начисление' : '👑 Админ: списание', Math.abs(amount));
  save(); res.json({ok:true, balance:t.balance});
});
app.post('/api/admin/give-item', auth, admin, (req,res) => {
  const t = getTarget(req,res); if (!t) return;
  const id = req.body.itemId;
  if (!ITEMS[id]) return res.status(400).json({error:'Предмет не найден'});
  t.inventory.unshift({uid:newUid(), id, case:'admin', ts:Date.now()});
  addHist(t, 'in', '👑 Админ: выдан ' + ITEMS[id][1], itV(id));
  save(); res.json({ok:true});
});
app.post('/api/admin/ban', auth, admin, (req,res) => {
  const t = getTarget(req,res); if (!t) return;
  if (t.id === req.user.id) return res.status(400).json({error:'Нельзя забанить себя'});
  t.banned = !!req.body.banned; save(); res.json({ok:true, banned:t.banned});
});
app.post('/api/admin/reset', auth, admin, (req,res) => {
  const t = getTarget(req,res); if (!t) return;
  t.balance = START_BALANCE; t.inventory = []; t.history = [];
  t.stats = {opened:0, upgrades:0, best:null}; t.usedPromos = []; t.freeAt = 0;
  addHist(t, 'in', 'Стартовый бонус', START_BALANCE);
  save(); res.json({ok:true});
});
app.post('/api/admin/setfree', auth, admin, (req,res) => {
  const t = getTarget(req,res); if (!t) return;
  t.freeAt = 0; save(); res.json({ok:true});
});

app.use('/api', (req,res) => res.status(404).json({error:'Не найдено'}));

app.listen(PORT, () => console.log('✅ HC Gifts server: http://localhost:' + PORT));