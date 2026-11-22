// pruefen.js – prüft Antworten. Keine Bildschirmlogik, damit es testbar bleibt.

/**
 * Liest eine Zahl aus einer Eingabe. Erlaubt Komma und Punkt als Dezimaltrenner
 * sowie eine Einheit dahinter, z. B. "22,7 kg/m²" oder "0.52".
 * @returns {{zahl:number|null, rest:string}}
 */
export function leseZahl(text) {
  const s = String(text ?? '').trim().replace(/−/g, '-'); // echtes Minus → Bindestrich
  const m = s.match(/^([+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+))\s*(.*)$/);
  if (!m) return { zahl: null, rest: s };
  const zahl = Number(m[1].replace(',', '.'));
  return { zahl: Number.isFinite(zahl) ? zahl : null, rest: m[2].trim() };
}

/** Vereinheitlicht Einheiten-Schreibweisen ("kg/m2", "kg / m^2", "Prozent" …). */
export function normEinheit(e) {
  return String(e ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/\^/g, '')
    .replace(/prozent/g, '%')
    .replace(/grad/g, '°')
    .replace(/·/g, '*');
}

/**
 * Prüft eine Rechenaufgabe.
 * @param {object} aufgabe  mit ergebnis, toleranz, einheit
 * @param {string} eingabe  Text aus dem Eingabefeld
 * @param {string} gewaehlteEinheit  angetippte Einheit (optional)
 */
export function pruefeRechnen(aufgabe, eingabe, gewaehlteEinheit = '') {
  const { zahl, rest } = leseZahl(eingabe);
  const tol = (aufgabe.toleranz ?? 0) + 1e-9;
  const zahlOk = zahl !== null && Math.abs(zahl - aufgabe.ergebnis) <= tol;
  const brauchtEinheit = !!aufgabe.einheit;
  const einheit = rest || gewaehlteEinheit || '';
  const einheitOk = !brauchtEinheit || normEinheit(einheit) === normEinheit(aufgabe.einheit);
  return { zahl, zahlOk, einheitOk, einheitFehlt: brauchtEinheit && !einheit, richtig: zahlOk && einheitOk };
}

/** Multiple Choice: Index der gewählten (gemischten) Option gegen das Original. */
export function pruefeMC(aufgabe, gewaehltOriginalIndex) {
  return gewaehltOriginalIndex === aufgabe.richtig;
}

/** Wahr/Falsch mit Begründung: beide Teile müssen stimmen. */
export function pruefeWahrFalsch(aufgabe, wahl, begruendungIndex) {
  const wfOk = wahl === aufgabe.wahr;
  const begrOk = begruendungIndex === aufgabe.richtigeBegruendung;
  return { wfOk, begrOk, richtig: wfOk && begrOk };
}

/**
 * Lückentext: vergleicht die eingesetzten Wörter mit den Lösungen (Position für Position).
 * Gleiche Wörter (z. B. zweimal "2/5") sind austauschbar, weil nur der Text zählt.
 */
export function pruefeLuecke(aufgabe, eingesetzt) {
  const proLuecke = aufgabe.loesungen.map((l, i) => (eingesetzt[i] ?? null) === l);
  return { proLuecke, richtig: proLuecke.every(Boolean) };
}

/**
 * Zuordnen: zuordnung = { linksText: rechtsText }.
 */
export function pruefeZuordnen(aufgabe, zuordnung) {
  const proPaar = aufgabe.paare.map(([l, r]) => zuordnung[l] === r);
  return { proPaar, richtig: proPaar.every(Boolean) };
}

/** Reihenfolge: Liste der Schritt-Texte in der gewählten Reihenfolge. */
export function pruefeReihenfolge(aufgabe, gewaehlt) {
  const proPlatz = aufgabe.schritte.map((s, i) => gewaehlt[i] === s);
  return { proPlatz, richtig: proPlatz.every(Boolean) && gewaehlt.length === aufgabe.schritte.length };
}

/** Bildaufgabe „antippen“: genau die Zielpunkte, nicht mehr und nicht weniger. */
export function pruefeAntippen(aufgabe, gewaehlteIds) {
  const ziel = new Set(aufgabe.ziele);
  const wahl = new Set(gewaehlteIds);
  const fehlend = [...ziel].filter((z) => !wahl.has(z));
  const zuviel = [...wahl].filter((w) => !ziel.has(w));
  return { fehlend, zuviel, richtig: fehlend.length === 0 && zuviel.length === 0 };
}

/** Bildaufgabe „beschriften“: zuordnung = { markenId: beschriftung }. */
export function pruefeBeschriften(aufgabe, zuordnung) {
  const proMarke = aufgabe.marken.map((m) => zuordnung[m.id] === m.loesung);
  return { proMarke, richtig: proMarke.every(Boolean) };
}
