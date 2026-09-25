const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');

/* ================= Редкости ================= */
const RAR = {
  common:    {label:'Common',    c:'#8B93A7'},
  rare:      {label:'Rare',      c:'#38BDF8'},
  epic:      {label:'Epic',      c:'#A855F7'},
  legendary: {label:'Legendary', c:'#F5B544'},
  mythic:    {label:'Mythic',    c:'#F43F5E'},
  divine:    {label:'Divine',    c:'#67E8F9'},
  secret:    {label:'Secret',    c:'#FFFFFF'},
};

/* ================= Предметы (89) ================= */
const ITEMS = {
  candy:['🍬','Конфета','common',30], lolli:['🍭','Лоллипоп','common',35], cookie:['🍪','Печенька','common',40],
  coffee:['☕','Кофе','common',50], balloon:['🎈','Шарик','common',50], soda:['🥤','Содовая','common',55],
  donut:['🍩','Пончик','common',60], icecream:['🍦','Мороженое','common',65], pizza:['🍕','Пицца','common',70],
  dice:['🎲','Кубик','common',75], cactus:['🌵','Кактус','common',80], key:['🔑','Ключик','common',85],
  frog:['🐸','Жаба-мем','common',90], book:['📖','Книга','common',95], magnet:['🧲','Магнит','common',105],
  bulb:['💡','Лампочка','common',110],
  heart:['❤️','Сердце','rare',140], rose:['🌹','Роза','rare',130], cake:['🎂','Торт','rare',160],
  teddy:['🧸','Мишка Тедди','rare',170], shades:['🕶️','Очки','rare',200], pumpkin:['🎃','Тыква','rare',210],
  headphones:['🎧','Наушники','rare',230], skate:['🛹','Скейт','rare',260], snow:['⛄','Снеговик','rare',280],
  palm:['🌴','Пальма','rare',290], watch:['⌚','Часы','rare',300], cherry:['🌸','Сакура','rare',310],
  champagne:['🍾','Шампанское','rare',340], rocket:['🚀','Ракета','rare',380], guitar:['🎸','Гитара','rare',420],
  football:['⚽','Мяч','rare',440], plane:['✈️','Самолёт','rare',460], gift:['🎁','Подарок','rare',480],
  anchor:['⚓','Якорь','rare',500], bell:['🔔','Колокол','rare',520], map:['🗺️','Карта сокровищ','rare',540],
  candle:['🕯️','Свеча','rare',560],
  gamepad:['🎮','Геймпад','epic',620], robot:['🤖','Робот','epic',720], ring:['💍','Кольцо','epic',820],
  diamond:['💎','Бриллиант','epic',950], moai:['🗿','Моаи','epic',1050], planet:['🪐','Планета','epic',1150],
  crown:['👑','Корона','epic',1300], skull:['💀','Череп','epic',1350], target:['🎯','Мишень','epic',1400],
  bomb:['💣','Бомба','epic',1450], camera:['📷','Камера','epic',1500], tophat:['🎩','Цилиндр','epic',1550],
  nazar:['🧿','Амулет','epic',1600], treasure:['💰','Сундук золота','epic',1650], helicopter:['🚁','Вертолёт','epic',1700],
  statue:['🗽','Статуя','epic',1750], magicball:['🔮','Хрустальный шар','epic',1800],
  star:['🌟','Звезда','legendary',3200], unicorn:['🦄','Единорог','legendary',4500], dragon:['🐉','Дракон','legendary',6000],
  trophy:['🏆','Кубок','legendary',7500], phoenix:['🔥','Феникс','legendary',9000], ufo:['👽','НЛО','legendary',12000],
  thor:['⚡','Молот Тора','legendary',15000], rainbow:['🌈','Радуга','legendary',17000], sword:['🗡️','Клинок','legendary',18000],
  comet:['☄️','Комета','legendary',20000], castle:['🏰','Замок','legendary',23000], moon:['🌙','Луна','legendary',26000],
  genie:['🧞','Джинн','legendary',28000], blackhole:['🕳️','Чёрная дыра','legendary',30000],
  volcano:['🌋','Вулкан','mythic',45000], squid:['🦑','Кракен','mythic',50000], wolf:['🐺','Альфа-волк','mythic',55000],
  tornado:['🌪️','Торнадо','mythic',60000], shield:['🛡️','Щит титана','mythic',65000],
  dragonlord:['🐲','Повелитель драконов','mythic',70000], trex:['🦖','Ти-Рекс','mythic',75000], tsunami:['🌊','Цунами','mythic',80000],
  trident:['🔱','Трезубец Посейдона','divine',100000], sun:['🌞','Солнце','divine',120000],
  earth:['🌍','Планета Земля','divine',150000], angel:['👼','Ангел','divine',180000],
  dove:['🕊️','Голубь мира','divine',200000], infinity:['♾️','Бесконечность','divine',250000],
  joker:['🃏','Джокер','secret',300000], eye:['👁️','Всевидящее око','secret',400000],
  masks:['🎭','Маски театра','secret',500000], ball8:['🎱','Магический шар','secret',600000],
  galaxy:['🌌','Галактика','secret',750000], supernova:['💫','Сверхновая','secret',1000000],
};

