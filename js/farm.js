// farm.js – zeichnet den Hof als SVG: Landschaft, Gebäude, Deko.
// Gebäude werden in lokalen Koordinaten gezeichnet: (0,0) = Mitte unten, ca. 200 breit, 160 hoch.

import { esc } from './formel.js';

/* ---------------- Gebäude-Zeichnungen ---------------- */

const GEBAEUDE = {
  kornfeld: (aktiv) => `
    <path class="fl-erde" d="M-112,0 L112,0 L92,-74 L-92,-74 Z"/>
    ${[0, 1, 2, 3, 4].map((r) => {
      const y = -10 - r * 14, b = 104 - r * 4;
      return `<path class="fl-acker2" d="M${-b},${y + 4} L${b},${y + 4} L${b - 2},${y} L${-b + 2},${y} Z"/>` +
        Array.from({ length: 13 }, (_, i) => {
          const x = -b + 10 + i * ((2 * b - 20) / 12);
          return `<path class="st-linie" style="stroke:var(--acker-2);stroke-width:2" d="M${x},${y + 2} L${x + 1},${y - 12}"/>` +
            (aktiv ? `<ellipse class="fl-acker" cx="${x + 1}" cy="${y - 15}" rx="3.2" ry="6"/>` : '');
        }).join('');
    }).join('')}
    <path class="fl-holz" d="M-120,2 L-120,-32 M-120,-20 L-96,-20" stroke="var(--holz)" stroke-width="5" stroke-linecap="round"/>
    <path class="st-linie" d="M-104,-46 L-90,-28 M-110,-40 L-100,-56" style="stroke:var(--holz);stroke-width:3"/>
    <circle class="fl-wand" cx="-104" cy="-60" r="7"/>
    <path class="fl-dach" d="M-114,-62 L-94,-62 L-104,-74 Z"/>`,

  brunnen: () => `
    <ellipse class="fl-stein" cx="0" cy="0" rx="46" ry="12"/>
    <path class="fl-stein" d="M-46,0 L-46,-44 L46,-44 L46,0 Z"/>
    <path class="st-linie" style="stroke:var(--tinte-3);stroke-width:1.5" d="M-46,-15 L46,-15 M-46,-30 L46,-30 M-20,0 L-20,-15 M14,-15 L14,-30 M-30,-30 L-30,-44 M28,0 L28,-15"/>
    <ellipse class="fl-wasser" cx="0" cy="-44" rx="46" ry="12"/>
    <ellipse class="fl-stein" cx="0" cy="-44" rx="46" ry="12" fill-opacity="0" stroke="var(--tinte-3)" stroke-width="2"/>
    <path d="M-38,-44 L-38,-118 M38,-44 L38,-118" stroke="var(--holz)" stroke-width="7" stroke-linecap="round"/>
    <path class="fl-dach" d="M-62,-110 L0,-152 L62,-110 L52,-104 L0,-138 L-52,-104 Z"/>
    <path d="M-38,-100 L38,-100" stroke="var(--holz)" stroke-width="5"/>
    <path class="st-linie" d="M6,-100 L6,-74"/>
    <path class="fl-holzhell" d="M-4,-74 L16,-74 L14,-58 L-2,-58 Z"/>`,

  muehle: (aktiv) => `
    <path class="fl-wand" d="M-42,0 L42,0 L28,-128 L-28,-128 Z" stroke="var(--tinte-3)" stroke-width="2"/>
    <path class="fl-holz" d="M-11,0 L-11,-30 Q0,-42 11,-30 L11,0 Z"/>
    <circle class="fl-holzhell" cx="0" cy="-78" r="9"/>
    <path class="fl-dach" d="M-36,-124 Q0,-176 36,-124 Z"/>
    <g class="${aktiv ? 'dreht' : ''}"><g class="fluegel">
      <circle cx="0" cy="-138" r="70" fill="none" stroke="none"/>
      ${[0, 90, 180, 270].map((w) => `<g transform="rotate(${w} 0 -138)"><path class="fl-holzhell" d="M-3,-138 L3,-138 L4,-190 L-4,-190 Z"/><path class="fl-wand" d="M4,-186 L19,-186 L18,-148 L4,-148 Z" stroke="var(--holz)" stroke-width="1.5"/></g>`).join('')}
      <circle class="fl-holz" cx="0" cy="-138" r="7"/>
    </g></g>
    <path class="fl-acker" d="M48,0 L76,0 L72,-22 L52,-22 Z"/><path class="fl-acker2" d="M52,-22 L72,-22 L62,-30 Z"/>`,

  stall: () => `
    <path class="fl-holz" d="M-86,0 L86,0 L86,-80 L-86,-80 Z"/>
    <path class="st-hell" d="M-86,-20 L86,-20 M-86,-40 L86,-40 M-86,-60 L86,-60"/>
    <path class="fl-dach" d="M-98,-76 L0,-136 L98,-76 L88,-70 L0,-122 L-88,-70 Z"/>
    <path class="fl-dach2" d="M-88,-70 L0,-122 L88,-70 L86,-80 L0,-126 L-86,-80 Z" opacity=".0"/>
    <path class="fl-wand" d="M-28,0 L-28,-58 L28,-58 L28,0 Z"/>
    <path class="st-linie" style="stroke:var(--holz);stroke-width:4" d="M-28,-58 L28,0 M28,-58 L-28,0 M0,-58 L0,0"/>
    <path class="fl-acker" d="M-14,-102 L14,-102 L14,-84 L-14,-84 Z"/>
    <path class="fl-holzhell" d="M100,0 L100,-30 M100,-10 L150,-10 M100,-24 L150,-24 M150,0 L150,-30" stroke="var(--holz-hell)" stroke-width="4"/>`,

  scheune: () => `
    <path class="fl-dach" d="M-100,0 L100,0 L100,-100 L-100,-100 Z"/>
    <path class="fl-dach2" d="M-112,-96 L-70,-150 L70,-150 L112,-96 L100,-96 L66,-140 L-66,-140 L-100,-96 Z"/>
    <path class="fl-dach" d="M-100,-96 L-66,-140 L66,-140 L100,-96 Z"/>
    <path class="st-hell" style="stroke-width:3;opacity:.9" d="M-100,-96 L-66,-140 L66,-140 L100,-96 M-100,-100 L100,-100"/>
    <path class="fl-wand" d="M-40,0 L-40,-70 L40,-70 L40,0 Z"/>
    <path class="st-linie" style="stroke:var(--dach-2);stroke-width:4" d="M-40,-70 L0,-35 L40,-70 M-40,0 L0,-35 L40,0 M0,-70 L0,0"/>
    <path class="fl-wand" d="M-16,-128 L16,-128 L16,-106 L-16,-106 Z"/>
    <path class="st-linie" style="stroke:var(--dach-2);stroke-width:2" d="M0,-128 L0,-106 M-16,-117 L16,-117"/>
    <path class="fl-acker" d="M60,0 L94,0 L94,-20 Q77,-32 60,-20 Z"/>`,

  werkstatt: () => `
    <path class="fl-wand" d="M-78,0 L78,0 L78,-86 L-78,-86 Z" stroke="var(--tinte-3)" stroke-width="2"/>
    <path class="fl-holz" d="M-90,-80 L90,-108 L90,-96 L-90,-68 Z"/>
    <path class="fl-stein" d="M44,-100 L62,-100 L62,-140 L44,-140 Z"/>
    <path class="fl-holz" d="M-60,0 L-60,-58 L-14,-58 L-14,0 Z"/>
    <path class="fl-wasser" d="M10,-60 L58,-60 L58,-30 L10,-30 Z" opacity=".75"/>
    <path class="st-hell" style="stroke-width:3;opacity:1" d="M34,-60 L34,-30 M10,-45 L58,-45"/>
    <circle class="fl-holzhell" cx="-37" cy="-74" r="10"/>
    <path class="st-linie" style="stroke:var(--tinte-2)" d="M-44,-74 L-30,-74 M-37,-81 L-37,-67"/>
    <path class="fl-holzhell" d="M86,0 L120,0 L120,-24 L86,-24 Z"/><path class="fl-holz" d="M92,-24 L114,-24 L114,-34 L92,-34 Z"/>`,

  imkerei: (aktiv) => [-62, 0, 62].map((x, i) => `
    <g transform="translate(${x},0)">
      <path class="fl-holz" d="M-22,0 L-22,-12 L22,-12 L22,0 Z"/>
      <path class="fl-acker" d="M-24,-12 L24,-12 L24,-40 L-24,-40 Z"/>
      <path class="fl-acker2" d="M-24,-40 L24,-40 L24,-${62 + i * 4} L-24,-${62 + i * 4} Z"/>
      <path class="fl-dach" d="M-30,-${60 + i * 4} L30,-${60 + i * 4} L24,-${72 + i * 4} L-24,-${72 + i * 4} Z"/>
      <path class="fl-holz" d="M-8,-14 L8,-14 L8,-19 L-8,-19 Z"/>
    </g>`).join('') +
    `<g>${[[-96, -10], [-88, -22], [92, -8], [100, -20], [-30, -96], [40, -100]].map(([x, y], i) => i < 4
      ? `<circle cx="${x}" cy="${y}" r="6" fill="${i % 2 ? 'var(--dach)' : 'var(--gold)'}"/><path class="st-linie" style="stroke:var(--wiese-3)" d="M${x},${y + 6} L${x},2"/>`
      : (aktiv ? `<g><ellipse cx="${x}" cy="${y}" rx="5" ry="3.5" fill="var(--gold)"/><path d="M${x - 2},${y - 3} l-3,-4 M${x + 2},${y - 3} l3,-4" stroke="var(--tinte-3)" stroke-width="1.5"/></g>` : '')).join('')}</g>`,

  baeckerei: (aktiv) => `
    <path class="fl-wand" d="M-82,0 L82,0 L82,-90 L-82,-90 Z" stroke="var(--tinte-3)" stroke-width="2"/>
    <path class="fl-stein" d="M40,-110 L60,-110 L60,-150 L40,-150 Z"/>
    ${aktiv ? `<circle class="rauch fl-stein" cx="50" cy="-160" r="9"/><circle class="rauch fl-stein" style="animation-delay:1.3s" cx="56" cy="-170" r="7"/>` : ''}
    <path class="fl-dach" d="M-96,-86 L0,-146 L96,-86 L86,-80 L0,-132 L-86,-80 Z"/>
    <path class="fl-holz" d="M-22,0 L-22,-46 Q0,-66 22,-46 L22,0 Z"/>
    <path class="fl-wasser" d="M-66,-62 L-38,-62 L-38,-36 L-66,-36 Z" opacity=".75"/>
    <path class="fl-wasser" d="M38,-62 L66,-62 L66,-36 L38,-36 Z" opacity=".75"/>
    <circle class="fl-holzhell" cx="0" cy="-106" r="13"/>
    <path class="st-linie" style="stroke:var(--holz);stroke-width:3" d="M-7,-104 Q0,-118 7,-104 Q0,-96 -7,-104 Z"/>
    <path class="fl-acker" d="M90,0 L118,0 L114,-14 L94,-14 Z"/><ellipse class="fl-acker2" cx="104" cy="-18" rx="14" ry="6"/>`,
};

