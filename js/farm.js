// farm.js – zeichnet den Hof als SVG-Szene.
// Ebenen von hinten nach vorn: Himmel (Tageszeit) → ferne Hügel → Weide → Wege →
// Gebäude mit Beet (Kornfeld je Thema) → Deko. Die Tiere setzt leben.js darüber.
// Gebäude sind in lokalen Koordinaten gezeichnet: (0,0) = Mitte unten, ca. 200 breit.
// Alle Farben kommen aus CSS-Variablen (Hell/Dunkel, Tageszeit).

import { esc } from './formel.js';
import { REIF } from './feld.js';

/* ================= Hilfen ================= */

const schatten = (rx, ry = 12, y = 2) => `<ellipse cx="0" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#g-schatten)"/>`;
// halbtransparente Flächen für Licht und Schatten (wirkt auf jede Grundfarbe)
const dunkel = (d, o = 0.16) => `<path d="${d}" fill="#2a1a08" opacity="${o}"/>`;
const hell = (d, o = 0.18) => `<path d="${d}" fill="#fff8e6" opacity="${o}"/>`;
const fenster = (x, y, w, h) => `<rect class="fenster" x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/><path d="M${x + w / 2},${y} L${x + w / 2},${y + h} M${x},${y + h / 2} L${x + w},${y + h / 2}" stroke="var(--holz)" stroke-width="2"/>`;

/* ================= Gebäude ================= */
// Jedes Gebäude: zeichne(aktiv) liefert SVG; hoehe für Badges; beet = Lage des Kornbeets.

