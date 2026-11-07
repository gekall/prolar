/* ===================== PROLAR VERİLERİ ===================== */
'use strict';

/* ---------- elementler ---------- */
const EL = {
  ates:     {ad:'Ateş',     col:'#f07a3a'},
  buz:      {ad:'Buz',      col:'#8fd3ea'},
  zehir:    {ad:'Zehir',    col:'#93c84a'},
  yildirim: {ad:'Yıldırım', col:'#e8d44d'},
  su:       {ad:'Su',       col:'#4f8fe0'},
  karanlik: {ad:'Karanlık', col:'#a47ae0'},
  kutsal:   {ad:'Kutsal',   col:'#f4e3a1'}
};
const MIXEL = ['ates', 'buz', 'zehir', 'yildirim', 'su', 'karanlik', 'kutsal'];

/* ---------- güç ölçeği ----------
   TF: bölüm başına %45 güç artışı. SF: bölüm içinde 1. alt bölümden 50.'ye %40 artış. */
const TF = c => Math.pow(1.45, c - 1);
const SF = s => 1 + .4 * (s - 1) / 49;

/* ---------- bölümler ----------
   el: düşmanların elementi, weak: zayıf oldukları element, drop: düşen silahların elementi.
   Zincir: her bölümün düşürdüğü element bir sonrakinin zayıflığı. */
const CHAPTERS = [
  {ad:'Yıkık Kale', adj:'Kale', el:null, weak:null, drop:'ates', motif:'arches',
   pal:{top:'#0f0c15', bot:'#18141f', wall:'#2d2638', wallHi:'#463b54', light:'#eaa23c', mob:'#a098aa', mobHi:'#ece4d2', eye:'#eaa23c'},
   mobs:{tank:'Kalkanlı İskelet', runner:'Koşucu İskelet', ranged:'Okçu İskelet'}, proj:'arrow', mini:'kemiksovalye', boss:'mizrakli'},
  {ad:'Buzul Diyarı', adj:'Buzul', el:'buz', weak:'ates', drop:'buz', motif:'ice',
   pal:{top:'#0a1522', bot:'#142638', wall:'#223a52', wallHi:'#3e6182', light:'#9fe0f2', mob:'#b9dcea', mobHi:'#f2fbff', eye:'#4fc8ff'},
   mobs:{tank:'Buz Golemi', runner:'Kar Kurdu', ranged:'Buz Büyücüsü'}, proj:'shard', mini:'yeti', boss:'buzkralicesi'},
  {ad:'Zehirli Bataklık', adj:'Bataklık', el:'zehir', weak:'buz', drop:'zehir', motif:'swamp',
   pal:{top:'#0b120a', bot:'#172113', wall:'#28361f', wallHi:'#435a31', light:'#a4d65a', mob:'#7f9150', mobHi:'#cadb8c', eye:'#c6ff5a'},
   mobs:{tank:'Kabuklu Böcek', runner:'Sülük', ranged:'Zehir Cadısı'}, proj:'orb', mini:'devkurbaga', boss:'bataklikcadisi'},
  {ad:'Steampunk Şehri', adj:'Buharlı', el:'yildirim', weak:'zehir', drop:'yildirim', motif:'gears',
   pal:{top:'#130e09', bot:'#22180f', wall:'#382817', wallHi:'#634727', light:'#ffb347', mob:'#b0885a', mobHi:'#ecca94', eye:'#ffe066'},
   mobs:{tank:'Buhar Golemi', runner:'Dişli Böcek', ranged:'Tüfekçi Robot'}, proj:'bullet', mini:'matkaptank', boss:'saatustasi'},
  {ad:'Batık Şehir', adj:'Mercan', el:'su', weak:'yildirim', drop:'su', motif:'sea',
   pal:{top:'#06111c', bot:'#0b2134', wall:'#12334e', wallHi:'#215477', light:'#5fe0d0', mob:'#5094ac', mobHi:'#a4dfec', eye:'#5fffe0'},
   mobs:{tank:'Yengeç Şövalye', runner:'Köpekbalığı Adam', ranged:'Mürekkep Atan'}, proj:'orb', mini:'denizyilani', boss:'kraken'},
  {ad:'Cehennem', adj:'İblis', el:'ates', weak:'su', drop:'karanlik', motif:'hell',
   pal:{top:'#170505', bot:'#2a0b07', wall:'#3e130d', wallHi:'#6a2315', light:'#ff6a2a', mob:'#b0482e', mobHi:'#ffa070', eye:'#ffd23a'},
   mobs:{tank:'Lav Golemi', runner:'İblis Köpeği', ranged:'Ateş İmpi'}, proj:'orb', mini:'boynuzlucellat', boss:'iblislordu'},
  {ad:'Cennet', adj:'Kutsal', el:'kutsal', weak:'karanlik', drop:'kutsal', motif:'heaven',
   pal:{top:'#1e2742', bot:'#3c4a70', wall:'#55638c', wallHi:'#8794b8', light:'#fff2b0', mob:'#e6dab0', mobHi:'#ffffff', eye:'#ffcf40'},
   mobs:{tank:'Işık Muhafızı', runner:'Kanatlı Mızrakçı', ranged:'Okçu Melek'}, proj:'arrow', mini:'altinheykel', boss:'basmelek'},
  {ad:'Zombi Şehri', adj:'Hurda', el:'karanlik', weak:'kutsal', drop:'ates', motif:'ruins',
   pal:{top:'#0e100e', bot:'#1c201a', wall:'#2e332a', wallHi:'#4c5444', light:'#c8e05a', mob:'#74905e', mobHi:'#b0c88e', eye:'#e04a3a'},
   mobs:{tank:'Şişko Zombi', runner:'Koşan Zombi', ranged:'Tükürükçü'}, proj:'orb', mini:'mutantkasap', boss:'suruannesi'},
  {ad:'Çöl Mezarları', adj:'Firavun', el:null, weak:'ates', drop:'mix', motif:'desert',
   pal:{top:'#24160c', bot:'#432a15', wall:'#5e4122', wallHi:'#8e6c38', light:'#ffd27a', mob:'#c8b082', mobHi:'#f2e2b4', eye:'#40d0ff'},
   mobs:{tank:'Mumya Muhafız', runner:'Akrep', ranged:'Kum Büyücüsü'}, proj:'orb', mini:'devakrep', boss:'firavun'},
  {ad:'Zamanın Sonu', adj:'Zaman', el:'mix', weak:'mix', drop:'mix', motif:'time',
   pal:{top:'#07050d', bot:'#130f28', wall:'#211b3e', wallHi:'#3a306c', light:'#c09aff', mob:'#9080c0', mobHi:'#dad0ff', eye:'#ff5ad0'},
   mobs:null, proj:'orb', mini:'zamanbekcisi', boss:'sonsaat'}
];

