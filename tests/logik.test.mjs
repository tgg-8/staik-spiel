// Tests für die reine Lern- und Spiellogik. Start: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { plusTage, tageZwischen, isoWoche, heute } from '../js/datum.js';
import { beantworte, istFaellig, kartenStufe, blockStufe, anteilGeerntet, waehleErnte, zaehle } from '../js/leitner.js';
import { leseZahl, pruefeRechnen, pruefeLuecke, pruefeZuordnen, pruefeReihenfolge, pruefeAntippen, pruefeWahrFalsch, pruefeBeschriften } from '../js/pruefen.js';
import { levelAusXp, gebaeudeStatus, aktualisiereSerie, serieAnzeige, belohnung, waehleKlausur, werteKlausurAus, erzeugeAuftrag, kaufeGebaeude } from '../js/spiel.js';

const I = [0, 1, 3, 7, 14];

test('Datum: Tage addieren über Monats- und Jahresgrenzen', () => {
  assert.equal(plusTage('2026-12-31', 1), '2027-01-01');
  assert.equal(plusTage('2024-02-28', 1), '2024-02-29');
  assert.equal(plusTage('2026-03-28', 3), '2026-03-31'); // Sommerzeit-Wechsel egal
  assert.equal(tageZwischen('2026-11-20', '2026-11-22'), 2);
  assert.equal(heute(new Date(2026, 10, 22, 23, 59)), '2026-11-22');
});

test('Datum: ISO-Kalenderwoche', () => {
  assert.equal(isoWoche('2026-11-22'), '2026-W47'); // Sonntag
  assert.equal(isoWoche('2026-11-23'), '2026-W48'); // Montag
  assert.equal(isoWoche('2027-01-01'), '2026-W53');
  assert.equal(isoWoche('2021-01-04'), '2021-W01');
});

test('Leitner: neue Karte richtig → Fach 2, morgen fällig', () => {
  const k = beantworte(undefined, true, '2026-11-22', I);
  assert.equal(k.box, 2);
  assert.equal(k.due, '2026-11-23');
  assert.equal(istFaellig(k, '2026-11-22'), false);
  assert.equal(istFaellig(k, '2026-11-23'), true);
});

test('Leitner: falsch → Fach 1, heute noch einmal', () => {
  let k = beantworte(undefined, true, '2026-11-01', I);
  k = beantworte(k, true, '2026-11-02', I); // Fach 3
  k = beantworte(k, false, '2026-11-05', I);
  assert.equal(k.box, 1);
  assert.equal(k.due, '2026-11-05');
  assert.equal(istFaellig(k, '2026-11-05'), true);
  assert.equal(k.f, 1);
});

test('Leitner: Intervalle 1 → 3 → 7 → 14 Tage, dann Gold', () => {
  let k = beantworte(undefined, true, '2026-01-01', I); // Fach 2, +1
  assert.equal(k.due, '2026-01-02');
  k = beantworte(k, true, '2026-01-02', I); // Fach 3, +3
  assert.equal(k.due, '2026-01-05');
  k = beantworte(k, true, '2026-01-05', I); // Fach 4, +7
  assert.equal(k.due, '2026-01-12');
  k = beantworte(k, true, '2026-01-12', I); // Fach 5, +14
  assert.equal(k.box, 5);
  assert.equal(k.due, '2026-01-26');
  assert.equal(kartenStufe(k), 4);
  k = beantworte(k, true, '2026-01-26', I);
  assert.equal(k.gold, true);
  assert.equal(kartenStufe(k), 5);
});

test('Leitner: Üben einer nicht fälligen Karte schiebt nicht vor', () => {
  let k = beantworte(undefined, true, '2026-11-22', I); // Fach 2, fällig morgen
  const vorher = k.box;
  k = beantworte(k, true, '2026-11-22', I); // gleich nochmal → Übung
  assert.equal(k.box, vorher);
  assert.equal(k.r, 2);
  k = beantworte(k, false, '2026-11-22', I); // Fehler beim Üben zählt aber
  assert.equal(k.box, 1);
});

test('Leitner: Blockstufe ist der abgerundete Durchschnitt', () => {
  const karten = { a: { box: 3 }, b: { box: 3 }, c: { box: 2 }, d: { box: 0 } };
  // Stufen 2,2,1,0 → Schnitt 1,25 → Stufe 1
  const s = blockStufe(['a', 'b', 'c', 'd'], karten);
  assert.equal(s.stufe, 1);
  assert.ok(Math.abs(s.fortschritt - 0.25) < 1e-9);
  assert.equal(anteilGeerntet(['a', 'b', 'c', 'd'], karten), 0.75);
});