const GEBAEUDE = {
  kornfeld: {
    hoehe: 92,
    beet: { x: -96, y: -70, b: 192, h: 70, eigen: true }, // das Feld IST das Gebäude
    zeichne: () => `
      ${schatten(120, 14, 4)}
      <path class="fl-erde" d="M-114,0 L114,0 L94,-76 L-94,-76 Z"/>
      ${[0, 1, 2, 3, 4].map((r) => { const y = -8 - r * 15, b = 106 - r * 4; return `<path d="M${-b},${y} L${b},${y}" stroke="#3b2612" stroke-opacity=".22" stroke-width="5" stroke-linecap="round"/>`; }).join('')}
      ${hell('M-94,-76 L94,-76 L96,-70 L-96,-70 Z', 0.25)}
      <g class="zaun-holz">${[-118, -60, 0, 60, 118].map((x) => `<rect x="${x - 3}" y="-14" width="6" height="18" rx="2"/>`).join('')}<rect x="-120" y="-9" width="240" height="4" rx="2"/></g>
      <g transform="translate(-122,-30)">
        <path d="M0,30 L0,-14 M-14,-6 L14,-6" stroke="var(--holz)" stroke-width="4" stroke-linecap="round"/>
        <circle cx="0" cy="-20" r="8" class="fl-wand"/><path d="M-12,-22 L12,-22 L0,-34 Z" class="fl-acker2"/>
        <path d="M-9,-6 L9,-6 L6,12 L-6,12 Z" class="fl-dach"/>
      </g>`,
  },
  brunnen: {
    hoehe: 156,
    beet: { x: -186, y: -38, b: 104, h: 38 },
    zeichne: () => `
      ${schatten(64, 12, 4)}
      <path class="fl-stein" d="M-48,2 L-48,-42 Q0,-56 48,-42 L48,2 Q0,14 -48,2 Z"/>
      ${dunkel('M18,-46 Q36,-46 48,-42 L48,2 Q36,8 18,10 Z', 0.18)}
      <path d="M-48,-14 Q0,-2 48,-14 M-48,-28 Q0,-16 48,-28 M-20,-2 L-20,-16 M14,-16 L14,-30 M-30,-30 L-30,-44 M28,0 L28,-14" stroke="#3b2c1c" stroke-opacity=".22" stroke-width="1.6" fill="none"/>
      <ellipse cx="0" cy="-44" rx="48" ry="12" class="fl-stein"/><ellipse cx="0" cy="-44" rx="40" ry="8" class="fl-wasser"/>
      <ellipse cx="-10" cy="-46" rx="16" ry="3" fill="#fff" opacity=".35"/>
      <path d="M-40,-46 L-40,-120 M40,-46 L40,-120" stroke="var(--holz)" stroke-width="8" stroke-linecap="round"/>
      <path class="fl-dach" d="M-66,-110 L0,-156 L66,-110 L56,-104 L0,-142 L-56,-104 Z"/>
      ${dunkel('M0,-156 L66,-110 L56,-104 L0,-142 Z', 0.2)}
      <path d="M-40,-100 L40,-100" stroke="var(--holz)" stroke-width="5"/><circle cx="0" cy="-100" r="5" class="fl-holz"/>
      <path d="M6,-100 L6,-74" stroke="var(--tinte-2)" stroke-width="1.6"/>
      <path class="fl-holzhell" d="M-5,-74 L17,-74 L15,-56 L-3,-56 Z"/>`,
  },
  muehle: {
    hoehe: 186,
    beet: { x: 56, y: -38, b: 104, h: 38 },
    zeichne: (aktiv) => `
      ${schatten(58, 12, 4)}
      <path class="fl-wand" d="M-44,0 L44,0 L30,-130 L-30,-130 Z"/>
      ${dunkel('M12,-130 L30,-130 L44,0 L18,0 Z', 0.17)}
      <path d="M-40,-40 L40,-40 M-36,-80 L36,-80" stroke="#6b4b2a" stroke-opacity=".18" stroke-width="2"/>
      <path class="fl-holz" d="M-12,0 L-12,-32 Q0,-46 12,-32 L12,0 Z"/>
      ${fenster(-9, -98, 18, 18)}
      <path class="fl-dach" d="M-38,-126 Q0,-182 38,-126 Z"/>${dunkel('M0,-160 Q24,-150 38,-126 L0,-126 Z', 0.2)}
      <g><g>${aktiv ? '<animateTransform attributeName="transform" type="rotate" from="0 0 -140" to="360 0 -140" dur="10s" repeatCount="indefinite"/>' : ''}
        ${[0, 90, 180, 270].map((w) => `<g transform="rotate(${w} 0 -140)"><path class="fl-holzhell" d="M-3,-140 L3,-140 L4,-194 L-4,-194 Z"/><path class="fl-segel" d="M4,-190 L20,-190 L19,-150 L4,-150 Z"/><path d="M4,-178 L20,-178 M4,-166 L19,-166" stroke="var(--holz)" stroke-width="1.2" opacity=".5"/></g>`).join('')}
        <circle class="fl-holz" cx="0" cy="-140" r="8"/>
      </g></g>`,
  },
  stall: {
    hoehe: 140,
    beet: { x: 104, y: -38, b: 104, h: 38 },
    zeichne: () => `
      ${schatten(100, 13, 4)}
      <path class="fl-holz" d="M-88,0 L88,0 L88,-82 L-88,-82 Z"/>
      ${[-60, -40, -20].map((y) => `<path d="M-88,${y} L88,${y}" stroke="#2a1a08" stroke-opacity=".14" stroke-width="2"/>`).join('')}
      ${dunkel('M40,0 L88,0 L88,-82 L40,-82 Z', 0.14)}
      <path class="fl-dach" d="M-100,-78 L0,-140 L100,-78 L90,-72 L0,-126 L-90,-72 Z"/>
      ${dunkel('M0,-140 L100,-78 L90,-72 L0,-126 Z', 0.2)}
      <path class="fl-wand" d="M-30,0 L-30,-60 L30,-60 L30,0 Z"/>
      <path d="M-30,-60 L30,0 M30,-60 L-30,0 M0,-60 L0,0" stroke="var(--holz)" stroke-width="4"/>
      <path class="fl-acker" d="M-15,-106 L15,-106 L15,-86 L-15,-86 Z"/>${hell('M-15,-106 L15,-106 L15,-100 L-15,-100 Z', .35)}`,
  },
  scheune: {
    hoehe: 156,
    beet: { x: -226, y: -38, b: 104, h: 38 },
    zeichne: () => `
      ${schatten(116, 14, 4)}
      <path class="fl-dach" d="M-102,0 L102,0 L102,-102 L-102,-102 Z"/>
      ${dunkel('M50,0 L102,0 L102,-102 L50,-102 Z', 0.14)}
      <path class="fl-dach2" d="M-114,-98 L-72,-154 L72,-154 L114,-98 L102,-98 L68,-144 L-68,-144 L-102,-98 Z"/>
      <path class="fl-dach" d="M-102,-98 L-68,-144 L68,-144 L102,-98 Z"/>
      ${dunkel('M30,-144 L68,-144 L102,-98 L50,-98 Z', 0.15)}
      <path d="M-102,-98 L-68,-144 L68,-144 L102,-98 M-102,-102 L102,-102" stroke="#fff6e6" stroke-width="3" fill="none" opacity=".85"/>
      <path class="fl-wand" d="M-42,0 L-42,-72 L42,-72 L42,0 Z"/>
      <path d="M-42,-72 L0,-36 L42,-72 M-42,0 L0,-36 L42,0 M0,-72 L0,0" stroke="var(--dach-2)" stroke-width="4"/>
      ${fenster(-16, -132, 32, 22)}
      <path class="fl-acker" d="M62,0 L96,0 L96,-20 Q79,-32 62,-20 Z"/>`,
  },
  werkstatt: {
    hoehe: 146,
    beet: { x: 96, y: -38, b: 104, h: 38 },
    zeichne: (aktiv) => `
      ${schatten(92, 12, 4)}
      <path class="fl-wand" d="M-80,0 L80,0 L80,-88 L-80,-88 Z"/>
      ${dunkel('M36,0 L80,0 L80,-88 L36,-88 Z', 0.15)}
      <path class="fl-stein" d="M44,-102 L62,-102 L62,-142 L44,-142 Z"/>
      ${aktiv ? '<circle class="rauch fl-rauch" cx="53" cy="-150" r="7"/><circle class="rauch fl-rauch" style="animation-delay:2s" cx="57" cy="-158" r="5"/>' : ''}
      <path class="fl-holz" d="M-92,-82 L92,-110 L92,-98 L-92,-70 Z"/>${dunkel('M-92,-74 L92,-102 L92,-98 L-92,-70 Z', .25)}
      <path class="fl-holz" d="M-62,0 L-62,-60 L-14,-60 L-14,0 Z"/><path d="M-38,-60 L-38,0" stroke="#2a1a08" stroke-opacity=".2" stroke-width="2"/>
      ${fenster(10, -62, 48, 30)}
      <circle class="fl-holzhell" cx="-38" cy="-76" r="10"/><path d="M-45,-76 L-31,-76 M-38,-83 L-38,-69" stroke="var(--tinte-2)" stroke-width="2"/>`,
  },
  imkerei: {
    hoehe: 92,
    beet: { x: -206, y: -38, b: 104, h: 38 },
    zeichne: () => `
      ${schatten(110, 12, 4)}
      ${[-64, 0, 64].map((x, i) => `<g transform="translate(${x},0)">
        <path class="fl-holz" d="M-22,0 L-22,-12 L22,-12 L22,0 Z"/>
        <path class="fl-acker" d="M-25,-12 L25,-12 L25,-40 L-25,-40 Z"/>
        <path class="fl-acker2" d="M-25,-40 L25,-40 L25,-${62 + i * 4} L-25,-${62 + i * 4} Z"/>
        ${dunkel(`M8,-12 L25,-12 L25,-${62 + i * 4} L8,-${62 + i * 4} Z`, 0.15)}
        <path class="fl-dach" d="M-31,-${60 + i * 4} L31,-${60 + i * 4} L25,-${74 + i * 4} L-25,-${74 + i * 4} Z"/>
        <path class="fl-holz" d="M-8,-14 L8,-14 L8,-19 L-8,-19 Z"/></g>`).join('')}
      ${[[-100, -10, 'var(--gold)'], [-92, -24, 'var(--dach)'], [96, -8, 'var(--gold)'], [104, -22, 'var(--bluete)']].map(([x, y, f]) => `<path d="M${x},${y + 6} L${x},4" stroke="var(--wiese-3)" stroke-width="2"/><circle cx="${x}" cy="${y}" r="6" fill="${f}"/>`).join('')}`,
  },
  baeckerei: {
    hoehe: 156,
    beet: { x: 98, y: -38, b: 104, h: 38 },
    zeichne: (aktiv) => `
      ${schatten(96, 13, 4)}
      <path class="fl-wand" d="M-84,0 L84,0 L84,-92 L-84,-92 Z"/>
      ${dunkel('M40,0 L84,0 L84,-92 L40,-92 Z', 0.15)}
      <path class="fl-stein" d="M40,-112 L60,-112 L60,-152 L40,-152 Z"/>
      ${aktiv ? '<circle class="rauch fl-rauch" cx="50" cy="-162" r="9"/><circle class="rauch fl-rauch" style="animation-delay:1.4s" cx="56" cy="-172" r="7"/><circle class="rauch fl-rauch" style="animation-delay:2.7s" cx="47" cy="-168" r="6"/>' : ''}
      <path class="fl-dach" d="M-98,-88 L0,-150 L98,-88 L88,-82 L0,-136 L-88,-82 Z"/>${dunkel('M0,-150 L98,-88 L88,-82 L0,-136 Z', 0.2)}
      <path class="fl-holz" d="M-22,0 L-22,-48 Q0,-68 22,-48 L22,0 Z"/>
      ${fenster(-68, -64, 30, 28)}${fenster(40, -64, 30, 28)}
      <circle class="fl-holzhell" cx="0" cy="-108" r="14"/>
      <path d="M-7,-106 Q0,-120 7,-106 Q0,-98 -7,-106 Z" stroke="var(--holz)" stroke-width="3" fill="none"/>`,
  },
};