/* ---------- bölüm kadroları: [isim, gövde şekli] ----------
   Her bölümde 7 tür var: 3 temel tür (tank, koşucu, menzilli) ve o dünyaya uygun 4 özel tür. */
const ROSTER = [
  {tank:['Kalkanlı İskelet','skel'], runner:['Koşucu İskelet','skel'], ranged:['Okçu İskelet','skel'],
   flyer:['Kan Yarasası','bat'], burrower:['Mezar Solucanı','worm'], lobber:['Barut İskeleti','skel'], healer:['Nekromant','caster']},
  {tank:['Buz Golemi','golem'], runner:['Kar Kurdu','beast'], ranged:['Buz Büyücüsü','caster'],
   flyer:['Buz Kuzgunu','bird'], jumper:['Buz Örümceği','bug'], charger:['Mamut Yavrusu','beast'], lobber:['Kartopu Trolü','golem']},
  {tank:['Kabuklu Böcek','bug'], runner:['Sülük','worm'], ranged:['Zehir Cadısı','caster'],
   flyer:['Dev Sivrisinek','fly'], jumper:['Bataklık Kurbağası','blob'], burrower:['Çamur Solucanı','worm'], healer:['Mantar Şaman','caster']},
  {tank:['Buhar Golemi','robot'], runner:['Dişli Böcek','bug'], ranged:['Tüfekçi Robot','robot'],
   flyer:['Pervaneli Drone','drone'], exploder:['Saatli Bomba','robot'], charger:['Buharlı Koç','robot'], lobber:['Havan Robotu','robot']},
  {tank:['Yengeç Şövalye','crab'], runner:['Köpekbalığı Adam','fish'], ranged:['Mürekkep Atan','blob'],
   flyer:['Fener Balığı','fish'], burrower:['Kum Yılanbalığı','worm'], jumper:['Zıpzıp Ahtapot','blob'], healer:['Deniz Şamanı','caster']},
  {tank:['Lav Golemi','golem'], runner:['İblis Köpeği','beast'], ranged:['Ateş İmpi','caster'],
   flyer:['Alev Yarasası','bat'], exploder:['Lav Balonu','blob'], charger:['Cehennem Boğası','beast'], lobber:['Kükürt Atan','golem']},
  {tank:['Işık Muhafızı','golem'], runner:['Kanatlı Mızrakçı','angel'], ranged:['Okçu Melek','angel'],
   flyer:['Kerubim','bird'], healer:['Rahip','caster'], jumper:['Bulut Ruhu','blob'], lobber:['Yıldız Atan','angel']},
  {tank:['Şişko Zombi','zombie'], runner:['Koşan Zombi','zombie'], ranged:['Tükürükçü','zombie'],
   flyer:['Leş Sineği','fly'], burrower:['Kanalizasyon Solucanı','worm'], exploder:['Şişkin','blob'], jumper:['Mutant Köpek','beast']},
  {tank:['Mumya Muhafız','mummy'], runner:['Akrep','bug'], ranged:['Kum Büyücüsü','caster'],
   flyer:['Akbaba','bird'], burrower:['Kum Solucanı','worm'], charger:['Dev Bok Böceği','bug'], lobber:['Firavun Topçusu','mummy']}
];
ROSTER.forEach((r, i) => {
  CHAPTERS[i].mobs = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v[0]]));
  CHAPTERS[i].bodies = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v[1]]));
});
/* ---------- düşman türleri ---------- */
const ARCH = {
  tank:     {w:34, h:52, hp:60, dmg:18, gold:8, rol:'Öncü tank', bilgi:'Önden gelen vuruşları bloklar, yavaş döner. Kalkanla vurduktan sonra açıkta kalır.'},
  runner:   {w:24, h:42, hp:25, dmg:12, gold:4, rol:'Hızlı yakın dövüşçü', bilgi:'Çömelip gözleri parlayınca ileri atılır. Sadece zeminde gezer.'},
  ranged:   {w:22, h:46, hp:18, dmg:10, gold:5, rol:'Menzilli', bilgi:'Platformlarda durur, yaklaşınca kaçar. Nişan çizgisi kilitlenince atar.'},
  flyer:    {w:30, h:24, hp:16, dmg:12, gold:5, rol:'Uçan', bilgi:'Havada süzülür. Durup gözü parlayınca çizdiği çizgi boyunca dalar, sonra yükselir. Dalışta vurulabilir.'},
  burrower: {w:30, h:46, hp:34, dmg:16, gold:7, rol:'Yeraltı', bilgi:'Toprağın altında seni izler, vurulamaz. Zemin çatlayınca altından fırlar ve bir süre dışarıda kalır.'},
  exploder: {w:24, h:30, hp:14, dmg:26, gold:4, rol:'Kamikaze', bilgi:'Sana koşar, yanına gelince yanıp söner ve patlar. Fitil yanarken öldürürsen patlamaz.'},
  healer:   {w:22, h:46, hp:20, dmg:0,  gold:8, rol:'Şifacı', bilgi:'Arkada durur, yeşil halkayla etrafındaki düşmanları iyileştirir. Önce onu indir.'},
  jumper:   {w:30, h:26, hp:22, dmg:13, gold:5, rol:'Zıplayan', bilgi:'Çömelir ve iniş yeri işaretlenir, sonra platformlar dahil üstüne atlar.'},
  charger:  {w:46, h:40, hp:48, dmg:22, gold:9, rol:'Hücumcu', bilgi:'Ayağını yere sürter ve duvara kadar koşar. Üstünden zıpla ya da sıra değiştir. Duvara çarpınca sersemler.'},
  lobber:   {w:24, h:46, hp:20, dmg:18, gold:6, rol:'Bombacı', bilgi:'Uzaktan bomba fırlatır. İneceği yer işaretlenir, yere düşünce kısa süre sonra patlar.'}
};
const BASE_ARCH = ['tank', 'runner', 'ranged'];
/* özel türler bölüm içinde sırayla tanıtılır: ilk bölümlerde geç, ileri bölümlerde erken gelir */
const SPECIAL_AT = {flyer:3, jumper:5, exploder:6, lobber:8, burrower:10, healer:12, charger:14};
const specialOk = (a, c, s) => s >= Math.ceil(SPECIAL_AT[a] * (c <= 2 ? 1 : c <= 4 ? .5 : .2));
/* elit özellikleri: ileri bölümlerde düşmanlara eklenir */
/* col: elit özelliği aktifken düşmanın aldığı renk */
const AFFIX = {
  gorunmez:  {ad:'Görünmez',  col:'#c9b8ff', bilgi:'Canı %35 altına inince 2 sn saydamlaşır'},
  ofkeli:    {ad:'Öfkeli',    col:'#a45ee6', bilgi:'Canı %35 altına inince morarır ve hızlanır'},
  zirhli:    {ad:'Zırhlı',    col:'#e0453a', bilgi:'Kırmızıyken yarım hasar alır. Canının %40\'ı gidince zırhı kırılır'},
  patlayan:  {ad:'Patlayan',  col:'#ff9a3a', bilgi:'Turuncu nabız atar, ölünce kısa süre sonra patlar'},
  yenilenen: {ad:'Yenilenen', col:'#f0d640', bilgi:'2 sn vurulmazsa sararır ve can yeniler'}
};
const AFFIX_KEYS = Object.keys(AFFIX);

