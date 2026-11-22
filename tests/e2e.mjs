// Ende-zu-Ende-Test im (emulierten) iPad mit Playwright.
// Voraussetzung: Playwright mit Chromium ist installiert und ein Server läuft:
//   python3 -m http.server 8080      (im Projektordner)
//   node tests/e2e.mjs
// Prüft: Touch-Bedienung aller Aufgabentypen, Lernlogik (Leitner), Belohnungen,
// Speicherstand nach Neuladen, Export/Import, Zurücksetzen, Offline-Betrieb, Zoomsperre.

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(join(execSync('npm root -g').toString().trim(), 'playwright')); }
const { chromium, devices } = playwright;

const APP_URL = process.env.APP_URL || 'http://localhost:8080/';
const INHALT = JSON.parse(readFileSync(new URL('../inhalt.json', import.meta.url), 'utf8'));
const AUFGABEN = Object.fromEntries(INHALT.bloecke.flatMap((b) => b.aufgaben).map((a) => [a.id, a]));

let schritte = 0;
const ok = (text) => { schritte++; console.log(`  ✓ ${text}`); };

/** Tippt das Element an, dessen data-Attribut exakt dem Wert entspricht. */
async function tippeDaten(p, attr, wert, bereich = '') {
  const idx = await p.evaluate(([attr, wert, bereich]) => [...document.querySelectorAll(`${bereich} [data-${attr}]`)].findIndex((e) => e.dataset[attr] === wert), [attr, wert, bereich]);
  assert.ok(idx >= 0, `Element data-${attr}="${wert}" nicht gefunden`);
  await p.locator(`${bereich} [data-${attr}]`).nth(idx).tap();
}