/** Ungefähre Höhe der Zeichnung (für Badges und Mini-Bilder). */
const HOEHE = { kornfeld: 80, brunnen: 152, muehle: 176, stall: 136, scheune: 150, werkstatt: 140, imkerei: 84, baeckerei: 150 };

/* ---------------- Deko ---------------- */

const DEKO = {
  zaun: () => Array.from({ length: 52 }, (_, i) => `<path class="fl-holzhell" d="M${i * 50},0 L${i * 50 + 8},0 L${i * 50 + 8},-34 L${i * 50 + 4},-40 L${i * 50},-34 Z"/>`).join('') +
    '<path class="fl-holzhell" d="M0,-24 L2600,-24 L2600,-18 L0,-18 Z"/><path class="fl-holzhell" d="M0,-10 L2600,-10 L2600,-4 L0,-4 Z"/>',
  blumen: () => `<ellipse class="fl-erde" cx="0" cy="0" rx="56" ry="14"/>` + [[-40, -10, 'var(--dach)'], [-22, -16, 'var(--gold)'], [-4, -12, '#9b7fc0'], [14, -18, 'var(--dach)'], [32, -10, '#9b7fc0'], [46, -14, 'var(--gold)']].map(([x, y, f]) => `<path class="st-linie" style="stroke:var(--wiese-3)" d="M${x},0 L${x},${y}"/><circle cx="${x}" cy="${y}" r="7" fill="${f}"/>`).join(''),
  apfelbaum: () => `<path class="fl-holz" d="M-8,0 L8,0 L6,-70 L-6,-70 Z"/><circle class="fl-wiese3" cx="0" cy="-100" r="50"/><circle class="fl-wiese2" cx="-24" cy="-84" r="30"/><circle class="fl-wiese2" cx="22" cy="-118" r="28"/>` + [[-18, -96], [16, -86], [4, -128], [-34, -114], [30, -108]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="var(--dach)"/>`).join(''),
  bank: () => `<path class="fl-holz" d="M-40,0 L-36,0 L-36,-18 L-40,-18 Z M36,0 L40,0 L40,-18 L36,-18 Z"/><path class="fl-holzhell" d="M-46,-18 L46,-18 L46,-24 L-46,-24 Z M-46,-32 L46,-32 L46,-46 L-46,-46 Z"/>`,
  teich: () => `<ellipse class="fl-wasser" cx="0" cy="0" rx="90" ry="26" opacity=".85"/><ellipse cx="-20" cy="-4" rx="30" ry="6" fill="#fff" opacity=".25"/><path class="st-linie" style="stroke:var(--wiese-3);stroke-width:3" d="M70,-6 L74,-40 M80,-4 L86,-34 M-80,-4 L-84,-32"/><path class="fl-holz" d="M20,20 L96,4 L96,12 L24,28 Z"/>`,
  vogelhaus: () => `<path class="fl-holz" d="M-3,0 L3,0 L3,-70 L-3,-70 Z"/><path class="fl-holzhell" d="M-18,-70 L18,-70 L18,-96 L-18,-96 Z"/><path class="fl-dach" d="M-24,-94 L0,-112 L24,-94 Z"/><circle cx="0" cy="-84" r="5" fill="var(--tinte-2)"/>`,
  laternen: () => [0, 1].map((i) => `<g transform="translate(${i * 70},0)"><path class="fl-holz" d="M-3,0 L3,0 L3,-80 L-3,-80 Z"/><path class="fl-gold" d="M-10,-80 L10,-80 L8,-100 L-8,-100 Z" opacity=".9"/><path class="fl-dach" d="M-12,-100 L12,-100 L0,-110 Z"/></g>`).join(''),
  windrad: () => `<path class="fl-holz" d="M-3,0 L3,0 L2,-90 L-2,-90 Z"/><g class="dreht"><g class="fluegel">${[0, 72, 144, 216, 288].map((w) => `<path transform="rotate(${w} 0 -90)" d="M0,-90 L6,-120 L0,-122 Z" fill="${w % 144 ? 'var(--dach)' : 'var(--gold)'}"/>`).join('')}</g></g>`,
};

/* ---------------- Anordnung (Quer- und Hochformat) ---------------- */

const ANORDNUNG = {
  quer: {
    viewBox: '0 0 1200 820',
    huegel: [
      { cls: 'fl-wiese3', d: 'M-700,280 C-300,250 -100,330 0,300 C200,240 400,290 600,250 C800,214 1000,272 1200,236 C1500,200 1700,260 1900,240 L1900,1700 L-700,1700 Z' },
      { cls: 'fl-wiese2', d: 'M-700,420 C-300,390 -100,440 0,410 C250,360 520,430 780,384 C960,354 1100,396 1200,374 C1500,340 1700,400 1900,380 L1900,1700 L-700,1700 Z' },
      { cls: 'fl-wiese', d: 'M-700,560 C-300,530 -100,590 0,560 C300,520 620,586 900,540 C1050,516 1150,540 1200,528 C1500,500 1700,560 1900,540 L1900,1700 L-700,1700 Z' },
    ],
    weg: 'M640,830 C620,760 380,780 330,730 C280,690 700,700 820,640 C980,560 980,560 760,520 C560,490 300,520 330,470 C360,420 600,420 640,330 L600,300',
    orte: {
      kornfeld: [215, 700, 1], brunnen: [485, 706, 0.95], muehle: [745, 696, 0.9], stall: [1010, 704, 0.95],
      scheune: [935, 486, 0.82], werkstatt: [645, 470, 0.8], imkerei: [360, 482, 0.8], baeckerei: [625, 292, 0.7],
    },
    deko: { zaun: [-700, 818, 1], blumen: [90, 790, 1], apfelbaum: [1130, 480, 1], bank: [505, 548, 0.9], teich: [1060, 312, 0.9], vogelhaus: [150, 440, 1], laternen: [590, 612, 0.85], windrad: [210, 302, 0.9] },
    wolken: [[180, 90, 1], [520, 60, .8], [900, 110, 1.1]],
    baeume: [[60, 330, .7], [1150, 260, .6], [420, 270, .5], [820, 250, .55]],
  },
  hoch: {
    viewBox: '0 0 800 1200',
    huegel: [
      { cls: 'fl-wiese3', d: 'M-700,300 C-300,270 -100,320 0,290 C200,250 400,292 800,248 C1100,220 1300,270 1500,250 L1500,1900 L-700,1900 Z' },
      { cls: 'fl-wiese2', d: 'M-700,520 C-300,490 -100,530 0,500 C250,460 520,520 800,476 C1100,440 1300,500 1500,480 L1500,1900 L-700,1900 Z' },
      { cls: 'fl-wiese', d: 'M-700,770 C-300,740 -100,790 0,760 C260,720 560,780 800,740 C1100,700 1300,760 1500,740 L1500,1900 L-700,1900 Z' },
    ],
    weg: 'M420,1210 C400,1140 200,1160 210,1080 C220,1000 600,1010 600,930 C600,850 210,860 210,770 C210,680 600,700 600,620 C600,540 220,560 230,470 C240,400 420,380 420,320',
    orte: {
      kornfeld: [210, 1110, 0.95], brunnen: [595, 1118, 0.92], muehle: [215, 880, 0.88], stall: [600, 890, 0.9],
      scheune: [215, 650, 0.85], werkstatt: [600, 648, 0.85], imkerei: [215, 420, 0.82], baeckerei: [600, 414, 0.82],
    },
    deko: { zaun: [-700, 1196, 1], blumen: [400, 1168, 1], apfelbaum: [745, 770, .85], bank: [410, 772, 0.85], teich: [420, 290, 0.8], vogelhaus: [60, 530, 1], laternen: [380, 1000, 0.8], windrad: [745, 300, 0.8] },
    wolken: [[150, 100, 1], [560, 80, .9]],
    baeume: [[40, 290, .6], [765, 480, .6], [60, 760, .6]],
  },
};

function baum(x, y, s) {
  return `<g transform="translate(${x},${y}) scale(${s})"><path class="fl-holz" d="M-6,0 L6,0 L5,-50 L-5,-50 Z"/><circle class="fl-wiese3" cx="0" cy="-80" r="40"/><circle class="fl-wiese2" cx="-16" cy="-66" r="24"/></g>`;
}
function wolke(x, y, s) {
  return `<g transform="translate(${x},${y}) scale(${s})"><ellipse class="wolke" cx="0" cy="0" rx="70" ry="18"/><ellipse class="wolke" cx="-20" cy="-12" rx="34" ry="20"/><ellipse class="wolke" cx="22" cy="-10" rx="26" ry="16"/></g>`;
}

function sterne(stufe) {
  return Array.from({ length: 5 }, (_, i) => `<circle class="stern${i < stufe ? ' an' : ''}" cx="${-44 + i * 22}" cy="66" r="7"/>`).join('');
}

/**
 * Baut den kompletten Hof.
 * @param {object[]} infos  je Gebäude: { block, status, stufe, faellig, neu, levelNoetig }
 * @param {object} deko    Deko-ID → true
 * @param {'quer'|'hoch'} format
 */
export function hofSvg(infos, deko, format) {
  const a = ANORDNUNG[format];
  const gebaeude = infos.map((info) => {
    const [x, y, s] = a.orte[info.block.gebaeude.typ];
    const aktiv = info.status === 'produziert';
    const zeichnung = (GEBAEUDE[info.block.gebaeude.typ] || GEBAEUDE.stall)(aktiv);
    let unter = '';
    if (info.status === 'gesperrt') unter = `🔒 ab Level ${info.levelNoetig}`;
    else if (info.status === 'kaufbar') unter = `Bauen: ${info.block.preis} Münzen`;
    else if (info.status === 'ruht') unter = 'ruht – Vorstufe fehlt';
    const h = HOEHE[info.block.gebaeude.typ] || 150;
    const reif = aktiv && info.faellig > 0
      ? `<g class="reif" transform="translate(92,${-h + 6})"><circle r="21"/><text y="6" text-anchor="middle">${info.faellig}</text></g>` : '';
    const neu = aktiv && info.faellig === 0 && info.neu > 0
      ? `<g class="neu-badge" transform="translate(92,${-h + 6})"><circle r="19"/><text y="5" text-anchor="middle">neu</text></g>` : '';
    const label = `${info.block.gebaeude.name}${info.status === 'produziert' || info.status === 'ruht' ? `, Stufe ${info.stufe} von 5` : ''}${info.faellig ? `, ${info.faellig} reif` : ''}${unter ? ', ' + unter : ''}`;
    return `<g class="geb ${info.status}" data-block="${info.block.id}" transform="translate(${x},${y}) scale(${s})" role="button" tabindex="0" aria-label="${esc(label)}">
      <rect x="-130" y="${-h - 20}" width="260" height="${h + (unter ? 120 : 100)}" fill="transparent"/>
      <g class="geb-bild">${zeichnung}</g>
      <g class="geb-schild"><rect x="-84" y="14" width="168" height="38" rx="12"/><text x="0" y="40" text-anchor="middle">${esc(info.block.gebaeude.name)}</text></g>
      ${info.status === 'gesperrt' || info.status === 'kaufbar' ? `<text class="geb-unter" x="0" y="74" text-anchor="middle">${esc(unter)}</text>` : sterne(info.stufe)}
      ${info.status === 'ruht' ? `<text class="geb-unter" x="0" y="96" text-anchor="middle">${esc(unter)}</text>` : ''}
      ${reif}${neu}
    </g>`;
  }).join('');
  const dekoSvg = Object.entries(a.deko).filter(([id]) => deko[id]).map(([id, [x, y, s]]) => `<g class="deko" transform="translate(${x},${y}) scale(${s})">${DEKO[id]()}</g>`).join('');
  return `<svg viewBox="${a.viewBox}" preserveAspectRatio="xMidYMid meet" style="overflow:visible" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Dein Hof">
    ${a.wolken.map(([x, y, s]) => wolke(x, y, s)).join('')}
    ${a.huegel.map((h) => `<path class="${h.cls}" d="${h.d}"/>`).join('')}
    ${a.baeume.map(([x, y, s]) => baum(x, y, s)).join('')}
    <path class="fl-weg" d="${a.weg}" fill="none" stroke="var(--papier-2)" stroke-width="34" stroke-linecap="round" opacity=".8"/>
    ${dekoSvg}
    ${gebaeude}
  </svg>`;
}

/** Kleines Einzelbild eines Gebäudes (für Dialoge und Aufträge). */
export function gebaeudeMini(typ, aktiv = true) {
  const h = HOEHE[typ] || 150;
  return `<svg class="geb-mini" viewBox="-130 ${-h - 30} 260 ${h + 40}" aria-hidden="true">${(GEBAEUDE[typ] || GEBAEUDE.stall)(aktiv)}</svg>`;
}

/** Kleines Deko-Bild für den Markt. */
export function dekoMini(id) {
  if (id === 'zaun') return `<svg viewBox="0 -50 260 60" aria-hidden="true">${DEKO.zaun()}</svg>`;
  return `<svg viewBox="-110 -140 220 170" aria-hidden="true">${DEKO[id]()}</svg>`;
}
