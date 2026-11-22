// spiel.js – Spielsystem: Level, Münzen, Gebäude, Produktionsketten, Tagesserie,
// Aufträge und Klausur-Auswertung. Reine Funktionen ohne Bildschirmzugriff.

import { tageZwischen, plusTage, isoWoche } from './datum.js';
import { anteilGeerntet, mische, istFaellig, istNeu } from './leitner.js';

/* ---------------- Level ---------------- */

/**
 * Level aus Erfahrungspunkten.
 * levelXp[i] = nötige XP für Level i+1 (levelXp[0] = 0 → Level 1).
 * Über die Tabelle hinaus wächst jedes Level um den letzten Abstand + 200 XP.
 */
export function levelAusXp(xp, levelXp) {
  const grenzen = levelXp.slice();
  while (grenzen[grenzen.length - 1] <= xp) {
    const n = grenzen.length;
    grenzen.push(grenzen[n - 1] + (grenzen[n - 1] - grenzen[n - 2]) + 200);
  }
  let level = 1;
  for (let i = 0; i < grenzen.length; i++) if (xp >= grenzen[i]) level = i + 1;
  const start = grenzen[level - 1];
  const ziel = grenzen[level];
  return { level, imLevel: xp - start, spanne: ziel - start, bisNaechstes: ziel - xp };
}

/* ---------------- Gebäude & Produktionsketten ---------------- */

/**
 * Status eines Gebäudes:
 *  'gesperrt'   – Level noch zu niedrig
 *  'kaufbar'    – Level reicht, noch nicht gebaut (kostet Münzen)
 *  'ruht'       – gebaut, aber das Vorstufenwissen sitzt noch nicht
 *  'produziert' – gebaut und alle Vorstufen ausreichend geerntet
 */
export function gebaeudeStatus(block, zustand, alleBloecke, cfg) {
  const level = levelAusXp(zustand.xp, cfg.levelXp).level;
  const gebaut = block.preis === 0 && block.level <= 1 ? true : !!zustand.gebaut[block.id];
  if (!gebaut) return level >= block.level ? 'kaufbar' : 'gesperrt';
  const fehlend = fehlendeVorstufen(block, zustand, alleBloecke, cfg);
  return fehlend.length ? 'ruht' : 'produziert';
}

/** Welche Vorstufen sind noch nicht ausreichend geerntet? */
export function fehlendeVorstufen(block, zustand, alleBloecke, cfg) {
  return (block.vorstufen || [])
    .map((id) => alleBloecke.find((b) => b.id === id))
    .filter(Boolean)
    .filter((v) => anteilGeerntet(v.aufgaben.map((a) => a.id), zustand.karten) < cfg.produktionsSchwelle);
}

/** Gebäude kaufen – gibt neuen Zustand zurück oder einen Fehlertext. */
export function kaufeGebaeude(block, zustand, cfg) {
  const { level } = levelAusXp(zustand.xp, cfg.levelXp);
  if (level < block.level) return { fehler: `Dafür brauchst du Level ${block.level}.` };
  if (zustand.muenzen < block.preis) return { fehler: `Dir fehlen noch ${block.preis - zustand.muenzen} Münzen.` };
  return { zustand: { ...zustand, muenzen: zustand.muenzen - block.preis, gebaut: { ...zustand.gebaut, [block.id]: true } } };
}

/* ---------------- Belohnungen ---------------- */

/**
 * Belohnung für eine Runde.
 * @param {number} sofortRichtig  beim ersten Versuch richtig
 * @param {number} spaeterRichtig beim erneuten Versuch richtig
 * @param {number} faktor 1 = Ernte, 2 = Auftrag
 */
export function belohnung(sofortRichtig, spaeterRichtig, faktor, cfg) {
  const xp = Math.round((sofortRichtig * cfg.xpProRichtig + spaeterRichtig * Math.round(cfg.xpProRichtig / 2)) * faktor);
  const muenzen = Math.round((sofortRichtig * cfg.muenzenProRichtig + spaeterRichtig * Math.round(cfg.muenzenProRichtig / 2)) * faktor);
  return { xp, muenzen };
}

/* ---------------- Tagesserie ---------------- */

/**
 * Aktualisiert die Tagesserie, wenn heute gelernt wurde.
 * Fällt genau ein Tag aus, bleibt die Serie erhalten – aber nur einmal pro Kalenderwoche
 * (gemessen an der Woche des ausgefallenen Tages).
 * @returns {{serie:object, ereignis:'neu'|'weiter'|'gerettet'|'zurueckgesetzt'|'schon'}}
 */
export function aktualisiereSerie(serie, heuteTag) {
  const s = { tage: 0, letzterTag: null, schutzWochen: [], beste: 0, ...(serie || {}) };
  if (s.letzterTag === heuteTag) return { serie: s, ereignis: 'schon' };
  let ereignis;
  if (!s.letzterTag) { s.tage = 1; ereignis = 'neu'; }
  else {
    const diff = tageZwischen(s.letzterTag, heuteTag);
    if (diff === 1) { s.tage += 1; ereignis = 'weiter'; }
    else if (diff === 2 && !s.schutzWochen.includes(isoWoche(plusTage(s.letzterTag, 1)))) {
      s.schutzWochen = [...s.schutzWochen, isoWoche(plusTage(s.letzterTag, 1))].slice(-12);
      s.tage += 1; ereignis = 'gerettet';
    } else if (diff < 0) { ereignis = 'schon'; return { serie: s, ereignis }; }
    else { s.tage = 1; ereignis = 'zurueckgesetzt'; }
  }
  s.letzterTag = heuteTag;
  s.beste = Math.max(s.beste || 0, s.tage);
  return { serie: s, ereignis };
}

