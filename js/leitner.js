// leitner.js – das Wiederholungssystem (Leitner-Kartei).
//
// Jede Aufgabe ist eine Karte mit einem Fach (box):
//   0 = neu (noch nie beantwortet)
//   1 = heute wiederholen   (Intervall intervalle[0], Standard 0 Tage)
//   2 = nach 1 Tag          (intervalle[1])
//   3 = nach 3 Tagen        (intervalle[2])
//   4 = nach 7 Tagen        (intervalle[3])
//   5 = nach 14 Tagen       (intervalle[4])
// Richtig → ein Fach weiter (neue Karten springen direkt in Fach 2).
// Falsch  → zurück in Fach 1 (kommt noch heute wieder).
// Wer eine Karte übt, die noch nicht fällig ist („Übung“), verschiebt sie
// bei richtiger Antwort NICHT nach vorn – so zählt nur echtes Wiederholen.

import { plusTage } from './datum.js';

export const STANDARD_INTERVALLE = [0, 1, 3, 7, 14];

/** Leere Karte. */
export function neueKarte() {
  return { box: 0, due: null, last: null, r: 0, f: 0, gold: false };
}

/** Ist die Karte heute fällig („reife Ernte“)? Neue Karten zählen nicht als fällig. */
export function istFaellig(karte, heuteTag) {
  return !!karte && karte.box >= 1 && karte.due !== null && karte.due <= heuteTag;
}

/** Ist die Karte noch neu? */
export function istNeu(karte) {
  return !karte || karte.box === 0;
}

/**
 * Verarbeitet eine Antwort und gibt die NEUE Karte zurück (die alte bleibt unverändert).
 * @param {object} karte  bisherige Karte (oder undefined)
 * @param {boolean} richtig
 * @param {string} heuteTag "JJJJ-MM-TT"
 * @param {number[]} intervalle Tage je Fach 1–5
 */
export function beantworte(karte, richtig, heuteTag, intervalle = STANDARD_INTERVALLE) {
  const k = { ...neueKarte(), ...(karte || {}) };
  const uebung = k.box >= 2 && k.due !== null && k.due > heuteTag; // noch nicht fällig
  k.last = heuteTag;
  if (richtig) {
    k.r += 1;
    if (uebung) return k; // Üben zählt, schiebt aber nicht vor
    if (k.box === 5) k.gold = true; // nach 14 Tagen noch einmal gewusst = gemeistert
    k.box = k.box === 0 ? 2 : Math.min(5, k.box + 1);
    k.due = plusTage(heuteTag, intervalle[k.box - 1]);
  } else {
    k.f += 1;
    k.box = 1;
    k.gold = false;
    k.due = plusTage(heuteTag, intervalle[0]);
  }
  return k;
}

/** Beherrschung einer einzelnen Karte von 0 bis 5. */
export function kartenStufe(karte) {
  if (!karte || karte.box <= 1) return 0;
  if (karte.box === 5) return karte.gold ? 5 : 4;
  return karte.box - 1; // Fach 2 → 1, Fach 3 → 2, Fach 4 → 3
}

/**
 * Beherrschungsgrad eines Themenblocks (0–5) aus allen seinen Karten.
 * Die Stufe ist der abgerundete Durchschnitt – sie steigt also nur durch
 * Wiederholungen über mehrere Tage, nicht durch bloßes Durchklicken.
 * @returns {{stufe:number, fortschritt:number, schnitt:number}}
 */
export function blockStufe(aufgabenIds, karten) {
  if (!aufgabenIds.length) return { stufe: 0, fortschritt: 0, schnitt: 0 };
  const summe = aufgabenIds.reduce((s, id) => s + kartenStufe(karten[id]), 0);
  const schnitt = summe / aufgabenIds.length;
  const stufe = Math.min(5, Math.floor(schnitt + 1e-9));
  return { stufe, fortschritt: stufe >= 5 ? 1 : schnitt - stufe, schnitt };
}

/** Anteil der Karten, die mindestens einmal richtig beantwortet wurden (Fach ≥ 2). */
export function anteilGeerntet(aufgabenIds, karten) {
  if (!aufgabenIds.length) return 0;
  const n = aufgabenIds.filter((id) => karten[id] && karten[id].box >= 2).length;
  return n / aufgabenIds.length;
}

/** Zählt neue, fällige und gesamte Karten eines Blocks. */
export function zaehle(aufgabenIds, karten, heuteTag) {
  let neu = 0, faellig = 0;
  for (const id of aufgabenIds) {
    const k = karten[id];
    if (istNeu(k)) neu++;
    else if (istFaellig(k, heuteTag)) faellig++;
  }
  return { neu, faellig, gesamt: aufgabenIds.length };
}

/** Fisher-Yates-Mischen mit austauschbarem Zufall (für Tests). */
export function mische(liste, zufall = Math.random) {
  const a = liste.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Stellt eine Ernte (Lerneinheit) zusammen.
 * Reihenfolge der Auswahl: zuerst fällige Karten (älteste zuerst), dann neue
 * Karten in der Lernreihenfolge des Materials, zuletzt Übungskarten mit dem
 * niedrigsten Fach. Die gewählten Karten werden anschließend gemischt.
 * @returns {string[]} Aufgaben-IDs
 */
export function waehleErnte(aufgabenIds, karten, heuteTag, anzahl, zufall = Math.random) {
  const faellig = aufgabenIds
    .filter((id) => istFaellig(karten[id], heuteTag))
    .sort((a, b) => (karten[a].due < karten[b].due ? -1 : karten[a].due > karten[b].due ? 1 : 0));
  const neu = aufgabenIds.filter((id) => istNeu(karten[id]));
  const rest = mische(aufgabenIds.filter((id) => !istNeu(karten[id]) && !istFaellig(karten[id], heuteTag)), zufall)
    .sort((a, b) => karten[a].box - karten[b].box);
  const auswahl = [...faellig, ...neu, ...rest].slice(0, anzahl);
  return mische(auswahl, zufall);
}
