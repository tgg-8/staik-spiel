// aufgaben-ui.js – zeigt eine Aufgabe an, nimmt die Antwort entgegen und markiert das Ergebnis.
// Bedienung ist komplett auf Tippen ausgelegt (Finger oder Apple Pencil) – kein Ziehen nötig.
// Antwortmöglichkeiten werden bei jedem Aufruf neu gemischt, damit man keine Positionen lernt.

import { esc } from './formel.js';
import { mische } from './leitner.js';
import { pruefeMC, pruefeWahrFalsch, pruefeLuecke, pruefeZuordnen, pruefeReihenfolge, pruefeRechnen, pruefeAntippen, pruefeBeschriften } from './pruefen.js';
import { ABBILDUNGEN, abbildungSvg } from './abbildungen.js';

export const TYP_NAMEN = {
  mc: 'Multiple Choice', wahrfalsch: 'Wahr oder falsch – mit Begründung', luecke: 'Lückentext', zuordnen: 'Zuordnen',
  reihenfolge: 'Reihenfolge', rechnen: 'Rechnen', bild: 'Bildaufgabe',
};

const BUCHST = 'ABCDEFGH';

/** Zahl deutsch formatieren (Komma). */
export function zahlDe(z) {
  return String(z).replace('.', ',');
}

/** Lesbare Musterlösung einer Aufgabe (für Rückmeldung und Klausur-Durchsicht). */
export function loesungText(a) {
  switch (a.typ) {
    case 'mc': return a.optionen[a.richtig];
    case 'wahrfalsch': return `${a.wahr ? 'Wahr' : 'Falsch'} – ${a.begruendungen[a.richtigeBegruendung]}`;
    case 'luecke': { let i = 0; return a.text.replace(/\{\}/g, () => `„${a.loesungen[i++]}“`); }
    case 'zuordnen': return a.paare.map(([l, r]) => `${l} → ${r}`).join(' · ');
    case 'reihenfolge': return a.schritte.map((s, i) => `${i + 1}. ${s}`).join('  ');
    case 'rechnen': return `${zahlDe(a.ergebnis)}${a.einheit ? ' ' + a.einheit : ''}`;
    case 'bild': {
      const abb = ABBILDUNGEN[a.abbildung];
      if (a.modus === 'antippen') return a.ziele.map((z) => abb.punkte.find((p) => p.id === z).name).join(', ');
      return a.marken.map((m, i) => `${i + 1}: ${m.loesung}`).join(' · ');
    }
    default: return '';
  }
}

/** Text der Aufgabenstellung (bei Wahr/Falsch die Aussage). */
export function frageText(a) {
  return a.typ === 'wahrfalsch' ? `„${a.aussage}“` : a.frage;
}

/**
 * Baut eine Aufgabe in `wurzel` auf.
 * @param {HTMLElement} wurzel
 * @param {object} a  Aufgabe aus inhalt.json
 * @param {{ onAenderung?: Function, zustand?: object, gesperrt?: boolean }} opt
 * @returns {{ bereit:()=>boolean, pruefe:()=>object, zustand:()=>object, mitLoesung:()=>boolean }}
 */
export function baueAufgabe(wurzel, a, opt = {}) {
  const melde = () => opt.onAenderung && opt.onAenderung();
  const bauer = { mc: baueMC, wahrfalsch: baueWF, luecke: baueLuecke, zuordnen: baueZuordnen, reihenfolge: baueReihenfolge, rechnen: baueRechnen, bild: baueBild }[a.typ];
  wurzel.innerHTML = `
    <div class="aufgabe-typ">${esc(TYP_NAMEN[a.typ] || '')}</div>
    <h2 class="frage" id="frage-${a.id}">${esc(frageText(a))}</h2>
    <div class="aufgabe-koerper"></div>`;
  const koerper = wurzel.querySelector('.aufgabe-koerper');
  return bauer(koerper, a, melde, opt.zustand || null, opt);
}

