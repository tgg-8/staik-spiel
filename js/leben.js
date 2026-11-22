// leben.js – Leben auf dem Hof: Pferde, Hühner, Küken, Schmetterlinge.
// Ein einziger requestAnimationFrame-Takt bewegt alle Tiere über SVG-Transformationen.
// Tiere bleiben in ihren Zonen (Weide, Hühnerhof, Wege) – dort steht kein Gebäude,
// und sie liegen im SVG unter Kopfzeile und Knöpfen, verdecken also keine Bedienung.
// Der Takt pausiert, wenn die App verborgen ist oder ein Dialog/Lernbildschirm offen ist.

import { ANORDNUNG } from './farm.js';

const NS = 'http://www.w3.org/2000/svg';
let zustand = null;   // { format, tiere[], ebene, raf, letzte, klangFn }
let laufend = false;

const zufall = (a, b) => a + Math.random() * (b - a);
const wahl = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ---------------- Zeichnungen (lokal, Blick nach rechts) ---------------- */

const PFERD_FARBEN = [['#8a5a35', '#4a2e1a'], ['#c9a27a', '#6b4a2c'], ['#5b4233', '#2a1d14'], ['#e8dfd2', '#9a8f80']];

function pferdSvg(farbe) {
  const [fell, maehne] = farbe;
  return `<ellipse class="tier-schatten" cx="0" cy="2" rx="34" ry="6"/>
    <g class="beine">
      <path class="bein b1" d="M-20,-22 L-22,0" stroke="${fell}" stroke-width="6" stroke-linecap="round"/>
      <path class="bein b2" d="M-12,-22 L-12,0" stroke="${maehne}" stroke-width="6" stroke-linecap="round" opacity=".75"/>
      <path class="bein b3" d="M14,-22 L16,0" stroke="${fell}" stroke-width="6" stroke-linecap="round"/>
      <path class="bein b4" d="M22,-22 L22,0" stroke="${maehne}" stroke-width="6" stroke-linecap="round" opacity=".75"/>
    </g>
    <path d="M-28,-34 Q-40,-30 -38,-12" stroke="${maehne}" stroke-width="5" fill="none" stroke-linecap="round" class="schweif"/>
    <ellipse cx="-2" cy="-30" rx="30" ry="13" fill="${fell}"/>
    <ellipse cx="-6" cy="-36" rx="20" ry="5" fill="#fff" opacity=".12"/>
    <g class="kopf">
      <path d="M18,-36 Q26,-52 34,-58 L40,-50 Q30,-40 26,-26 Z" fill="${fell}"/>
      <path d="M32,-60 Q46,-58 50,-48 Q48,-42 42,-43 Q36,-46 32,-52 Z" fill="${fell}"/>
      <circle cx="41" cy="-53" r="1.8" fill="#1c140c"/>
      <path d="M34,-60 L33,-67 L38,-61 Z" fill="${maehne}"/>
      <path d="M20,-40 Q26,-56 34,-60" stroke="${maehne}" stroke-width="5" fill="none" stroke-linecap="round"/>
    </g>`;
}

function huhnSvg(kueken) {
  if (kueken) {
    return `<ellipse class="tier-schatten" cx="0" cy="1" rx="7" ry="2"/>
      <g class="koerper"><circle cx="0" cy="-6" r="5.5" fill="#f3d36b"/><circle cx="3.5" cy="-10" r="3.8" fill="#f6dc7c"/>
      <circle cx="4.6" cy="-10.6" r=".8" fill="#2a1d10"/><path d="M7,-10 L9.5,-9.3 L7,-8.6 Z" fill="#e39a3b"/></g>
      <path d="M-1.5,-1 L-1.5,1 M1.5,-1 L1.5,1" stroke="#d58a32" stroke-width="1.2"/>`;
  }
  return `<ellipse class="tier-schatten" cx="0" cy="1" rx="12" ry="3"/>
    <path d="M-2,-2 L-3,1 M3,-2 L3,1" stroke="#d58a32" stroke-width="1.8" stroke-linecap="round"/>
    <g class="koerper">
      <path d="M-13,-14 Q-16,-22 -9,-20 Q-12,-26 -5,-22 L-6,-12 Z" fill="#a05a2c"/>
      <ellipse cx="-1" cy="-10" rx="11" ry="8.5" fill="#f4ece0"/>
      <path d="M-6,-12 Q0,-6 6,-11" stroke="#d9cdbb" stroke-width="2" fill="none"/>
      <g class="kopf"><circle cx="8" cy="-19" r="5.5" fill="#f4ece0"/>
        <path d="M5,-25 Q7,-28 9,-25 Q11,-28 12,-24 L6,-23 Z" fill="#c8402c"/>
        <path d="M13,-19 L17,-18 L13,-16.5 Z" fill="#e39a3b"/><path d="M11,-16 Q12,-13 10.5,-13 Q9.5,-14.5 11,-16 Z" fill="#c8402c"/>
        <circle cx="10" cy="-20" r="1" fill="#2a1d10"/></g>
    </g>`;
}