/* ================= Кейсы (77) ================= */
const CASES = [
  {id:'free',name:'Free Case',e:'🍀',price:0,free:true,c:['#1E3A34','#0F1A18'],drops:[['candy',2200],['lolli',2000],['coffee',1400],['balloon',1200],['donut',1000],['pizza',800],['cactus',500],['frog',400],['rose',350],['cake',100],['headphones',40],['gamepad',8],['star',1]]},
  {id:'sweet',name:'Sweet Case',e:'🍬',price:75,c:['#4A1F4E','#1C0F26'],drops:[['candy',2400],['lolli',2200],['coffee',1600],['balloon',1400],['donut',1000],['pizza',700],['cactus',300],['frog',180],['rose',140],['teddy',60],['star',2]]},
  {id:'coffee',name:'Coffee Break',e:'☕',price:100,c:['#5D4037','#241812'],drops:[['candy',1800],['lolli',1500],['coffee',1600],['balloon',900],['donut',1000],['pizza',600],['cactus',300],['frog',250],['rose',500],['cake',150],['headphones',60],['gamepad',15],['star',2]]},
  {id:'starter',name:'Starter Case',e:'🎒',price:150,c:['#2F2C68','#161232'],drops:[['candy',900],['lolli',900],['coffee',800],['balloon',750],['donut',600],['pizza',500],['cactus',350],['frog',400],['rose',1100],['teddy',700],['cake',500],['shades',260],['headphones',140],['rocket',60],['gamepad',45],['robot',18],['star',2]]},
  {id:'snackz',name:'Snack Zone',e:'🍿',price:200,c:['#B45309','#3B1D05'],drops:[['candy',1600],['cookie',1500],['lolli',1400],['soda',1300],['coffee',1000],['icecream',1000],['donut',900],['balloon',500],['dice',300],['key',200],['book',150],['magnet',100],['bulb',40],['rose',8],['star',1]]},
  {id:'beach',name:'Beach Party',e:'🏖️',price:250,c:['#0E7490','#082830'],drops:[['balloon',1200],['donut',700],['pizza',600],['frog',500],['palm',1600],['cherry',700],['rose',700],['shades',600],['skate',350],['watch',180],['champagne',150],['rocket',60],['ring',12],['star',5]]},
  {id:'party',name:'Party Case',e:'🎉',price:300,c:['#5E2347','#22102A'],drops:[['balloon',800],['donut',500],['pizza',400],['frog',350],['rose',1100],['teddy',950],['cake',850],['shades',700],['headphones',550],['skate',400],['watch',250],['champagne',200],['rocket',150],['gamepad',130],['robot',90],['ring',45],['diamond',20],['crown',8],['star',14],['unicorn',4]]},
  {id:'music',name:'Music Case',e:'🎵',price:350,c:['#7C2D12','#2A0F06'],drops:[['balloon',900],['donut',600],['rose',800],['headphones',1700],['skate',600],['watch',350],['champagne',450],['rocket',250],['gamepad',350],['robot',120],['ring',50],['star',9]]},
  {id:'sport',name:'Sport Cup',e:'⚽',price:400,c:['#166534','#0A2213'],drops:[['balloon',1200],['pizza',900],['soda',700],['football',2200],['skate',800],['watch',500],['gift',400],['guitar',200],['plane',150],['anchor',100],['bell',80],['map',60],['candle',40],['gamepad',60],['robot',20],['ring',8],['star',3]]},
  {id:'retro',name:'Retro Arcade',e:'🕹️',price:450,c:['#3730A3','#151038'],drops:[['pizza',700],['frog',600],['shades',700],['headphones',900],['skate',800],['watch',450],['champagne',350],['rocket',300],['gamepad',1600],['robot',550],['ring',180],['diamond',50],['star',14]]},
  {id:'gift',name:'Gift Case',e:'🎁',price:500,c:['#472A7A','#1B1236'],drops:[['rose',800],['teddy',750],['cake',700],['shades',650],['headphones',600],['skate',480],['watch',420],['champagne',400],['rocket',300],['gamepad',320],['robot',260],['ring',180],['diamond',110],['moai',60],['planet',55],['crown',35],['star',30],['unicorn',14],['dragon',6]]},
  {id:'jungle',name:'Jungle Quest',e:'🌴',price:600,c:['#14532D','#0A1F10'],drops:[['cactus',1000],['frog',1300],['palm',1700],['cherry',900],['rose',700],['shades',450],['skate',350],['watch',300],['champagne',250],['rocket',180],['gamepad',220],['robot',140],['diamond',40],['star',12]]},
  {id:'rock',name:'Rock Stage',e:'🎸',price:700,c:['#581C87','#1E0A33'],drops:[['shades',900],['headphones',1600],['guitar',2000],['bell',500],['candle',400],['camera',300],['tophat',250],['watch',400],['champagne',350],['rocket',250],['gamepad',300],['robot',150],['ring',80],['diamond',30],['moai',15],['star',10],['unicorn',3]]},
  {id:'neon',name:'Neon City',e:'🌃',price:750,c:['#173B63','#101B33'],drops:[['shades',600],['headphones',700],['skate',650],['watch',550],['champagne',500],['rocket',420],['gamepad',520],['robot',430],['ring',340],['diamond',260],['moai',160],['planet',140],['crown',95],['star',85],['unicorn',45],['dragon',25],['trophy',8]]},
  {id:'desert',name:'Desert Treasure',e:'🏜️',price:850,c:['#92400E','#3B1D05'],drops:[['cactus',1500],['frog',600],['palm',900],['rose',500],['shades',700],['watch',550],['champagne',400],['rocket',350],['moai',1000],['crown',120],['diamond',70],['star',16],['unicorn',4]]},
  {id:'travel',name:'Jet Setter',e:'✈️',price:950,c:['#0E7490','#06222B'],drops:[['balloon',800],['palm',1500],['map',1400],['plane',1600],['cherry',700],['shades',600],['watch',500],['gift',450],['anchor',300],['bell',250],['camera',200],['football',250],['guitar',150],['champagne',200],['rocket',150],['gamepad',150],['robot',70],['diamond',25],['planet',10],['star',8]]},
  {id:'premium',name:'Premium Case',e:'💼',price:1000,c:['#3A2E85','#181238'],drops:[['rose',300],['teddy',280],['cake',260],['shades',250],['headphones',260],['skate',230],['watch',220],['champagne',210],['rocket',200],['gamepad',520],['robot',480],['ring',420],['diamond',360],['moai',260],['planet',240],['crown',180],['star',200],['unicorn',130],['dragon',90],['trophy',40]]},
  {id:'ocean',name:'Ocean Deep',e:'🌊',price:1100,c:['#1E40AF','#0B1B3A'],drops:[['balloon',600],['frog',700],['palm',800],['cherry',600],['shades',550],['watch',650],['champagne',550],['rocket',400],['diamond',220],['planet',140],['crown',70],['star',20],['unicorn',6]]},
  {id:'love',name:'Love Case',e:'💝',price:1200,c:['#7A1F3D','#2A0E1A'],drops:[['heart',900],['rose',800],['teddy',700],['cake',600],['cherry',500],['champagne',400],['ring',350],['diamond',150],['crown',60],['star',90],['unicorn',40],['dragon',18],['trophy',8],['phoenix',3]]},
  {id:'sky',name:'Sky Clouds',e:'☁️',price:1300,c:['#475569','#1E2530'],drops:[['balloon',1000],['cherry',700],['snow',800],['shades',550],['watch',550],['champagne',450],['rocket',700],['planet',240],['crown',140],['star',50],['unicorn',14],['dragon',5]]},
  {id:'cyber',name:'Cyber Case',e:'🤖',price:1600,c:['#16405E','#0F1A33'],drops:[['headphones',200],['champagne',150],['watch',260],['rocket',420],['gamepad',520],['robot',480],['ring',380],['diamond',340],['moai',240],['planet',220],['crown',170],['star',150],['unicorn',105],['dragon',75],['trophy',45],['phoenix',18],['ufo',4]]},
  {id:'storm',name:'Thunder Storm',e:'⛈️',price:1700,c:['#334155','#111827'],drops:[['shades',500],['headphones',600],['watch',500],['champagne',450],['rocket',700],['gamepad',400],['robot',350],['ring',280],['diamond',240],['moai',160],['planet',200],['crown',140],['star',160],['unicorn',90],['dragon',50],['phoenix',12],['thor',4]]},
  {id:'halloween',name:'Halloween',e:'🎃',price:1800,c:['#5E2A0A','#1D0E05'],drops:[['pumpkin',700],['cactus',300],['frog',400],['shades',500],['rocket',350],['moai',400],['planet',300],['crown',180],['star',200],['dragon',120],['phoenix',60],['ufo',20]]},
  {id:'spooky',name:'Spooky Night',e:'👻',price:1900,c:['#3B0764','#150524'],drops:[['pumpkin',1600],['skull',1400],['candle',1200],['bomb',800],['nazar',600],['camera',500],['magicball',400],['statue',300],['treasure',200],['helicopter',150],['moai',200],['crown',100],['diamond',150],['planet',80],['star',90],['unicorn',40],['dragon',15],['phoenix',5]]},
  {id:'ice',name:'Ice Kingdom',e:'🧊',price:2000,c:['#155E75','#0A1C26'],drops:[['snow',1400],['cake',500],['watch',450],['champagne',400],['diamond',500],['planet',380],['crown',260],['star',320],['unicorn',200],['dragon',140],['trophy',90],['phoenix',40],['ufo',10]]},
  {id:'royal',name:'Royal Case',e:'👑',price:2200,c:['#6B4E1B','#241A0E'],drops:[['rose',150],['champagne',120],['gamepad',250],['robot',220],['ring',420],['diamond',400],['moai',320],['planet',300],['crown',260],['star',240],['unicorn',170],['dragon',130],['trophy',90],['phoenix',55],['ufo',14]]},
  {id:'ninja',name:'Ninja Shadow',e:'🥷',price:2400,c:['#1F2937','#0B0F14'],drops:[['shades',400],['headphones',350],['watch',300],['rocket',400],['gamepad',300],['robot',350],['ring',300],['diamond',300],['moai',250],['planet',280],['crown',220],['star',300],['unicorn',200],['dragon',150],['trophy',110],['phoenix',55],['ufo',14]]},
  {id:'winter',name:'Winter Case',e:'❄️',price:2600,c:['#1D4A6E','#0E1B2E'],drops:[['snow',700],['cake',400],['watch',350],['champagne',300],['diamond',400],['planet',300],['crown',200],['star',260],['unicorn',160],['dragon',110],['trophy',70],['phoenix',30],['ufo',8]]},
  {id:'samurai',name:'Samurai Honor',e:'⛩️',price:2800,c:['#7F1D1D','#2A0808'],drops:[['watch',300],['champagne',250],['rocket',350],['robot',300],['ring',320],['diamond',340],['moai',300],['planet',320],['crown',280],['star',320],['unicorn',240],['dragon',190],['trophy',150],['phoenix',90],['ufo',25],['thor',6]]},
  {id:'arcane',name:'Arcane Arts',e:'🔮',price:2900,c:['#6D28D9','#240A4A'],drops:[['magicball',1800],['nazar',1200],['candle',700],['statue',600],['treasure',500],['helicopter',400],['skull',500],['bomb',400],['camera',300],['tophat',350],['crown',400],['planet',300],['star',350],['unicorn',220],['dragon',140],['trophy',80],['phoenix',40],['ufo',15],['rainbow',5]]},
  {id:'space',name:'Space Case',e:'🚀',price:3000,c:['#252A6E','#12152F'],drops:[['champagne',150],['rocket',500],['gamepad',260],['robot',240],['diamond',440],['moai',420],['planet',560],['crown',380],['star',340],['unicorn',260],['dragon',210],['trophy',160],['phoenix',105],['ufo',30],['comet',6]]},
  {id:'pirate',name:'Pirate Booty',e:'🏴‍☠️',price:3200,c:['#134E4A','#06201E'],drops:[['shades',300],['watch',250],['champagne',250],['rocket',300],['robot',260],['ring',380],['diamond',400],['moai',380],['planet',360],['crown',320],['star',340],['unicorn',260],['dragon',220],['trophy',180],['phoenix',120],['ufo',35],['thor',8]]},
  {id:'mecha',name:'Mecha Lab',e:'🦾',price:3500,c:['#0F172A','#020617'],drops:[['robot',1800],['gamepad',1000],['helicopter',900],['statue',500],['treasure',400],['camera',350],['tophat',250],['nazar',250],['crown',350],['planet',300],['star',320],['unicorn',200],['dragon',150],['trophy',100],['phoenix',55],['ufo',22],['rainbow',8],['sword',3]]},
  {id:'goldrush',name:'Gold Rush',e:'⛏️',price:3600,c:['#854D0E','#2E1D02'],drops:[['treasure',1600],['ring',900],['crown',800],['diamond',700],['moai',500],['planet',400],['star',450],['unicorn',300],['dragon',220],['trophy',160],['phoenix',90],['ufo',35],['rainbow',12],['sword',5],['castle',2]]},
  {id:'pharaoh',name:'Pharaoh Tomb',e:'🏺',price:3800,c:['#78350F','#2B1404'],drops:[['watch',200],['champagne',150],['rocket',200],['robot',200],['ring',350],['diamond',450],['moai',600],['planet',550],['crown',450],['star',400],['unicorn',300],['dragon',250],['trophy',220],['phoenix',160],['ufo',50],['thor',12]]},
  {id:'elite',name:'Elite Case',e:'💠',price:4000,c:['#48288C','#180F38'],drops:[['robot',180],['ring',220],['moai',340],['planet',400],['diamond',460],['crown',430],['star',380],['unicorn',300],['dragon',250],['trophy',200],['phoenix',150],['ufo',45],['comet',10]]},
  {id:'viking',name:'Viking Saga',e:'🪓',price:4200,c:['#3F3F46','#18181B'],drops:[['rocket',200],['robot',220],['ring',300],['diamond',420],['moai',480],['planet',500],['crown',440],['star',400],['unicorn',320],['dragon',270],['trophy',220],['phoenix',170],['ufo',60],['thor',15]]},
  {id:'wizard',name:'Wizard Tower',e:'🧙',price:4800,c:['#4C1D95','#160A33'],drops:[['champagne',120],['rocket',200],['ring',180],['diamond',280],['moai',300],['planet',340],['crown',320],['star',420],['unicorn',360],['dragon',320],['trophy',280],['phoenix',220],['ufo',70],['thor',18]]},
  {id:'mythic',name:'Mythic Case',e:'🔮',price:5000,c:['#4C1D72','#170B2E'],drops:[['champagne',120],['rocket',260],['ring',140],['moai',230],['planet',260],['diamond',280],['crown',300],['star',420],['unicorn',360],['dragon',320],['trophy',270],['phoenix',210],['ufo',60],['comet',14]]},
  {id:'atlantis',name:'Atlantis',e:'🔱',price:5200,c:['#0C4A6E','#04141F'],drops:[['trident',25],['treasure',700],['planet',600],['crown',550],['diamond',500],['moai',400],['star',500],['unicorn',350],['dragon',280],['trophy',200],['phoenix',120],['ufo',50],['rainbow',15],['sword',8],['castle',4],['volcano',1]]},
  {id:'knight',name:"Knight's Armor",e:'🛡️',price:5500,c:['#57534E','#1C1917'],drops:[['rocket',150],['robot',180],['ring',220],['diamond',360],['moai',380],['planet',420],['crown',400],['star',440],['unicorn',380],['dragon',330],['trophy',300],['phoenix',250],['ufo',90],['thor',24]]},
  {id:'vampire',name:'Vampire Night',e:'🧛',price:6200,c:['#450A0A','#1A0303'],drops:[['rocket',120],['ring',140],['diamond',260],['moai',300],['planet',340],['crown',360],['star',440],['unicorn',400],['dragon',360],['trophy',330],['phoenix',280],['ufo',110],['thor',30]]},
  {id:'golden',name:'Golden Case',e:'🥇',price:6500,c:['#6E5417','#23190C'],drops:[['rocket',80],['planet',170],['moai',140],['diamond',200],['crown',240],['star',380],['unicorn',320],['dragon',280],['trophy',280],['phoenix',230],['ufo',90],['comet',30]]},
  {id:'olympus',name:'Olympus',e:'⚡',price:6800,c:['#1D4ED8','#0A1A3C'],drops:[['thor',60],['trident',40],['diamond',400],['crown',300],['planet',350],['moai',300],['star',600],['unicorn',480],['dragon',420],['trophy',340],['phoenix',260],['ufo',110],['rainbow',40],['sword',25],['castle',12],['volcano',6],['squid',3],['wolf',1]]},
  {id:'zombie',name:'Zombie Outbreak',e:'🧟',price:7000,c:['#3F6212','#141B05'],drops:[['champagne',80],['rocket',100],['ring',120],['diamond',220],['moai',280],['planet',320],['crown',360],['star',460],['unicorn',420],['dragon',380],['trophy',350],['phoenix',300],['ufo',130],['thor',36]]},
  {id:'dragon',name:"Dragon's Hoard",e:'🐉',price:7500,c:['#77202F','#270D16'],drops:[['rocket',60],['moai',120],['planet',140],['diamond',160],['crown',190],['star',320],['unicorn',360],['dragon',520],['trophy',420],['phoenix',480],['ufo',180],['comet',80]]},
  {id:'inferno',name:'Inferno Case',e:'🔥',price:8000,c:['#7A2610','#260B04'],drops:[['crown',350],['star',500],['unicorn',420],['dragon',380],['trophy',340],['phoenix',280],['ufo',130],['comet',40],['blackhole',6]]},
  {id:'valhalla',name:'Valhalla',e:'⚔️',price:8400,c:['#52525B','#18181B'],drops:[['sword',80],['castle',30],['ring',200],['diamond',300],['crown',350],['planet',400],['moai',300],['star',700],['unicorn',620],['dragon',560],['trophy',480],['phoenix',380],['ufo',160],['rainbow',60],['volcano',25],['squid',12],['wolf',6],['tornado',2]]},
  {id:'galaxy',name:'Galaxy Case',e:'🌌',price:8800,c:['#312E81','#0F0D2E'],drops:[['ring',90],['diamond',200],['moai',240],['planet',280],['crown',340],['star',480],['unicorn',440],['dragon',400],['trophy',380],['phoenix',320],['ufo',150],['thor',50],['comet',12],['shield',2]]},
  {id:'legend',name:'Legend Case',e:'👽',price:9500,c:['#5B21B6','#160B2E'],drops:[['ring',70],['moai',110],['planet',130],['diamond',150],['crown',200],['star',420],['unicorn',400],['dragon',380],['trophy',360],['phoenix',340],['ufo',360],['comet',320],['shield',3]]},
  {id:'underworld',name:'Underworld',e:'☠️',price:10200,c:['#991B1B','#1C0606'],drops:[['skull',300],['bomb',200],['magicball',150],['treasure',200],['crown',400],['planet',350],['diamond',300],['tornado',40],['wolf',25],['squid',18],['volcano',40],['castle',20],['sword',60],['rainbow',80],['ufo',250],['phoenix',450],['trophy',550],['dragon',620],['unicorn',680],['star',760]]},
  {id:'volcano',name:'Volcano Core',e:'🌋',price:10500,c:['#7C2D12','#210A04'],drops:[['diamond',180],['moai',220],['planet',260],['crown',320],['star',500],['unicorn',460],['dragon',430],['trophy',400],['phoenix',350],['ufo',170],['thor',60],['comet',16],['tornado',3]]},
  {id:'quantum',name:'Quantum Case',e:'⚛️',price:11000,c:['#155E75','#08222B'],drops:[['star',520],['unicorn',460],['dragon',430],['trophy',400],['phoenix',330],['ufo',170],['comet',60],['blackhole',12],['tornado',3]]},
  {id:'nebula',name:'Nebula Mist',e:'🌫️',price:12500,c:['#5B21B6','#150A2E'],drops:[['diamond',150],['moai',180],['planet',220],['crown',280],['star',520],['unicorn',480],['dragon',460],['trophy',420],['phoenix',380],['ufo',190],['thor',70],['comet',20],['tornado',4]]},
  {id:'skyline',name:'Skyline',e:'🏙️',price:13500,c:['#1E293B','#020617'],drops:[['helicopter',120],['statue',160],['treasure',200],['moai',280],['diamond',340],['planet',380],['crown',420],['rainbow',120],['sword',70],['castle',35],['volcano',15],['squid',8],['moon',6],['genie',3],['star',900],['unicorn',800],['dragon',720],['trophy',640],['phoenix',520],['ufo',240]]},
  {id:'portal',name:'Portal Case',e:'🌀',price:14500,c:['#0E7490','#06222B'],drops:[['planet',180],['crown',240],['star',560],['unicorn',500],['dragon',480],['trophy',450],['phoenix',400],['ufo',220],['thor',85],['comet',26],['tornado',4]]},
  {id:'godlike',name:'Godlike Case',e:'🌠',price:15000,c:['#4C1D95','#1B0B3A'],drops:[['star',600],['unicorn',520],['dragon',500],['trophy',470],['phoenix',400],['ufo',230],['comet',90],['blackhole',25],['thor',40],['wolf',6],['tornado',3]]},
  {id:'chronos',name:'Chronos Vault',e:'🕰️',price:15500,c:['#4338CA','#14123B'],drops:[['diamond',350],['planet',400],['crown',440],['rainbow',140],['sword',85],['castle',45],['volcano',20],['squid',10],['wolf',5],['tornado',2],['moon',8],['genie',4],['ufo',260],['phoenix',540],['trophy',660],['dragon',740],['unicorn',820],['star',900]]},
  {id:'time',name:'Time Machine',e:'⏳',price:16500,c:['#713F12','#241503'],drops:[['planet',150],['crown',200],['star',600],['unicorn',540],['dragon',520],['trophy',480],['phoenix',430],['ufo',250],['thor',100],['comet',32],['squid',9],['wolf',4]]},
  {id:'titan',name:'Titan Case',e:'🏔️',price:19000,c:['#1E3A8A','#0B1338'],drops:[['crown',160],['star',640],['unicorn',580],['dragon',560],['trophy',520],['phoenix',460],['ufo',280],['thor',120],['comet',40],['blackhole',6],['squid',12],['wolf',6],['tornado',2]]},
  {id:'abyss',name:'The Abyss',e:'🐋',price:21000,c:['#082F49','#020C14'],drops:[['diamond',360],['planet',420],['crown',480],['rainbow',160],['sword',90],['castle',40],['volcano',60],['squid',90],['wolf',45],['tornado',20],['shield',8],['moon',30],['genie',12],['star',1000],['unicorn',900],['dragon',820],['trophy',720],['phoenix',600],['ufo',300]]},
  {id:'aurora',name:'Aurora Borealis',e:'🌅',price:23000,c:['#0F766E','#052E2B'],drops:[['crown',130],['star',700],['unicorn',640],['dragon',620],['trophy',560],['phoenix',500],['ufo',320],['thor',150],['comet',55],['blackhole',9],['squid',14],['wolf',7]]},
  {id:'heavens',name:'Heaven Gates',e:'🎆',price:24500,c:['#7C3AED','#2E1065'],drops:[['crown',500],['rainbow',260],['sword',160],['castle',80],['volcano',120],['shield',25],['tornado',60],['wolf',90],['squid',130],['moon',90],['genie',40],['trident',15],['sun',4],['angel',1],['star',1100],['unicorn',1000],['dragon',900],['trophy',800],['phoenix',680],['ufo',340]]},
  {id:'ultimate',name:'Ultimate Case',e:'🌈',price:25000,c:['#6D28D9','#2E1065'],drops:[['dragon',600],['trophy',550],['phoenix',500],['ufo',350],['comet',160],['blackhole',60],['thor',120],['volcano',18],['squid',8],['wolf',4]]},
  {id:'eclipse',name:'Eclipse Case',e:'🌑',price:27000,c:['#312E81','#090714'],drops:[['crown',110],['star',760],['unicorn',700],['dragon',680],['trophy',600],['phoenix',540],['ufo',360],['thor',180],['comet',70],['blackhole',12],['volcano',22],['squid',10]]},
  {id:'omega',name:'Omega Vault',e:'🔐',price:29000,c:['#0F766E','#022C22'],drops:[['sun',10],['trident',40],['dove',1],['angel',3],['earth',1],['genie',80],['moon',160],['rainbow',300],['sword',200],['castle',120],['volcano',70],['shield',40],['tornado',100],['wolf',160],['squid',220],['star',1200],['unicorn',1100],['dragon',1000],['trophy',880],['phoenix',760],['ufo',400]]},
  {id:'supernova',name:'Supernova',e:'💥',price:32000,c:['#9A3412','#2A0B03'],drops:[['star',840],['unicorn',780],['dragon',760],['trophy',660],['phoenix',600],['ufo',420],['thor',220],['comet',90],['blackhole',18],['volcano',30],['trex',12]]},
  {id:'pandora',name:'Pandora Box',e:'📦',price:35000,c:['#86198F','#2A0A2E'],drops:[['earth',4],['sun',30],['trident',90],['dove',4],['angel',10],['genie',140],['moon',260],['rainbow',420],['sword',300],['castle',180],['volcano',110],['shield',60],['tornado',160],['wolf',240],['squid',320],['star',1400],['unicorn',1300],['dragon',1200],['trophy',1050],['phoenix',900],['ufo',500]]},
  {id:'throne',name:'Iron Throne',e:'⚜️',price:38000,c:['#71717A','#18181B'],drops:[['star',950],['unicorn',900],['dragon',860],['trophy',760],['phoenix',680],['ufo',500],['thor',280],['comet',120],['blackhole',26],['volcano',40],['trex',16],['trident',6]]},
  {id:'infinity',name:'Infinity Case',e:'♾️',price:45000,c:['#6D28D9','#1E0A45'],drops:[['star',1100],['unicorn',1050],['dragon',1000],['trophy',880],['phoenix',780],['ufo',600],['thor',360],['comet',160],['blackhole',38],['volcano',50],['trex',22],['trident',9],['joker',2]]},
  {id:'celestial',name:'Celestial Court',e:'✨',price:48000,c:['#0891B2','#083344'],drops:[['dove',20],['angel',45],['earth',20],['sun',120],['trident',260],['genie',400],['moon',700],['rainbow',900],['sword',650],['castle',420],['volcano',260],['shield',150],['tornado',380],['wolf',560],['squid',760],['star',1800],['unicorn',1700],['dragon',1600],['trophy',1400],['phoenix',1200],['ufo',700]]},
  {id:'cosmic',name:'Cosmic Case',e:'🛸',price:55000,c:['#1E1B4B','#07061A'],drops:[['star',1300],['unicorn',1250],['dragon',1200],['trophy',1050],['phoenix',950],['ufo',750],['thor',480],['comet',220],['blackhole',55],['volcano',60],['trex',30],['trident',12],['joker',3]]},
  {id:'divine',name:'Divine Realm',e:'🕊️',price:62000,c:['#0EA5E9','#0C2D48'],drops:[['dove',90],['angel',160],['earth',80],['sun',380],['trident',700],['genie',1000],['moon',1600],['rainbow',1800],['sword',1300],['castle',850],['volcano',520],['shield',320],['tornado',800],['wolf',1150],['squid',1500],['star',2600],['unicorn',2400],['dragon',2200],['trophy',1900],['phoenix',1600],['ufo',950]]},
  {id:'fortune',name:'Fortune Case',e:'🎰',price:75000,c:['#A16207','#2E1D02'],drops:[['star',1600],['unicorn',1500],['dragon',1450],['trophy',1300],['phoenix',1150],['ufo',950],['thor',650],['comet',320],['blackhole',80],['volcano',60],['trex',30],['trident',12],['joker',3]]},
  {id:'secretvault',name:'Secret Vault',e:'🎭',price:88000,c:['#1F2937','#000000'],drops:[['supernova',25],['galaxy',100],['masks',180],['eye',360],['joker',700],['ball8',80],['dragonlord',20],['infinity',2],['dove',700],['angel',1200],['earth',600],['sun',2600],['trident',4000],['genie',5000],['moon',7000],['rainbow',7000],['sword',5000],['castle',3000],['volcano',1800],['shield',1000],['tornado',2500],['wolf',3500],['squid',4500],['star',6000],['unicorn',5500],['dragon',5000],['trophy',4200],['phoenix',3600],['ufo',2000]]},
  {id:'eyeoffate',name:'Eye of Fate',e:'👁️',price:95000,c:['#292524','#0C0A09'],drops:[['supernova',60],['galaxy',240],['masks',460],['eye',900],['joker',1700],['ball8',300],['dragonlord',80],['infinity',6],['dove',1600],['angel',2800],['earth',1400],['sun',5000],['trident',7000],['genie',8500],['moon',11000],['rainbow',11000],['sword',8000],['castle',5000],['volcano',3000],['shield',1700],['tornado',4000],['wolf',5500],['squid',7000],['star',9000],['unicorn',8500],['dragon',8000],['trophy',6800],['phoenix',5800],['ufo',3200]]},
  {id:'singularity',name:'Singularity',e:'⚫',price:100000,featured:true,sub:'ТОП-1 кейс · вплоть до Secret-редкости · Сверхновая 1 000 000 HC',c:['#181818','#000000'],drops:[['unicorn',1200],['dragon',1200],['trophy',1200],['phoenix',1200],['ufo',1200],['thor',1200],['comet',1200],['blackhole',900],['volcano',350],['trex',220],['tsunami',120],['dragonlord',60],['ball8',25],['trident',90],['sun',50],['angel',20],['joker',12],['eye',6],['masks',3],['galaxy',1]]},
];