test('Leitner: Ernte nimmt erst Fällige, dann Neue', () => {
  const ids = ['n1', 'n2', 'n3', 'f1', 'f2', 'u1'];
  const karten = {
    f1: { box: 1, due: '2026-11-20' },
    f2: { box: 3, due: '2026-11-22' },
    u1: { box: 4, due: '2026-12-10' },
  };
  const wahl = waehleErnte(ids, karten, '2026-11-22', 4, () => 0.3);
  assert.equal(wahl.length, 4);
  assert.ok(wahl.includes('f1') && wahl.includes('f2'));
  assert.ok(!wahl.includes('u1'));
  const z = zaehle(ids, karten, '2026-11-22');
  assert.deepEqual(z, { neu: 3, faellig: 2, gesamt: 6 });
});

test('Prüfen: Zahlen mit Komma, Punkt und Einheit', () => {
  assert.deepEqual(leseZahl('22,7 kg/m²'), { zahl: 22.7, rest: 'kg/m²' });
  assert.deepEqual(leseZahl(' 0.52 '), { zahl: 0.52, rest: '' });
  assert.deepEqual(leseZahl(',5'), { zahl: 0.5, rest: '' });
  assert.equal(leseZahl('abc').zahl, null);
  const a = { ergebnis: 22.7, toleranz: 0.1, einheit: 'kg/m²' };
  assert.equal(pruefeRechnen(a, '22,68', 'kg/m²').richtig, true);
  assert.equal(pruefeRechnen(a, '22.7 kg/m2').richtig, true);
  assert.equal(pruefeRechnen(a, '22,7 kg / m^2').richtig, true);
  assert.equal(pruefeRechnen(a, '22,9', 'kg/m²').richtig, false);
  const ohne = pruefeRechnen(a, '22,7', '');
  assert.equal(ohne.zahlOk, true);
  assert.equal(ohne.einheitFehlt, true);
  assert.equal(ohne.richtig, false);
  assert.equal(pruefeRechnen({ ergebnis: 0.52, toleranz: 0.005, einheit: '' }, '0,52').richtig, true);
  assert.equal(pruefeRechnen({ ergebnis: 46.2, toleranz: 0.2, einheit: '%' }, '46,15 Prozent').richtig, true);
});

test('Prüfen: Lücke, Zuordnen, Reihenfolge, Wahr/Falsch, Bild', () => {
  assert.equal(pruefeLuecke({ loesungen: ['2/5', '2/5', '1/5'] }, ['2/5', '2/5', '1/5']).richtig, true);
  assert.equal(pruefeLuecke({ loesungen: ['a', 'b'] }, ['b', 'a']).richtig, false);
  assert.equal(pruefeZuordnen({ paare: [['A', '1'], ['B', '2']] }, { A: '1', B: '2' }).richtig, true);
  assert.equal(pruefeZuordnen({ paare: [['A', '1'], ['B', '2']] }, { A: '2', B: '1' }).richtig, false);
  assert.equal(pruefeReihenfolge({ schritte: ['x', 'y'] }, ['x', 'y']).richtig, true);
  assert.equal(pruefeReihenfolge({ schritte: ['x', 'y'] }, ['x']).richtig, false);
  assert.equal(pruefeWahrFalsch({ wahr: false, richtigeBegruendung: 0 }, false, 0).richtig, true);
  assert.equal(pruefeWahrFalsch({ wahr: false, richtigeBegruendung: 0 }, false, 1).richtig, false);
  assert.equal(pruefeAntippen({ ziele: ['a', 'b'] }, ['b', 'a']).richtig, true);
  assert.equal(pruefeAntippen({ ziele: ['a', 'b'] }, ['a', 'b', 'c']).richtig, false);
  assert.equal(pruefeBeschriften({ marken: [{ id: 'm', loesung: 'L' }] }, { m: 'L' }).richtig, true);
});

test('Spiel: Level aus XP', () => {
  const t = [0, 80, 240, 480];
  assert.equal(levelAusXp(0, t).level, 1);
  assert.equal(levelAusXp(79, t).level, 1);
  assert.equal(levelAusXp(80, t).level, 2);
  assert.equal(levelAusXp(500, t).level, 4);
  assert.ok(levelAusXp(5000, t).level > 4); // wächst über die Tabelle hinaus
  assert.equal(levelAusXp(100, t).bisNaechstes, 140);
});

