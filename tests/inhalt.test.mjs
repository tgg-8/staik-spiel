// Prüft inhalt.json: Aufbau, Quellenangaben und – ganz wichtig – rechnet jede
// Rechenaufgabe unabhängig nach. Start: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ABBILDUNGEN } from '../js/abbildungen.js';

const inhalt = JSON.parse(readFileSync(new URL('../inhalt.json', import.meta.url), 'utf8'));
const alleAufgaben = inhalt.bloecke.flatMap((b) => b.aufgaben.map((a) => ({ ...a, block: b.id })));

/** "D/3, I/7" → [["D",3],["I",7]] */
function quellen(text) {
  return String(text).split(',').map((t) => t.trim()).map((t) => {
    const m = t.match(/^([A-Z])\/(\d+)$/);
    return m ? [m[1], Number(m[2])] : [null, null];
  });
}

function pruefeQuelle(text, wo) {
  for (const [k, s] of quellen(text)) {
    assert.ok(k, `${wo}: Quelle „${text}“ hat nicht das Format Kürzel/Seite`);
    assert.ok(inhalt.quellen[k], `${wo}: unbekanntes Quellenkürzel ${k}`);
    assert.ok(s >= 1 && s <= inhalt.quellen[k].seiten, `${wo}: Seite ${s} gibt es in ${k} nicht`);
  }
}

test('Grundaufbau und eindeutige IDs', () => {
  assert.ok(inhalt.meta && inhalt.einstellungen && Array.isArray(inhalt.bloecke));
  const ids = alleAufgaben.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length, 'Aufgaben-IDs doppelt');
  const blockIds = inhalt.bloecke.map((b) => b.id);
  for (const b of inhalt.bloecke) {
    for (const v of b.vorstufen) assert.ok(blockIds.includes(v), `${b.id}: Vorstufe ${v} fehlt`);
    assert.ok(b.aufgaben.length >= 5, `${b.id}: zu wenige Aufgaben für eine Ernte`);
  }
});

test('Jede Aufgabe und jeder Inventareintrag hat eine gültige Quelle', () => {
  for (const a of alleAufgaben) pruefeQuelle(a.quelle, a.id);
  for (const b of inhalt.bloecke) {
    for (const teil of ['begriffe', 'formeln', 'merksaetze', 'abbildungen', 'beispielaufgaben']) {
      for (const e of b.inventar[teil] || []) pruefeQuelle(e.quelle, `${b.id}.${teil}`);
    }
  }
});

test('Aufgabentypen sind vollständig und in sich stimmig', () => {
  for (const a of alleAufgaben) {
    assert.ok(a.erklaerung, `${a.id}: Erklärung fehlt`);
    switch (a.typ) {
      case 'mc':
        assert.ok(a.optionen.length >= 3, a.id);
        assert.ok(a.richtig >= 0 && a.richtig < a.optionen.length, a.id);
        assert.equal(new Set(a.optionen).size, a.optionen.length, `${a.id}: doppelte Option`);
        break;
      case 'wahrfalsch':
        assert.equal(typeof a.wahr, 'boolean', a.id);
        assert.ok(a.richtigeBegruendung < a.begruendungen.length, a.id);
        break;
      case 'luecke':
        assert.equal((a.text.match(/\{\}/g) || []).length, a.loesungen.length, `${a.id}: Lückenzahl passt nicht`);
        for (const d of a.ablenker) assert.ok(!a.loesungen.includes(d), `${a.id}: Ablenker ist zugleich Lösung`);
        break;
      case 'zuordnen': {
        assert.ok(a.paare.length >= 2, a.id);
        assert.equal(new Set(a.paare.map((p) => p[0])).size, a.paare.length, `${a.id}: linke Seite doppelt`);
        assert.equal(new Set(a.paare.map((p) => p[1])).size, a.paare.length, `${a.id}: rechte Seite doppelt`);
        break;
      }
      case 'reihenfolge':
        assert.ok(a.schritte.length >= 3, a.id);
        assert.equal(new Set(a.schritte).size, a.schritte.length, `${a.id}: Schritt doppelt`);
        break;
      case 'rechnen':
        assert.equal(typeof a.ergebnis, 'number', a.id);
        assert.ok(a.hinweise.length >= 1 && a.loesungsweg.length >= 1, a.id);
        if (a.einheit) assert.ok(a.einheiten.includes(a.einheit), `${a.id}: richtige Einheit nicht wählbar`);
        assert.ok(a.pruefung && a.pruefung.formel, `${a.id}: Nachrechnung fehlt`);
        break;
      case 'bild': {
        const abb = ABBILDUNGEN[a.abbildung];
        assert.ok(abb, `${a.id}: Abbildung ${a.abbildung} fehlt`);
        if (a.modus === 'antippen') for (const z of a.ziele) assert.ok(abb.punkte.some((p) => p.id === z), `${a.id}: Zielpunkt ${z} fehlt in der Abbildung`);
        else for (const m of a.marken) assert.ok(abb.marken.some((p) => p.id === m.id), `${a.id}: Marke ${m.id} fehlt`);
        break;
      }
      default:
        assert.fail(`${a.id}: unbekannter Typ ${a.typ}`);
    }
  }
});

/** Unabhängige Nachrechnung jeder Formel. */
const FORMELN = {
  bmi: ({ kg, m }) => kg / (m * m),
  bai: ({ cm, m }) => cm / Math.pow(m, 1.5) - 18,
  anteil: ({ gesamt, zaehler, nenner }) => (gesamt * zaehler) / nenner,
  verhaeltnis: ({ a, b }) => a / b,
  differenz: ({ a, b }) => a - b,
  faseranteil: ({ ft, st, ftPlus, stPlus }) => { const f = ft * (1 + ftPlus / 100); const s = st * (1 + stPlus / 100); return (f / (f + s)) * 100; },
  faseranteilST: ({ ft, st, ftPlus, stPlus }) => { const f = ft * (1 + ftPlus / 100); const s = st * (1 + stPlus / 100); return (s / (f + s)) * 100; },
};

test('Alle Rechenaufgaben sind korrekt nachgerechnet', () => {
  const rechnen = alleAufgaben.filter((a) => a.typ === 'rechnen');
  assert.ok(rechnen.length >= 10);
  for (const a of rechnen) {
    const f = FORMELN[a.pruefung.formel];
    assert.ok(f, `${a.id}: unbekannte Formel ${a.pruefung.formel}`);
    const exakt = f(a.pruefung.werte);
    assert.ok(Math.abs(exakt - a.ergebnis) <= a.toleranz, `${a.id}: Ergebnis ${a.ergebnis} weicht von ${exakt.toFixed(4)} ab`);
  }
});

test('Beispiele aus dem Material stimmen (BMI 23,2; BAI 19 %; Fasern 57/43 %; Längen 176 cm)', () => {
  assert.equal(FORMELN.bmi({ kg: 71, m: 1.75 }).toFixed(1), '23.2');
  assert.equal(Math.round(FORMELN.bai({ cm: 86, m: 1.75 })), 19);
  assert.equal(FORMELN.bai({ cm: 90, m: 1.8 }).toFixed(2), '19.27');
  assert.equal(Math.round(FORMELN.faseranteil({ ft: 40, st: 60, ftPlus: 200, stPlus: 50 })), 57);
  assert.equal(FORMELN.anteil({ gesamt: 88, zaehler: 2, nenner: 5 }).toFixed(1), '35.2');
  assert.equal(FORMELN.anteil({ gesamt: 88, zaehler: 1, nenner: 5 }).toFixed(1), '17.6');
});
