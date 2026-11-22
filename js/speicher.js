// speicher.js – Spielstand im Browser speichern, exportieren, importieren, zurücksetzen.
// Wir nutzen localStorage: einfach, synchron und offline verfügbar. Ein Spielstand
// ist klein (wenige Kilobyte), dafür reicht localStorage dicke.

const SCHLUESSEL = 'statikhof.spielstand.v1';
const VERSION = 1;

/** Leerer Spielstand mit Standardeinstellungen. */
export function neuerSpielstand(cfg = {}) {
  return {
    version: VERSION,
    erstellt: new Date().toISOString(),
    geaendert: new Date().toISOString(),
    karten: {},          // Aufgaben-ID → Leitner-Karte
    xp: 0,
    muenzen: 0,
    gebaut: {},          // Block-ID → true
    deko: {},            // Deko-ID → true
    serie: null,         // Tagesserie
    auftraege: [],       // offene Aufträge
    statistik: { ernten: 0, auftraege: 0, antworten: 0, richtig: 0, klausuren: [] },
    begruesst: false,
    einstellungen: {
      ton: true,
      animationen: true,
      design: 'auto',      // auto | light | dark
      ernteAufgaben: cfg.ernteAufgaben ?? 6,
      klausurMinuten: cfg.klausurMinuten ?? 30,
      klausurFragen: cfg.klausurFragen ?? 20,
    },
  };
}

/** Ergänzt fehlende Felder (z. B. nach einem Update der App). */
export function vervollstaendige(stand, cfg) {
  const leer = neuerSpielstand(cfg);
  const s = { ...leer, ...stand };
  s.einstellungen = { ...leer.einstellungen, ...(stand.einstellungen || {}) };
  s.statistik = { ...leer.statistik, ...(stand.statistik || {}) };
  for (const k of ['karten', 'gebaut', 'deko']) if (typeof s[k] !== 'object' || s[k] === null || Array.isArray(s[k])) s[k] = {};
  if (!Array.isArray(s.auftraege)) s.auftraege = [];
  s.xp = Number.isFinite(s.xp) ? s.xp : 0;
  s.muenzen = Number.isFinite(s.muenzen) ? s.muenzen : 0;
  return s;
}

/** Lädt den Spielstand (oder einen neuen, falls keiner existiert oder er kaputt ist). */
export function lade(cfg) {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    if (!roh) return neuerSpielstand(cfg);
    return vervollstaendige(JSON.parse(roh), cfg);
  } catch (e) {
    console.warn('Spielstand konnte nicht gelesen werden – starte neu.', e);
    return neuerSpielstand(cfg);
  }
}

/** Speichert den Spielstand. Gibt false zurück, wenn der Browser das Speichern verweigert. */
export function speichere(stand) {
  try {
    stand.geaendert = new Date().toISOString();
    localStorage.setItem(SCHLUESSEL, JSON.stringify(stand));
    return true;
  } catch (e) {
    console.warn('Speichern fehlgeschlagen', e);
    return false;
  }
}

/** Bittet den Browser, den Speicher nicht automatisch zu leeren (wo unterstützt). */
export async function bitteUmDauerhaftenSpeicher() {
  try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) { /* egal */ }
  return false;
}

/** Erstellt die Export-Datei als Blob plus Dateinamen. */
export function exportDatei(stand) {
  const datum = new Date().toISOString().slice(0, 10);
  const inhalt = JSON.stringify({ app: 'statik-hof', exportiert: new Date().toISOString(), spielstand: stand }, null, 2);
  return { name: `statik-hof-spielstand-${datum}.json`, blob: new Blob([inhalt], { type: 'application/json' }) };
}

/**
 * Prüft eine importierte Datei und gibt den Spielstand zurück.
 * @throws Error mit verständlicher Meldung
 */
export function leseImport(text, cfg) {
  let daten;
  try { daten = JSON.parse(text); } catch (e) { throw new Error('Die Datei ist keine gültige Spielstand-Datei (kein JSON).'); }
  const stand = daten && daten.app === 'statik-hof' ? daten.spielstand : daten;
  if (!stand || typeof stand !== 'object' || typeof stand.karten !== 'object' || !('xp' in stand)) {
    throw new Error('In der Datei steckt kein Statik-Hof-Spielstand.');
  }
  return vervollstaendige(stand, cfg);
}

/** Löscht den gespeicherten Spielstand. */
export function loesche() {
  try { localStorage.removeItem(SCHLUESSEL); } catch (e) { /* egal */ }
}