/* ================= Kornbeet mit Pflanzen ================= */

/** Eine Pflanze in Stufe 1–4 (lokal: Fuß bei 0,0). */
export function pflanzeSvg(stufe) {
  if (stufe <= 0) return '';
  if (stufe === 1) return `<ellipse cx="0" cy="-1" rx="7" ry="3.5" fill="#4a2f17" opacity=".55"/><circle cx="-2" cy="-3" r="1.6" fill="#e9d29a"/><circle cx="2.5" cy="-2.5" r="1.4" fill="#e9d29a"/>`;
  if (stufe === 2) return `<ellipse cx="0" cy="-1" rx="6" ry="3" fill="#4a2f17" opacity=".45"/>
    <path d="M0,-1 Q0,-7 0,-12" stroke="var(--spross)" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M0,-9 Q-7,-13 -9,-8 Q-4,-6 0,-9 Z M0,-11 Q6,-17 9,-12 Q4,-9 0,-11 Z" fill="var(--spross)"/>`;
  if (stufe === 3) return `<g class="halm">${[-4, 0, 4].map((x, i) => `<path d="M${x},0 Q${x + (i - 1) * 2},-14 ${x + (i - 1) * 4},-26" stroke="var(--halm)" stroke-width="2.2" fill="none" stroke-linecap="round"/>`).join('')}
    <path d="M0,-12 Q-9,-17 -11,-11 Q-5,-9 0,-12 Z M1,-16 Q10,-22 12,-15 Q6,-13 1,-16 Z" fill="var(--halm)"/></g>`;
  return `<g class="halm reif-halm">${[-5, 0, 5].map((x, i) => {
    const tx = x + (i - 1) * 5, ty = -30 + Math.abs(i - 1) * 2;
    return `<path d="M${x},0 Q${x + (i - 1) * 2},-16 ${tx},${ty}" stroke="var(--korn-2)" stroke-width="2" fill="none" stroke-linecap="round"/>
      <g transform="translate(${tx},${ty}) rotate(${(i - 1) * 14})">${[0, 1, 2, 3].map((k) => `<ellipse cx="${k % 2 ? 2 : -2}" cy="${-k * 4}" rx="2.6" ry="3.6" fill="var(--korn)"/>`).join('')}<path d="M0,-14 L0,-22" stroke="var(--korn-2)" stroke-width="1"/></g>`;
  }).join('')}</g>`;
}

/** Lage der 6 Pflanzen in einem Beet (2 Reihen à 3). */
function pflanzOrte(beet) {
  const orte = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    orte.push([beet.x + beet.b * ((c + 0.5) / 3) + (r ? 6 : -6), beet.y + beet.h * (r ? 0.86 : 0.46)]);
  }
  // hintere Reihe zuerst zeichnen, damit vordere Pflanzen davor stehen
  return orte;
}

