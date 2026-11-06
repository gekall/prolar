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

/* ---------- düşman türleri (her bölüm kendi kılığında) ---------- */
const ARCH = {
  tank:   {w:34, h:52, hp:60, dmg:18, speed:70,  gold:8, rol:'Öncü tank', bilgi:'Önden gelen vuruşları bloklar, yavaş döner. Kalkanla vurduktan sonra açıkta kalır.'},
  runner: {w:24, h:42, hp:25, dmg:12, speed:210, gold:4, rol:'Hızlı yakın dövüşçü', bilgi:'Çömelip gözleri parlayınca ileri atılır. Sadece zeminde gezer.'},
  ranged: {w:22, h:46, hp:18, dmg:10, speed:95,  gold:5, rol:'Menzilli', bilgi:'Platformlarda durur, yaklaşınca kaçar. Nişan çizgisi kilitlenince atar.'}
};
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
  sonsaat:       {ad:'Zamanın Efendisi',  hp:480, w:44, h:76, body:'#3a2a70', head:'halo',   weapon:'staff',  proj:'orb',    atk:['throw','lunge','leap','row','volley','charge','slam','summon'], weak1:'yildirim', weak2:'kutsal'}
};
const ATK_AD = {throw:'Zıplayıp atış', lunge:'Saplama', leap:'Sıçrayış ve şok dalgası', row:'Sıra saldırısı', volley:'Yelpaze atış', charge:'Hücum', slam:'Yere vuruş', summon:'Yardımcı çağırma'};
/* boss saldırı hasarları (bölüm ve alt bölüm çarpanıyla büyür) */
const BDMG = {throw:20, lunge:22, quake:14, row:22, volley:12, charge:24, slam:20};

/* ---------- class'lar, silahlar, eşyalar ---------- */
const CLASSES = {
  okcu:      {ad:'Okçu',      col:'#8a9a52', armor:['Kukuleta','Deri Yelek','Deri Pantolon','Av Çizmesi'],
              set:'Ok hasarı +%20, atış bekleme süresi -%20', parca:'+%5 hasar'},
  suikastci: {ad:'Suikastçı', col:'#5a4a78', armor:['Gölge Maskesi','Gölge Yeleği','Sessiz Şalvar','Yumuşak Çizme'],
              set:'Dodge koruması +80 ms, arkadan vuruş ×3', parca:'+15 ms dodge'},
  tank:      {ad:'Tank',      col:'#8e96a8', armor:['Miğfer','Plaka Zırh','Zırhlı Pantolon','Demir Çizme'],
              set:'Alınan hasar -%20, parry penceresi genişler', parca:'-%4 alınan hasar'},
  buyucu:    {ad:'Büyücü',    col:'#7a52b0', armor:['Sivri Şapka','Cübbe','Kumaş Pantolon','Sandalet'],
              set:'Büyü ve ışınlanma bekleme süreleri -%25', parca:'-%5 bekleme süresi'}
};
const SLOTS = ['sapka', 'kiyafet', 'pantolon', 'ayakkabi', 'kolye', 'yuzuk', 'silah'];
const SLOT_AD = {sapka:'Şapka', kiyafet:'Kıyafet', pantolon:'Pantolon', ayakkabi:'Ayakkabı', kolye:'Kolye', yuzuk:'Yüzük', silah:'Silah'};
const ARMOR_SLOTS = ['sapka', 'kiyafet', 'pantolon', 'ayakkabi'];