/* Промокоды. NERES — выдаёт АДМИНКУ (баны, монеты, предметы).
   ⚠️ Перед раздачей игры смени NERES на свой секретный код! */
const PROMOS = {
  NERES:   {admin:true},
  PYPSI:   {amount:200000, item:'any'},
  RELEASE: {amount:80000},
  GEI:     {case:'singularity'},
  HC1000:  {amount:1000},
  HC5000:  {amount:5000},
  GIFT:    {item:'randomRare'},
};

const AVATARS = ['🦊','🐼','🐸','🦁','🐯','🐙','🦄','🐨','🐺','🐵','🦉','🐳'];
const START_BALANCE = 1000;
const FREE_COOLDOWN = 10 * 60 * 1000;
const TOPUP_MAX = 300;            // обычный игрок: максимум за одно пополнение
const TOPUP_COOLDOWN = 60 * 1000; // обычный игрок: 1 минута между пополнениями

/* ================= База (JSON-файл) ================= */
let db;
function freshDB(){ return { users:{}, tokens:{}, feed:[], nextId:1 }; }
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e){ db = freshDB(); }

function migrateUser(u){
  if (u.banned === true){ u.banUntil = -1; u.banReason = u.banReason || 'Нарушение правил'; }
  delete u.banned;
  if (typeof u.banUntil !== 'number') u.banUntil = 0;
  if (typeof u.banReason !== 'string') u.banReason = '';
  if (typeof u.topupAt !== 'number') u.topupAt = 0;
  if (!u.stats) u.stats = {opened:0, upgrades:0, best:null};
  if (!Array.isArray(u.inventory)) u.inventory = [];
  if (!Array.isArray(u.history)) u.history = [];
  if (!Array.isArray(u.usedPromos)) u.usedPromos = [];
}
Object.values(db.users).forEach(migrateUser);

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
function isBanned(u){ return u.banUntil === -1 || (u.banUntil > 0 && Date.now() < u.banUntil); }