function falterSvg(farbe) {
  return `<g class="fluegel-l"><path d="M0,0 Q-9,-10 -10,-2 Q-9,5 0,1 Z" fill="${farbe}"/></g>
    <g class="fluegel-r"><path d="M0,0 Q9,-10 10,-2 Q9,5 0,1 Z" fill="${farbe}" opacity=".85"/></g>
    <path d="M0,-3 L0,3" stroke="#3a2a1a" stroke-width="1.4" stroke-linecap="round"/>`;
}

/* ---------------- Zonen ---------------- */

function inWeide(a, x, y) {
  const w = a.weide;
  return { x: Math.max(w.x1 + 40, Math.min(w.x2 - 50, x)), y: Math.max(w.y1 + 30, Math.min(w.y2 - 18, y)) };
}
function inHuehnerhof(a, x, y) {
  const h = a.huehner;
  const dx = (x - h.cx) / h.rx, dy = (y - h.cy) / h.ry;
  const d = Math.hypot(dx, dy);
  if (d <= 1) return { x, y };
  return { x: h.cx + (dx / d) * h.rx, y: h.cy + (dy / d) * h.ry };
}
function punktInHuehnerhof(a) {
  const w = zufall(0, Math.PI * 2), r = Math.sqrt(Math.random());
  return { x: a.huehner.cx + Math.cos(w) * a.huehner.rx * r, y: a.huehner.cy + Math.sin(w) * a.huehner.ry * r };
}

/* ---------------- Tiere anlegen ---------------- */

/** Wie viele Tiere es je Level gibt (wächst mit dem Hof). */
export function tierAnzahl(level) {
  return {
    pferde: level >= 5 ? 3 : level >= 3 ? 2 : 1,
    huehner: Math.min(2 + Math.floor(level / 2), 5),
    kueken: Math.min(2 + level, 7),
    falter: level >= 4 ? 4 : level >= 2 ? 3 : 2,
  };
}

function neueTiere(a, anz) {
  const tiere = [];
  for (let i = 0; i < anz.pferde; i++) {
    const p = inWeide(a, zufall(a.weide.x1, a.weide.x2), zufall(a.weide.y1, a.weide.y2));
    tiere.push({ art: 'pferd', x: p.x, y: p.y, richtung: Math.random() < 0.5 ? -1 : 1, modus: 'grasen', zeit: zufall(1, 4), farbe: PFERD_FARBEN[i % PFERD_FARBEN.length], phase: zufall(0, 6), kopf: 0, ziel: null, pfad: null });
  }
  for (let i = 0; i < anz.huehner; i++) {
    const p = punktInHuehnerhof(a);
    tiere.push({ art: 'huhn', x: p.x, y: p.y, richtung: Math.random() < 0.5 ? -1 : 1, modus: 'picken', zeit: zufall(0.5, 3), phase: zufall(0, 6), hupf: 0, ziel: null });
  }
  for (let i = 0; i < anz.kueken; i++) {
    const p = punktInHuehnerhof(a);
    tiere.push({ art: 'kueken', x: p.x, y: p.y, richtung: Math.random() < 0.5 ? -1 : 1, modus: 'stehen', zeit: zufall(0.3, 2), phase: zufall(0, 6), hupf: 0, ziel: null, mutter: i % Math.max(1, anz.huehner) });
  }
  for (let i = 0; i < anz.falter; i++) {
    const [x1, y1, x2, y2] = a.falter[i % a.falter.length];
    tiere.push({ art: 'falter', box: [x1, y1, x2, y2], x: zufall(x1, x2), y: zufall(y1, y2), phase: zufall(0, 10), tempo: zufall(0.25, 0.45), farbe: wahl(['#f2c14e', '#f4f1ea', '#e58f65', '#b9a3e3']) });
  }
  return tiere;
}