test('Spiel: Gebäude – gesperrt, kaufbar, ruht, produziert', () => {
  const cfg = { levelXp: [0, 80, 240], produktionsSchwelle: 0.6 };
  const a = { id: 'a', level: 1, preis: 0, vorstufen: [], aufgaben: [{ id: 'a1' }, { id: 'a2' }] };
  const b = { id: 'b', level: 2, preis: 40, vorstufen: ['a'], aufgaben: [{ id: 'b1' }] };
  const alle = [a, b];
  let z = { xp: 0, muenzen: 0, gebaut: {}, karten: {} };
  assert.equal(gebaeudeStatus(a, z, alle, cfg), 'produziert');
  assert.equal(gebaeudeStatus(b, z, alle, cfg), 'gesperrt');
  z = { ...z, xp: 100 };
  assert.equal(gebaeudeStatus(b, z, alle, cfg), 'kaufbar');
  assert.ok(kaufeGebaeude(b, z, cfg).fehler); // zu wenig Münzen
  z = { ...z, muenzen: 50 };
  z = kaufeGebaeude(b, z, cfg).zustand;
  assert.equal(z.muenzen, 10);
  assert.equal(gebaeudeStatus(b, z, alle, cfg), 'ruht');
  z = { ...z, karten: { a1: { box: 2 }, a2: { box: 3 } } };
  assert.equal(gebaeudeStatus(b, z, alle, cfg), 'produziert');
});

test('Spiel: Tagesserie mit einem geschützten Ausfalltag pro Woche', () => {
  let { serie, ereignis } = aktualisiereSerie(null, '2026-11-16');
  assert.equal(ereignis, 'neu');
  ({ serie, ereignis } = aktualisiereSerie(serie, '2026-11-17'));
  assert.equal(serie.tage, 2);
  ({ serie, ereignis } = aktualisiereSerie(serie, '2026-11-17'));
  assert.equal(ereignis, 'schon');
  // 18. ausgefallen → am 19. gerettet
  ({ serie, ereignis } = aktualisiereSerie(serie, '2026-11-19'));
  assert.equal(ereignis, 'gerettet');
  assert.equal(serie.tage, 3);
  // 20. ausgefallen (gleiche Woche W47) → nicht mehr zu retten
  ({ serie, ereignis } = aktualisiereSerie(serie, '2026-11-21'));
  assert.equal(ereignis, 'zurueckgesetzt');
  assert.equal(serie.tage, 1);
  assert.equal(serie.beste, 3);
  // Neue Woche: wieder ein Schutztag frei (Ausfall am 24., Woche W48)
  ({ serie } = aktualisiereSerie(serie, '2026-11-22'));
  ({ serie } = aktualisiereSerie(serie, '2026-11-23'));
  ({ serie, ereignis } = aktualisiereSerie(serie, '2026-11-25'));
  assert.equal(ereignis, 'gerettet');
  assert.equal(serie.tage, 4);
  assert.equal(serieAnzeige(serie, '2026-11-27').status, 'vorbei'); // Schutz in W48 schon genutzt
  assert.equal(serieAnzeige(serie, '2026-11-26').status, 'offen');
});

test('Spiel: Belohnung, Klausurauswahl und Auswertung', () => {
  const cfg = { xpProRichtig: 10, muenzenProRichtig: 5 };
  assert.deepEqual(belohnung(4, 1, 1, cfg), { xp: 45, muenzen: 23 });
  assert.deepEqual(belohnung(4, 0, 2, cfg), { xp: 80, muenzen: 40 });
  const bl = [
    { id: 'x', titel: 'X', gebaeude: { name: 'X' }, aufgaben: Array.from({ length: 30 }, (_, i) => ({ id: 'x' + i })) },
    { id: 'y', titel: 'Y', gebaeude: { name: 'Y' }, aufgaben: Array.from({ length: 10 }, (_, i) => ({ id: 'y' + i })) },
    { id: 'z', titel: 'Z', gebaeude: { name: 'Z' }, aufgaben: Array.from({ length: 3 }, (_, i) => ({ id: 'z' + i })) },
  ];
  const k = waehleKlausur(bl, 20);
  assert.equal(k.length, 20);
  assert.equal(new Set(k).size, 20);
  assert.ok(k.some((id) => id.startsWith('z')));
  const erg = k.map((id) => ({ id, richtig: id.startsWith('x') }));
  const a = werteKlausurAus(erg, bl);
  assert.equal(a.max, 20);
  assert.ok(a.staerken.some((s) => s.id === 'x'));
  assert.ok(a.wiederholen.includes('y'));
  const auftrag = erzeugeAuftrag(bl, {}, '2026-11-22', 6, 'Test', () => 0.5);
  assert.equal(auftrag.aufgaben.length, 6);
  assert.ok(auftrag.bloecke.length >= 2);
  assert.equal(erzeugeAuftrag([bl[0]], {}, '2026-11-22', 6, 'T'), null);
});
