/* ===================== EŞYA İKONLARI ===================== */
'use strict';
/* Her eşyanın ikonu: şekil silah türünden ya da class ve yuvadan, renkler bölümün paletinden,
   köşedeki taş elementten gelir. 30 temel şekil × 10 bölüm paleti = 300 farklı ikon. */
function hexMix(a, b, t){
  const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const ICON_FX = {stun:'#e8d44d', slow:'#8fd3ea', heal:'#7de08a', barrier:'#86c9dd', poison:'#93c84a'};
function iconColors(it){
  const pal = CHAPTERS[it.tier - 1].pal;
  const cls = it.cls ? CLASSES[it.cls].col : '#b0a890';
  const el = it.slot === 'silah' ? it.el : it.res;
  return {
    bg:pal.bot, bd:pal.wallHi, accent:pal.light, metal:hexMix(pal.mobHi, '#c8ccd4', .45),
    metalDk:hexMix(pal.mobHi, '#30343c', .55), wood:hexMix('#8a5a32', pal.mob, .3),
    cls:hexMix(cls, pal.mob, .2), clsDk:hexMix(cls, '#120e18', .45), el:el && EL[el] ? EL[el].col : null
  };
}
function iconShape(it, c){
  const W_ = {
    yay: () => `<path d="M13 6 Q31 20 13 34" fill="none" stroke="${c.wood}" stroke-width="3.2" stroke-linecap="round"/>
      <line x1="13" y1="6" x2="13" y2="34" stroke="${c.metal}" stroke-width="1"/>
      <line x1="9" y1="20" x2="31" y2="20" stroke="${c.metal}" stroke-width="2"/>
      <path d="M33 20 l-6 -3.5 v7z" fill="${c.el || c.accent}"/><path d="M9 20 l-3 -3 M9 20 l-3 3" stroke="${c.accent}" stroke-width="1.6"/>`,
    patlayan: () => `<path d="M11 6 Q29 20 11 34" fill="none" stroke="${c.wood}" stroke-width="3.2" stroke-linecap="round"/>
      <line x1="11" y1="6" x2="11" y2="34" stroke="${c.metal}" stroke-width="1"/>
      <line x1="8" y1="20" x2="25" y2="20" stroke="${c.metal}" stroke-width="2"/>
      <circle cx="29" cy="20" r="8" fill="${c.el || c.accent}" opacity=".3"/><circle cx="29" cy="20" r="4.2" fill="${c.el || c.accent}"/>
      <path d="M29 9 v4 M29 27 v4 M18.5 20 h0 M37 20 h-3 M22 13 l2.5 2.5 M36 13 l-2.5 2.5 M36 27 l-2.5 -2.5" stroke="${c.el || c.accent}" stroke-width="1.6" stroke-linecap="round"/>`,
    delici: () => `<path d="M10 6 Q28 20 10 34" fill="none" stroke="${c.wood}" stroke-width="3.2" stroke-linecap="round"/>
      <line x1="10" y1="6" x2="10" y2="34" stroke="${c.metal}" stroke-width="1"/>
      <line x1="6" y1="20" x2="35" y2="20" stroke="${c.metal}" stroke-width="2"/><path d="M37 20 l-6 -3.5 v7z" fill="${c.el || c.accent}"/>
      <path d="M22 13 v14 M28 14 v12" stroke="${c.accent}" stroke-width="1.6" opacity=".7"/>`,
    hancer: () => `<path d="M20 4 L24.5 24 L15.5 24 Z" fill="${c.metal}"/><path d="M20 6 V23" stroke="${c.metalDk}" stroke-width="1"/>
      <rect x="12" y="24" width="16" height="3.5" rx="1.5" fill="${c.accent}"/><rect x="17.8" y="27.5" width="4.4" height="8" rx="1.5" fill="${c.wood}"/>`,
    zehirli: () => `<path d="M18 4 L22.5 24 L13.5 24 Z" fill="${hexMix(c.metal, ICON_FX.poison, .45)}"/>
      <rect x="10" y="24" width="16" height="3.5" rx="1.5" fill="${c.accent}"/><rect x="15.8" y="27.5" width="4.4" height="8" rx="1.5" fill="${c.wood}"/>
      <path d="M28 10 q4.5 6 0 9 q-4.5 -3 0 -9z" fill="${ICON_FX.poison}"/><path d="M31 21 q3 4 0 6 q-3 -2 0 -6z" fill="${ICON_FX.poison}"/>`,
    kalkan: () => `<line x1="8" y1="6" x2="32" y2="34" stroke="${c.metal}" stroke-width="3" stroke-linecap="round"/><line x1="11" y1="13" x2="15" y2="9" stroke="${c.accent}" stroke-width="2.5"/>
      <path d="M13 11 h15 v10 q0 9 -7.5 13 q-7.5 -4 -7.5 -13z" fill="${c.cls}" stroke="${c.metal}" stroke-width="1.6"/>
      <path d="M20.5 14 v16 M15 19 h11" stroke="${c.accent}" stroke-width="1.5"/>`,
    cekic: () => `<line x1="11" y1="34" x2="25" y2="12" stroke="${c.wood}" stroke-width="3.6" stroke-linecap="round"/>
      <g transform="rotate(32 25 12)"><rect x="16" y="5" width="18" height="12" rx="2" fill="${c.metal}"/><rect x="16" y="5" width="4" height="12" fill="${c.metalDk}"/></g>`,
    simsek: () => `<line x1="12" y1="35" x2="23" y2="13" stroke="${c.wood}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="26" cy="10" r="7.5" fill="${ICON_FX.stun}" opacity=".28"/><path d="M28 3 l-6 8 h4.5 l-3.5 8 l8 -10 h-4.5 l3.5 -6z" fill="${ICON_FX.stun}"/>`,
    ayaz: () => `<line x1="12" y1="35" x2="23" y2="13" stroke="${c.wood}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="26" cy="10" r="7.5" fill="${ICON_FX.slow}" opacity=".25"/>
      <path d="M26 3 v14 M20 6.5 l12 7 M20 13.5 l12 -7" stroke="${ICON_FX.slow}" stroke-width="2" stroke-linecap="round"/>`,
    sifa: () => `<line x1="12" y1="35" x2="23" y2="13" stroke="${c.wood}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="26" cy="10" r="7.5" fill="${ICON_FX.heal}" opacity=".3"/><path d="M26 5 v10 M21 10 h10" stroke="${ICON_FX.heal}" stroke-width="3" stroke-linecap="round"/>`,
    bariyer: () => `<line x1="12" y1="35" x2="23" y2="13" stroke="${c.wood}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="26" cy="10" r="7.5" fill="none" stroke="${ICON_FX.barrier}" stroke-width="2"/><circle cx="26" cy="10" r="3.2" fill="${ICON_FX.barrier}"/>
      <path d="M19 18 a9 9 0 0 1 -1 -6" stroke="${ICON_FX.barrier}" stroke-width="1.2" fill="none" opacity=".6"/>`
  };
  if (it.slot === 'silah') return W_[it.weapon]();
  if (it.jewel === 'muska') return `<path d="M9 5 L20 19 L31 5" fill="none" stroke="${c.metal}" stroke-width="1.6"/>
    <path d="M20 17 q9 8 0 17 q-9 -9 0 -17z" fill="${c.el || c.accent}" stroke="${c.metal}" stroke-width="1.4"/><circle cx="18" cy="24" r="1.8" fill="#ffffff" opacity=".7"/>`;
  if (it.jewel === 'guc') return `<circle cx="20" cy="25" r="9" fill="none" stroke="${c.metal}" stroke-width="3.6"/>
    <path d="M14 16 l6 -10 l6 10z" fill="#ff6a4a" stroke="${c.metal}" stroke-width="1.2"/><path d="M20 9 v5" stroke="#ffffff" stroke-width="1.2" opacity=".7"/>`;
  if (it.jewel === 'ceviklik') return `<circle cx="18" cy="25" r="9" fill="none" stroke="${c.metal}" stroke-width="3.6"/>
    <path d="M20 15 q7 -10 17 -8 q-5 2 -7 7 q-4 -1 -10 1z" fill="${ICON_FX.barrier}"/><path d="M22 18 q6 -5 13 -4" stroke="${ICON_FX.barrier}" stroke-width="1.4" fill="none"/>`;
  const k = it.cls, s = it.slot, M = c.metal, A = c.accent, K = c.cls, D = c.clsDk;
  if (s === 'sapka'){
    if (k === 'okcu') return `<path d="M7 32 Q7 8 20 5 Q33 8 33 32 Q27 25 20 25 Q13 25 7 32z" fill="${K}"/><path d="M13.5 31 Q14 17 20 15 Q26 17 26.5 31z" fill="${D}"/><path d="M20 5 Q24 2 29 4" stroke="${K}" stroke-width="2.5" fill="none"/>`;
    if (k === 'suikastci') return `<rect x="5" y="14" width="27" height="11" rx="5.5" fill="${D}"/><path d="M11 19 h6 M21 19 h6" stroke="${A}" stroke-width="2.6" stroke-linecap="round"/><path d="M32 17 l5 -4 M32 22 l5 4" stroke="${D}" stroke-width="2.4" stroke-linecap="round"/>`;
    if (k === 'tank') return `<path d="M8 29 V16 Q8 5 20 5 Q32 5 32 16 V29 z" fill="${M}"/><rect x="11" y="16" width="18" height="3.4" rx="1" fill="${c.metalDk}"/><path d="M20 5 V15" stroke="${A}" stroke-width="2"/><path d="M8 29 h24" stroke="${c.metalDk}" stroke-width="2"/>`;
    return `<path d="M5 31 h30 l-4 -5 h-22z" fill="${K}"/><path d="M11 27 L23 3 L29 27z" fill="${K}"/><rect x="11" y="23" width="18" height="3.4" fill="${A}"/><circle cx="23" cy="4" r="2.2" fill="${A}"/>`;
  }
  if (s === 'kiyafet'){
    const torso = col => `<path d="M12 7 l-6 6 v21 h28 v-21 l-6 -6 l-3.5 4 h-9z" fill="${col}"/>`;
    if (k === 'okcu') return torso(K) + `<path d="M20 11 v23" stroke="${D}" stroke-width="1.6"/><path d="M16.5 15 l7 2.5 M16.5 20.5 l7 2.5 M16.5 26 l7 2.5" stroke="${A}" stroke-width="1.2"/>`;
    if (k === 'suikastci') return torso(D) + `<path d="M8 13 L32 31" stroke="${K}" stroke-width="3"/><path d="M14.5 7 q5.5 6 11 0" fill="none" stroke="${K}" stroke-width="2"/><circle cx="20" cy="22" r="1.8" fill="${A}"/>`;
    if (k === 'tank') return torso(M) + `<path d="M20 11 v23" stroke="${c.metalDk}" stroke-width="2"/><circle cx="12" cy="17" r="1.4" fill="${c.metalDk}"/><circle cx="28" cy="17" r="1.4" fill="${c.metalDk}"/><circle cx="12" cy="28" r="1.4" fill="${c.metalDk}"/><circle cx="28" cy="28" r="1.4" fill="${c.metalDk}"/><path d="M6 13 h6 M28 13 h6" stroke="${A}" stroke-width="2"/>`;
    return `<path d="M13 6 l-5 5 l-3 25 h30 l-3 -25 l-5 -5 l-3.5 4 h-7z" fill="${K}"/><rect x="9" y="19" width="22" height="3" fill="${A}"/><path d="M20 10 v26" stroke="${D}" stroke-width="1.2"/><path d="M5 34 h30" stroke="${A}" stroke-width="2"/>`;
  }
  if (s === 'pantolon'){
    const legs = (col, wide) => `<path d="M11 5 h18 l${wide ? 4 : 2} 29 h-9 l-4 -18 l-4 18 h-9z" fill="${col}"/><rect x="11" y="5" width="18" height="3.5" fill="${A}"/>`;
    if (k === 'okcu') return legs(K) + `<path d="M12.5 16 l6 1.5 M22 17.5 l6 -1.5" stroke="${D}" stroke-width="2"/>`;
    if (k === 'suikastci') return `<path d="M11 5 h18 q8 18 2 29 h-8 l-3 -16 l-3 16 h-8 q-6 -11 2 -29z" fill="${D}"/><rect x="11" y="5" width="18" height="3.5" fill="${K}"/><path d="M9 31 h8 M23 31 h8" stroke="${K}" stroke-width="2"/>`;
    if (k === 'tank') return legs(c.metalDk) + `<rect x="9.5" y="19" width="8" height="7" rx="2" fill="${M}"/><rect x="22.5" y="19" width="8" height="7" rx="2" fill="${M}"/>`;
    return legs(K, true) + `<path d="M8 33 h9 M23 33 h10" stroke="${A}" stroke-width="2"/>`;
  }
  /* ayakkabı */
  if (k === 'okcu') return `<path d="M12 4 h11 v19 l10 4 v7 h-21z" fill="${K}"/><path d="M11 8 h13" stroke="${D}" stroke-width="3"/><path d="M12 34 h21" stroke="${D}" stroke-width="2"/>`;
  if (k === 'suikastci') return `<path d="M12 18 h10 v6 l11 4 q2 5 -2 6 h-19z" fill="${D}"/><path d="M14 22 h8" stroke="${K}" stroke-width="1.6"/><path d="M12 34 h20" stroke="${K}" stroke-width="2"/>`;
  if (k === 'tank') return `<path d="M11 5 h12 v18 l10 4 v8 h-22z" fill="${M}"/><path d="M11 13 h12 M11 20 h12" stroke="${c.metalDk}" stroke-width="2"/><path d="M23 27 h10" stroke="${A}" stroke-width="2"/><path d="M11 35 h22" stroke="${c.metalDk}" stroke-width="2.4"/>`;
  return `<path d="M8 31 h26 q2 2 0 4 h-26z" fill="${c.wood}"/><path d="M12 31 L18 20 L24 31 M15 25 l12 2 M18 20 v-8" stroke="${K}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
}
function itemIconSVG(it, size, plain){
  const c = iconColors(it);
  const gem = c.el ? `<circle cx="8.5" cy="8.5" r="3.6" fill="${c.el}" stroke="${c.bg}" stroke-width="1.5"/>` : '';
  const tier = plain ? '' : `<text x="35.5" y="36" font-size="7.5" text-anchor="end" fill="${c.accent}" font-family="ui-monospace, Menlo, monospace" font-weight="700">${it.tier}</text>`;
  const frame = it.rare
    ? `<rect x="1.2" y="1.2" width="37.6" height="37.6" rx="7" fill="${c.bg}" stroke="#f2c14e" stroke-width="2.4"/><rect x="4" y="4" width="32" height="32" rx="5" fill="none" stroke="#f2c14e" stroke-width=".8" opacity=".45"/>`
    : `<rect x="1" y="1" width="38" height="38" rx="7" fill="${c.bg}" stroke="${c.bd}" stroke-width="1.5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true">`
    + frame + iconShape(it, c) + gem + tier + `</svg>`;
}
/* ---------- etki etiketlerinin küçük ikonları ---------- */
const TAG_SVG = {
  aoe:'<circle cx="8" cy="8" r="2.3" fill="currentColor"/><circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2.2 1.6"/>',
  single:'<circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/><path d="M8 1v3M8 12v3M1 8h3M12 8h3" stroke="currentColor" stroke-width="1.3"/>',
  pierce:'<path d="M5 3.5v9M9 3.5v9" stroke="currentColor" stroke-width="1.2" opacity=".55"/><path d="M1 8h11" stroke="currentColor" stroke-width="1.5"/><path d="M15 8l-4-2.8v5.6z" fill="currentColor"/>',
  poison:'<path d="M8 1.5q5.5 6.5 0 13q-5.5-6.5 0-13z" fill="currentColor"/>',
  stun:'<path d="M9.5 1l-6 8h4l-2 6l6.5-8.5h-4l1.5-5.5z" fill="currentColor"/>',
  slow:'<path d="M8 1.5v13M2.4 4.8l11.2 6.4M2.4 11.2l11.2-6.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  heal:'<path d="M8 2.5v11M2.5 8h11" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  barrier:'<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="2.4" fill="currentColor"/>',
  backstab:'<path d="M3 13q0-8.5 8.5-8.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M11 1.5v6l3.8-3z" fill="currentColor"/>',
  block:'<path d="M3 2.5h10v5q0 5-5 7q-5-2-5-7z" fill="currentColor"/>',
  shieldbreak:'<path d="M3 2.5h10v5q0 5-5 7q-5-2-5-7z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8.5 2.5l-2 4l3 1.5l-2 5" stroke="currentColor" stroke-width="1.4" fill="none"/>',
  ranged:'<path d="M4 2q8 6 0 12" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 8h10" stroke="currentColor" stroke-width="1.3"/><path d="M15 8l-3.4-2.2v4.4z" fill="currentColor"/>',
  melee:'<path d="M13.5 2.5l-7.5 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 8.5l3.5 3.5M3 13l2-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  dodge:'<path d="M1.5 5h5.5M1 8h7M1.5 11h5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="12" cy="8" r="2.8" fill="currentColor"/>',
  blink:'<path d="M8 1l1.6 4.9L14.5 8l-4.9 1.6L8 15l-1.6-5.4L1.5 8l4.9-2.1z" fill="currentColor"/>',
  hp:'<path d="M8 14S1.5 9.8 1.5 5.6A3.4 3.4 0 0 1 8 3.8a3.4 3.4 0 0 1 6.5 1.8C14.5 9.8 8 14 8 14z" fill="currentColor"/>',
  dmg:'<path d="M8 1.5l5.5 6.5h-3.3v6.5H5.8V8H2.5z" fill="currentColor"/>',
  speed:'<path d="M2.5 3l5 5l-5 5M8 3l5 5l-5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  armor:'<path d="M3 2.5h10v5q0 5-5 7q-5-2-5-7z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 8h5" stroke="currentColor" stroke-width="1.5"/>',
  cd:'<path d="M4 1.5h8M4 14.5h8M5 1.5q0 4 3 6.5q-3 2.5-3 6.5M11 1.5q0 4-3 6.5q3 2.5 3 6.5" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  resist:'<path d="M3 2.5h10v5q0 5-5 7q-5-2-5-7z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="7.5" r="2.4" fill="currentColor"/>',
  set:'<rect x="1.5" y="5.5" width="7" height="5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="7.5" y="5.5" width="7" height="5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  el:'<path d="M8 1.5l5 4.5l-5 8.5l-5-8.5z" fill="currentColor"/>'
};
function tagSVG(k){ return `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">${TAG_SVG[k] || TAG_SVG.el}</svg>`; }