function knoten(t) {
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('class', `tier tier-${t.art}`);
  if (t.art !== 'falter') {
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', { pferd: 'Pferd', huhn: 'Huhn', kueken: 'Küken' }[t.art]);
  } else g.setAttribute('aria-hidden', 'true');
  const innen = document.createElementNS(NS, 'g');
  innen.setAttribute('class', 'tier-innen');
  innen.innerHTML = t.art === 'pferd' ? pferdSvg(t.farbe) : t.art === 'falter' ? falterSvg(t.farbe) : huhnSvg(t.art === 'kueken');
  // großzügige, unsichtbare Tippfläche
  if (t.art !== 'falter') {
    const r = document.createElementNS(NS, 'rect');
    const [w, h] = t.art === 'pferd' ? [96, 80] : t.art === 'huhn' ? [44, 40] : [30, 26];
    r.setAttribute('x', -w / 2); r.setAttribute('y', -h + 6); r.setAttribute('width', w); r.setAttribute('height', h);
    r.setAttribute('fill', 'transparent');
    innen.appendChild(r);
  }
  g.appendChild(innen);
  t.el = g; t.innen = innen;
  t.kopfEl = innen.querySelector('.kopf');
  t.beine = [...innen.querySelectorAll('.bein')];
  t.fl = [innen.querySelector('.fluegel-l'), innen.querySelector('.fluegel-r')];
  t.koerper = innen.querySelector('.koerper');
  return g;
}

/* ---------------- Verhalten ---------------- */

function neuesZiel(a, t) {
  if (t.art === 'pferd') {
    // Manchmal läuft ein Pferd ein Stück den Weg hinunter und wieder zurück.
    if (a.pferdeweg && Math.random() < 0.18 && !zustand.tiere.some((o) => o !== t && o.pfad)) {
      t.pfad = [...a.pferdeweg, ...a.pferdeweg.slice(0, -1).reverse()].map(([x, y]) => ({ x, y }));
      // erst zum Tor
      const tor = t.pfad[0];
      t.ziel = { x: tor.x, y: tor.y };
      t.pfadIndex = 0;
      return;
    }
    const p = inWeide(a, t.x + zufall(-170, 170), t.y + zufall(-30, 30));
    t.ziel = p;
  } else {
    let p;
    if (t.art === 'kueken' && Math.random() < 0.65) {
      const m = zustand.tiere.filter((o) => o.art === 'huhn')[t.mutter];
      p = m ? inHuehnerhof(a, m.x + zufall(-18, 18), m.y + zufall(-8, 10)) : punktInHuehnerhof(a);
    } else p = inHuehnerhof(a, t.x + zufall(-40, 40), t.y + zufall(-16, 16));
    t.ziel = p;
  }
}