/**
 * Anzeige-Wert der Serie (ohne zu lernen): Ist die Serie noch zu retten?
 * Gestern gelernt oder heute → aktiv; vorgestern + Schutz frei → „in Gefahr“; sonst vorbei.
 */
export function serieAnzeige(serie, heuteTag) {
  if (!serie || !serie.letzterTag) return { tage: 0, status: 'leer' };
  const diff = tageZwischen(serie.letzterTag, heuteTag);
  if (diff <= 0) return { tage: serie.tage, status: 'heute' };
  if (diff === 1) return { tage: serie.tage, status: 'offen' };
  if (diff === 2 && !(serie.schutzWochen || []).includes(isoWoche(plusTage(serie.letzterTag, 1)))) return { tage: serie.tage, status: 'schutz' };
  return { tage: 0, status: 'vorbei' };
}

/* ---------------- Aufträge (Mischaufgaben) ---------------- */

/**
 * Erzeugt einen Auftrag aus mindestens zwei produzierenden Blöcken.
 * Bevorzugt fällige, dann neue, dann übrige Karten.
 */
export function erzeugeAuftrag(bloecke, karten, heuteTag, anzahl, name, zufall = Math.random) {
  if (bloecke.length < 2) return null;
  const gewaehlteBloecke = mische(bloecke, zufall).slice(0, Math.min(3, bloecke.length));
  const proBlock = gewaehlteBloecke.map((b) => {
    const ids = b.aufgaben.map((a) => a.id);
    const f = mische(ids.filter((id) => istFaellig(karten[id], heuteTag)), zufall);
    const n = mische(ids.filter((id) => istNeu(karten[id])), zufall);
    const r = mische(ids.filter((id) => !istFaellig(karten[id], heuteTag) && !istNeu(karten[id])), zufall);
    return [...f, ...n, ...r];
  });
  const aufgaben = [];
  let runde = 0;
  while (aufgaben.length < anzahl && runde < 50) {
    for (const liste of proBlock) if (liste[runde] && aufgaben.length < anzahl) aufgaben.push(liste[runde]);
    runde++;
  }
  return { id: `a${Date.now().toString(36)}${Math.floor(zufall() * 1e6).toString(36)}`, name, bloecke: gewaehlteBloecke.map((b) => b.id), aufgaben: mische(aufgaben, zufall) };
}

/* ---------------- Klausurmodus ---------------- */

/** Wählt Klausurfragen aus allen Blöcken – anteilig zur Blockgröße, mindestens eine je Block. */
export function waehleKlausur(bloecke, anzahl, zufall = Math.random) {
  const gesamt = bloecke.reduce((s, b) => s + b.aufgaben.length, 0);
  const quoten = bloecke.map((b) => Math.max(1, Math.round((b.aufgaben.length / gesamt) * anzahl)));
  let summe = quoten.reduce((a, b) => a + b, 0);
  // Auf genaue Anzahl bringen (größte Blöcke zuerst anpassen).
  const ordnung = bloecke.map((b, i) => i).sort((a, b) => bloecke[b].aufgaben.length - bloecke[a].aufgaben.length);
  let k = 0;
  while (summe !== anzahl && k < 1000) {
    const i = ordnung[k % ordnung.length];
    if (summe > anzahl && quoten[i] > 1) { quoten[i]--; summe--; }
    else if (summe < anzahl && quoten[i] < bloecke[i].aufgaben.length) { quoten[i]++; summe++; }
    k++;
  }
  const ids = bloecke.flatMap((b, i) => mische(b.aufgaben.map((a) => a.id), zufall).slice(0, quoten[i]));
  return mische(ids, zufall);
}

/**
 * Wertet eine Probeklausur aus.
 * @param {{id:string, richtig:boolean}[]} ergebnisse
 * @param {object[]} bloecke
 */
export function werteKlausurAus(ergebnisse, bloecke) {
  const blockVon = {};
  for (const b of bloecke) for (const a of b.aufgaben) blockVon[a.id] = b;
  const proBlock = bloecke.map((b) => {
    const eigene = ergebnisse.filter((e) => blockVon[e.id] === b);
    const richtig = eigene.filter((e) => e.richtig).length;
    return { id: b.id, titel: b.titel, name: b.gebaeude.name, richtig, gesamt: eigene.length, prozent: eigene.length ? Math.round((richtig / eigene.length) * 100) : null };
  }).filter((p) => p.gesamt > 0);
  const punkte = ergebnisse.filter((e) => e.richtig).length;
  const max = ergebnisse.length;
  const prozent = max ? Math.round((punkte / max) * 100) : 0;
  const staerken = proBlock.filter((p) => p.prozent >= 75);
  const schwaechen = proBlock.filter((p) => p.prozent < 60).sort((a, b) => a.prozent - b.prozent);
  const wiederholen = (schwaechen.length ? schwaechen : proBlock.slice().sort((a, b) => a.prozent - b.prozent).slice(0, 2)).map((p) => p.id);
  let empfehlung;
  if (prozent >= 85) empfehlung = 'Sehr stark! Halte dein Wissen mit den fälligen Ernten frisch und mach in ein paar Tagen noch eine Probeklausur.';
  else if (prozent >= 65) empfehlung = 'Solide Grundlage. Ernte gezielt in den schwächeren Gebäuden und wiederhole danach die Spickzettel-Seiten dazu.';
  else empfehlung = 'Da geht noch was – kein Problem. Nimm dir die schwächsten Themen einzeln vor: erst im Spickzettel nachlesen, dann dort ein paar Ernten machen.';
  return { punkte, max, prozent, proBlock, staerken, schwaechen, wiederholen, empfehlung };
}
