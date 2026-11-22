// feld.js – das Kornfeld jedes Gebäudes. Reine Logik ohne Bildschirm (testbar).
//
// Jedes Gebäude (= Themenblock) hat ein Beet mit PLAETZE Pflanzen.
// Stufen einer Pflanze: 0 = leer, 1 = Saat, 2 = Spross, 3 = Halm, 4 = reifes Korn.
//
// Wachstum hängt nur am Lernen, nie an einer Uhr:
//   Jede richtige Antwort in diesem Thema lässt alle wachsenden Pflanzen eine Stufe
//   wachsen und sät auf einem freien Platz neu aus. So ist nach 4 richtigen Antworten
//   das erste Korn reif, und das Beet füllt sich wie ein kleines Fließband.
// Falsche Antworten kosten nichts – es wächst dann nur nichts.
// Reifes Korn bleibt stehen, bis es geerntet wird (kein Verderben, kein Zeitdruck).

export const PLAETZE = 6;
export const REIF = 4;
export const STUFEN = ['leer', 'Saat', 'Spross', 'Halm', 'reif'];

/** Leeres Beet. */
export function neuesFeld() {
  return { pflanzen: Array(PLAETZE).fill(0), geerntet: 0 };
}

/** Repariert/ergänzt ein Feld aus einem (evtl. alten oder kaputten) Spielstand. */
export function pruefeFeld(feld) {
  const f = neuesFeld();
  if (feld && Array.isArray(feld.pflanzen)) {
    f.pflanzen = f.pflanzen.map((_, i) => {
      const s = Number(feld.pflanzen[i]);
      return Number.isInteger(s) && s >= 0 && s <= REIF ? s : 0;
    });
  }
  f.geerntet = Number.isFinite(feld?.geerntet) ? feld.geerntet : 0;
  return f;
}

/**
 * Eine richtige Antwort: alles wächst eine Stufe, ein freier Platz wird besät.
 * @returns {{ feld: object, gewachsen: number[], gesaet: number|null, neuReif: number[] }}
 *   gewachsen = Indizes, die eine Stufe weiter sind; neuReif = Indizes, die jetzt reif wurden.
 */
export function wachse(feld) {
  const f = pruefeFeld(feld);
  const gewachsen = [];
  const neuReif = [];
  f.pflanzen = f.pflanzen.map((s, i) => {
    if (s >= 1 && s < REIF) {
      gewachsen.push(i);
      if (s + 1 === REIF) neuReif.push(i);
      return s + 1;
    }
    return s;
  });
  const frei = f.pflanzen.indexOf(0);
  let gesaet = null;
  if (frei >= 0) { f.pflanzen[frei] = 1; gesaet = frei; }
  return { feld: f, gewachsen, gesaet, neuReif };
}

/** Anzahl reifer Pflanzen. */
export function anzahlReif(feld) {
  return pruefeFeld(feld).pflanzen.filter((s) => s === REIF).length;
}

/** Ist das Beet voll und komplett reif (dann wächst nichts mehr, bis geerntet wird)? */
export function istVoll(feld) {
  return pruefeFeld(feld).pflanzen.every((s) => s === REIF);
}

/**
 * Erntet alle reifen Pflanzen.
 * @returns {{ feld: object, anzahl: number, indizes: number[] }}
 */
export function ernte(feld) {
  const f = pruefeFeld(feld);
  const indizes = [];
  f.pflanzen = f.pflanzen.map((s, i) => { if (s === REIF) { indizes.push(i); return 0; } return s; });
  f.geerntet += indizes.length;
  return { feld: f, anzahl: indizes.length, indizes };
}

/** Belohnung für geerntetes Korn. */
export function ernteBelohnung(anzahl, cfg) {
  return {
    muenzen: anzahl * (cfg.muenzenProKorn ?? 5),
    xp: anzahl * (cfg.xpProKorn ?? 2),
    korn: anzahl,
  };
}