/* ---------- bosslar ----------
   atk: ortak saldırı kütüphanesinden aldığı hamleler. */
const BOSSES = {
  mizrakli:      {ad:'Mızraklı',          hp:320, w:34, h:60, body:'#70392f', head:'helmet', weapon:'spear',  proj:'spear',  atk:['throw','lunge','leap','row']},
  kemiksovalye:  {ad:'Kemik Şövalye',     hp:240, w:38, h:62, body:'#8a8294', head:'skull',  weapon:'sword',  proj:'arrow',  atk:['lunge','slam','summon']},
  yeti:          {ad:'Yeti',              hp:260, w:52, h:72, body:'#cfe2ec', head:'beast',  weapon:'claws',  proj:'shard',  atk:['leap','slam','throw']},
  buzkralicesi:  {ad:'Buz Kraliçesi',     hp:320, w:34, h:66, body:'#4f84b0', head:'crown',  weapon:'staff',  proj:'shard',  atk:['volley','row','summon','charge']},
  devkurbaga:    {ad:'Dev Kurbağa',       hp:260, w:58, h:48, body:'#5e7a32', head:'beast',  weapon:'none',   proj:'orb',    atk:['leap','throw','lunge']},
  bataklikcadisi:{ad:'Bataklık Cadısı',   hp:320, w:32, h:64, body:'#3e4e2a', head:'hat',    weapon:'staff',  proj:'orb',    atk:['volley','summon','row','throw']},
  matkaptank:    {ad:'Matkap Tank',       hp:280, w:64, h:56, body:'#7a5a30', head:'none',   weapon:'drill',  proj:'bullet', atk:['charge','slam','volley']},
  saatustasi:    {ad:'Saat Ustası',       hp:340, w:36, h:64, body:'#8a6a3a', head:'hat',    weapon:'staff',  proj:'bullet', atk:['row','volley','summon','leap']},
  denizyilani:   {ad:'Deniz Yılanı',      hp:280, w:60, h:50, body:'#2a6a7a', head:'beast',  weapon:'none',   proj:'orb',    atk:['charge','volley','lunge']},
  kraken:        {ad:'Kraken',            hp:360, w:70, h:70, body:'#5a2a5a', head:'beast',  weapon:'claws',  proj:'orb',    atk:['row','slam','volley','summon']},
  boynuzlucellat:{ad:'Boynuzlu Cellat',   hp:300, w:42, h:68, body:'#7a2418', head:'horns',  weapon:'hammer', proj:'orb',    atk:['lunge','leap','charge']},
  iblislordu:    {ad:'İblis Lordu',       hp:380, w:44, h:74, body:'#8a2a18', head:'horns',  weapon:'spear',  proj:'orb',    atk:['throw','row','leap','volley']},
  altinheykel:   {ad:'Altın Heykel',      hp:320, w:46, h:70, body:'#b8923a', head:'crown',  weapon:'sword',  proj:'orb',    atk:['slam','volley','charge']},
  basmelek:      {ad:'Düşmüş Başmelek',   hp:400, w:36, h:70, body:'#cfc6ac', head:'halo',   weapon:'spear',  proj:'spear',  atk:['throw','lunge','row','charge']},
  mutantkasap:   {ad:'Mutant Kasap',      hp:320, w:54, h:70, body:'#6a7a4a', head:'beast',  weapon:'hammer', proj:'orb',    atk:['charge','lunge','summon']},
  suruannesi:    {ad:'Sürü Annesi',       hp:420, w:66, h:72, body:'#4a5a3a', head:'beast',  weapon:'claws',  proj:'orb',    atk:['summon','volley','slam','leap']},
  devakrep:      {ad:'Dev Akrep',         hp:320, w:66, h:44, body:'#a07a40', head:'beast',  weapon:'claws',  proj:'orb',    atk:['lunge','charge','volley']},
  firavun:       {ad:'Firavun',           hp:420, w:36, h:70, body:'#c8a050', head:'crown',  weapon:'staff',  proj:'orb',    atk:['row','summon','volley','throw']},
  zamanbekcisi:  {ad:'Zaman Bekçisi',     hp:360, w:40, h:68, body:'#4a3a80', head:'helmet', weapon:'sword',  proj:'orb',    atk:['lunge','volley','row','slam'], weak1:'buz', weak2:'zehir'},
  sonsaat:       {ad:'Zamanın Efendisi',  hp:480, w:44, h:76, body:'#3a2a70', head:'halo',   weapon:'staff',  proj:'orb',    atk:['throw','lunge','leap','row','volley','charge','slam','summon','rain','ring'], weak1:'yildirim', weak2:'kutsal'},
  /* 30. ve 45. alt bölüm bossları */
  zindanbekcisi: {ad:'Zindan Bekçisi',    hp:280, w:46, h:64, body:'#5a4a3a', head:'helmet', weapon:'hammer', proj:'arrow',  atk:['slam','combo','charge']},
  kemiklord:     {ad:'Kemik Okçu Lordu',  hp:300, w:32, h:64, body:'#9a92a4', head:'skull',  weapon:'staff',  proj:'arrow',  atk:['volley','rain','throw','row']},
  buzdevi:       {ad:'Buz Devi',          hp:300, w:58, h:76, body:'#9cc4dc', head:'beast',  weapon:'hammer', proj:'shard',  atk:['slam','leap','ring']},
  karcadisi:     {ad:'Kar Cadısı',        hp:320, w:32, h:64, body:'#6fa0c8', head:'hat',    weapon:'staff',  proj:'shard',  atk:['rain','volley','row','summon']},
  curukagac:     {ad:'Çürük Ağaç',        hp:320, w:60, h:80, body:'#4a5a2a', head:'horns',  weapon:'claws',  proj:'orb',    atk:['slam','summon','ring']},
  sinekkralice:  {ad:'Sinek Kraliçesi',   hp:300, w:40, h:58, body:'#5a6a3a', head:'beast',  weapon:'spear',  proj:'orb',    atk:['combo','rain','lunge','summon']},
  buharsovalye:  {ad:'Buhar Şövalyesi',   hp:320, w:40, h:66, body:'#6a5a4a', head:'helmet', weapon:'sword',  proj:'bullet', atk:['combo','charge','volley']},
  topcuustasi:   {ad:'Topçu Ustası',      hp:330, w:52, h:60, body:'#5a4a30', head:'hat',    weapon:'drill',  proj:'bullet', atk:['rain','ring','volley','row']},
  dalgalordu:    {ad:'Dalga Lordu',       hp:330, w:38, h:70, body:'#2a5a6a', head:'crown',  weapon:'spear',  proj:'spear',  atk:['throw','combo','row']},
  devyengec:     {ad:'Dev Yengeç',        hp:360, w:70, h:50, body:'#a05030', head:'beast',  weapon:'claws',  proj:'orb',    atk:['charge','slam','ring','lunge']},
  atesdevi:      {ad:'Ateş Devi',         hp:360, w:58, h:78, body:'#9a3a18', head:'horns',  weapon:'hammer', proj:'orb',    atk:['slam','rain','leap']},
  ucbaslikopek:  {ad:'Üç Başlı Köpek',    hp:380, w:68, h:56, body:'#5a1a10', head:'beast',  weapon:'claws',  proj:'orb',    atk:['charge','combo','ring','lunge']},
  nurmuhafizi:   {ad:'Nur Muhafızı',      hp:380, w:42, h:70, body:'#d8cfa8', head:'helmet', weapon:'sword',  proj:'spear',  atk:['combo','throw','row']},
  yildizkahini:  {ad:'Yıldız Kâhini',     hp:380, w:34, h:66, body:'#b8b0e0', head:'halo',   weapon:'staff',  proj:'orb',    atk:['rain','ring','volley','summon']},
  devzombi:      {ad:'Zırhlı Dev Zombi',  hp:400, w:58, h:76, body:'#5a6a4a', head:'beast',  weapon:'none',   proj:'orb',    atk:['charge','slam','summon','combo']},
  dokturcuruk:   {ad:'Doktor Çürük',      hp:380, w:34, h:66, body:'#7a8a6a', head:'hat',    weapon:'staff',  proj:'orb',    atk:['rain','volley','ring','throw']},
  kumcini:       {ad:'Kum Cini',          hp:400, w:40, h:72, body:'#c8a060', head:'horns',  weapon:'staff',  proj:'orb',    atk:['ring','rain','leap']},
  cakalmuhafiz:  {ad:'Çakal Başlı Muhafız',hp:420, w:40, h:72, body:'#3a3020', head:'beast',  weapon:'spear',  proj:'spear',  atk:['combo','throw','charge','row']},
  yanki:         {ad:'Zaman Yankısı',     hp:440, w:36, h:66, body:'#6a5aa0', head:'halo',   weapon:'sword',  proj:'orb',    atk:['combo','ring','rain','lunge'], weak1:'su', weak2:'ates'},
  kiyametsaati:  {ad:'Kıyamet Saati',     hp:460, w:52, h:74, body:'#2a2050', head:'crown',  weapon:'hammer', proj:'orb',    atk:['slam','rain','row','ring','charge'], weak1:'karanlik', weak2:'buz'}
};
/* her bölümün 30. ve 45. alt bölüm bossları */
const MID_BOSS = ['zindanbekcisi', 'buzdevi', 'curukagac', 'buharsovalye', 'dalgalordu', 'atesdevi', 'nurmuhafizi', 'devzombi', 'kumcini', 'yanki'];
const ELITE_BOSS = ['kemiklord', 'karcadisi', 'sinekkralice', 'topcuustasi', 'devyengec', 'ucbaslikopek', 'yildizkahini', 'dokturcuruk', 'cakalmuhafiz', 'kiyametsaati'];
/* 15, 30, 45: boss dövüşü. 50: bölümün büyük bossu ve yanında düşman dalgaları */
const BOSS_AT = {15:'mini', 30:'mid', 45:'elite', 50:'boss'};
const bossOf = (c, s) => { const k = BOSS_AT[s]; if (!k) return null; const ch = CHAPTERS[c - 1]; return k === 'mini' ? ch.mini : k === 'boss' ? ch.boss : k === 'mid' ? MID_BOSS[c - 1] : ELITE_BOSS[c - 1]; };
const ATK_AD = {throw:'Zıplayıp atış', lunge:'Saplama', leap:'Sıçrayış ve şok dalgası', row:'Sıra saldırısı', volley:'Yelpaze atış', charge:'Hücum', slam:'Yere vuruş', summon:'Yardımcı çağırma', rain:'Gökten yağmur', combo:'Seri saplama', ring:'Halka atış'};
/* boss saldırı hasarları (bölüm ve alt bölüm çarpanıyla büyür) */
const BDMG = {throw:20, lunge:22, quake:14, row:22, volley:12, charge:24, slam:20, rain:18, ring:12};

