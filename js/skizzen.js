// skizzen.js – interaktive Mini-Skizzen („Werkbank“). Mit Schiebereglern Werte verändern
// und die Wirkung sehen. Alle Aussagen stammen aus dem Material (Quelle steht dabei).

import { esc } from './formel.js';

const q = (t) => ` <span class="quelle">${t}</span>`;

function regler(id, text, min, max, schritt, wert, einheit = '') {
  return `<div class="regler"><label for="${id}">${text}<output id="${id}-w">${wert}${einheit}</output></label>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${schritt}" value="${wert}"></div>`;
}
const de = (z, n = 1) => Number(z).toFixed(n).replace('.', ',');

/** Hilfsfunktion: verbindet Regler mit einer Zeichenfunktion. */
function verbinde(el, ids, zeichne, einheiten = {}) {
  const lies = () => Object.fromEntries(ids.map((id) => [id, Number(el.querySelector('#' + id).value)]));
  const update = () => {
    const w = lies();
    ids.forEach((id) => { const o = el.querySelector(`#${id}-w`); if (o && !o.dataset.manuell) o.textContent = (einheiten[id] ? einheiten[id](w[id]) : w[id]); });
    zeichne(w);
  };
  el.addEventListener('input', update);
  update();
  return update;
}

export const SKIZZEN = [
  {
    id: 'lot', block: 'sagittal', titel: 'Lotlinie von der Seite',
    text: 'Verschiebe Kopf, Brustkorb, Becken und Knie gegenüber der mittleren Frontalebene und lies, was laut Material passiert.',
    baue(el) {
      el.innerHTML = `<div class="skizze"><svg viewBox="0 0 300 560" aria-label="Seitansicht mit Lotlinie"></svg><div>
        ${regler('s-kopf', 'Kopf', -3, 3, 1, 0)}${regler('s-bk', 'Brustkorb', -3, 3, 1, 0)}${regler('s-becken', 'Becken', -3, 3, 1, 0)}${regler('s-knie', 'Knie', -3, 3, 1, 0)}
        <p class="klein">− = nach hinten (dorsal) · + = nach vorne (ventral)</p>
        <div class="reihe"><button class="knopf zweit" type="button" data-komp>Kopf kompensieren lassen</button><button class="knopf still" type="button" data-null>Zur Norm</button></div>
        <div class="befund"></div></div></div>`;
      const svg = el.querySelector('svg'), befund = el.querySelector('.befund');
      const vz = (v) => (v > 0 ? '+' : '') + v;
      const update = verbinde(el, ['s-kopf', 's-bk', 's-becken', 's-knie'], (w) => {
        const h = w['s-kopf'] * 9, t = w['s-bk'] * 9, b = w['s-becken'] * 9, k = w['s-knie'] * 9;
        const P = { ohr: [150 + h, 92], sch: [150 + t, 178], tro: [150 + b, 306], knie: [150 + k, 412], navi: [150, 516] };
        svg.innerHTML = `
          <path class="abb-lot" d="M150,20 L150,548"/>
          <text class="abb-text" x="156" y="34">mittlere Frontalebene</text>
          <path class="abb-koerper" d="M118,520 L132,500 L170,500 L214,522 L214,532 L118,532 Z"/>
          <path class="abb-linie abb-dick" d="M150,506 L${P.knie[0]},${P.knie[1]} L${P.tro[0]},${P.tro[1]}"/>
          <path class="abb-koerper" d="M${P.tro[0] - 34},${P.tro[1] - 40} L${P.tro[0] + 34},${P.tro[1] - 40} L${P.tro[0] + 24},${P.tro[1] + 12} L${P.tro[0] - 24},${P.tro[1] + 12} Z"/>
          <path class="abb-linie abb-dick" d="M${P.tro[0] - 14},${P.tro[1] - 40} C${P.tro[0] - 8},${P.tro[1] - 70} ${P.sch[0] - 30},${P.sch[1] + 70} ${P.sch[0] - 24},${P.sch[1]} C${P.sch[0] - 20},${P.sch[1] - 40} ${P.ohr[0] - 18},${P.ohr[1] + 40} ${P.ohr[0] - 10},${P.ohr[1] + 8}"/>
          <ellipse class="abb-koerper" cx="${P.sch[0]}" cy="${P.sch[1] + 38}" rx="40" ry="62"/>
          <ellipse class="abb-koerper" cx="${P.ohr[0] + 6}" cy="${P.ohr[1] - 14}" rx="32" ry="38"/>
          <path class="abb-koerper" d="M${P.ohr[0] + 36},${P.ohr[1] - 18} l10,8 l-8,4 Z"/>
          ${Object.entries(P).map(([n, [x, y]]) => `<circle cx="${x}" cy="${y}" r="6" fill="${x === 150 ? 'var(--gut)' : 'var(--hinweis)'}"/>`).join('')}`;
        const z = [];
        if (h > 0) z.push(`Kopf vor der MFE (Anteposition): Die subokzipitalen Nackenstrecker sichern das Kopfgewicht durch exzentrische Dauerspannung.${q('D/6')} Ventraltranslation ≙ Reklination: + HWS, Ex in den oberen Kopfgelenken.${q('I/14')}`);
        if (h < 0) z.push(`Kopf hinter der MFE: Dorsaltranslation ≙ Inklination: – HWS, Flex in den oberen Kopfgelenken.${q('I/14')}`);
        if (t < 0) z.push(`Brustkorbgewicht nach hinten: Die Bauchmuskeln werden reaktiv hyperaktiv.${q('G/9')}`);
        if (t > 0) z.push(`Thorax vor der Lotlinie: Die dorsale Kette (Rückenstrecker) schaltet fallverhindernd hyperton.${q('D/10')}`);
        if (t < 0 && h > 0) z.push(`Doppelte Schubbelastung zervikal: Von unten zieht das BK-Gewicht nach hinten unten, von oben schiebt das Kopfgewicht nach vorn unten.${q('G/10')}`);
        if (h > 0 && t === 0) z.push(`Einfache zervikale Schubbelastung: Von oben schiebt das Kopfgewicht nach vorn unten.${q('G/10')}`);
        if (b > 0) z.push(`Becken nach ventral verschoben (Ventraltranslation).${q('I/21')} Beim Sway-Back-Muster (Becken nach ventral geschoben und nach hinten gekippt) steht die Hüfte in relativer Hyperextension, das Gewicht hängt in den vorderen Bändern.${q('D/4')}`);
        if (k < 0) z.push(`Knie hinter der Lotlinie = Genu recurvatum: Die Last lagert in den hinteren Kapsel- und Bandstrukturen.${q('D/3')} Schubbelastung am Knie nach dorsal, + Fersenbelastung.${q('G/10')}`);
        if (k > 0) z.push(`Knie vor der Lotlinie = Flexionsstellung: Der M. quadriceps femoris leistet exzentrische und isometrische Haltearbeit.${q('D/3')} Oft zusammen mit + DEX im OSG.${q('I/7')}`);
        if ((t > 0 && h < 0) || (t < 0 && h > 0)) z.push(`Kompensation: Der darüber liegende Abschnitt strebt in die Gegenrichtung, damit der Massenmittelpunkt über der USF bleibt.${q('H/12')}`);
        befund.className = 'befund ' + (z.length ? 'abw' : 'norm');
        befund.innerHTML = z.length ? `<b>Befund</b> (Kopf ${vz(w['s-kopf'])}, Brustkorb ${vz(w['s-bk'])}, Becken ${vz(w['s-becken'])}, Knie ${vz(w['s-knie'])})<ul>${z.map((s) => `<li>${s}</li>`).join('')}</ul>`
          : `<b>Norm:</b> Os naviculare, Kniegelenk, Trochanter major, Schultergelenk und Ohrläppchen stehen übereinander.${q('I/1')} Gewichte, die genau übereinander stehen, belasten die verbindenden Strukturen am wenigsten.${q('H/14')}`;
      });
      el.querySelector('[data-komp]').addEventListener('click', () => { el.querySelector('#s-kopf').value = -Number(el.querySelector('#s-bk').value); update(); });
      el.querySelector('[data-null]').addEventListener('click', () => { el.querySelectorAll('input[type=range]').forEach((r) => { r.value = 0; }); update(); });
    },
  },
  {
    id: 'osg', block: 'sagittal', titel: 'Winkel im oberen Sprunggelenk',
    text: 'Stelle den Winkel zwischen Fuß und Fibularlängsachse ein.',
    baue(el) {
      el.innerHTML = `<div class="skizze"><svg viewBox="0 0 320 300" aria-label="Unterschenkel und Fuß"></svg><div>
        ${regler('s-winkel', 'Winkel Fuß – Unterschenkel', 70, 110, 1, 90, '°')}<div class="befund"></div></div></div>`;
      const svg = el.querySelector('svg'), befund = el.querySelector('.befund');
      verbinde(el, ['s-winkel'], ({ 's-winkel': w }) => {
        const rad = (w * Math.PI) / 180;
        const ax = 110, ay = 230;
        // Unterschenkel zeigt nach oben; Winkel zum Fuß (nach rechts) = w
        const ux = ax + Math.cos(rad) * 190, uy = ay - Math.sin(rad) * 190;
        svg.innerHTML = `<path class="abb-linie" d="M20,${ay + 32} L300,${ay + 32}"/>
          <path class="abb-koerper" d="M${ax - 30},${ay + 32} L${ax + 160},${ay + 32} Q${ax + 166},${ay + 18} ${ax + 140},${ay + 14} L${ax + 30},${ay - 2} Q${ax + 4},${ay - 8} ${ax - 20},${ay + 4} Q${ax - 34},${ay + 14} ${ax - 30},${ay + 32} Z"/>
          <path class="abb-linie abb-dick" d="M${ax},${ay} L${ux},${uy}"/>
          <path class="abb-lot" d="M${ax},${ay} L${ax},${ay - 190}" opacity=".5"/>
          <path class="abb-mass" d="M${ax + 40},${ay} A40,40 0 0 0 ${ax + Math.cos(rad) * 40},${ay - Math.sin(rad) * 40}"/>
          <text class="abb-text" x="${ax + 46}" y="${ay - 18}">${w}°</text>
          <circle cx="${ax}" cy="${ay}" r="7" fill="var(--akzent)"/>`;
        if (w === 90) { befund.className = 'befund norm'; befund.innerHTML = `<b>Norm:</b> Fuß(boden) und Fibularlängsachse bilden 90°.${q('I/4')} Unterschenkel annähernd senkrecht, Lot knapp vor dem Außenknöchel.${q('D/2')}`; }
        else if (w < 90) { befund.className = 'befund abw'; befund.innerHTML = `<b>Winkel &lt; 90° = DEX im OSG.</b>${q('I/4')} Der Unterschenkel neigt sich nach ventral – in der geschlossenen Kette wird meist eine kompensatorische Flexion im Kniegelenk erzwungen.${q('D/3')}`; }
        else { befund.className = 'befund abw'; befund.innerHTML = `<b>Winkel &gt; 90° = PLF im OSG.</b>${q('I/4')} Beispiel Hohlrundrücken: + PLF in den OSG bei + Extension der Kniegelenke.${q('I/15')}`; }
      }, { 's-winkel': (v) => v + '°' });
    },
  },
  {
    id: 'navi', block: 'sagittal', titel: 'Navicular Drop',
    text: 'Höhe des Os naviculare über dem Boden – entspannt und belastet. Der Unterschied ist der Navicular Drop.',
    baue(el) {
      el.innerHTML = `<div class="skizze"><svg viewBox="0 0 320 220" aria-label="Fußgewölbe von medial"></svg><div>
        ${regler('s-ent', 'Höhe entspannt', 8, 30, 1, 18, ' mm')}${regler('s-bel', 'Höhe belastet', 0, 30, 1, 11, ' mm')}<div class="befund"></div></div></div>`;
      const svg = el.querySelector('svg'), befund = el.querySelector('.befund');
      verbinde(el, ['s-ent', 's-bel'], (w) => {
        const ent = w['s-ent'];
        let bel = Math.min(w['s-bel'], ent);
        if (bel !== w['s-bel']) { el.querySelector('#s-bel').value = bel; el.querySelector('#s-bel-w').textContent = bel + ' mm'; }
        const drop = ent - bel;
        const bogen = (hmm, cls) => `<path class="${cls}" d="M40,180 C90,180 110,${180 - hmm * 3.2} 160,${180 - hmm * 3.2} C210,${180 - hmm * 3.2} 240,176 290,180"/>`;
        svg.innerHTML = `<path class="abb-linie" d="M20,184 L300,184"/>
          ${bogen(ent, 'abb-linie abb-fein')}${bogen(bel, 'abb-linie abb-dick')}
          <circle cx="160" cy="${180 - ent * 3.2}" r="6" fill="var(--tinte-3)"/><circle cx="160" cy="${180 - bel * 3.2}" r="8" fill="var(--akzent)"/>
          <path class="abb-mass" d="M190,${180 - ent * 3.2} L190,${180 - bel * 3.2}"/>
          <text class="abb-text" x="198" y="${180 - ((ent + bel) / 2) * 3.2 + 4}">Drop ${drop} mm</text>
          <text class="abb-text" x="40" y="212">dünn = entspannt · dick = belastet</text>`;
        let t;
        if (drop < 3) t = ['abw', `<b>Drop ${drop} mm – sehr gering.</b> Unter 3 mm ist das Risiko für Überlastungsschäden (z. B. Stressfrakturen) erhöht, weil die stoßdämpfende Flexibilität fehlt.${q('D/2')}`];
        else if (drop < 5) t = ['abw', `<b>Drop ${drop} mm – zu wenig</b> laut Mitschrift (Norm 5–9 mm).${q('I/4')}`];
        else if (drop <= 9) t = ['norm', `<b>Drop ${drop} mm – Norm (5–9 mm).</b>${q('I/4')} Der Test sagt etwas über die Funktion des Abdämpfens aus.`];
        else t = ['abw', `<b>Drop ${drop} mm – zu groß (&gt; 9 mm).</b>${q('I/4')} Pathologisch erhöht: spricht für eine übermäßige Pronation bzw. einen funktionellen Plattfuß.${q('D/2')}`];
        befund.className = 'befund ' + t[0];
        befund.innerHTML = t[1] + `<p class="klein" style="margin-top:.5em">Ausgangsstellung: anatomische Neutralstellung des USG.${q('D/1')} Norm der Längswölbung ca. 17 mm – kleiner Richtung Senkfuß, größer Richtung Hohlfuß.${q('I/3')}</p>`;
      }, { 's-ent': (v) => v + ' mm', 's-bel': (v) => v + ' mm' });
    },
  },
  {
    id: 'schulter', block: 'frontal', titel: 'Schultergürtel quantifizieren',
    text: 'Abstand der Scapula (Höhe Spina) zu den BWS-Dornfortsätzen und Winkel Clavicula/Sternum.',
    baue(el) {
      el.innerHTML = `<div class="skizze"><svg viewBox="0 0 320 260" aria-label="Schultergürtel"></svg><div>
        ${regler('s-abst', 'Abstand Scapula – Dornfortsätze', 2, 10, 0.5, 6, ' cm')}${regler('s-cw', 'Winkel Clavicula / Sternum', 80, 112, 1, 95, '°')}<div class="befund"></div></div></div>`;
      const svg = el.querySelector('svg'), befund = el.querySelector('.befund');
      verbinde(el, ['s-abst', 's-cw'], (w) => {
        const a = w['s-abst'], c = w['s-cw'];
        const sx = 80 + a * 9;
        const rad = ((c - 90) * Math.PI) / 180;
        svg.innerHTML = `<text class="abb-text" x="20" y="22">Rücken (von dorsal)</text>
          <path class="abb-linie abb-dick" d="M80,30 L80,240"/>${[50, 80, 110, 140, 170, 200].map((y) => `<circle cx="80" cy="${y}" r="4" fill="var(--tinte-2)"/>`).join('')}
          <path class="abb-koerper" d="M${sx},60 L${sx + 46},64 L${sx + 6},170 Z"/>
          <path class="abb-mass" d="M80,74 L${sx},74"/><text class="abb-text" x="${80 + (sx - 80) / 2 - 16}" y="66">${de(a)} cm</text>
          <text class="abb-text" x="206" y="22">Brustbein</text><text class="abb-text" x="206" y="38">(von ventral)</text>
          <path class="abb-koerper" d="M228,60 L244,60 L242,170 L230,170 Z"/>
          <path class="abb-linie abb-dick" d="M244,64 L${244 + Math.cos(rad) * 64},${64 - Math.sin(rad) * 64}"/>
          <path class="abb-mass" d="M244,94 A30,30 0 0 0 ${244 + Math.cos(rad) * 30},${64 - Math.sin(rad) * 30}"/>
          <text class="abb-text" x="250" y="110">${c}°</text>`;
        const z = [];
        if (a > 7) z.push(`Abstand &gt; 7 cm = <b>Ventralduktion (Protraktion)</b> des Schultergürtels. Sie hat eine Zwangsrotation der Clavicula nach ventral zur Folge.${q('G/4')}`);
        else if (a < 5) z.push(`Abstand &lt; 5 cm = <b>Dorsalduktion (Retraktion)</b> des Schultergürtels.${q('G/4')}`);
        else z.push(`Abstand 5–7 cm = Norm (abhängig von der Konstitution).${q('G/4')}`);
        if (c > 100) z.push(`Winkel &gt; 100° = <b>Elevation (Cranialduktion)</b> des Schultergürtels.${q('G/4')}`);
        else if (c < 90) z.push(`Winkel &lt; 90° = <b>Depression (Caudalduktion)</b> des Schultergürtels.${q('G/4')}`);
        else z.push(`Winkel 90–100° = Norm (beidseits gleicher Winkel).${q('G/4')}`);
        const norm = a >= 5 && a <= 7 && c >= 90 && c <= 100;
        befund.className = 'befund ' + (norm ? 'norm' : 'abw');
        befund.innerHTML = `<ul>${z.map((s) => `<li>${s}</li>`).join('')}</ul><p class="klein">Merke: Fehlstellungen des Schultergürtels sind immer reaktiv – er liegt nur auf dem Thorax auf.${q('G/1')}</p>`;
      }, { 's-abst': (v) => de(v) + ' cm', 's-cw': (v) => v + '°' });
    },
  },
  {
    id: 'laengen', block: 'konstitution', titel: 'Längenproportionen',
    text: 'Stelle eine Körpergröße ein und sieh die Normlängen der Abschnitte.',
    baue(el) {
      el.innerHTML = `<div class="skizze"><svg viewBox="0 0 320 560" aria-label="Längenproportionen"></svg><div>
        ${regler('s-groesse', 'Körpergröße', 150, 200, 1, 176, ' cm')}<div class="befund norm"></div></div></div>`;
      const svg = el.querySelector('svg'), befund = el.querySelector('.befund');
      verbinde(el, ['s-groesse'], ({ 's-groesse': g }) => {
        const ol = g / 2, ul = g / 2;
        const teile = [['Scheitel – Fossa jugularis', (2 / 5) * ol, '2/5 OL'], ['Fossa jugularis – Bauchnabel', (2 / 5) * ol, '2/5 OL'], ['Bauchnabel – Trochanterpunkt', (1 / 5) * ol, '1/5 OL'], ['Trochanterpunkt – Kniegelenkspalt', ul / 2, '1/2 UL'], ['Kniegelenkspalt – Fußboden', ul / 2, '1/2 UL']];
        const skala = 520 / g;
        let y = 20;
        svg.innerHTML = teile.map(([n, l, an], i) => {
          const h = l * skala; const s = `<rect x="70" y="${y}" width="40" height="${h}" fill="${i < 3 ? 'var(--acker)' : 'var(--wiese-2)'}" stroke="var(--karte)" stroke-width="2"/>
            <text class="abb-text" x="120" y="${y + h / 2 - 2}">${esc(n)}</text><text class="abb-text" x="120" y="${y + h / 2 + 14}" style="font-weight:700">${an} = ${de(l)} cm</text>`;
          y += h; return s;
        }).join('') + `<path class="abb-lot" d="M30,${20 + ol * skala} L300,${20 + ol * skala}"/><text class="abb-text" x="10" y="${16 + ol * skala}">Trochanterpunkt</text>`;
        befund.innerHTML = `Oberlänge = Unterlänge = ${de(ol)} cm (Verhältnis 1 : 1).${q('H/4')} Beispiel im Skript: 176 cm → 88 cm; 35,2 / 35,2 / 17,6 cm und 44 / 44 cm.${q('H/4')}`;
      }, { 's-groesse': (v) => v + ' cm' });
    },
  },
  {
    id: 'bmi', block: 'konstitution', titel: 'BMI- und BAI-Rechner',
    text: 'Werte einstellen – die App rechnet mit den Formeln aus dem Skript.',
    baue(el) {
      el.innerHTML = `<div class="skizze"><div>
        <div class="reihe" style="margin-bottom:10px"><span>Geschlecht:</span><div class="wahl"><button type="button" data-g="w" aria-pressed="true">weiblich</button><button type="button" data-g="m" aria-pressed="false">männlich</button></div></div>
        ${regler('s-kg', 'Körpergewicht', 40, 130, 1, 64, ' kg')}${regler('s-m', 'Körpergröße', 150, 200, 1, 168, ' cm')}
        ${regler('s-huefte', 'Hüftumfang (BAI)', 60, 140, 1, 98, ' cm')}${regler('s-alter', 'Alter (BAI-Tabelle)', 21, 80, 1, 22, ' Jahre')}
      </div><div class="befund"></div></div>`;
      const befund = el.querySelector('.befund');
      let g = 'w';
      const BAI = { w: [[29, 18, 23, 28], [39, 19, 24, 29], [50, 20, 25, 30], [200, 21, 26, 31]], m: [[29, 13, 18, 23], [39, 14, 19, 24], [50, 15, 20, 25], [200, 16, 21, 26]] };
      const update = verbinde(el, ['s-kg', 's-m', 's-huefte', 's-alter'], (w) => {
        const m = w['s-m'] / 100, bmi = w['s-kg'] / (m * m), bai = w['s-huefte'] / Math.pow(m, 1.5) - 18;
        const b = Math.round(bmi * 10) / 10;
        const grenzen = g === 'm' ? [[0, 19.95, 'Untergewicht (unter 20)'], [20, 25, 'Normalgewicht (20–25)'], [26, 30, 'Übergewicht (26–30)'], [31, 40, 'Adipositas (31–40)'], [40.05, 999, 'starke Adipositas (über 40)']]
          : [[0, 18.95, 'Untergewicht (unter 19)'], [19, 24, 'Normalgewicht (19–24)'], [25, 30, 'Übergewicht (25–30)'], [31, 40, 'Adipositas (31–40)'], [40.05, 999, 'starke Adipositas (über 40)']];
        const kat = grenzen.find(([lo, hi]) => b >= lo && b <= hi);
        const zeile = BAI[g].find((z) => w['s-alter'] <= z[0]);
        const bb = Math.round(bai * 10) / 10;
        const baiKat = bb < zeile[1] ? 'unterhalb des Bereichs „gut“ (die Tabelle bewertet das nicht)' : bb <= zeile[2] ? `gut (${zeile[1]}–${zeile[2]} %)` : bb <= zeile[3] ? `mittel (${zeile[2]}–${zeile[3]} %)` : `schlecht (über ${zeile[3]} %)`;
        befund.className = 'befund';
        befund.innerHTML = `<div class="formel-karte"><b>BMI</b> = ${de(w['s-kg'], 0)} kg : (${de(m, 2)} m)² = <b>${de(bmi)} kg/m²</b><br>${kat ? kat[2] : '<i>liegt zwischen den Bereichen der Tabelle – das Skript ordnet diesen Wert nicht eindeutig zu</i>'}${q('H/9, H/10')}</div>
          <div class="formel-karte"><b>BAI</b> = ${w['s-huefte']} cm : (${de(m, 2)} m)<sup>1,5</sup> − 18 = <b>${de(bai)} %</b><br>${g === 'm' ? 'Männer' : 'Frauen'} bis ${zeile[0] === 200 ? 'über 50' : zeile[0]} Jahre: ${baiKat}${q('H/10, H/11')}</div>
          <p class="klein">Kritik am BMI: Das Bauchfett ist entscheidend – nicht nur der BMI.${q('H/10')}</p>`;
      }, { 's-kg': (v) => v + ' kg', 's-m': (v) => de(v / 100, 2) + ' m', 's-huefte': (v) => v + ' cm', 's-alter': (v) => v + ' Jahre' });
      el.querySelectorAll('[data-g]').forEach((bt) => bt.addEventListener('click', () => { g = bt.dataset.g; el.querySelectorAll('[data-g]').forEach((x) => x.setAttribute('aria-pressed', x === bt)); update(); }));
    },
  },
  {
    id: 'usf', block: 'gleichgewicht', titel: 'Unterstützungsfläche & Körperschwerpunkt',
    text: 'Verschiebe den Körperschwerpunkt (KSP) und verändere den Stand.',
    baue(el) {
      el.innerHTML = `<div class="skizze"><svg viewBox="0 0 320 300" aria-label="Füße von oben mit Unterstützungsfläche"></svg><div>
        ${regler('s-spur', 'Spurbreite', 0, 6, 1, 3)}${regler('s-ksx', 'KSP seitlich', -6, 6, 1, 0)}${regler('s-ksy', 'KSP vor / zurück', -6, 6, 1, 0)}
        <div class="reihe" style="margin-bottom:8px"><span>Stand:</span><div class="wahl"><button type="button" data-stand="2" aria-pressed="true">beide Beine</button><button type="button" data-stand="1" aria-pressed="false">nur rechts</button></div></div>
        <div class="befund"></div></div></div>`;
      const svg = el.querySelector('svg'), befund = el.querySelector('.befund');
      let stand = 2;
      const update = verbinde(el, ['s-spur', 's-ksx', 's-ksy'], (w) => {
        const halb = 26 + w['s-spur'] * 12;
        const fuss = (x) => ({ x0: x - 24, x1: x + 24, y0: 70, y1: 236 });
        const li = fuss(160 - halb), re = fuss(160 + halb);
        const fl = stand === 2 ? { x0: li.x0, x1: re.x1, y0: 70, y1: 236 } : re;
        const kx = 160 + w['s-ksx'] * 16, ky = 150 - w['s-ksy'] * 18;
        const drin = kx >= fl.x0 && kx <= fl.x1 && ky >= fl.y0 && ky <= fl.y1;
        const fussform = (f, aktiv) => `<path class="abb-koerper" style="opacity:${aktiv ? 1 : 0.35}" d="M${(f.x0 + f.x1) / 2},${f.y1} C${f.x0 - 2},${f.y1} ${f.x0},${f.y1 - 60} ${f.x0 + 2},${f.y0 + 50} C${f.x0 + 4},${f.y0 + 10} ${f.x1 - 4},${f.y0} ${f.x1},${f.y0 + 40} C${f.x1 + 2},${f.y1 - 60} ${f.x1},${f.y1} ${(f.x0 + f.x1) / 2},${f.y1} Z"/>`;
        svg.innerHTML = `${fussform(li, stand === 2)}${fussform(re, true)}
          <path class="abb-usf" d="M${fl.x0},${fl.y0} L${fl.x1},${fl.y0} L${fl.x1},${fl.y1} L${fl.x0},${fl.y1} Z"/>
          <circle cx="${kx}" cy="${ky}" r="11" fill="${drin ? 'var(--gut)' : 'var(--hinweis)'}" stroke="var(--karte)" stroke-width="3"/>
          <text class="abb-text" x="${kx + 16}" y="${ky + 4}">KSP</text>
          <text class="abb-text" x="10" y="290">vorne = oben · gestrichelt = Unterstützungsfläche</text>`;
        const z = [];
        z.push(drin ? `<b>KSP über der Unterstützungsfläche</b> – der Körper bleibt im Gleichgewicht.${q('H/12')}`
          : `<b>KSP außerhalb der Unterstützungsfläche</b> – das Gleichgewicht geht verloren: Equilibriumsreaktionen versuchen es zu halten, Stützreaktionen setzen die Extremitäten zur Unterstützung ein.${q('H/12')}`);
        if (stand === 1) z.push(`Einbeinbelastung: Die USF schrumpft auf einen Fuß – der Kopf sollte über dem belasteten Bein stehen.${q('E/6')}`);
        else if (w['s-spur'] === 3) z.push(`Spurbreite in der Norm: so breit wie der Hüftgelenkabstand.${q('F/2')}`);
        else z.push(`${w['s-spur'] > 3 ? '+ Spurbreite: Füße weiter auseinander als die Trochanterpunkte.' : '– Spurbreite: Füße enger als die Hüftgelenke.'}${q('E/1')}`);
        befund.className = 'befund ' + (drin ? 'norm' : 'abw');
        befund.innerHTML = `<ul>${z.map((s) => `<li>${s}</li>`).join('')}</ul>`;
      });
      el.querySelectorAll('[data-stand]').forEach((bt) => bt.addEventListener('click', () => { stand = Number(bt.dataset.stand); el.querySelectorAll('[data-stand]').forEach((x) => x.setAttribute('aria-pressed', x === bt)); update(); }));
    },
  },
];