/* ---------------- Multiple Choice ---------------- */
function baueMC(el, a, melde, z) {
  const reihenfolge = z?.reihenfolge || mische(a.optionen.map((_, i) => i));
  let wahl = z?.wahl ?? null;
  el.innerHTML = `<div class="optionen" role="radiogroup">${reihenfolge.map((orig, i) => `
    <button class="option" type="button" role="radio" data-orig="${orig}" aria-pressed="${wahl === orig}" aria-checked="${wahl === orig}">
      <span class="buchst">${BUCHST[i]}</span><span>${esc(a.optionen[orig])}</span></button>`).join('')}</div>`;
  el.addEventListener('click', (e) => {
    const b = e.target.closest('.option');
    if (!b || b.disabled) return;
    wahl = Number(b.dataset.orig);
    el.querySelectorAll('.option').forEach((o) => { const an = o === b; o.setAttribute('aria-pressed', an); o.setAttribute('aria-checked', an); });
    melde();
  });
  return {
    bereit: () => wahl !== null,
    zustand: () => ({ reihenfolge, wahl }),
    mitLoesung: () => false,
    pruefe() {
      const richtig = pruefeMC(a, wahl);
      el.querySelectorAll('.option').forEach((o) => {
        o.disabled = true;
        const orig = Number(o.dataset.orig);
        if (orig === a.richtig) o.classList.add('richtig');
        else if (orig === wahl) o.classList.add('falsch');
      });
      return { richtig };
    },
  };
}

/* ---------------- Wahr / Falsch mit Begründung ---------------- */
function baueWF(el, a, melde, z) {
  const reihenfolge = z?.reihenfolge || mische(a.begruendungen.map((_, i) => i));
  let wf = z?.wf ?? null, begr = z?.begr ?? null;
  el.innerHTML = `
    <div class="wf" role="radiogroup" aria-label="Wahr oder falsch">
      <button class="option" type="button" data-wf="true" aria-pressed="${wf === true}">Wahr</button>
      <button class="option" type="button" data-wf="false" aria-pressed="${wf === false}">Falsch</button>
    </div>
    <p class="unterfrage">Begründung – warum?</p>
    <div class="optionen" role="radiogroup">${reihenfolge.map((orig, i) => `
      <button class="option" type="button" data-begr="${orig}" aria-pressed="${begr === orig}"><span class="buchst">${BUCHST[i]}</span><span>${esc(a.begruendungen[orig])}</span></button>`).join('')}</div>`;
  el.addEventListener('click', (e) => {
    const b = e.target.closest('.option');
    if (!b || b.disabled) return;
    if (b.dataset.wf) { wf = b.dataset.wf === 'true'; el.querySelectorAll('[data-wf]').forEach((o) => o.setAttribute('aria-pressed', o === b)); }
    else { begr = Number(b.dataset.begr); el.querySelectorAll('[data-begr]').forEach((o) => o.setAttribute('aria-pressed', o === b)); }
    melde();
  });
  return {
    bereit: () => wf !== null && begr !== null,
    zustand: () => ({ reihenfolge, wf, begr }),
    mitLoesung: () => false,
    pruefe() {
      const erg = pruefeWahrFalsch(a, wf, begr);
      el.querySelectorAll('.option').forEach((o) => {
        o.disabled = true;
        if (o.dataset.wf) { const w = o.dataset.wf === 'true'; if (w === a.wahr) o.classList.add('richtig'); else if (w === wf) o.classList.add('falsch'); }
        else { const n = Number(o.dataset.begr); if (n === a.richtigeBegruendung) o.classList.add('richtig'); else if (n === begr) o.classList.add('falsch'); }
      });
      return erg;
    },
  };
}