/* ---------- class'lar, silahlar, eşyalar ---------- */
const CLASSES = {
  okcu:      {ad:'Okçu',      col:'#8a9a52', armor:['Kukuleta','Deri Yelek','Deri Pantolon','Av Çizmesi'],
              set:'Ok hasarı +%15', parca:'+%5 hasar',
              yetenek:{ad:'Geri Takla', bilgi:'Dodge seni geriye, daha uzağa atar ve %40 daha hızlı dolar. Taklanın ardından 1,5 sn içinde attığın ilk ok iki kat vurur.'}},
  suikastci: {ad:'Suikastçı', col:'#5a4a78', armor:['Gölge Maskesi','Gölge Yeleği','Sessiz Şalvar','Yumuşak Çizme'],
              set:'Arkadan vuruş ×2,5', parca:'+%3 kritik',
              yetenek:{ad:'Gölge Adımı', bilgi:'Dodge ile bir düşmanın içinden geçersen arkasında belirirsin. Sonraki vuruşun kesin kritik olur.'}},
  tank:      {ad:'Tank',      col:'#8e96a8', armor:['Miğfer','Plaka Zırh','Zırhlı Pantolon','Demir Çizme'],
              set:'Alınan hasar -%15, parry penceresi genişler', parca:'-%4 alınan hasar',
              yetenek:{ad:'Kalkan Hücumu', bilgi:'Dodge yerine kısa bir hücum yaparsın. Yolundaki mobları savurur ve 1 sn sersemletir, bosslara hasar verir.'}},
  buyucu:    {ad:'Büyücü',    col:'#7a52b0', armor:['Sivri Şapka','Cübbe','Kumaş Pantolon','Sandalet'],
              set:'Büyü bekleme süreleri -%20', parca:'-%5 bekleme süresi',
              yetenek:{ad:'Işınlanma', bilgi:'Dodge yerine imlecin olduğu yere ışınlanırsın (en fazla 300 px).'}}
};
const SLOTS = ['sapka', 'kiyafet', 'pantolon', 'ayakkabi', 'kolye', 'yuzuk', 'silah'];
const SLOT_AD = {sapka:'Şapka', kiyafet:'Kıyafet', pantolon:'Pantolon', ayakkabi:'Ayakkabı', kolye:'Kolye', yuzuk:'Yüzük', silah:'Silah'};
const ARMOR_SLOTS = ['sapka', 'kiyafet', 'pantolon', 'ayakkabi'];