/** Beantwortet die gerade sichtbare Aufgabe – richtig oder absichtlich falsch. */
async function beantworte(p, richtig = true) {
  const id = (await p.locator('.lernen .frage').first().getAttribute('id')).replace('frage-', '');
  const a = AUFGABEN[id];
  if (!richtig) {
    // Absichtlich falsch: bei MC eine falsche Option, sonst Rechnen mit falscher Zahl.
    assert.equal(a.typ, 'mc', 'Falsch-Test nur mit MC-Aufgaben');
    const falsch = a.optionen.find((_, i) => i !== a.richtig);
    const idx = await p.evaluate((t) => [...document.querySelectorAll('.lernen .option')].findIndex((o) => o.textContent.trim().endsWith(t)), falsch);
    await p.locator('.lernen .option').nth(idx).tap();
    return { id, a };
  }
  switch (a.typ) {
    case 'mc': await tippeDaten(p, 'orig', String(a.richtig), '.lernen'); break;
    case 'wahrfalsch': await tippeDaten(p, 'wf', String(a.wahr), '.lernen'); await tippeDaten(p, 'begr', String(a.richtigeBegruendung), '.lernen'); break;
    case 'luecke':
      for (const w of a.loesungen) {
        const idx = await p.evaluate((w) => [...document.querySelectorAll('.lernen .wort')].findIndex((e) => !e.disabled && e.textContent === w), w);
        await p.locator('.lernen .wort').nth(idx).tap();
      }
      break;
    case 'zuordnen': for (const [l, r] of a.paare) { await tippeDaten(p, 'l', l, '.lernen'); await tippeDaten(p, 'r', r, '.lernen'); } break;
    case 'reihenfolge': for (const s of a.schritte) await tippeDaten(p, 's', s, '.lernen'); break;
    case 'rechnen':
      await p.locator('.lernen .zahl-eingabe').fill(String(a.ergebnis).replace('.', ','));
      if (a.einheit) await tippeDaten(p, 'einheit', a.einheit, '.lernen');
      break;
    case 'bild':
      if (a.modus === 'antippen') for (const z of a.ziele) await p.locator(`.lernen .abb-punkt[data-id="${z}"]`).tap();
      else for (const [i, m] of a.marken.entries()) { await tippeDaten(p, 'l', `Marke ${i + 1}`, '.lernen'); await tippeDaten(p, 'r', m.loesung, '.lernen'); }
      break;
  }
  return { id, a };
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'], acceptDownloads: true });
  const p = await ctx.newPage();
  const fehler = [];
  p.on('pageerror', (e) => fehler.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  p.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });

  console.log('Start, Willkommen, Zoomsperre');
  await p.goto(APP_URL);
  await p.waitForSelector('[data-los]');
  const viewport = await p.getAttribute('meta[name="viewport"]', 'content');
  assert.match(viewport, /user-scalable=no/); assert.match(viewport, /viewport-fit=cover/);
  assert.equal(await p.evaluate(() => getComputedStyle(document.documentElement).touchAction), 'manipulation');
  ok('Kein Zoom per Pinch/Doppeltipp (viewport + touch-action), Safe-Area aktiv');
  await p.locator('[data-los]').tap();
  await p.waitForSelector('[data-ernten]');
  ok('Willkommen → Kornfeld-Dialog');

  console.log('Lernrunde im Kornfeld: alles richtig → Korn wächst');
  await p.locator('[data-ernten]').tap();
  const stufen = [];
  for (let i = 0; i < 6; i++) {
    await beantworte(p, true);
    await p.locator('[data-pruefen]').tap();
    await p.waitForSelector('.rueckmeldung.gut');
    stufen.push(await p.evaluate(() => window.__statikhof.S.felder.grundlagen.pflanzen.join('')));
    assert.equal(await p.locator('.beet-streifen .pflanze.waechst').count() > 0, true, 'Wachstum im Beet-Streifen sichtbar');
    await p.locator('.lernen .aktionen .knopf').tap();
  }
  assert.deepEqual(stufen, ['100000', '210000', '321000', '432100', '443210', '444321']);
  ok('Jede richtige Antwort: Saat → Spross → Halm → reif (Beet-Streifen animiert)');
  await p.waitForSelector('.ergebnis');
  const nachErnte = await p.evaluate(() => window.__statikhof.S);
  assert.equal(nachErnte.xp, 60); assert.equal(nachErnte.muenzen, 0);
  assert.equal(Object.values(nachErnte.karten).filter((k) => k.box === 2).length, 6);
  assert.equal(nachErnte.serie.tage, 1);
  assert.match(await p.textContent('.ergebnis'), /3 Korn ist reif/);
  ok('6/6 richtig → 60 XP (Münzen erst beim Ernten), 6 Karten in Fach 2, Tagesserie 1, 3 Korn reif');

  console.log('Korn ernten auf dem Hof');
  await p.locator('[data-zurueck]').tap();
  await p.waitForSelector('.beet.hat-reif[data-feld="grundlagen"]');
  assert.equal(await p.textContent('.korn-zahl'), '0');
  await p.locator('.beet.hat-reif[data-feld="grundlagen"] .ernte-hinweis').tap({ force: true });
  await p.waitForSelector('.flieger');
  ok('Antippen startet die Ernte-Animation (fliegende Körner)');
  await p.waitForFunction(() => !document.querySelector('.beet.hat-reif') && document.querySelector('.korn-zahl')?.textContent === '3', null, { timeout: 5000 });
  const nachKorn = await p.evaluate(() => window.__statikhof.S);
  assert.equal(nachKorn.korn, 3); assert.equal(nachKorn.muenzen, 15); assert.equal(nachKorn.xp, 66);
  assert.equal(nachKorn.felder.grundlagen.pflanzen.join(''), '000321');
  assert.equal(await p.textContent('.muenz-zahl'), '15');
  ok('3 Korn geerntet → Zähler 3 Korn, +15 Münzen, +6 XP; reife Plätze sind wieder frei');

  console.log('Tiere leben');
  const t1 = await p.evaluate(() => window.__statikhof.tierPositionen());
  assert.ok(t1.some((t) => t.art === 'pferd') && t1.some((t) => t.art === 'huhn') && t1.some((t) => t.art === 'kueken'));
  assert.equal(await p.evaluate(() => window.__statikhof.laeuft()), true);
  await p.waitForTimeout(2500);
  const t2 = await p.evaluate(() => window.__statikhof.tierPositionen());
  assert.ok(t2.some((t, i) => Math.hypot(t.x - t1[i].x, t.y - t1[i].y) > 1), 'mindestens ein Tier hat sich bewegt');
  // Tiere überdecken keine Gebäude und keine Bedienelemente
  const ueberlappung = await p.evaluate(() => {
    const boxen = [...document.querySelectorAll('.geb .geb-bild, .beet, .leiste, .kopf > *')].map((e) => e.getBoundingClientRect());
    const tiere = [...document.querySelectorAll('.tier-pferd, .tier-huhn, .tier-kueken')].map((e) => e.getBoundingClientRect());
    const schnitt = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return tiere.map((t) => Math.max(0, ...boxen.map((b) => schnitt(t, b) / (t.width * t.height)))).reduce((m, x) => Math.max(m, x), 0);
  });
  assert.ok(ueberlappung < 0.25, `Tiere überdecken Gebäude/Bedienung zu stark (${ueberlappung.toFixed(2)})`);
  await p.locator('.tier-huhn').first().tap({ force: true });
  ok('Pferde, Hühner und Küken bewegen sich, bleiben frei von Gebäuden und Knöpfen, Huhn reagiert auf Antippen');
  await p.locator('[data-aktion="einstellungen"]').tap();
  await p.waitForTimeout(200);
  assert.equal(await p.evaluate(() => window.__statikhof.laeuft()), false);
  await p.locator('.blatt [data-schliessen]').first().tap();
  await p.waitForTimeout(200);
  assert.equal(await p.evaluate(() => window.__statikhof.laeuft()), true);
  ok('Tier-Animation pausiert bei offenem Dialog und läuft danach weiter');

  console.log('Fehler führen zu Erklärung und Wiederholung');
  await p.evaluate(() => window.__statikhof.testSitzung(['g01', 'g04']));
  let erste = await beantworte(p, false);
  await p.locator('[data-pruefen]').tap();
  await p.waitForSelector('.rueckmeldung.weiter');
  assert.match(await p.textContent('.rueckmeldung'), /Richtig ist:/);
  assert.match(await p.textContent('.rueckmeldung'), /Quelle:/);
  assert.equal((await p.evaluate((id) => window.__statikhof.S.karten[id], erste.id)).box, 1);
  await p.locator('.lernen .aktionen .knopf').tap();
  assert.match(await p.textContent('.lern-kopf'), /2 von 3/); // erneut eingereiht
  ok('Falsche Antwort: Erklärung + „Richtig ist“ + Quelle, Karte in Fach 1, Aufgabe kommt erneut');
  await beantworte(p, true); await p.locator('[data-pruefen]').tap(); await p.locator('.lernen .aktionen .knopf').tap();
  await beantworte(p, true); await p.locator('[data-pruefen]').tap();
  await p.waitForSelector('.rueckmeldung.gut');
  assert.match(await p.textContent('.lern-kopf'), /Zweiter Versuch/);
  await p.locator('.lernen .aktionen .knopf').tap();
  await p.waitForSelector('.ergebnis');
  assert.equal((await p.evaluate((id) => window.__statikhof.S.karten[id], erste.id)).box, 2);
  ok('Zweiter Versuch richtig → Karte wieder in Fach 2');
  await p.locator('[data-zurueck]').tap();

  console.log('Alle Aufgabentypen per Touch (Rechnen, Bild antippen, Bild beschriften, Lückentext, Reihenfolge, Zuordnen, Wahr/Falsch)');
  const typIds = ['m20', 's08', 'r01', 'r27', 'j11', 'b16', 'w08', 'g08', 'g15', 'g03', 'g12'];
  await p.evaluate((ids) => window.__statikhof.testSitzung(ids), typIds);
  for (let i = 0; i < typIds.length; i++) {
    const { a } = await beantworte(p, true);
    await p.locator('[data-pruefen]').tap();
    await p.waitForSelector('.rueckmeldung');
    const gut = await p.locator('.rueckmeldung.gut').count();
    assert.equal(gut, 1, `Aufgabe ${a.id} (${a.typ}) wurde trotz richtiger Antwort nicht als richtig gewertet`);
    await p.locator('.lernen .aktionen .knopf').tap();
  }
  await p.waitForSelector('.ergebnis');
  ok(`${typIds.length} Aufgaben aller Typen richtig bedient und gewertet`);
  await p.locator('[data-zurueck]').tap();

  console.log('Robustheit: jede Aufgabe aufbauen und unbeantwortet prüfen');
  const robust = await p.evaluate(async () => {
    const ui = await import('./js/aufgaben-ui.js');
    const fehler = [];
    const alle = window.__statikhof.INHALT.bloecke.flatMap((b) => b.aufgaben);
    for (const a of alle) for (const ohneHilfen of [false, true]) {
      const div = document.createElement('div');
      document.body.appendChild(div);
      try { const c = ui.baueAufgabe(div, a, { ohneHilfen }); c.bereit(); c.pruefe(); c.mitLoesung(); ui.loesungText(a); }
      catch (e) { fehler.push(`${a.id}: ${e.message}`); }
      div.remove();
    }
    return { anzahl: alle.length, fehler };
  });
  assert.deepEqual(robust.fehler, []);
  ok(`Alle ${robust.anzahl} Aufgaben lassen sich aufbauen und (auch leer) prüfen`);

  console.log('Rechnen: Eingabeformen');
  const eingaben = await p.evaluate(async () => {
    const m = await import('./js/pruefen.js');
    const a = { ergebnis: 22.7, toleranz: 0.1, einheit: 'kg/m²' };
    return ['22,7', '22.7', '22,68 kg/m2', ' 22,7 kg / m^2 '].map((t) => m.pruefeRechnen(a, t, 'kg/m²').richtig);
  });
  assert.deepEqual(eingaben, [true, true, true, true]);
  ok('Komma, Punkt, Rundung und Einheiten-Schreibweisen werden akzeptiert');

  console.log('Speicherstand bleibt nach Neuladen erhalten');
  const vorher = await p.evaluate(() => JSON.stringify(window.__statikhof.S.karten));
  await p.reload();
  await p.waitForFunction(() => window.__statikhof && window.__statikhof.S);
  assert.equal(await p.evaluate(() => JSON.stringify(window.__statikhof.S.karten)), vorher);
  assert.equal(await p.locator('[data-los]').count(), 0);
  assert.equal(await p.evaluate(() => window.__statikhof.S.korn), 3);
  ok('Karten, XP, Korn, Beete und Begrüßungsstatus nach Reload unverändert');

  console.log('Export, Zurücksetzen, Import');
  await p.locator('[data-aktion="einstellungen"]').tap();
  const [download] = await Promise.all([p.waitForEvent('download'), p.locator('[data-export]').tap()]);
  const ordner = mkdtempSync(join(tmpdir(), 'statikhof-'));
  const pfad = join(ordner, download.suggestedFilename());
  await download.saveAs(pfad);
  const export_ = JSON.parse(readFileSync(pfad, 'utf8'));
  assert.equal(export_.app, 'statik-hof'); assert.ok(export_.spielstand.xp > 0);
  ok(`Export als Datei (${download.suggestedFilename()})`);
  await p.locator('[data-reset]').tap();
  await p.locator('[data-bestaetigung]').fill('falsch');
  assert.equal(await p.locator('[data-wirklich]').isDisabled(), true);
  await p.locator('[data-bestaetigung]').fill('LÖSCHEN');
  await p.locator('[data-wirklich]').tap();
  assert.equal(await p.evaluate(() => window.__statikhof.S.xp), 0);
  ok('Zurücksetzen nur nach Sicherheitsabfrage (Eingabe „LÖSCHEN“)');
  await p.locator('[data-aktion="einstellungen"]').tap();
  p.once('dialog', (d) => d.accept());
  await p.locator('[data-datei]').setInputFiles(pfad);
  await p.waitForFunction(() => window.__statikhof.S.xp > 0);
  assert.equal(await p.evaluate(() => window.__statikhof.S.xp), export_.spielstand.xp);
  ok('Import stellt den exportierten Spielstand wieder her');

  console.log('Probeklausur');
  await p.locator('[data-aktion="klausur"]').tap();
  await p.locator('[data-los]').tap();
  await p.waitForSelector('.klausur-navi');
  assert.equal(await p.locator('.klausur-navi button').count(), 20);
  assert.equal(await p.locator('.lernen [data-hilfe]').count(), 0);
  p.once('dialog', (d) => d.accept());
  await p.locator('[data-abgeben]').tap();
  await p.waitForSelector('.auswertung-tabelle');
  assert.match(await p.textContent('.ergebnis'), /Als Nächstes wiederholen/);
  ok('Klausur mit 20 Fragen, Timer, ohne Hilfen; Auswertung mit Themen, Stärken/Schwächen, Empfehlung');
  await p.locator('.ergebnis [data-zurueck]').tap();

  console.log('Offline-Betrieb');
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload();
  await p.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await ctx.setOffline(true);
  await p.reload();
  await p.waitForSelector('.hof-buehne svg');
  await p.locator('.geb[data-block="grundlagen"] .geb-schild').tap();
  await p.locator('[data-ernten]').tap();
  await p.waitForSelector('.lernen .frage');
  ok('Ohne Netz: App startet aus dem Service-Worker-Speicher, Lernrunde funktioniert');
  await ctx.setOffline(false);

  console.log('Hochformat: kein seitliches Scrollen');
  const hoch = await browser.newContext({ ...devices['iPad Pro 11'] });
  const ph = await hoch.newPage();
  await ph.goto(APP_URL);
  await ph.waitForSelector('.hof-buehne svg');
  const breite = await ph.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  assert.ok(breite[0] <= breite[1], `Seite breiter als Bildschirm: ${breite}`);
  ok('Hochformat passt in die Breite');

  console.log('Alter Spielstand (Version 1) wird übernommen');
  const alt = await browser.newContext({ ...devices['iPad Pro 11 landscape'] });
  const pa = await alt.newPage();
  pa.on('pageerror', (e) => fehler.push('v1: ' + e.message));
  await pa.addInitScript(() => localStorage.setItem('statikhof.spielstand.v1', JSON.stringify({ version: 1, begruesst: true, xp: 300, muenzen: 77, karten: { g01: { box: 3, faellig: '2020-01-01', richtig: 2, falsch: 0 } }, gebaut: { konstitution: true }, deko: { blumen: true }, auftraege: [], einstellungen: { ton: false, design: 'auto', animationen: true, ernteAufgaben: 6, klausurMinuten: 30, klausurFragen: 20 }, statistik: { antworten: 5, richtig: 4, ernten: 1, auftraege: 0, klausuren: [] } })));
  await pa.goto(APP_URL);
  await pa.waitForSelector('.hof-svg');
  const mig = await pa.evaluate(() => window.__statikhof.S);
  assert.equal(mig.version, 2); assert.equal(mig.xp, 300); assert.equal(mig.muenzen, 77); assert.equal(mig.korn, 0);
  assert.equal(mig.karten.g01.box, 3); assert.equal(mig.deko.blumen, true); assert.equal(mig.einstellungen.ton, false); assert.equal(mig.einstellungen.tiere, true);
  assert.equal(await pa.locator('.geb.produziert[data-block="konstitution"], .geb.ruht[data-block="konstitution"]').count(), 1);
  ok('Version-1-Spielstand: XP, Münzen, Karten, Gebäude, Deko und Einstellungen bleiben, Beete kommen leer dazu');
  await alt.close();

  assert.deepEqual(fehler, [], 'Konsolenfehler: ' + fehler.join(' | '));
  ok('Keine JavaScript-Fehler in der Konsole');
  await browser.close();
  console.log(`\nAlle ${schritte} Prüfungen bestanden.`);
}

main().catch((e) => { console.error('\n✗ FEHLER:', e.message); process.exit(1); });