/* ---------------- Lückentext (Wortbank zum Antippen) ---------------- */
function baueLuecke(el, a, melde, z) {
  const woerter = z?.woerter || mische([...a.loesungen, ...a.ablenker]);
  const belegt = z?.belegt || a.loesungen.map(() => null); // Lücke → Index in woerter
  let aktiv = belegt.findIndex((b) => b === null);
  let n = 0;
  const textHtml = esc(a.text).replace(/\{\}/g, () => { const i = n++; return `<button type="button" class="luecke" data-luecke="${i}" aria-label="Lücke ${i + 1}"></button>`; });
  el.innerHTML = `<p class="lueckentext">${textHtml}</p>
    <p class="klein">Tippe ein Wort an – es landet in der markierten Lücke. Tippe eine gefüllte Lücke an, um sie zu leeren.</p>
    <div class="wortbank">${woerter.map((w, i) => `<button type="button" class="wort" data-wort="${i}">${esc(w)}</button>`).join('')}</div>`;
  const zeichne = () => {
    el.querySelectorAll('.luecke').forEach((l) => {
      const i = Number(l.dataset.luecke);
      l.textContent = belegt[i] !== null ? woerter[belegt[i]] : '';
      l.classList.toggle('gefuellt', belegt[i] !== null);
      l.classList.toggle('aktiv', i === aktiv);
    });
    el.querySelectorAll('.wort').forEach((w) => { w.disabled = belegt.includes(Number(w.dataset.wort)); });
  };
  zeichne();
  el.addEventListener('click', (e) => {
    const l = e.target.closest('.luecke');
    const w = e.target.closest('.wort');
    if (l && !l.classList.contains('fertig')) {
      const i = Number(l.dataset.luecke);
      if (belegt[i] !== null) belegt[i] = null;
      aktiv = i;
    } else if (w && !w.disabled) {
      if (aktiv < 0 || belegt[aktiv] !== null) aktiv = belegt.findIndex((b) => b === null);
      if (aktiv < 0) return;
      belegt[aktiv] = Number(w.dataset.wort);
      aktiv = belegt.findIndex((b) => b === null);
    } else return;
    zeichne(); melde();
  });
  return {
    bereit: () => belegt.every((b) => b !== null),
    zustand: () => ({ woerter, belegt }),
    mitLoesung: () => false,
    pruefe() {
      const erg = pruefeLuecke(a, belegt.map((b) => (b === null ? null : woerter[b])));
      el.querySelectorAll('.luecke').forEach((l, i) => { l.classList.add('fertig', erg.proLuecke[i] ? 'richtig' : 'falsch'); l.classList.remove('aktiv'); l.disabled = true; });
      el.querySelectorAll('.wort').forEach((w) => { w.disabled = true; });
      return erg;
    },
  };
}

/* ---------------- Zuordnen (links antippen, dann rechts) ---------------- */
function baueZuordnenAllgemein(el, links, rechtsListe, melde, z, linksAnzeige = (t) => esc(t), festeNummern = false) {
  // festeNummern: linke Seite bleibt in Originalreihenfolge und zeigt immer ihre Nummer (für Bild-Marken).
  const rechts = z?.rechts || mische(rechtsListe);
  const linksOrd = z?.links || (festeNummern ? links.slice() : mische(links));
  const paare = z?.paare || {}; // linksText → rechtsText
  let gewaehlt = null; // {seite, text}
  el.innerHTML = `<div class="zuordnen">
    <div class="spalte" data-seite="l">${linksOrd.map((t) => `<button type="button" class="option" data-l="${esc(t)}"><span class="paar-nr"></span><span>${linksAnzeige(t)}</span></button>`).join('')}</div>
    <div class="spalte" data-seite="r">${rechts.map((t) => `<button type="button" class="option" data-r="${esc(t)}"><span class="paar-nr"></span><span>${esc(t)}</span></button>`).join('')}</div>
  </div><p class="klein" style="margin-top:10px">Tippe links einen Begriff und dann rechts das Passende an. Nochmal tippen löst das Paar.</p>`;
  const btnL = (t) => [...el.querySelectorAll('[data-l]')].find((b) => b.dataset.l === t);
  const btnR = (t) => [...el.querySelectorAll('[data-r]')].find((b) => b.dataset.r === t);
  const zeichne = () => {
    el.querySelectorAll('.option').forEach((b) => { b.className = 'option'; b.querySelector('.paar-nr').textContent = ''; });
    if (festeNummern) linksOrd.forEach((l, i) => { btnL(l).querySelector('.paar-nr').textContent = i + 1; });
    linksOrd.forEach((l, i) => {
      if (!paare[l]) return;
      const nr = (i % 6) + 1;
      for (const b of [btnL(l), btnR(paare[l])]) { b.classList.add('gepaart', `paar-${nr}`); b.querySelector('.paar-nr').textContent = i + 1; }
    });
    if (gewaehlt) (gewaehlt.seite === 'l' ? btnL(gewaehlt.text) : btnR(gewaehlt.text)).classList.add('gewaehlt');
  };
  const entferne = (text, seite) => {
    if (seite === 'l') delete paare[text];
    else for (const l of Object.keys(paare)) if (paare[l] === text) delete paare[l];
  };
  zeichne();
  el.addEventListener('click', (e) => {
    const b = e.target.closest('.option');
    if (!b || b.disabled) return;
    const seite = b.dataset.l !== undefined ? 'l' : 'r';
    const text = seite === 'l' ? b.dataset.l : b.dataset.r;
    const schonGepaart = seite === 'l' ? !!paare[text] : Object.values(paare).includes(text);
    if (gewaehlt && gewaehlt.seite !== seite) {
      const l = seite === 'l' ? text : gewaehlt.text;
      const r = seite === 'r' ? text : gewaehlt.text;
      entferne(l, 'l'); entferne(r, 'r');
      paare[l] = r; gewaehlt = null;
    } else if (schonGepaart && !gewaehlt) {
      entferne(text, seite);
    } else {
      gewaehlt = gewaehlt && gewaehlt.text === text ? null : { seite, text };
    }
    zeichne(); melde();
  });
  return {
    bereit: () => Object.keys(paare).length === links.length,
    zustand: () => ({ rechts, links: linksOrd, paare: { ...paare } }),
    paare: () => paare,
    markiere(proLinks) {
      el.querySelectorAll('.option').forEach((b) => { b.disabled = true; });
      linksOrd.forEach((l) => {
        const ok = proLinks[l];
        btnL(l).classList.add(ok ? 'richtig' : 'falsch');
        if (paare[l]) btnR(paare[l]).classList.add(ok ? 'richtig' : 'falsch');
      });
    },
  };
}