/* kind silahın dövüş şeklini, dodge/sağ tık davranışını belirler */
const WEAPONS = {
  yay:      {ad:'Av Yayı',          cls:'okcu',      kind:'bow',    dmg:11, cd:.45, fx:'single',  range:430, bilgi:'Tek hedefe güçlü ok. Mouse ile nişan. Menzil 430.'},
  patlayan: {ad:'Patlayan Ok Yayı', cls:'okcu',      kind:'bow',    dmg:7,  cd:.6,  fx:'aoe',     range:400, bilgi:'Ok çarptığı yerde ya da menzilin sonunda patlar. Kalabalıkta iyi, tek bossa zayıf. Menzil 400.'},
  delici:   {ad:'Delici Yay',       cls:'okcu',      kind:'bow',    dmg:9,  cd:.55, fx:'pierce',  range:560, bilgi:'Ok düşmanların içinden geçer, her delişte hasarı %35 düşer. Menzili en uzun yay: 560.'},
  hancer:   {ad:'Hançer',           cls:'suikastci', kind:'dagger', dmg:8,  cd:.2,  fx:'single',  bilgi:'Hızlı ve kısa menzil. %20 kritik (×1,75), arkadan vuruş ×2.'},
  zehirli:  {ad:'Zehirli Hançer',   cls:'suikastci', kind:'dagger', dmg:5,  cd:.22, fx:'poison',  bilgi:'Zehir 3 sn işler ve yakındaki düşmanlara yayılır. %20 kritik.'},
  kalkan:   {ad:'Kılıç ve Kalkan',  cls:'tank',      kind:'shield', dmg:9,  cd:.38, fx:'single',  bilgi:'Sağ tık basılı: kalkan. Önden gelen ok ve vuruşları bloklar, tam zamanında parry.'},
  cekic:    {ad:'Savaş Çekici',     cls:'tank',      kind:'hammer', dmg:14, cd:.7,  fx:'aoe',     bilgi:'Önündeki herkese ağır vuruş. Kalkanları deler. Bloklayamaz.'},
  simsek:   {ad:'Şimşek Asası',     cls:'buyucu',    kind:'staff',  dmg:6,  cd:.9,  fx:'stun',    bilgi:'İmleçteki düşmanlara yıldırım. Mobları sersemletir, bosslara işlemez.'},
  ayaz:     {ad:'Ayaz Asası',       cls:'buyucu',    kind:'staff',  dmg:7,  cd:.5,  fx:'slow',    range:460, bilgi:'Buz parçası atar, düşmanı ve hazırlık sürelerini yavaşlatır. Menzil 460.'},
  sifa:     {ad:'Şifa Asası',       cls:'buyucu',    kind:'staff',  dmg:0,  cd:3.5, fx:'heal',    bilgi:'Canının %25\'ini yeniler. Co-op\'ta arkadaşını da iyileştirecek.'},
  bariyer:  {ad:'Bariyer Asası',    cls:'buyucu',    kind:'staff',  dmg:0,  cd:6,   fx:'barrier', bilgi:'Bir sonraki vuruşu emen kalkan basar.'}
};
const FIST = {ad:'Yumruk', cls:null, kind:'fist', dmg:5, cd:.3, fx:'single', bilgi:'Çıplak el.'};
/* herkesin dodge'u aynı. Class'ın 4 zırh parçası tamamlanınca dodge, class yeteneğine dönüşür (CLASSES.yetenek). */
const DEFENSE = {
  normal: {ad:'Normal dodge', cdMul:1, distMul:1, ifrAdd:0},
  okcu:   {ad:'Geri Takla', cdMul:.6, distMul:1.35, ifrAdd:40, back:true},
  suikastci: {ad:'Gölge Adımı', cdMul:1, distMul:1.1, ifrAdd:60, shadow:true},
  tank:   {ad:'Kalkan Hücumu', cdMul:1.15, distMul:1.2, ifrAdd:0, bash:true},
  buyucu: {ad:'Işınlanma', blink:true, blinkCd:1.4, range:300}
};
const CRIT = {dagger:{ch:.2, mul:1.75}};