/** Das Beet eines Gebäudes inkl. Pflanzen, Leuchten (fällig) und Erntehinweis. */
function beetSvg(typ, feld, info, skala) {
  const g = GEBAEUDE[typ];
  const b = g.beet;
  const pflanzen = feld ? feld.pflanzen : [0, 0, 0, 0, 0, 0];
  const reif = pflanzen.filter((s) => s === REIF).length;
  const orte = pflanzOrte(b);
  const pg = typ === 'kornfeld' ? 1.5 : 1.15; // Pflanzengröße
  const boden = b.eigen ? '' : `
    <rect x="${b.x - 4}" y="${b.y - 2}" width="${b.b + 8}" height="${b.h + 6}" rx="10" class="fl-holzhell"/>
    <rect x="${b.x}" y="${b.y}" width="${b.b}" height="${b.h}" rx="8" class="fl-erde"/>
    <path d="M${b.x + 8},${b.y + b.h * 0.46} L${b.x + b.b - 8},${b.y + b.h * 0.46} M${b.x + 8},${b.y + b.h * 0.86} L${b.x + b.b - 8},${b.y + b.h * 0.86}" stroke="#3b2612" stroke-opacity=".25" stroke-width="4" stroke-linecap="round"/>`;
  const leuchten = info.faellig > 0 && info.status === 'produziert'
    ? `<ellipse class="beet-leuchten" cx="${b.x + b.b / 2}" cy="${b.y + b.h / 2}" rx="${b.b / 2 + 16}" ry="${b.h / 2 + 14}"/>
       ${[0, 1, 2].map((k) => `<path class="funkeln" style="animation-delay:${k * 0.6}s" transform="translate(${b.x + b.b * (0.2 + k * 0.3)},${b.y - 8})" d="M0,-6 L1.5,-1.5 L6,0 L1.5,1.5 L0,6 L-1.5,1.5 L-6,0 L-1.5,-1.5 Z"/>`).join('')}` : '';
  const hinweis = reif > 0
    ? `<g class="ernte-hinweis" transform="translate(${b.x + b.b / 2},${b.y - (typ === 'kornfeld' ? 50 : 40)}) scale(${1 / skala})">
        <rect x="-38" y="-17" width="76" height="30" rx="15"/><text x="0" y="4" text-anchor="middle">🌾 ${reif}</text></g>` : '';
  return `<g class="beet${reif ? ' hat-reif' : ''}" data-feld="${info.block.id}" ${reif ? `role="button" tabindex="0" aria-label="${reif} reifes Korn ernten"` : ''}>
    ${leuchten}${boden}
    ${pflanzen.map((s, i) => `<g class="pflanze stufe-${s}" data-platz="${i}" transform="translate(${orte[i][0].toFixed(1)},${orte[i][1].toFixed(1)}) scale(${pg})" style="--v:${(i * 0.37) % 1}">${pflanzeSvg(s)}</g>`).join('')}
    <rect x="${b.x - 10}" y="${b.y - 34}" width="${b.b + 20}" height="${b.h + 40}" fill="transparent"/>
    ${hinweis}
  </g>`;
}

/* ================= Deko (Markt) ================= */