function baueZuordnen(el, a, melde, z) {
  const ui = baueZuordnenAllgemein(el, a.paare.map((p) => p[0]), a.paare.map((p) => p[1]), melde, z);
  return {
    bereit: ui.bereit, zustand: ui.zustand, mitLoesung: () => false,
    pruefe() {
      const erg = pruefeZuordnen(a, ui.paare());
      const pro = {}; a.paare.forEach(([l], i) => { pro[l] = erg.proPaar[i]; });
      ui.markiere(pro);
      return erg;
    },
  };
}

/* ---------------- Reihenfolge (antippen in der richtigen Folge) ---------------- */
function baueReihenfolge(el, a, melde, z) {
  const vorrat = z?.vorrat || mische(a.schritte);
  const gewaehlt = z?.gewaehlt || [];
  el.innerHTML = `<div class="reihenfolge">
      <div><h4>Zur Auswahl</h4><ol class="vorrat"></ol></div>
      <div><h4>Deine Reihenfolge</h4><ol class="auswahl"></ol></div>
    </div><p class="klein" style="margin-top:10px">Tippe die Schritte in der richtigen Reihenfolge an. Tippe rechts einen Schritt an, um ihn zurückzulegen.</p>`;
  const zeichne = () => {
    const rest = vorrat.filter((s) => !gewaehlt.includes(s));
    el.querySelector('.vorrat').innerHTML = rest.length
      ? rest.map((s) => `<li><button type="button" class="option" data-s="${esc(s)}"><span>${esc(s)}</span></button></li>`).join('')
      : '<li class="leer">Alles einsortiert ✓</li>';
    el.querySelector('.auswahl').innerHTML = gewaehlt.length
      ? gewaehlt.map((s, i) => `<li><button type="button" class="option gepaart paar-${(i % 6) + 1}" data-zurueck="${esc(s)}"><span class="paar-nr">${i + 1}</span><span>${esc(s)}</span></button></li>`).join('')
      : '<li class="leer">Noch leer – tippe links den ersten Schritt an.</li>';
  };
  zeichne();
  el.addEventListener('click', (e) => {
    const b = e.target.closest('.option');
    if (!b || b.disabled) return;
    if (b.dataset.s !== undefined) gewaehlt.push(b.dataset.s);
    else if (b.dataset.zurueck !== undefined) gewaehlt.splice(gewaehlt.indexOf(b.dataset.zurueck), 1);
    zeichne(); melde();
  });
  return {
    bereit: () => gewaehlt.length === a.schritte.length,
    zustand: () => ({ vorrat, gewaehlt: gewaehlt.slice() }),
    mitLoesung: () => false,
    pruefe() {
      const erg = pruefeReihenfolge(a, gewaehlt);
      el.querySelectorAll('.auswahl .option').forEach((b, i) => { b.disabled = true; b.classList.add(erg.proPlatz[i] ? 'richtig' : 'falsch'); });
      return erg;
    },
  };
}