const ITEMS = [];
(function makeItems(){
  CHAPTERS.forEach((ch, ci) => {
    const c = ci + 1;
    let k = 0;
    const dropEl = () => ch.drop === 'mix' ? MIXEL[(c * 5 + (k++) * 3) % MIXEL.length] : ch.drop;
    const res = ch.el && ch.el !== 'mix' ? ch.el : null;
    for (const [wid, w] of Object.entries(WEAPONS)){
      const el = (w.fx === 'heal' || w.fx === 'barrier') ? null : dropEl();
      ITEMS.push({id:`w-${wid}-${c}`, slot:'silah', cls:w.cls, tier:c, ad:`${ch.adj} ${w.ad}`, weapon:wid, el});
    }
    for (const [cid, cl] of Object.entries(CLASSES)){
      ARMOR_SLOTS.forEach((slot, si) => {
        ITEMS.push({id:`a-${cid}-${slot}-${c}`, slot, cls:cid, tier:c, ad:`${ch.adj} ${cl.armor[si]}`, res});
      });
    }
    ITEMS.push({id:`k-${c}`, slot:'kolye', cls:null, tier:c, ad:`${ch.adj} Muskası`, res, jewel:'muska'});
    ITEMS.push({id:`y-guc-${c}`, slot:'yuzuk', cls:null, tier:c, ad:`${ch.adj} Güç Yüzüğü`, jewel:'guc'});
    ITEMS.push({id:`y-cev-${c}`, slot:'yuzuk', cls:null, tier:c, ad:`${ch.adj} Çeviklik Yüzüğü`, jewel:'ceviklik'});
  });
})();
/* ---------- nadir eşyalar: sadece o bölümün belli bir düşmanından düşer ----------
   a: düşman türü (null: o bölümdeki herhangi bir düşman). Taban hasarı normal silahın 1,35 katı. */
const RARES = [
  {c:1,  a:'ranged', weapon:'delici',   ad:'Kemik Yayı'},
  {c:2,  a:'runner', weapon:'hancer',   ad:'Kurt Dişi'},
  {c:3,  a:'ranged', weapon:'simsek',   ad:'Cadı Asası'},
  {c:4,  a:'tank',   weapon:'cekic',    ad:'Buhar Çekici'},
  {c:5,  a:'runner', weapon:'zehirli',  ad:'Köpekbalığı Dişi'},
  {c:6,  a:'ranged', weapon:'patlayan', ad:'Kor Yayı'},
  {c:7,  a:'ranged', weapon:'yay',      ad:'Melek Yayı'},
  {c:8,  a:'tank',   weapon:'kalkan',   ad:'Kasap Kalkanı'},
  {c:9,  a:'runner', weapon:'zehirli',  ad:'Akrep İğnesi'},
  {c:10, a:null,     weapon:'ayaz',     ad:'Zaman Asası'}
];
const RARE_BY_C = {};
for (const r of RARES){
  const ch = CHAPTERS[r.c - 1];
  const el = ch.drop === 'mix' ? MIXEL[(r.c * 3) % MIXEL.length] : ch.drop;
  const it = {id:`r-${r.c}`, slot:'silah', cls:WEAPONS[r.weapon].cls, tier:r.c, ad:r.ad, weapon:r.weapon, el, rare:true,
    from:r.a ? ch.mobs[r.a] : 'bölümdeki herhangi bir düşman'};
  ITEMS.push(it); RARE_BY_C[r.c] = Object.assign({id:it.id}, r);
}
const ITEM_BY_ID = Object.fromEntries(ITEMS.map(i => [i.id, i]));

