/* ===================== PROLAR MOTORU ===================== */
(() => {
'use strict';

const W = 960, H = 540, FLOOR = 480, WALL = 24;
const G = 2200, RUN = 270, ACC = 2600, JUMP = 820;
const DODGE_SPEED = 640, DODGE_DUR = .19, STEP = 1 / 120;
const rowOf = y => y > 372 ? 1 : y > 262 ? 2 : 3;
const ROW_BAND = {1:[372, FLOOR], 2:[262, 372], 3:[56, 262]};
const ROW_Y = {1:FLOOR, 2:370, 3:260};
const DEF = {tell:300, speed:1400, iframe:300, cd:650};
const LIM = {tell:[120,500], speed:[900,2400], iframe:[120,420], cd:[300,1300]};
const RM = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : {matches:false};
const SHOT = {
  spear:  {shape:'line', len:86, tipF:.55, gap:14, speed:1},
  arrow:  {shape:'line', len:38, tipF:.5,  gap:8,  speed:.7},
  shard:  {shape:'line', len:28, tipF:.5,  gap:7,  speed:.65},
  bullet: {shape:'line', len:16, tipF:.5,  gap:5,  speed:.85},
  orb:    {shape:'orb',  r:9, speed:.48}
};
const MOB_SHOT_SPEED = {arrow:950, shard:900, bullet:1150, orb:620, spear:1100};

const css = getComputedStyle(document.documentElement);
const tok = n => css.getPropertyValue(n).trim();
const C = {
  night:tok('--night'), pit:tok('--pit'), stone:tok('--stone'), stoneHi:tok('--stone-hi'),
  bone:tok('--bone'), dust:tok('--dust'), ember:tok('--ember'), blood:tok('--blood'),
  frost:tok('--frost'), rust:tok('--rust')
};
const F_DISPLAY = '"Grenze Gotisch", Georgia, serif';
const F_BODY = '"Barlow", "Segoe UI", system-ui, sans-serif';
const F_MONO = '"JetBrains Mono", ui-monospace, monospace';

function rgba(hex, a){ const n = parseInt(hex.replace('#',''), 16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }
const rand = (a,b) => a + Math.random() * (b - a);
const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
const ov = (a,b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
const inRect = (x, y, r) => x >= r.l && x <= r.r && y >= r.t && y <= r.b;
const circRect = (x, y, rad, r) => { const cx = clamp(x, r.l, r.r), cy = clamp(y, r.t, r.b); return (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad; };
const elCol = el => el && EL[el] ? EL[el].col : '#c9c0b0';
const elAd = el => el && EL[el] ? EL[el].ad : 'Fiziksel';
const esc = s => String(s).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));

/* ---------- kayıt (tarayıcıya özel) ---------- */
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(_) { return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(_) {} }
};
/* oyun ayarları: sadece admin hesabı değiştirebilir. Diğer herkes her zaman varsayılan değerlerle oynar. */
const set = Object.assign({}, DEF);
function applySettings(isAdmin){
  Object.assign(set, DEF);
  if (!isAdmin) return;
  const saved = store.get('prolar.set2', {});
  for (const k in DEF) if (saved && typeof saved[k] === 'number') set[k] = clamp(saved[k], LIM[k][0], LIM[k][1]);
}
let att = store.get('prolar.att3', {}); if (!att || typeof att !== 'object') att = {};
let sel = store.get('prolar.sel', {c:1, s:1});
if (!sel || !(sel.c >= 1 && sel.c <= 10) || !(sel.s >= 1 && sel.s <= 50)) sel = {c:1, s:1};
let showBoxes = false;
const QUICK_WEAPON = {okcu:'yay', suikastci:'hancer', tank:'kalkan', buyucu:'simsek'};
function quickSet(cls, tier){
  const e = {};
  for (const sl of ARMOR_SLOTS) e[sl] = `a-${cls}-${sl}-${tier}`;
  e.silah = `w-${QUICK_WEAPON[cls]}-${tier}`; e.kolye = `k-${tier}`; e.yuzuk = `y-guc-${tier}`;
  return e;
}
/* ---------- hesap ve profil ----------
   Profil sunucuda (ya da çevrimdışıysa bu tarayıcıda) tutulur: altın, envanter (sınırsız, yığılabilir),
   kuşanılanlar, açılan bölümler, temizlenen bölümler, market durumu. */
let acct = null;          // {token, id, name, admin, offline}
let adminView = false;    // sadece admin hesabında: bütün eşyalar ve bölümler açık
const lobby = {ch:null, code:null, role:null, peers:[], others:[], ping:null, ready:false, pstates:{}, msg:'', joinedAt:0, sendT:0};
const defaultProfile = () => ({v:1, gold:0, inv:{}, equip:{}, prog:{c:1, s:1}, cleared:{}, bossFirst:{}, shop:null, kills:0});
let prof = defaultProfile();
let equip = prof.equip;
function cleanProfile(p){
  const o = Object.assign(defaultProfile(), p && typeof p === 'object' ? p : {});
  o.gold = Math.max(0, Math.floor(+o.gold || 0));
  const inv = {}; for (const [k, v] of Object.entries(o.inv || {})) if (ITEM_BY_ID[k] && v > 0) inv[k] = Math.floor(v);
  o.inv = inv;
  const eq = {}; for (const sl of SLOTS){ const id = (o.equip || {})[sl]; if (id && ITEM_BY_ID[id] && ITEM_BY_ID[id].slot === sl && inv[id]) eq[sl] = id; }
  o.equip = eq;
  if (!o.prog || !(o.prog.c >= 1 && o.prog.c <= 10) || !(o.prog.s >= 1 && o.prog.s <= 50)) o.prog = {c:1, s:1};
  if (!o.cleared || typeof o.cleared !== 'object') o.cleared = {};
  if (!o.bossFirst || typeof o.bossFirst !== 'object') o.bossFirst = {};
  return o;
}
function setProfile(p){ prof = cleanProfile(p); equip = prof.equip; }
const owned = id => adminView || (prof.inv[id] || 0) > 0;
const unlocked = (c, s) => adminView || c < prof.prog.c || (c === prof.prog.c && s <= prof.prog.s);
const attKey = () => `${sel.c}-${sel.s}`;

/* ---------- karakter istatistikleri (seviye senkronu dahil) ---------- */
function itemNums(it, tier){
  const T = TF(tier), n = {};
  if (it.slot === 'silah'){ const w = WEAPONS[it.weapon]; n.dmg = w.dmg * T * (it.rare ? 1.35 : 1); n.cd = w.cd; }
  else if (it.jewel === 'muska'){ n.hp = 8 * T * (it.res ? 1 : 2); if (it.res) n.res = .25; }
  else if (it.jewel === 'guc'){ n.dmgP = .12; }
  else if (it.jewel === 'ceviklik'){ n.spdP = .08; n.dodgeMs = 20; }
  else { n.hp = 15 * T; if (it.res) n.res = .08; }
  return n;
}
function derive(lobbyC){
  const st = {maxHp:50, dmgMul:1, dodgeMs:0, reduce:0, cdMul:1, speedMul:1, res:{}, weapon:null, wTier:1,
              setCls:null, setCount:{}, synced:0, bowDmgMul:1, bowCdMul:1, backstab:2, parryWin:.18, crit:0, critMul:1.75};
  for (const sl of SLOTS){
    const it = ITEM_BY_ID[equip[sl]]; if (!it) continue;
    const eff = Math.min(it.tier, lobbyC); if (it.tier > lobbyC) st.synced++;
    const n = itemNums(it, eff);
    if (it.slot === 'silah'){ st.weapon = it; st.wTier = eff; continue; }
    if (n.hp) st.maxHp += n.hp;
    if (n.res && it.res) st.res[it.res] = (st.res[it.res] || 0) + n.res;
    if (n.dmgP) st.dmgMul += n.dmgP;
    if (n.spdP) st.speedMul += n.spdP;
    if (n.dodgeMs) st.dodgeMs += n.dodgeMs;
    if (ARMOR_SLOTS.includes(it.slot)){
      st.setCount[it.cls] = (st.setCount[it.cls] || 0) + 1;
      if (it.cls === 'okcu') st.dmgMul += .05;
      else if (it.cls === 'suikastci') st.crit += .03;
      else if (it.cls === 'tank') st.reduce += .04;
      else if (it.cls === 'buyucu') st.cdMul -= .05;
    }
  }
  for (const k in st.setCount) if (st.setCount[k] >= 4) st.setCls = k;
  if (st.setCls === 'okcu') st.bowDmgMul = 1.15;
  if (st.setCls === 'suikastci') st.backstab = 2.5;
  if (st.setCls === 'tank'){ st.reduce += .15; st.parryWin = .28; }
  if (st.setCls === 'buyucu') st.cdMul -= .2;
  st.reduce = Math.min(.6, st.reduce); st.cdMul = Math.max(.45, st.cdMul);
  for (const k in st.res) st.res[k] = Math.min(.6, st.res[k]);
  st.maxHp = Math.round(st.maxHp);
  st.wd = st.weapon ? WEAPONS[st.weapon.weapon] : FIST;
  /* herkesin dodge'u aynı; 4 parçalık set dodge'u class yeteneğine çevirir */
  st.def = (st.setCls && DEFENSE[st.setCls]) || DEFENSE.normal;
  const cr = CRIT[st.wd.kind]; if (cr){ st.crit += cr.ch; st.critMul = cr.mul; } else st.crit = 0;
  st.wEl = st.weapon ? st.weapon.el : null;
  st.dmg = st.wd.dmg * (st.weapon ? TF(st.wTier) * (st.weapon.rare ? 1.35 : 1) : 1) * st.dmgMul * (st.wd.kind === 'bow' ? st.bowDmgMul : 1);
  st.atkCd = st.wd.cd * (st.wd.kind === 'bow' ? st.bowCdMul : 1) * (st.wd.kind === 'staff' ? st.cdMul : 1);
  if (st.def.blink){ st.dodgeCd = st.def.blinkCd * st.cdMul; st.ifr = 150; st.dodgeDur = 0; }
  else { st.dodgeCd = set.cd / 1000 * st.def.cdMul; st.ifr = Math.max(80, set.iframe + st.def.ifrAdd + st.dodgeMs); st.dodgeDur = DODGE_DUR * st.def.distMul; }
  return st;
}

/* ---------- arayüz öğeleri ---------- */
const $ = id => document.getElementById(id);
const cv = $('game');
const ctx = cv.getContext('2d');

const SL = [
  ['tell', 's-tell', 'o-tell', v => v + ' ms'],
  ['speed', 's-speed', 'o-speed', v => v + ' px/sn'],
  ['iframe', 's-iframe', 'o-iframe', v => v + ' ms'],
  ['cd', 's-cd', 'o-cd', v => v + ' ms']
];
const canTune = () => !!(acct && acct.admin);
for (const [k, id] of SL){
  $(id).addEventListener('input', ev => { if (!canTune()) return; set[k] = +ev.target.value; store.set('prolar.set2', set); onGearChange(); });
}
$('b-reset').addEventListener('click', () => { if (!canTune()) return; Object.assign(set, DEF); store.set('prolar.set2', set); onGearChange(); });
$('s-boxes').addEventListener('change', ev => { showBoxes = canTune() && ev.target.checked; ev.target.checked = showBoxes; });
$('b-att').addEventListener('click', () => { att[attKey()] = 0; store.set('prolar.att3', att); syncUI(); });

/* bölüm seçici */
const chapEl = $('chapters'), subsEl = $('subs'), infoEl = $('lvinfo');
chapEl.innerHTML = CHAPTERS.map((ch, i) => `<button type="button" class="chap" data-c="${i + 1}"><span>${i + 1}</span>${esc(ch.ad)}</button>`).join('');
const mapLocked = () => runLocked() || lobby.role === 'guest';
chapEl.addEventListener('click', ev => {
  const b = ev.target.closest('.chap'); if (!b || mapLocked()) return;
  const c = +b.dataset.c; if (!unlocked(c, 1)) return;
  selectLevel(c, !adminView && c === prof.prog.c ? prof.prog.s : 1);
});
subsEl.addEventListener('click', ev => {
  const b = ev.target.closest('.sub'); if (!b || mapLocked()) return;
  selectLevel(sel.c, +b.dataset.s);
});
function renderSubs(){
  let h = '';
  const lockAll = mapLocked();
  for (let s = 1; s <= 50; s++){
    const cls = (s === 50 ? ' boss' : BOSS_AT[s] ? ' mini' : '') + (prof.cleared[`${sel.c}-${s}`] ? ' done' : '');
    const open = unlocked(sel.c, s);
    h += `<button type="button" class="sub${cls}" data-s="${s}" aria-pressed="${s === sel.s}" title="${sel.c}-${s}${open ? '' : ' · kilitli'}"${open && !lockAll ? '' : ' disabled'}>${open ? '' : '<i class="lk"></i>'}${sel.c}-${s}</button>`;
  }
  subsEl.innerHTML = h;
  for (const b of chapEl.querySelectorAll('.chap')){
    const c = +b.dataset.c;
    b.setAttribute('aria-pressed', String(c === sel.c));
    b.disabled = lockAll || !unlocked(c, 1);
  }
}
function selectLevel(c, s, fromHost){
  if (!fromHost && (lobby.role === 'guest' || !unlocked(c, s))) return;
  sel = {c, s}; store.set('prolar.sel', sel);
  if (adminView) fTier = c;
  S = makeState('title'); paused = false;
  renderSubs(); syncUI(); renderBag();
  if (lobby.role === 'host') lobbySend('lvl', {c, s});
}

/* envanter */
let fCls = 'all', fSlot = 'all', fTier = 'all';
const slotsEl = $('slots'), statsEl = $('stats'), itemsEl = $('items'), bagEl = $('bag-wrap'), lockEl = $('inv-lock');
const fClsEl = $('f-cls'), fSlotEl = $('f-slot'), fTierEl = $('f-tier');
fClsEl.innerHTML = [['all','Tümü'], ...Object.entries(CLASSES).map(([k, v]) => [k, v.ad]), ['taki','Takı']]
  .map(([k, a]) => `<option value="${k}">${esc(a)}</option>`).join('');
fSlotEl.innerHTML = [['all','Tüm yuvalar'], ...SLOTS.map(s => [s, SLOT_AD[s]])].map(([k, a]) => `<option value="${k}">${esc(a)}</option>`).join('');
fTierEl.innerHTML = [['all','Tüm bölümler'], ...CHAPTERS.map((ch, i) => [String(i + 1), `B${i + 1} · ${ch.ad}`])].map(([k, a]) => `<option value="${k}">${esc(a)}</option>`).join('');
fClsEl.addEventListener('change', () => { fCls = fClsEl.value; renderBag(); });
fSlotEl.addEventListener('change', () => { fSlot = fSlotEl.value; renderBag(); });
fTierEl.addEventListener('change', () => { fTier = fTierEl.value === 'all' ? 'all' : +fTierEl.value; renderBag(); });
$('quick').addEventListener('click', ev => {
  const b = ev.target.closest('[data-q]'); if (!b || runLocked() || !adminView) return;
  const tier = fTier === 'all' ? sel.c : fTier;
  prof.equip = equip = quickSet(b.dataset.q, tier); markDirty(); onGearChange();
});
itemsEl.addEventListener('click', ev => {
  const b = ev.target.closest('[data-act]'); if (!b || runLocked()) return;
  const it = ITEM_BY_ID[b.closest('.item').dataset.id]; if (!it) return;
  if (b.dataset.act === 'equip'){
    if (!owned(it.id)) return;
    if (equip[it.slot] === it.id) delete equip[it.slot]; else equip[it.slot] = it.id;
    markDirty(); onGearChange();
  } else if (b.dataset.act === 'sell') sellItem(it, 1);
});
slotsEl.addEventListener('click', ev => {
  const b = ev.target.closest('[data-unequip]'); if (!b || runLocked()) return;
  delete equip[b.dataset.unequip]; markDirty(); onGearChange();
});
$('b-selldup').addEventListener('click', () => {
  if (runLocked() || adminView) return;
  let n = 0, g = 0;
  for (const [id, cnt] of Object.entries(prof.inv)) if (cnt > 1){ const it = ITEM_BY_ID[id]; g += SELL(it) * (cnt - 1); n += cnt - 1; prof.inv[id] = 1; }
  if (!n){ flash('Satılacak kopya yok.'); return; }
  prof.gold += g; markDirty(); flash(`${n} kopya satıldı, +${g} altın.`); onGearChange(); renderMarket();
});
/* class'a uymayanları sat: kuşandığın silahın class'ı dışındaki zırh ve silahlar. Takılar, nadirler ve kuşanılanlar kalır.
   Yanlışlıkla basılmasın diye ilk tıkta onay ister. */
let sellArmT = 0;
$('b-sellcls').addEventListener('click', ev => {
  if (runLocked() || adminView) return;
  const b = ev.currentTarget, my = derive(sel.c).wd.cls;
  if (!my){ flash('Önce bir silah kuşan. Class\'ını silahın belirler.'); return; }
  const keep = new Set(Object.values(equip));
  const list = Object.entries(prof.inv).filter(([id]) => { const it = ITEM_BY_ID[id]; return it.cls && it.cls !== my && !it.rare && !keep.has(id); });
  if (!list.length){ flash(`${CLASSES[my].ad} dışında satılacak eşya yok.`); return; }
  const n = list.reduce((a, [, c]) => a + c, 0), g = list.reduce((a, [id, c]) => a + SELL(ITEM_BY_ID[id]) * c, 0);
  if (!b.dataset.arm){
    b.dataset.arm = '1'; b.textContent = `${n} eşyayı ${g} altına sat? Onaylamak için tekrar bas`;
    clearTimeout(sellArmT); sellArmT = setTimeout(() => { delete b.dataset.arm; b.textContent = 'Class\'ıma uymayanları sat'; }, 4000);
    return;
  }
  clearTimeout(sellArmT); delete b.dataset.arm; b.textContent = 'Class\'ıma uymayanları sat';
  for (const [id] of list) delete prof.inv[id];
  prof.gold += g; markDirty(); flash(`${n} eşya satıldı, +${g} altın.`); onGearChange(); renderMarket();
});
function sellItem(it, n){
  if (adminView) return;
  const have = prof.inv[it.id] || 0, keep = Object.values(equip).includes(it.id) ? 1 : 0;
  const k = Math.min(n, have - keep);
  if (k <= 0){ flash('Kuşandığın son kopyayı satamazsın. Önce çıkar.'); return; }
  prof.inv[it.id] = have - k; if (!prof.inv[it.id]) delete prof.inv[it.id];
  const g = SELL(it) * k; prof.gold += g;
  markDirty(); flash(`${it.ad} satıldı, +${g} altın.`); onGearChange(); renderMarket();
}
function itemLine(it, tier){
  const n = itemNums(it, tier), parts = [];
  if (it.slot === 'silah'){
    const w = WEAPONS[it.weapon];
    if (n.dmg) parts.push(`Hasar ${Math.round(n.dmg)}`);
    parts.push(`${w.cd} sn`);
  } else {
    if (n.hp) parts.push(`Can +${Math.round(n.hp)}`);
    if (ARMOR_SLOTS.includes(it.slot)) parts.push(CLASSES[it.cls].parca);
    if (n.res && it.res) parts.push(`${elAd(it.res)} direnci %${Math.round(n.res * 100)}`);
    if (n.dmgP) parts.push(`+%${Math.round(n.dmgP * 100)} hasar`);
    if (n.spdP) parts.push(`+%${Math.round(n.spdP * 100)} hız, +${n.dodgeMs} ms dodge`);
  }
  return parts.join(' · ');
}
/* etki etiketleri: [ikon, yazı, açıklama, ton] */
const FX_TAGS = {
  single:[['single', 'Tek hedef', 'Tek düşmana vurur. Bosslara karşı iyi.', 'off']],
  aoe:[['aoe', 'Alan hasarı', 'Çarptığı yerin çevresindeki herkese vurur. Kalabalıkta iyi, tek bossa zayıf.', 'off']],
  pierce:[['pierce', 'Delip geçer', 'Ok yolundaki bütün düşmanlardan geçer.', 'off']],
  poison:[['poison', 'Zehir', '3 sn boyunca zehir hasarı verir.', 'off'], ['aoe', 'Yayılır', 'Zehir yakındaki düşmanlara da bulaşır.', 'off']],
  stun:[['stun', 'Sersemletir', 'Mobları 1,2 sn durdurur. Bosslara işlemez.', 'util'], ['aoe', 'Alan hasarı', 'İmlecin çevresindeki herkese çarpar.', 'off']],
  slow:[['slow', 'Yavaşlatır', 'Düşmanı ve hazırlık sürelerini 2 sn yavaşlatır.', 'util']],
  heal:[['heal', 'İyileştirir', 'Canının %25\'ini yeniler.', 'def']],
  barrier:[['barrier', 'Bariyer', 'Bir sonraki vuruşu tamamen emer.', 'def']]
};
const KIND_TAGS = {
  bow:[['ranged', 'Menzilli', 'Mouse ile elle nişan alırsın, her tıkta bir ok. Okun belli bir menzili var.', 'util']],
  staff:[['ranged', 'Menzilli', 'Mouse ile elle nişan alırsın, her tıkta bir büyü.', 'util']],
  dagger:[['melee', 'Yakın dövüş', 'Kısa menzil.', 'util'], ['crit', '%20 kritik', 'Vuruşların %20 ihtimalle ×1,75 kritik vurur. Suikastçı zırhının her parçası +%3.', 'off'], ['backstab', 'Arkadan ×2', 'Düşmanın arkasından vurursan iki kat hasar. Suikastçı setiyle ×2,5.', 'off']],
  shield:[['melee', 'Yakın dövüş', 'Orta menzil.', 'util'], ['block', 'Blok ve parry', 'Sağ tık basılıyken önden gelen ok ve vuruşları bloklar. Tam zamanında basarsan parry.', 'def']],
  hammer:[['melee', 'Yakın dövüş', 'Geniş ve yavaş vuruş.', 'util'], ['shieldbreak', 'Kalkan deler', 'Kalkanlı düşmanların bloğunu deler.', 'off']]
};
const PART_TAG = {okcu:['dmg', '+%5 hasar', 'off'], suikastci:['crit', '+%3 kritik', 'off'], tank:['armor', '-%4 alınan hasar', 'def'], buyucu:['cd', '-%5 bekleme', 'util']};
function itemTags(it){
  const tags = [];
  const add = (k, label, title, tone, el) => tags.push({k, label, title, tone, el});
  if (it.slot === 'silah'){
    const w = WEAPONS[it.weapon];
    for (const t of FX_TAGS[w.fx]) add(...t);
    for (const t of KIND_TAGS[w.kind]) add(...t);
    if (it.el){
      const strong = CHAPTERS.map((c, i) => c.weak === it.el ? `${i + 1}. ${c.ad}` : null).filter(Boolean);
      add('el', elAd(it.el), `${elAd(it.el)} elementi. Zayıf düşmana ×1,5, aynı elementteki düşmana ×0,5.${strong.length ? ' En güçlü olduğu yer: ' + strong.join(', ') + '.' : ''}`, 'el', it.el);
    }
  } else {
    const n = itemNums(it, it.tier);
    if (n.hp) add('hp', `Can +${Math.round(n.hp)}`, 'Maksimum canını artırır.', 'def');
    if (ARMOR_SLOTS.includes(it.slot)){ const P = PART_TAG[it.cls]; add(P[0], P[1], 'Bu parçanın class bonusu.', P[2]); }
    if (n.res && it.res) add('resist', `${elAd(it.res)} direnci %${Math.round(n.res * 100)}`, `${elAd(it.res)} elementli saldırılardan daha az hasar alırsın.`, 'el', it.res);
    if (n.dmgP) add('dmg', `+%${Math.round(n.dmgP * 100)} hasar`, 'Bütün hasarını artırır.', 'off');
    if (n.spdP){ add('speed', `+%${Math.round(n.spdP * 100)} hız`, 'Koşu hızını artırır.', 'util'); add('dodge', `+${n.dodgeMs} ms dodge`, 'Dodge korumasını uzatır.', 'def'); }
    if (ARMOR_SLOTS.includes(it.slot)){ const K = CLASSES[it.cls]; add('set', `${K.ad} seti`, `4 parça kuşanınca: ${K.set}. Yetenek: ${K.yetenek.ad}. ${K.yetenek.bilgi}`, 'util'); }
  }
  return tags;
}
const tagsHTML = tags => tags.map(t => `<span class="tg tg-${t.tone}"${t.el ? ` style="--c:${elCol(t.el)}"` : ''} title="${esc(t.title || t.label)}">${tagSVG(t.k)}${esc(t.label)}</span>`).join('');
function renderBag(){
  fClsEl.value = fCls; fSlotEl.value = fSlot; fTierEl.value = String(fTier);
  const list = ITEMS.filter(it => owned(it.id) &&
    (fCls === 'all' || (fCls === 'taki' ? !it.cls : it.cls === fCls)) &&
    (fSlot === 'all' || it.slot === fSlot) &&
    (fTier === 'all' || it.tier === fTier));
  const shown = list.slice(0, 120);
  const total = Object.values(prof.inv).reduce((a, b) => a + b, 0);
  $('bag-count').textContent = adminView ? 'Admin görünümü: bütün eşyalar' : `${total} eşya, ${Object.keys(prof.inv).length} çeşit`;
  $('b-selldup').hidden = adminView; $('b-sellcls').hidden = adminView;
  $('quick').hidden = !adminView;
  itemsEl.innerHTML = shown.map(it => itemCard(it, 'bag')).join('')
    + (list.length > shown.length ? `<p class="more">${list.length - shown.length} eşya daha var. Filtreyi daralt.</p>` : '')
    + (!list.length ? `<p class="more">${total ? 'Bu filtreye uyan eşyan yok. Filtreyi "Tüm bölümler" yap.' : 'Envanterin boş. Düşmanlar, bölüm sandıkları ve bosslar eşya düşürür, marketten de alabilirsin.'}</p>` : '');
}
function itemCard(it, where, extra){
  const on = equip[it.slot] === it.id;
  const cl = it.cls ? CLASSES[it.cls] : null;
  const nums = it.slot === 'silah' ? `<span class="nums">${esc(itemLine(it, it.tier))}</span>` : '';
  const cnt = prof.inv[it.id] || 0;
  const rare = it.rare ? `<span class="rare">Nadir · sadece ${esc(it.from)} düşürür</span>` : '';
  let acts = '';
  if (where === 'bag'){
    acts = `<button type="button" data-act="equip">${on ? 'Çıkar' : 'Kuşan'}</button>`
      + (adminView ? '' : `<button type="button" data-act="sell" class="ghost">Sat · ${SELL(it)} altın</button>`);
  } else if (where === 'shop'){
    acts = extra.bought ? '<span class="dim">Satın alındı</span>'
      : `<button type="button" data-buy="${extra.i}"${prof.gold < extra.price ? ' disabled' : ''}>Al · ${extra.price} altın</button>`;
  }
  return `<div class="item${on && where === 'bag' ? ' on' : ''}" data-id="${it.id}" title="${esc(it.slot === 'silah' ? WEAPONS[it.weapon].bilgi : it.ad)}">
    <span class="ic">${itemIconSVG(it, 44)}${where === 'bag' && cnt > 1 && !adminView ? `<i class="cnt">×${cnt}</i>` : ''}</span>
    <span class="tx"><b>${esc(it.ad)}</b>
    <span class="meta">${SLOT_AD[it.slot]} · ${cl ? esc(cl.ad) : 'Takı'} · B${it.tier}${where === 'shop' && cnt ? ` · elinde ${cnt}` : ''}</span>${rare}${nums}
    <span class="tags">${tagsHTML(itemTags(it))}</span>
    <span class="acts">${acts}</span></span></div>`;
}
function renderEquip(){
  const st = derive(sel.c);
  slotsEl.innerHTML = SLOTS.map(sl => {
    const it = ITEM_BY_ID[equip[sl]];
    if (!it) return `<li><span class="sl">${SLOT_AD[sl]}</span><span class="sic empty-ic"></span><span class="empty">Boş${sl === 'silah' ? ' (yumruk)' : ''}</span></li>`;
    const sync = it.tier > sel.c ? `<em class="sync">B${it.tier} → B${sel.c}</em>` : `<em>B${it.tier}</em>`;
    return `<li><span class="sl">${SLOT_AD[sl]}</span><span class="sic">${itemIconSVG(it, 30, true)}</span><span class="nm">${esc(it.ad)} ${sync}</span><button type="button" class="x" data-unequip="${sl}" aria-label="${esc(it.ad)} çıkar">Çıkar</button></li>`;
  }).join('');
  const sc = Object.entries(st.setCount).sort((a, b) => b[1] - a[1])[0];
  const setK = st.setCls ? CLASSES[st.setCls] : sc ? CLASSES[sc[0]] : null;
  const setTxt = st.setCls ? `<b class="ok">${setK.ad} seti aktif:</b> ${esc(setK.set)}. <b class="ok">Yetenek: ${esc(setK.yetenek.ad)}.</b> ${esc(setK.yetenek.bilgi)}`
    : sc ? `${setK.ad} seti ${sc[1]}/4. Dört zırh parçası aynı class'tan olunca açılır: ${esc(setK.set)}. Yetenek: <b>${esc(setK.yetenek.ad)}</b>, ${esc(setK.yetenek.bilgi)}` : 'Set yok. Aynı class\'tan dört zırh parçası kuşanınca set bonusu ve class yeteneği açılır. Yetenek dodge tuşuyla kullanılır.';
  const res = Object.entries(st.res).map(([k, v]) => `<i class="chip" style="--c:${elCol(k)}">${esc(elAd(k))} %${Math.round(v * 100)}</i>`).join('') || '<span class="dim">yok</span>';
  const d = st.def;
  const defTxt = d.blink ? `Işınlanma, ${st.dodgeCd.toFixed(2)} sn bekleme, ${d.range} px menzil`
    : `${d.ad}: ${st.ifr} ms koruma, ${st.dodgeCd.toFixed(2)} sn bekleme`;
  const critTxt = st.crit > 0 ? `<dt>Kritik</dt><dd>%${Math.round(st.crit * 100)} ihtimal, ×${String(st.critMul).replace('.', ',')}</dd>` : '';
  const cls = st.wd.cls ? CLASSES[st.wd.cls].ad : 'Class yok';
  statsEl.innerHTML = `
    <dl>
      <dt>Class</dt><dd>${esc(cls)} <span class="dim">(silaha göre)</span></dd>
      <dt>Can</dt><dd>${st.maxHp}</dd>
      <dt>Silah</dt><dd>${esc(st.weapon ? st.weapon.ad : 'Yumruk')}: ${st.wd.fx === 'heal' ? 'can yeniler' : st.wd.fx === 'barrier' ? 'kalkan basar' : `hasar ${Math.round(st.dmg)}`}, ${st.atkCd.toFixed(2)} sn${st.wEl ? ` <i class="chip" style="--c:${elCol(st.wEl)}">${esc(elAd(st.wEl))}</i>` : ''}</dd>
      ${st.weapon ? `<dt>Etkiler</dt><dd class="tags">${tagsHTML(itemTags(st.weapon))}</dd>` : ''}
      <dt>Dodge</dt><dd>${esc(defTxt)}</dd>${critTxt}
      <dt>Hasar azaltma</dt><dd>%${Math.round(st.reduce * 100)}</dd>
      <dt>Hız</dt><dd>%${Math.round(st.speedMul * 100)}</dd>
      <dt>Dirençler</dt><dd>${res}</dd>
    </dl>
    <p class="set">${setTxt}</p>
    ${st.synced ? `<p class="syncnote">${st.synced} eşyan ${sel.c}. bölümden yüksek. Bu bölümde taban güçleri ${sel.c}. bölüm seviyesine indirildi, element bonusları duruyor.</p>` : ''}`;
}
function runLocked(){ return S.mode === 'play'; }
/* düşman türleri listesi: seçili bölümün yaratıkları, hangi alt bölümden itibaren çıktıkları */
const foeName = (c, a) => (c <= 9 && CHAPTERS[c - 1].mobs && CHAPTERS[c - 1].mobs[a]) || ARCH[a].rol;
function foeFrom(a, c){
  if (BASE_ARCH.includes(a)) return 1;
  for (let s = 1; s <= 50; s++) if (specialOk(a, c, s)) return s;
  return 51;
}
function renderFoes(){
  const el = $('foe-list'); if (!el) return;
  const c = sel.c, kinds = c <= 9 ? Object.keys(ROSTER[c - 1]) : Object.keys(ARCH);
  const order = Object.keys(ARCH);
  kinds.sort((a, b) => foeFrom(a, c) - foeFrom(b, c) || order.indexOf(a) - order.indexOf(b));
  $('foe-ch').textContent = `${c}. bölüm · ${CHAPTERS[c - 1].ad}`;
  el.innerHTML = kinds.map(a => {
    const from = foeFrom(a, c), later = from > sel.s;
    const nm = c <= 9 ? `${esc(foeName(c, a))} <span class="dim">· ${esc(ARCH[a].rol)}</span>` : esc(ARCH[a].rol);
    return `<li${later ? ' class="later"' : ''}><b>${nm}</b>${from > 1 ? ` <span class="dim">${c}-${from}'den itibaren</span>` : ''}<span>${esc(ARCH[a].bilgi)}</span></li>`;
  }).join('');
}
function syncUI(){
  for (const [k, id, oid, fmt] of SL){ $(id).value = set[k]; $(oid).textContent = fmt(set[k]); }
  $('win-note').innerHTML = `Süreler boss'un zıpladığı andan itibaren ölçülür. Atış <b>${set.tell} ms</b>'de geliyor. Dodge koruması silahına göre değişir, şu an <b>${S.p.st.ifr} ms</b>.`;
  $('att').textContent = att[attKey()] || 0;
  $('att-label').textContent = `${sel.c}-${sel.s} deneme sayısı`;
  const L = S.L, ch = CHAPTERS[sel.c - 1];
  const kindAd = L.kind === 'boss' ? 'Son dövüş: boss ve ordusu' : L.kind === 'mini' ? 'Boss' : 'Normal bölüm';
  let body = '';
  if (L.boss){
    const b = BOSSES[L.boss];
    body = `<b>${esc(b.ad)}</b>. Hamleleri: ${b.atk.map(a => ATK_AD[a]).join(', ')}.${L.waves ? ` Yanında ${L.waves.length} dalga düşman gelir, boss ölünce bölüm biter.` : ''}`;
  } else {
    const names = ch.mobs ? Object.values(ch.mobs).join(', ') : 'Önceki dünyalardan karışık düşmanlar';
    body = `${L.waves.length} dalga, ${L.waves.reduce((a, w) => a + w.mobs.length, 0)} düşman. ${esc(names)}. Dizilimler: ${[...new Set(L.waves.map(w => FORMS[w.form].split(':')[0]))].join(', ')}.`;
  }
  const weak = ch.weak === 'mix' ? 'her düşmanda farklı' : ch.weak ? elAd(ch.weak) : 'yok';
  const elT = ch.el === 'mix' ? 'karışık' : ch.el ? elAd(ch.el) : 'fiziksel';
  const pc = v => '%' + String(Math.round(v * 1000) / 10).replace('.', ',');
  const rare = RARE_BY_C[sel.c], rareIt = ITEM_BY_ID[rare.id];
  const key = attKey(), first = !prof.cleared[key];
  let loot;
  if (L.boss){
    const bf = !prof.bossFirst[L.boss];
    loot = `Ganimet: kesin 1 eşya${bf ? ' (ilk zaferde class\'ına uygun silah)' : ''}, ${pc(L.kind === 'boss' ? DROP.bossExtra : DROP.miniExtra)} ihtimalle bir tane daha.`;
  } else {
    const kinds = [...new Set(L.waves.flatMap(w => w.mobs.map(m => m.a)))];
    loot = `Ganimet: ${kinds.map(a => `${esc(foeName(sel.c, a))} ${pc(DROP.mob[a])}`).join(', ')} (elitlerde ${String(DROP.eliteMul).replace('.', ',')} katı). `
      + (key === '1-1' && first ? 'İlk temizlemede kesin bir silah. ' : `Bölüm sandığı ${pc(first ? DROP.chestFirst : DROP.chestRepeat)}${first ? ' (ilk temizleme)' : ''}. `)
      + `Nadir: ${esc(rareIt.ad)}, ${esc(rareIt.from)} ${pc(DROP.rare)} (elit ${pc(DROP.rareElite)}).`;
  }
  const done = prof.cleared[key] ? ` <span class="okc">${prof.cleared[key]} kez temizlendi</span>` : '';
  renderFoes();
  const nk = k => L.layout.filter(p => p.kind === k).length;
  const platT = [nk('kirilan') ? `${nk('kirilan')} kırılan` : '', nk('hareketli') ? `${nk('hareketli')} hareketli` : '', L.layout.some(p => p.ice) ? 'buzlu' : ''].filter(Boolean).join(', ');
  infoEl.innerHTML = `<span class="lvtag">${sel.c}-${sel.s} · ${kindAd}</span>${done} ${body} <span class="dim">Düşman elementi: ${elT}. Zayıflık: ${weak}. Tuzak: ${L.traps.length}.${platT ? ` Platform: ${platT}.` : ''}</span><br><span class="loot">${loot}</span>`;
  const locked = runLocked();
  for (const el of [bagEl, $('market')]){ el.toggleAttribute('inert', locked); el.classList.toggle('locked', locked); }
  lockEl.hidden = !locked;
  renderSubs();
  renderEquip();
  renderAcct();
}
function onGearChange(){
  if (S.mode !== 'play') S = makeState('title');
  syncUI(); renderBag();
}

/* ---------- boss atış kaydı ---------- */
const logEl = $('log');
const log = [];
let spearNo = 0;
const RES = {
  perfect:['Mükemmel','r-ember'], dodged:['Kaçtın','r-frost'], parry:['Parry','r-ember'], blocked:['Blokladın','r-frost'], barrier:['Bariyer emdi','r-frost'],
  'hit-early':['Erken bastın','r-blood'], 'hit-late':['Geç bastın','r-blood'],
  'hit-none':['Basmadın','r-blood'], 'hit-cooldown':['Dodge beklemedeydi','r-blood'],
  miss:['Iska','r-dust'], invuln:['Korumadaydın','r-dust']
};
const ms = v => v == null ? '—' : Math.round(v * 1000) + ' ms';
function renderLog(){
  if (!log.length){
    logEl.innerHTML = '<tr class="empty"><td colspan="4">Henüz atış yok. Bir boss bölümü aç (x-15, x-30, x-45 ya da x-50). Boss zıplayıp attığında süreler burada görünür.</td></tr>';
    return;
  }
  logEl.innerHTML = log.map(en => {
    const [lab, cls] = en.result ? RES[en.result] : ['Uçuşta…', 'r-dust'];
    let extra = '';
    if (en.result === 'hit-late') extra = `<span class="d">isabetten ${Math.round(en.late * 1000)} ms sonra</span>`;
    if (en.result === 'hit-early') extra = `<span class="d">koruma ${Math.round((en.press + en.ifr / 1000) * 1000)} ms'de bitti</span>`;
    const hit = en.result === 'miss' ? '—' : ms(en.res);
    return `<tr><td>${en.n}${en.hang ? '<span class="hang">bekledi</span>' : ''}</td><td>${hit}</td><td>${ms(en.press)}</td><td class="${cls}">${lab}${extra}</td></tr>`;
  }).join('');
}
function logNew(){
  const en = {n:++spearNo, jump:S.t, res:null, press:null, result:null, hang:false, late:null, cdPress:false, ifr:S.p.st.ifr};
  log.unshift(en); if (log.length > 6) log.length = 6;
  renderLog();
  return en;
}
function resolveEntry(en, r){
  if (!en || en.result) return;
  en.res = S.t - en.jump; en.ifr = S.p.st.ifr;
  if (r === 'hit'){
    if (en.press != null && en.press + en.ifr / 1000 < en.res) en.result = 'hit-early';
    else if (en.cdPress) en.result = 'hit-cooldown';
    else { en.result = 'hit-none'; S.lastHit = en; }
  } else en.result = r;
  renderLog();
}

/* ---------- girdi ---------- */
const keys = new Set(), pressed = new Set();
const MAP = {
  ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right',
  ArrowUp:'jump', KeyW:'jump', Space:'jump', ArrowDown:'down', KeyS:'down',
  ShiftLeft:'dodge', ShiftRight:'dodge', KeyK:'dodge', KeyL:'dodge',
  KeyJ:'attack', KeyX:'attack', KeyQ:'alt', KeyR:'restart', Enter:'confirm', Escape:'pause', KeyP:'pause', KeyM:'menu'
};
const mouse = {x:600, y:300};
function isField(t){ return t && (t.tagName === 'INPUT' || t.tagName === 'BUTTON' || t.tagName === 'SUMMARY' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'); }
window.addEventListener('keydown', ev => {
  if (isField(ev.target)) return;
  const a = MAP[ev.code]; if (!a) return;
  if (document.activeElement === cv || (S.mode === 'play' && !paused)) ev.preventDefault();
  if (!ev.repeat) pressed.add(a);
  keys.add(a);
});
window.addEventListener('keyup', ev => { const a = MAP[ev.code]; if (a) keys.delete(a); });
function pauseIfPlaying(){ if (S.mode === 'play' && !S.net) paused = true; keys.clear(); }
window.addEventListener('blur', pauseIfPlaying);
cv.addEventListener('blur', () => { if (!touchMode) pauseIfPlaying(); });
function toGame(ev){ const r = cv.getBoundingClientRect(); mouse.x = (ev.clientX - r.left) / r.width * W; mouse.y = (ev.clientY - r.top) / r.height * H; }
cv.addEventListener('pointermove', toGame);
cv.addEventListener('pointerdown', ev => {
  ev.preventDefault(); cv.focus(); toGame(ev);
  try { cv.setPointerCapture(ev.pointerId); } catch(_) {}
  if (S.mode !== 'play'){ if (ev.button === 0) requestRun(); return; }
  if (paused){ paused = false; return; }
  if (ev.button === 0){ pressed.add('attack'); keys.add('attack'); }
  if (ev.button === 2){ pressed.add('alt'); keys.add('alt'); }
});
const release = ev => { if (ev.button === 0) keys.delete('attack'); if (ev.button === 2) keys.delete('alt'); };
cv.addEventListener('pointerup', release);
window.addEventListener('pointerup', release);
cv.addEventListener('contextmenu', ev => ev.preventDefault());
/* ===================== MOBİL: DOKUNMATİK KONTROLLER =====================
   Telefonda bölüm başlayınca oyun tam ekrana geçer (Android'de ekran yataya kilitlenir; iPhone'da telefonu yan
   çevirmen istenir). Sol yarıda parmağının değdiği yerde joystick belirir: sağa sola koşarsın, aşağı çekince alt
   sıraya inersin, yukarı itince zıplarsın. Sağda Saldır, Zıpla, Dodge ve kalkan ya da asa varsa ikinci tuş var.
   Okçu ve büyücü elle nişan alır: Saldır düğmesini sürükleyip bırakınca o yöne atar ya da ekranda dokunduğun yere atar. */
let touchMode = window.matchMedia ? matchMedia('(pointer: coarse)').matches : false;
const tc = {stick:null, aim:null, dodge:null, alt:null, menu:false, keys:new Set()};
function setTouchMode(on){ if (touchMode === on) return; touchMode = on; document.body.classList.toggle('touch', on); }
document.body.classList.toggle('touch', touchMode);
window.addEventListener('pointerdown', ev => { if (ev.pointerType) setTouchMode(ev.pointerType !== 'mouse'); }, true);
/* tam ekran ve yatay kilit: tarayıcı bunu sadece dokunma anında izin verir (Android). iPhone'da tam ekran yok, telefonu çevirmek gerekir. */
function goFull(){
  if (!touchMode) return;
  const de = document.documentElement;
  if (!de.requestFullscreen || document.fullscreenElement) return;
  try { de.requestFullscreen({navigationUI:'hide'}).then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (_) {} }).catch(() => {}); } catch (_) {}
}
function setImmersive(on){
  const b = document.body;
  if (b.classList.contains('immersive') === on) return;
  b.classList.toggle('immersive', on);
  if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  tcRelease();
  setTimeout(resize, 60); setTimeout(resize, 450);
}
/* parmak kalkınca ya da ekran değişince basılı kalan tuş kalmasın */
function tcRelease(){
  for (const k of tc.keys) keys.delete(k);
  tc.keys.clear(); tc.stick = tc.aim = tc.dodge = tc.alt = null;
  $('tc-base').style.display = 'none';
  for (const b of document.querySelectorAll('.tc-btn')) b.classList.remove('on');
}
function tcKey(k, on){ if (on){ keys.add(k); tc.keys.add(k); } else { keys.delete(k); tc.keys.delete(k); } }
/* nişan: parmağın kaydığı yöne, kaydırma uzunluğuyla artan mesafede */
function aimFrom(dx, dy, maxD){
  const p = S.p, L = Math.hypot(dx, dy), d = clamp(L * 4.5, 90, maxD || 460);
  mouse.x = p.x + dx / L * d; mouse.y = (p.y - 30) + dy / L * d;
}
function aimAhead(d){ const p = S.p; mouse.x = p.x + p.face * (d || 300); mouse.y = p.y - 30; }
/* basılı tutulan düğme: her parmak kendi düğmesine bağlı kalır */
function hold(el, down, move, up){
  let id = null;
  el.addEventListener('pointerdown', ev => {
    ev.preventDefault(); ev.stopPropagation();
    if (id != null || S.mode !== 'play') return;
    id = ev.pointerId; try { el.setPointerCapture(id); } catch (_) {}
    el.classList.add('on'); down(ev);
  });
  el.addEventListener('pointermove', ev => { if (ev.pointerId === id && move) move(ev); });
  const end = ev => { if (ev.pointerId !== id) return; id = null; el.classList.remove('on'); up(ev); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('contextmenu', ev => ev.preventDefault());
}
/* joystick */
const tcZone = $('tc-zone'), tcBase = $('tc-base'), tcKnob = $('tc-knob');
tcZone.addEventListener('pointerdown', ev => {
  ev.preventDefault();
  if (tc.stick || S.mode !== 'play') return;
  const r = tcZone.getBoundingClientRect();
  tc.stick = {id:ev.pointerId, x0:ev.clientX, y0:ev.clientY, dx:0, dy:0, down:false, up:false};
  try { tcZone.setPointerCapture(ev.pointerId); } catch (_) {}
  tcBase.style.display = 'block'; tcBase.style.left = (ev.clientX - r.left) + 'px'; tcBase.style.top = (ev.clientY - r.top) + 'px';
  tcKnob.style.transform = 'translate(0,0)';
});
tcZone.addEventListener('pointermove', ev => {
  const s = tc.stick; if (!s || ev.pointerId !== s.id) return;
  let dx = ev.clientX - s.x0, dy = ev.clientY - s.y0;
  const L = Math.hypot(dx, dy), R = 50;
  if (L > R){ dx *= R / L; dy *= R / L; }
  s.dx = dx; s.dy = dy;
  tcKnob.style.transform = `translate(${dx}px,${dy}px)`;
  /* aşağı: alt sıraya in. yukarı: zıpla */
  if (dy > 32 && dy > Math.abs(dx) * .8){ if (!s.down){ s.down = true; pressed.add('down'); } } else if (dy < 18) s.down = false;
  if (dy < -36 && -dy > Math.abs(dx) * .8){ if (!s.up){ s.up = true; pressed.add('jump'); tcKey('jump', true); } }
  else if (dy > -22 && s.up){ s.up = false; tcKey('jump', false); }
});
const stickEnd = ev => {
  const s = tc.stick; if (!s || ev.pointerId !== s.id) return;
  tc.stick = null; tcBase.style.display = 'none';
  tcKey('left', false); tcKey('right', false); if (s.up) tcKey('jump', false);
};
tcZone.addEventListener('pointerup', stickEnd); tcZone.addEventListener('pointercancel', stickEnd);
/* saldır: yakın dövüşte basılı tut, menzillide sürükle bırak */
hold($('tc-atk'), ev => {
  const w = S.p.st.wd, manual = w.kind === 'bow' || w.kind === 'staff';
  tc.aim = {x0:ev.clientX, y0:ev.clientY, dx:0, dy:0, moved:false, manual};
  if (!manual){ aimAhead(120); pressed.add('attack'); tcKey('attack', true); }
}, ev => {
  const a = tc.aim; if (!a) return;
  a.dx = ev.clientX - a.x0; a.dy = ev.clientY - a.y0;
  if (Math.hypot(a.dx, a.dy) > 16) a.moved = true;
}, () => {
  const a = tc.aim; tc.aim = null; if (!a) return;
  if (a.manual){ if (a.moved) aimFrom(a.dx, a.dy); else aimAhead(); pressed.add('attack'); }
  else tcKey('attack', false);
});
hold($('tc-jump'), () => { pressed.add('jump'); tcKey('jump', true); }, null, () => tcKey('jump', false));
/* dodge: büyücü setiyle sürükleyip ışınlanacağın yeri seçersin */
hold($('tc-dodge'), ev => {
  const blink = S.p.st.def.blink;
  tc.dodge = {x0:ev.clientX, y0:ev.clientY, dx:0, dy:0, moved:false, blink};
  if (!blink){ aimAhead(100); pressed.add('dodge'); }
}, ev => {
  const d = tc.dodge; if (!d) return;
  d.dx = ev.clientX - d.x0; d.dy = ev.clientY - d.y0;
  if (Math.hypot(d.dx, d.dy) > 16) d.moved = true;
}, () => {
  const d = tc.dodge; tc.dodge = null; if (!d || !d.blink) return;
  const s = tc.stick, sx = s && Math.abs(s.dx) > 14 ? Math.sign(s.dx) : 0;
  if (d.moved) aimFrom(d.dx, d.dy, S.p.st.def.range);
  else { const p = S.p; mouse.x = p.x + (sx || p.face) * S.p.st.def.range; mouse.y = p.y - 30; }
  pressed.add('dodge');
});
/* ikinci tuş: kalkan (basılı tut) ya da asa küresi (sürükle bırak) */
hold($('tc-alt'), ev => {
  const shield = S.p.st.wd.kind === 'shield';
  tc.alt = {x0:ev.clientX, y0:ev.clientY, dx:0, dy:0, moved:false, shield};
  if (shield){ aimAhead(100); pressed.add('alt'); tcKey('alt', true); }
}, ev => {
  const a = tc.alt; if (!a) return;
  a.dx = ev.clientX - a.x0; a.dy = ev.clientY - a.y0;
  if (Math.hypot(a.dx, a.dy) > 16) a.moved = true;
  if (a.shield && Math.abs(a.dx) > 20){ const p = S.p; mouse.x = p.x + Math.sign(a.dx) * 100; }
}, () => {
  const a = tc.alt; tc.alt = null; if (!a) return;
  if (a.shield) tcKey('alt', false);
  else { if (a.moved) aimFrom(a.dx, a.dy, 360); else aimAhead(300); pressed.add('alt'); }
});
$('tc-menu').addEventListener('click', () => { if (S.mode !== 'play') return; if (S.net) tc.menu = true; else paused = true; tcRelease(); });
$('tc-resume').addEventListener('click', () => { paused = false; tc.menu = false; });
$('tc-retry').addEventListener('click', () => { tc.menu = false; requestRun(); });
$('tc-next').addEventListener('click', () => {
  const n = sel.s < 50 ? [sel.c, sel.s + 1] : [sel.c + 1, 1];
  if (S.mode !== 'won' || n[0] > 10 || !unlocked(n[0], n[1])) return;
  selectLevel(n[0], n[1]); requestRun();
});
$('tc-home').addEventListener('click', () => { tc.menu = false; toMenu(); });
const DODGE_LBL = {normal:'Dodge', okcu:'Takla', suikastci:'Gölge', tank:'Hücum', buyucu:'Işınlan'};
/* her kare: görünürlük, joystick tuşları, nişan çizgisi için imleç, dodge bekleme halkası */
function tcTick(){
  const imm = touchMode && S.mode !== 'title';
  setImmersive(imm);
  const playing = imm && S.mode === 'play' && !paused && !tc.menu;
  const tEl = $('tc'), eEl = $('tc-end');
  if (tEl.hidden === playing) tEl.hidden = !playing;
  const showEnd = imm && !playing;
  if (eEl.hidden === showEnd) eEl.hidden = !showEnd;
  if (showEnd){
    const guestLock = lobby.ch && lobby.others.length && lobby.role === 'guest';
    const n = sel.s < 50 ? [sel.c, sel.s + 1] : [sel.c + 1, 1];
    $('tc-resume').hidden = !(S.mode === 'play');
    $('tc-retry').hidden = S.mode === 'play' || guestLock;
    $('tc-next').hidden = !(S.mode === 'won' && !guestLock && n[0] <= 10 && unlocked(n[0], n[1]));
  }
  if (!playing){ if (tc.keys.size) tcRelease(); return; }
  const p = S.p, st = p.st, s = tc.stick;
  tcKey('left', !!s && s.dx < -14); tcKey('right', !!s && s.dx > 14);
  /* yakın dövüş tuşu basılıyken vuruşlar baktığın yöne gider */
  if (tc.aim && !tc.aim.manual) aimAhead(120);
  const kind = st.wd.kind, altB = $('tc-alt');
  const altOn = kind === 'shield' || kind === 'staff';
  if (altB.hidden === altOn) altB.hidden = !altOn;
  if (altOn){ const lbl = kind === 'shield' ? 'Kalkan' : 'Küre'; if (altB.dataset.l !== lbl){ altB.dataset.l = lbl; altB.querySelector('span').textContent = lbl; } }
  const dB = $('tc-dodge'), dl = DODGE_LBL[st.setCls && st.def !== DEFENSE.normal ? st.setCls : 'normal'];
  if (dB.dataset.l !== dl){ dB.dataset.l = dl; dB.querySelector('span').textContent = dl; }
  dB.style.setProperty('--cd', String(clamp((S.t - p.dodgeT) / st.dodgeCd, 0, 1)));
}
/* nişan çizgisi: sürüklerken nereye atacağın görünür */
function drawTouchAim(){
  if (!touchMode || S.mode !== 'play') return;
  const p = S.p, a = tc.aim && tc.aim.manual && tc.aim.moved ? tc.aim : tc.alt && !tc.alt.shield && tc.alt.moved ? tc.alt : tc.dodge && tc.dodge.blink && tc.dodge.moved ? tc.dodge : null;
  if (!a) return;
  const maxD = a === tc.dodge ? p.st.def.range : a === tc.alt ? 360 : 460;
  const L = Math.hypot(a.dx, a.dy), d = clamp(L * 4.5, 90, maxD);
  const x = p.x + a.dx / L * d, y = (p.y - 30) + a.dy / L * d;
  dashedLine(p.x, p.y - 30, x, y, rgba(a === tc.dodge ? C.frost : C.ember, .75), 2);
  ctx.strokeStyle = rgba(a === tc.dodge ? C.frost : C.ember, .8); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
}

/* ---------- oyun durumu ---------- */
function makeBoss(L){
  const def = BOSSES[L.boss], ch = CHAPTERS[L.c - 1], f = TF(L.c) * SF(L.s);
  const hp = Math.round(def.hp * f);
  return {def, isBoss:true, x:740, y:FLOOR, vx:0, vy:0, w:def.w, h:def.h, face:-1, grounded:true, hp, max:hp, shown:hp,
    phase:1, state:'idle', st:0, ck:0, dur:1.1, farT:0, flash:0, held:true, last:null, rep:0, hangDone:false, cur:null,
    hitDone:false, rows:[], rowHit:false, rowDodged:false, leapX:0, chargeDir:1, volleyN:3,
    el:ch.el === 'mix' ? null : ch.el, weak:def.weak1 || (ch.weak === 'mix' ? null : ch.weak),
    dmgF:f, slowUntil:-9, stunUntil:-9, poisonUntil:-9, poisonDps:0, poisonTick:0, lastHitT:-9, pal:ch.pal};
}
function makeState(mode){
  const L = levelDef(sel.c, sel.s);
  const st = derive(sel.c);
  const s = {
    mode, L, ch:CHAPTERS[sel.c - 1], plats:L.layout, traps:L.traps, t:0, hitstop:0, shake:0, flashT:-9, banner:null,
    dodged:0, lastHit:null, trapHit:L.traps.map(() => false), gold:0, wave:0, waveT:0, kills:0,
    p:{x:L.boss ? 220 : 480, y:FLOOR, vx:0, vy:0, w:26, h:46, face:1, grounded:true, st, hp:st.maxHp,
       coyote:0, jumpBuf:-9, dodgeT:-9, dodgeUntil:-9, ifrUntil:-9, dodgeDir:1, hurtUntil:-9, stunUntil:-9,
       atkT:-9, atkId:0, altT:-9, dropUntil:-9, blocking:false, blockStart:-9, barrier:0, barrierUntil:-9, castT:-9, castX:0, castY:0},
    e:L.boss ? makeBoss(L) : null,
    mobs:[], shots:[], pshots:[], quakes:[], bombs:[], grenades:[], bolts:[], booms:[], fx:[], texts:[], loot:[], drops:[], unlockedNext:false
  };
  return s;
}
let S = makeState('title');
let paused = false;
/* co-op: lobide başkası varken bölümü lobi sahibi herkes için başlatır */
function requestRun(){
  goFull();
  if (lobby.ch && lobby.others.length){
    if (lobby.role === 'host') coopStart();
    else flash('Bölümü lobi sahibi başlatır.');
    return;
  }
  newRun();
}
function newRun(opts){
  const k = attKey(); att[k] = (att[k] || 0) + 1; store.set('prolar.att3', att);
  S = makeState('play'); paused = false; keys.clear(); pressed.clear();
  S.net = opts && opts.coop ? {host:lobby.role === 'host', rid:opts.rid, evq:[], hits:[], snaps:[], evin:[], off:null, lastRx:performance.now(), dead:new Set()} : null;
  if (S.net){
    /* co-op: oyuncular üst üste doğmasın, lobiye giriş sırasına göre yan yana */
    const order = lobby.peers.slice().sort((x, y) => x.at - y.at).map(q => q.nick), i = Math.max(0, order.indexOf(acct.name));
    S.p.x = clamp(S.p.x + [0, -70, 70, -140][i % 4], WALL + 20, W - WALL - 20);
  }
  if (S.L.waves) spawnWave(0);
  if (S.L.boss) S.banner = {txt:BOSSES[S.L.boss].ad, t:0, sub:S.L.waves ? 'Son dövüş: boss ve ordusu birlikte' : null};
  syncUI();
}
function toMenu(){ S = makeState('title'); paused = false; syncUI(); renderBag(); }

const pRect = () => { const p = S.p; return {l:p.x - p.w/2, r:p.x + p.w/2, t:p.y - p.h, b:p.y}; };
const tRect = m => ({l:m.x - m.w/2, r:m.x + m.w/2, t:m.y - m.h, b:m.y});
const lungeBox = e => e.face > 0 ? {l:e.x + e.w/2, r:e.x + e.w/2 + 72, t:e.y - 44, b:e.y - 28} : {l:e.x - e.w/2 - 72, r:e.x - e.w/2, t:e.y - 44, b:e.y - 28};
const quakeRect = w => ({l:w.x - 14, r:w.x + 14, t:FLOOR - 24, b:FLOOR});
const bashBox = m => m.face > 0 ? {l:m.x + 8, r:m.x + 62, t:m.y - 46, b:m.y} : {l:m.x - 62, r:m.x - 8, t:m.y - 46, b:m.y};
const dashBox = m => m.face > 0 ? {l:m.x, r:m.x + 40, t:m.y - 38, b:m.y - 4} : {l:m.x - 40, r:m.x, t:m.y - 38, b:m.y - 4};
const MELEE = {fist:{r:44, a:.05, b:.15}, dagger:{r:52, a:.04, b:.13}, shield:{r:66, a:.05, b:.16}, hammer:{r:92, a:.16, b:.28}};
function meleeBox(p){
  const m = MELEE[p.st.wd.kind], tall = p.st.wd.kind === 'hammer';
  const t = p.y - (tall ? 58 : 44), b = p.y - (tall ? 0 : 6);
  return p.face > 0 ? {l:p.x + (tall ? -10 : 4), r:p.x + m.r, t, b} : {l:p.x - m.r, r:p.x - (tall ? -10 : 4), t, b};
}

/* ---------- efektler ---------- */
function addShake(v){ if (!RM.matches) S.shake = Math.max(S.shake, v); }
/* vuruş donması: oyunu çok kısa durdurur. Sık vuruşlarda (hançer) her seferinde değil, en fazla 0,25 sn'de bir. */
function hitstop(v, force){
  if (!force && S.t - (S.hsT ?? -9) < .25) return;
  S.hitstop = Math.max(S.hitstop, v); S.hsT = S.t;
}
function burst(x, y, col, n, sp){
  for (let i = 0; i < n; i++){
    const a = Math.random() * Math.PI * 2, v = rand(.3, 1) * sp;
    S.fx.push({x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v - sp * .3, life:rand(.25, .55), age:0, col, sz:rand(2, 4), g:700});
  }
}
function dust(x, y, n, dir){
  for (let i = 0; i < n; i++) S.fx.push({x:x + rand(-10, 10), y:y - 2, vx:rand(-60, 60) + dir * 90, vy:rand(-120, -30), life:rand(.25, .45), age:0, col:C.dust, sz:rand(2, 3.5), g:500});
}
function text(x, y, txt, col, size){ S.texts.push({x, y, txt, col, size, age:0, life:.85}); }
function dodgedFx(perfect){
  const p = S.p; S.dodged++;
  text(p.x, p.y - 64, perfect ? 'MÜKEMMEL' : 'KAÇTIN', perfect ? C.ember : C.frost, perfect ? 20 : 16);
  burst(p.x, p.y - 24, perfect ? C.ember : C.frost, perfect ? 14 : 8, 200);
}

/* ---------- oyuncuya hasar ---------- */
function stunTarget(who, dur){
  if (!who || who.hp <= 0) return;
  if (S.net && !S.net.host){ S.net.hits.push({id:who.isBoss ? 'B' : who.id, stunOnly:dur}); text(who.x, who.y - who.h - 14, 'SENDELEDİ', C.ember, 16); return; }
  if (who.isBoss){
    if (['lunge','charge','slam','rowStrike'].includes(who.state) || who.state.endsWith('Wind')){
      who.vx = 0; who.state = 'recover'; who.st = who.ck; who.dur = .9; who.held = true;
      text(who.x, who.y - who.h - 14, 'SENDELEDİ', C.ember, 16);
    }
  } else { who.stunUntil = S.t + dur; }
}
/* co-op: düşen oyuncu 5 saniye bekler, sonra yeniden doğar. Takımda ayakta kimse kalmazsa bölüm kaybedilir.
   Tek başına oynarken ölmek bölümü bitirir. */
const RESPAWN = 5;
function mates(){
  if (!lobby.ch) return [];
  const now = performance.now(), lv = attKey();
  return Object.values(lobby.pstates).filter(ps => now - ps.rx < 2500 && ps.lv === lv);
}
function playerDown(){
  const p = S.p;
  if (!(S.net && !S.net.host) && !mates().some(ps => !ps.dn)){ endRun(false); return; }
  p.dead = true; p.respawnAt = S.t + RESPAWN; p.vx = 0; p.vy = 0; p.blocking = false;
  S.downs = (S.downs || 0) + 1;
  burst(p.x, p.y - 24, C.blood, 26, 300); addShake(6);
  S.banner = {txt:'Düştün', t:S.t, sub:`${RESPAWN} saniye sonra yeniden doğacaksın`};
}
function updDowned(){
  const p = S.p, ms = mates();
  if (!(S.net && !S.net.host) && ms.length && ms.every(ps => ps.dn)){ endRun(false); return; }
  if (S.t < p.respawnAt) return;
  /* düşmanlardan en uzak noktada doğ */
  const foes = enemies();
  let best = 480, bestD = -1;
  for (const x of [110, 300, 480, 660, 850]){
    const d = foes.length ? Math.min(...foes.map(e => Math.abs(e.x - x) + (rowOf(e.y) === 1 ? 0 : 140))) : 999;
    if (d > bestD){ bestD = d; best = x; }
  }
  Object.assign(p, {dead:false, hp:p.st.maxHp, x:best, y:FLOOR, vx:0, vy:0, grounded:true, hurtUntil:S.t + 2, stunUntil:-9});
  burst(p.x, p.y - 24, C.frost, 22, 260); dust(p.x, p.y, 10, 0);
  text(p.x, p.y - 70, 'Yeniden doğdun', C.frost, 16);
}
function hurtPlayer(o){
  const p = S.p, t = S.t;
  if (p.dead) return 'invuln';
  if (t < p.ifrUntil) return 'dodged';
  if (t < p.hurtUntil) return 'invuln';
  const fromX = o.fromX == null ? p.x + p.face : o.fromX;
  if (p.blocking && o.blockable !== false && Math.sign(fromX - p.x) === p.face){
    if (t - p.blockStart < p.st.parryWin){
      text(p.x, p.y - 64, 'PARRY', C.ember, 20); burst(p.x + p.face * 18, p.y - 28, C.ember, 14, 240);
      hitstop(.05, true); addShake(4); if (o.who) stunTarget(o.who, 1.2);
      return 'parry';
    }
    text(p.x, p.y - 62, 'BLOK', C.frost, 15); burst(p.x + p.face * 18, p.y - 28, C.frost, 6, 160);
    p.vx = -p.face * 160; hitstop(.02);
    return 'blocked';
  }
  if (p.barrier > 0 && t < p.barrierUntil){
    p.barrier = 0; p.hurtUntil = t + .35;
    text(p.x, p.y - 62, 'BARİYER', C.frost, 15); burst(p.x, p.y - 24, C.frost, 16, 220);
    return 'barrier';
  }
  let dmg = o.dmg * (1 - (o.el ? (p.st.res[o.el] || 0) : 0)) * (1 - p.st.reduce);
  dmg = Math.max(1, Math.round(dmg));
  p.hp -= dmg; p.hurtUntil = t + .8; p.stunUntil = t + .18; p.blocking = false;
  p.vx = (o.dir || 1) * 300; p.vy = -360; p.grounded = false;
  hitstop(.06, true); addShake(9); S.flashT = t;
  if (touchMode && navigator.vibrate) try { navigator.vibrate(30); } catch (_) {}
  burst(p.x, p.y - 24, o.el ? elCol(o.el) : C.blood, 14, 260);
  text(p.x, p.y - 62, '-' + dmg, C.blood, 18);
  if (p.hp <= 0){ p.hp = 0; playerDown(); }
  return 'hit';
}

/* ---------- düşmana hasar ---------- */
function damageEnemy(t, base, el, o){
  o = o || {};
  if (t.dead || t.hp <= 0) return false;
  if (!t.isBoss && (t.state === 'spawn' || !targetable(t))) return false;
  const p = S.p, guest = S.net && !S.net.host && !o.remote;
  const fromX = o.fromX == null ? p.x : o.fromX;
  if (guest && !o.tick) S.net.hits.push({id:t.isBoss ? 'B' : t.id, b:Math.round(base * 100) / 100, el,
    o:{melee:o.melee ? 1 : 0, blockable:o.blockable === false ? false : true, backstab:o.backstab ? 1 : 0, poison:o.poison || 0, stun:o.stun || 0, slow:o.slow || 0,
       crit:o.crit ? 1 : 0, power:o.power ? 1 : 0, kbx:o.kbx || 0, spread:o.spread ? 1 : 0, fromX:Math.round(fromX), ax:Math.round(p.x), bs:p.st.backstab}});
  if (!t.isBoss && t.a === 'tank' && t.state !== 'open' && o.blockable !== false && !o.tick && Math.sign(fromX - t.x) === t.face){
    text(t.x + t.face * 20, t.y - t.h - 6, 'BLOK', C.frost, 14);
    burst(t.x + t.face * 20, t.y - 30, C.frost, 6, 160);
    if (o.melee && !o.remote){ hitstop(.02); p.vx = t.face * 240; }
    return false;
  }
  let dmg = base, tag = '';
  if (!t.isBoss && t.a === 'charger' && t.state === 'dazed'){ dmg *= 1.5; tag = 'weak'; }
  if (o.crit || o.power) tag = 'crit';
  if (el && t.weak && el === t.weak){ dmg *= 1.5; tag = 'weak'; }
  else if (el && t.el && el === t.el){ dmg *= .5; tag = 'res'; }
  if (o.backstab && Math.sign((o.ax ?? p.x) - t.x) !== t.face){ dmg *= o.bs ?? p.st.backstab; tag = 'back'; }
  const armored = !t.isBoss && t.aff.includes('zirhli') && t.hp > t.max * .6;
  if (armored) dmg *= .5;
  dmg = Math.max(1, Math.round(dmg));
  if (guest){
    /* misafir: hasarı tahmin edip gösterir, gerçek can lobi sahibinden gelir */
    t.hp = Math.max(1, t.hp - dmg); t.predUntil = performance.now() + 450; t.flash = .07;
    if (o.melee) hitstop(o.crit ? .03 : .02); addShake(o.melee ? 2 : 1);
    burst(t.x, t.y - t.h / 2, el ? elCol(el) : C.bone, 6, 180);
    text(t.x + rand(-10, 10), t.y - t.h - 12, String(dmg) + (tag === 'weak' ? '!' : ''), tag === 'res' ? C.dust : tag ? C.ember : C.bone, tag ? 17 : 15);
    if (o.crit) text(t.x, t.y - t.h - 30, 'KRİTİK', C.ember, 13);
    return true;
  }
  t.hp -= dmg; t.lastHitT = S.t;
  if (armored && t.hp <= t.max * .6 && t.hp > 0) text(t.x, t.y - t.h - 30, 'ZIRH KIRILDI', AFFIX.zirhli.col, 13);
  if (!o.tick){
    t.flash = .07;
    if (o.melee && !o.remote) hitstop(o.crit ? .03 : .02); addShake(o.remote ? 0 : o.melee ? 2 : 1);
    burst(t.x, t.y - t.h / 2, el ? elCol(el) : C.bone, 6, 180);
  }
  const col = tag === 'weak' || tag === 'back' || tag === 'crit' ? C.ember : tag === 'res' ? C.dust : (o.tick ? elCol('zehir') : C.bone);
  text(t.x + rand(-10, 10), t.y - t.h - 12, String(dmg) + (tag === 'weak' ? '!' : ''), col, o.tick ? 12 : tag ? 17 : 15);
  if (tag === 'back') text(t.x, t.y - t.h - 30, o.crit ? 'ARKADAN KRİTİK' : 'ARKADAN', C.ember, 13);
  else if (o.crit) text(t.x, t.y - t.h - 30, 'KRİTİK', C.ember, 13);
  else if (o.power) text(t.x, t.y - t.h - 30, 'GÜÇLÜ OK', C.ember, 13);
  if (o.stun){ if (t.isBoss) text(t.x, t.y - t.h - 30, 'BAĞIŞIK', C.dust, 13); else t.stunUntil = S.t + o.stun; }
  if (o.slow) t.slowUntil = S.t + o.slow;
  if (o.poison){
    t.poisonUntil = S.t + 3; t.poisonDps = o.poison;
    if (o.spread) for (const q of enemies()) if (q !== t && Math.abs(q.x - t.x) < 70 && Math.abs(q.y - t.y) < 60){ q.poisonUntil = S.t + 3; q.poisonDps = o.poison; }
  }
  if (!t.isBoss && !o.tick && !NO_STAGGER_A.has(t.a) && !NO_STAGGER_S.has(t.state)){
    t.kb = Math.sign(t.x - fromX || 1) * (o.melee ? 220 : 120);
    if (t.a === 'flyer') t.kb *= .6;
    mset(t, 'hurt', .22);
  }
  if (o.kbx && !t.isBoss) t.kb = o.kbx;
  if (!t.isBoss && t.hp > 0 && t.hp < t.max * .35 && !t.lowFired){
    t.lowFired = true;
    if (t.aff.includes('gorunmez')){ t.invisUntil = S.t + 2; text(t.x, t.y - t.h - 30, 'GÖRÜNMEZ', AFFIX.gorunmez.col, 13); }
    if (t.aff.includes('ofkeli')){ t.enraged = true; text(t.x, t.y - t.h - 30, 'ÖFKELENDİ', AFFIX.ofkeli.col, 13); }
  }
  if (t.hp <= 0) kill(t);
  else if (t.isBoss) bossPhaseCheck();
  return true;
}
function kill(t){
  t.hp = 0;
  if (t.isBoss){
    netEv('bkill', {});
    const g = Math.round(50 * TF(S.L.c) * (S.L.kind === 'boss' ? 2 : 1)); addGold(g);
    text(t.x, t.y - t.h - 30, `+${g} altın`, C.ember, 18);
    burst(t.x, t.y - 30, C.ember, 40, 380);
    for (const m of S.mobs){ m.dead = true; burst(m.x, m.y - m.h / 2, C.dust, 10, 200); }
    lootBoss(t);
    endRun(true);
    return;
  }
  t.dead = true; S.kills++; prof.kills = (prof.kills || 0) + 1;
  netEv('kill', {id:t.id});
  const g = Math.round(ARCH[t.a].gold * TF(S.L.c) * (t.aff.length ? 2 : 1)); addGold(g);
  text(t.x, t.y - t.h - 26, `+${g} altın`, C.ember, 15);
  burst(t.x, t.y - t.h / 2, t.pal.mob, 18, 260);
  if (t.aff.includes('patlayan') && !(S.net && !S.net.host)){ const b = {x:t.x, y:t.y, at:S.t + .8, r:90, dmg:t.dmg * 1.5, el:t.el}; S.bombs.push(b); netBomb(b); }
  rollMobLoot(t);
}
/* ---------- ganimet ---------- */
function addGold(g){ S.gold += g; prof.gold += g; markDirty(); }
function grant(id, x, y, src){
  const it = ITEM_BY_ID[id]; if (!it) return;
  prof.inv[id] = (prof.inv[id] || 0) + 1;
  S.loot.push(id); S.drops.push({id, x, y, t:S.t, src:src || ''});
  burst(x, y, it.rare ? '#f2c14e' : C.ember, it.rare ? 30 : 14, 220);
  markDirty();
}
function pickLoot(c, onlyWeapon){
  let pool = ITEMS.filter(i => i.tier === c && !i.rare && (!onlyWeapon || i.slot === 'silah'));
  const wc = S.p.st.wd.cls;
  if (wc && Math.random() < DROP.smart){ const p2 = pool.filter(i => i.cls === wc || (!i.cls && !onlyWeapon)); if (p2.length) pool = p2; }
  return pool[Math.floor(Math.random() * pool.length)].id;
}
function pickClassWeapon(c){
  const wc = S.p.st.wd.cls;
  let pool = ITEMS.filter(i => i.tier === c && !i.rare && i.slot === 'silah' && (!wc || i.cls === wc));
  if (!pool.length) pool = ITEMS.filter(i => i.tier === c && !i.rare && i.slot === 'silah');
  return pool[Math.floor(Math.random() * pool.length)].id;
}
function rollMobLoot(m){
  const c = S.L.c, elite = m.aff.length > 0, r = RARE_BY_C[c];
  if (r && (r.a == null || r.a === m.a) && Math.random() < (elite ? DROP.rareElite : DROP.rare)){ grant(r.id, m.x, m.y - m.h, 'Nadir'); return; }
  if (Math.random() < DROP.mob[m.a] * (elite ? DROP.eliteMul : 1)) grant(pickLoot(c), m.x, m.y - m.h);
}
function lootBoss(e){
  const c = S.L.c, id = S.L.boss;
  if (!prof.bossFirst[id]){ prof.bossFirst[id] = true; grant(pickClassWeapon(c), e.x, e.y - e.h, 'İlk zafer'); }
  else grant(pickLoot(c), e.x, e.y - e.h);
  if (Math.random() < (S.L.kind === 'boss' ? DROP.bossExtra : DROP.miniExtra)) grant(pickLoot(c), e.x + 30, e.y - e.h - 20);
}
function endRun(won){
  if (S.mode !== 'play') return;
  netEv('end', {won:won ? 1 : 0});
  S.mode = won ? 'won' : 'dead';
  const key = attKey();
  if (won){
    const first = !prof.cleared[key];
    if (S.L.kind === 'level'){
      if (key === '1-1' && first) grant(pickClassWeapon(1), S.p.x, S.p.y - 60, 'İlk silahın');
      else if (Math.random() < (first ? DROP.chestFirst : DROP.chestRepeat)) grant(pickLoot(S.L.c), S.p.x, S.p.y - 60, 'Bölüm sandığı');
    }
    addGold(Math.round(10 * TF(S.L.c) * SF(S.L.s)));
    prof.cleared[key] = (prof.cleared[key] || 0) + 1;
    if (lobby.role !== 'guest' && sel.c === prof.prog.c && sel.s === prof.prog.s){
      if (sel.s < 50){ prof.prog = {c:sel.c, s:sel.s + 1}; S.unlockedNext = true; }
      else if (sel.c < 10){ prof.prog = {c:sel.c + 1, s:1}; S.unlockedNext = true; }
    }
  }
  /* co-op: kazanınca sıradaki açık bölüme 5 sn sonra otomatik geçilir */
  if (won && S.net && S.net.host){
    const n = sel.s < 50 ? [sel.c, sel.s + 1] : [sel.c + 1, 1];
    if (n[0] <= 10 && unlocked(n[0], n[1])){ S.autoNext = {c:n[0], s:n[1], at:performance.now() + AUTO_NEXT * 1000}; netEv('next', {c:n[0], s:n[1], in:AUTO_NEXT}); }
  }
  markDirty(); flushSave();
  syncUI(); renderBag(); renderMarket();
}
const AUTO_NEXT = 5;
/* lobi sahibi: süre dolunca sıradaki bölümü herkes için başlat */
function autoNextTick(now){
  const a = S.autoNext;
  if (!a || S.mode !== 'won' || !S.net || !S.net.host || now < a.at) return;
  S.autoNext = null;
  if (!lobby.ch || !lobby.others.length) return;
  selectLevel(a.c, a.s); coopStart();
}
function bossPhaseCheck(){
  const e = S.e;
  if (e.phase === 1 && e.hp <= e.max / 2){
    e.phase = 2; addShake(10); burst(e.x, e.y - 30, C.ember, 22, 320);
    if (e.def.weak2){ e.weak = e.def.weak2; S.banner = {txt:`2. AŞAMA · zayıflık ${elAd(e.weak)}`, t:S.t}; }
    else S.banner = {txt:'2. AŞAMA', t:S.t};
  }
}

/* ---------- oyuncu ---------- */
function onDodgePress(){
  const en = S.e && S.e.cur;
  if (en && en.result == null) en.press = S.t - en.jump;
  const lh = S.lastHit;
  if (lh && lh.result === 'hit-none'){
    const late = S.t - (lh.jump + lh.res);
    if (late < .45){ lh.late = late; lh.result = 'hit-late'; renderLog(); }
  }
  S.lastHit = null;
}
function enemies(){ const a = S.mobs.filter(m => !m.dead && targetable(m)); if (S.e && S.e.hp > 0) a.push(S.e); return a; }
/* kritik: suikastçı hançeri ve gölge adımından sonraki ilk vuruş */
function rollCrit(){
  const p = S.p, g = S.t < (p.critUntil || -9);
  if (g){ p.critUntil = -9; return true; }
  return p.st.crit > 0 && Math.random() < p.st.crit;
}
/* range: okun gidebileceği en uzun mesafe. Bitince düşer, patlayan ok orada patlar. */
function firePlayerShot(kind, dmg, el, extra){
  const p = S.p, sx = p.x + p.face * 10, sy = p.y - 30;
  const ang = Math.atan2(mouse.y - sy, mouse.x - sx);
  const sh = SHOT[kind], speed = kind === 'orb' ? 760 : kind === 'shard' ? 900 : 1150;
  const range = (extra && extra.range) || 900;
  S.pshots.push(Object.assign({kind, x:sx, y:sy, vx:Math.cos(ang) * speed, vy:Math.sin(ang) * speed, ang,
    len:sh.len || 0, tip:(sh.len || 0) * (sh.tipF || 0), gap:sh.gap || 0, r:sh.r || 0, dmg, el, hitSet:new Set(), dead:false, life:range / speed}, extra));
  netVfx({k:'s', kind, x:Math.round(sx), y:Math.round(sy), a:Math.round(ang * 1000) / 1000, sp:speed, life:Math.round(range / speed * 1000) / 1000,
    aoe:extra && extra.aoe ? 1 : 0, pc:extra && extra.pierce ? 1 : 0, pw:extra && extra.power ? 1 : 0, el:el || 0});
}
/* co-op: kendi atışlarını, şimşeklerini ve iyileşmeni takım arkadaşlarına gönder (sadece görüntü) */
function netVfx(v){ if (S.net) (S.vfx || (S.vfx = [])).push(v); }
function applyVfx(v){
  if (v.k === 's'){
    const sh = SHOT[v.kind]; if (!sh) return;
    S.pshots.push({kind:v.kind, x:v.x, y:v.y, vx:Math.cos(v.a) * v.sp, vy:Math.sin(v.a) * v.sp, ang:v.a, len:sh.len || 0, tip:(sh.len || 0) * (sh.tipF || 0),
      gap:sh.gap || 0, r:sh.r || 0, dmg:0, el:v.el || null, hitSet:new Set(), dead:false, life:v.life, aoe:!!v.aoe, pierce:!!v.pc, power:!!v.pw, ghost:true});
  } else if (v.k === 'b') S.bolts.push({x:v.x, y:v.y, t:S.t});
  else if (v.k === 't'){ text(v.x, v.y - 64, v.txt, C.frost, 16); burst(v.x, v.y - 30, C.frost, 12, 160); }
}
function doAttack(){
  const p = S.p, st = p.st, w = st.wd, t = S.t;
  p.face = mouse.x >= p.x ? 1 : -1;
  p.atkT = t; p.atkId++;
  if (w.kind === 'bow'){
    const power = t < (p.powerUntil || -9); if (power) p.powerUntil = -9;
    const crit = rollCrit();
    firePlayerShot('arrow', st.dmg * (power ? 2 : 1) * (crit ? st.critMul : 1), st.wEl, {pierce:w.fx === 'pierce', aoe:w.fx === 'aoe', range:w.range, power, crit});
  } else if (w.kind === 'staff'){
    if (w.fx === 'stun'){ p.castT = t; p.castX = clamp(mouse.x, WALL, W - WALL); p.castY = clamp(mouse.y, 40, FLOOR); }
    else if (w.fx === 'slow') firePlayerShot('shard', st.dmg, st.wEl, {slow:2, range:w.range || 460});
    else if (w.fx === 'heal'){
      const amt = Math.round(st.maxHp * .25), before = p.hp; p.hp = Math.min(st.maxHp, p.hp + amt);
      text(p.x, p.y - 64, '+' + (p.hp - before), C.frost, 18); burst(p.x, p.y - 30, C.frost, 16, 160);
      netVfx({k:'t', txt:'+' + (p.hp - before), x:Math.round(p.x), y:Math.round(p.y)});
    } else if (w.fx === 'barrier'){
      p.barrier = 1; p.barrierUntil = t + 6; text(p.x, p.y - 64, 'BARİYER', C.frost, 15); burst(p.x, p.y - 30, C.frost, 12, 160);
      netVfx({k:'t', txt:'BARİYER', x:Math.round(p.x), y:Math.round(p.y)});
    }
  }
}
function updPlayer(dt){
  const p = S.p, t = S.t, st = p.st, w = st.wd;
  const stunned = t < p.stunUntil;
  const ix = stunned ? 0 : (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
  if (pressed.has('jump')) p.jumpBuf = t;
  if (pressed.has('down') && p.grounded && p.y < FLOOR){ p.dropUntil = t + .22; p.grounded = false; p.y += 1; }
  const dodging = t < p.dodgeUntil;
  /* savunma: dodge ya da ışınlanma */
  if (pressed.has('dodge') && !stunned){
    if (t - p.dodgeT >= st.dodgeCd){
      p.dodgeT = t; p.ifrUntil = t + st.ifr / 1000; p.blocking = false;
      if (st.def.blink){
        let dx = mouse.x - p.x, dy = mouse.y - (p.y - p.h / 2);
        const d = Math.hypot(dx, dy), mx = st.def.range;
        if (d > mx){ dx *= mx / d; dy *= mx / d; }
        burst(p.x, p.y - 24, C.frost, 14, 200);
        p.x = clamp(p.x + dx, WALL + p.w / 2, W - WALL - p.w / 2);
        p.y = clamp(p.y + dy, 80, FLOOR); p.vy = 0; p.vx = 0; p.grounded = p.y >= FLOOR;
        p.face = dx >= 0 ? 1 : -1;
        burst(p.x, p.y - 24, C.frost, 14, 200);
      } else {
        const aim = mouse.x >= p.x ? 1 : -1;
        p.dodgeDir = ix || (st.def.back ? -aim : p.face);
        p.dodgeUntil = t + st.dodgeDur; p.vy = 0;
        if (st.def.back){ p.face = aim; p.powerUntil = p.dodgeUntil + 1.5; }
        else p.face = p.dodgeDir;
        p.shadowE = null; p.bashSet = st.def.bash ? new Set() : null;
        dust(p.x, p.y, 6, -p.dodgeDir);
      }
      onDodgePress();
    } else { const en = S.e && S.e.cur; if (en && en.result == null) en.cdPress = true; }
  }
  /* kalkan */
  const canBlock = w.kind === 'shield' && !dodging && !stunned;
  if (canBlock && keys.has('alt')){
    if (!p.blocking){ p.blocking = true; p.blockStart = t; }
    p.face = mouse.x >= p.x ? 1 : -1;
  } else p.blocking = false;
  /* saldırı: okçu ve büyücü her tıkta bir kez atar (otomatik atış yok, nişan elle).
     Yakın dövüşte basılı tutunca vuruş tekrarlanır. Bekleme bitmeden 0,15 sn içinde tıklarsan tıklama saklanır. */
  if (pressed.has('attack')) p.atkBuf = t;
  const ready = t - p.atkT >= st.atkCd;
  const manual = w.kind === 'bow' || w.kind === 'staff';
  const want = (t - (p.atkBuf ?? -9) < .15) || (!manual && keys.has('attack'));
  if (want && ready && !dodging && !stunned && !p.blocking){ p.atkBuf = -9; doAttack(); }
  /* büyücü sağ tık: zayıf büyü küresi, her tıkta bir kez */
  if (w.kind === 'staff' && pressed.has('alt') && t - p.altT >= .5 * st.cdMul && !stunned){
    p.altT = t; p.face = mouse.x >= p.x ? 1 : -1;
    firePlayerShot('orb', 4 * TF(st.wTier) * st.dmgMul, st.wEl, {range:360});
  }
  /* şimşek gecikmesi */
  if (p.castT > 0 && t - p.castT >= .15){
    const cx = p.castX, cy = p.castY; p.castT = -9;
    S.bolts.push({x:cx, y:cy, t}); netVfx({k:'b', x:Math.round(cx), y:Math.round(cy)});
    addShake(3);
    for (const e of enemies()) if (circRect(cx, cy, 55, tRect(e))) damageEnemy(e, st.dmg, st.wEl, {blockable:false, stun:1.2});
  }
  /* hareket */
  if (p.grounded && p.plat && p.plat.dx) p.x += p.plat.dx;
  const spd = RUN * st.speedMul * (p.blocking ? .4 : 1);
  if (dodging){ p.vx = p.dodgeDir * DODGE_SPEED * (st.def.bash ? .85 : 1); p.vy = 0; }
  else {
    const mx = ACC * dt * (p.grounded ? (p.plat && p.plat.ice ? .2 : 1) : .75);
    p.vx += clamp(ix * spd - p.vx, -mx, mx);
    if (ix && t - p.atkT > .17 && !p.blocking) p.face = ix;
    p.vy += G * dt;
    if (p.vy < 0 && !keys.has('jump')) p.vy += G * 1.1 * dt;
    if (p.vy > 1400) p.vy = 1400;
  }
  if (p.grounded) p.coyote = t;
  if (!dodging && !stunned && t - p.jumpBuf < .12 && t - p.coyote < .09){
    p.vy = -JUMP; p.grounded = false; p.jumpBuf = -9; p.coyote = -9; dust(p.x, p.y, 5, 0);
  }
  const prevY = p.y;
  p.x += p.vx * dt; p.y += p.vy * dt;
  p.x = clamp(p.x, WALL + p.w/2, W - WALL - p.w/2);
  if (p.y < 60){ p.y = 60; p.vy = Math.max(0, p.vy); }
  const wasG = p.grounded; p.grounded = false; p.plat = null;
  if (p.y >= FLOOR){ p.y = FLOOR; p.vy = 0; p.grounded = true; }
  else if (p.vy >= 0 && t >= p.dropUntil){
    for (const pl of S.plats){
      if (!solidPlat(pl)) continue;
      if (prevY <= pl.y + .01 && p.y >= pl.y && p.x + p.w/2 > pl.x + 2 && p.x - p.w/2 < pl.x + pl.w - 2){
        p.y = pl.y; p.vy = 0; p.grounded = true; p.plat = pl; break;
      }
    }
  }
  if (p.grounded && !wasG) dust(p.x, p.y, 4, 0);
  /* set yetenekleri: kalkan hücumu yoldakileri savurur, gölge adımı içinden geçtiğin düşmanın arkasına koyar */
  if (dodging && st.def.bash){
    for (const e of enemies()){
      if (p.bashSet.has(e) || !ov(pRect(), tRect(e))) continue;
      p.bashSet.add(e);
      damageEnemy(e, st.dmg * .6, st.wEl, {melee:true, blockable:false, fromX:p.x - p.dodgeDir * 20, stun:e.isBoss ? 0 : 1, kbx:p.dodgeDir * 380});
      addShake(3);
    }
  }
  if (dodging && st.def.shadow && !p.shadowE){ for (const e of enemies()) if (ov(pRect(), tRect(e))){ p.shadowE = e; break; } }
  if (!dodging && p.wasDodging && p.shadowE){
    const e = p.shadowE; p.shadowE = null;
    if (!e.dead && e.hp > 0){
      const col = '#b9a4e8';
      burst(p.x, p.y - 24, col, 10, 180);
      p.x = clamp(e.x + p.dodgeDir * (e.w / 2 + p.w / 2 + 8), WALL + p.w / 2, W - WALL - p.w / 2);
      p.face = -p.dodgeDir; p.critUntil = t + 2; p.vx = 0;
      burst(p.x, p.y - 24, col, 12, 200); text(p.x, p.y - 64, 'GÖLGE ADIMI', col, 14);
    }
  }
  p.wasDodging = dodging;
  /* yakın dövüş vuruşu */
  const m = MELEE[w.kind];
  if (m){
    const ae = t - p.atkT;
    if (ae >= m.a && ae <= m.b){
      const box = meleeBox(p);
      for (const e of enemies()){
        if (e.hitBy === p.atkId || !ov(box, tRect(e))) continue;
        e.hitBy = p.atkId;
        const crit = rollCrit();
        damageEnemy(e, st.dmg * (crit ? st.critMul : 1), st.wEl, {melee:true, blockable:w.kind !== 'hammer', backstab:w.kind === 'dagger',
          poison:w.fx === 'poison' ? st.dmg * .6 : 0, spread:w.fx === 'poison', crit});
      }
    }
  }
}

/* ---------- hedef seçimi: tek başına sen, co-op'ta en yakın oyuncu ---------- */
let remotePlayers = () => [];
function playersList(){
  const a = S.p.dead ? [] : [S.p];
  for (const r of remotePlayers()) if (!r.dead) a.push(r);
  return a.length ? a : [S.p];
}
function nearestPlayer(x, y){
  let best = S.p, bd = 1e9;
  for (const q of playersList()){ const d = Math.abs(q.x - x) + Math.abs(q.y - y) * .7; if (d < bd){ bd = d; best = q; } }
  return best;
}
function mobTarget(m){
  if (!m.tg || m.tg.dead || S.t >= (m.tgT || 0) || (m.tg.remote && !remotePlayers().includes(m.tg))){ m.tg = nearestPlayer(m.x, m.y); m.tgT = S.t + 1.5; }
  return m.tg;
}
function bossTarget(e){
  if (!e.tg || e.tg.dead || S.t >= (e.tgT || 0) || (e.tg.remote && !remotePlayers().includes(e.tg))){
    const ps = playersList();
    e.tg = ps.length > 1 && Math.random() < .35 ? ps[Math.floor(Math.random() * ps.length)] : nearestPlayer(e.x, e.y);
    e.tgT = S.t + rand(3.5, 6);
  }
  return e.tg;
}

/* ---------- boss yapay zekâsı ---------- */
function setState(s, dur){ const e = S.e; e.state = s; e.st = e.ck; e.dur = dur; e.sn = (e.sn || 0) + 1; }
const idleTime = () => S.e.phase === 2 ? rand(.4, .65) : rand(.6, .95);
const bossProjSpeed = kind => set.speed * (SHOT[kind] ? SHOT[kind].speed : 1);
function aimAt(hx, hy, speed, lead){
  const p = (S.e && S.e.tg) || S.p, py = p.y - p.h / 2;
  let tx = p.x;
  for (let i = 0; i < 2; i++){
    const tt = Math.hypot(tx - hx, py - hy) / speed;
    tx = clamp(p.x + p.vx * tt * lead, WALL + 10, W - WALL - 10);
  }
  return [tx, py];
}
const leapTarget = () => { const e = S.e, p = e.tg || S.p; return clamp(p.x - Math.sign(p.x - e.x || 1) * 50, 60, W - 60); };
const handPos = e => [e.x - e.face * 6, e.y - e.h + 4];
function decide(){
  const e = S.e, p = e.tg || S.p, d = Math.abs(p.x - e.x), high = p.y < FLOOR - 60, P2 = e.phase === 2, A = e.def.atk;
  const has = a => A.includes(a);
  const opts = [];
  if (has('leap') && e.farT > 1.2) opts.push('leap', 'leap', 'leap');
  if (has('row') && e.last !== 'row') opts.push(...(high ? ['row', 'row'] : ['row']));
  if (has('lunge') && d < 230 && !high) opts.push('lunge', 'lunge');
  if (has('slam') && d < 190 && rowOf(p.y) === 1) opts.push('slam', 'slam');
  if (has('throw') && d <= 680) opts.push('throw', 'throw');
  if (has('volley') && d >= 140) opts.push('volley');
  if (has('charge') && !high && d > 200) opts.push('charge');
  if (has('summon') && S.mobs.length < 3 && e.last !== 'summon') opts.push('summon');
  if (has('leap') && d > 420) opts.push('leap');
  if (has('rain') && e.last !== 'rain') opts.push('rain');
  if (has('combo') && d < 300 && !high) opts.push('combo', 'combo');
  if (has('ring') && e.last !== 'ring') opts.push('ring');
  if (!opts.length) opts.push(...A.filter(a => a !== 'summon' || S.mobs.length < 3));
  let c = opts[Math.floor(Math.random() * opts.length)];
  if (c === e.last && e.rep >= 1){ const alt = opts.filter(o => o !== c); if (alt.length) c = alt[Math.floor(Math.random() * alt.length)]; }
  e.rep = c === e.last ? e.rep + 1 : 0; e.last = c;
  switch (c){
    case 'row': {
      const pr = rowOf(p.y);
      let o = [[1, 3], [2]]; if (P2) o.push([1, 2], [2, 3]);
      o = o.filter(x => x.includes(pr));
      e.rows = o[Math.floor(Math.random() * o.length)]; e.rowHit = false; e.rowDodged = false;
      setState('rowWind', P2 ? .6 : .75); break;
    }
    case 'throw': setState('throwPrep', P2 ? .12 : .16); break;
    case 'lunge': e.comboLeft = 0; setState('lungeWind', P2 ? .4 : .5); break;
    case 'combo': e.comboLeft = P2 ? 3 : 2; setState('lungeWind', P2 ? .4 : .5); break;
    case 'rain': setState('rainWind', P2 ? .5 : .6); break;
    case 'ring': e.ringN = P2 ? 12 : 9; e.ringA = Math.random() * Math.PI * 2; setState('ringWind', P2 ? .6 : .75); break;
    case 'leap': e.farT = 0; e.leapX = leapTarget(); setState('leapCrouch', P2 ? .36 : .42); break;
    case 'volley': e.volleyN = P2 ? 5 : 3; setState('volleyWind', P2 ? .45 : .55); break;
    case 'charge': e.chargeDir = Math.sign(p.x - e.x) || 1; e.face = e.chargeDir; setState('chargeWind', P2 ? .5 : .65); break;
    case 'slam': setState('slamWind', P2 ? .5 : .6); break;
    case 'summon': setState('summonWind', .7); break;
  }
}
function bossShot(kind, x, y, ang, speed, dmg, en){
  const sh = SHOT[kind];
  netShot(kind, x, y, ang, speed, dmg, S.e.el);
  S.shots.push({kind, len:sh.len || 0, tip:(sh.len || 0) * (sh.tipF || 0), gap:sh.gap || 0, r:sh.r || 0,
    x, y, vx:Math.cos(ang) * speed, vy:Math.sin(ang) * speed, ang, stuck:false, life:0, res:null, dead:false,
    en:en || null, dmg, el:S.e.el, who:null});
}
function updBoss(dt){
  const e = S.e, p = S.p, t = S.t, tg = bossTarget(e);
  const fct = t < e.slowUntil ? .7 : 1;
  const dtE = dt * fct;
  e.ck += dtE;
  const el = e.ck - e.st;
  const dx = tg.x - e.x, d = Math.abs(dx);
  const P2 = e.phase === 2;
  if (['idle', 'recover', 'leapCrouch', 'throwPrep', 'volleyWind', 'slamWind', 'summonWind', 'rainWind', 'ringWind'].includes(e.state) || (e.state === 'lungeWind' && el < .12)) e.face = dx >= 0 ? 1 : -1;
  e.farT = d > 560 ? e.farT + dtE : Math.max(0, e.farT - dtE * 2);
  let grav = true;
  const D = k => BDMG[k] * e.dmgF;
  switch (e.state){
    case 'idle': {
      const pref = 360; let mv = 0;
      if (d > pref + 70) mv = e.face; else if (d < pref - 140) mv = -e.face;
      e.vx = mv * (P2 ? 150 : 115);
      if (el >= e.dur) decide();
      break;
    }
    case 'throwPrep':
      e.vx = 0;
      if (el >= e.dur){
        e.vy = -760; e.vx = d < 220 ? -e.face * 160 : -e.face * 30; e.grounded = false; e.hangDone = false;
        e.cur = logNew(); dust(e.x, e.y, 8, 0);
        setState('jump', 0);
      }
      break;
    case 'jump':
      if (el >= set.tell / 1000){
        if (P2 && !e.hangDone && Math.random() < .4){
          e.hangDone = true; if (e.cur) e.cur.hang = true; renderLog();
          e.vy = 0; e.vx = 0; setState('hang', rand(.16, .32));
        } else { bossThrow(); setState('fall', 0); }
      }
      break;
    case 'hang':
      grav = false; e.vy = 0;
      if (el >= e.dur){ bossThrow(); setState('fall', 0); }
      break;
    case 'fall':
      if (e.grounded){ e.vx = 0; dust(e.x, e.y, 6, 0); setState('recover', P2 ? .35 : .5); }
      break;
    case 'recover':
      e.vx = 0;
      if (el >= e.dur){ e.held = true; setState('idle', idleTime()); }
      break;
    case 'lungeWind':
      e.vx = 0;
      if (el >= e.dur){ e.hitDone = false; setState('lunge', .28); }
      break;
    case 'lunge':
      e.vx = e.face * 560;
      if (!e.hitDone && ov(lungeBox(e), pRect())){
        const r = hurtPlayer({dmg:D('lunge'), el:e.el, dir:e.face, fromX:e.x, who:e}); e.hitDone = true;
        if (r === 'dodged') dodgedFx(t - p.dodgeT < .1);
      }
      if (el >= e.dur && e.state === 'lunge'){
        e.vx = 0;
        /* seri saplama: kısa aralarla tekrar saplar, her seferinde hedefe döner */
        if (e.comboLeft > 0){ e.comboLeft--; e.face = Math.sign(tg.x - e.x) || e.face; setState('lungeWind', P2 ? .24 : .3); }
        else setState('recover', .65);
      }
      break;
    case 'rowWind':
      e.vx = 0;
      if (el >= e.dur){
        addShake(5);
        for (const r of e.rows) for (let i = 0; i < 6; i++) dust(rand(WALL + 20, W - WALL - 20), ROW_Y[r], 2, 0);
        setState('rowStrike', .5);
      }
      break;
    case 'rowStrike':
      e.vx = 0;
      if (!e.rowHit && el < .25 && e.rows.includes(rowOf(p.y))){
        const r = hurtPlayer({dmg:D('row'), el:e.el, dir:Math.sign(p.x - e.x) || 1, blockable:false});
        if (r === 'dodged') e.rowDodged = true; else e.rowHit = true;
      }
      if (el >= e.dur){
        if (e.rowDodged && !e.rowHit) dodgedFx(false);
        e.held = true; setState('recover', .6);
      }
      break;
    case 'leapCrouch':
      e.vx = 0;
      if (el < e.dur - .12) e.leapX = leapTarget();
      if (el >= e.dur){
        e.vx = (e.leapX - e.x) / (2 * 900 / G); e.vy = -900; e.grounded = false;
        setState('leapAir', 0);
      }
      break;
    case 'leapAir':
      if (e.grounded && el > .1){
        e.vx = 0; addShake(7); dust(e.x, e.y, 14, 0);
        const q = D('quake');
        S.quakes.push({x:e.x - 22, dir:-1, done:false, dmg:q, el:e.el}, {x:e.x + 22, dir:1, done:false, dmg:q, el:e.el});
        netEv('quake', {x:Math.round(e.x), dmg:q, el:e.el});
        setState('recover', .55);
      }
      break;
    case 'volleyWind':
      e.vx = 0;
      if (el >= e.dur){
        const [hx, hy] = handPos(e), sp = bossProjSpeed(e.def.proj === 'spear' ? 'arrow' : e.def.proj) * .9;
        const base = Math.atan2((tg.y - tg.h / 2) - hy, tg.x - hx);
        const offs = e.volleyN === 5 ? [-.3, -.15, 0, .15, .3] : [-.2, 0, .2];
        for (const o of offs) bossShot(e.def.proj === 'spear' ? 'arrow' : e.def.proj, hx, hy, base + o, sp, D('volley'));
        setState('recover', .55);
      }
      break;
    case 'chargeWind':
      e.vx = 0; e.face = e.chargeDir;
      if (el >= e.dur){ e.hitDone = false; setState('charge', 3); }
      break;
    case 'charge': {
      e.vx = e.chargeDir * 720;
      if (!e.hitDone && ov(tRect(e), pRect())){
        const r = hurtPlayer({dmg:D('charge'), el:e.el, dir:e.chargeDir, fromX:e.x - e.chargeDir * 10, who:e}); e.hitDone = true;
        if (r === 'dodged') dodgedFx(t - p.dodgeT < .1);
      }
      const lim = e.chargeDir > 0 ? W - WALL - e.w / 2 - 1 : WALL + e.w / 2 + 1;
      if (e.state === 'charge' && ((e.chargeDir > 0 && e.x >= lim) || (e.chargeDir < 0 && e.x <= lim) || el > 2.5)){
        e.vx = 0; addShake(8); dust(e.x + e.chargeDir * e.w / 2, e.y - 20, 12, -e.chargeDir);
        text(e.x, e.y - e.h - 14, 'SERSEM', C.dust, 14);
        setState('recover', .9);
      }
      break;
    }
    case 'slamWind':
      e.vx = 0;
      if (el >= e.dur){
        addShake(9); dust(e.x, e.y, 18, 0); burst(e.x, e.y - 6, rgba(C.ember, 1), 0, 0);
        const rad = 160 + e.w / 2;
        netEv('slam', {x:Math.round(e.x), r:rad, dmg:D('slam'), el:e.el});
        if (Math.abs(p.x - e.x) < rad && rowOf(p.y) === 1){
          const r = hurtPlayer({dmg:D('slam'), el:e.el, dir:Math.sign(p.x - e.x) || 1, fromX:e.x, who:e});
          if (r === 'dodged') dodgedFx(t - p.dodgeT < .1);
        }
        S.booms.push({x:e.x, y:FLOOR, r:rad, t, col:e.pal.light, flat:true});
        setState('recover', .6);
      }
      break;
    case 'rainWind':
      /* gökten yağmur: hedefin çevresine iniş yerleri işaretlenir, sırayla düşer */
      e.vx = 0;
      if (el >= e.dur){
        const n = P2 ? 7 : 5, gap = P2 ? 70 : 85, x0 = tg.x - gap * (n - 1) / 2 + rand(-20, 20);
        for (let i = 0; i < n; i++){
          const x = clamp(x0 + i * gap, WALL + 20, W - WALL - 20), y = surfaceBelow(x, tg.y - 1), lead = .85 + i * .09;
          const b = {x, y:y + 20, at:t + lead, lead, r:44, dmg:D('rain'), el:e.el, col:e.el ? elCol(e.el) : e.pal.light, rain:true};
          S.bombs.push(b); netBomb(b);
        }
        setState('rainCast', .9);
      }
      break;
    case 'rainCast': e.vx = 0; if (el >= e.dur) setState('recover', .4); break;
    case 'ringWind':
      /* halka atış: her yöne eşit aralıklı küreler, aradaki boşluğa gir ya da zıpla */
      e.vx = 0;
      if (el >= e.dur){
        const cx = e.x, cy = e.y - e.h * .55, sp = bossProjSpeed('orb') * .72;
        for (let i = 0; i < e.ringN; i++) bossShot('orb', cx, cy, e.ringA + i * Math.PI * 2 / e.ringN, sp, D('ring'));
        addShake(4); burst(cx, cy, e.pal.light, 16, 260);
        setState('recover', .6);
      }
      break;
    case 'summonWind':
      e.vx = 0;
      if (el >= e.dur){
        if (S.mobs.length < 4){
          spawnMob({a:'runner', x:e.x < 480 ? 900 : 60, origin:S.L.c === 10 ? 1 + Math.floor(Math.random() * 9) : S.L.c, aff:[]});
          const pi = Math.floor(Math.random() * S.plats.length);
          spawnMob({a:'ranged', x:0, home:pi, origin:S.L.c === 10 ? 1 + Math.floor(Math.random() * 9) : S.L.c, aff:[]});
        }
        setState('recover', .5);
      }
      break;
  }
  if (grav) e.vy += G * dtE;
  e.x += e.vx * dtE; e.y += e.vy * dtE;
  e.x = clamp(e.x, WALL + e.w/2, W - WALL - e.w/2);
  if (e.y >= FLOOR){ e.y = FLOOR; e.vy = 0; e.grounded = true; } else e.grounded = false;
  if (e.flash > 0) e.flash -= dt;
  tickPoison(e, dt);
}
function bossThrow(){
  const e = S.e, [hx, hy] = handPos(e), kind = e.def.proj, sp = bossProjSpeed(kind);
  const [tx, ty] = aimAt(hx, hy, sp, .85);
  bossShot(kind, hx, hy, Math.atan2(ty - hy, tx - hx), sp, BDMG.throw * e.dmgF, e.cur);
  e.held = false;
}

/* ---------- moblar ---------- */
function mset(m, s, dur){ m.state = s; m.st = m.ck; m.dur = dur; m.sn = (m.sn || 0) + 1; }
let mobSeq = 0;
/* co-op olayları: lobi sahibi diğerlerine gönderir (tek başına oynarken bir şey yapmaz) */
function netEv(k, d){ if (S.net && S.net.host) S.net.evq.push([k, d, Math.round(S.t * 1000) / 1000]); }
function netShot(kind, x, y, ang, speed, dmg, el){
  if (S.net && S.net.host) netEv('shot', {k:kind, x:Math.round(x), y:Math.round(y), a:Math.round(ang * 1000) / 1000, s:Math.round(speed), d:dmg, el});
}
function netBomb(b){ if (S.net && S.net.host) netEv('bomb', {x:Math.round(b.x), y:Math.round(b.y), in:Math.round((b.at - S.t) * 1000) / 1000, lead:b.lead, r:b.r, dmg:b.dmg, el:b.el, col:b.col, rain:b.rain ? 1 : 0}); }
function spawnMob(d){
  const L = S.L, A = ARCH[d.a], och = CHAPTERS[(d.origin || L.c) - 1];
  let home;
  if (d.home == null) home = {y:FLOOR, l:WALL + 16, r:W - WALL - 16};
  else { const pl = S.plats[d.home % S.plats.length]; home = {y:pl.y, l:pl.x + 14, r:pl.x + pl.w - 14}; }
  let x = d.x;
  if (d.home != null && (!x || x < home.l || x > home.r)) x = home.l + (home.r - home.l) * (.25 + Math.random() * .5);
  x = clamp(x, home.l, home.r);
  if (Math.abs(x - S.p.x) < 120 && home.y === FLOOR) x = clamp(S.p.x + (x < S.p.x ? -160 : 160), home.l, home.r);
  const f = TF(L.c) * SF(L.s);
  const hp = Math.round(A.hp * f * (d.aff.length ? 1.4 : 1));
  const m = {a:d.a, x, y:home.y, home, w:A.w, h:A.h, hp, max:hp, face:x > S.p.x ? -1 : 1,
    state:'spawn', st:0, ck:0, dur:rand(.55, .85), flash:0, kb:0, hitBy:-1, cd:rand(.6, 1.4), turnT:0,
    aimX:S.p.x, aimY:S.p.y - 23, dead:false, hitDone:false, isBoss:false,
    dmg:A.dmg * f, el:och.el === 'mix' ? null : och.el, weak:och.weak === 'mix' ? null : och.weak,
    pal:och.pal, name:och.mobs ? och.mobs[d.a] : d.a, proj:och.proj, aff:d.aff || [],
    tempo:Math.min(1.45, 1.05 + .03 * (L.c - 1) + .18 * (L.s / 50)), spd:1 + .02 * (L.c - 1) + .08 * (L.s / 50),
    stunUntil:-9, slowUntil:-9, poisonUntil:-9, poisonDps:0, poisonTick:0, lastHitT:-9, invisUntil:-9, enraged:false, lowFired:false,
    body:(och.bodies && och.bodies[d.a]) || 'skel', seed:Math.random() * 6.28, v:d.v || 0, combo:0, id:d.id || ++mobSeq, origin:d.origin || L.c};
  const so = SIZE_OVR[d.a + ':' + m.body]; if (so){ m.w = so[0]; m.h = so[1]; }
  if (d.a === 'flyer'){ m.hoverY = rand(190, 330); m.y = m.hoverY; }
  if (d.a === 'burrower'){ m.state = 'under'; m.cd = rand(.6, 1.2); }
  S.mobs.push(m);
  dust(x, home.y, 8, 0);
  netEv('sp', {id:m.id, a:m.a, x:Math.round(m.x), home:d.home, o:d.origin || L.c, aff:m.aff, v:m.v});
  return m;
}
function spawnWave(i){
  for (const d of S.L.waves[i].mobs) spawnMob(d);
  S.wave = i; S.waveT = 0;
  if (!S.e || i > 0) S.banner = {txt:`Dalga ${i + 1} / ${S.L.waves.length}`, t:S.t, sub:FORMS[S.L.waves[i].form]};
  netEv('wave', {i});
}
function mobShoot(m, off){
  const bx = m.x + m.face * 12, by = m.y - (m.a === 'flyer' ? m.h / 2 : 30), kind = m.proj, sh = SHOT[kind], sp = MOB_SHOT_SPEED[kind];
  const ang = Math.atan2(m.aimY - by, m.aimX - bx) + (off || 0);
  netShot(kind, bx, by, ang, sp, m.dmg, m.el);
  S.shots.push({kind, len:sh.len || 0, tip:(sh.len || 0) * (sh.tipF || 0), gap:sh.gap || 0, r:sh.r || 0,
    x:bx, y:by, vx:Math.cos(ang) * sp, vy:Math.sin(ang) * sp, ang, stuck:false, life:0, res:null, dead:false,
    en:null, dmg:m.dmg, el:m.el, who:m});
}
function mobAttackHit(m, box){
  if (m.hitDone || !ov(box, pRect())) return;
  m.hitDone = true;
  const r = hurtPlayer({dmg:m.dmg, el:m.el, dir:m.face, fromX:m.x, who:m});
  if (r === 'dodged') dodgedFx(S.t - S.p.dodgeT < .1);
  else if (r === 'hit' && m.a === 'tank') S.p.vx = m.face * 420;
}
function updMob(m, dt){
  const p = mobTarget(m), t = S.t;
  if (t < m.stunUntil) return 0;
  const f = m.tempo * (t < m.slowUntil ? .5 : 1) * (m.enraged ? 1.35 : 1);
  m.ck += dt * f;
  const el = m.ck - m.st, dx = p.x - m.x, d = Math.abs(dx), side = dx >= 0 ? 1 : -1;
  const same = rowOf(p.y) === rowOf(m.y);
  const mv = m.spd * (t < m.slowUntil ? .5 : 1) * (m.enraged ? 1.3 : 1);
  if (m.state === 'spawn'){ if (el >= m.dur) mset(m, BASE_STATE[m.a], 0); return 0; }
  if (m.state === 'hurt'){ if (el >= m.dur) mset(m, BASE_STATE[m.a], 0); return 0; }
  if (m.a === 'tank'){
    switch (m.state){
      case 'walk':
        if (side !== m.face){ m.turnT += dt * f; if (m.turnT > .7){ m.face = side; m.turnT = 0; } } else m.turnT = 0;
        if (same && d < 78 && side === m.face){ mset(m, 'bashWind', .5); return 0; }
        m.cd -= dt * f;
        if (m.v && m.cd <= 0 && m.home.y === FLOOR && rowOf(p.y) === 1 && d > 200 && d < 560){
          m.jx = clamp(p.x - side * 40, m.home.l, m.home.r); m.jy = FLOOR; m.face = side; mset(m, 'tcrouch', .6); return 0;
        }
        return side === m.face && d > 56 ? m.face * 70 * mv : 0;
      case 'bashWind': if (el >= m.dur){ m.hitDone = false; mset(m, 'bash', .16); } return 0;
      case 'bash': mobAttackHit(m, bashBox(m)); if (el >= m.dur) mset(m, 'open', .75); return m.face * 140;
      case 'open': if (el >= m.dur){ m.turnT = 0; mset(m, 'walk', 0); } return 0;
      case 'tcrouch':
        if (el < m.dur - .15) m.jx = clamp(p.x - side * 40, m.home.l, m.home.r);
        if (el >= m.dur){ m.jx0 = m.x; m.jy0 = m.y; m.hitDone = false; mset(m, 'tleap', .55); }
        return 0;
      case 'tleap': {
        const k = clamp(el / m.dur, 0, 1);
        m.x = m.jx0 + (m.jx - m.jx0) * k; m.y = FLOOR - Math.sin(k * Math.PI) * 120;
        if (k >= 1){
          m.y = FLOOR; addShake(5); dust(m.x, m.y, 12, 0);
          const q = m.dmg * .7;
          S.quakes.push({x:m.x - 20, dir:-1, done:false, dmg:q, el:m.el}, {x:m.x + 20, dir:1, done:false, dmg:q, el:m.el});
          netEv('quake', {x:m.x, dmg:q, el:m.el});
          m.cd = rand(3, 4.5); mset(m, 'open', .9);
        }
        return 0;
      }
    }
  } else if (m.a === 'ranged'){
    switch (m.state){
      case 'idle':
        m.face = side; m.cd -= dt * f;
        if (m.cd <= 0){ mset(m, 'aim', .65); return 0; }
        return same && d < 200 ? -side * 95 * mv : 0;
      case 'aim':
        m.face = side;
        if (el < m.dur - .18){ m.aimX = clamp(p.x + p.vx * .15, WALL, W - WALL); m.aimY = p.y - p.h / 2; }
        if (el >= m.dur){
          if (m.v){ for (const o of [-.17, 0, .17]) mobShoot(m, o); } else mobShoot(m);
          m.cd = rand(1.7, 2.6) * (m.v ? 1.25 : 1); mset(m, 'idle', 0);
        }
        return 0;
    }
  } else if (m.a === 'runner'){
    switch (m.state){
      case 'chase':
        m.face = side; m.cd -= dt * f;
        if (same && d < 150 && m.cd <= 0){ mset(m, 'wind', .34); return 0; }
        if (!same) return (d > 40 ? side * 120 : 0) * mv;
        return (d > 110 ? side : d < 60 ? -side : 0) * 210 * mv;
      case 'wind': if (el >= m.dur){ m.hitDone = false; mset(m, 'dash', .22); } return 0;
      case 'dash':
        mobAttackHit(m, dashBox(m));
        if (el >= m.dur){
          if (m.v && !m.combo){ m.combo = 1; m.face = side; mset(m, 'wind', .26); }
          else { m.combo = 0; m.cd = rand(.6, 1.1); mset(m, 'rec', .5); }
        }
        return m.face * 520;
      case 'rec': if (el >= m.dur) mset(m, 'chase', 0); return 0;
    }
  } else if (m.a === 'flyer'){
    /* süzülür, durup nişan alır, çizgi boyunca dalar, yükselir */
    switch (m.state){
      case 'hover': {
        m.face = side; m.cd -= dt * f;
        const ty = m.hoverY + Math.sin(m.ck * 2.2 + m.seed) * 26;
        m.y += clamp(ty - m.y, -140 * dt, 140 * dt);
        if (m.cd <= 0 && d < 560){
          m.aimX = p.x; m.aimY = p.y - 20;
          if (m.v && (m.alt = !m.alt)){ mset(m, 'faim', .7); return 0; }
          mset(m, 'mark', .6); return 0;
        }
        const tx = p.x - side * 120;
        return clamp((tx - m.x) / 60, -1, 1) * 150 * mv;
      }
      case 'mark':
        if (el < m.dur - .16){ m.aimX = clamp(p.x + p.vx * .1, WALL + 10, W - WALL - 10); m.aimY = clamp(p.y - 18, 70, FLOOR - 8); }
        if (el >= m.dur){
          const a = Math.atan2(m.aimY - (m.y - m.h / 2), m.aimX - m.x);
          m.dvx = Math.cos(a) * 640; m.dvy = Math.sin(a) * 640; m.hitDone = false; mset(m, 'dive', .85);
        }
        return 0;
      case 'dive':
        m.y = clamp(m.y + m.dvy * dt * mv, 60, FLOOR);
        mobAttackHit(m, tRect(m));
        if (m.y >= FLOOR || el >= m.dur || (m.dvy > 0 && m.y - m.h / 2 >= m.aimY + 40)){ m.cd = rand(1.8, 2.8); mset(m, 'rise', .9); }
        return m.dvx * mv;
      case 'faim':
        m.face = side;
        if (el < m.dur - .18){ m.aimX = clamp(p.x + p.vx * .12, WALL, W - WALL); m.aimY = p.y - p.h / 2; }
        if (el >= m.dur){ mobShoot(m); m.cd = rand(1.4, 2.2); mset(m, 'hover', 0); }
        return 0;
      case 'rise':
        /* dalıştan sonra kısa süre yerde kalır: yakın dövüşçünün vurma anı */
        if (el < .4) return 0;
        m.y += clamp(m.hoverY - m.y, -170 * dt, 170 * dt);
        if (el >= m.dur + .4) mset(m, 'hover', 0);
        return -m.face * 50;
    }
  } else if (m.a === 'burrower'){
    /* toprağın altında izler (vurulamaz), çatlak gösterir, fırlar, dışarıda kalır, geri kazar */
    const onFloor = rowOf(p.y) === 1;
    switch (m.state){
      case 'under':
        m.cd -= dt * f;
        if (onFloor && d < 26 && m.cd <= 0){ mset(m, 'rumble', .65); return 0; }
        if (!onFloor && m.cd < -3){ mset(m, 'surface', .3); return 0; }
        return (d > 8 ? side : 0) * 170 * mv;
      case 'rumble':
        if (Math.random() < .5) dust(m.x + rand(-20, 20), FLOOR, 1, 0);
        if (el >= m.dur){ m.hitDone = false; addShake(3); dust(m.x, FLOOR, 12, 0); mset(m, 'erupt', .25); }
        return 0;
      case 'erupt': mobAttackHit(m, {l:m.x - 22, r:m.x + 22, t:FLOOR - 96, b:FLOOR}); if (el >= m.dur) mset(m, 'exposed', m.v && !m.combo ? .55 : 1.3); return 0;
      case 'surface': if (el >= m.dur) mset(m, 'exposed', 1.1); return 0;
      case 'exposed': m.face = side; if (el >= m.dur){ dust(m.x, FLOOR, 8, 0); mset(m, 'dig', .35); } return 0;
      case 'dig': if (el >= m.dur){ if (m.v) m.combo = !m.combo; m.cd = m.v && m.combo ? .15 : rand(.8, 1.6); mset(m, 'under', 0); } return 0;
    }
  } else if (m.a === 'exploder'){
    switch (m.state){
      case 'seek':
        m.face = side;
        if (same && d < 64){ mset(m, 'fuse', m.v ? .65 : .8); return 0; }
        return (d > 20 ? side : 0) * (same ? 155 : 110) * mv * (m.v ? 1.45 : 1);
      case 'fuse':
        if (el >= m.dur){
          const cx = m.x, cy = m.y - m.h / 2;
          S.booms.push({x:cx, y:cy, r:85, t:S.t, col:AFFIX.patlayan.col}); addShake(6);
          boomHit(cx, cy, 85, m.dmg, m.el);
          netEv('boom', {x:Math.round(cx), y:Math.round(cy), r:85, dmg:m.dmg, el:m.el});
          burst(cx, cy, AFFIX.patlayan.col, 24, 300);
          m.dead = true; m.selfDestruct = true;
        }
        return 0;
    }
  } else if (m.a === 'healer'){
    switch (m.state){
      case 'idle':
        m.face = side; m.cd -= dt * f;
        if (m.cd <= 0 && S.mobs.some(o => o !== m && !o.dead && o.hp < o.max && Math.hypot(o.x - m.x, o.y - m.y) < 170)){ mset(m, 'chant', .8); return 0; }
        return same && d < 220 ? -side * 90 * mv : 0;
      case 'chant':
        if (el >= m.dur){
          for (const o of S.mobs){
            if (o === m || o.dead || o.hp >= o.max || Math.hypot(o.x - m.x, o.y - m.y) >= 170) continue;
            const amt = Math.round(o.max * .3); o.hp = Math.min(o.max, o.hp + amt);
            text(o.x, o.y - o.h - 12, '+' + amt, '#7de08a', 14); burst(o.x, o.y - o.h / 2, '#7de08a', 6, 120);
          }
          m.cd = rand(3, 4.2); mset(m, 'idle', 0);
        }
        return 0;
    }
  } else if (m.a === 'jumper'){
    switch (m.state){
      case 'hop':
        m.face = side; m.cd -= dt * f;
        if (m.cd <= 0 && d < 520){ jumperTarget(m); mset(m, 'crouch', .45); return 0; }
        return (d > 70 ? side : 0) * 60 * mv;
      case 'crouch':
        if (el < m.dur - .12) jumperTarget(m);
        if (el >= m.dur){ m.jx0 = m.x; m.jy0 = m.y; m.hitDone = false; mset(m, 'leap', .62); }
        return 0;
      case 'leap': {
        const k = clamp(el / m.dur, 0, 1);
        m.x = m.jx0 + (m.jx - m.jx0) * k;
        m.y = m.jy0 + (m.jy - m.jy0) * k - Math.sin(k * Math.PI) * (90 + Math.abs(m.jy0 - m.jy) * .5);
        if (k > .65) mobAttackHit(m, tRect(m));
        if (k >= 1){
          m.y = m.jy; m.home = homeAt(m.x, m.y); dust(m.x, m.y, 8, 0);
          if (m.v && !m.combo){ m.combo = 1; jumperTarget(m); mset(m, 'crouch', .32); }
          else { m.combo = 0; m.cd = rand(.9, 1.6); mset(m, 'land', .5); }
        }
        return 0;
      }
      case 'land': if (el >= m.dur) mset(m, 'hop', 0); return 0;
    }
  } else if (m.a === 'charger'){
    switch (m.state){
      case 'roam':
        m.face = side; m.cd -= dt * f;
        if (same && d > 140 && m.cd <= 0){ m.cdir = side; mset(m, 'paw', .7); return 0; }
        return (d > 220 ? side : d < 120 ? -side : 0) * 80 * mv;
      case 'paw': m.face = m.cdir; if (Math.random() < .3) dust(m.x - m.cdir * 14, m.y, 1, -m.cdir); if (el >= m.dur){ m.hitDone = false; mset(m, 'charge', 1.6); } return 0;
      case 'charge': {
        mobAttackHit(m, tRect(m));
        const lim = m.cdir > 0 ? m.home.r : m.home.l;
        if ((m.cdir > 0 && m.x >= lim - 1) || (m.cdir < 0 && m.x <= lim + 1) || el >= m.dur){
          addShake(5); dust(m.x + m.cdir * m.w / 2, m.y - 20, 12, -m.cdir);
          if (m.v && !m.combo){ m.combo = 1; m.cdir = -m.cdir; m.face = m.cdir; mset(m, 'paw', .4); return 0; }
          m.combo = 0; text(m.x, m.y - m.h - 10, 'SERSEM', C.dust, 13);
          m.cd = rand(1.2, 2); mset(m, 'dazed', 1.1);
          return 0;
        }
        return m.cdir * 600 * mv;
      }
      case 'dazed': if (el >= m.dur) mset(m, 'roam', 0); return 0;
    }
  } else if (m.a === 'lobber'){
    /* uzakta durur, kolunu kaldırır, iniş yeri işaretlenir, bomba kavis çizerek düşer, kısa süre sonra patlar */
    switch (m.state){
      case 'idle':
        m.face = side; m.cd -= dt * f;
        if (m.cd <= 0 && d < 640){ lobTarget(m); mset(m, 'windup', .55); return 0; }
        return same && d < 260 ? -side * 85 * mv : 0;
      case 'windup':
        if (el < m.dur - .15) lobTarget(m);
        if (el >= m.dur){
          for (const o of m.v ? [-75, 0, 75] : [0]){
            const x1 = clamp(m.lx + o, WALL + 20, W - WALL - 20), y1 = o ? surfaceBelow(x1, m.ly - 1, true) : m.ly;
            const g = {x0:m.x + m.face * 8, y0:m.y - m.h + 4, x1, y1, t0:S.t, dur:.85, dmg:m.dmg, el:m.el, col:m.el ? elCol(m.el) : m.pal.light};
            S.grenades.push(g); netEv('gren', g);
          }
          m.cd = rand(2.4, 3.4); mset(m, 'idle', 0);
        }
        return 0;
    }
  }
  return 0;
}
const BASE_STATE = {tank:'walk', runner:'chase', ranged:'idle', flyer:'hover', burrower:'under', exploder:'seek', healer:'idle', jumper:'hop', charger:'roam', lobber:'idle'};
const UNTARGETABLE = new Set(['under', 'rumble', 'dig']);
const NO_STAGGER_A = new Set(['tank', 'burrower', 'charger', 'exploder']);
const NO_STAGGER_S = new Set(['dash', 'spawn', 'dive', 'leap', 'charge', 'erupt', 'fuse', 'tcrouch', 'tleap']);
const targetable = m => !(m.a === 'burrower' && UNTARGETABLE.has(m.state));
function homeAt(x, y){
  for (const pl of S.plats) if (Math.abs(pl.y - y) < 2 && x > pl.x && x < pl.x + pl.w) return {y:pl.y, l:pl.x + 14, r:pl.x + pl.w - 14};
  return {y:FLOOR, l:WALL + 16, r:W - WALL - 16};
}
function jumperTarget(m){
  const p = m.tg || S.p, tx = clamp(p.x - Math.sign(p.x - m.x || 1) * 18, WALL + 20, W - WALL - 20);
  m.jx = tx; m.jy = surfaceBelow(tx, p.y - 1, true);
}
function lobTarget(m){
  const p = m.tg || S.p;
  m.lx = clamp(p.x + p.vx * .5, WALL + 20, W - WALL - 20);
  m.ly = surfaceBelow(m.lx, p.y - 1, true);
}
/* patlama: yerel oyuncu alanın içindeyse hasar alır */
function boomHit(cx, cy, r, dmg, el){
  const lp = S.p;
  if (Math.hypot(lp.x - cx, (lp.y - lp.h / 2) - cy) >= r) return;
  const res = hurtPlayer({dmg, el, dir:Math.sign(lp.x - cx) || 1, fromX:cx, blockable:false});
  if (res === 'dodged') dodgedFx(S.t - lp.dodgeT < .1);
}
/* ---------- platform türleri ----------
   kırılan: üstünde 0,9 sn durunca çöker, 3 sn sonra geri gelir. hareketli: yana kayar, üstündekini taşır. buz: kayarsın. */
const solidPlat = pl => !(pl.kind === 'kirilan' && S.t < (pl.downUntil || -9));
function updPlats(dt){
  const p = S.p;
  for (const pl of S.plats){
    if (pl.kind === 'hareketli'){
      const nx = pl.x0 + pl.amp * Math.sin(S.t * Math.PI * 2 / pl.per + pl.ph);
      pl.dx = nx - pl.x; pl.x = nx;
    } else if (pl.kind === 'kirilan'){
      const on = p.grounded && p.plat === pl && solidPlat(pl);
      if (on) pl.load = (pl.load || 0) + dt; else if (pl.load) pl.load = Math.max(0, pl.load - dt * .6);
      if (pl.load >= .9){
        pl.load = 0; pl.downUntil = S.t + 3; addShake(2);
        for (let x = pl.x + 10; x < pl.x + pl.w; x += 24) S.fx.push({x, y:pl.y, vx:rand(-40, 40), vy:rand(-40, 60), life:rand(.4, .7), age:0, col:S.ch.pal.wallHi, sz:rand(3, 6), g:900});
        if (p.plat === pl){ p.grounded = false; p.plat = null; }
      }
    }
  }
}
function updGrenades(){
  for (const g of S.grenades){
    if (S.t - g.t0 >= g.dur && !g.landed){
      g.landed = true; dust(g.x1, g.y1, 5, 0);
      S.bombs.push({x:g.x1, y:g.y1 + 20, at:S.t + .5, lead:.5, r:62, dmg:g.dmg, el:g.el, col:g.col});
    }
  }
  S.grenades = S.grenades.filter(g => !g.landed);
}
function tickPoison(e, dt){
  if (S.t < e.poisonUntil){
    e.poisonTick += dt;
    if (e.poisonTick >= .5){ e.poisonTick = 0; damageEnemy(e, e.poisonDps * .5, null, {tick:true, blockable:false}); }
  }
}
function updMobs(dt){
  for (const m of S.mobs){
    if (m.dead) continue;
    const vx = updMob(m, dt);
    m.kb *= Math.pow(.002, dt);
    if (m.state === 'leap' || m.state === 'tleap') m.x = clamp(m.x, WALL + 16, W - WALL - 16);
    else m.x = clamp(m.x + (vx + m.kb) * dt, m.home.l, m.home.r);
    if (m.flash > 0) m.flash -= dt;
    tickPoison(m, dt);
    if (m.aff.includes('yenilenen') && !m.dead && S.t - m.lastHitT > 2 && m.hp < m.max) m.hp = Math.min(m.max, m.hp + m.max * .04 * dt);
  }
  S.mobs = S.mobs.filter(m => !m.dead);
}
/* sıradaki dalga, ekranda en fazla 1 düşman kalınca gelir (10. alt bölümden sonra). Boss varsa bölüm boss ölünce biter. */
function updLevel(dt){
  if (!S.L.waves) return;
  const left = S.mobs.length, early = S.L.s >= 10 && !S.e ? 1 : 0;
  if (left > early) return;
  if (S.wave >= S.L.waves.length - 1){ if (!left && !S.e) endRun(true); return; }
  S.waveT += dt;
  if (S.waveT >= (S.e ? 3 : 1.2)) spawnWave(S.wave + 1);
}

/* ---------- mermiler, dalgalar, tuzaklar ---------- */
function shotTouches(s, r){
  if (s.kind === 'orb') return circRect(s.x, s.y, s.r, r);
  const c = Math.cos(s.ang), sn = Math.sin(s.ang), tx = s.x + c * s.tip, ty = s.y + sn * s.tip;
  for (let k = 0; k < 3; k++) if (inRect(tx - c * k * s.gap, ty - sn * k * s.gap, r)) return true;
  return false;
}
function shotTip(s){ if (s.kind === 'orb') return [s.x, s.y + s.r]; return [s.x + Math.cos(s.ang) * s.tip, s.y + Math.sin(s.ang) * s.tip]; }
function updShots(dt){
  const p = S.p;
  for (const s of S.shots){
    if (s.stuck){ s.life -= dt; continue; }
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.res == null && shotTouches(s, pRect())){
      const r = hurtPlayer({dmg:s.dmg, el:s.el, dir:Math.sign(s.vx) || 1, fromX:p.x - Math.sign(s.vx) * 10});
      if (r === 'hit'){ s.dead = true; s.res = 'hit'; resolveEntry(s.en, 'hit'); }
      else if (r === 'dodged'){ const perf = S.t - p.dodgeT < .1; s.res = 'dodged'; dodgedFx(perf); resolveEntry(s.en, perf ? 'perfect' : 'dodged'); }
      else if (r === 'parry' || r === 'blocked' || r === 'barrier'){ s.dead = true; s.res = r; resolveEntry(s.en, r); }
      else { s.res = 'invuln'; resolveEntry(s.en, 'invuln'); }
    }
    const [tipX, tipY] = shotTip(s);
    if (tipY >= FLOOR || tipX <= WALL || tipX >= W - WALL){
      if (s.kind === 'orb'){ s.dead = true; burst(s.x, Math.min(FLOOR - 4, s.y), elCol(s.el), 6, 120); }
      else {
        const sn = Math.sin(s.ang), c = Math.cos(s.ang);
        if (tipY >= FLOOR && sn > .05){ const back = (tipY - FLOOR) / sn; s.x -= c * back; s.y -= sn * back; }
        s.stuck = true; s.life = 1.2; dust(tipX, Math.min(FLOOR, tipY), 3, 0);
      }
      if (s.res == null){ s.res = 'miss'; resolveEntry(s.en, 'miss'); }
    } else if (tipY < -80) s.dead = true;
  }
  S.shots = S.shots.filter(s => !s.dead && !(s.stuck && s.life <= 0));
}
function explode(x, y, s){
  S.booms.push({x, y, r:60, t:S.t, col:elCol(s.el) || C.ember});
  if (s.ghost) return;
  addShake(3);
  for (const e of enemies()) if (circRect(x, y, 60, tRect(e))) damageEnemy(e, s.dmg, s.el, {blockable:false, fromX:x});
}
function updPShots(dt){
  for (const s of S.pshots){
    s.life -= dt;
    if (s.life <= 0){
      const [tx, ty] = shotTip(s);
      if (s.aoe) explode(tx, Math.min(ty, FLOOR - 4), s); else dust(tx, Math.min(FLOOR, ty), 2, 0);
      s.dead = true; continue;
    }
    s.x += s.vx * dt; s.y += s.vy * dt;
    for (const e of enemies()){
      if (s.dead) break;
      if (s.hitSet.has(e) || !shotTouches(s, tRect(e))) continue;
      const [tx, ty] = shotTip(s);
      if (s.aoe){ explode(tx, ty, s); s.dead = true; break; }
      s.hitSet.add(e);
      if (s.ghost){ burst(tx, ty, s.el ? elCol(s.el) : C.bone, 4, 140); if (!s.pierce) s.dead = true; continue; }
      const hit = damageEnemy(e, s.dmg, s.el, {fromX:s.x - Math.sign(s.vx) * 20, slow:s.slow || 0, crit:s.crit, power:s.power});
      /* delici ok her delişte %35 hasar kaybeder; kalkana çarparsa durur */
      if (!s.pierce || !hit) s.dead = true; else { s.dmg *= .65; s.crit = false; s.power = false; }
    }
    if (s.dead) continue;
    const [tx, ty] = shotTip(s);
    if (ty >= FLOOR || tx <= WALL || tx >= W - WALL || ty < 20){
      if (s.aoe) explode(tx, Math.min(ty, FLOOR - 4), s);
      s.dead = true; dust(tx, Math.min(FLOOR, ty), 3, 0);
    }
  }
  S.pshots = S.pshots.filter(s => !s.dead);
}
function updQuakes(dt){
  for (const w of S.quakes){
    w.x += w.dir * 480 * dt;
    if (Math.random() < .35) S.fx.push({x:w.x - w.dir * 10, y:FLOOR - 4, vx:-w.dir * rand(20, 60), vy:rand(-90, -30), life:.3, age:0, col:C.dust, sz:2.5, g:400});
    if (!w.done && ov(quakeRect(w), pRect())){
      const r = hurtPlayer({dmg:w.dmg, el:w.el, dir:w.dir, fromX:S.p.x - w.dir * 10});
      w.done = true;
      if (r === 'dodged') dodgedFx(S.t - S.p.dodgeT < .1);
    }
  }
  S.quakes = S.quakes.filter(w => w.x > WALL - 10 && w.x < W - WALL + 10);
}
function updBombs(){
  for (const b of S.bombs){
    if (S.t >= b.at && !b.done){
      b.done = true; addShake(6);
      S.booms.push({x:b.x, y:b.y - 20, r:b.r, t:S.t, col:AFFIX.patlayan.col});
      const p = S.p;
      if (Math.hypot(p.x - b.x, (p.y - 23) - (b.y - 20)) < b.r){
        const r = hurtPlayer({dmg:b.dmg, el:b.el, dir:Math.sign(p.x - b.x) || 1, blockable:false});
        if (r === 'dodged') dodgedFx(false);
      }
    }
  }
  S.bombs = S.bombs.filter(b => !b.done);
}
function trapPhase(tr, t){
  const k = (t + tr.off) % tr.period, warnAt = tr.period - 1.15, actAt = tr.period - .6;
  if (k >= actAt) return {st:'up', k:(k - actAt) / .6};
  if (k >= warnAt) return {st:'warn', k:(k - warnAt) / .55};
  return {st:'down', k:0};
}
function updTraps(){
  const p = S.p, dmg = 14 * TF(S.L.c) * SF(S.L.s);
  S.traps.forEach((tr, i) => {
    const ph = trapPhase(tr, S.t);
    if (ph.st !== 'up'){ S.trapHit[i] = false; return; }
    if (S.trapHit[i] || ph.k < .08) return;
    if (p.x + p.w/2 > tr.x && p.x - p.w/2 < tr.x + tr.w && p.y <= tr.y + 1 && p.y >= tr.y - 18){
      const r = hurtPlayer({dmg, el:null, dir:p.x < tr.x + tr.w / 2 ? -1 : 1, blockable:false});
      if (r === 'hit'){ S.trapHit[i] = true; p.vy = -520; }
    }
  });
}
function updFx(dt){
  for (const f of S.fx){ f.age += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += f.g * dt; }
  S.fx = S.fx.filter(f => f.age < f.life);
  for (const tx of S.texts){ tx.age += dt; tx.y -= 42 * dt; }
  S.texts = S.texts.filter(tx => tx.age < tx.life);
  S.booms = S.booms.filter(b => S.t - b.t < .35);
  S.bolts = S.bolts.filter(b => S.t - b.t < .25);
}
function step(dt){
  if (S.hitstop > 0){ S.hitstop -= dt; return false; }
  S.t += dt;
  updPlats(dt);
  if (S.p.dead) updDowned(); else updPlayer(dt);
  if (S.mode === 'play'){
    if (S.net && !S.net.host) guestWorld(dt);
    else {
      if (S.e && S.e.hp > 0) updBoss(dt);
      if (S.mode === 'play') updMobs(dt);
      if (S.mode === 'play') updLevel(dt);
    }
  }
  if (S.mode === 'play'){ updShots(dt); updPShots(dt); updQuakes(dt); updBombs(); updGrenades(); updTraps(); }
  updFx(dt);
  return true;
}

/* ===================== ÇİZİM ===================== */
function rr(x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawGear(cx, cy, r, teeth, rot, col){
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++){
    const a = rot + i * Math.PI / teeth, rad = i % 2 ? r : r * 1.18;
    const a2 = a + Math.PI / teeth;
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); ctx.lineTo(cx + Math.cos(a2) * rad, cy + Math.sin(a2) * rad);
  }
  ctx.closePath(); ctx.fill();
}
/* her bölümün kendi arka planı */
function drawBackdrop(now){
  const P = S.ch.pal, m = S.ch.motif;
  const g = ctx.createLinearGradient(0, 0, 0, FLOOR);
  g.addColorStop(0, P.top); g.addColorStop(1, P.bot);
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
  const T = now / 1000;
  if (m === 'arches'){
    ctx.fillStyle = rgba(P.wall, .55); ctx.fillRect(0, 118, W, FLOOR - 118);
    const span = (W - 2 * WALL) / 6;
    for (let i = 0; i < 6; i++){
      const cx = WALL + span * (i + .5), r = 50, top = 236;
      const ag = ctx.createLinearGradient(0, top - r, 0, FLOOR);
      ag.addColorStop(0, P.top); ag.addColorStop(1, rgba(P.top, .55));
      ctx.fillStyle = ag;
      ctx.beginPath(); ctx.moveTo(cx - r, FLOOR); ctx.lineTo(cx - r, top); ctx.arc(cx, top, r, Math.PI, 0); ctx.lineTo(cx + r, FLOOR); ctx.closePath(); ctx.fill();
      if (i > 0){
        const tx = WALL + span * i, ty = 206, fl = .75 + .25 * Math.sin(now / 90 + i * 1.7) * Math.sin(now / 37 + i);
        const rg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 90 * fl);
        rg.addColorStop(0, rgba(P.light, .22 * fl)); rg.addColorStop(1, rgba(P.light, 0));
        ctx.fillStyle = rg; ctx.fillRect(tx - 100, ty - 100, 200, 200);
        ctx.fillStyle = P.wallHi; ctx.fillRect(tx - 5, ty + 6, 10, 5);
        ctx.fillStyle = rgba(P.light, .9); ctx.beginPath(); ctx.moveTo(tx - 4, ty + 6); ctx.quadraticCurveTo(tx, ty - 10 * fl, tx + 4, ty + 6); ctx.fill();
      }
    }
  } else if (m === 'ice'){
    ctx.fillStyle = rgba(P.wallHi, .35);
    ctx.beginPath(); ctx.moveTo(0, FLOOR);
    for (let x = 0; x <= W; x += 80) ctx.lineTo(x + 40, 200 + ((x * 37) % 90)), ctx.lineTo(x + 80, FLOOR - 60);
    ctx.lineTo(W, FLOOR); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(P.mobHi, .18);
    for (let x = 30; x < W; x += 70){ const h = 40 + (x * 13) % 60; ctx.beginPath(); ctx.moveTo(x - 14, 0); ctx.lineTo(x, h); ctx.lineTo(x + 14, 0); ctx.fill(); }
    ctx.fillStyle = rgba(P.mobHi, .6);
    for (let i = 0; i < 50; i++){ const x = (i * 137 + T * 20 * (1 + i % 3)) % W, y = (i * 71 + T * 30 * (1 + i % 2)) % FLOOR; ctx.fillRect(x, y, 2, 2); }
  } else if (m === 'swamp'){
    for (let i = 0; i < 7; i++){
      const x = 60 + i * 140 + (i % 2) * 30;
      ctx.fillStyle = rgba(P.top, .85); ctx.fillRect(x - 10, 120, 20, FLOOR - 120);
      ctx.beginPath(); ctx.ellipse(x, 130, 70, 40, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(P.wallHi, .4); ctx.lineWidth = 2;
      for (let v = -1; v <= 1; v++){ ctx.beginPath(); ctx.moveTo(x + v * 30, 150); ctx.quadraticCurveTo(x + v * 34, 200, x + v * 28, 240 + v * 20); ctx.stroke(); }
    }
    const fg = ctx.createLinearGradient(0, FLOOR - 120, 0, FLOOR);
    fg.addColorStop(0, rgba(P.light, 0)); fg.addColorStop(1, rgba(P.light, .12));
    ctx.fillStyle = fg; ctx.fillRect(0, FLOOR - 120, W, 120);
    for (let i = 0; i < 14; i++){ const x = (i * 211 + Math.sin(T + i) * 30) % W, y = 200 + (i * 53) % 220; ctx.fillStyle = rgba(P.light, .4 + .4 * Math.sin(T * 3 + i)); ctx.fillRect(x, y, 3, 3); }
  } else if (m === 'gears'){
    ctx.fillStyle = rgba(P.wall, .5); ctx.fillRect(0, 140, W, 24); ctx.fillRect(0, 330, W, 16);
    drawGear(160, 200, 70, 12, T * .3, rgba(P.wallHi, .4));
    drawGear(290, 300, 44, 9, -T * .48, rgba(P.wallHi, .35));
    drawGear(720, 180, 90, 14, -T * .22, rgba(P.wallHi, .35));
    drawGear(860, 330, 50, 10, T * .4, rgba(P.wallHi, .4));
    ctx.fillStyle = rgba(P.top, .9);
    for (const [x, y, r] of [[160, 200, 22], [290, 300, 14], [720, 180, 28], [860, 330, 16]]){ ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    for (let i = 0; i < 6; i++){ const x = 100 + i * 160, y = 140 - ((T * 40 + i * 30) % 120); ctx.fillStyle = rgba(P.mobHi, .08); ctx.beginPath(); ctx.arc(x, y, 18 + ((T * 40 + i * 30) % 120) / 6, 0, Math.PI * 2); ctx.fill(); }
  } else if (m === 'sea'){
    for (let i = 0; i < 5; i++){
      const x = 80 + i * 200;
      ctx.fillStyle = rgba(P.light, .05); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 60, 0); ctx.lineTo(x + 180, FLOOR); ctx.lineTo(x + 90, FLOOR); ctx.fill();
    }
    ctx.strokeStyle = rgba(P.wallHi, .5); ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++){
      const x = 40 + i * 80; ctx.beginPath(); ctx.moveTo(x, FLOOR);
      for (let y = FLOOR; y > FLOOR - 140 - (i % 3) * 40; y -= 12) ctx.lineTo(x + Math.sin(T * 1.5 + y / 30 + i) * 10, y);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(P.mobHi, .35); ctx.lineWidth = 1.5;
    for (let i = 0; i < 26; i++){ const x = (i * 97) % W + Math.sin(T + i) * 6, y = FLOOR - ((T * 50 + i * 40) % FLOOR); ctx.beginPath(); ctx.arc(x, y, 2 + i % 3, 0, Math.PI * 2); ctx.stroke(); }
  } else if (m === 'hell'){
    ctx.fillStyle = rgba(P.top, .9);
    ctx.beginPath(); ctx.moveTo(0, FLOOR);
    for (let x = 0; x <= W; x += 60) ctx.lineTo(x + 30, 180 + ((x * 53) % 140)), ctx.lineTo(x + 60, 300 + ((x * 29) % 80));
    ctx.lineTo(W, FLOOR); ctx.closePath(); ctx.fill();
    const lg = ctx.createLinearGradient(0, FLOOR - 160, 0, FLOOR);
    lg.addColorStop(0, rgba(P.light, 0)); lg.addColorStop(1, rgba(P.light, .28 + .06 * Math.sin(T * 2)));
    ctx.fillStyle = lg; ctx.fillRect(0, FLOOR - 160, W, 160);
    for (let i = 0; i < 30; i++){ const x = (i * 131 + Math.sin(T * 2 + i) * 20) % W, y = FLOOR - ((T * 60 + i * 37) % (FLOOR - 60)); ctx.fillStyle = rgba(P.eye, .7); ctx.fillRect(x, y, 2, 3); }
  } else if (m === 'heaven'){
    for (let i = 0; i < 5; i++){ const x = 100 + i * 190; ctx.fillStyle = rgba(P.mobHi, .12); ctx.fillRect(x - 18, 150, 36, FLOOR - 150); ctx.fillRect(x - 26, 140, 52, 14); }
    for (let i = 0; i < 9; i++){
      const x = ((i * 157 + T * 12) % (W + 200)) - 100, y = 90 + (i * 61) % 240;
      ctx.fillStyle = rgba(P.mobHi, .16); ctx.beginPath(); ctx.ellipse(x, y, 80, 22, 0, 0, Math.PI * 2); ctx.ellipse(x + 40, y - 12, 50, 20, 0, 0, Math.PI * 2); ctx.fill();
    }
    const rg = ctx.createRadialGradient(W / 2, -40, 10, W / 2, -40, 420);
    rg.addColorStop(0, rgba(P.light, .35)); rg.addColorStop(1, rgba(P.light, 0));
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, FLOOR);
  } else if (m === 'ruins'){
    ctx.fillStyle = rgba(P.mobHi, .5); ctx.beginPath(); ctx.arc(800, 110, 34, 0, Math.PI * 2); ctx.fill();
    const bs = [[40, 220, 120], [170, 160, 90], [270, 250, 110], [400, 190, 130], [540, 140, 100], [650, 230, 120], [780, 180, 140]];
    for (const [x, top, w] of bs){
      ctx.fillStyle = rgba(P.top, .92);
      ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.lineTo(x, top + 20); ctx.lineTo(x + w * .3, top); ctx.lineTo(x + w * .55, top + 26); ctx.lineTo(x + w, top + 10); ctx.lineTo(x + w, FLOOR); ctx.fill();
      for (let wy = top + 40; wy < FLOOR - 30; wy += 34) for (let wx = x + 12; wx < x + w - 16; wx += 26){
        const lit = ((wx * 7 + wy * 3) % 11) === 0;
        ctx.fillStyle = lit ? rgba(P.light, .5) : rgba(P.wall, .5); ctx.fillRect(wx, wy, 10, 14);
      }
    }
  } else if (m === 'desert'){
    ctx.fillStyle = rgba(P.light, .55); ctx.beginPath(); ctx.arc(760, 120, 46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(P.wallHi, .45);
    for (const [x, w, h] of [[120, 300, 220], [430, 220, 160], [620, 360, 260]]){ ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.lineTo(x + w / 2, FLOOR - h); ctx.lineTo(x + w, FLOOR); ctx.fill(); }
    ctx.fillStyle = rgba(P.wall, .7);
    for (let i = 0; i < 4; i++){ const x = 80 + i * 260; ctx.fillRect(x, 200, 30, FLOOR - 200); ctx.fillStyle = rgba(P.eye, .25); for (let y = 220; y < FLOOR - 20; y += 30) ctx.fillRect(x + 8, y, 14, 6); ctx.fillStyle = rgba(P.wall, .7); }
  } else if (m === 'time'){
    for (let i = 0; i < 60; i++){ ctx.fillStyle = rgba(P.mobHi, .3 + .3 * Math.sin(T * 2 + i)); ctx.fillRect((i * 151) % W, (i * 89) % FLOOR, 2, 2); }
    for (const [x, y, r, sp] of [[200, 200, 90, .5], [700, 170, 120, -.3], [480, 360, 60, 1.2]]){
      ctx.strokeStyle = rgba(P.wallHi, .6); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 12; k++){ const a = k * Math.PI / 6; ctx.fillStyle = rgba(P.wallHi, .7); ctx.fillRect(x + Math.cos(a) * (r - 10) - 2, y + Math.sin(a) * (r - 10) - 2, 4, 4); }
      ctx.strokeStyle = rgba(P.light, .7); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(T * sp) * r * .8, y + Math.sin(T * sp) * r * .8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(T * sp / 12) * r * .5, y + Math.sin(T * sp / 12) * r * .5); ctx.stroke();
    }
  }
}
function drawArena(){
  const P = S.ch.pal;
  const wg = ctx.createLinearGradient(0, FLOOR - 40, 0, FLOOR - 6);
  wg.addColorStop(0, rgba(P.top, 0)); wg.addColorStop(1, rgba(P.top, .5));
  ctx.fillStyle = wg; ctx.fillRect(0, FLOOR - 40, W, 34);
  ctx.fillStyle = P.wallHi; ctx.fillRect(0, FLOOR - 7, W, 10);
  ctx.fillStyle = rgba('#ffffff', .06); ctx.fillRect(0, FLOOR - 7, W, 2);
  ctx.fillStyle = P.wall; ctx.fillRect(0, FLOOR + 3, W, H - FLOOR);
  ctx.fillStyle = rgba(P.top, .5);
  for (let x = WALL + 40; x < W - WALL; x += 64){ ctx.fillRect(x, FLOOR + 3, 2, H - FLOOR); ctx.fillRect(x + 3, FLOOR - 7, 1, 10); }
  ctx.fillStyle = P.wall; ctx.fillRect(0, 0, WALL, FLOOR + 3); ctx.fillRect(W - WALL, 0, WALL, FLOOR + 3);
  ctx.fillStyle = P.wallHi; ctx.fillRect(WALL - 2, 0, 2, FLOOR - 7); ctx.fillRect(W - WALL, 0, 2, FLOOR - 7);
  ctx.fillStyle = rgba(P.top, .4); ctx.fillRect(WALL, 0, 10, FLOOR - 7); ctx.fillRect(W - WALL - 10, 0, 10, FLOOR - 7);
  for (const pl of S.plats){
    if (!solidPlat(pl)){
      /* çökmüş platform: silik çerçeve, geri gelmeden önce yanıp söner */
      const left = pl.downUntil - S.t;
      ctx.strokeStyle = rgba(P.wallHi, left < .6 && Math.floor(S.t * 12) % 2 ? .6 : .22); ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
      ctx.strokeRect(pl.x, pl.y - 5, pl.w, 21); ctx.setLineDash([]);
      continue;
    }
    const jx = pl.kind === 'kirilan' && pl.load > .3 ? Math.sin(S.t * 70) * 2 * pl.load : 0, x0 = pl.x + jx;
    const sg = ctx.createLinearGradient(0, pl.y + 14, 0, pl.y + 50);
    sg.addColorStop(0, rgba(P.top, .6)); sg.addColorStop(1, rgba(P.top, 0));
    ctx.fillStyle = sg; ctx.fillRect(x0 + 12, pl.y + 14, pl.w, 36);
    ctx.fillStyle = P.wallHi; ctx.fillRect(x0, pl.y - 5, pl.w, 7);
    ctx.fillStyle = rgba('#ffffff', .07); ctx.fillRect(x0, pl.y - 5, pl.w, 2);
    ctx.fillStyle = P.wall; ctx.fillRect(x0, pl.y + 2, pl.w, 14);
    ctx.fillStyle = rgba(P.top, .45); ctx.fillRect(x0, pl.y + 12, pl.w, 4);
    for (let x = x0 + 38; x < x0 + pl.w - 10; x += 44) ctx.fillRect(x, pl.y + 2, 2, 14);
    if (pl.ice){ ctx.fillStyle = rgba('#d8f4ff', .55); ctx.fillRect(x0, pl.y - 5, pl.w, 2); for (let x = x0 + 14; x < x0 + pl.w - 6; x += 30) ctx.fillRect(x, pl.y - 3, 10, 1); }
    if (pl.kind === 'kirilan'){
      ctx.strokeStyle = rgba(C.pit, .75); ctx.lineWidth = 1.5; ctx.beginPath();
      for (let x = x0 + 24; x < x0 + pl.w - 14; x += 52){ ctx.moveTo(x, pl.y - 5); ctx.lineTo(x + 6, pl.y + 3); ctx.lineTo(x + 2, pl.y + 9); ctx.lineTo(x + 9, pl.y + 16); }
      ctx.stroke();
      if (pl.load > .3){ ctx.fillStyle = rgba(C.blood, .25 * pl.load); ctx.fillRect(x0, pl.y - 5, pl.w, 7); }
    } else if (pl.kind === 'hareketli'){
      ctx.fillStyle = rgba(P.light, .55);
      for (const sd of [-1, 1]){ const ax = sd < 0 ? x0 + 6 : x0 + pl.w - 6; ctx.beginPath(); ctx.moveTo(ax + sd * 5, pl.y + 9); ctx.lineTo(ax - sd * 2, pl.y + 4); ctx.lineTo(ax - sd * 2, pl.y + 14); ctx.closePath(); ctx.fill(); }
    }
  }
}
function drawTraps(){
  S.traps.forEach(tr => {
    const ph = trapPhase(tr, S.mode === 'title' ? 0 : S.t);
    ctx.fillStyle = rgba(C.pit, .7); ctx.fillRect(tr.x, tr.y - 3, tr.w, 4);
    let hgt = 0, jit = 0;
    if (ph.st === 'warn'){ hgt = 4; jit = Math.sin(S.t * 70) * 1.2; }
    if (ph.st === 'up') hgt = ph.k < .15 ? 18 * (ph.k / .15) : ph.k > .85 ? 18 * (1 - ph.k) / .15 : 18;
    if (ph.st === 'warn'){
      const g = ctx.createLinearGradient(0, tr.y - 22, 0, tr.y);
      g.addColorStop(0, rgba(C.ember, 0)); g.addColorStop(1, rgba(C.ember, .35));
      ctx.fillStyle = g; ctx.fillRect(tr.x, tr.y - 22, tr.w, 22);
    }
    if (hgt <= 0) return;
    const n = Math.floor(tr.w / 10);
    ctx.fillStyle = ph.st === 'warn' ? C.ember : C.bone;
    ctx.beginPath();
    for (let i = 0; i < n; i++){ const x = tr.x + 5 + i * 10 + jit; ctx.moveTo(x - 4, tr.y - 2); ctx.lineTo(x, tr.y - 2 - hgt); ctx.lineTo(x + 4, tr.y - 2); }
    ctx.fill();
  });
}
function floorBand(x0, x1, y, col){
  const a = clamp(Math.min(x0, x1), WALL, W - WALL), b = clamp(Math.max(x0, x1), WALL, W - WALL);
  ctx.fillStyle = col; ctx.fillRect(a, y - 6, b - a, 8);
}
function dashedLine(x0, y0, x1, y1, col, wdt){
  ctx.strokeStyle = col; ctx.lineWidth = wdt; ctx.setLineDash([8, 7]);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.setLineDash([]);
}
/* zemine çizilen işaretler */
function drawTelegraphs(){
  const t = S.t, pulse = .5 + .5 * Math.sin(t * 16);
  const e = S.e;
  if (e && e.hp > 0){
    const el = e.ck - e.st, k = clamp(el / Math.max(.01, e.dur), 0, 1);
    if (e.state === 'lungeWind') floorBand(e.x + e.face * e.w / 2, e.x + e.face * (e.w / 2 + 157 + 72), FLOOR, rgba(C.blood, .15 + .4 * k));
    if (e.state === 'chargeWind') floorBand(e.x, e.chargeDir > 0 ? W - WALL : WALL, FLOOR, rgba(C.blood, .12 + .4 * k));
    if (e.state === 'slamWind'){
      const rad = 160 + e.w / 2;
      ctx.strokeStyle = rgba(C.blood, .35 + .5 * k); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(e.x, FLOOR - 1, rad, 10, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = rgba(C.blood, .08 + .14 * k); ctx.beginPath(); ctx.ellipse(e.x, FLOOR - 1, rad, 10, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (e.state === 'leapCrouch' || e.state === 'leapAir'){
      ctx.strokeStyle = rgba(C.ember, .45 + .45 * pulse); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(e.leapX, FLOOR - 1, 36, 7, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = rgba(C.ember, .5 + .3 * pulse);
      for (const dir of [-1, 1]){ const ax = e.leapX + dir * 52; ctx.beginPath(); ctx.moveTo(ax, FLOOR - 7); ctx.lineTo(ax + dir * 10, FLOOR - 1); ctx.lineTo(ax, FLOOR + 5); ctx.closePath(); ctx.fill(); }
    }
    if (e.state === 'ringWind'){
      const cx = e.x, cy = e.y - e.h * .55;
      ctx.strokeStyle = rgba(C.ember, .3 + .5 * k); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 30 + 30 * (1 - k), 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < e.ringN; i++){
        const a = e.ringA + i * Math.PI * 2 / e.ringN;
        dashedLine(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40, cx + Math.cos(a) * (90 + 120 * k), cy + Math.sin(a) * (90 + 120 * k), rgba(C.ember, .12 + .4 * k), 1.5);
      }
    }
    if (e.state === 'volleyWind'){
      const tg = e.tg || S.p, [hx, hy] = handPos(e), base = Math.atan2((tg.y - tg.h / 2) - hy, tg.x - hx);
      const offs = e.volleyN === 5 ? [-.3, -.15, 0, .15, .3] : [-.2, 0, .2];
      for (const o of offs) dashedLine(hx, hy, hx + Math.cos(base + o) * 420, hy + Math.sin(base + o) * 420, rgba(C.ember, .15 + .5 * k), 1.5 + k);
    }
    if (e.state === 'summonWind'){
      for (const x of [e.x < 480 ? 900 : 60]){ ctx.strokeStyle = rgba(e.pal.light, .4 + .5 * pulse); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, FLOOR - 1, 26, 6, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    if (e.state === 'rowWind' || e.state === 'rowStrike'){
      for (const r of e.rows){
        const [top, bot] = ROW_BAND[r];
        if (e.state === 'rowWind'){
          const pl = .5 + .5 * Math.sin(t * (14 + 20 * k));
          ctx.fillStyle = rgba(C.ember, .05 + .1 * k * pl); ctx.fillRect(WALL, top, W - 2 * WALL, bot - top);
          ctx.fillStyle = rgba(C.ember, .5 + .4 * k); ctx.fillRect(WALL, top, W - 2 * WALL, 2); ctx.fillRect(WALL, bot - 2, W - 2 * WALL, 2);
          ctx.font = `700 26px ${F_DISPLAY}`; ctx.textAlign = 'left'; ctx.fillStyle = rgba(C.ember, .6 + .4 * pl);
          ctx.fillText(r + '. sıra', WALL + 10, top + 30);
        } else {
          ctx.fillStyle = rgba(C.ember, .2); ctx.fillRect(WALL, top, W - 2 * WALL, bot - top);
          ctx.strokeStyle = rgba(C.ember, .85); ctx.lineWidth = 2; ctx.lineCap = 'round';
          const fr = Math.floor(t * 60);
          ctx.beginPath();
          for (let i = 0; i < 26; i++){
            const x = WALL + ((i * 97 + fr * 31) % (W - 2 * WALL));
            const y0 = top + ((i * 53 + fr * 47) % Math.max(1, bot - top - 30));
            ctx.moveTo(x, y0); ctx.lineTo(x - 4, y0 + 28);
          }
          ctx.stroke();
        }
      }
    }
  }
  for (const m of S.mobs){
    const k = clamp((m.ck - m.st) / Math.max(.01, m.dur), 0, 1);
    if (S.t < m.invisUntil) continue;
    if (m.a === 'tank' && m.state === 'bashWind') floorBand(m.x + m.face * 8, m.x + m.face * 62, m.y, rgba(C.blood, .15 + .4 * k));
    if (m.a === 'runner' && m.state === 'wind') floorBand(m.x, m.x + m.face * 155, m.y, rgba(C.blood, .15 + .4 * k));
    if (m.a === 'flyer' && m.state === 'mark'){
      dashedLine(m.x, m.y - m.h / 2, m.aimX, m.aimY, rgba(C.blood, .25 + .5 * k), 2);
      ctx.strokeStyle = rgba(C.blood, .4 + .5 * pulse); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(m.aimX, m.aimY, 14 - 6 * k, 0, Math.PI * 2); ctx.stroke();
    }
    if (m.a === 'burrower' && (m.state === 'under' || m.state === 'rumble')){
      /* toprak altındaki solucanın yeri: kabaran toprak; patlamadan önce çatlak ve kırmızı sütun */
      const r = m.state === 'rumble';
      ctx.fillStyle = rgba(m.pal.mob, r ? .9 : .55);
      ctx.beginPath(); ctx.ellipse(m.x, FLOOR, r ? 26 : 18, r ? 7 + 3 * pulse : 5, 0, Math.PI, 0); ctx.fill();
      if (r){
        ctx.strokeStyle = rgba(C.blood, .5 + .4 * k); ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = -2; i <= 2; i++){ ctx.moveTo(m.x + i * 9, FLOOR - 2); ctx.lineTo(m.x + i * 13 + (i % 2 ? 4 : -4), FLOOR - 9 - 6 * k); }
        ctx.stroke();
        ctx.fillStyle = rgba(C.blood, .08 + .2 * k); ctx.fillRect(m.x - 22, FLOOR - 96, 44, 96);
        drawAlert(m.x, FLOOR - 104, C.blood);
      }
    }
    if (m.a === 'exploder' && m.state === 'fuse'){
      ctx.strokeStyle = rgba(AFFIX.patlayan.col, .35 + .55 * pulse); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(m.x, m.y - m.h / 2, 85, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = rgba(AFFIX.patlayan.col, .06 + .14 * k);
      ctx.beginPath(); ctx.arc(m.x, m.y - m.h / 2, 85 * k, 0, Math.PI * 2); ctx.fill();
    }
    if (m.a === 'healer' && m.state === 'chant'){
      ctx.strokeStyle = rgba('#7de08a', .3 + .4 * pulse); ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(m.x, m.y - m.h / 2, 170, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    if (m.a === 'jumper' && m.state === 'crouch'){
      ctx.strokeStyle = rgba(C.blood, .35 + .5 * k); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(m.jx, m.jy - 2, 22, 5, 0, 0, Math.PI * 2); ctx.stroke();
      floorBand(m.jx - 18, m.jx + 18, m.jy, rgba(C.blood, .15 + .35 * k));
    }
    if (m.a === 'tank' && (m.state === 'tcrouch' || m.state === 'tleap')){
      ctx.strokeStyle = rgba(C.blood, .4 + .45 * pulse); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(m.jx, FLOOR - 1, 30, 6, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = rgba(C.blood, .5 + .3 * pulse);
      for (const dir of [-1, 1]){ const ax = m.jx + dir * 46; ctx.beginPath(); ctx.moveTo(ax, FLOOR - 7); ctx.lineTo(ax + dir * 10, FLOOR - 1); ctx.lineTo(ax, FLOOR + 5); ctx.closePath(); ctx.fill(); }
    }
    if (m.a === 'flyer' && m.state === 'faim'){
      const locked = (m.ck - m.st) >= m.dur - .18;
      dashedLine(m.x + m.face * 12, m.y - m.h / 2, m.aimX, m.aimY, locked ? rgba(C.ember, .6 + .4 * pulse) : rgba(C.ember, .12 + .3 * k), locked ? 2.5 : 1.5);
    }
    if (m.a === 'charger' && m.state === 'paw') floorBand(m.x, m.cdir > 0 ? m.home.r : m.home.l, m.y, rgba(C.blood, .12 + .4 * k));
    if (m.a === 'lobber' && m.state === 'windup'){
      ctx.strokeStyle = rgba(C.blood, .35 + .5 * k); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(m.lx, m.ly - 20, 62 * (.5 + .5 * k), 0, Math.PI * 2); ctx.stroke();
    }
  }
  for (const g of S.grenades){
    ctx.strokeStyle = rgba(C.blood, .5 + .4 * pulse); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(g.x1, g.y1 - 20, 62, 0, Math.PI * 2); ctx.stroke();
    floorBand(g.x1 - 30, g.x1 + 30, g.y1, rgba(C.blood, .25));
  }
  for (const b of S.bombs){
    const k = clamp(1 - (b.at - S.t) / (b.lead || .8), 0, 1);
    ctx.strokeStyle = rgba(AFFIX.patlayan.col, .4 + .5 * pulse); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(b.x, b.y - 20, b.r * (.4 + .6 * k), 0, Math.PI * 2); ctx.stroke();
  }
}
/* mob: düşmanlar sadece normal platformlara iner (kırılan ve hareketli platformlara değil) */
function surfaceBelow(x, y, mob){
  let s = FLOOR;
  for (const pl of S.plats){
    if (mob ? pl.kind : !solidPlat(pl)) continue;
    if (x > pl.x && x < pl.x + pl.w && pl.y >= y - 1 && pl.y < s) s = pl.y;
  }
  return s;
}
function drawShadow(x, y, w){
  const s = surfaceBelow(x, y);
  const k = clamp(1 - (s - y) / 240, .25, 1);
  ctx.fillStyle = rgba(C.pit, .6 * k);
  ctx.beginPath(); ctx.ellipse(x, s - 1, w * .8 * k + 4, 4.5 * k + 1, 0, 0, Math.PI * 2); ctx.fill();
}
function drawAlert(x, y, col){
  ctx.globalAlpha = .65 + .35 * Math.abs(Math.sin(S.t * 14));
  ctx.textAlign = 'center'; ctx.font = `700 28px ${F_DISPLAY}`; ctx.fillStyle = col;
  ctx.fillText('!', x, y);
  ctx.globalAlpha = 1;
}
function drawSpear(gx, gy, ang, len, glow, alpha){
  const c = Math.cos(ang), s = Math.sin(ang);
  const tx = gx + c * len * .55, ty = gy + s * len * .55, bx = gx - c * len * .45, by = gy - s * len * .45;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = C.dust; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx - c * 10, ty - s * 10); ctx.stroke();
  ctx.fillStyle = C.ember;
  ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - c * 15 - s * 5, ty - s * 15 + c * 5); ctx.lineTo(tx - c * 15 + s * 5, ty - s * 15 - c * 5); ctx.closePath(); ctx.fill();
  if (glow > 0){
    const r = 6 + glow * 14, g = ctx.createRadialGradient(tx, ty, 0, tx, ty, r);
    g.addColorStop(0, rgba(C.ember, .9 * glow)); g.addColorStop(1, rgba(C.ember, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function drawLineShot(s, alpha, col){
  const c = Math.cos(s.ang), sn = Math.sin(s.ang), h = s.len / 2;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = s.kind === 'bullet' ? col : C.dust; ctx.lineWidth = s.kind === 'bullet' ? 4 : 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(s.x - c * h, s.y - sn * h); ctx.lineTo(s.x + c * (h - (s.kind === 'bullet' ? 0 : 6)), s.y + sn * (h - (s.kind === 'bullet' ? 0 : 6))); ctx.stroke();
  if (s.kind !== 'bullet'){
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(s.x + c * h, s.y + sn * h); ctx.lineTo(s.x + c * (h - 9) - sn * 3.5, s.y + sn * (h - 9) + c * 3.5); ctx.lineTo(s.x + c * (h - 9) + sn * 3.5, s.y + sn * (h - 9) - c * 3.5); ctx.closePath(); ctx.fill();
  }
  if (s.kind === 'arrow'){
    ctx.strokeStyle = C.bone; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(s.x - c * h, s.y - sn * h); ctx.lineTo(s.x - c * (h - 7) - sn * 4, s.y - sn * (h - 7) + c * 4); ctx.moveTo(s.x - c * h, s.y - sn * h); ctx.lineTo(s.x - c * (h - 7) + sn * 4, s.y - sn * (h - 7) - c * 4); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawOrb(x, y, r, col){
  const g = ctx.createRadialGradient(x, y, 1, x, y, r * 2.2);
  g.addColorStop(0, rgba(col, .95)); g.addColorStop(.45, rgba(col, .6)); g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rgba('#ffffff', .8); ctx.beginPath(); ctx.arc(x - r * .3, y - r * .3, r * .35, 0, Math.PI * 2); ctx.fill();
}
function drawShots(){
  for (const s of S.shots){
    const a = s.stuck ? Math.min(1, s.life / .4) : 1, col = s.el ? elCol(s.el) : C.ember;
    if (s.kind === 'spear') drawSpear(s.x, s.y, s.ang, 86, 0, a);
    else if (s.kind === 'orb') drawOrb(s.x, s.y, s.r, s.el ? elCol(s.el) : S.ch.pal.light);
    else drawLineShot(s, a, col);
  }
  for (const s of S.pshots){
    const col = s.el ? elCol(s.el) : C.bone;
    if (s.kind === 'orb') drawOrb(s.x, s.y, 7, s.el ? col : C.frost);
    else {
      if (s.power){ ctx.globalAlpha = .35; drawLineShot(Object.assign({}, s, {len:s.len + 14}), 1, C.ember); ctx.globalAlpha = 1; }
      drawLineShot(s, Math.min(1, s.life / .12 + .2), s.power ? C.ember : col);
    }
  }
  for (const b of S.booms){
    const k = (S.t - b.t) / .35;
    ctx.globalAlpha = 1 - k;
    if (b.flat){ ctx.strokeStyle = b.col; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(b.x, b.y - 1, b.r * (.3 + .7 * k), 12, 0, 0, Math.PI * 2); ctx.stroke(); }
    else { ctx.fillStyle = rgba(b.col, .35); ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (.4 + .6 * k), 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = b.col; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  for (const b of S.bolts){
    const k = (S.t - b.t) / .25;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = elCol('yildirim'); ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); let x = b.x + rand(-10, 10), y = 0; ctx.moveTo(x, y);
    while (y < b.y){ y += 30; x = b.x + rand(-18, 18); ctx.lineTo(x, Math.min(y, b.y)); }
    ctx.stroke();
    ctx.fillStyle = rgba(elCol('yildirim'), .25); ctx.beginPath(); ctx.arc(b.x, b.y, 55, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
function drawQuakes(){
  for (const w of S.quakes){
    ctx.fillStyle = rgba(C.ember, .8);
    ctx.beginPath(); ctx.moveTo(w.x - 16, FLOOR); ctx.quadraticCurveTo(w.x + w.dir * 8, FLOOR - 36, w.x + 16, FLOOR); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(C.bone, .5);
    ctx.beginPath(); ctx.moveTo(w.x - 8, FLOOR); ctx.quadraticCurveTo(w.x + w.dir * 6, FLOOR - 18, w.x + 8, FLOOR); ctx.closePath(); ctx.fill();
  }
}
/* ---------- boss çizimi ---------- */
function drawHead(e, hx, hy, r, col){
  const P = e.pal, f = e.face, hit = e.flash > 0;
  const hc = hit ? C.bone : col;
  switch (e.def.head){
    case 'helmet':
      ctx.fillStyle = hit ? C.bone : P.wallHi;
      ctx.beginPath(); ctx.moveTo(hx - r * 1.3, hy + r); ctx.lineTo(hx - r, hy - r); ctx.lineTo(hx + r, hy - r); ctx.lineTo(hx + r * 1.3, hy + r); ctx.closePath(); ctx.fill();
      ctx.fillStyle = e.phase === 2 ? P.eye : rgba(P.eye, .75); ctx.fillRect(hx + f * 2 - r * .6, hy - 2, r * 1.2, 3);
      return;
    case 'none':
      ctx.fillStyle = P.eye; ctx.fillRect(hx - r, hy + r * .2, r * 2, 4);
      return;
    case 'beast':
      ctx.fillStyle = hc; ctx.beginPath(); ctx.ellipse(hx + f * r * .3, hy, r * 1.3, r, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx - r * .9, hy - r * .6); ctx.lineTo(hx - r * .5, hy - r * 1.5); ctx.lineTo(hx - r * .1, hy - r * .8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx + r * .9, hy - r * .6); ctx.lineTo(hx + r * .5, hy - r * 1.5); ctx.lineTo(hx + r * .1, hy - r * .8); ctx.fill();
      break;
    default:
      ctx.fillStyle = hc; ctx.beginPath(); ctx.arc(hx, hy, r, 0, Math.PI * 2); ctx.fill();
  }
  if (e.def.head === 'crown'){
    ctx.fillStyle = P.light; ctx.beginPath(); ctx.moveTo(hx - r, hy - r * .5);
    for (let i = 0; i < 5; i++) ctx.lineTo(hx - r + i * r / 2, i % 2 ? hy - r * .8 : hy - r * 1.6);
    ctx.lineTo(hx + r, hy - r * .5); ctx.closePath(); ctx.fill();
  } else if (e.def.head === 'hat'){
    ctx.fillStyle = rgba(P.top, 1); ctx.fillRect(hx - r * 1.6, hy - r * .7, r * 3.2, 4);
    ctx.beginPath(); ctx.moveTo(hx - r, hy - r * .6); ctx.lineTo(hx - f * r * .6, hy - r * 2.8); ctx.lineTo(hx + r, hy - r * .6); ctx.fill();
  } else if (e.def.head === 'horns'){
    ctx.strokeStyle = C.bone; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx - r * .6, hy - r * .6); ctx.quadraticCurveTo(hx - r * 1.6, hy - r * 1.2, hx - r * 1.2, hy - r * 2.2);
    ctx.moveTo(hx + r * .6, hy - r * .6); ctx.quadraticCurveTo(hx + r * 1.6, hy - r * 1.2, hx + r * 1.2, hy - r * 2.2); ctx.stroke();
  } else if (e.def.head === 'halo'){
    ctx.strokeStyle = rgba(P.light, .9); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(hx, hy - r * 1.6, r * 1.1, r * .35, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = P.eye;
  if (e.def.head === 'beast'){ ctx.fillRect(hx + f * r * .6 - 2, hy - 3, 4, 4); ctx.fillRect(hx + f * r * .1 - 2, hy - 3, 4, 4); }
  else ctx.fillRect(hx + f * r * .35 - 1.5, hy - 2, 3, 4);
}
function drawBoss(){
  const e = S.e, t = S.t, el = e.ck - e.st, f = e.face, def = e.def, P = e.pal;
  const crouch = ['leapCrouch', 'throwPrep', 'slamWind'].includes(e.state) ? .86 : 1;
  const h = e.h * crouch, w = e.w;
  const hit = e.flash > 0;
  if (e.phase === 2 && !hit){
    const ag = ctx.createRadialGradient(e.x, e.y - h / 2, 4, e.x, e.y - h / 2, w + 30);
    ag.addColorStop(0, rgba(P.light, .16)); ag.addColorStop(1, rgba(P.light, 0));
    ctx.fillStyle = ag; ctx.fillRect(e.x - w - 30, e.y - h - 40, (w + 30) * 2, h + 50);
  }
  if (t < e.slowUntil){ ctx.fillStyle = rgba(elCol('buz'), .18); ctx.fillRect(e.x - w / 2 - 6, e.y - h - 6, w + 12, h + 6); }
  const hr = Math.max(9, Math.min(16, w * .28));
  const bodyTop = e.y - h + hr * 1.6;
  ctx.fillStyle = hit ? C.bone : def.body; rr(e.x - w / 2, bodyTop, w, e.y - bodyTop, 7); ctx.fill();
  ctx.fillStyle = rgba(C.pit, .25); rr(e.x - w / 2, e.y - 16, w, 16, 5); ctx.fill();
  if (def.head !== 'none') drawHead(e, e.x + f * 2, bodyTop - hr * .7, hr, P.mobHi);
  else drawHead(e, e.x, bodyTop + 6, w * .3, P.mobHi);
  /* silah ve atış pozu */
  const [hx0, hy0] = handPos(e);
  if (def.weapon === 'spear'){
    let gx, gy, ang, glow = 0;
    switch (e.state){
      case 'throwPrep': gx = e.x - f * 10; gy = e.y - h + 2; ang = -Math.PI / 2 + f * .5; glow = clamp(el / e.dur, 0, 1); break;
      case 'jump': case 'hang': gx = hx0; gy = hy0; { const [tx, ty] = aimAt(gx, gy, bossProjSpeed(def.proj), .85); ang = Math.atan2(ty - gy, tx - gx); } glow = e.state === 'hang' ? .5 + .5 * Math.sin(t * 40) : .4; break;
      case 'lungeWind': { const k = Math.min(1, el / (e.dur * .8)); gx = e.x - f * (4 + 14 * k); gy = e.y - 37; ang = f > 0 ? 0 : Math.PI; glow = k; break; }
      case 'lunge': case 'charge': gx = e.x + f * 34; gy = e.y - 37; ang = f > 0 ? 0 : Math.PI; break;
      case 'leapCrouch': case 'leapAir': gx = e.x + f * 14; gy = e.y - h * .6; ang = f > 0 ? -.6 : Math.PI + .6; break;
      case 'rowWind': case 'summonWind': case 'volleyWind': case 'rainWind': case 'rainCast': case 'ringWind': gx = e.x + f * 4; gy = e.y - h - 14; ang = -Math.PI / 2; glow = .4 + .6 * Math.abs(Math.sin(t * 18)); break;
      case 'rowStrike': case 'slamWind': gx = e.x + f * 16; gy = e.y - 30; ang = Math.PI / 2; break;
      default: gx = e.x + f * 21; gy = e.y - 30; ang = -Math.PI / 2 + f * .12;
    }
    if (e.held || def.proj !== 'spear'){
      ctx.strokeStyle = hit ? C.bone : def.body; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(e.x + f * 6, bodyTop + 8); ctx.lineTo(gx, gy); ctx.stroke();
      drawSpear(gx, gy, ang, 86, glow, 1);
    }
  } else if (def.weapon === 'staff'){
    const sx = e.x + f * (w / 2 + 6), raise = ['rowWind', 'summonWind', 'volleyWind', 'throwPrep', 'jump', 'hang', 'rainWind', 'rainCast', 'ringWind'].includes(e.state) ? 18 : 0;
    ctx.strokeStyle = C.dust; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, e.y - 4 - raise); ctx.lineTo(sx, e.y - h - 6 - raise); ctx.stroke();
    const glow = e.state.endsWith('Wind') || e.state === 'jump' || e.state === 'hang' || e.state === 'throwPrep';
    drawOrb(sx, e.y - h - 10 - raise, glow ? 7 + 2 * Math.sin(t * 20) : 5, e.el ? elCol(e.el) : P.light);
  } else if (def.weapon === 'sword' || def.weapon === 'hammer'){
    const swing = ['lunge', 'charge', 'slamWind', 'rowStrike'].includes(e.state);
    const ang = swing ? (f > 0 ? .2 : Math.PI - .2) : -Math.PI / 2 + f * .4;
    const gx = e.x + f * (w / 2 + 2), gy = e.y - h * .55, L = def.weapon === 'hammer' ? 56 : 50;
    ctx.strokeStyle = def.weapon === 'hammer' ? C.rust : C.bone; ctx.lineWidth = def.weapon === 'hammer' ? 5 : 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(ang) * L, gy + Math.sin(ang) * L); ctx.stroke();
    if (def.weapon === 'hammer'){ ctx.fillStyle = P.wallHi; ctx.save(); ctx.translate(gx + Math.cos(ang) * L, gy + Math.sin(ang) * L); ctx.rotate(ang); ctx.fillRect(-8, -14, 16, 28); ctx.restore(); }
    if (e.state.endsWith('Wind')){ ctx.fillStyle = rgba(C.blood, .5 + .5 * Math.sin(t * 20)); ctx.beginPath(); ctx.arc(gx + Math.cos(ang) * L, gy + Math.sin(ang) * L, 6, 0, Math.PI * 2); ctx.fill(); }
  } else if (def.weapon === 'claws'){
    ctx.strokeStyle = C.bone; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const cx = e.x + f * (w / 2 + 4), cy = e.y - h * .45;
    for (let i = -1; i <= 1; i++){ ctx.beginPath(); ctx.moveTo(cx, cy + i * 7); ctx.lineTo(cx + f * 16, cy + i * 9 + 4); ctx.stroke(); }
  } else if (def.weapon === 'drill'){
    const cx = e.x + f * w / 2, cy = e.y - h * .45;
    ctx.fillStyle = P.wallHi; ctx.beginPath(); ctx.moveTo(cx, cy - 16); ctx.lineTo(cx + f * 40, cy); ctx.lineTo(cx, cy + 16); ctx.fill();
    ctx.strokeStyle = rgba(C.pit, .5); ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++){ const o = ((t * 60 + i * 10) % 40); ctx.beginPath(); ctx.moveTo(cx + f * o, cy - 16 * (1 - o / 40)); ctx.lineTo(cx + f * (o + 6), cy + 16 * (1 - (o + 6) / 40)); ctx.stroke(); }
  }
  if (def.weapon !== 'spear' && (e.state === 'jump' || e.state === 'hang')){
    const [tx, ty] = aimAt(hx0, hy0, bossProjSpeed(def.proj), .85);
    if (e.held) drawOrb(hx0, hy0, 6, e.el ? elCol(e.el) : P.light);
    void tx; void ty;
  }
  if (e.state === 'jump' || e.state === 'hang'){
    const [tx, ty] = aimAt(hx0, hy0, bossProjSpeed(def.proj), .85);
    const ang = Math.atan2(ty - hy0, tx - hx0);
    const k = e.state === 'hang' ? .75 + .25 * Math.sin(t * 30) : clamp(el / (set.tell / 1000), 0, 1);
    dashedLine(hx0 + Math.cos(ang) * 50, hy0 + Math.sin(ang) * 50, tx, ty, rgba(C.ember, .18 + .55 * k), 1.5 + k);
  }
  const alertY = e.y - h - hr * 2.6 - 10;
  const AL = {throwPrep:C.ember, lungeWind:C.blood, leapCrouch:C.bone, rowWind:C.ember, volleyWind:C.ember, chargeWind:C.blood, slamWind:C.blood, summonWind:C.frost, rainWind:C.ember, ringWind:C.ember};
  if (AL[e.state]) drawAlert(e.x, alertY, AL[e.state]);
}
/* ---------- mob çizimi ---------- */
function drawSkull(x, y, col, f, hot, eye){
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x - 5 + f * 2, y + 4, 8, 5);
  ctx.fillStyle = hot ? eye : rgba(eye, .6);
  ctx.fillRect(x + f * 3 - 1.5, y - 2, 3, hot ? 4 : 3);
}
function drawRibs(x, y, w, h, col){
  ctx.fillStyle = col; rr(x, y, w, Math.max(4, h), 4); ctx.fill();
  ctx.fillStyle = rgba(C.pit, .4);
  for (let i = 1; i <= 3; i++) ctx.fillRect(x + 3, y + i * h / 4.2, w - 6, 2);
}
/* ---------- mob gövdeleri: her bölüm kendi yaratıklarını çizer ---------- */
const TELL_S = new Set(['bashWind', 'wind', 'aim', 'mark', 'rumble', 'fuse', 'chant', 'crouch', 'paw', 'windup', 'tcrouch', 'faim']);
const ALERT_S = new Set(['bashWind', 'wind', 'mark', 'fuse', 'crouch', 'paw', 'windup', 'tcrouch']);
const HUMANOID = new Set(['skel', 'zombie', 'mummy', 'golem', 'robot', 'caster', 'angel']);
const MOVING_S = new Set(['walk', 'chase', 'seek', 'roam', 'hop', 'idle', 'hover', 'dash', 'charge']);
/* gövde ile çarpışma kutusu aynı olsun diye bazı yaratıkların boyu türünden farklı */
const SIZE_OVR = {'runner:beast':[44, 30], 'runner:worm':[42, 18], 'runner:bug':[40, 22], 'tank:bug':[48, 34], 'tank:crab':[50, 38], 'ranged:blob':[32, 30]};
function gait(m, sp){ return MOVING_S.has(m.state) ? Math.sin(S.t * sp + m.seed) : 0; }
function eyeDot(x, y, r, col, hot){ ctx.fillStyle = hot ? col : rgba(col, .7); ctx.beginPath(); ctx.arc(x, y, hot ? r * 1.25 : r, 0, Math.PI * 2); ctx.fill(); }
function drawMobBody(m, y, col, hi, tell, el){
  const b = m.body;
  if (m.a === 'exploder' && b === 'robot') return bodyBomb(m, y, col, hi, tell);
  if (b === 'beast') return bodyBeast(m, y, col, hi, tell);
  if (b === 'bug') return bodyBug(m, y, col, hi, tell);
  if (b === 'crab') return bodyCrab(m, y, col, hi, tell);
  if (b === 'worm') return bodyWorm(m, y, col, hi, tell, el);
  if (b === 'blob') return bodyBlob(m, y, col, hi, tell);
  if (b === 'bat') return bodyBat(m, y, col, hi, tell);
  if (b === 'bird') return bodyBird(m, y, col, hi, tell);
  if (b === 'fly') return bodyFly(m, y, col, hi, tell);
  if (b === 'drone') return bodyDrone(m, y, col, hi, tell);
  if (b === 'fish' && m.a === 'flyer') return bodyFish(m, y, col, hi, tell);
  return bodyHumanoid(m, y, col, hi, tell);
}
function bodyHumanoid(m, y, col, hi, tell){
  const x = m.x, f = m.face, P = m.pal, k = m.body, w = m.w;
  const H = m.h * (m.state === 'wind' || m.state === 'crouch' ? .82 : 1), top = y - H;
  const legH = H * .3, tTop = top + H * .24, tH = y - legH - tTop + 2;
  const tw = w * (k === 'golem' ? .95 : k === 'skel' ? .7 : .76);
  const g = gait(m, 11) * 2.5, lean = k === 'zombie' ? f * 4 : 0;
  if (k === 'angel'){
    const fl = Math.sin(S.t * 6 + m.seed) * 4;
    ctx.fillStyle = rgba(hi, .5);
    for (const s of [0, 1]){
      const o = s * 7;
      ctx.beginPath(); ctx.moveTo(x - f * 2, tTop + 4);
      ctx.quadraticCurveTo(x - f * (14 + o), tTop - 16 - fl + o, x - f * (28 + o), tTop - 8 - fl + o);
      ctx.quadraticCurveTo(x - f * (18 + o), tTop + 8 + o, x - f * 2, tTop + tH * .6); ctx.fill();
    }
  }
  if (k === 'caster' || k === 'angel'){
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x - tw * .4, tTop); ctx.lineTo(x + tw * .4, tTop); ctx.lineTo(x + w * .58, y); ctx.lineTo(x - w * .58, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(C.pit, .3); ctx.fillRect(x - w * .58, y - 4, w * 1.16, 4);
    ctx.fillStyle = rgba(hi, .45); ctx.fillRect(x - 1.5, tTop + 4, 3, y - tTop - 8);
  } else {
    const lw = Math.max(4, w * (k === 'golem' ? .26 : .19));
    ctx.fillStyle = k === 'robot' ? hi : col;
    ctx.fillRect(x - w * .24 - lw / 2 + g, y - legH, lw, legH);
    ctx.fillRect(x + w * .24 - lw / 2 - g, y - legH, lw, legH);
    if (k === 'skel') drawRibs(x - tw / 2, tTop, tw, tH, col);
    else {
      ctx.fillStyle = col; rr(x - tw / 2 + lean, tTop, tw, tH, k === 'robot' ? 2 : 5); ctx.fill();
      if (k === 'mummy'){
        ctx.strokeStyle = rgba(hi, .75); ctx.lineWidth = 1.5; ctx.beginPath();
        for (let i = 0; i < 4; i++){ const yy = tTop + 4 + i * tH / 4; ctx.moveTo(x - tw / 2, yy + 3); ctx.lineTo(x + tw / 2, yy - 2); }
        ctx.stroke();
      } else if (k === 'golem'){
        ctx.strokeStyle = rgba(P.light, tell ? .95 : .55); ctx.lineWidth = 1.5; ctx.beginPath();
        ctx.moveTo(x - tw * .2, tTop + 4); ctx.lineTo(x, tTop + tH * .45); ctx.lineTo(x + tw * .18, tTop + tH * .8); ctx.stroke();
        ctx.fillStyle = hi;
        for (const s of [-1, 1]){ ctx.beginPath(); ctx.arc(x + s * (tw / 2 + 3), tTop + tH * .7, w * .17, 0, Math.PI * 2); ctx.fill(); }
      } else if (k === 'robot'){
        ctx.fillStyle = rgba(hi, .6); ctx.fillRect(x - tw * .3, tTop + 5, tw * .6, tH * .35);
        eyeDot(x + f * tw * .15, tTop + 5 + tH * .17, 2, P.eye, tell);
      } else if (k === 'zombie'){
        ctx.fillStyle = rgba(C.pit, .35); ctx.fillRect(x - tw / 2 + lean, tTop + tH - 5, tw * .5, 5); ctx.fillRect(x + lean, tTop + tH * .4, tw * .3, 4);
        const ay = tTop + 6 + (MOVING_S.has(m.state) ? Math.sin(S.t * 5 + m.seed) * 2 : 0);
        ctx.strokeStyle = hi; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + lean + f * tw * .3, ay); ctx.lineTo(x + lean + f * (tw * .5 + 16), ay + 2); ctx.stroke();
      }
    }
  }
  const hx = x + lean + f * 2, hy = top + H * .12;
  if (k === 'skel') drawSkull(hx, hy + 1, hi, f, tell, P.eye);
  else if (k === 'robot'){
    ctx.fillStyle = hi; rr(hx - 8, hy - 7, 16, 13, 2); ctx.fill();
    ctx.fillStyle = tell ? P.eye : rgba(P.eye, .7); ctx.fillRect(f > 0 ? hx - 2 : hx - 7, hy - 3, 9, 3);
    ctx.strokeStyle = hi; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hx, hy - 7); ctx.lineTo(hx, hy - 13); ctx.stroke();
    eyeDot(hx, hy - 14, 1.8, P.light, tell);
  } else if (k === 'golem'){
    ctx.fillStyle = hi; rr(hx - 7, tTop - 9, 14, 12, 3); ctx.fill();
    ctx.fillStyle = tell ? P.eye : rgba(P.eye, .7); ctx.fillRect(hx + f * 2 - 3, tTop - 5, 6, 2.5);
  } else if (k === 'caster'){
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(hx - 9, hy + 7); ctx.quadraticCurveTo(hx - 9, hy - 9, hx - f * 4, hy - 13); ctx.quadraticCurveTo(hx + 9, hy - 8, hx + 9, hy + 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(C.pit, .85); ctx.beginPath(); ctx.arc(hx + f * 1.5, hy + 1, 5.5, 0, Math.PI * 2); ctx.fill();
    eyeDot(hx + f * 1.5 - 2, hy, 1.2, P.eye, tell); eyeDot(hx + f * 1.5 + 2, hy, 1.2, P.eye, tell);
  } else if (k === 'fish'){
    ctx.fillStyle = hi; ctx.beginPath(); ctx.ellipse(hx + f * 3, hy + 1, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx - f * 2, hy - 5); ctx.lineTo(hx - f * 6, hy - 15); ctx.lineTo(hx + f * 4, hy - 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(C.pit, .7); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hx + f * 6, hy + 3); ctx.lineTo(hx + f * 12, hy + 3); ctx.stroke();
    eyeDot(hx + f * 5, hy - 1, 1.6, P.eye, tell);
  } else {
    ctx.fillStyle = hi; ctx.beginPath(); ctx.arc(hx, hy, 7.5, 0, Math.PI * 2); ctx.fill();
    if (k === 'mummy'){
      ctx.strokeStyle = rgba(C.pit, .35); ctx.lineWidth = 1.2; ctx.beginPath();
      ctx.moveTo(hx - 7, hy - 3); ctx.lineTo(hx + 7, hy - 5); ctx.moveTo(hx - 7, hy + 3); ctx.lineTo(hx + 7, hy + 1); ctx.stroke();
      eyeDot(hx + f * 3, hy - 1, 1.6, P.eye, tell);
    } else if (k === 'zombie'){
      ctx.fillStyle = rgba(C.pit, .5); ctx.fillRect(hx + f - 3, hy + 3, 7, 3);
      eyeDot(hx + f * 3, hy - 2, 1.6, P.eye, tell); eyeDot(hx - f, hy - 1, 1.1, P.eye, false);
    } else eyeDot(hx + f * 3, hy - 1, 1.5, P.eye, tell);
    if (k === 'angel'){ ctx.strokeStyle = rgba(P.light, .85); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(hx, hy - 12, 8, 2.5, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
}
function bodyBeast(m, y, col, hi, tell){
  const x = m.x, f = m.face, P = m.pal, w = m.w, h = m.h;
  const cy = y - h * .58 + (tell ? 3 : 0), bl = w * .78, bh = h * .46;
  const g = gait(m, m.state === 'charge' ? 22 : 12), lw = Math.max(4, w * .12);
  ctx.fillStyle = col;
  for (const [o, s] of [[-.32, 1], [-.18, -1], [.2, 1], [.32, -1]]) ctx.fillRect(x + f * bl * o - lw / 2 + s * g * 3, cy + bh * .1, lw, y - cy - bh * .1);
  ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - f * bl * .45, cy - 2); ctx.quadraticCurveTo(x - f * bl * .6, cy - bh * .5, x - f * (bl * .62 + 4), cy - bh * .9 + g * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, cy, bl / 2, bh / 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rgba(hi, .35); ctx.beginPath(); ctx.ellipse(x - f * 2, cy - bh * .18, bl * .38, bh * .2, 0, 0, Math.PI * 2); ctx.fill();
  const hr = h * .22, hx = x + f * (bl * .5 + hr * .2), hy = cy - bh * .35 + (tell ? 4 : 0);
  ctx.fillStyle = hi; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx + f * hr * .9, hy + hr * .3, hr * .65, hr * .42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx - f * hr * .2, hy - hr * .7); ctx.lineTo(hx - f * hr * .55, hy - hr * 1.5); ctx.lineTo(hx + f * hr * .3, hy - hr * .85); ctx.closePath(); ctx.fill();
  eyeDot(hx + f * hr * .35, hy - hr * .2, Math.max(1.5, hr * .17), P.eye, tell);
  if (tell || m.state === 'dash' || m.state === 'leap'){ ctx.fillStyle = C.bone; ctx.fillRect(hx + f * hr * .9, hy + hr * .55, f * hr * .8, 2); }
  if (m.a === 'charger'){
    ctx.strokeStyle = C.bone; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(hx + f * hr * .4, hy - hr * .6); ctx.quadraticCurveTo(hx + f * hr * 1.6, hy - hr * 1.2, hx + f * hr * 1.9, hy - hr * .2);
    ctx.moveTo(hx + f * hr * .9, hy + hr * .55); ctx.quadraticCurveTo(hx + f * hr * 1.9, hy + hr * 1.2, hx + f * hr * 2.2, hy + hr * .1);
    ctx.stroke();
  }
}
function bodyBug(m, y, col, hi, tell){
  const x = m.x, f = m.face, P = m.pal, w = m.w, h = m.h, scorp = m.name === 'Akrep';
  const cy = y - h * .5 + (tell ? 3 : 0), rx = w * .44, ry = h * .38;
  const n = m.a === 'jumper' ? 4 : 3, g = gait(m, 16);
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i < n; i++){
    const lx = x + (i - (n - 1) / 2) * (rx * 1.5 / n), dir = i < (n - 1) / 2 ? -1 : 1, wob = (i % 2 ? g : -g) * 2.5;
    ctx.moveTo(lx, cy); ctx.lineTo(lx + dir * 6 + wob, cy - ry * .6 - 3); ctx.lineTo(lx + dir * 11 + wob, y);
  }
  ctx.stroke();
  if (scorp){
    const tx = x - f * rx * .1 + (tell ? f * 6 : 0), ty = cy - h * .95;
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - f * rx * .8, cy); ctx.quadraticCurveTo(x - f * rx * 1.4, cy - h * 1.1, tx, ty); ctx.stroke();
    eyeDot(tx, ty, 3.2, P.eye, tell);
  }
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x - f * 3, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rgba(hi, .45); ctx.beginPath(); ctx.ellipse(x - f * 5, cy - ry * .35, rx * .7, ry * .35, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba(C.pit, .4); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - f * 3, cy - ry); ctx.lineTo(x - f * 3, cy + ry); ctx.stroke();
  const hr = Math.max(5, h * .22), hx = x + f * rx * .95, hy = cy + 1;
  ctx.fillStyle = hi; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hi; ctx.lineWidth = 1.5; ctx.beginPath();
  ctx.moveTo(hx + f * hr * .8, hy + 2); ctx.lineTo(hx + f * (hr + 6), hy + (tell ? 6 : 4));
  ctx.moveTo(hx + f * hr * .8, hy - 2); ctx.lineTo(hx + f * (hr + 6), hy - (tell ? 6 : 4));
  if (!scorp && m.a !== 'charger'){ ctx.moveTo(hx, hy - hr); ctx.quadraticCurveTo(hx + f * 4, hy - hr - 10, hx + f * 12, hy - hr - 9); }
  ctx.stroke();
  if (m.a === 'charger'){
    ctx.strokeStyle = C.bone; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy - hr * .6); ctx.quadraticCurveTo(hx + f * hr * 1.4, hy - hr * 2.4, hx + f * hr * 2.2, hy - hr * 1.2); ctx.stroke();
  }
  eyeDot(hx + f * hr * .35, hy - hr * .3, 1.8, P.eye, tell);
  if (m.a === 'jumper') eyeDot(hx + f * hr * .05, hy - hr * .5, 1.3, P.eye, tell);
}
function bodyCrab(m, y, col, hi, tell){
  const x = m.x, f = m.face, P = m.pal, w = m.w, h = m.h;
  const cy = y - h * .45, rx = w * .42, ry = h * .3, g = gait(m, 14);
  ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]){ const lx = x + s * rx * (.3 + i * .25); ctx.moveTo(lx, cy + 2); ctx.lineTo(lx + s * 7 + g * (i % 2 ? 2 : -2), y - 6); ctx.lineTo(lx + s * 9, y); }
  ctx.moveTo(x + f * 4, cy - ry); ctx.lineTo(x + f * 6, cy - ry - 10); ctx.moveTo(x - f * 4, cy - ry); ctx.lineTo(x - f * 3, cy - ry - 9);
  ctx.stroke();
  eyeDot(x + f * 6, cy - ry - 11, 2.4, P.eye, tell); eyeDot(x - f * 3, cy - ry - 10, 2.2, P.eye, tell);
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rgba(hi, .45); ctx.beginPath(); ctx.ellipse(x, cy - ry * .35, rx * .7, ry * .4, 0, 0, Math.PI * 2); ctx.fill();
  const cx = x - f * (rx + 4), ccy = cy - ry - 4 - (tell ? 4 : 0);
  ctx.fillStyle = hi; ctx.beginPath(); ctx.arc(cx, ccy, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rgba(C.pit, .7); ctx.beginPath(); ctx.moveTo(cx - f * 2, ccy); ctx.lineTo(cx - f * 9, ccy - 3); ctx.lineTo(cx - f * 9, ccy + 2); ctx.closePath(); ctx.fill();
}
function bodyWorm(m, y, col, hi, tell, el){
  const x = m.x, f = m.face, P = m.pal, w = m.w, h = m.h;
  if (m.a === 'burrower'){
    const H = m.state === 'erupt' ? 96 * clamp(el / .08, 0, 1) : h * (m.state === 'surface' ? clamp(el / m.dur, 0, 1) : m.state === 'dig' ? 1 - clamp(el / m.dur, 0, 1) : 1);
    if (H >= 2){
      const n = Math.max(2, Math.round(H / 11)), r0 = w * .45;
      for (let i = 0; i < n; i++){
        const k = i / (n - 1), sy = y - 4 - k * (H - r0 * .8), sx = x + Math.sin(S.t * 3 + m.seed + k * 2) * 4 * k;
        ctx.fillStyle = i % 2 ? col : hexMix(col, hi, .35); ctx.beginPath(); ctx.arc(sx, sy, r0 * (1 - .25 * k), 0, Math.PI * 2); ctx.fill();
      }
      const tx = x + Math.sin(S.t * 3 + m.seed + 2) * 4 + f * 3, ty = y - H + r0 * .2;
      ctx.fillStyle = rgba(C.pit, .9); ctx.beginPath(); ctx.ellipse(tx, ty, r0 * .55, r0 * .4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.bone;
      for (let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2 + S.t; ctx.beginPath(); ctx.arc(tx + Math.cos(a) * r0 * .42, ty + Math.sin(a) * r0 * .3, 1.4, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.fillStyle = rgba(P.mob, .9); ctx.beginPath(); ctx.ellipse(x, y, w * .65, 5, 0, Math.PI, 0); ctx.fill();
    return;
  }
  const moving = MOVING_S.has(m.state) ? 1 : 0;
  for (let i = 0; i < 5; i++){
    const k = i / 4, sx = x - f * w / 2 + f * k * w, sy = y - h * .45 - Math.abs(Math.sin(S.t * 9 + m.seed + k * 3)) * 3 * moving;
    ctx.fillStyle = i % 2 ? col : hexMix(col, hi, .35); ctx.beginPath(); ctx.arc(sx, sy, h * .45 * (.75 + .25 * k), 0, Math.PI * 2); ctx.fill();
  }
  const hx = x + f * w / 2, hy = y - h * .45;
  ctx.fillStyle = rgba(C.pit, .85); ctx.beginPath(); ctx.arc(hx + f * 3, hy, h * .2, 0, Math.PI * 2); ctx.fill();
  eyeDot(hx - f, hy - h * .28, 1.6, P.eye, tell);
}
function bodyBlob(m, y, col, hi, tell){
  const x = m.x, f = m.face, P = m.pal, wob = Math.sin(S.t * 5 + m.seed) * .05;
  let W = m.w, H = m.h;
  if (m.state === 'crouch'){ W *= 1.2; H *= .7; } else if (m.state === 'leap'){ W *= .85; H *= 1.15; } else { W *= 1 + wob; H *= 1 - wob; }
  if (m.name === 'Zıpzıp Ahtapot' || m.name === 'Mürekkep Atan'){
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i < 4; i++){ const tx = x - W * .38 + i * W * .25; ctx.moveTo(tx, y - H * .3); ctx.quadraticCurveTo(tx + Math.sin(S.t * 6 + i) * 5, y - 4, tx + Math.sin(S.t * 6 + i + 1) * 6, y); }
    ctx.stroke();
  }
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - W / 2, y); ctx.bezierCurveTo(x - W / 2, y - H * 1.3, x + W / 2, y - H * 1.3, x + W / 2, y); ctx.closePath(); ctx.fill();
  if (m.a === 'exploder' || m.name === 'Bulut Ruhu'){
    const r = W * .45, gr = ctx.createRadialGradient(x, y - H * .45, 1, x, y - H * .45, r);
    gr.addColorStop(0, rgba(P.light, m.state === 'fuse' ? .95 : .55)); gr.addColorStop(1, rgba(P.light, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y - H * .45, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = rgba(hi, .5); ctx.beginPath(); ctx.ellipse(x - W * .15, y - H * .72, W * .16, H * .12, -.5, 0, Math.PI * 2); ctx.fill();
  const ey = y - H * .55;
  for (const s of [-1, 1]){
    ctx.fillStyle = C.bone; ctx.beginPath(); ctx.arc(x + f * 4 + s * W * .14, ey, 3.2, 0, Math.PI * 2); ctx.fill();
    eyeDot(x + f * 5.5 + s * W * .14, ey, 1.5, P.eye, tell);
  }
}
function bodyBat(m, y, col, hi, tell){
  const x = m.x, f = m.face, P = m.pal, w = m.w, h = m.h, cy = y - h / 2;
  const fl = m.state === 'dive' ? -.6 : Math.sin(S.t * 18 + m.seed);
  ctx.fillStyle = col;
  for (const s of [-1, 1]){
    ctx.beginPath(); ctx.moveTo(x + s * 4, cy - 2);
    ctx.lineTo(x + s * w * .45, cy - 8 - fl * h * .45); ctx.lineTo(x + s * w * .8, cy - 2 - fl * h * .35);
    ctx.lineTo(x + s * w * .62, cy + 4 - fl * h * .15); ctx.lineTo(x + s * w * .42, cy + 2 - fl * h * .2); ctx.lineTo(x + s * w * .25, cy + 6); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = hi; ctx.beginPath(); ctx.ellipse(x, cy, h * .3, h * .38, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 5, cy - h * .25); ctx.lineTo(x - 3, cy - h * .6); ctx.lineTo(x - 1, cy - h * .3); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 5, cy - h * .25); ctx.lineTo(x + 3, cy - h * .6); ctx.lineTo(x + 1, cy - h * .3); ctx.closePath(); ctx.fill();
  eyeDot(x + f * 2 - 2.5, cy - 2, 1.6, P.eye, tell); eyeDot(x + f * 2 + 2.5, cy - 2, 1.6, P.eye, tell);
}
function bodyBird(m, y, col, hi, tell){
  const x = m.x, f = m.face, P = m.pal, w = m.w, h = m.h, cy = y - h / 2;
  const fl = m.state === 'dive' ? -.8 : Math.sin(S.t * 12 + m.seed);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(x - f * w * .3, cy); ctx.lineTo(x - f * w * .62, cy - 4); ctx.lineTo(x - f * w * .6, cy + 5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, cy, w * .34, h * .3, 0, 0, Math.PI * 2); ctx.fill();
  const hx = x + f * w * .3, hy = cy - h * .18, hr = h * .24;
  ctx.fillStyle = hi; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.ember; ctx.beginPath(); ctx.moveTo(hx + f * hr * .8, hy - 3); ctx.lineTo(hx + f * (hr + 8), hy + 1); ctx.lineTo(hx + f * hr * .8, hy + 3); ctx.closePath(); ctx.fill();
  eyeDot(hx + f * hr * .2, hy - hr * .25, 1.6, P.eye, tell);
  ctx.fillStyle = hexMix(col, hi, .3); ctx.beginPath(); ctx.moveTo(x + f * 4, cy - 2); ctx.lineTo(x - f * 4, cy - 4 - fl * h * .9); ctx.lineTo(x - f * w * .3, cy - 2 - fl * h * .6); ctx.closePath(); ctx.fill();
}
function bodyFly(m, y, col, hi, tell){
  const x = m.x, f = m.face, P = m.pal, w = m.w, h = m.h, cy = y - h / 2;
  const fl = Math.abs(Math.sin(S.t * 40 + m.seed));
  ctx.fillStyle = rgba(C.bone, .3);
  ctx.beginPath(); ctx.ellipse(x - f * 3, cy - h * .35, w * .28, 3 + fl * 4, -f * .5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x - f * 8, cy - h * .3, w * .22, 2 + fl * 3, -f * .9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = 0; i < 3; i++){ ctx.moveTo(x - 4 + i * 4, cy + 3); ctx.lineTo(x - 6 + i * 4, cy + h * .45); }
  ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x - f * 4, cy + 1, w * .3, h * .26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba(C.pit, .35); ctx.lineWidth = 1.2; ctx.beginPath();
  for (let i = 0; i < 3; i++){ ctx.moveTo(x - f * (8 - i * 4), cy - h * .2); ctx.lineTo(x - f * (8 - i * 4), cy + h * .22); }
  ctx.stroke();
  ctx.fillStyle = hi; ctx.beginPath(); ctx.arc(x + f * w * .22, cy, h * .2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = tell ? P.eye : rgba(P.eye, .75); ctx.beginPath(); ctx.arc(x + f * (w * .22 + 2), cy - 1, h * .14, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = hi; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + f * (w * .22 + h * .18), cy + 2); ctx.lineTo(x + f * (w * .22 + h * .18 + 9), cy + (m.state === 'dive' ? 2 : 6)); ctx.stroke();
}
function bodyDrone(m, y, col, hi, tell){
  const x = m.x, f = m.face, P = m.pal, w = m.w, h = m.h, cy = y - h * .45;
  ctx.strokeStyle = hi; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(x - w * .25, cy - h * .2); ctx.lineTo(x - w * .4, cy - h * .5); ctx.moveTo(x + w * .25, cy - h * .2); ctx.lineTo(x + w * .4, cy - h * .5); ctx.stroke();
  const sp = Math.abs(Math.sin(S.t * 45 + m.seed));
  ctx.fillStyle = rgba(C.bone, .45);
  for (const s of [-1, 1]){ ctx.beginPath(); ctx.ellipse(x + s * w * .4, cy - h * .52, w * .3 * (.3 + .7 * sp), 1.8, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = col; rr(x - w * .32, cy - h * .3, w * .64, h * .55, 4); ctx.fill();
  ctx.fillStyle = rgba(C.pit, .6); ctx.beginPath(); ctx.arc(x + f * w * .12, cy, h * .2, 0, Math.PI * 2); ctx.fill();
  eyeDot(x + f * w * .12, cy, h * .1, P.eye, tell);
  if (tell){ ctx.fillStyle = rgba(P.eye, .25 + .3 * Math.abs(Math.sin(S.t * 30))); ctx.beginPath(); ctx.arc(x + f * w * .12, cy, h * .35, 0, Math.PI * 2); ctx.fill(); }
}
function bodyFish(m, y, col, hi, tell){
  const x = m.x, f = m.face, P = m.pal, w = m.w, h = m.h, cy = y - h / 2, sw = Math.sin(S.t * 8 + m.seed) * 4;
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(x - f * w * .35, cy); ctx.lineTo(x - f * w * .62, cy - 8 + sw); ctx.lineTo(x - f * w * .62, cy + 8 + sw); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, cy, w * .4, h * .42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rgba(hi, .5); ctx.beginPath(); ctx.ellipse(x, cy + h * .15, w * .3, h * .18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rgba(C.pit, .85); ctx.beginPath(); ctx.ellipse(x + f * w * .3, cy + h * .12, w * .12, h * .14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.bone; for (let i = 0; i < 3; i++) ctx.fillRect(x + f * (w * .22 + i * 3), cy + h * .02, 1.5, 3);
  eyeDot(x + f * w * .15, cy - h * .15, 2, P.eye, tell);
  const lx = x + f * w * .45, ly = cy - h * .9;
  ctx.strokeStyle = hi; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + f * w * .05, cy - h * .38); ctx.quadraticCurveTo(x + f * w * .2, ly - 6, lx, ly); ctx.stroke();
  drawOrb(lx, ly, tell ? 4 : 2.8, P.light);
}
function bodyBomb(m, y, col, hi, tell){
  const x = m.x, f = m.face, w = m.w, g = gait(m, 16) * 3;
  ctx.fillStyle = hi; ctx.fillRect(x - 6 + g, y - 8, 3, 8); ctx.fillRect(x + 3 - g, y - 8, 3, 8);
  const r = w * .5, cy = y - 8 - r * .9;
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rgba(C.bone, .85); ctx.beginPath(); ctx.arc(x + f * 2, cy, r * .55, 0, Math.PI * 2); ctx.fill();
  const a = S.t * (tell ? 14 : 2);
  ctx.strokeStyle = C.pit; ctx.lineWidth = 1.5; ctx.beginPath();
  ctx.moveTo(x + f * 2, cy); ctx.lineTo(x + f * 2 + Math.cos(a) * r * .45, cy + Math.sin(a) * r * .45); ctx.moveTo(x + f * 2, cy); ctx.lineTo(x + f * 2, cy - r * .35); ctx.stroke();
  ctx.strokeStyle = C.rust; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, cy - r); ctx.quadraticCurveTo(x - f * 4, cy - r - 6, x - f * 2, cy - r - 9); ctx.stroke();
  ctx.fillStyle = tell ? C.ember : rgba(C.ember, .6 + .4 * Math.sin(S.t * 20)); ctx.beginPath(); ctx.arc(x - f * 2, cy - r - 9, tell ? 3.5 : 2.2, 0, Math.PI * 2); ctx.fill();
}
/* türün eşyası: tankın kalkanı, menzillinin silahı, şifacının asası, bombacının bombası */
function drawMobProp(m, y, hi, el, pulse, vis){
  const x = m.x, f = m.face, P = m.pal, w = m.w, h = m.h, t = S.t;
  if (m.a === 'tank'){
    let sx = x + f * (w / 2 + 2), sy = y - h * .96, sh = h * .85;
    if (m.state === 'bashWind') sx -= f * 4;
    if (m.state === 'bash') sx += f * 12;
    if (m.state === 'open'){ sx = x + f * (w / 2 - 5); sy = y - h * .46; sh = h * .46; }
    ctx.fillStyle = P.wallHi; rr(sx - 6, sy, 12, sh, 3); ctx.fill();
    ctx.strokeStyle = m.state === 'bashWind' ? rgba(C.blood, .5 + .5 * pulse) : rgba(P.eye, .5); ctx.lineWidth = m.state === 'bashWind' ? 3 : 2;
    rr(sx - 6, sy, 12, sh, 3); ctx.stroke();
    if (m.turnT > 0){ ctx.fillStyle = rgba(C.bone, .5); ctx.fillRect(x - 12, y - h - 10, 24 * (m.turnT / .7), 2); }
  } else if (m.a === 'ranged'){
    const bx = x + f * 12, by = y - 30;
    if (m.proj === 'arrow'){
      const pull = m.state === 'aim' ? clamp(el / (m.dur - .18), 0, 1) * 8 : 0;
      ctx.strokeStyle = C.rust; ctx.lineWidth = 3; ctx.beginPath();
      if (f > 0) ctx.arc(bx - 6, by, 16, -1.1, 1.1); else ctx.arc(bx + 6, by, 16, Math.PI - 1.1, Math.PI + 1.1);
      ctx.stroke();
      const ex = bx - f * 6 + f * Math.cos(1.1) * 16;
      ctx.strokeStyle = rgba(C.bone, .7); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ex, by - Math.sin(1.1) * 16); ctx.lineTo(ex - f * pull, by); ctx.lineTo(ex, by + Math.sin(1.1) * 16); ctx.stroke();
    } else if (m.proj === 'bullet'){
      ctx.fillStyle = P.wallHi; ctx.fillRect(f > 0 ? bx - 4 : bx - 18, by - 4, 22, 7);
    } else drawOrb(bx, by - 4, m.state === 'aim' ? 5 + 2 * pulse : 3.5, m.el ? elCol(m.el) : P.light);
    if (m.state === 'aim' && vis){
      const locked = el >= m.dur - .18, k = clamp(el / (m.dur - .18), 0, 1);
      const col = locked ? rgba(C.ember, .6 + .4 * pulse) : rgba(C.ember, .12 + .3 * k), lw = locked ? 2.5 : 1.5;
      if (m.v){
        /* üçlü atış: üç nişan çizgisi */
        const a0 = Math.atan2(m.aimY - by, m.aimX - bx), L = Math.hypot(m.aimX - bx, m.aimY - by);
        for (const o of [-.17, 0, .17]) dashedLine(bx, by, bx + Math.cos(a0 + o) * L, by + Math.sin(a0 + o) * L, col, lw);
      } else dashedLine(bx, by, m.aimX, m.aimY, col, lw);
    }
  } else if (m.a === 'runner'){
    if (HUMANOID.has(m.body) || m.body === 'fish'){
      const top = y - h * (m.state === 'wind' ? .82 : 1), hy = top + h * .57, len = m.body === 'angel' ? 34 : 24;
      ctx.strokeStyle = m.body === 'angel' ? P.light : C.bone; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + f * 8, hy); ctx.lineTo(x + f * len, hy + (m.state === 'dash' ? 0 : 8)); ctx.stroke();
    }
  } else if (m.a === 'healer'){
    const sx = x + f * (w / 2 + 3);
    ctx.strokeStyle = C.rust; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx, y - h - 4); ctx.stroke();
    drawOrb(sx, y - h - 8, m.state === 'chant' ? 4 + 2 * pulse : 3, '#7de08a');
  } else if (m.a === 'lobber'){
    const k = m.state === 'windup' ? clamp(el / m.dur, 0, 1) : 0;
    const bx = m.state === 'windup' ? x - f * (4 + 6 * k) : x + f * (w / 2 + 2), by = m.state === 'windup' ? y - h - 6 - 8 * k : y - h * .45;
    ctx.strokeStyle = hi; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y - h * .68); ctx.lineTo(bx, by + 4); ctx.stroke();
    ctx.fillStyle = C.pit; ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = m.el ? elCol(m.el) : P.light; ctx.beginPath(); ctx.arc(bx - 1.5, by - 1.5, 2.5, 0, Math.PI * 2); ctx.fill();
  } else if (m.a === 'charger' && m.state === 'dazed'){
    ctx.fillStyle = C.bone;
    for (let i = 0; i < 3; i++){ const a = t * 7 + i * 2.1; ctx.fillRect(x + Math.cos(a) * 16 - 2, y - h - 6 + Math.sin(a) * 4 - 2, 4, 4); }
  }
  if (m.state === 'dash' || m.state === 'charge'){
    const top = y - h;
    ctx.strokeStyle = rgba(C.dust, .4); ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < 3; i++){ ctx.moveTo(x - f * (w / 2 + 2 + i * 10), top + 10 + i * h * .22); ctx.lineTo(x - f * (w / 2 + 22 + i * 12), top + 10 + i * h * .22); }
    ctx.stroke();
  }
}
/* bombacının havadaki bombası ve yere düşmüş, patlamayı bekleyen bombalar */
function drawGrenades(){
  for (const g of S.grenades){
    const k = clamp((S.t - g.t0) / g.dur, 0, 1);
    const x = g.x0 + (g.x1 - g.x0) * k, y = g.y0 + (g.y1 - 8 - g.y0) * k - Math.sin(k * Math.PI) * (110 + Math.abs(g.x1 - g.x0) * .15);
    ctx.fillStyle = C.pit; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = g.col; ctx.beginPath(); ctx.arc(x - 1.5, y - 1.5, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(C.ember, .5 + .5 * Math.sin(S.t * 30)); ctx.fillRect(x - 1, y - 9, 2, 3);
  }
  for (const b of S.bombs){
    if (b.rain){
      const left = b.at - S.t, y = b.y - 20;
      if (left < .4){
        const k = 1 - left / .4, fy = -40 + (y + 40) * k;
        ctx.strokeStyle = b.col; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(b.x, fy - 34); ctx.lineTo(b.x, fy); ctx.stroke();
        drawOrb(b.x, fy, 6, b.col);
      }
      continue;
    }
    if (!b.lead) continue;
    const y = b.y - 26;
    ctx.fillStyle = C.pit; ctx.beginPath(); ctx.arc(b.x, y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = b.col || C.ember; ctx.beginPath(); ctx.arc(b.x - 1.5, y - 1.5, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(C.ember, .5 + .5 * Math.sin(S.t * 40)); ctx.fillRect(b.x - 1, y - 9, 2, 3);
  }
}
function mobTint(m){
  if (!m.aff.length) return null;
  if (m.enraged) return AFFIX.ofkeli.col;
  if (m.aff.includes('zirhli') && m.hp > m.max * .6) return AFFIX.zirhli.col;
  if (m.aff.includes('yenilenen') && m.hp < m.max && S.t - m.lastHitT > 2) return AFFIX.yenilenen.col;
  if (m.aff.includes('patlayan')) return AFFIX.patlayan.col;
  return null;
}
function drawMob(m){
  if (m.a === 'burrower' && (m.state === 'under' || m.state === 'rumble')) return;
  const t = S.t, el = m.ck - m.st, f = m.face, P = m.pal, air = m.a === 'flyer';
  const rise = m.state === 'spawn' ? clamp(el / m.dur, 0, 1) : 1;
  const invis = t < m.invisUntil;
  ctx.save();
  if (invis) ctx.globalAlpha = .14 + .06 * Math.sin(t * 14);
  else if (air && rise < 1) ctx.globalAlpha = rise;
  if (rise < 1 && !air){ ctx.beginPath(); ctx.rect(m.x - 70, 0, 140, m.home.y); ctx.clip(); }
  const y = m.y + (air ? 0 : (1 - rise) * (m.h + 6));
  const pulse = .5 + .5 * Math.sin(t * 18);
  /* elit durum rengi: öfkeli mor, zırhı aktif kırmızı, can yeniliyorsa sarı, patlayan turuncu nabız */
  const tint = mobTint(m);
  const tk = tint ? (tint === AFFIX.patlayan.col ? .35 + .3 * Math.sin(t * 6) : .68) : 0;
  let col = m.flash > 0 ? C.bone : tint ? hexMix(P.mob, tint, tk) : P.mob;
  const hi = m.flash > 0 ? C.bone : tint ? hexMix(P.mobHi, tint, tk * .7) : P.mobHi;
  if (tint && !invis && rise >= 1){
    const ag = ctx.createRadialGradient(m.x, y - m.h / 2, 4, m.x, y - m.h / 2, m.h * .95);
    ag.addColorStop(0, rgba(tint, .34)); ag.addColorStop(1, rgba(tint, 0));
    ctx.fillStyle = ag; ctx.fillRect(m.x - m.h, y - m.h * 1.4, m.h * 2, m.h * 1.6);
  }
  if (invis){ ctx.strokeStyle = rgba(AFFIX.gorunmez.col, .9); ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.strokeRect(m.x - m.w / 2 - 3, y - m.h - 3, m.w + 6, m.h + 3); ctx.setLineDash([]); }
  const tell = TELL_S.has(m.state), vis = rise >= 1 && !invis;
  if (m.a === 'exploder' && m.state === 'fuse'){
    const sc = 1 + .22 * clamp(el / m.dur, 0, 1) + .04 * pulse;
    ctx.translate(m.x, y); ctx.scale(sc, sc); ctx.translate(-m.x, -y);
    col = hexMix(col, '#ffffff', .2 + .5 * pulse);
  }
  drawMobBody(m, y, col, hi, tell, el);
  drawMobProp(m, y, hi, el, pulse, vis);
  if (t < m.slowUntil){ ctx.fillStyle = rgba(elCol('buz'), .22); ctx.fillRect(m.x - m.w / 2 - 4, y - m.h - 4, m.w + 8, m.h + 4); }
  ctx.restore();
  if (invis || rise < 1) return;
  if (t < m.poisonUntil){ ctx.fillStyle = rgba(elCol('zehir'), .8); for (let i = 0; i < 3; i++) ctx.fillRect(m.x - 10 + i * 9, m.y - m.h - 4 - ((t * 30 + i * 7) % 14), 3, 3); }
  if (t < m.stunUntil){ ctx.fillStyle = elCol('yildirim'); for (let i = 0; i < 3; i++){ const a = t * 6 + i * 2.1; ctx.fillRect(m.x + Math.cos(a) * 14 - 2, m.y - m.h - 8 + Math.sin(a) * 4 - 2, 4, 4); } }
  if (m.hp < m.max){
    ctx.fillStyle = rgba(C.pit, .8); ctx.fillRect(m.x - 14, m.y - m.h - 16, 28, 4);
    ctx.fillStyle = C.blood; ctx.fillRect(m.x - 14, m.y - m.h - 16, 28 * m.hp / m.max, 4);
  }
  if (m.aff.length){
    ctx.font = `600 10px ${F_MONO}`; ctx.textAlign = 'center';
    ctx.fillStyle = AFFIX[m.aff[0]].col;
    ctx.fillText(m.aff.map(a => AFFIX[a].ad.toUpperCase()).join(' · '), m.x, m.y - m.h - 22);
  }
  if (ALERT_S.has(m.state)) drawAlert(m.x, m.y - m.h - (m.a === 'tank' ? 26 : 20), m.a === 'exploder' ? AFFIX.patlayan.col : C.blood);
}
/* ---------- oyuncu çizimi (eşyalara göre) ---------- */
function gearCls(slot){ const it = ITEM_BY_ID[equip[slot]]; return it && it.cls ? it.cls : null; }
function drawBodyShape(x, y, col, outfit){
  ctx.fillStyle = col; rr(x - 11, y - 30, 22, 30, 5); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y - 38, 8, 0, Math.PI * 2); ctx.fill();
  if (outfit){ ctx.fillStyle = outfit; rr(x - 11, y - 30, 22, 18, 5); ctx.fill(); }
  ctx.fillStyle = rgba(C.pit, .22); rr(x - 11, y - 11, 22, 11, 4); ctx.fill();
}
/* oyuncunun görünümü: zırh renkleri, silah, saldırı anı, nişan, kalkan, dodge. Co-op'ta takım arkadaşlarına da gönderilir. */
function heroLook(){
  const p = S.p, st = p.st, t = S.t;
  return {ae:Math.round(Math.min(3, t - p.atkT) * 1000) / 1000, wk:st.wd.kind, el:st.wEl || 0, rd:t - p.atkT >= st.atkCd ? 1 : 0,
    bl:p.blocking ? (t - p.blockStart < st.parryWin ? 2 : 1) : 0, dg:t < p.dodgeUntil ? p.dodgeDir : 0, ds:st.def.shadow ? 1 : st.def.bash ? 2 : 0,
    ifr:t < p.ifrUntil ? 1 : 0, hb:S.mode === 'play' && t < p.hurtUntil ? 1 : 0, g:[gearCls('kiyafet') || 0, gearCls('sapka') || 0, gearCls('pantolon') || 0],
    br:p.barrier > 0 && t < p.barrierUntil ? 1 : 0, am:Math.round(Math.atan2(mouse.y - (p.y - 30), mouse.x - p.x) * 100) / 100,
    pw:t < (p.powerUntil || -9) ? 1 : 0, cr:t < (p.critUntil || -9) ? 1 : 0};
}
/* bir oyuncuyu çiz: kendin ya da takım arkadaşın */
function drawHero(x, y, f, h){
  const t = S.t;
  if (h.hb && Math.floor(performance.now() / 62.5) % 2 === 0) return;
  const [body, hat, pants] = h.g || [0, 0, 0], outfit = body ? CLASSES[body].col : null;
  if (h.dg){
    const gc = h.ds === 1 ? '#b9a4e8' : h.ds === 2 ? C.stoneHi : C.frost;
    for (let k = 3; k >= 1; k--){ ctx.globalAlpha = .16 * (4 - k); drawBodyShape(x - h.dg * k * 15, y, gc); }
    ctx.globalAlpha = 1;
    if (h.ds === 2){ ctx.fillStyle = C.stoneHi; rr(x + h.dg * 14 - 6, y - 50, 12, 46, 3); ctx.fill(); ctx.strokeStyle = rgba(C.frost, .8); ctx.lineWidth = 2; ctx.stroke(); }
  }
  if (h.pw && !h.dg){ ctx.strokeStyle = rgba(C.ember, .5 + .4 * Math.sin(t * 20)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + f * 12, y - 30, 9, 0, Math.PI * 2); ctx.stroke(); }
  if (h.cr){ ctx.fillStyle = rgba('#b9a4e8', .5 + .4 * Math.sin(t * 20)); ctx.beginPath(); ctx.arc(x, y - 58, 3.5, 0, Math.PI * 2); ctx.fill(); }
  drawBodyShape(x, y, h.ifr ? C.frost : C.bone, h.ifr ? null : outfit);
  if (pants && !h.ifr){ ctx.fillStyle = rgba(CLASSES[pants].col, .9); ctx.fillRect(x - 10, y - 12, 8, 12); ctx.fillRect(x + 2, y - 12, 8, 12); }
  ctx.fillStyle = C.pit; ctx.fillRect(x + f * 3 - 1.5, y - 40, 3, 3);
  /* şapka */
  if (hat){
    ctx.fillStyle = CLASSES[hat].col;
    if (hat === 'okcu'){ ctx.beginPath(); ctx.moveTo(x - 10, y - 36); ctx.lineTo(x - f * 6, y - 52); ctx.lineTo(x + 10, y - 36); ctx.closePath(); ctx.fill(); }
    else if (hat === 'suikastci'){ ctx.fillRect(x - 9, y - 41, 18, 5); }
    else if (hat === 'tank'){ ctx.fillRect(x - 10, y - 47, 20, 10); ctx.fillStyle = C.pit; ctx.fillRect(x + f * 2 - 5, y - 41, 10, 2); }
    else { ctx.fillRect(x - 13, y - 44, 26, 3); ctx.beginPath(); ctx.moveTo(x - 8, y - 44); ctx.lineTo(x - f * 4, y - 64); ctx.lineTo(x + 8, y - 44); ctx.fill(); }
  }
  /* silah */
  const ae = h.ae, aimA = h.am || 0, wk = h.wk || 'fist', wEl = h.el || null;
  ctx.lineCap = 'round';
  if (wk === 'bow'){
    const a = Math.abs(aimA) < Math.PI / 2 === (f > 0) ? aimA : (f > 0 ? 0 : Math.PI);
    const bx = x + Math.cos(a) * 14, by = y - 30 + Math.sin(a) * 14;
    ctx.strokeStyle = C.rust; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(bx - Math.cos(a) * 6, by - Math.sin(a) * 6, 15, a - 1.1, a + 1.1); ctx.stroke();
    if (h.local && S.mode === 'play' && !paused){ ctx.strokeStyle = rgba(C.bone, .16); ctx.lineWidth = 1; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(aimA) * 70, by + Math.sin(aimA) * 70); ctx.stroke(); ctx.setLineDash([]); }
  } else if (wk === 'staff'){
    /* atış anında asa nişan yönüne doğru eğilir */
    const sx = x + f * 13, lean = ae < .25 ? (1 - ae / .25) * .5 : 0;
    const tx = sx + Math.cos(aimA) * 20 * lean, ty = y - 54 + (Math.sin(aimA) + 1) * 14 * lean;
    ctx.strokeStyle = C.dust; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, y - 2); ctx.lineTo(tx, ty); ctx.stroke();
    drawOrb(tx, ty - 4, h.rd ? 5 : 3, wEl ? elCol(wEl) : C.frost);
    if (ae < .18){ ctx.globalAlpha = 1 - ae / .18; drawOrb(tx, ty - 4, 10, wEl ? elCol(wEl) : C.frost); ctx.globalAlpha = 1; }
  } else if (wk === 'shield'){
    const blocking = h.bl > 0, sx = x + f * (blocking ? 16 : 10), sy = blocking ? y - 46 : y - 34;
    ctx.fillStyle = h.bl === 2 ? C.ember : C.stoneHi; rr(sx - 5, sy, 10, blocking ? 40 : 26, 3); ctx.fill();
    ctx.strokeStyle = blocking ? C.frost : C.rust; ctx.lineWidth = 2; rr(sx - 5, sy, 10, blocking ? 40 : 26, 3); ctx.stroke();
  } else if (wk === 'hammer' && ae >= .3){
    ctx.strokeStyle = C.rust; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + f * 6, y - 20); ctx.lineTo(x + f * 10, y - 56); ctx.stroke();
    ctx.fillStyle = C.stoneHi; ctx.fillRect(x + f * 10 - 9, y - 64, 18, 12);
  }
  const mm = MELEE[wk];
  if (mm && ae < mm.b){
    const k = ae / mm.b, rad = wk === 'hammer' ? 62 : wk === 'dagger' ? 32 : wk === 'fist' ? 26 : 42;
    const a0 = wk === 'hammer' ? -1.9 : -1.1, a1 = .7;
    ctx.strokeStyle = rgba(wEl ? elCol(wEl) : C.bone, ae >= mm.a ? .95 : .4); ctx.lineWidth = ae >= mm.a ? 5 : 2;
    ctx.beginPath();
    if (f > 0) ctx.arc(x + 4, y - 26, rad, a0, a0 + (a1 - a0) * Math.min(1, k * 1.4));
    else ctx.arc(x - 4, y - 26, rad, Math.PI - a0, Math.PI - a0 - (a1 - a0) * Math.min(1, k * 1.4), true);
    ctx.stroke();
  } else if (wk === 'dagger' || wk === 'fist'){
    ctx.strokeStyle = C.dust; ctx.lineWidth = wk === 'dagger' ? 3 : 4;
    ctx.beginPath(); ctx.moveTo(x + f * 8, y - 18); ctx.lineTo(x + f * (wk === 'dagger' ? 18 : 14), y - (wk === 'dagger' ? 10 : 18)); ctx.stroke();
  }
  if (h.br){ ctx.strokeStyle = rgba(C.frost, .6 + .3 * Math.sin(t * 8)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - 24, 22, 30, 0, 0, Math.PI * 2); ctx.stroke(); }
}
function drawPlayer(){
  const p = S.p, t = S.t, st = p.st;
  if (p.dead){
    const left = Math.max(0, p.respawnAt - t);
    ctx.globalAlpha = .4; ctx.fillStyle = C.frost; rr(p.x - 9, p.y - 22, 18, 22, 6); ctx.fill(); ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.font = `700 64px ${F_DISPLAY}`; ctx.fillStyle = C.bone; ctx.fillText(String(Math.ceil(left)), W / 2, 210);
    ctx.font = `500 16px ${F_BODY}`; ctx.fillStyle = C.dust; ctx.fillText('saniye sonra yeniden doğacaksın', W / 2, 236);
    return;
  }
  drawHero(p.x, p.y, p.face, Object.assign(heroLook(), {local:true}));
  /* ışınlanma hedefi */
  if (st.def.blink && S.mode === 'play' && !paused && t - p.dodgeT >= st.dodgeCd){
    let dx = mouse.x - p.x, dy = mouse.y - (p.y - p.h / 2); const d = Math.hypot(dx, dy);
    if (d > st.def.range){ dx *= st.def.range / d; dy *= st.def.range / d; }
    ctx.strokeStyle = rgba(C.frost, .35); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(p.x + dx, p.y - p.h / 2 + dy + 23, 12, 4, 0, 0, Math.PI * 2); ctx.stroke();
  }
}
function drawFx(){
  for (const f of S.fx){ ctx.globalAlpha = 1 - f.age / f.life; ctx.fillStyle = f.col; ctx.fillRect(f.x - f.sz / 2, f.y - f.sz / 2, f.sz, f.sz); }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const tx of S.texts){
    ctx.globalAlpha = 1 - tx.age / tx.life;
    ctx.font = `600 ${tx.size}px ${F_BODY}`; ctx.fillStyle = tx.col;
    ctx.fillText(tx.txt, tx.x, tx.y);
  }
  ctx.globalAlpha = 1;
}
function strokeBox(b, col){ ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.strokeRect(b.l, b.t, b.r - b.l, b.b - b.t); }
function drawBoxes(){
  const p = S.p, e = S.e, t = S.t;
  strokeBox(pRect(), C.frost);
  const mm = MELEE[p.st.wd.kind], ae = t - p.atkT;
  if (mm && ae >= mm.a && ae <= mm.b) strokeBox(meleeBox(p), C.bone);
  if (e && e.hp > 0){
    strokeBox(tRect(e), C.bone);
    if (e.state === 'lunge') strokeBox(lungeBox(e), C.blood);
    if (e.state === 'rowStrike') for (const r of e.rows){ const [a, b] = ROW_BAND[r]; strokeBox({l:WALL, r:W - WALL, t:a, b:b}, C.blood); }
  }
  for (const m of S.mobs){
    strokeBox(tRect(m), C.bone);
    if (m.state === 'bash') strokeBox(bashBox(m), C.blood);
    if (m.state === 'dash') strokeBox(dashBox(m), C.blood);
  }
  for (const w of S.quakes) strokeBox(quakeRect(w), C.blood);
  S.traps.forEach(tr => { if (trapPhase(tr, t).st === 'up') strokeBox({l:tr.x, r:tr.x + tr.w, t:tr.y - 18, b:tr.y}, C.blood); });
}
function setSpacing(px){ if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; }
const iconImgs = {};
function iconImg(it){
  let im = iconImgs[it.id];
  if (!im){ im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(itemIconSVG(it, 64, true)); iconImgs[it.id] = im; }
  return im;
}
function bar(x, y, w, h, k, col, bg){
  ctx.fillStyle = bg || rgba(C.pit, .8); ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(k, 0, 1), h);
}
function drawHud(){
  const p = S.p, e = S.e, t = S.t, st = p.st;
  ctx.textBaseline = 'alphabetic';
  /* oyuncu canı */
  ctx.textAlign = 'left'; ctx.font = `600 11px ${F_MONO}`; ctx.fillStyle = C.dust;
  ctx.fillText(`CAN ${Math.ceil(p.hp)} / ${st.maxHp}`, 40, 26);
  bar(40, 32, 180, 9, p.hp / st.maxHp, p.hp / st.maxHp < .3 ? C.blood : C.bone);
  ctx.strokeStyle = C.stoneHi; ctx.lineWidth = 1; ctx.strokeRect(39.5, 31.5, 181, 10);
  ctx.fillStyle = C.dust; ctx.fillText(`${sel.c}-${sel.s} · ${S.ch.ad}`, 40, 58);
  /* boss ya da dalga */
  ctx.textAlign = 'center';
  if (e){
    setSpacing(3); ctx.font = `600 12px ${F_BODY}`; ctx.fillStyle = C.dust;
    ctx.fillText(e.def.ad.toLocaleUpperCase('tr'), W / 2, 26);
    setSpacing(0);
    const bx = W / 2 - 200, by = 34, bw = 400;
    ctx.fillStyle = rgba(C.pit, .85); ctx.fillRect(bx, by, bw, 9);
    ctx.fillStyle = rgba(C.bone, .35); ctx.fillRect(bx, by, bw * Math.max(0, e.shown) / e.max, 9);
    ctx.fillStyle = C.blood; ctx.fillRect(bx, by, bw * Math.max(0, e.hp) / e.max, 9);
    ctx.strokeStyle = C.stoneHi; ctx.lineWidth = 1; ctx.strokeRect(bx - .5, by - .5, bw + 1, 10);
    ctx.fillStyle = rgba(C.bone, .7); ctx.fillRect(bx + bw / 2 - 1, by - 3, 2, 15);
    ctx.font = `500 11px ${F_MONO}`; ctx.fillStyle = e.phase === 2 ? C.ember : C.dust;
    ctx.fillText(`${e.phase === 2 ? '2. AŞAMA · ' : ''}zayıflık ${e.weak ? elAd(e.weak) : 'yok'}`, W / 2, 58);
  } else if (S.L.waves){
    setSpacing(3); ctx.font = `600 12px ${F_BODY}`; ctx.fillStyle = C.dust;
    ctx.fillText(`DALGA ${S.wave + 1} / ${S.L.waves.length}`, W / 2, 28);
    setSpacing(0);
    if (S.mode === 'play'){
      ctx.font = `500 13px ${F_MONO}`; ctx.fillStyle = S.mobs.length ? C.bone : C.ember;
      ctx.fillText(S.mobs.length ? `kalan düşman ${S.mobs.length}` : (S.wave < S.L.waves.length - 1 ? 'sıradaki dalga geliyor' : ''), W / 2, 46);
    }
  }
  ctx.textAlign = 'right'; ctx.font = `600 12px ${F_MONO}`;
  ctx.fillStyle = C.ember; ctx.fillText('ALTIN ' + S.gold, W - 40, 30);
  ctx.fillStyle = C.dust; ctx.fillText('DENEME ' + (att[attKey()] || 0), W - 40, 48);
  /* savunma ve yetenek göstergeleri */
  const dk = clamp((t - p.dodgeT) / st.dodgeCd, 0, 1);
  ctx.textAlign = 'left'; ctx.font = `600 11px ${F_MONO}`;
  ctx.fillStyle = dk >= 1 ? C.frost : C.dust; ctx.fillText(st.def.blink ? 'IŞINLAN' : 'DODGE', 40, 515);
  bar(108, 506, 90, 7, dk, dk >= 1 ? C.frost : rgba(C.frost, .45));
  if (st.wd.kind === 'shield'){
    ctx.fillStyle = p.blocking ? C.frost : C.dust; ctx.fillText('KALKAN', 216, 515);
    bar(276, 506, 40, 7, p.blocking ? 1 : 0, C.frost);
  }
  if (st.wd.kind === 'staff' && st.atkCd > 1){
    const ak = clamp((t - p.atkT) / st.atkCd, 0, 1);
    ctx.fillStyle = ak >= 1 ? C.ember : C.dust; ctx.fillText(st.wd.ad.split(' ')[0].toLocaleUpperCase('tr'), 216, 515);
    bar(296, 506, 70, 7, ak, ak >= 1 ? C.ember : rgba(C.ember, .45));
  }
  /* kuşanılı silahın ikonu */
  if (st.weapon){
    const im = iconImg(st.weapon);
    if (im.complete && im.naturalWidth){
      /* telefonda sağ alt köşe tuşların altında kalır, silah üstte gösterilir */
      const wy = touchMode ? 58 : 491;
      ctx.drawImage(im, W - 40 - 30, wy, 30, 30);
      ctx.textAlign = 'right'; ctx.font = `600 11px ${F_MONO}`; ctx.fillStyle = C.dust;
      ctx.fillText(st.weapon.ad.toLocaleUpperCase('tr'), W - 40 - 38, wy + 20);
    }
  }
  if (S.banner && S.mode === 'play'){
    const a = S.t - S.banner.t;
    if (a < 1.7){
      ctx.globalAlpha = a < .2 ? a / .2 : Math.max(0, 1 - (a - 1.1) / .6);
      ctx.textAlign = 'center'; ctx.font = `700 54px ${F_DISPLAY}`; ctx.fillStyle = C.ember;
      ctx.fillText(S.banner.txt, W / 2, 190);
      if (S.banner.sub){ ctx.font = `500 16px ${F_BODY}`; ctx.fillStyle = C.bone; ctx.fillText(S.banner.sub, W / 2, 218); }
      ctx.globalAlpha = 1;
    }
  }
}
function centerLine(txt, col, font, y){ ctx.font = font; ctx.fillStyle = col; ctx.fillText(txt, W / 2, y); }
/* bölüm sonu ekranında bulunan eşyaların ikonları */
function drawLootLine(y, note){
  const ids = S.loot;
  ctx.textAlign = 'center';
  if (!ids.length){ centerLine(`Bu sefer eşya düşmedi. ${note}`.trim(), C.dust, `500 15px ${F_BODY}`, y + 10); return; }
  centerLine(`Bulunan eşyalar${note ? ' · ' + note : ''}`, C.dust, `500 14px ${F_BODY}`, y);
  const n = Math.min(ids.length, 8), sz = 36, gap = 8, x0 = W / 2 - (n * sz + (n - 1) * gap) / 2;
  for (let i = 0; i < n; i++){
    const it = ITEM_BY_ID[ids[i]], im = iconImg(it);
    if (im.complete && im.naturalWidth) ctx.drawImage(im, x0 + i * (sz + gap), y + 10, sz, sz);
  }
  if (ids.length > n) centerLine(`+${ids.length - n} eşya daha`, C.dust, `500 13px ${F_BODY}`, y + 64);
  else if (n === 1) centerLine(ITEM_BY_ID[ids[0]].ad, ITEM_BY_ID[ids[0]].rare ? '#f2c14e' : C.bone, `600 14px ${F_BODY}`, y + 64);
}
/* oyun içinde düşen eşyanın ikonu yükselir */
function drawDrops(){
  for (const d of S.drops){
    const a = S.t - d.t; if (a > 2.4) continue;
    const it = ITEM_BY_ID[d.id], im = iconImg(it);
    const y = d.y - 20 - Math.min(1, a / .4) * 34;
    ctx.globalAlpha = a > 1.8 ? Math.max(0, 1 - (a - 1.8) / .6) : 1;
    if (it.rare){ const g = ctx.createRadialGradient(d.x, y, 4, d.x, y, 40); g.addColorStop(0, rgba('#f2c14e', .5)); g.addColorStop(1, rgba('#f2c14e', 0)); ctx.fillStyle = g; ctx.fillRect(d.x - 40, y - 40, 80, 80); }
    if (im.complete && im.naturalWidth) ctx.drawImage(im, d.x - 17, y - 17, 34, 34);
    ctx.textAlign = 'center'; ctx.font = `600 13px ${F_BODY}`; ctx.fillStyle = it.rare ? '#f2c14e' : C.bone;
    ctx.fillText((d.src ? d.src + ': ' : '') + it.ad, d.x, y + 32);
    ctx.globalAlpha = 1;
  }
}
function drawOverlay(){
  if (S.mode === 'play' && !paused) return;
  ctx.fillStyle = rgba(C.pit, .76); ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  const L = S.L, p = S.p, e = S.e, st = p.st;
  const kindAd = L.kind === 'boss' ? 'SON DÖVÜŞ' : L.kind === 'mini' ? 'BOSS' : 'NORMAL BÖLÜM';
  const sub = `${sel.c}-${sel.s}  ·  ${S.ch.ad.toLocaleUpperCase('tr')}  ·  ${kindAd}`;
  if (S.mode === 'title'){
    centerLine(L.boss ? BOSSES[L.boss].ad : S.ch.ad, C.bone, `700 84px ${F_DISPLAY}`, 214);
    setSpacing(4); centerLine(sub, C.ember, `600 14px ${F_BODY}`, 254); setSpacing(0);
    centerLine(touchMode ? 'Başlamak için dokun' : "Başlamak için tıkla ya da Enter'a bas", C.bone, `500 20px ${F_BODY}`, 314);
    const cls = st.wd.cls ? CLASSES[st.wd.cls].ad : 'Class yok';
    centerLine(`${cls} · ${st.weapon ? st.weapon.ad : 'Yumruk'} · can ${st.maxHp}`, C.dust, `400 16px ${F_BODY}`, 346);
    if (st.synced) centerLine(`${st.synced} eşyan ${sel.c}. bölüm gücüne senkronlandı`, C.frost, `500 15px ${F_BODY}`, 374);
    centerLine('Bölümü ve eşyaları sayfanın altından değiştirebilirsin', C.dust, `400 14px ${F_BODY}`, 430);
  } else if (S.mode === 'play' && paused){
    centerLine('Duraklatıldı', C.bone, `700 72px ${F_DISPLAY}`, 240);
    centerLine(touchMode ? 'Devam etmek için Devam düğmesine dokun' : "Devam etmek için oyun alanına tıkla ya da Esc'ye bas", C.dust, `500 18px ${F_BODY}`, 290);
    if (!touchMode) centerLine("Ana ekrana dönmek için M'ye bas", C.dust, `500 16px ${F_BODY}`, 320);
  } else if (S.mode === 'dead'){
    centerLine('Öldün', C.blood, `700 96px ${F_DISPLAY}`, 220);
    const info = e ? `${e.def.ad}: ${Math.max(0, Math.ceil(e.hp))} / ${e.max} can kaldı   ·   kaçtığın saldırı ${S.dodged}`
                   : `Dalga ${S.wave + 1} / ${L.waves.length}   ·   altın ${S.gold}   ·   kaçtığın saldırı ${S.dodged}`;
    centerLine(info, C.dust, `500 17px ${F_BODY}`, 270);
    if (lobby.ch && lobby.others.length) centerLine('Takımda ayakta kimse kalmadı', C.ember, `500 15px ${F_BODY}`, 296);
    centerLine(touchMode ? 'Tekrar denemek için ekrana dokun' : "Tekrar denemek için tıkla ya da R'ye bas", C.bone, `500 20px ${F_BODY}`, 322);
    drawLootLine(372, 'Ölünce bir şey kaybetmezsin.');
    if (!touchMode) centerLine('Eşyalarını değiştirmek için sayfanın altındaki envantere bak', C.dust, `400 14px ${F_BODY}`, 440);
  } else if (S.mode === 'won'){
    centerLine(e ? `${e.def.ad} düştü` : 'Bölüm temizlendi', C.ember, `700 76px ${F_DISPLAY}`, 220);
    centerLine(`${att[attKey()] || 0}. denemede   ·   +${S.gold} altın   ·   kalan can ${Math.ceil(p.hp)} / ${st.maxHp}`, C.dust, `500 17px ${F_BODY}`, 270);
    const nextOk = sel.s < 50 ? unlocked(sel.c, sel.s + 1) : sel.c < 10 && unlocked(sel.c + 1, 1);
    const an = S.autoNext, left = an ? Math.max(0, Math.ceil((an.at - performance.now()) / 1000)) : 0;
    const nextTxt = an ? `Sıradaki bölüm ${an.c}-${an.s}, ${left} sn sonra başlıyor` + (lobby.role === 'host' ? (touchMode ? ' · durdurmak için Ana ekran' : ' · durdurmak için M') : '')
      : lobby.role === 'guest' && lobby.ch ? "Sıradaki bölümü lobi sahibi seçer" : touchMode ? 'Aşağıdaki düğmelerle devam et' : nextOk
      ? (sel.s < 50 ? `Sıradaki bölüm için N'ye, tekrar için R'ye bas` : `${sel.c + 1}. bölüme geçmek için N'ye bas`)
      : (sel.c === 10 && sel.s === 50 ? 'Oyunun sonuna geldin' : "Tekrar için R'ye bas");
    centerLine(nextTxt, C.bone, `500 20px ${F_BODY}`, 322);
    drawLootLine(372, S.unlockedNext ? 'Yeni bölüm açıldı.' : '');
  }
}
function render(now){
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
  ctx.save();
  if (S.shake > 0) ctx.translate(rand(-1, 1) * S.shake, rand(-1, 1) * S.shake);
  drawBackdrop(now);
  drawArena();
  drawTraps();
  drawTelegraphs();
  if (S.e && S.e.hp > 0) drawShadow(S.e.x, S.e.y, S.e.w);
  for (const m of S.mobs) if (m.state !== 'spawn' && !(S.t < m.invisUntil) && targetable(m) && m.state !== 'surface') drawShadow(m.x, m.y, m.w);
  if (!S.p.dead) drawShadow(S.p.x, S.p.y, S.p.w);
  drawQuakes();
  for (const m of S.mobs) drawMob(m);
  drawGrenades();
  if (S.e && (S.e.hp > 0 || S.mode !== 'won')) drawBoss();
  drawPartner();
  drawPlayer(); drawShots(); drawFx(); drawDrops(); drawTouchAim();
  if (showBoxes) drawBoxes();
  ctx.restore();
  const fa = S.t - S.flashT;
  if (fa < .15){ ctx.fillStyle = rgba(C.blood, .2 * (1 - fa / .15)); ctx.fillRect(0, 0, W, H); }
  drawHud();
  drawOverlay();
}

/* ===================== KAYIT ===================== */
let saveTimer = 0, saving = false, dirty = false, syncState = 'ok', syncMsg = '';
function markDirty(){
  dirty = true;
  if (!acct) return;
  if (acct.offline){ store.set('prolar.offline', prof); dirty = false; return; }
  clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 2500);
}
async function flushSave(){
  if (!acct) return;
  if (acct.offline){ store.set('prolar.offline', prof); dirty = false; return; }
  if (!dirty || saving) return;
  clearTimeout(saveTimer);
  saving = true; dirty = false; syncState = 'saving'; renderAcct();
  try { await NET.save(acct.token, prof); syncState = 'ok'; syncMsg = ''; }
  catch (e){
    dirty = true; syncState = 'err'; syncMsg = cleanErr(e);
    if (/oturum/i.test(syncMsg)) flash('Oturumun kapanmış. Çıkış yapıp tekrar giriş yap, ilerlemen bu sekmede duruyor.');
    else saveTimer = setTimeout(flushSave, 8000);
  }
  saving = false; renderAcct();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
let flashTimer = 0;
function flash(msg){ const el = $('flash'); el.textContent = msg; el.hidden = false; clearTimeout(flashTimer); flashTimer = setTimeout(() => { el.hidden = true; }, 3600); }
function cleanErr(e){
  const m = (e && e.message) || String(e);
  if (/failed to fetch|networkerror|load failed|network/i.test(m)) return 'Sunucuya ulaşılamadı. Bağlantını kontrol et ya da çevrimdışı oyna.';
  if (/function .* does not exist|could not find the function/i.test(m)) return 'Sunucu kurulumu eksik: supabase-prolar.sql henüz çalıştırılmamış.';
  return m;
}

/* ===================== MARKET =====================
   6 ürün. Her saat başı kendiliğinden yenilenir, altınla da yenilenebilir.
   Ürünler açtığın en yüksek bölümden (ağırlıklı) ve öncekilerden gelir. Nadir eşyalar markette satılmaz. */
const HOUR = 3600000;
function hashStr(s){ let h = 2166136261; for (const ch of s){ h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function shopState(){
  const h = Math.floor(Date.now() / HOUR);
  if (!prof.shop || prof.shop.h !== h) prof.shop = {h, rr:0, bought:[]};
  return prof.shop;
}
function shopItems(){
  const sh = shopState();
  const R = rng((hashStr(((acct && acct.name) || 'misafir').toLocaleLowerCase('tr')) ^ Math.imul(sh.h, 2654435761) ^ Math.imul(sh.rr + 1, 40503)) >>> 0);
  const maxC = prof.prog.c, out = [], seen = new Set();
  let guard = 0;
  while (out.length < SHOP_SIZE && guard++ < 300){
    const roll = R();
    const c = roll < .6 ? maxC : roll < .9 ? Math.max(1, maxC - 1) : 1 + Math.floor(R() * maxC);
    const pool = ITEMS.filter(i => i.tier === c && !i.rare);
    const it = pool[Math.floor(R() * pool.length)];
    if (!it || seen.has(it.id)) continue;
    seen.add(it.id); out.push(it);
  }
  return out;
}
function renderMarket(){
  const el = $('mk-items'); if (!el) return;
  const sh = shopState(), items = shopItems();
  el.innerHTML = items.map((it, i) => itemCard(it, 'shop', {i, price:PRICE(it), bought:!!sh.bought[i]})).join('');
  const cost = REROLL_COST(prof.prog.c), rb = $('mk-reroll');
  rb.textContent = `Ürünleri şimdi yenile · ${cost} altın`; rb.disabled = prof.gold < cost || runLocked();
  $('mk-gold').textContent = prof.gold;
  updateShopTimer();
}
function updateShopTimer(){
  const left = HOUR - (Date.now() % HOUR), m = Math.max(1, Math.ceil(left / 60000));
  $('mk-timer').textContent = `${m} dk`;
  if (prof.shop && prof.shop.h !== Math.floor(Date.now() / HOUR)) renderMarket();
}
setInterval(() => { if (acct) updateShopTimer(); }, 20000);
$('mk-items').addEventListener('click', ev => {
  const b = ev.target.closest('[data-buy]'); if (!b || runLocked()) return;
  const i = +b.dataset.buy, it = shopItems()[i], sh = shopState(), price = PRICE(it);
  if (!it || sh.bought[i] || prof.gold < price) return;
  prof.gold -= price; prof.inv[it.id] = (prof.inv[it.id] || 0) + 1; sh.bought[i] = true;
  markDirty(); flash(`${it.ad} alındı.`); renderMarket(); renderBag(); renderAcct();
});
$('mk-reroll').addEventListener('click', () => {
  if (runLocked()) return;
  const cost = REROLL_COST(prof.prog.c); if (prof.gold < cost) return;
  const sh = shopState(); prof.gold -= cost; sh.rr++; sh.bought = [];
  markDirty(); renderMarket(); renderAcct();
});

/* ===================== HESAP ===================== */
function renderAcct(){
  const on = !!acct;
  $('auth').hidden = on; $('app').hidden = !on;
  if (!on) return;
  $('ab-name').textContent = acct.name + (acct.offline ? ' · çevrimdışı' : '');
  $('ab-gold').textContent = prof.gold;
  $('ab-prog').textContent = `${prof.prog.c}-${prof.prog.s}`;
  const sy = $('ab-sync');
  sy.textContent = acct.offline ? 'İlerleme bu tarayıcıda kaydediliyor' : syncState === 'saving' ? 'Kaydediliyor…' : syncState === 'err' ? `Kaydedilemedi: ${syncMsg}` : 'Kaydedildi';
  sy.classList.toggle('err', syncState === 'err' && !acct.offline);
  $('ab-admin-wrap').hidden = !acct.admin;
  $('tune').hidden = !acct.admin;
  $('ab-admin').checked = adminView;
  $('b-pass').hidden = acct.offline;
  const mg = $('mk-gold'); if (mg) mg.textContent = prof.gold;
}
async function doAuth(kind){
  const name = $('a-name').value.trim(), pass = $('a-pass').value, msg = $('auth-msg');
  if (!NET.available()){ msg.textContent = 'Sunucuya bağlanılamıyor. Çevrimdışı oynayabilirsin.'; return; }
  if (!name || !pass){ msg.textContent = 'Kullanıcı adı ve şifre yaz.'; return; }
  msg.textContent = kind === 'register' ? 'Hesap açılıyor…' : 'Giriş yapılıyor…';
  try {
    const r = kind === 'register' ? await NET.register(name, pass) : await NET.login(name, pass);
    store.set('prolar.token', r.token);
    $('a-pass').value = ''; msg.textContent = '';
    loggedIn(r, false);
  } catch (e){ msg.textContent = cleanErr(e); }
}
function loggedIn(r, offline){
  /* admin hesabı: her şey açık gelir, oyun ayarlarını sadece o değiştirebilir */
  acct = {token:r.token || null, id:r.id || null, name:r.name, admin:!!r.is_admin && !offline, offline};
  adminView = acct.admin; syncState = 'ok'; syncMsg = '';
  applySettings(acct.admin);
  showBoxes = false; $('s-boxes').checked = false;
  setProfile(r.save);
  if (!unlocked(sel.c, sel.s)) sel = {c:prof.prog.c, s:prof.prog.s};
  fTier = adminView ? sel.c : 'all';
  S = makeState('title'); paused = false;
  syncUI(); renderBag(); renderMarket(); renderLobby();
}
$('auth-form').addEventListener('submit', ev => { ev.preventDefault(); doAuth('login'); });
$('b-register').addEventListener('click', () => doAuth('register'));
$('b-offline').addEventListener('click', () => loggedIn({name:'Misafir', save:store.get('prolar.offline', null)}, true));
$('b-logout').addEventListener('click', async () => {
  if (runLocked()) return;
  await flushSave(); lobbyLeave();
  if (acct && !acct.offline && acct.token){ try { await NET.logout(acct.token); } catch (_) {} }
  store.set('prolar.token', null); acct = null; adminView = false; setProfile(null);
  applySettings(false); showBoxes = false; $('s-boxes').checked = false;
  S = makeState('title'); renderAcct();
});
$('ab-admin').addEventListener('change', ev => {
  if (!acct || !acct.admin || runLocked()){ ev.target.checked = adminView; return; }
  adminView = ev.target.checked;
  if (!adminView){
    for (const sl of SLOTS) if (equip[sl] && !(prof.inv[equip[sl]] > 0)) delete equip[sl];
    if (!unlocked(sel.c, sel.s)) sel = {c:prof.prog.c, s:prof.prog.s};
  }
  fTier = adminView ? sel.c : 'all';
  onGearChange(); renderMarket();
});
$('b-pass').addEventListener('click', () => { const f = $('pass-form'); f.hidden = !f.hidden; $('pass-msg').textContent = ''; });
$('pass-form').addEventListener('submit', async ev => {
  ev.preventDefault(); const m = $('pass-msg');
  try { await NET.changePass(acct.token, $('p-old').value, $('p-new').value); m.textContent = 'Şifren değişti.'; $('p-old').value = ''; $('p-new').value = ''; }
  catch (e){ m.textContent = cleanErr(e); }
});
async function boot(){
  renderAcct();
  const msg = $('auth-msg');
  if (!NET.available()){ msg.textContent = 'Sunucuya bağlanılamıyor. Çevrimdışı oynayabilirsin, ilerlemen bu tarayıcıda kalır.'; return; }
  const tok = store.get('prolar.token', null);
  if (!tok) return;
  msg.textContent = 'Oturum açılıyor…';
  try { const r = await NET.me(tok); msg.textContent = ''; loggedIn(Object.assign({token:tok}, r), false); }
  catch (e){ msg.textContent = /oturum/i.test(e.message || '') ? 'Oturumun kapanmış, tekrar giriş yap.' : cleanErr(e); }
}

/* ===================== ONLINE LOBİ =====================
   Lobi sahibi 5 haneli bir kod alır, arkadaşları o kodla katılır. En fazla 4 kişi.
   Bölümü lobi sahibi seçer, ilerleme onun hesabına yazılır. Misafir altın ve eşya kazanır.
   Herkes aynı düşmanlarla dövüşür (aşağıda CO-OP bölümü). */
const LOBBY_MAX = 4;
const PARTNER_COLS = ['#9fd8c8', '#e3a6d6', '#d9c77a'];
const partnerCol = nick => { const i = lobby.others.findIndex(o => o.nick === nick); return PARTNER_COLS[(i < 0 ? 0 : i) % PARTNER_COLS.length]; };
/* lobi kodu: 5 haneli rakam. Lobi hiçbir yere kaydedilmez, herkes çıkınca kendiliğinden kapanır. */
function lobbyCode(){ return String(10000 + Math.floor(Math.random() * 90000)); }
function myPresence(){
  const st = derive(sel.c);
  return {nick:acct.name, role:lobby.role, ready:lobby.ready, cls:st.wd.cls || null, wpn:st.weapon ? st.weapon.ad : 'Yumruk', prog:prof.prog, at:lobby.joinedAt};
}
function lobbySend(ev, payload){ if (lobby.ch && lobby.subscribed){ try { lobby.ch.send({type:'broadcast', event:ev, payload}); } catch (_) {} } }
function lobbyJoin(code, role){
  if (!acct || acct.offline){ lobby.msg = 'Online lobi için hesabınla giriş yapman gerekiyor.'; renderLobby(); return; }
  if (!NET.available()){ lobby.msg = 'Sunucuya bağlanılamıyor.'; renderLobby(); return; }
  code = String(code || '').replace(/\D/g, '').slice(0, 5);
  if (code.length !== 5){ lobby.msg = 'Lobi kodu 5 haneli bir sayı olmalı.'; renderLobby(); return; }
  lobbyLeave(true);
  const ch = NET.channel('prolar-lobi-' + code, {config:{broadcast:{self:false}, presence:{key:acct.name}}});
  if (!ch){ lobby.msg = 'Sunucuya bağlanılamıyor.'; renderLobby(); return; }
  Object.assign(lobby, {ch, code, role, peers:[], others:[], ping:null, ready:false, pstates:{}, msg:'Bağlanıyor…', joinedAt:Date.now(), subscribed:false});
  ch.on('presence', {event:'sync'}, onPresence);
  ch.on('broadcast', {event:'lvl'}, ({payload}) => { if (lobby.role === 'guest' && payload && S.mode !== 'play') selectLevel(payload.c, payload.s, true); });
  ch.on('broadcast', {event:'start'}, ({payload}) => onCoopStart(payload));
  ch.on('broadcast', {event:'n'}, ({payload}) => { if (payload && acct && (payload.to === '*' || payload.to === acct.name)) netRecv(payload.from, payload.e, payload.d); });
  ch.on('broadcast', {event:'rtc'}, ({payload}) => { rtcOnSignal(payload); });
  ch.on('broadcast', {event:'ping'}, ({payload}) => lobbySend('pong', payload));
  ch.on('broadcast', {event:'pong'}, ({payload}) => { if (payload && payload.from === acct.name) lobby.ping = Math.round(performance.now() - payload.t); });
  ch.subscribe(async status => {
    if (lobby.ch !== ch) return;
    if (status === 'SUBSCRIBED'){
      lobby.subscribed = true; lobby.msg = '';
      try { await ch.track(myPresence()); } catch (_) {}
      if (lobby.role === 'host') lobbySend('lvl', sel);
      renderLobby(); renderSubs();
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'){
      lobby.msg = 'Bağlantı kurulamadı. Biraz sonra tekrar dene.'; renderLobby();
    }
  });
  renderLobby(); renderSubs();
}
function onPresence(){
  const ch = lobby.ch; if (!ch) return;
  const peers = Object.values(ch.presenceState()).map(arr => arr[arr.length - 1]).filter(Boolean);
  lobby.peers = peers;
  if (peers.length > LOBBY_MAX){
    const late = peers.slice().sort((a, b) => a.at - b.at).slice(LOBBY_MAX);
    if (late.some(p => p.nick === acct.name)){ lobbyLeave(true); lobby.msg = `Lobi dolu. Bir lobide en fazla ${LOBBY_MAX} kişi olabilir.`; renderLobby(); return; }
  }
  lobby.others = peers.filter(p => p.nick !== acct.name).sort((a, b) => a.at - b.at).slice(0, LOBBY_MAX - 1);
  for (const n of Object.keys(lobby.pstates)) if (!lobby.others.some(o => o.nick === n)) delete lobby.pstates[n];
  for (const n of Object.keys(peers)) if (!lobby.others.some(o => o.nick === n)) rtcClose(n);
  if (lobby.role === 'guest' && lobby.others.length && !lobby.others.some(o => o.role === 'host')) lobby.msg = 'Bu lobide lobi sahibi yok.';
  else if (lobby.msg === 'Bu lobide lobi sahibi yok.') lobby.msg = '';
  renderLobby();
}
function lobbyLeave(silent){
  rtcCloseAll();
  if (lobby.ch){ const ch = lobby.ch; lobby.ch = null; try { ch.untrack(); ch.unsubscribe(); NET.removeChannel(ch); } catch (_) {} }
  Object.assign(lobby, {ch:null, code:null, role:null, peers:[], others:[], ping:null, ready:false, pstates:{}, subscribed:false});
  if (!silent) lobby.msg = '';
  renderLobby(); renderSubs();
}
async function lobbyTrack(){ if (lobby.ch && lobby.subscribed){ try { await lobby.ch.track(myPresence()); } catch (_) {} } }
function renderLobby(){
  const inL = !!lobby.ch;
  $('lobby-out').hidden = inL; $('lobby-in').hidden = !inL;
  $('lobby-msg').textContent = lobby.msg || '';
  if (!inL) return;
  $('lb-code').textContent = lobby.code;
  $('lb-role').textContent = lobby.role === 'host'
    ? 'Lobi sahibi sensin. Bölümü sen seçersin, ilerleme senin hesabına yazılır.'
    : 'Misafirsin. Bölümü lobi sahibi seçer. Sen altın ve eşya kazanırsın, ilerleme onun hesabına yazılır.';
  const os = lobby.others, free = LOBBY_MAX - 1 - os.length;
  $('lb-partner').innerHTML = os.length
    ? os.map(pt => `<span class="lbp"><i class="lbdot" style="background:${partnerCol(pt.nick)}"></i><b>${esc(pt.nick)}</b>${pt.role === 'host' ? ' <span class="dim">(lobi sahibi)</span>' : ''} · ${pt.cls ? CLASSES[pt.cls].ad : 'Class yok'} · ${esc(pt.wpn)} · ilerleme ${pt.prog ? pt.prog.c + '-' + pt.prog.s : '?'} · ${pt.ready ? '<span class="okc">hazır</span>' : '<span class="dim">hazır değil</span>'}</span>`).join('')
      + (free > 0 ? `<span class="dim lbp">${free} kişilik yer daha var.</span>` : '')
    : `<span class="dim">Arkadaşlarının katılması bekleniyor. Kodu onlara gönder. Lobiye en fazla ${LOBBY_MAX} kişi girebilir.</span>`;
  /* misafirler sadece lobi sahibine bağlanır, lobi sahibi herkese */
  const need = lobby.role === 'host' ? os : os.filter(o => o.role === 'host'), direct = need.filter(o => rtcOk(o.nick)).length;
  const link = !need.length ? '' : direct === need.length ? ' · doğrudan bağlantı' : direct ? ` · ${direct}/${need.length} doğrudan` : ' · sunucu üzerinden (yavaş)';
  $('lb-ping').textContent = (lobby.ping != null ? `ping ${lobby.ping} ms` : (os.length ? 'ping ölçülüyor…' : '')) + link;
  const rb = $('lb-ready'); rb.textContent = lobby.ready ? 'Hazır değilim' : 'Hazırım'; rb.setAttribute('aria-pressed', String(lobby.ready));
  const sb = $('lb-start'); sb.hidden = lobby.role !== 'host'; sb.disabled = !(os.length && os.every(o => o.ready) && lobby.ready) || runLocked();
  $('lb-sel').textContent = `${sel.c}-${sel.s} · ${CHAPTERS[sel.c - 1].ad}`;
}
$('lb-create').addEventListener('click', () => lobbyJoin(lobbyCode(), 'host'));
$('lb-join-form').addEventListener('submit', ev => { ev.preventDefault(); lobbyJoin($('lb-join-code').value, 'guest'); });
$('lb-leave').addEventListener('click', () => lobbyLeave());
$('lb-ready').addEventListener('click', () => { lobby.ready = !lobby.ready; lobbyTrack(); renderLobby(); });
$('lb-start').addEventListener('click', () => {
  if (lobby.role !== 'host' || !lobby.others.length || !lobby.others.every(o => o.ready) || !lobby.ready || runLocked()) return;
  coopStart();
});
$('lb-copy').addEventListener('click', () => {
  const done = () => flash('Kod kopyalandı.');
  try { navigator.clipboard.writeText(lobby.code).then(done, () => flash(`Kod: ${lobby.code}`)); } catch (_) { flash(`Kod: ${lobby.code}`); }
});
/* ===================== CO-OP: ORTAK DÜNYA =====================
   Lobi sahibi düşmanları simüle eder (yapay zekâ, dalgalar, boss). Diğerleri aynı düşmanları onun gönderdiği
   anlık görüntülerden görür, aradaki hareketi yumuşatır. Bir saldırının sana değip değmediğine kendi ekranında
   bakılır: gördüğün şeye göre dodge atarsın. Senin vuruşların lobi sahibine gider, hasarı o uygular;
   düşman ölünce herkeste ölür, herkes kendi altınını ve eşyasını alır.
   Oyun trafiği tarayıcılar arasında doğrudan (WebRTC) akar. Supabase sadece bağlantıyı kurmak için kullanılır.
   Doğrudan bağlantı kurulamazsa trafik düşük hızla Supabase üzerinden gider. */
const RTC_CFG = {iceServers:[{urls:['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478']}]};
const peers = {};   // nick -> {pc, u, r, ok, failed, t0, cands, remoteSet}
const rtcOk = nick => { const P = peers[nick]; return !!(P && P.u && P.r && P.u.readyState === 'open' && P.r.readyState === 'open'); };
function rtcSignal(to, data){ lobbySend('rtc', Object.assign({to, from:acct.name}, data)); }
function rtcOpen(nick, initiator){
  if (peers[nick]) return peers[nick];
  if (typeof RTCPeerConnection === 'undefined') return null;
  const pc = new RTCPeerConnection(RTC_CFG);
  const P = peers[nick] = {nick, pc, u:null, r:null, failed:false, t0:performance.now(), cands:[], remoteSet:false};
  pc.onicecandidate = ev => { if (ev.candidate) rtcSignal(nick, {k:'ice', c:ev.candidate.toJSON()}); };
  pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' || pc.connectionState === 'closed'){ P.failed = true; renderLobby(); } };
  const wire = ch => {
    ch.onopen = () => renderLobby();
    ch.onclose = () => renderLobby();
    ch.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (_) { return; } netRecv(nick, m.e, m.d); };
  };
  if (initiator){
    P.u = pc.createDataChannel('u', {ordered:false, maxRetransmits:0}); P.r = pc.createDataChannel('r', {ordered:true});
    wire(P.u); wire(P.r);
    pc.createOffer().then(o => pc.setLocalDescription(o))
      .then(() => rtcSignal(nick, {k:'offer', sdp:pc.localDescription.toJSON()}))
      .catch(() => { P.failed = true; });
  } else pc.ondatachannel = ev => { const ch = ev.channel; if (ch.label === 'u') P.u = ch; else P.r = ch; wire(ch); };
  return P;
}
async function rtcOnSignal(m){
  if (!m || !acct || m.to !== acct.name) return;
  const from = m.from;
  try {
    if (m.k === 'offer'){
      rtcClose(from);
      const P = rtcOpen(from, false); if (!P) return;
      await P.pc.setRemoteDescription(m.sdp);
      await P.pc.setLocalDescription(await P.pc.createAnswer());
      rtcSignal(from, {k:'answer', sdp:P.pc.localDescription.toJSON()});
      P.remoteSet = true; for (const c of P.cands) P.pc.addIceCandidate(c).catch(() => {}); P.cands = [];
    } else if (m.k === 'answer'){
      const P = peers[from]; if (!P || P.remoteSet) return;
      await P.pc.setRemoteDescription(m.sdp);
      P.remoteSet = true; for (const c of P.cands) P.pc.addIceCandidate(c).catch(() => {}); P.cands = [];
    } else if (m.k === 'ice'){
      const P = peers[from]; if (!P) return;
      if (P.remoteSet) P.pc.addIceCandidate(m.c).catch(() => {}); else P.cands.push(m.c);
    }
  } catch (_) { const P = peers[from]; if (P) P.failed = true; }
}
function rtcClose(nick){ const P = peers[nick]; if (!P) return; delete peers[nick]; try { P.pc.close(); } catch (_) {} }
function rtcCloseAll(){ for (const n of Object.keys(peers)) rtcClose(n); }
const anyDirect = () => lobby.others.some(o => rtcOk(o.nick));

/* gönder: to = nick ya da '*' (herkes). Doğrudan bağlantı açıksa oradan, değilse Supabase'den. */
function netSend(to, ev, data, reliable){
  const targets = to === '*' ? lobby.others.map(o => o.nick) : [to];
  const viaServer = [];
  for (const n of targets){
    const P = peers[n], ch = rtcOk(n) ? (reliable ? P.r : P.u) : null;
    if (ch){ try { ch.send(JSON.stringify({e:ev, d:data})); continue; } catch (_) {} }
    viaServer.push(n);
  }
  if (!viaServer.length) return;
  if (to === '*' && viaServer.length === targets.length) lobbySend('n', {to:'*', from:acct.name, e:ev, d:data});
  else for (const n of viaServer) lobbySend('n', {to:n, from:acct.name, e:ev, d:data});
}
function netRecv(from, ev, d){
  if (!d) return;
  const now = performance.now();
  if (ev === 'pi'){ netSend(from, 'po', d, true); return; }
  if (ev === 'po'){ lobby.ping = Math.round(now - d.t); return; }
  if (ev === 'p'){ if (d.n) lobby.pstates[d.n] = Object.assign({}, d, {rx:now}); return; }
  if (ev === 'go'){ onCoopStart(d); return; }
  const N = S.net;
  if (!N || d.rid !== N.rid){
    /* koşu henüz başlamadıysa lobi sahibinin ilk mesajlarını sakla */
    if (d.rid && (ev === 'ev' || ev === 'w')){ lobby.early = (lobby.early || []).filter(x => now - x[3] < 3000).slice(-80); lobby.early.push([from, ev, d, now]); }
    return;
  }
  if (ev === 'w' && !N.host){
    N.lastRx = now;
    const sample = d.t - now / 1000;
    if (N.off == null || sample > N.off || N.off - sample > .3) N.off = sample; else N.off += (sample - N.off) * .05;
    if (!N.snaps.length || d.t > N.snaps[N.snaps.length - 1].t) N.snaps.push(d);
    if (N.snaps.length > 40) N.snaps.splice(0, N.snaps.length - 40);
    for (const ps of d.pl || []) if (ps.n !== acct.name) lobby.pstates[ps.n] = Object.assign({}, ps, {rx:now});
  } else if (ev === 'ev' && !N.host){
    for (const e of d.l){
      if (e[0] === 'next'){ S.autoNext = {c:e[1].c, s:e[1].s, at:now + e[1].in * 1000}; continue; }
      N.evin.push(e);
    }
  } else if (ev === 'hit' && N.host){
    for (const h of d.l) applyRemoteHit(h);
  } else if (ev === 'vx'){
    /* lobi sahibi misafirin atışlarını çizer ve diğer misafirlere iletir; misafir kendi atışlarını atlar */
    if (N.host){ for (const v of d.l){ applyVfx(v); (N.vxOut || (N.vxOut = [])).push([from, v]); } }
    else for (const [who, v] of d.l) if (who !== acct.name) applyVfx(v);
  }
}

/* ---------- lobi sahibi tarafı ---------- */
let coopRid = 0;
function coopStart(){
  coopRid = (Date.now() % 1e9) + Math.floor(Math.random() * 1000);
  const msg = {c:sel.c, s:sel.s, rid:coopRid};
  lobbySend('start', msg); netSend('*', 'go', msg, true);
  newRun({coop:true, rid:coopRid});
}
function onCoopStart(d){
  if (lobby.role !== 'guest' || !d) return;
  if (S.net && S.net.rid === d.rid) return;
  selectLevel(d.c, d.s, true); newRun({coop:true, rid:d.rid});
  const early = (lobby.early || []).filter(x => x[2].rid === d.rid); lobby.early = [];
  for (const x of early) netRecv(x[0], x[1], x[2]);
}
/* uzaktaki oyuncular: düşmanların hedef seçebilmesi için sabit nesneler */
const proxies = {};
remotePlayers = () => {
  if (!S.net || !S.net.host) return [];
  const now = performance.now(), lv = attKey(), out = [];
  for (const ps of Object.values(lobby.pstates)){
    if (ps.lv !== lv || now - ps.rx > 1500) continue;
    const q = proxies[ps.n] || (proxies[ps.n] = {remote:true, nick:ps.n, w:26, h:46, dodgeT:-9});
    const age = Math.min(.15, (now - ps.rx) / 1000);
    q.x = clamp(ps.x + ps.vx * age, WALL + 13, W - WALL - 13); q.y = ps.y; q.vx = ps.vx; q.vy = ps.vy; q.dead = !!ps.dn;
    out.push(q);
  }
  return out;
};
function applyRemoteHit(h){
  if (S.mode !== 'play') return;
  const t = h.id === 'B' ? S.e : S.mobs.find(m => m.id === h.id);
  if (!t || t.dead || t.hp <= 0) return;
  if (h.stunOnly){ stunTarget(t, h.stunOnly); return; }
  damageEnemy(t, h.b, h.el, Object.assign({}, h.o, {remote:true}));
}
const r1 = v => Math.round(v * 10) / 10;
function worldSnap(){
  const t = S.t, m = [];
  for (const q of S.mobs){
    if (q.dead) continue;
    const fl = (t < q.invisUntil ? 1 : 0) | (q.enraged ? 2 : 0) | (t < q.stunUntil ? 4 : 0) | (t < q.slowUntil ? 8 : 0) | (t < q.poisonUntil ? 16 : 0)
      | (q.aff.includes('yenilenen') && t - q.lastHitT > 2 ? 32 : 0) | (q.flash > 0 ? 64 : 0) | (q.lowFired ? 128 : 0);
    m.push([q.id, q.a, q.origin || S.L.c, r1(q.x), r1(q.y), q.face, q.state, q.sn || 0, Math.round((q.ck - q.st) * 1000), Math.round((q.dur || 0) * 1000),
      Math.ceil(q.hp), fl, Math.round(q.aimX || 0), Math.round(q.aimY || 0), Math.round(q.jx ?? q.lx ?? 0), Math.round(q.jy ?? q.ly ?? 0), q.cdir || 0, q.v || 0, q.aff, Math.round((q.turnT || 0) * 100)]);
  }
  const e = S.e;
  const b = e ? {x:r1(e.x), y:r1(e.y), f:e.face, st:e.state, sn:e.sn || 0, el:Math.round((e.ck - e.st) * 1000), dur:Math.round((e.dur || 0) * 1000), hp:Math.ceil(e.hp), ph:e.phase,
    held:e.held ? 1 : 0, lx:Math.round(e.leapX || 0), cd:e.chargeDir || 1, rows:e.rows || [], vn:e.volleyN || 3, rn:e.ringN || 0, ra:Math.round((e.ringA || 0) * 1000),
    tx:e.tg ? Math.round(e.tg.x) : 0, ty:e.tg ? Math.round(e.tg.y) : FLOOR, fl:(e.flash > 0 ? 1 : 0) | (t < e.slowUntil ? 2 : 0)} : null;
  const pl = [myState()];
  const now = performance.now();
  for (const ps of Object.values(lobby.pstates)) if (now - ps.rx < 1500){ const c = Object.assign({}, ps); delete c.rx; pl.push(c); }
  return {rid:S.net.rid, t:Math.round(t * 1000) / 1000, wv:S.wave, m, b, pl};
}
function myState(){
  const p = S.p;
  return {n:acct.name, x:Math.round(p.x), y:Math.round(p.y), vx:Math.round(p.vx), vy:Math.round(p.vy), f:p.face, hp:Math.ceil(p.hp), mx:p.st.maxHp,
    b:p.blocking ? 1 : 0, d:S.t < p.dodgeUntil ? 1 : 0, a:S.t - p.atkT < .17 ? 1 : 0, dn:p.dead ? 1 : 0, rs:p.dead ? Math.ceil(p.respawnAt - S.t) : 0, lv:attKey(), h:heroLook()};
}

/* ---------- misafir tarafı ---------- */
function hostNow(){ const N = S.net; return N.off == null ? null : performance.now() / 1000 + N.off - (anyDirect() ? .1 : .25); }
function guestWorld(dt){
  const N = S.net, now = performance.now();
  for (const m of S.mobs) if (m.flash > 0) m.flash -= dt;
  if (S.e && S.e.flash > 0) S.e.flash -= dt;
  if (now - N.lastRx > 6000){ endRun(false); flash('Lobi sahibiyle bağlantı koptu.'); return; }
  const rt = hostNow(); if (rt == null) return;
  while (N.evin.length && N.evin[0][2] <= rt){
    const [k, d] = N.evin.shift();
    applyEv(k, d);
    if (S.mode !== 'play') return;
  }
  const sn = N.snaps; if (!sn.length) return;
  while (sn.length > 2 && sn[1].t <= rt) sn.shift();
  const a = sn[0], b = sn.length > 1 ? sn[1] : a;
  const k = b === a ? 0 : clamp((rt - a.t) / (b.t - a.t), 0, 1);
  applySnap(a, b, k, rt);
  guestHits();
  S.mobs = S.mobs.filter(m => !m.dead);
}
function applySnap(a, b, k, rt){
  const N = S.net, bm = new Map(b.m.map(r => [r[0], r])), live = new Set();
  S.wave = a.wv;
  for (const ra of a.m){
    const id = ra[0]; if (N.dead.has(id)) continue;
    const rb = bm.get(id) || ra;
    let m = S.mobs.find(q => q.id === id);
    if (!m){ m = spawnMob({a:ra[1], x:ra[3], origin:ra[2], aff:ra[18] || [], v:ra[17], id}); }
    live.add(id);
    m.x = ra[3] + (rb[3] - ra[3]) * k; m.y = ra[4] + (rb[4] - ra[4]) * k;
    const rate = rb[7] === ra[7] && b.t > a.t ? (rb[8] - ra[8]) / 1000 / (b.t - a.t) : 1;
    m.face = ra[5]; m.state = ra[6]; m.sn = ra[7]; m.st = 0; m.ck = ra[8] / 1000 + Math.max(0, rate) * (rt - a.t); m.dur = ra[9] / 1000;
    if (performance.now() >= (m.predUntil || 0) || ra[10] < m.hp) m.hp = ra[10];
    const fl = ra[11], t = S.t;
    m.invisUntil = fl & 1 ? t + .2 : -9; m.enraged = !!(fl & 2); m.stunUntil = fl & 4 ? t + .2 : -9; m.slowUntil = fl & 8 ? t + .2 : -9;
    m.poisonUntil = fl & 16 ? t + .2 : -9; m.lastHitT = fl & 32 ? t - 3 : t; if (fl & 64 && !(m.flash > 0)) m.flash = .05; m.lowFired = !!(fl & 128);
    m.aimX = ra[12]; m.aimY = ra[13]; m.jx = m.lx = ra[14]; m.jy = m.ly = ra[15]; m.cdir = ra[16]; m.v = ra[17]; m.turnT = ra[19] / 100;
  }
  for (const m of S.mobs) if (!live.has(m.id) && m.state !== 'spawn') m.dead = true;
  const e = S.e, ba = a.b, bb = b.b || ba;
  if (e && ba){
    e.x = ba.x + (bb.x - ba.x) * k; e.y = ba.y + (bb.y - ba.y) * k; e.vx = 0; e.vy = 0;
    e.face = ba.f; e.state = ba.st; e.sn = ba.sn; e.st = 0; e.ck = ba.el / 1000 + (rt - a.t); e.dur = ba.dur / 1000;
    if (performance.now() >= (e.predUntil || 0) || ba.hp < e.hp) e.hp = ba.hp;
    if (ba.ph === 2 && e.phase === 1){ e.phase = 2; addShake(10); S.banner = {txt:e.def.weak2 ? `2. AŞAMA · zayıflık ${elAd(e.def.weak2)}` : '2. AŞAMA', t:S.t}; if (e.def.weak2) e.weak = e.def.weak2; }
    e.held = !!ba.held; e.leapX = ba.lx; e.chargeDir = ba.cd; e.rows = ba.rows; e.volleyN = ba.vn; e.ringN = ba.rn; e.ringA = ba.ra / 1000;
    e.tg = {x:ba.tx, y:ba.ty, vx:0, vy:0, w:26, h:46};
    if (ba.fl & 1 && !(e.flash > 0)) e.flash = .05;
    e.slowUntil = ba.fl & 2 ? S.t + .2 : -9;
  }
}
/* misafir kendi ekranında görünen saldırılara göre hasar alır. sn: saldırının sırası, her saldırı bir kez vurur. */
const PUPPET_HIT = {
  bash:m => bashBox(m), dash:m => dashBox(m), dive:m => tRect(m), charge:m => tRect(m),
  erupt:m => ({l:m.x - 22, r:m.x + 22, t:FLOOR - 96, b:FLOOR}), leap:m => (m.ck / Math.max(.01, m.dur) > .65 ? tRect(m) : null)
};
function guestHits(){
  const p = S.p, pr = pRect();
  for (const m of S.mobs){
    const f = PUPPET_HIT[m.state]; if (!f || m.ghk === m.sn) continue;
    const box = f(m); if (!box || !ov(box, pr)) continue;
    m.ghk = m.sn;
    const r = hurtPlayer({dmg:m.dmg, el:m.el, dir:m.face, fromX:m.x, who:m});
    if (r === 'dodged') dodgedFx(S.t - p.dodgeT < .1);
    else if (r === 'hit' && m.a === 'tank') p.vx = m.face * 420;
  }
  const e = S.e; if (!e || e.hp <= 0 || e.ghk === e.sn) return;
  const D = k => BDMG[k] * e.dmgF;
  let o = null;
  if (e.state === 'lunge' && ov(lungeBox(e), pr)) o = {dmg:D('lunge'), el:e.el, dir:e.face, fromX:e.x, who:e};
  else if (e.state === 'charge' && ov(tRect(e), pr)) o = {dmg:D('charge'), el:e.el, dir:e.chargeDir, fromX:e.x - e.chargeDir * 10, who:e};
  else if (e.state === 'rowStrike' && e.ck < .25 && e.rows.includes(rowOf(p.y))) o = {dmg:D('row'), el:e.el, dir:Math.sign(p.x - e.x) || 1, blockable:false};
  if (!o) return;
  e.ghk = e.sn;
  const r = hurtPlayer(o);
  if (r === 'dodged') dodgedFx(S.t - p.dodgeT < .1);
}
function applyEv(k, d){
  const N = S.net, p = S.p;
  if (k === 'sp'){ if (!S.mobs.some(m => m.id === d.id) && !N.dead.has(d.id)) spawnMob({a:d.a, x:d.x, home:d.home, origin:d.o, aff:d.aff || [], v:d.v, id:d.id}); }
  else if (k === 'wave'){ S.wave = d.i; if (!S.e || d.i > 0) S.banner = {txt:`Dalga ${d.i + 1} / ${S.L.waves.length}`, t:S.t, sub:FORMS[S.L.waves[d.i].form]}; }
  else if (k === 'kill'){ N.dead.add(d.id); const m = S.mobs.find(q => q.id === d.id); if (m && !m.dead) kill(m); }
  else if (k === 'bkill'){ if (S.e && S.e.hp > 0) kill(S.e); }
  else if (k === 'end') endRun(!!d.won);
  else if (k === 'shot'){
    const sh = SHOT[d.k];
    S.shots.push({kind:d.k, len:sh.len || 0, tip:(sh.len || 0) * (sh.tipF || 0), gap:sh.gap || 0, r:sh.r || 0,
      x:d.x, y:d.y, vx:Math.cos(d.a) * d.s, vy:Math.sin(d.a) * d.s, ang:d.a, stuck:false, life:0, res:null, dead:false, en:null, dmg:d.d, el:d.el, who:null});
  }
  else if (k === 'quake') S.quakes.push({x:d.x - 21, dir:-1, done:false, dmg:d.dmg, el:d.el}, {x:d.x + 21, dir:1, done:false, dmg:d.dmg, el:d.el});
  else if (k === 'bomb') S.bombs.push({x:d.x, y:d.y, at:S.t + d.in, lead:d.lead, r:d.r, dmg:d.dmg, el:d.el, col:d.col, rain:!!d.rain});
  else if (k === 'gren') S.grenades.push(Object.assign({}, d, {t0:S.t}));
  else if (k === 'boom'){ S.booms.push({x:d.x, y:d.y, r:d.r, t:S.t, col:AFFIX.patlayan.col}); addShake(6); burst(d.x, d.y, AFFIX.patlayan.col, 24, 300); boomHit(d.x, d.y, d.r, d.dmg, d.el); }
  else if (k === 'slam'){
    addShake(9); S.booms.push({x:d.x, y:FLOOR, r:d.r, t:S.t, col:S.e ? S.e.pal.light : C.ember, flat:true});
    if (Math.abs(p.x - d.x) < d.r && rowOf(p.y) === 1){
      const r = hurtPlayer({dmg:d.dmg, el:d.el, dir:Math.sign(p.x - d.x) || 1, fromX:d.x, who:S.e});
      if (r === 'dodged') dodgedFx(S.t - p.dodgeT < .1);
    }
  }
}

/* ---------- her kare: gönderimler ---------- */
function netTick(now){
  if (!lobby.ch || !lobby.subscribed || !acct) return;
  /* misafir lobi sahibine doğrudan bağlanmayı dener, kopunca 8 sn sonra tekrar dener */
  if (lobby.role === 'guest'){
    const h = lobby.others.find(o => o.role === 'host');
    if (h){ const P = peers[h.nick]; if (!P || (P.failed && now - P.t0 > 8000) || (!rtcOk(h.nick) && now - P.t0 > 15000)){ rtcClose(h.nick); rtcOpen(h.nick, true); } }
  }
  if (now - (lobby.pingT || 0) > 2000){
    lobby.pingT = now;
    const direct = lobby.others.filter(o => rtcOk(o.nick));
    if (direct.length) netSend(direct[0].nick, 'pi', {t:now}, true);
    else if (lobby.others.length) lobbySend('ping', {t:now, from:acct.name});
    renderLobby();
  }
  const N = S.net;
  if (!N){ return; }
  /* doğrudan bağlantıda saniyede 20 görüntü; sunucu üzerindeyse 8 ve olaylar toplu gider (Supabase saniyede 100 mesaj sınırı) */
  const direct = anyDirect(), iv = direct ? 50 : 125, batchOk = direct || now - (lobby.evT || 0) >= 125;
  if (N.host){
    if (N.evq.length && batchOk){ lobby.evT = now; netSend('*', 'ev', {rid:N.rid, l:N.evq}, true); N.evq = []; }
    if (S.vfx && S.vfx.length){ for (const v of S.vfx) (N.vxOut || (N.vxOut = [])).push([acct.name, v]); S.vfx = []; }
    if (N.vxOut && N.vxOut.length && batchOk){ netSend('*', 'vx', {rid:N.rid, l:N.vxOut}, true); N.vxOut = []; }
    if (S.mode === 'play' && now - (lobby.sendT || 0) >= iv){ lobby.sendT = now; netSend('*', 'w', worldSnap(), false); }
  } else if (S.mode === 'play'){
    const h = lobby.others.find(o => o.role === 'host'); if (!h) return;
    if (N.hits.length && batchOk){ lobby.evT = now; netSend(h.nick, 'hit', {rid:N.rid, l:N.hits}, true); N.hits = []; }
    if (S.vfx && S.vfx.length && batchOk){ netSend(h.nick, 'vx', {rid:N.rid, l:S.vfx}, true); S.vfx = []; }
    if (now - (lobby.sendT || 0) >= iv){ lobby.sendT = now; netSend(h.nick, 'p', Object.assign(myState(), {rid:N.rid}), false); }
  }
}

function drawPartner(){
  if (!lobby.ch || S.mode === 'title') return;
  for (const ps of Object.values(lobby.pstates)) drawMate(ps);
}
function drawMate(ps){
  const age = (performance.now() - ps.rx) / 1000;
  if (age > 1.5 || ps.lv !== attKey()) return;
  const col = partnerCol(ps.n);
  if (ps.dn){
    ctx.globalAlpha = .45; ctx.fillStyle = col; rr(ps.x - 9, ps.y - 22, 18, 22, 6); ctx.fill(); ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.font = `600 12px ${F_BODY}`; ctx.fillStyle = col;
    ctx.fillText(`${ps.n} düştü · ${ps.rs || ''}`, ps.x, ps.y - 30);
    return;
  }
  const k = Math.min(age, .1), x = ps.x + ps.vx * k, y = Math.min(FLOOR, ps.y + ps.vy * k);
  if (ps.h){
    /* ayağının altında takım rengi halka, üstünde kendi zırhı ve silahı */
    ctx.strokeStyle = rgba(col, .8); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 1, 16, 4, 0, 0, Math.PI * 2); ctx.stroke();
    drawHero(x, y, ps.f, Object.assign({}, ps.h, {ae:(ps.h.ae ?? 9) + age}));
  } else {
    ctx.globalAlpha = .78; drawBodyShape(x, y, ps.d ? C.frost : col); ctx.globalAlpha = 1;
    ctx.fillStyle = C.pit; ctx.fillRect(x + ps.f * 3 - 1.5, y - 40, 3, 3);
  }
  ctx.textAlign = 'center'; ctx.font = `600 12px ${F_BODY}`; ctx.fillStyle = col;
  ctx.fillText(ps.n || 'Arkadaş', x, y - 60);
  bar(x - 18, y - 56, 36, 4, ps.hp / Math.max(1, ps.mx), col);
}

/* ---------- döngü ---------- */
let qScale = 1;   // çizim yavaşsa otomatik düşer
function resize(){
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2) * qScale;
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
  if (cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
}
if (window.ResizeObserver) new ResizeObserver(resize).observe(cv); else window.addEventListener('resize', resize);
resize();
MAP.KeyN = 'next';
function handleMeta(){
  if (pressed.has('menu')){ pressed.delete('menu'); if (S.mode !== 'play' || paused) toMenu(); }
  if (pressed.has('next')){
    pressed.delete('next');
    if (S.mode === 'won'){ if (sel.s < 50) selectLevel(sel.c, sel.s + 1); else if (sel.c < 10) selectLevel(sel.c + 1, 1); }
  }
  if (pressed.has('pause')){ pressed.delete('pause'); if (S.mode === 'play'){ if (S.net) flash('Co-op oyunda durdurma yok, dünya herkes için akıyor.'); else paused = !paused; } }
  if (pressed.has('restart')){ pressed.delete('restart'); requestRun(); return; }
  if (pressed.has('confirm')){ pressed.delete('confirm'); if (S.mode !== 'play') requestRun(); else if (paused) paused = false; }
}
let last = performance.now(), costSum = 0, costN = 0;
function frame(now){
  let dt = (now - last) / 1000; last = now; if (dt > .1) dt = .1;
  const c0 = performance.now();
  handleMeta();
  if (S.mode === 'play' && !paused){
    /* geçen süreyi eşit küçük adımlara böl: her karede tam o kadar ilerlenir, ekran tazeleme hızından bağımsız akıcı */
    const n = Math.max(1, Math.ceil(dt / STEP - 1e-6)), h = dt / n;
    for (let i = 0; i < n && S.mode === 'play'; i++) if (step(h)) pressed.clear();
  } else pressed.clear();
  if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 30);
  if (S.e) S.e.shown += (S.e.hp - S.e.shown) * Math.min(1, dt * 4);
  netTick(now);
  autoNextTick(now);
  tcTick();
  render(now);
  /* kare başına iş 11 ms'yi geçerse çözünürlüğü kademeli düşür, rahatlayınca geri yükselt */
  costSum += performance.now() - c0; costN++;
  if (costN >= 45){
    const avg = costSum / costN; costSum = 0; costN = 0;
    if (avg > 11 && qScale > .5){ qScale = Math.max(.5, qScale - .15); resize(); }
    else if (avg < 5 && qScale < 1){ qScale = Math.min(1, qScale + .1); resize(); }
  }
  requestAnimationFrame(frame);
}
syncUI(); renderBag(); renderLog(); renderMarket(); renderLobby();
requestAnimationFrame(frame);
boot();
})();
