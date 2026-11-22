// datum.js – kleine Helfer für Kalendertage.
// Wir rechnen bewusst mit lokalen Kalendertagen im Format "JJJJ-MM-TT",
// damit Wiederholungen nicht von Uhrzeit oder Zeitzone abhängen.

/** Heutiges Datum als "JJJJ-MM-TT" (lokale Zeit). */
export function heute(jetzt = new Date()) {
  const j = jetzt.getFullYear();
  const m = String(jetzt.getMonth() + 1).padStart(2, '0');
  const t = String(jetzt.getDate()).padStart(2, '0');
  return `${j}-${m}-${t}`;
}

/** "JJJJ-MM-TT" → Tageszahl seit 1970 (UTC-basiert, daher ohne Sommerzeit-Sprünge). */
function tagesNummer(tag) {
  const [j, m, t] = tag.split('-').map(Number);
  return Math.round(Date.UTC(j, m - 1, t) / 86400000);
}

/** Tageszahl → "JJJJ-MM-TT". */
function ausNummer(n) {
  const d = new Date(n * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Addiert ganze Tage zu einem Datum. */
export function plusTage(tag, anzahl) {
  return ausNummer(tagesNummer(tag) + anzahl);
}

/** Anzahl Tage von a nach b (b − a). */
export function tageZwischen(a, b) {
  return tagesNummer(b) - tagesNummer(a);
}

/** ISO-Kalenderwoche als "JJJJ-Www" (Woche beginnt montags). */
export function isoWoche(tag) {
  const n = tagesNummer(tag);
  const d = new Date(n * 86400000);
  const wochentag = (d.getUTCDay() + 6) % 7; // Montag = 0
  // Donnerstag derselben Woche bestimmt das Jahr.
  const donnerstag = n - wochentag + 3;
  const dd = new Date(donnerstag * 86400000);
  const jahr = dd.getUTCFullYear();
  const ersterJan = Math.round(Date.UTC(jahr, 0, 1) / 86400000);
  const woche = Math.floor((donnerstag - ersterJan) / 7) + 1;
  return `${jahr}-W${String(woche).padStart(2, '0')}`;
}