const DEKO = {
  zaun: () => Array.from({ length: 60 }, (_, i) => `<rect x="${i * 50}" y="-38" width="8" height="38" rx="2" class="fl-holzhell"/>`).join('') +
    '<rect x="0" y="-27" width="3000" height="6" rx="3" class="fl-holzhell"/><rect x="0" y="-12" width="3000" height="6" rx="3" class="fl-holzhell"/>',
  blumen: () => `${schatten(58, 10, 2)}<ellipse class="fl-erde" cx="0" cy="0" rx="56" ry="14"/>` + [[-40, -10, 'var(--dach)'], [-22, -16, 'var(--gold)'], [-4, -12, 'var(--bluete)'], [14, -18, 'var(--dach)'], [32, -10, 'var(--bluete)'], [46, -14, 'var(--gold)']].map(([x, y, f]) => `<path d="M${x},0 L${x},${y}" stroke="var(--wiese-3)" stroke-width="2"/><circle cx="${x}" cy="${y}" r="7" fill="${f}"/><circle cx="${x}" cy="${y}" r="2.5" fill="#fff6d8"/>`).join(''),
  apfelbaum: () => `${schatten(52, 12, 2)}<path class="fl-holz" d="M-8,0 L8,0 L6,-70 L-6,-70 Z"/><circle class="fl-baum-3" cx="0" cy="-100" r="50"/><circle class="fl-baum-2" cx="-20" cy="-110" r="32"/><circle class="fl-baum-1" cx="-26" cy="-118" r="16" opacity=".7"/>` + [[-18, -96], [16, -86], [4, -128], [-34, -114], [30, -108]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="var(--dach)"/><circle cx="${x - 2}" cy="${y - 2}" r="2" fill="#fff" opacity=".5"/>`).join(''),
  bank: () => `${schatten(48, 8, 2)}<path class="fl-holz" d="M-40,0 L-36,0 L-36,-18 L-40,-18 Z M36,0 L40,0 L40,-18 L36,-18 Z"/><path class="fl-holzhell" d="M-46,-18 L46,-18 L46,-24 L-46,-24 Z M-46,-32 L46,-32 L46,-46 L-46,-46 Z"/>`,
  teich: () => `<ellipse cx="0" cy="2" rx="96" ry="30" class="fl-stein" opacity=".7"/><ellipse class="fl-wasser" cx="0" cy="0" rx="90" ry="26"/><ellipse class="wasser-glanz" cx="-24" cy="-5" rx="30" ry="5"/><path d="M70,-6 L74,-40 M80,-4 L86,-34 M-80,-4 L-84,-32" stroke="var(--wiese-3)" stroke-width="3" stroke-linecap="round"/><ellipse cx="30" cy="6" rx="12" ry="4" fill="var(--wiese-2)"/>`,
  vogelhaus: () => `<path class="fl-holz" d="M-3,0 L3,0 L3,-70 L-3,-70 Z"/><path class="fl-holzhell" d="M-18,-70 L18,-70 L18,-96 L-18,-96 Z"/><path class="fl-dach" d="M-24,-94 L0,-112 L24,-94 Z"/><circle cx="0" cy="-84" r="5" fill="var(--tinte-2)"/>`,
  laternen: () => [0, 1].map((i) => `<g transform="translate(${i * 70},0)"><circle class="laternen-licht" cx="0" cy="-90" r="40" fill="url(#g-laterne)"/><path class="fl-holz" d="M-3,0 L3,0 L3,-80 L-3,-80 Z"/><path class="fl-gold laterne" d="M-10,-80 L10,-80 L8,-100 L-8,-100 Z"/><path class="fl-dach" d="M-12,-100 L12,-100 L0,-110 Z"/></g>`).join(''),
  windrad: () => `<path class="fl-holz" d="M-3,0 L3,0 L2,-90 L-2,-90 Z"/><g><g><animateTransform attributeName="transform" type="rotate" from="0 0 -90" to="360 0 -90" dur="6s" repeatCount="indefinite"/>${[0, 72, 144, 216, 288].map((w) => `<path transform="rotate(${w} 0 -90)" d="M0,-90 L7,-122 L0,-124 Z" fill="${w % 144 ? 'var(--dach)' : 'var(--gold)'}"/>`).join('')}</g></g>`,
};

/* ================= Hühnerhaus, Weide, Bäume, Gras ================= */

const HUEHNERHAUS = `${schatten(40, 8, 2)}
  <path class="fl-holzhell" d="M-30,0 L-30,-34 L30,-34 L30,0 Z"/>${dunkel('M10,0 L30,0 L30,-34 L10,-34 Z', .15)}
  <path class="fl-dach" d="M-38,-32 L0,-56 L38,-32 Z"/><path d="M-8,0 L-8,-18 Q0,-26 8,-18 L8,0 Z" fill="#3b2612" opacity=".6"/>
  <path d="M8,-6 L26,4" stroke="var(--holz)" stroke-width="3"/>`;

function baum(x, y, s, art = 0) {
  return `<g transform="translate(${x},${y}) scale(${s})">${schatten(34, 9, 2)}<path class="fl-holz" d="M-6,0 L6,0 L5,-48 L-5,-48 Z"/>
    ${art ? '<path class="fl-baum-3" d="M0,-140 L34,-50 L-34,-50 Z"/><path class="fl-baum-2" d="M0,-140 L-34,-50 L-4,-50 Z" opacity=".6"/>'
    : '<circle class="fl-baum-3" cx="0" cy="-82" r="40"/><circle class="fl-baum-2" cx="-14" cy="-92" r="26"/><circle class="fl-baum-1" cx="-18" cy="-100" r="12" opacity=".6"/>'}</g>`;
}
function wolke(x, y, s, dauer) {
  return `<g class="wolke-zug" style="animation-duration:${dauer}s;animation-delay:-${(x / 1200) * dauer}s"><g transform="translate(${x},${y}) scale(${s})"><ellipse class="wolke" cx="0" cy="0" rx="72" ry="18"/><ellipse class="wolke" cx="-20" cy="-13" rx="36" ry="21"/><ellipse class="wolke" cx="24" cy="-10" rx="28" ry="17"/></g></g>`;
}
function grasbuesche(punkte) {
  return punkte.map(([x, y, s], i) => `<g transform="translate(${x},${y}) scale(${s || 1})"><g class="gras" style="animation-delay:-${(i * 0.73) % 4}s">
    <path d="M-6,0 Q-8,-10 -12,-16 M-2,0 Q-2,-12 -3,-20 M2,0 Q4,-10 8,-17 M6,0 Q9,-8 13,-12" stroke="var(--wiese-3)" stroke-width="2.2" fill="none" stroke-linecap="round"/></g></g>`).join('');
}
function weide(w) {
  const pf = [];
  for (let x = w.x1; x <= w.x2; x += 36) pf.push(x);
  return `<rect x="${w.x1}" y="${w.y1}" width="${w.x2 - w.x1}" height="${w.y2 - w.y1}" rx="24" class="fl-weide"/>
    <g class="zaun-holz">
      ${pf.map((x) => `<rect x="${x - 2.5}" y="${w.y1 - 16}" width="5" height="18" rx="2"/>`).join('')}
      <rect x="${w.x1}" y="${w.y1 - 12}" width="${w.x2 - w.x1}" height="3.5" rx="2"/>
      ${pf.filter((x) => Math.abs(x - w.tor) > 30).map((x) => `<rect x="${x - 2.5}" y="${w.y2 - 14}" width="5" height="18" rx="2"/>`).join('')}
      <rect x="${w.x1}" y="${w.y2 - 9}" width="${w.tor - 34 - w.x1}" height="3.5" rx="2"/>
      <rect x="${w.tor + 34}" y="${w.y2 - 9}" width="${w.x2 - w.tor - 34}" height="3.5" rx="2"/>
    </g>
    <g transform="translate(${w.x2 - 60},${w.y1 + 26})"><rect x="-26" y="-8" width="52" height="12" rx="4" class="fl-holz"/><rect x="-22" y="-7" width="44" height="5" rx="2" class="fl-wasser"/></g>`;
}

/* ================= Anordnung (Quer- und Hochformat) ================= */

export const ANORDNUNG = {
  quer: {
    viewBox: '0 0 1200 820', breite: 1200, hoehe: 820,
    horizont: 300,
    huegel: [
      { cls: 'fl-huegel-fern', d: 'M-700,250 C-300,200 -100,260 0,236 C220,180 420,240 640,196 C840,160 1000,214 1200,182 C1500,150 1700,210 1900,190 L1900,1700 L-700,1700 Z' },
      { cls: 'fl-wiese3', d: 'M-700,300 C-300,270 -100,330 0,304 C200,250 400,296 600,262 C800,230 1000,282 1200,250 C1500,214 1700,270 1900,250 L1900,1700 L-700,1700 Z' },
      { cls: 'fl-wiese2', d: 'M-700,420 C-300,390 -100,440 0,410 C250,368 520,430 780,388 C960,360 1100,398 1200,380 C1500,346 1700,400 1900,380 L1900,1700 L-700,1700 Z' },
      { cls: 'fl-wiese', d: 'M-700,560 C-300,530 -100,590 0,562 C300,524 620,586 900,546 C1050,522 1150,544 1200,532 C1500,504 1700,560 1900,540 L1900,1700 L-700,1700 Z' },
    ],
    weg: 'M560,840 C552,760 548,700 556,620 C562,560 548,500 560,450 C574,400 610,360 650,330 C680,308 700,296 706,288',
    wegNeben: ['M556,620 C500,600 380,570 300,520', 'M560,452 C640,440 760,430 850,420'],
    orte: {
      kornfeld: [170, 650, 0.9], brunnen: [462, 655, 0.9], muehle: [672, 645, 0.9], stall: [935, 650, 0.9],
      werkstatt: [190, 445, 0.78], scheune: [940, 445, 0.8], baeckerei: [250, 276, 0.7], imkerei: [565, 266, 0.7],
    },
    weide: { x1: 712, y1: 192, x2: 1080, y2: 290, tor: 780 },
    huehner: { cx: 525, cy: 452, rx: 78, ry: 30 },
    huehnerhaus: [418, 428, 0.62],
    pferdeweg: [[780, 300], [730, 312], [680, 326], [640, 350], [606, 384]],
    falter: [[300, 330, 440, 400], [760, 330, 880, 400], [40, 520, 120, 600], [980, 560, 1080, 610]],
    gras: [[320, 410, 0.9], [360, 545, 0.8], [600, 520, 0.9], [790, 560, 1], [1060, 470, 0.9], [60, 380, 0.8], [700, 420, 0.8], [1000, 740, 1.1], [300, 750, 1.1], [760, 760, 1], [120, 760, 1.1], [860, 330, 0.7]],
    deko: { zaun: [-700, 812, 1], blumen: [76, 740, 1], apfelbaum: [70, 440, 0.8], bank: [780, 522, 0.78], teich: [330, 382, 0.6], vogelhaus: [1150, 560, 0.7], laternen: [516, 600, 0.72], windrad: [130, 252, 0.8] },
    wolken: [[150, 96, 1, 160], [560, 70, 0.8, 200], [920, 120, 1.1, 180]],
    baeume: [[40, 312, 0.62, 1], [1150, 250, 0.55, 0], [400, 238, 0.45, 1], [820, 228, 0.5, 0], [1110, 420, 0.7, 0], [370, 300, 0.5, 0]],
  },
  hoch: {
    viewBox: '0 0 800 1150', breite: 800, hoehe: 1150,
    horizont: 260,
    huegel: [
      { cls: 'fl-huegel-fern', d: 'M-700,210 C-300,170 -100,230 0,200 C200,150 420,210 800,170 C1100,140 1300,200 1500,180 L1500,1900 L-700,1900 Z' },
      { cls: 'fl-wiese3', d: 'M-700,270 C-300,240 -100,290 0,262 C200,222 420,266 800,228 C1100,200 1300,250 1500,230 L1500,1900 L-700,1900 Z' },
      { cls: 'fl-wiese2', d: 'M-700,480 C-300,450 -100,500 0,470 C250,430 520,490 800,446 C1100,410 1300,470 1500,450 L1500,1900 L-700,1900 Z' },
      { cls: 'fl-wiese', d: 'M-700,720 C-300,690 -100,740 0,710 C260,670 560,730 800,690 C1100,650 1300,710 1500,690 L1500,1900 L-700,1900 Z' },
    ],
    weg: 'M400,1170 C392,1080 410,1000 398,920 C388,840 412,760 400,680 C390,600 410,520 400,440 C392,360 402,280 400,206',
    wegNeben: [],
    orte: {
      kornfeld: [180, 955, 0.86], brunnen: [600, 960, 0.86], muehle: [180, 735, 0.82], stall: [560, 740, 0.82],
      werkstatt: [178, 515, 0.76], scheune: [610, 520, 0.76], baeckerei: [180, 312, 0.7], imkerei: [610, 300, 0.68],
    },
    weide: { x1: 60, y1: 120, x2: 740, y2: 200, tor: 400 },
    huehner: { cx: 402, cy: 640, rx: 42, ry: 58 },
    huehnerhaus: [330, 610, 0.55],
    pferdeweg: [[400, 206], [402, 260], [398, 330], [402, 400], [400, 450]],
    falter: [[40, 380, 140, 460], [660, 640, 780, 700], [280, 860, 360, 920], [40, 1020, 120, 1060]],
    gras: [[60, 420, 0.8], [740, 420, 0.8], [330, 460, 0.8], [470, 610, 0.8], [60, 660, 0.9], [740, 880, 0.9], [330, 1020, 1], [470, 840, 0.9], [60, 860, 0.9], [740, 1040, 1]],
    deko: { zaun: [-700, 1142, 1], blumen: [80, 1048, 1], apfelbaum: [742, 540, 0.75], bank: [480, 452, 0.72], teich: [705, 300, 0.55], vogelhaus: [60, 560, 0.8], laternen: [330, 880, 0.72], windrad: [742, 860, 0.8] },
    wolken: [[150, 80, 1, 150], [560, 62, 0.9, 190]],
    baeume: [[40, 262, 0.55, 1], [760, 250, 0.5, 0], [60, 700, 0.6, 0], [760, 700, 0.55, 1]],
  },
};

/* ================= Szene ================= */

function sterneHtml(stufe) {
  return Array.from({ length: 5 }, (_, i) => `<circle class="stern${i < stufe ? ' an' : ''}" cx="${-36 + i * 18}" cy="64" r="6"/>`).join('');
}

/** Ein Gebäude samt Beet, Schild und Badges. */
function gebaeudeGruppe(info, feld, [x, y, s]) {
  const typ = info.block.gebaeude.typ;
  const g = GEBAEUDE[typ];
  const aktiv = info.status === 'produziert';
  const gebaut = info.status === 'produziert' || info.status === 'ruht';
  let unter = '';
  if (info.status === 'gesperrt') unter = `🔒 ab Level ${info.levelNoetig}`;
  else if (info.status === 'kaufbar') unter = `🔨 Bauen: ${info.block.preis} Münzen`;
  else if (info.status === 'ruht') unter = '🌱 ruht – Vorstufe fehlt';
  const badge = aktiv && info.faellig > 0
    ? `<g class="reif-badge" transform="translate(${typ === 'kornfeld' ? 104 : 74},${-g.hoehe + 4})"><circle r="19"/><text y="6" text-anchor="middle">${info.faellig}</text></g>`
    : aktiv && info.neu > 0 ? `<g class="neu-badge" transform="translate(${typ === 'kornfeld' ? 104 : 74},${-g.hoehe + 4})"><circle r="18"/><text y="5" text-anchor="middle">neu</text></g>` : '';
  const label = `${info.block.gebaeude.name}${gebaut ? `, Beherrschung ${info.stufe} von 5` : ''}${info.faellig && aktiv ? `, ${info.faellig} Wiederholungen fällig` : ''}${unter ? ', ' + unter.replace(/^\S+ /, '') : ''}`;
  const k = Math.max(1, 0.86 / s).toFixed(3); // Beschriftung nie kleiner als in der vorderen Reihe
  return `<g class="geb-ort" transform="translate(${x},${y}) scale(${s})">
    <g class="geb ${info.status}" data-block="${info.block.id}" role="button" tabindex="0" aria-label="${esc(label)}">
      <rect x="-118" y="${-g.hoehe - 24}" width="236" height="${g.hoehe + 104}" fill="transparent"/>
      <g class="geb-bild">${g.zeichne(aktiv)}</g>
      ${info.status === 'kaufbar' ? `<g class="bauen-funkeln" transform="translate(0,${-g.hoehe / 2})"><circle r="30"/><text y="9" text-anchor="middle">🔨</text></g>` : ''}
      <g transform="scale(${k})"><g class="geb-schild"><rect x="-78" y="12" width="156" height="36" rx="10"/><text x="0" y="37" text-anchor="middle">${esc(info.block.gebaeude.name)}</text></g>
      ${gebaut ? sterneHtml(info.stufe) : ''}
      ${unter ? `<text class="geb-unter" x="0" y="${gebaut ? 92 : 70}" text-anchor="middle">${esc(unter)}</text>` : ''}</g>
      ${badge}
    </g>
    ${gebaut ? beetSvg(typ, feld, info, s) : ''}
  </g>`;
}

/**
 * Baut die komplette Hof-Szene.
 * @param {object[]} infos   je Gebäude { block, status, stufe, faellig, neu, levelNoetig }
 * @param {object} felder    Block-ID → Feld
 * @param {object} deko      Deko-ID → true (aufgestellt) | 'lager' (gekauft, eingelagert)
 * @param {'quer'|'hoch'} format
 */
export function hofSvg(infos, felder, deko, format) {
  const a = ANORDNUNG[format];
  // Gebäude von hinten nach vorn zeichnen (kleineres y zuerst)
  const sortiert = infos.slice().sort((p, q) => a.orte[p.block.gebaeude.typ][1] - a.orte[q.block.gebaeude.typ][1]);
  const gebaeude = sortiert.map((info) => gebaeudeGruppe(info, felder[info.block.id], a.orte[info.block.gebaeude.typ])).join('');
  const dekoSvg = Object.entries(a.deko).filter(([id]) => deko[id] === true && id !== 'zaun').map(([id, [x, y, s]]) => `<g class="deko" transform="translate(${x},${y}) scale(${s})">${DEKO[id]()}</g>`).join('');
  const zaun = deko.zaun === true ? `<g class="deko" transform="translate(${a.deko.zaun[0]},${a.deko.zaun[1]})">${DEKO.zaun()}</g>` : '';
  const [hx, hy, hs] = a.huehnerhaus;
  const h = a.huehner;
  return `<svg class="hof-svg" viewBox="${a.viewBox}" preserveAspectRatio="${format === 'quer' ? 'xMidYMax' : 'xMidYMid'} meet" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Dein Hof">
    <defs>
      <radialGradient id="g-schatten"><stop offset="0" stop-color="#1e1406" stop-opacity=".32"/><stop offset="1" stop-color="#1e1406" stop-opacity="0"/></radialGradient>
      <radialGradient id="g-sonne"><stop offset="0" style="stop-color:var(--sonne)" stop-opacity=".95"/><stop offset=".35" style="stop-color:var(--sonne)" stop-opacity=".35"/><stop offset="1" style="stop-color:var(--sonne)" stop-opacity="0"/></radialGradient>
      <radialGradient id="g-laterne"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".9"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient>
      <linearGradient id="g-himmel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--himmel-1)"/><stop offset="1" style="stop-color:var(--himmel-2)"/></linearGradient>
      <linearGradient id="g-dunst" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--himmel-2)" stop-opacity="0"/><stop offset="1" style="stop-color:var(--himmel-2)" stop-opacity=".55"/></linearGradient>
    </defs>
    <rect x="-800" y="-400" width="3000" height="${a.horizont + 700}" fill="url(#g-himmel)"/>
    <g class="sterne-nacht">${Array.from({ length: 28 }, (_, i) => `<circle cx="${(i * 373 + 91) % a.breite}" cy="${20 + ((i * i * 53 + i * 17) % (a.horizont - 90))}" r="${i % 3 ? 1.2 : 1.8}" style="animation-delay:-${(i * 0.7) % 3}s"/>`).join('')}</g>
    <g class="sonne"><circle cx="${a.breite * 0.78}" cy="${a.horizont * 0.36}" r="120" fill="url(#g-sonne)"/><circle class="sonne-kern" cx="${a.breite * 0.78}" cy="${a.horizont * 0.36}" r="26"/></g>
    ${a.wolken.map(([x, y, s, d]) => wolke(x, y, s, d)).join('')}
    <path class="${a.huegel[0].cls}" d="${a.huegel[0].d}"/>
    <rect x="-800" y="${a.horizont - 160}" width="3000" height="140" fill="url(#g-dunst)"/>
    ${a.huegel.slice(1).map((hg) => `<path class="${hg.cls}" d="${hg.d}"/>`).join('')}
    ${a.baeume.map(([x, y, s, art]) => baum(x, y, s, art)).join('')}
    ${weide(a.weide)}
    <path class="fl-weg-rand" d="${a.weg}"/><path class="fl-weg" d="${a.weg}"/>
    ${a.wegNeben.map((d) => `<path class="fl-weg-rand schmal" d="${d}"/><path class="fl-weg schmal" d="${d}"/>`).join('')}
    <ellipse class="fl-sand" cx="${h.cx}" cy="${h.cy}" rx="${h.rx + 18}" ry="${h.ry + 14}"/>
    <g transform="translate(${hx},${hy}) scale(${hs})">${HUEHNERHAUS}</g>
    <g class="gras-ebene">${grasbuesche(a.gras)}</g>
    ${dekoSvg}
    ${gebaeude}
    ${zaun}
    <g class="tier-ebene"></g>
    <rect class="tageslicht" x="-800" y="-400" width="3000" height="3000"/>
  </svg>`;
}

/** Kleines Einzelbild eines Gebäudes (für Dialoge, Aufträge). */
export function gebaeudeMini(typ, aktiv = true) {
  const g = GEBAEUDE[typ] || GEBAEUDE.stall;
  return `<svg class="geb-mini" viewBox="-130 ${-g.hoehe - 30} 260 ${g.hoehe + 46}" aria-hidden="true"><defs><radialGradient id="g-schatten"><stop offset="0" stop-color="#1e1406" stop-opacity=".3"/><stop offset="1" stop-color="#1e1406" stop-opacity="0"/></radialGradient></defs>${g.zeichne(aktiv)}</svg>`;
}

/** Kleines Deko-Bild für den Markt. */
export function dekoMini(id) {
  if (id === 'zaun') return `<svg viewBox="0 -50 260 60" aria-hidden="true">${DEKO.zaun()}</svg>`;
  return `<svg viewBox="-110 -140 220 170" aria-hidden="true"><defs><radialGradient id="g-schatten"><stop offset="0" stop-color="#1e1406" stop-opacity=".3"/><stop offset="1" stop-color="#1e1406" stop-opacity="0"/></radialGradient></defs>${DEKO[id]()}</svg>`;
}

/** Mini-Beet (6 Pflanzen in einer Reihe) für die Kopfzeile der Lernrunde. */
export function beetMini(feld, hervorheben = []) {
  const p = feld ? feld.pflanzen : [0, 0, 0, 0, 0, 0];
  return `<svg class="beet-mini" viewBox="0 -46 216 54" aria-hidden="true">
    <rect x="2" y="-12" width="212" height="18" rx="9" class="fl-erde"/>
    ${p.map((s, i) => `<g class="pflanze stufe-${s}${hervorheben.includes(i) ? ' waechst' : ''}" transform="translate(${20 + i * 35},0) scale(1.25)" style="--v:${(i * 0.37) % 1}">${s ? pflanzeSvg(s) : '<circle cx="0" cy="-2" r="2" fill="#3b2612" opacity=".35"/>'}</g>`).join('')}
  </svg>`;
}