/* ================= Приложение ================= */
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const minesGames = new Map();
const crashGames = new Map();
const towerGames = new Map();

function auth(req, res, next){
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  const u = db.tokens[t] ? db.users[db.tokens[t]] : null;
  if (!u) return res.status(401).json({error:'Требуется вход'});
  if (isBanned(u)){
    return res.status(403).json({banned:true, reason:u.banReason || 'Причина не указана', until:u.banUntil});
  }
  if (u.banUntil > 0){ u.banUntil = 0; u.banReason = ''; } // срок бана истёк
  req.user = u; next();
}
const admin = (req,res,next) => req.user.admin ? next() : res.status(403).json({error:'Нет прав администратора'});

/* ---------- Публичный конфиг (клиент качает при старте) ---------- */
app.get('/api/config', (req,res) => {
  res.json({rar:RAR, items:ITEMS, cases:CASES, topupMax:TOPUP_MAX, topupCooldown:TOPUP_COOLDOWN, startBalance:START_BALANCE});
});

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
    createdAt: Date.now(), admin:false,
    banUntil: 0, banReason: '', topupAt: 0,
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
  if (isBanned(u)) return res.status(403).json({banned:true, reason:u.banReason || 'Причина не указана', until:u.banUntil});
  if (u.banUntil > 0){ u.banUntil = 0; u.banReason = ''; }
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

