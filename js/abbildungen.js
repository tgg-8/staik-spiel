// abbildungen.js – eigene, schlichte Vektorgrafiken (SVG) für Bildaufgaben und Spickzettel.
// Jede Abbildung hat:
//   viewBox  – Koordinatensystem
//   basis    – SVG-Inhalt (Linien, Flächen)
//   punkte   – antippbare Punkte (Modus „antippen“), mit Namen für die Auflösung
//   marken   – nummerierte Marken (Modus „beschriften“)
//   loesung  – zusätzlicher SVG-Inhalt, der nach dem Prüfen eingeblendet wird
// Farben kommen über CSS-Klassen (abb-linie, abb-koerper …), damit Hell/Dunkel funktioniert.

/** Glatte Kurve durch Punkte (Catmull-Rom → kubische Bézierkurven). */
function kurve(p) {
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/* ---------- Seitansicht Mensch (Blick nach rechts) ---------- */
export const SEITE_KOERPER = `
  <path class="abb-koerper" d="M150,18 C176,18 190,38 189,58 L195,70 L188,74 C187,86 180,96 168,99 L167,116
    C182,124 190,142 189,168 C188,196 178,214 176,238 C175,256 183,272 181,296 C179,318 170,334 166,360
    C166,392 164,424 162,458 C162,474 158,488 158,510 C158,530 160,548 164,558 C178,566 196,570 206,576
    L206,584 L138,584 C134,566 137,546 136,520 C135,500 140,484 142,468 C140,440 132,410 130,384
    C116,374 108,356 112,336 C116,316 124,300 126,282 C128,260 120,246 120,222 C120,190 118,160 128,136
    C132,126 136,120 138,116 L137,100 C120,96 110,80 111,58 C112,34 128,18 150,18 Z"/>
  <path class="abb-linie abb-fein" d="M150,134 C156,170 160,220 158,270 C157,300 160,320 158,334"/>
  <ellipse class="abb-flaeche" cx="146" cy="64" rx="6" ry="10"/>`;

/* ---------- Fußabdruck rechter Fuß von oben ---------- */
const FUSS = `
  <path class="abb-koerper" d="M112,388 C80,388 66,362 68,332 C70,302 82,282 88,256 C94,230 74,204 66,174
    C58,144 62,120 82,112 C104,104 142,112 158,128 C172,142 170,170 162,202 C154,240 152,280 154,322
    C156,362 144,388 112,388 Z"/>
  <ellipse class="abb-koerper" cx="80" cy="80" rx="17" ry="23"/>
  <ellipse class="abb-koerper" cx="110" cy="74" rx="10" ry="13"/>
  <ellipse class="abb-koerper" cx="131" cy="83" rx="9" ry="12"/>
  <ellipse class="abb-koerper" cx="149" cy="96" rx="8" ry="11"/>
  <ellipse class="abb-koerper" cx="164" cy="113" rx="7" ry="9"/>
  <text class="abb-text" x="20" y="250">medial</text>
  <text class="abb-text" x="178" y="250">lateral</text>`;

/* ---------- Fußpaar mit Unterstützungsfläche ---------- */
function fussOben(x, gespiegelt) {
  const s = gespiegelt ? -1 : 1;
  return `<g transform="translate(${x},40) scale(${0.42 * s},0.42) translate(-112,0)">${FUSS.replace(/<text[^>]*>[^<]*<\/text>/g, '')}</g>`;
}

/* ---------- Rückentypen ---------- */
function rueckenFigur(x, hws, bws, lws, kopfVor) {
  const wirbel = [[x, 62], [x + hws, 92], [x + bws, 140], [x + lws, 192], [x, 222]];
  return `
    <circle class="abb-koerper" cx="${x + kopfVor}" cy="40" r="17"/>
    <path class="abb-linie abb-dick" d="${kurve(wirbel)}" fill="none"/>
    <path class="abb-koerper" d="M${x - 16},222 L${x + 22},222 L${x + 4},252 Z"/>
    <path class="abb-linie" d="M${x + 4},252 L${x + 4},300 L${x + 26},300"/>`;
}

/* ---------- Oberkörper Seitansicht für Janda-Kreuz ---------- */
const OBERKOERPER = `
  <path class="abb-koerper" d="M168,34 C190,34 204,50 204,70 L210,80 L203,84 C202,96 195,104 184,106 L184,122
    C204,128 214,150 214,180 C214,214 208,244 206,280 L112,280 C108,240 102,206 106,170 C108,140 118,124 136,118
    L136,104 C124,98 118,84 120,66 C122,46 142,34 168,34 Z"/>`;

const UNTERKOERPER = `
  <path class="abb-koerper" d="M118,20 L206,20 C210,60 212,90 220,120 C230,150 230,176 222,200 L214,300 L170,300
    L166,214 C150,214 132,214 120,206 C104,196 96,176 100,150 C104,120 112,90 116,60 Z"/>
  <path class="abb-linie abb-fein" d="M128,30 C122,70 118,100 124,128 C128,150 120,170 116,186"/>`;

/* ---------- Frontansicht für Breiten ---------- */
const FRONT = `
  <path class="abb-koerper" d="M130,12 C148,12 158,26 158,44 C158,62 150,74 142,78 L142,88 C162,90 180,92 190,100
    C200,108 202,130 202,160 L204,240 L194,242 L186,166 L180,200 C176,220 176,236 182,252 C188,276 184,300 178,330
    L172,404 L148,404 L140,300 L132,268 L128,268 L120,300 L112,404 L88,404 L82,330 C76,300 72,276 78,252
    C84,236 84,220 80,200 L74,166 L66,242 L56,240 L58,160 C58,130 60,108 70,100 C80,92 98,90 118,88 L118,78
    C110,74 102,62 102,44 C102,26 112,12 130,12 Z"/>`;

function messlinie(y, x1, x2) {
  return `<path class="abb-mass" d="M${x1},${y} L${x2},${y} M${x1},${y - 6} L${x1},${y + 6} M${x2},${y - 6} L${x2},${y + 6}"/>`;
}

export const ABBILDUNGEN = {
  'lot-sagittal': {
    titel: 'Seitansicht – Lot der mittleren Frontalebene',
    viewBox: '40 0 230 600',
    basis: SEITE_KOERPER + '<path class="abb-linie" d="M110,586 L230,586"/>',
    loesung: '<path class="abb-lot" d="M150,4 L150,596"/>',
    punkte: [
      { id: 'ohr', x: 147, y: 76, name: 'Ohrläppchen' },
      { id: 'schulter', x: 150, y: 140, name: 'Mitte Schultergelenk' },
      { id: 'trochanter', x: 150, y: 368, name: 'Trochanter major' },
      { id: 'knie', x: 151, y: 470, name: 'Kniegelenk' },
      { id: 'navi', x: 156, y: 562, name: 'Os naviculare' },
      { id: 'nase', x: 192, y: 70, name: 'Nasenspitze' },
      { id: 'brustbein', x: 184, y: 172, name: 'Brustbein' },
      { id: 'bauchnabel', x: 176, y: 272, name: 'Bauchnabel' },
      { id: 'gesaess', x: 114, y: 340, name: 'Gesäß' },
      { id: 'ferse', x: 139, y: 578, name: 'Ferse' },
      { id: 'zehen', x: 200, y: 578, name: 'Zehenspitzen' },
    ],
    marken: [],
  },
  usf: {
    titel: 'Beide Füße von oben mit Unterstützungsfläche',
    viewBox: '0 0 300 250',
    basis: fussOben(110, true) + fussOben(190, false) +
      '<path class="abb-usf" d="M70,62 L230,62 L238,206 L62,206 Z"/>',
    loesung: '',
    punkte: [
      { id: 'k1', x: 150, y: 140, name: 'in der Mitte der USF' },
      { id: 'k2', x: 150, y: 88, name: 'vorne, aber noch in der USF' },
      { id: 'k3', x: 150, y: 26, name: 'vor den Zehen – außerhalb' },
      { id: 'k4', x: 270, y: 140, name: 'seitlich – außerhalb' },
    ],
    marken: [],
  },
  fuss3: {
    titel: 'Rechter Fuß von oben (Fußabdruck)',
    viewBox: '0 40 230 360',
    basis: FUSS,
    loesung: '<path class="abb-lot" d="M112,360 L80,148 L150,166 Z" fill="none"/>',
    punkte: [
      { id: 'ferse', x: 112, y: 358, name: 'Ferse (Calcaneus)' },
      { id: 'mt1', x: 80, y: 148, name: 'Großzehenballen (Caput os metatarsale I)' },
      { id: 'mt5', x: 150, y: 166, name: 'Kleinzehenballen (Caput os metatarsale V)' },
      { id: 'grosszehe', x: 80, y: 72, name: 'Großzehe' },
      { id: 'gewoelbe', x: 92, y: 252, name: 'Innenseite des Längsgewölbes' },
      { id: 'mitte', x: 122, y: 214, name: 'Mitte des Fußes' },
      { id: 'aussen', x: 150, y: 290, name: 'Außenkante Mittelfuß' },
    ],
    marken: [],
  },
  ruecken: {
    titel: 'Rückentypen von der Seite',
    viewBox: '0 0 360 320',
    basis: rueckenFigur(60, 12, -24, 20, 6) + rueckenFigur(180, 12, -26, -6, 14) + rueckenFigur(300, 1, -6, 2, 0),
    loesung: [[60, ['+HWS', '+BWS', '+LWS']], [180, ['+HWS', '+BWS', '−LWS']], [300, ['−HWS', '−BWS', '−LWS']]]
      .map(([x, t]) => t.map((w, i) => `<text class="abb-name" x="${x + 24}" y="${[94, 142, 194][i]}">${w}</text>`).join('')).join(''),
    punkte: [],
    marken: [{ id: 't1', x: 60, y: 10 }, { id: 't2', x: 186, y: 10 }, { id: 't3', x: 300, y: 10 }],
  },
  'kreuz-oben': {
    titel: 'Oberes gekreuztes Syndrom – Kreuz-Schema (Seitansicht)',
    viewBox: '60 20 200 270',
    basis: OBERKOERPER + '<path class="abb-x" d="M122,96 L206,206"/><path class="abb-x" d="M196,108 L112,212"/>',
    loesung: '<path class="abb-x abb-hyper" d="M122,96 L206,206"/><path class="abb-x abb-hypo" d="M196,108 L112,212"/>',
    punkte: [],
    marken: [{ id: 'o1', x: 116, y: 88 }, { id: 'o2', x: 212, y: 214 }, { id: 'o3', x: 202, y: 100 }, { id: 'o4', x: 106, y: 220 }],
  },
  'kreuz-unten': {
    titel: 'Unteres gekreuztes Syndrom – Kreuz-Schema (Seitansicht)',
    viewBox: '70 0 190 310',
    basis: UNTERKOERPER + '<path class="abb-x" d="M112,70 L214,236"/><path class="abb-x" d="M216,70 L104,236"/>',
    loesung: '<path class="abb-x abb-hyper" d="M112,70 L214,236"/><path class="abb-x abb-hypo" d="M216,70 L104,236"/>',
    punkte: [],
    marken: [{ id: 'u1', x: 106, y: 62 }, { id: 'u2', x: 220, y: 244 }, { id: 'u3', x: 222, y: 62 }, { id: 'u4', x: 98, y: 244 }],
  },
  breiten: {
    titel: 'Breiten – Ansicht von ventral',
    viewBox: '0 0 260 420',
    basis: FRONT + messlinie(100, 76, 184) + messlinie(130, 84, 176) + messlinie(226, 98, 162) + messlinie(256, 82, 178) +
      '<circle class="abb-flaeche" cx="76" cy="100" r="4"/><circle class="abb-flaeche" cx="184" cy="100" r="4"/>',
    loesung: '',
    punkte: [],
    marken: [{ id: 'b1', x: 230, y: 100 }, { id: 'b2', x: 230, y: 130 }, { id: 'b3', x: 230, y: 226 }, { id: 'b4', x: 230, y: 256 }],
  },
};

/**
 * Baut das komplette SVG für eine Abbildung.
 * @param {string} id
 * @param {{punkteZeigen?:boolean, markenZeigen?:boolean, loesung?:boolean, titel?:string}} opt
 */
export function abbildungSvg(id, opt = {}) {
  const a = ABBILDUNGEN[id];
  if (!a) return '';
  const punkte = opt.punkteZeigen ? a.punkte.map((p) =>
    `<g class="abb-punkt" data-id="${p.id}" tabindex="0" role="button" aria-label="Punkt">
       <circle class="abb-punkt-ziel" cx="${p.x}" cy="${p.y}" r="17"/>
       <circle class="abb-punkt-kern" cx="${p.x}" cy="${p.y}" r="7"/>
     </g>`).join('') : '';
  const marken = opt.markenZeigen ? a.marken.map((m, i) =>
    `<g class="abb-marke" data-id="${m.id}"><circle cx="${m.x}" cy="${m.y}" r="12"/><text x="${m.x}" y="${m.y + 5}" text-anchor="middle">${i + 1}</text></g>`).join('') : '';
  return `<svg class="abbildung" viewBox="${a.viewBox}" role="img" aria-label="${opt.titel || a.titel}" xmlns="http://www.w3.org/2000/svg">
    ${a.basis}${opt.loesung ? a.loesung : ''}${punkte}${marken}</svg>`;
}