/* ---------- ganimet oranları ----------
   mob: her öldürmede eşya düşme ihtimali. Elitlerde 2,5 katı.
   Bölüm sandığı: bölümü ilk temizlemede %60, sonraki temizlemelerde %20.
   Boss ve mini boss her zaman en az bir eşya düşürür. Bossun ilk yenilişinde class'ına uygun silah gelir.
   smart: düşen eşyanın kuşandığın class'tan (ya da takı) olma ihtimali. */
const DROP = {mob:{tank:.05, ranged:.04, runner:.03, flyer:.035, burrower:.05, exploder:.025, healer:.06, jumper:.035, charger:.06, lobber:.045},
  eliteMul:2.5, chestFirst:.6, chestRepeat:.2,
  miniExtra:.3, bossExtra:.5, rare:.02, rareElite:.05, smart:.5};
/* 1. bölümde zırh 300, takı 360, silah 450 altın; her bölümde ×1,45. Satış fiyatı alışın %30'u. */
const PRICE = it => Math.round((it.slot === 'silah' ? 450 : it.jewel ? 360 : 300) * TF(it.tier) * (it.rare ? 3 : 1));
const SELL = it => Math.max(1, Math.round(PRICE(it) * .3));
const SHOP_SIZE = 6;
const REROLL_COST = c => Math.round(60 * TF(c));

/* ---------- bölüm üretimi ---------- */
function rng(seed){
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; };
}
/* 10 arena düzeni. 2. sıra y=370, 3. sıra y=260. Zıplama yüksekliği 150 px: 3. sıraya 2. sıradan çıkılır. */
const LAYOUTS = [
  [{x:110, y:370, w:300}, {x:550, y:370, w:300}, {x:330, y:260, w:300}],
  [{x:60, y:370, w:240}, {x:360, y:370, w:240}, {x:660, y:370, w:240}, {x:210, y:260, w:200}, {x:550, y:260, w:200}],
  [{x:200, y:370, w:560}, {x:50, y:260, w:220}, {x:690, y:260, w:220}],
  [{x:60, y:370, w:280}, {x:620, y:370, w:280}, {x:390, y:260, w:180}],
  [{x:310, y:370, w:340}, {x:60, y:260, w:250}, {x:650, y:260, w:250}],
  [{x:50, y:370, w:170}, {x:290, y:370, w:150}, {x:520, y:370, w:150}, {x:740, y:370, w:170}, {x:380, y:260, w:200}],
  [{x:80, y:370, w:200}, {x:380, y:370, w:200}, {x:680, y:370, w:200}, {x:220, y:260, w:520}],
  [{x:410, y:370, w:140}, {x:90, y:260, w:310}, {x:560, y:260, w:310}],
  [{x:50, y:370, w:400}, {x:510, y:370, w:400}],
  [{x:150, y:370, w:190}, {x:620, y:370, w:190}, {x:50, y:260, w:170}, {x:395, y:260, w:170}, {x:740, y:260, w:170}]
];
const FORMS = {
  oncu:   'Öncü hat: tank önde, menzilliler arkada',
  kiskac: 'Kıskaç: iki yandan koşucular',
  yuksek: 'Yüksek atış: platformlarda menzilliler',
  suru:   'Sürü: çok sayıda koşucu',
  kale:   'Kale: iki tank ve arkalarında menzilliler',
  hava:   'Hava saldırısı: uçanlar ve onları koruyan tank',
  karma:  'Karma birlik: bu dünyanın bütün özel türleri'
};
/* özel türler kendi yerlerinde doğar: uçan havada, solucan ve hücumcu zeminde, bombacı ve şifacı geride */
const SPECIAL_HOME = {flyer:'air', burrower:'floor', charger:'floor', exploder:'floor', jumper:'any', healer:'back', lobber:'back'};
const FORM_KEYS = Object.keys(FORMS);