function schritt(t, a, dt, zeit) {
  if (t.art === 'falter') {
    t.phase += dt * t.tempo;
    const [x1, y1, x2, y2] = t.box;
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, rx = (x2 - x1) / 2, ry = (y2 - y1) / 2;
    const nx = cx + Math.sin(t.phase * 1.3) * rx * Math.cos(t.phase * 0.37);
    const ny = cy + Math.sin(t.phase * 2.1) * ry * 0.8 + Math.sin(zeit * 7 + t.phase) * 3;
    t.richtung = nx >= t.x ? 1 : -1;
    t.x = nx; t.y = ny;
    const flap = 0.25 + Math.abs(Math.sin(zeit * 16 + t.phase)) * 0.75;
    t.fl[0].setAttribute('transform', `scale(${flap},1)`);
    t.fl[1].setAttribute('transform', `scale(${flap},1)`);
    t.el.setAttribute('transform', `translate(${t.x.toFixed(1)},${t.y.toFixed(1)})`);
    return;
  }

  t.zeit -= dt;
  const tempo = t.art === 'pferd' ? 26 : t.art === 'huhn' ? 30 : 38;
  let geht = false;

  if (t.modus === 'gehen' && t.ziel) {
    const dx = t.ziel.x - t.x, dy = t.ziel.y - t.y, d = Math.hypot(dx, dy);
    if (d < 2) {
      t.x = t.ziel.x; t.y = t.ziel.y;
      if (t.pfad) {
        t.pfadIndex++;
        if (t.pfadIndex < t.pfad.length) { t.ziel = t.pfad[t.pfadIndex]; }
        else { t.pfad = null; t.ziel = null; t.modus = 'grasen'; t.zeit = zufall(2, 5); }
      } else { t.ziel = null; t.modus = t.art === 'pferd' ? wahl(['grasen', 'grasen', 'schauen']) : t.art === 'huhn' ? 'picken' : wahl(['picken', 'stehen']); t.zeit = zufall(1.5, 5); }
    } else {
      const v = Math.min(d, tempo * dt);
      t.x += (dx / d) * v; t.y += (dy / d) * v;
      if (Math.abs(dx) > 0.5) t.richtung = dx > 0 ? 1 : -1;
      geht = true;
    }
  } else if (t.zeit <= 0) {
    // nächster Zustand
    if (t.art === 'pferd') {
      const r = Math.random();
      if (r < 0.45) { neuesZiel(a, t); t.modus = 'gehen'; }
      else if (r < 0.7) { t.modus = 'schauen'; t.zeit = zufall(1.5, 3); if (Math.random() < 0.25) zustand.klangFn?.('schnauben', t); }
      else { t.modus = 'grasen'; t.zeit = zufall(2.5, 6); }
    } else {
      const r = Math.random();
      if (r < 0.5) { neuesZiel(a, t); t.modus = 'gehen'; }
      else { t.modus = t.art === 'huhn' ? 'picken' : wahl(['picken', 'stehen']); t.zeit = zufall(1, 3.5); }
    }
  }

  // Körperhaltung
  if (t.art === 'pferd') {
    const zielKopf = t.modus === 'grasen' ? 1 : 0;
    t.kopf += (zielKopf - t.kopf) * Math.min(1, dt * 3);
    const nick = t.modus === 'grasen' ? Math.sin(zeit * 2.2 + t.phase) * 3 : t.modus === 'schauen' ? Math.sin(zeit * 1.1 + t.phase) * 2 : 0;
    t.kopfEl?.setAttribute('transform', `rotate(${(t.kopf * 52 + nick).toFixed(1)} 22 -34)`);
    const bein = geht ? Math.sin(zeit * 9 + t.phase) * 16 : 0;
    t.beine.forEach((b, i) => b.setAttribute('transform', `rotate(${(i % 2 ? -bein : bein).toFixed(1)} ${i < 2 ? -16 : 18} -22)`));
  } else {
    const pick = t.modus === 'picken' ? Math.max(0, Math.sin(zeit * 6 + t.phase)) : 0;
    t.hupf = Math.max(0, t.hupf - dt * 2.4);
    const sprung = Math.sin(Math.min(1, 1 - t.hupf) * Math.PI) * (t.hupf > 0 ? 14 : 0);
    const watschel = geht ? Math.sin(zeit * 14 + t.phase) * 5 : 0;
    t.koerper?.setAttribute('transform', `translate(0,${(-sprung).toFixed(1)}) rotate(${(pick * 34 + watschel).toFixed(1)} ${t.art === 'huhn' ? 4 : 2} -4)`);
  }

  const s = t.art === 'pferd' ? perspektive(a, t.y) : perspektive(a, t.y);
  t.el.setAttribute('transform', `translate(${t.x.toFixed(1)},${t.y.toFixed(1)}) scale(${(t.richtung * s).toFixed(3)},${s.toFixed(3)})`);
}

/** Weiter hinten (kleineres y) wirkt ein Tier etwas kleiner. */
function perspektive(a, y) {
  return 0.72 + (y / a.hoehe) * 0.42;
}