/* kind silahın dövüş şeklini, dodge/sağ tık davranışını belirler */
const WEAPONS = {
  yay:      {ad:'Av Yayı',          cls:'okcu',      kind:'bow',    dmg:11, cd:.45, fx:'single',  bilgi:'Tek hedefe güçlü ok. Mouse ile nişan.'},
  patlayan: {ad:'Patlayan Ok Yayı', cls:'okcu',      kind:'bow',    dmg:7,  cd:.6,  fx:'aoe',     bilgi:'Ok çarptığı yerde patlar. Kalabalıkta iyi, tek bossa zayıf.'},
  delici:   {ad:'Delici Yay',       cls:'okcu',      kind:'bow',    dmg:8,  cd:.55, fx:'pierce',  bilgi:'Ok yolundaki bütün düşmanlardan geçer.'},
  hancer:   {ad:'Hançer',           cls:'suikastci', kind:'dagger', dmg:8,  cd:.2,  fx:'single',  bilgi:'Hızlı ve kısa menzil. Arkadan vuruş ×2.'},
  zehirli:  {ad:'Zehirli Hançer',   cls:'suikastci', kind:'dagger', dmg:5,  cd:.22, fx:'poison',  bilgi:'Zehir 3 sn işler ve yakındaki düşmanlara yayılır.'},
  kalkan:   {ad:'Kılıç ve Kalkan',  cls:'tank',      kind:'shield', dmg:9,  cd:.38, fx:'single',  bilgi:'Sağ tık basılı: kalkan. Önden gelen ok ve vuruşları bloklar, tam zamanında parry.'},
  cekic:    {ad:'Savaş Çekici',     cls:'tank',      kind:'hammer', dmg:14, cd:.7,  fx:'aoe',     bilgi:'Önündeki herkese ağır vuruş. Kalkanları deler. Bloklayamaz.'},
  simsek:   {ad:'Şimşek Asası',     cls:'buyucu',    kind:'staff',  dmg:6,  cd:.9,  fx:'stun',    bilgi:'İmleçteki düşmanlara yıldırım. Mobları sersemletir, bosslara işlemez.'},
  ayaz:     {ad:'Ayaz Asası',       cls:'buyucu',    kind:'staff',  dmg:7,  cd:.5,  fx:'slow',    bilgi:'Buz parçası atar, düşmanı ve hazırlık sürelerini yavaşlatır.'},
  sifa:     {ad:'Şifa Asası',       cls:'buyucu',    kind:'staff',  dmg:0,  cd:3.5, fx:'heal',    bilgi:'Canının %25\'ini yeniler. Co-op\'ta arkadaşını da iyileştirecek.'},
  bariyer:  {ad:'Bariyer Asası',    cls:'buyucu',    kind:'staff',  dmg:0,  cd:6,   fx:'barrier', bilgi:'Bir sonraki vuruşu emen kalkan basar.'}
};
const FIST = {ad:'Yumruk', cls:null, kind:'fist', dmg:5, cd:.3, fx:'single', bilgi:'Çıplak el.'};
/* class'a göre savunma: dodge çarpanları ve sağ tık */
const DEFENSE = {
  fist:   {ad:'Normal dodge',               cdMul:1,    distMul:1,   ifrAdd:0},
  bow:    {ad:'Güçlü dodge',                cdMul:.6,   distMul:1.3, ifrAdd:40},
  dagger: {ad:'Uzun dokunulmazlıklı dodge', cdMul:1,    distMul:1.1, ifrAdd:70},
  shield: {ad:'Zayıf dodge, sağ tık kalkan', cdMul:1.45, distMul:.75, ifrAdd:-40},
  hammer: {ad:'Zayıf dodge',                cdMul:1.3,  distMul:.85, ifrAdd:-20},
  staff:  {ad:'Işınlanma',                  blink:true, blinkCd:1.6, range:300}
};

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
const DROP = {mob:{tank:.05, ranged:.04, runner:.03}, eliteMul:2.5, chestFirst:.6, chestRepeat:.2,
  miniExtra:.3, bossExtra:.5, rare:.02, rareElite:.05, smart:.5};
const PRICE = it => Math.round((it.slot === 'silah' ? 120 : it.jewel ? 100 : 80) * TF(it.tier) * (it.rare ? 3 : 1));
const SELL = it => Math.max(1, Math.round(PRICE(it) * .3));
const SHOP_SIZE = 6;
const REROLL_COST = c => Math.round(20 * TF(c));

