// Tests für das Kornfeld (Wachstum durch Lernen, Ernte, Belohnung).
import test from 'node:test';
import assert from 'node:assert/strict';
import { neuesFeld, wachse, ernte, anzahlReif, istVoll, pruefeFeld, ernteBelohnung, REIF } from '../js/feld.js';

test('Feld: erste richtige Antwort sät, nach 4 richtigen ist das erste Korn reif', () => {
  let f = neuesFeld();
  let r = wachse(f); f = r.feld;
  assert.deepEqual(f.pflanzen, [1, 0, 0, 0, 0, 0]);
  assert.equal(r.gesaet, 0);
  r = wachse(f); f = r.feld;
  assert.deepEqual(f.pflanzen, [2, 1, 0, 0, 0, 0]);
  r = wachse(f); f = r.feld;
  r = wachse(f); f = r.feld;
  assert.deepEqual(f.pflanzen, [4, 3, 2, 1, 0, 0]);
  assert.deepEqual(r.neuReif, [0]);
  assert.equal(anzahlReif(f), 1);
});

test('Feld: volles Beet wächst nur noch nach, bis es voll reif ist', () => {
  let f = neuesFeld();
  for (let i = 0; i < 9; i++) f = wachse(f).feld;
  assert.equal(istVoll(f), true);
  const vorher = JSON.stringify(f);
  const r = wachse(f);
  assert.equal(JSON.stringify(r.feld), vorher);
  assert.equal(r.gesaet, null);
  assert.deepEqual(r.gewachsen, []);
});

test('Feld: Ernte leert nur reife Plätze und zählt mit', () => {
  let f = neuesFeld();
  for (let i = 0; i < 6; i++) f = wachse(f).feld; // [4,4,4,3,2,1]
  const e = ernte(f);
  assert.equal(e.anzahl, 3);
  assert.deepEqual(e.indizes, [0, 1, 2]);
  assert.deepEqual(e.feld.pflanzen, [0, 0, 0, 3, 2, 1]);
  assert.equal(e.feld.geerntet, 3);
  assert.equal(ernte(e.feld).anzahl, 0);
});

test('Feld: kaputte oder alte Daten werden repariert', () => {
  assert.deepEqual(pruefeFeld(undefined).pflanzen, [0, 0, 0, 0, 0, 0]);
  assert.deepEqual(pruefeFeld({ pflanzen: [9, -1, 'x', 2] }).pflanzen, [0, 0, 0, 2, 0, 0]);
  assert.equal(REIF, 4);
});

test('Feld: Ernte-Belohnung', () => {
  assert.deepEqual(ernteBelohnung(3, { muenzenProKorn: 5, xpProKorn: 2 }), { muenzen: 15, xp: 6, korn: 3 });
});

test('Speicher: Spielstand Version 1 wird ohne Verlust auf Version 2 migriert', async () => {
  const { vervollstaendige } = await import('../js/speicher.js');
  const alt = { version: 1, karten: { g01: { box: 3, due: '2026-11-25' } }, xp: 120, muenzen: 55, gebaut: { konstitution: true }, deko: { bank: true }, serie: { tage: 3 }, auftraege: [], statistik: { ernten: 4, auftraege: 1, antworten: 30, richtig: 22, klausuren: [] }, begruesst: true, einstellungen: { ton: false, animationen: true, design: 'dark', ernteAufgaben: 7, klausurMinuten: 45, klausurFragen: 25 } };
  const neu = vervollstaendige(alt, {});
  assert.equal(neu.version, 2);
  assert.deepEqual(neu.karten, alt.karten);
  assert.equal(neu.xp, 120); assert.equal(neu.muenzen, 55);
  assert.deepEqual(neu.gebaut, { konstitution: true });
  assert.deepEqual(neu.felder, {}); assert.equal(neu.korn, 0);
  assert.equal(neu.einstellungen.ton, false); assert.equal(neu.einstellungen.ernteAufgaben, 7);
  assert.equal(neu.einstellungen.tiere, true);
  assert.equal(neu.statistik.ernten, 4);
});