/* Пополнение: обычным до 300 HC раз в минуту, админу — без лимитов */
app.post('/api/topup', auth, (req,res) => {
  const v = Math.floor(+req.body.amount || 0);
  if (v < 1) return res.status(400).json({error:'Некорректная сумма'});
  if (v > 10000000) return res.status(400).json({error:'Слишком большая сумма'});
  if (!req.user.admin){
    if (v > TOPUP_MAX) return res.status(400).json({error:'Максимум ' + TOPUP_MAX + ' HC за одно пополнение'});
    const left = req.user.topupAt + TOPUP_COOLDOWN - Date.now();
    if (left > 0) return res.status(400).json({error:'Подожди ' + Math.ceil(left/1000) + ' сек до следующего пополнения'});
  }
  req.user.topupAt = Date.now();
  credit(req.user, v, req.user.admin ? '👑 Админ: пополнение' : 'Пополнение (демо, бесплатно)');
  save(); res.json({balance:req.user.balance, topupAt:req.user.topupAt});
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
    balance: START_BALANCE, freeAt: 0, topupAt: 0,
    stats: {opened:0, upgrades:0, best:null},
    inventory: [], history: [], usedPromos: [], admin: wasAdmin,
  });
  addHist(req.user, 'in', 'Стартовый бонус', START_BALANCE);
  save(); res.json({user: pubUser(req.user)});
});