function takt(jetzt) {
  if (!zustand || !laufend) return;
  const dt = Math.min(0.05, (jetzt - (zustand.letzte || jetzt)) / 1000);
  zustand.letzte = jetzt;
  const a = ANORDNUNG[zustand.format];
  const zeit = jetzt / 1000;
  for (const t of zustand.tiere) schritt(t, a, dt, zeit);
  // Tiefensortierung: wer weiter vorn steht, wird später gezeichnet
  if ((zustand.sortZaehler = (zustand.sortZaehler || 0) + 1) % 20 === 0) {
    const sortiert = zustand.tiere.slice().sort((p, q) => p.y - q.y);
    sortiert.forEach((t) => zustand.ebene.appendChild(t.el));
  }
  zustand.raf = requestAnimationFrame(takt);
}

function darfLaufen() {
  return !document.hidden && !document.querySelector('.lernen, .blatt') && zustand?.ebene?.isConnected && zustand.bewegt;
}

/** Startet bzw. pausiert den Takt passend zum Zustand der Seite. */
export function pruefeTakt() {
  if (!zustand) return;
  const soll = darfLaufen();
  if (soll && !laufend) { laufend = true; zustand.letzte = 0; zustand.raf = requestAnimationFrame(takt); }
  else if (!soll && laufend) { laufend = false; cancelAnimationFrame(zustand.raf); }
}

/**
 * Setzt die Tiere in die (neu gezeichnete) Hof-Szene.
 * @param {SVGSVGElement} svg
 * @param {object} opt { format, level, tiere:boolean, bewegt:boolean, onTier(t, art) }
 */
export function belebe(svg, { format, level, tiere = true, bewegt = true, onTier = null, klangFn = null }) {
  const ebene = svg.querySelector('.tier-ebene');
  if (!ebene) return;
  const a = ANORDNUNG[format];
  const anz = tiere ? tierAnzahl(level) : { pferde: 0, huehner: 0, kueken: 0, falter: 0 };
  const schluessel = `${format}:${anz.pferde}:${anz.huehner}:${anz.kueken}:${anz.falter}`;
  // Tiere beim Neuzeichnen behalten (sie laufen einfach weiter, statt neu aufzutauchen)
  const tierListe = zustand && zustand.schluessel === schluessel ? zustand.tiere : neueTiere(a, anz);
  if (zustand && laufend) { cancelAnimationFrame(zustand.raf); laufend = false; }
  zustand = { format, tiere: tierListe, ebene, schluessel, bewegt, klangFn, letzte: 0 };
  try { if (bewegt) svg.unpauseAnimations(); else svg.pauseAnimations(); } catch { /* ältere Browser */ }
  ebene.innerHTML = '';
  for (const t of tierListe) ebene.appendChild(knoten(t));
  // einmal zeichnen (auch wenn keine Bewegung erlaubt ist)
  for (const t of tierListe) schritt(t, a, 0, performance.now() / 1000);
  ebene.onclick = (e) => {
    const g = e.target.closest('.tier');
    if (!g) return;
    const t = tierListe.find((x) => x.el === g);
    if (!t) return;
    e.stopPropagation();
    reagiere(t);
    onTier?.(t, t.art);
  };
  pruefeTakt();
}

/** Reaktion auf Antippen: Huhn/Küken hüpfen, Pferd hebt den Kopf. */
export function reagiere(t) {
  if (t.art === 'huhn' || t.art === 'kueken') {
    t.hupf = 1; t.modus = 'stehen'; t.zeit = 1.2;
    zustand?.klangFn?.(t.art === 'huhn' ? 'gacker' : 'piep', t);
    // Nachbarn erschrecken sich ein bisschen mit
    for (const o of zustand.tiere) if (o !== t && (o.art === 'kueken' || o.art === 'huhn') && Math.hypot(o.x - t.x, o.y - t.y) < 40) o.hupf = Math.max(o.hupf, 0.6);
  } else if (t.art === 'pferd') {
    t.modus = 'schauen'; t.zeit = 2.5; t.ziel = null; t.pfad = null;
    zustand?.klangFn?.(Math.random() < 0.5 ? 'wiehern' : 'schnauben', t);
  }
  if (!laufend && zustand) { const a = ANORDNUNG[zustand.format]; schritt(t, a, 0, performance.now() / 1000); }
}

/** Nur für Tests: aktuelle Tierpositionen. */
export function tierPositionen() {
  return zustand ? zustand.tiere.map((t) => ({ art: t.art, x: t.x, y: t.y })) : [];
}
export function laeuft() { return laufend; }

document.addEventListener('visibilitychange', pruefeTakt);