/* ---------------- Rechnen (Eingabe + Einheit + gestufte Hilfe) ---------------- */
function baueRechnen(el, a, melde, z, opt = {}) {
  const ohneHilfen = !!opt.ohneHilfen; // Klausur: keine Hinweise, Lösungsweg erst nach der Abgabe
  let einheit = z?.einheit || '';
  let hilfe = z?.hilfe || 0; // Anzahl gezeigter Hinweise
  let loesung = z?.loesung || false;
  let loesungVorDemPruefen = null; // merkt sich, ob der Lösungsweg schon VOR dem Prüfen offen war
  const einheiten = z?.einheitenOrd || mische(a.einheiten || []);
  el.innerHTML = `
    <div class="rechnen-feld">
      <input class="zahl-eingabe" type="text" inputmode="decimal" autocomplete="off" autocorrect="off" spellcheck="false"
        aria-label="Dein Ergebnis" placeholder="Ergebnis" value="${esc(z?.text || '')}">
      ${einheiten.length ? `<div class="einheiten" role="radiogroup" aria-label="Einheit">${einheiten.map((u) => `<button type="button" class="wort" data-einheit="${esc(u)}" aria-pressed="${u === einheit}">${esc(u)}</button>`).join('')}</div>` : '<span class="klein">(ohne Einheit)</span>'}
    </div>
    <p class="klein">Komma oder Punkt sind beide in Ordnung. Kleine Rundungsunterschiede werden akzeptiert.</p>
    <div class="hilfen"></div>
    ${ohneHilfen ? '' : `<div class="reihe" style="margin-top:10px">
      <button type="button" class="knopf zweit" data-hilfe>💡 Hinweis</button>
      <button type="button" class="knopf still" data-loesung>Lösungsweg zeigen</button>
    </div>`}`;
  const eingabe = el.querySelector('.zahl-eingabe');
  const hilfen = el.querySelector('.hilfen');
  const zeichneHilfen = () => {
    hilfen.innerHTML = a.hinweise.slice(0, hilfe).map((h, i) => `<div class="hilfe-schritt"><b>Hinweis ${i + 1}:</b> ${esc(h)}</div>`).join('') +
      (loesung ? `<div class="hilfe-schritt loesung"><b>Lösungsweg</b><ol>${a.loesungsweg.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>` : '');
    const hb = el.querySelector('[data-hilfe]');
    const lb = el.querySelector('[data-loesung]');
    if (hb) {
      hb.disabled = hilfe >= a.hinweise.length || loesung;
      hb.textContent = hilfe === 0 ? '💡 Hinweis' : hilfe < a.hinweise.length ? '💡 Nächster Hinweis' : '💡 Keine weiteren Hinweise';
    }
    if (lb) lb.disabled = loesung;
  };
  zeichneHilfen();
  eingabe.addEventListener('input', melde);
  eingabe.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); eingabe.blur(); el.dispatchEvent(new CustomEvent('enter', { bubbles: true })); } });
  el.addEventListener('click', (e) => {
    const u = e.target.closest('[data-einheit]');
    if (u && !u.disabled) { einheit = u.dataset.einheit; el.querySelectorAll('[data-einheit]').forEach((b) => b.setAttribute('aria-pressed', b === u)); melde(); }
    if (e.target.closest('[data-hilfe]')) { hilfe = Math.min(a.hinweise.length, hilfe + 1); zeichneHilfen(); }
    if (e.target.closest('[data-loesung]')) { loesung = true; hilfe = a.hinweise.length; zeichneHilfen(); }
  });
  return {
    bereit: () => eingabe.value.trim() !== '',
    zustand: () => ({ text: eingabe.value, einheit, hilfe, loesung, einheitenOrd: einheiten }),
    mitLoesung: () => (loesungVorDemPruefen ?? loesung),
    pruefe() {
      loesungVorDemPruefen = loesung;
      const erg = pruefeRechnen(a, eingabe.value, einheit);
      eingabe.disabled = true;
      eingabe.style.borderColor = erg.richtig ? 'var(--gut)' : 'var(--hinweis)';
      el.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      el.querySelectorAll('[data-einheit]').forEach((b) => { if (b.dataset.einheit === a.einheit) b.classList.add('richtig'); });
      if (!loesung) { loesung = true; hilfe = a.hinweise.length; zeichneHilfen(); el.querySelectorAll('button').forEach((b) => { b.disabled = true; }); }
      return erg;
    },
  };
}