/* ---------- Топ игроков по монетам ---------- */
app.post('/api/top', auth, (req,res) => {
  const all = Object.values(db.users).sort((a,b) => b.balance - a.balance);
  const myIdx = all.findIndex(u => u.id === req.user.id);
  const top = all.slice(0, 50).map((u,i) => ({
    place: i+1, name: u.name, avatar: u.avatar, balance: u.balance,
    admin: !!u.admin, isMe: u.id === req.user.id,
  }));
  res.json({top, me: myIdx >= 0 ? {place: myIdx+1, total: all.length} : null});
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
  const entries = [];
  let msg = '🎁 Промокод активирован';
  if (p.amount){
    credit(req.user, p.amount, 'Промокод ' + code);
    msg = '🎁 +' + p.amount.toLocaleString('ru-RU') + ' HC';
  }
  const give = (id) => {
    const e = {uid:newUid(), id, case:'promo', ts:Date.now()};
    req.user.inventory.unshift(e); entries.push(e);
    msg += ' · ' + ITEMS[id][0] + ' ' + ITEMS[id][1];
  };
  if (p.item){
    if (p.item === 'randomRare'){
      const pool = Object.keys(ITEMS).filter(id => ITEMS[id][2] === 'rare');
      give(pool[Math.floor(Math.random()*pool.length)]);
    } else if (p.item === 'randomLegendary'){
      const pool = Object.keys(ITEMS).filter(id => ITEMS[id][2] === 'legendary');
      give(pool[Math.floor(Math.random()*pool.length)]);
    } else if (p.item === 'any'){
      const pool = Object.keys(ITEMS);
      give(pool[Math.floor(Math.random()*pool.length)]);
    } else if (ITEMS[p.item]){
      give(p.item);
    }
  }
  if (p.case){
    const cs = CASES.find(c => c.id === p.case);
    if (cs){
      const id = pickDrop(cs);
      const e = {uid:newUid(), id, case:'promo', ts:Date.now()};
      req.user.inventory.unshift(e); entries.push(e);
      msg = '🎁 Кейс «' + cs.name + '» → ' + ITEMS[id][0] + ' ' + ITEMS[id][1] + (p.amount ? ' · +' + p.amount.toLocaleString('ru-RU') + ' HC' : '');
      addFeed(req.user.name, id);
    }
  }
  save(); res.json({message:msg, entries, balance:req.user.balance});
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

/* ---------- Мини-игры: Coin, Dice ---------- */
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

/* ---------- Mines ---------- */
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

/* ---------- Crash ---------- */
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

/* ---------- Wheel ---------- */
const WHEEL_SEGS = [
  {m:0, w:9}, {m:0.5, w:4}, {m:1.5, w:3},
  {m:2, w:2}, {m:3, w:1}, {m:5, w:1},
];
app.post('/api/game/wheel', auth, (req,res) => {
  const bet = Math.floor(+req.body.bet || 0);
  if (bet < 1 || bet > req.user.balance) return res.status(400).json({error:'Некорректная ставка'});
  req.user.balance -= bet; addHist(req.user, 'out', 'Ставка: Wheel', bet);
  const total = WHEEL_SEGS.reduce((s,x)=>s+x.w,0);
  let r = Math.random()*total, seg = 0;
  for (let i = 0; i < WHEEL_SEGS.length; i++){ if ((r -= WHEEL_SEGS[i].w) < 0){ seg = i; break; } }
  const m = WHEEL_SEGS[seg].m;
  let payout = 0;
  if (m > 0){ payout = Math.round(bet*m); credit(req.user, payout, 'Wheel выигрыш x' + m); }
  save(); res.json({seg, mult:m, payout, balance:req.user.balance});
});

/* ---------- Plinko ---------- */
const PLINKO_MULTS = [10,3,1.8,1.3,1,0.8,0.6,0.8,1,1.3,1.8,3,10];
app.post('/api/game/plinko', auth, (req,res) => {
  const bet = Math.floor(+req.body.bet || 0);
  if (bet < 1 || bet > req.user.balance) return res.status(400).json({error:'Некорректная ставка'});
  req.user.balance -= bet; addHist(req.user, 'out', 'Ставка: Plinko', bet);
  let k = 0;
  for (let i = 0; i < 12; i++) if (Math.random() < .5) k++;
  const m = PLINKO_MULTS[k];
  const payout = Math.round(bet*m);
  if (payout > 0) credit(req.user, payout, 'Plinko выигрыш x' + m);
  save(); res.json({slot:k, mult:m, payout, balance:req.user.balance});
});

/* ---------- Tower ---------- */
app.post('/api/game/tower/start', auth, (req,res) => {
  const bet = Math.floor(+req.body.bet || 0);
  if (bet < 1 || bet > req.user.balance) return res.status(400).json({error:'Некорректная ставка'});
  req.user.balance -= bet; addHist(req.user, 'out', 'Ставка: Tower', bet);
  const bombs = [];
  for (let i = 0; i < 8; i++) bombs.push(Math.floor(Math.random()*3));
  towerGames.set(req.user.id, {bet, floor:0, bombs});
  save(); res.json({ok:true, balance:req.user.balance});
});
app.post('/api/game/tower/pick', auth, (req,res) => {
  const g = towerGames.get(req.user.id);
  if (!g) return res.status(400).json({error:'Нет активной игры'});
  const cell = +req.body.cell;
  if (!(cell >= 0 && cell < 3)) return res.status(400).json({error:'Некорректная клетка'});
  if (g.bombs[g.floor] === cell){
    const bombs = g.bombs;
    towerGames.delete(req.user.id); save();
    return res.json({boom:true, bombs, balance:req.user.balance});
  }
  g.floor++;
  const mult = +Math.pow(1.42, g.floor).toFixed(2);
  if (g.floor >= 8){
    const payout = Math.round(g.bet * mult * 0.98);
    credit(req.user, payout, 'Tower выигрыш x' + mult);
    towerGames.delete(req.user.id); save();
    return res.json({safe:true, floor:g.floor, mult, finished:true, payout, balance:req.user.balance});
  }
  save();
  res.json({safe:true, floor:g.floor, mult, next:+Math.pow(1.42, g.floor+1).toFixed(2)});
});
app.post('/api/game/tower/cash', auth, (req,res) => {
  const g = towerGames.get(req.user.id);
  if (!g || g.floor === 0) return res.status(400).json({error:'Нет активной игры'});
  const mult = +Math.pow(1.42, g.floor).toFixed(2);
  const payout = Math.round(g.bet * mult * 0.98);
  credit(req.user, payout, 'Tower выигрыш x' + mult);
  towerGames.delete(req.user.id); save();
  res.json({win:true, mult, payout, bombs:g.bombs, balance:req.user.balance});
});

/* ---------- Админ-панель ---------- */
app.post('/api/admin/users', auth, admin, (req,res) => {
  const list = Object.values(db.users)
    .map(u => ({id:u.id, name:u.name, avatar:u.avatar, balance:u.balance, items:u.inventory.length,
                banUntil:u.banUntil, banReason:u.banReason, admin:u.admin, joined:u.createdAt}))
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
/* Бан: minutes = 30/60/240/1080/1440 или -1 (навсегда) + причина */
app.post('/api/admin/ban', auth, admin, (req,res) => {
  const t = getTarget(req,res); if (!t) return;
  if (t.id === req.user.id) return res.status(400).json({error:'Нельзя выдать бан самому себе'});
  if (t.admin) return res.status(400).json({error:'Нельзя забанить администратора'});
  const minutes = +req.body.minutes;
  const reason = String(req.body.reason||'').trim().slice(0,200) || 'Причина не указана';
  if (minutes === -1) t.banUntil = -1;
  else if (minutes > 0) t.banUntil = Date.now() + minutes*60000;
  else return res.status(400).json({error:'Некорректный срок бана'});
  t.banReason = reason;
  save(); res.json({ok:true, banUntil:t.banUntil, reason});
});
app.post('/api/admin/unban', auth, admin, (req,res) => {
  const t = getTarget(req,res); if (!t) return;
  t.banUntil = 0; t.banReason = '';
  save(); res.json({ok:true});
});
app.post('/api/admin/reset', auth, admin, (req,res) => {
  const t = getTarget(req,res); if (!t) return;
  t.balance = START_BALANCE; t.inventory = []; t.history = [];
  t.stats = {opened:0, upgrades:0, best:null}; t.usedPromos = []; t.freeAt = 0; t.topupAt = 0;
  addHist(t, 'in', 'Стартовый бонус', START_BALANCE);
  save(); res.json({ok:true});
});
app.post('/api/admin/setfree', auth, admin, (req,res) => {
  const t = getTarget(req,res); if (!t) return;
  t.freeAt = 0; save(); res.json({ok:true});
});

app.use('/api', (req,res) => res.status(404).json({error:'Не найдено'}));

app.listen(PORT, () => console.log('✅ HC Gifts server v3.0: http://localhost:' + PORT));