function levelDef(c, s){
  const R = rng(c * 1009 + s * 31 + 7);
  const ch = CHAPTERS[c - 1];
  const boss = bossOf(c, s);
  const kind = s === 50 ? 'boss' : boss ? 'mini' : 'level';
  const li = kind === 'boss' && c === 1 ? 0 : (c * 3 + s * 7) % LAYOUTS.length;
  const layout = LAYOUTS[li].map(p => Object.assign({}, p));
  const def = {c, s, kind, layout, li, traps:[], waves:null, boss};
  /* 50. alt bölüm: boss ve yanında dalgalar. Diğer bölümlerde sadece dalgalar. */
  if (kind === 'level') def.waves = genWaves(c, s, R, layout);
  else if (kind === 'boss') def.waves = genWaves(c, 30, R, layout).slice(0, 3).map(w => ({form:w.form, mobs:w.mobs.slice(0, 4 + Math.floor(c / 3))}));
  /* platform türleri: kırılan (üstünde durunca çöker, 3 sn sonra geri gelir), hareketli (yana kayar).
     Düşmanların durduğu platformlar normal kalır. 2. bölümde platformlar buzludur, kayarsın. */
  const homes = new Set();
  for (const w of def.waves || []) for (const m of w.mobs) if (m.home != null) homes.add(m.home % layout.length);
  if (c === 2) layout.forEach(p => { p.ice = true; });
  if (kind === 'level' && s >= 4){
    const crumble = Math.min(.45, .15 + s / 120), move = s >= 9 ? Math.min(.4, .1 + s / 140) : 0;
    layout.forEach((p, i) => {
      if (homes.has(i)) return;
      const r = R();
      if (r < crumble) p.kind = 'kirilan';
      else if (r < crumble + move){ p.kind = 'hareketli'; p.x0 = p.x; p.amp = 40 + Math.floor(R() * 40); p.per = 3 + R() * 2; p.ph = R() * 6.28; }
    });
  }
  /* tuzaklar: sadece normal platformlarda, alt bölüm ilerledikçe artar */
  const nt = kind === 'level' ? Math.min(4, 1 + Math.floor(s / 14) + (c >= 6 ? 1 : 0)) : Math.min(3, 1 + Math.floor(c / 4));
  const ok = layout.map((p, i) => i).filter(i => !layout[i].kind);
  const used = new Set();
  for (let i = 0; i < nt && ok.length; i++){
    let pi = ok[Math.floor(R() * ok.length)], tries = 0;
    while (used.has(pi) && tries++ < 6) pi = ok[Math.floor(R() * ok.length)];
    if (used.has(pi)) continue;
    used.add(pi);
    const pl = layout[pi], w = 70 + Math.floor(R() * 3) * 10;
    const x = pl.x + 20 + Math.floor(R() * Math.max(1, pl.w - w - 40));
    def.traps.push({x, y:pl.y, w, period:3 + R() * .8, off:R() * 3});
  }
  return def;
}
function genWaves(c, s, R, layout){
  const n = (s < 4 ? 2 : s < 20 ? 3 : 4) + (c >= 3 && s > 25 ? 1 : 0);
  const waves = [];
  for (let wi = 0; wi < n; wi++){
    const size = Math.min(12, 3 + Math.floor(s / 7) + wi + Math.floor((c - 1) / 2));
    const keys = FORM_KEYS.filter(k => (k !== 'hava' || specialOk('flyer', c, s)) && (k !== 'karma' || s >= 15 || c >= 3));
    const form = s <= 3 ? 'oncu' : keys[Math.floor(R() * keys.length)];
    waves.push({form, mobs:buildForm(form, size, c, s, R, layout)});
  }
  return waves;
}
function pickAffixes(c, s, R){
  const chance = Math.min(.65, (s / 50) * .35 + (c - 1) * .04);
  if (R() >= chance) return [];
  const a = [AFFIX_KEYS[Math.floor(R() * AFFIX_KEYS.length)]];
  if (c >= 6 && s > 30 && R() < .4){
    const b = AFFIX_KEYS[Math.floor(R() * AFFIX_KEYS.length)];
    if (b !== a[0]) a.push(b);
  }
  return a;
}
function buildForm(form, size, c, s, R, layout){
  const side = R() < .5 ? 1 : -1;
  const plats = layout.map((p, i) => i);
  const sidePlat = sd => {
    const ps = plats.filter(i => (layout[i].x + layout[i].w / 2 - 480) * sd > 0);
    return ps.length ? ps[Math.floor(R() * ps.length)] : plats[Math.floor(R() * plats.length)];
  };
  const list = [];
  /* v: saldırı varyantı (aynı türün farklı saldırı şekli), alt bölüm ilerledikçe sıklaşır */
  const pv = Math.min(.65, Math.max(0, (s - 5) / 30 + (c - 1) * .07));
  const add = (a, x, home) => {
    const origin = c === 10 ? 1 + Math.floor(R() * 9) : c;
    list.push({a, x, home, origin, aff:pickAffixes(c, s, R), v:R() < pv ? 1 : 0});
  };
  if (form === 'oncu'){
    add('tank', 480 + side * 240);
    add('ranged', 0, sidePlat(side));
    while (list.length < size) list.length % 2 ? add('ranged', 480 + side * (360 + R() * 60)) : add('runner', 480 + side * (300 + R() * 80));
  } else if (form === 'kiskac'){
    add('runner', 50); add('runner', 910);
    add('tank', 480 + side * 260);
    while (list.length < size) add(R() < .5 ? 'runner' : 'ranged', R() < .5 ? 60 + R() * 60 : 840 + R() * 60, R() < .4 ? sidePlat(R() < .5 ? 1 : -1) : undefined);
  } else if (form === 'yuksek'){
    add('tank', 480 + side * 230);
    const ps = plats.slice().sort(() => R() - .5);
    let i = 0;
    while (list.length < size){ add('ranged', 0, ps[i % ps.length]); i++; if (i > ps.length && list.length < size) add('runner', 480 - side * 360); }
  } else if (form === 'suru'){
    add('ranged', 0, sidePlat(side));
    while (list.length < size) add('runner', (list.length % 2 ? 60 : 900) + R() * 30);
  } else if (form === 'kale'){
    add('tank', 480 + side * 200); add('tank', 480 + side * 260);
    while (list.length < size) add(list.length % 3 === 2 ? 'runner' : 'ranged', list.length % 3 === 2 ? 480 + side * 320 : 0, list.length % 3 === 2 ? undefined : sidePlat(side));
  } else if (form === 'hava'){
    add('tank', 480 + side * 240);
    while (list.length < size) add(list.length % 3 === 0 ? 'ranged' : 'flyer', 480 + (R() < .5 ? -1 : 1) * (200 + R() * 220), list.length % 3 === 0 ? sidePlat(side) : undefined);
  } else {
    add('tank', 480 + side * 230);
    while (list.length < size) add('special', 480 + (R() < .5 ? -1 : 1) * (200 + R() * 240));
  }
  /* özel türleri yerleştir: "special" yazanlar ve şansı tutan koşucu/menzilliler bölümün özel türlerinden biri olur */
  const chance = Math.min(.6, .2 + .35 * (s / 50) + .03 * (c - 1));
  list.forEach((m, i) => {
    const ros = Object.keys(ROSTER[m.origin - 1]).filter(a => !BASE_ARCH.includes(a) && specialOk(a, c, s));
    const want = m.a === 'special' || (i > 0 && m.a !== 'tank' && m.a !== 'flyer' && R() < chance);
    if (m.a === 'flyer' && !ROSTER[m.origin - 1].flyer) m.a = 'runner';
    if (!want){ if (m.a === 'special') m.a = 'runner'; return; }
    if (!ros.length){ if (m.a === 'special') m.a = 'runner'; return; }
    m.a = ros[Math.floor(R() * ros.length)];
    const h = SPECIAL_HOME[m.a];
    if (h === 'floor' || h === 'air') m.home = undefined;
    else if (h === 'back'){ m.home = R() < .6 ? sidePlat(side) : undefined; if (m.home == null) m.x = 480 + side * (330 + R() * 80); }
  });
  return list.slice(0, size);
}