/* ---------- bölüm üretimi ---------- */
function rng(seed){
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; };
}
/* 5 arena düzeni. 2. sıra y=370, 3. sıra y=260 */
const LAYOUTS = [
  [{x:110, y:370, w:300}, {x:550, y:370, w:300}, {x:330, y:260, w:300}],
  [{x:60, y:370, w:240}, {x:360, y:370, w:240}, {x:660, y:370, w:240}, {x:210, y:260, w:200}, {x:550, y:260, w:200}],
  [{x:200, y:370, w:560}, {x:50, y:260, w:220}, {x:690, y:260, w:220}],
  [{x:60, y:370, w:280}, {x:620, y:370, w:280}, {x:390, y:260, w:180}],
  [{x:310, y:370, w:340}, {x:60, y:260, w:250}, {x:650, y:260, w:250}]
];
const FORMS = {
  oncu:   'Öncü hat: tank önde, menzilliler arkada',
  kiskac: 'Kıskaç: iki yandan koşucular',
  yuksek: 'Yüksek atış: platformlarda menzilliler',
  suru:   'Sürü: çok sayıda koşucu',
  kale:   'Kale: iki tank ve arkalarında menzilliler'
};
const FORM_KEYS = Object.keys(FORMS);

function levelDef(c, s){
  const R = rng(c * 1009 + s * 31 + 7);
  const ch = CHAPTERS[c - 1];
  const kind = s === 50 ? 'boss' : s === 25 ? 'mini' : 'level';
  const li = kind === 'boss' && c === 1 ? 0 : (c * 3 + s * 7) % LAYOUTS.length;
  const layout = LAYOUTS[li];
  /* tuzaklar: alt bölüm ilerledikçe artar */
  const traps = [];
  const nt = kind === 'level' ? Math.min(4, 1 + Math.floor(s / 14) + (c >= 6 ? 1 : 0)) : Math.min(3, 1 + Math.floor(c / 4));
  const used = new Set();
  for (let i = 0; i < nt; i++){
    let pi = Math.floor(R() * layout.length), tries = 0;
    while (used.has(pi) && tries++ < 6) pi = Math.floor(R() * layout.length);
    used.add(pi);
    const pl = layout[pi], w = 70 + Math.floor(R() * 3) * 10;
    const x = pl.x + 20 + Math.floor(R() * Math.max(1, pl.w - w - 40));
    traps.push({x, y:pl.y, w, period:3 + R() * .8, off:R() * 3});
  }
  const def = {c, s, kind, layout, li, traps, waves:null, boss:null};
  if (kind === 'boss') def.boss = ch.boss;
  else if (kind === 'mini') def.boss = ch.mini;
  else def.waves = genWaves(c, s, R, layout);
  return def;
}
function genWaves(c, s, R, layout){
  const n = (s < 10 ? 2 : s < 30 ? 3 : 4) + (c >= 5 && s > 20 ? 1 : 0);
  const waves = [];
  for (let wi = 0; wi < n; wi++){
    const size = Math.min(9, 2 + Math.floor(s / 10) + wi + Math.floor((c - 1) / 3));
    const form = s <= 3 ? 'oncu' : FORM_KEYS[Math.floor(R() * FORM_KEYS.length)];
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
  const add = (a, x, home) => {
    const origin = c === 10 ? 1 + Math.floor(R() * 9) : c;
    list.push({a, x, home, origin, aff:pickAffixes(c, s, R)});
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
  } else {
    add('tank', 480 + side * 200); add('tank', 480 + side * 260);
    while (list.length < size) add(list.length % 3 === 2 ? 'runner' : 'ranged', list.length % 3 === 2 ? 480 + side * 320 : 0, list.length % 3 === 2 ? undefined : sidePlat(side));
  }
  return list.slice(0, size);
}