/* ---------------- Bildaufgaben ---------------- */
function baueBild(el, a, melde, z) {
  const abb = ABBILDUNGEN[a.abbildung];
  if (a.modus === 'antippen') {
    const wahl = new Set(z?.wahl || []);
    el.innerHTML = `<div class="bild-aufgabe nur-bild"><div class="bild-rahmen">${abbildungSvg(a.abbildung, { punkteZeigen: true })}</div></div>
      <p class="klein">Tippe die passenden Punkte an (nochmal tippen hebt die Auswahl auf). Ausgewählt: <b class="anzahl">${wahl.size}</b></p>`;
    const markiereWahl = () => {
      el.querySelectorAll('.abb-punkt').forEach((p) => p.classList.toggle('an', wahl.has(p.dataset.id)));
      el.querySelector('.anzahl').textContent = wahl.size;
    };
    markiereWahl();
    const tippe = (e) => {
      const p = e.target.closest('.abb-punkt');
      if (!p || el.dataset.fertig) return;
      const id = p.dataset.id;
      if (wahl.has(id)) wahl.delete(id); else wahl.add(id);
      markiereWahl(); melde();
    };
    el.addEventListener('click', tippe);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tippe(e); } });
    return {
      bereit: () => wahl.size > 0,
      zustand: () => ({ wahl: [...wahl] }),
      mitLoesung: () => false,
      pruefe() {
        const erg = pruefeAntippen(a, [...wahl]);
        el.dataset.fertig = '1';
        el.querySelector('.bild-rahmen').innerHTML = abbildungSvg(a.abbildung, { punkteZeigen: true, loesung: true });
        // Relevante Punkte nummerieren und darunter als Legende erklären.
        const legende = [];
        el.querySelectorAll('.abb-punkt').forEach((p) => {
          const id = p.dataset.id;
          const ziel = a.ziele.includes(id);
          let status = null;
          if (ziel && wahl.has(id)) { p.classList.add('ok'); status = '✓ richtig angetippt'; }
          else if (ziel) { p.classList.add('fehlte'); status = '○ hat gefehlt'; }
          else if (wahl.has(id)) { p.classList.add('zuviel'); status = '✗ gehört nicht dazu'; }
          if (status) {
            const pt = abb.punkte.find((q) => q.id === id);
            const nr = legende.length + 1;
            p.insertAdjacentHTML('beforeend', `<text class="abb-name" x="${pt.x + 13}" y="${pt.y - 11}">${nr}</text>`);
            legende.push(`<li><b>${nr}</b> ${esc(pt.name)} – <span class="klein">${status}</span></li>`);
          }
        });
        el.querySelector('.bild-aufgabe').insertAdjacentHTML('beforeend', `<ol class="legende" style="list-style:none;padding:0;margin:8px 0 0">${legende.join('')}</ol>`);
        return erg;
      },
    };
  }
  // Modus „beschriften“: nummerierte Marken → Beschriftungen zuordnen
  el.innerHTML = `<div class="bild-aufgabe"><div class="bild-rahmen">${abbildungSvg(a.abbildung, { markenZeigen: true })}</div><div class="zuordnung-teil"></div></div>`;
  const nummern = a.marken.map((m, i) => `Marke ${i + 1}`);
  const ui = baueZuordnenAllgemein(el.querySelector('.zuordnung-teil'), nummern, a.marken.map((m) => m.loesung), melde, z,
    () => '<span class="unsichtbar">Marke</span>', true);
  el.querySelector('.zuordnen').style.gridTemplateColumns = 'auto 1fr';
  return {
    bereit: ui.bereit, zustand: ui.zustand, mitLoesung: () => false,
    pruefe() {
      const paare = ui.paare();
      const zuordnung = {}; a.marken.forEach((m, i) => { zuordnung[m.id] = paare[`Marke ${i + 1}`]; });
      const erg = pruefeBeschriften(a, zuordnung);
      const pro = {}; a.marken.forEach((m, i) => { pro[`Marke ${i + 1}`] = erg.proMarke[i]; });
      ui.markiere(pro);
      el.querySelector('.bild-rahmen').innerHTML = abbildungSvg(a.abbildung, { markenZeigen: true, loesung: true });
      return erg;
    },
  };
}
