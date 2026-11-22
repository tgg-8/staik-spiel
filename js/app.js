// app.js – Hauptprogramm des Statik-Hofs.
// Verbindet Inhalte (inhalt.json), Spielstand (speicher.js), Lernlogik (leitner.js),
// Spielsystem (spiel.js) und die Bildschirme.

import { heute } from './datum.js';
import { beantworte, blockStufe, zaehle, waehleErnte, istFaellig } from './leitner.js';
import { levelAusXp, gebaeudeStatus, fehlendeVorstufen, kaufeGebaeude, belohnung, aktualisiereSerie, serieAnzeige, erzeugeAuftrag, waehleKlausur, werteKlausurAus } from './spiel.js';
import { lade, speichere, exportDatei, leseImport, loesche, neuerSpielstand, bitteUmDauerhaftenSpeicher } from './speicher.js';
import { baueAufgabe, loesungText, frageText, TYP_NAMEN } from './aufgaben-ui.js';
import { hofSvg, gebaeudeMini, dekoMini, beetMini } from './farm.js';
import { wachse, ernte, ernteBelohnung, anzahlReif, istVoll, STUFEN } from './feld.js';
import { belebe, pruefeTakt, tierPositionen, laeuft, tierAnzahl } from './leben.js';
import { formelHtml, esc } from './formel.js';
import { abbildungSvg } from './abbildungen.js';
import { SKIZZEN } from './skizzen.js';
import { klang, tonAn, entsperre } from './klang.js';

/* =====================================================================
   Zustand
   ===================================================================== */
let INHALT = null;    // inhalt.json
let CFG = null;       // Einstellungen aus inhalt.json
let S = null;         // Spielstand
let AUFGABE = {};     // Aufgaben-ID → Aufgabe
let BLOCK_VON = {};   // Aufgaben-ID → Block

const $ = (sel, el = document) => el.querySelector(sel);
const app = () => $('#app');

function speichern() {
  if (!speichere(S)) toast('Achtung: Der Browser hat das Speichern verweigert. Bitte exportiere deinen Spielstand.');
}

/* =====================================================================
   Start
   ===================================================================== */
async function start() {
  try {
    const antwort = await fetch('inhalt.json', { cache: 'no-cache' });
    INHALT = await antwort.json();
  } catch (e) {
    app().innerHTML = '<div class="karte" style="margin:20vh auto;max-width:520px"><h2>Inhalte nicht gefunden</h2><p>Die Datei <code>inhalt.json</code> konnte nicht geladen werden. Ist die App über einen Webserver geöffnet (nicht direkt als Datei)?</p></div>';
    return;
  }
  CFG = INHALT.einstellungen;
  for (const b of INHALT.bloecke) for (const a of b.aufgaben) { AUFGABE[a.id] = a; BLOCK_VON[a.id] = b; }
  S = lade(CFG);
  wendeEinstellungenAn();
  zeichneHof();
  window.addEventListener('resize', entprelle(() => { if (formatJetzt() !== letztesFormat) zeichneHof(); }, 150));
  // Tiere pausieren, solange ein Dialog oder Lernbildschirm offen ist
  new MutationObserver(() => pruefeTakt()).observe(document.body, { childList: true });
  setInterval(() => { if (S && tageszeit() !== document.documentElement.dataset.tageszeit) wendeEinstellungenAn(); }, 60000);
  entsperre();
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') schliesseDialog(); });
  // Safari (iPad) ignoriert „user-scalable=no“ teilweise – Pinch-Zoom zusätzlich abfangen.
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  bitteUmDauerhaftenSpeicher();
  if (!S.begruesst) zeigeWillkommen();
}

/** Tageszeit für die Stimmung des Himmels (nur Optik). */
function tageszeit(d = new Date()) {
  const h = d.getHours();
  if (h >= 5 && h < 9) return 'morgen';
  if (h >= 9 && h < 17) return 'tag';
  if (h >= 17 && h < 21) return 'abend';
  return 'nacht';
}
let letztesFormat = null;
function formatJetzt() { return innerWidth >= innerHeight ? 'quer' : 'hoch'; }

function entprelle(f, ms) { let t; return () => { clearTimeout(t); t = setTimeout(f, ms); }; }

function wendeEinstellungenAn() {
  const e = S.einstellungen;
  const root = document.documentElement;
  if (e.design === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', e.design);
  root.classList.toggle('ruhig', !e.animationen);
  tonAn(e.ton, e.tierlaute);
  const dunkel = e.design === 'dark' || (e.design === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.tageszeit = dunkel ? 'nacht' : e.tageszeit ? tageszeit() : 'tag';
  $('meta[name="theme-color"]').setAttribute('content', dunkel ? '#1b1d18' : '#f4eee2');
}

/* =====================================================================
   Hilfen: Quellen, Toasts, Dialoge, Konfetti
   ===================================================================== */
function quelleText(q) {
  return String(q).split(',').map((t) => t.trim()).map((t) => {
    const [k, s] = t.split('/');
    const qu = INHALT.quellen[k];
    return qu ? `${qu.kurz}, S. ${s}` : t;
  }).join(' · ');
}
function quelleTitel(q) {
  return String(q).split(',').map((t) => { const k = t.trim().split('/')[0]; return INHALT.quellen[k]?.datei || ''; }).join(', ');
}
function quelleHtml(q) { return `<span class="quelle" title="${esc(quelleTitel(q))}">Quelle: ${esc(quelleText(q))}</span>`; }
/** Kurze Quellenangabe für den Spickzettel, z. B. „Sagittal-Skript 3, 4“. */
function quelleKurz(q) {
  const teile = {};
  for (const t of String(q).split(',')) { const [k, s] = t.trim().split('/'); (teile[k] = teile[k] || []).push(s); }
  return `<span class="quelle" title="${esc(quelleTitel(q))}">${esc(Object.entries(teile).map(([k, s]) => `${INHALT.quellen[k]?.kurz || k} ${s.join(', ')}`).join(' · '))}</span>`;
}

function toast(text, ms = 3200) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

function oeffneDialog(html, { breit = false, onSchliessen = null } = {}) {
  schliesseDialog();
  const schleier = document.createElement('div');
  schleier.className = 'schleier';
  const blatt = document.createElement('div');
  blatt.className = 'blatt' + (breit ? ' breit' : '');
  blatt.setAttribute('role', 'dialog'); blatt.setAttribute('aria-modal', 'true');
  blatt.innerHTML = html;
  document.body.append(schleier, blatt);
  schleier.addEventListener('click', () => schliesseDialog());
  blatt.addEventListener('click', (e) => { if (e.target.closest('[data-schliessen]')) schliesseDialog(); });
  blatt._onSchliessen = onSchliessen;
  blatt.tabIndex = -1; // Fokus auf den Dialog (für Bildschirmleser), ohne einen Knopf vorzumarkieren
  blatt.focus({ preventScroll: true });
  return blatt;
}
function schliesseDialog() {
  const blatt = $('.blatt');
  if (blatt && blatt._onSchliessen) blatt._onSchliessen();
  document.querySelectorAll('.blatt, .schleier').forEach((e) => e.remove());
}
const kreuz = '<button class="rund-knopf" type="button" data-schliessen aria-label="Schließen"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>';

function konfetti() {
  if (!S.einstellungen.animationen || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const k = document.createElement('div');
  k.className = 'konfetti';
  const farben = ['var(--gold)', 'var(--akzent)', 'var(--wiese-2)', 'var(--dach)', 'var(--acker)'];
  k.innerHTML = Array.from({ length: 40 }, (_, i) => `<i style="left:${Math.random() * 100}%;background:${farben[i % farben.length]};animation-delay:${Math.random() * 0.6}s;animation-duration:${1.8 + Math.random()}s"></i>`).join('');
  document.body.appendChild(k);
  setTimeout(() => k.remove(), 3200);
}

/* =====================================================================
   Kennzahlen
   ===================================================================== */
function blockInfo(b, tag = heute()) {
  const ids = b.aufgaben.map((a) => a.id);
  const status = gebaeudeStatus(b, S, INHALT.bloecke, CFG);
  const st = blockStufe(ids, S.karten);
  const z = zaehle(ids, S.karten, tag);
  return { block: b, status, stufe: st.stufe, fortschritt: st.fortschritt, faellig: z.faellig, neu: z.neu, gesamt: z.gesamt, levelNoetig: b.level };
}
function produzierende() { return INHALT.bloecke.filter((b) => gebaeudeStatus(b, S, INHALT.bloecke, CFG) === 'produziert'); }

/* =====================================================================
   Hof (Startbildschirm)
   ===================================================================== */
const IKON = {
  hof: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 28V14L16 5l12 9v14z" fill="var(--dach)"/><path d="M11 28v-9h10v9" fill="var(--wand)"/><path d="M11 19l10 9M21 19l-10 9" stroke="var(--dach-2)" stroke-width="1.6"/></svg>',
  muenze: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="var(--gold)"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.5"/></svg>',
  serie: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21c0-6-4-7-4-11a4 4 0 0 1 8 0c0 4-4 5-4 11z" fill="var(--wiese-3)"/><path d="M12 14c2-3 6-3 7-6-3 0-6 1-7 6zM12 16c-2-2-5-2-6-4 2 0 5 0 6 4z" fill="var(--wiese-2)"/></svg>',
  zahnrad: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.6 4.6l1.9 1.5-2 3.4-2.3-.9a7.6 7.6 0 0 1-1.7 1l-.3 2.4h-4l-.3-2.4a7.6 7.6 0 0 1-1.7-1l-2.3.9-2-3.4 1.9-1.5a7.7 7.7 0 0 1 0-2l-1.9-1.5 2-3.4 2.3.9a7.6 7.6 0 0 1 1.7-1L10 2.5h4l.3 2.4a7.6 7.6 0 0 1 1.7 1l2.3-.9 2 3.4-1.9 1.5a7.7 7.7 0 0 1 0 2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  auftrag: '<svg viewBox="0 0 34 34" aria-hidden="true"><rect x="5" y="12" width="24" height="16" rx="3" fill="var(--holz-hell)"/><path d="M5 18h24" stroke="var(--holz)" stroke-width="2"/><circle cx="12" cy="10" r="4" fill="var(--dach)"/><circle cx="19" cy="9" r="4" fill="var(--acker)"/><circle cx="24" cy="11" r="3.5" fill="var(--wiese-2)"/></svg>',
  klausur: '<svg viewBox="0 0 34 34" aria-hidden="true"><rect x="7" y="4" width="20" height="26" rx="3" fill="var(--karte)" stroke="var(--tinte-2)" stroke-width="2"/><path d="M11 11h12M11 16h12M11 21h7" stroke="var(--tinte-3)" stroke-width="2" stroke-linecap="round"/><circle cx="25" cy="25" r="6" fill="var(--akzent)"/><path d="M25 22v3l2 1.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>',
  spick: '<svg viewBox="0 0 34 34" aria-hidden="true"><path d="M6 6h16l6 6v16H6z" fill="var(--gold-hell)" stroke="var(--gold)" stroke-width="2"/><path d="M10 14h14M10 19h14M10 24h9" stroke="var(--tinte-3)" stroke-width="2" stroke-linecap="round"/></svg>',
  korn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22V8" stroke="#b98a2c" stroke-width="1.6" stroke-linecap="round"/><g fill="#e9b949"><ellipse cx="9.3" cy="9" rx="2.2" ry="3.2" transform="rotate(-25 9.3 9)"/><ellipse cx="14.7" cy="9" rx="2.2" ry="3.2" transform="rotate(25 14.7 9)"/><ellipse cx="9.3" cy="14" rx="2.2" ry="3.2" transform="rotate(-25 9.3 14)"/><ellipse cx="14.7" cy="14" rx="2.2" ry="3.2" transform="rotate(25 14.7 14)"/><ellipse cx="12" cy="4.6" rx="2" ry="3"/></g></svg>',
  markt: '<svg viewBox="0 0 34 34" aria-hidden="true"><path d="M4 12l3-6h20l3 6z" fill="var(--dach)"/><path d="M4 12h26v3H4z" fill="var(--dach-2)"/><rect x="7" y="15" width="20" height="13" fill="var(--wand)"/><circle cx="13" cy="22" r="3" fill="var(--dach)"/><circle cx="21" cy="22" r="3" fill="var(--acker)"/></svg>',
};

function zeichneHof() {
  if (!INHALT) return;
  if ($('.lernen')) return; // während einer Lerneinheit nicht neu zeichnen
  const tag = heute();
  const infos = INHALT.bloecke.map((b) => blockInfo(b, tag));
  const lv = levelAusXp(S.xp, CFG.levelXp);
  const serie = serieAnzeige(S.serie, tag);
  aktualisiereAuftraege();
  const format = formatJetzt();
  letztesFormat = format;
  const serieText = serie.status === 'heute' ? 'heute geschafft' : serie.status === 'offen' ? 'heute noch offen' : serie.status === 'schutz' ? 'Schutztag aktiv – heute lernen!' : 'Tagesserie';
  const reifKorn = infos.reduce((s, i) => s + anzahlReif(S.felder[i.block.id]), 0);
  app().innerHTML = `
    <header class="kopf">
      <div class="marke">${IKON.hof}<span>Statik-Hof</span></div>
      <button class="chip level" type="button" data-aktion="info-level" aria-label="Level ${lv.level}, ${lv.imLevel} von ${lv.spanne} Erfahrungspunkten">
        <span>Lv <span class="lv-zahl">${lv.level}</span></span><span class="xp-balken"><i style="width:${Math.round((lv.imLevel / lv.spanne) * 100)}%"></i></span></button>
      <button class="chip korn-chip" type="button" data-aktion="info-korn" aria-label="${S.korn} Korn geerntet">${IKON.korn}<span class="korn-zahl">${S.korn}</span></button>
      <span class="chip muenz-chip" aria-label="${S.muenzen} Münzen">${IKON.muenze}<span class="muenz-zahl">${S.muenzen}</span></span>
      <button class="chip" type="button" data-aktion="info-serie" aria-label="Tagesserie ${serie.tage} Tage, ${serieText}">${IKON.serie}<span>${serie.tage}</span></button>
      <button class="rund-knopf" type="button" data-aktion="einstellungen" aria-label="Einstellungen">${IKON.zahnrad}</button>
    </header>
    <main class="hof-seite">
      <section class="hof-buehne ${format}" aria-label="Dein Hof">${hofSvg(infos, S.felder, S.deko, format)}
      <nav class="leiste" aria-label="Hof-Aktionen">
        <button class="leisten-knopf" type="button" data-aktion="auftraege">${IKON.auftrag}<div><b>Aufträge</b><span>Mischaufgaben ×${CFG.auftragFaktor}</span></div>${S.auftraege.length ? `<span class="zahl">${S.auftraege.length}</span>` : ''}</button>
        <button class="leisten-knopf" type="button" data-aktion="klausur">${IKON.klausur}<div><b>Probeklausur</b><span>${S.einstellungen.klausurFragen} Fragen · ${S.einstellungen.klausurMinuten} Min.</span></div></button>
        <button class="leisten-knopf" type="button" data-aktion="spick">${IKON.spick}<div><b>Spickzettel</b><span>Formeln & Merksätze</span></div></button>
        <button class="leisten-knopf" type="button" data-aktion="markt">${IKON.markt}<div><b>Markt</b><span>Deko für deinen Hof</span></div></button>
        <div class="tipp" aria-live="polite">${hofTipp(infos, lv, reifKorn)}</div>
      </nav></section>
    </main>`;
  const e = S.einstellungen;
  belebe($('.hof-svg'), {
    format, level: lv.level, tiere: e.tiere,
    bewegt: e.animationen && !matchMedia('(prefers-reduced-motion: reduce)').matches,
    klangFn: (art) => klang[art]?.(),
  });
  app().onclick = hofKlick;
  app().onkeydown = (ev) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const beet = ev.target.closest('.beet.hat-reif');
    if (beet) { ev.preventDefault(); return ernteBeet(beet.dataset.feld); }
    if (ev.target.closest('.geb')) { ev.preventDefault(); oeffneGebaeude(ev.target.closest('.geb').dataset.block); }
  };
}

function hofTipp(infos, lv, reifKorn) {
  const aktiv = infos.filter((i) => i.status === 'produziert');
  const faellig = aktiv.reduce((s, i) => s + i.faellig, 0);
  const kaufbar = infos.find((i) => i.status === 'kaufbar');
  if (reifKorn > 0) return `🌾 <b>${reifKorn} Korn</b> ist reif. Tippe auf das goldene Beet, um zu ernten.`;
  if (faellig > 0) return `✨ <b>${faellig} Wiederholungen</b> sind fällig – die leuchtenden Beete warten. Tippe ein Gebäude an.`;
  if (kaufbar && S.muenzen >= kaufbar.block.preis) return `🔨 Du kannst jetzt <b>${esc(kaufbar.block.gebaeude.name)}</b> bauen!`;
  const neu = aktiv.reduce((s, i) => s + i.neu, 0);
  if (kaufbar) return `🪙 Für ${esc(kaufbar.block.gebaeude.name)} fehlen noch ${kaufbar.block.preis - S.muenzen} Münzen. Lerne, lass Korn wachsen und ernte es.`;
  const ruht = infos.find((i) => i.status === 'ruht');
  if (ruht) { const f = fehlendeVorstufen(ruht.block, S, INHALT.bloecke, CFG).map((v) => v.gebaeude.name).join(' und '); return `🌱 ${esc(ruht.block.gebaeude.name)} ruht noch. Lerne zuerst mehr hier: ${esc(f)}.`; }
  if (neu > 0) return `✨ Es warten noch <b>${neu} neue Aufgaben</b> auf dich. Jede richtige Antwort lässt Korn wachsen.`;
  return `Heute ist nichts mehr fällig – stark! Level ${lv.level + 1} in ${lv.bisNaechstes} XP. Eine Probeklausur hält dich in Form.`;
}

function hofKlick(e) {
  const beet = e.target.closest('.beet');
  if (beet && beet.classList.contains('hat-reif')) return ernteBeet(beet.dataset.feld);
  const geb = e.target.closest('.geb') || (beet && $(`.geb[data-block="${beet.dataset.feld}"]`));
  if (geb) return oeffneGebaeude(geb.dataset.block);
  const a = e.target.closest('[data-aktion]');
  if (!a) return;
  ({
    auftraege: zeigeAuftraege, klausur: zeigeKlausurStart, spick: () => zeigeSpickzettel(), markt: zeigeMarkt,
    einstellungen: zeigeEinstellungen, 'info-serie': zeigeSerieInfo, 'info-level': zeigeLevelInfo, 'info-korn': zeigeKornInfo,
  })[a.dataset.aktion]?.();
}

/* =====================================================================
   Korn ernten (auf dem Hof, durch Antippen eines reifen Beets)
   ===================================================================== */
let ernteLaeuft = false;
function ernteBeet(blockId) {
  if (ernteLaeuft) return;
  const feld = S.felder[blockId];
  if (!anzahlReif(feld)) return;
  ernteLaeuft = true;
  const lvVorher = levelAusXp(S.xp, CFG.levelXp).level;
  const alt = { korn: S.korn, muenzen: S.muenzen };
  const erg = ernte(feld);
  const bel = ernteBelohnung(erg.anzahl, CFG);
  S.felder[blockId] = erg.feld;
  S.korn += bel.korn; S.muenzen += bel.muenzen; S.xp += bel.xp;
  S.statistik.kornGeerntet = (S.statistik.kornGeerntet || 0) + bel.korn;
  speichern();
  const lvNachher = levelAusXp(S.xp, CFG.levelXp).level;

  const beet = $(`.beet[data-feld="${blockId}"]`);
  const bewegt = S.einstellungen.animationen && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  klang.ernte();
  beet?.classList.add('erntet');
  const ziel = $('.korn-chip')?.getBoundingClientRect();
  const muenzZiel = $('.muenz-chip')?.getBoundingClientRect();
  const pflanzen = erg.indizes.map((i) => beet?.querySelector(`[data-platz="${i}"]`)).filter(Boolean);
  const r0 = beet?.getBoundingClientRect();
  if (r0) plusText(r0.left + r0.width / 2, r0.top, `+${bel.muenzen} 🪙  +${bel.xp} XP`);
  const dauer = bewegt ? 900 : 0;
  pflanzen.forEach((p, k) => {
    const r = p.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 3;
    if (bewegt) {
      funken(x, y, 5);
      setTimeout(() => fliege(x, y, ziel, IKON.korn, () => { klang.korn(k); stups('.korn-chip'); }), 350 + k * 90);
      setTimeout(() => fliege(x, y, muenzZiel, IKON.muenze, () => stups('.muenz-chip')), 520 + k * 90);
    }
  });
  const ende = 350 + pflanzen.length * 90 + dauer;
  zaehleZahl($('.korn-zahl'), alt.korn, S.korn, ende);
  zaehleZahl($('.muenz-zahl'), alt.muenzen, S.muenzen, ende + 150);
  setTimeout(() => {
    ernteLaeuft = false;
    if ($('.lernen')) return;
    zeichneHof();
    if (lvNachher > lvVorher) levelAufstieg(lvVorher, lvNachher);
    else toast(`${bel.korn} Korn geerntet: +${bel.muenzen} Münzen, +${bel.xp} XP 🌾`);
  }, bewegt ? ende + 450 : 50);
}

function levelAufstieg(vorher, nachher) {
  const neuBaubar = INHALT.bloecke.filter((b) => b.level > vorher && b.level <= nachher);
  konfetti(); setTimeout(() => klang.level(), 200);
  const anz = tierAnzahl(nachher), alt = tierAnzahl(vorher);
  const tiere = [];
  if (anz.pferde > alt.pferde) tiere.push('ein Pferd');
  if (anz.huehner > alt.huehner) tiere.push('ein Huhn');
  if (anz.kueken > alt.kueken) tiere.push('ein Küken');
  oeffneDialog(`<div class="blatt-kopf"><h2>Level ${nachher}! 🎉</h2>${kreuz}</div>
    ${neuBaubar.length ? `<p>Jetzt kannst du ${neuBaubar.map((b) => `<b>${esc(b.gebaeude.name)}</b> (${esc(b.titel)})`).join(' und ')} bauen.</p>` : '<p>Dein Hof wächst weiter.</p>'}
    ${tiere.length && S.einstellungen.tiere ? `<p>Neu auf deinem Hof: ${tiere.join(', ')}.</p>` : ''}
    <div class="reihe ende"><button class="knopf" type="button" data-schliessen>Weiter</button></div>`);
}

function stups(sel) { const c = $(sel); if (!c) return; c.classList.remove('stupser'); void c.getBoundingClientRect(); c.classList.add('stupser'); }

function zaehleZahl(el, von, bis, ms) {
  if (!el) return;
  if (!S.einstellungen.animationen || ms <= 0) { el.textContent = bis; return; }
  const t0 = performance.now();
  const f = (t) => { const p = Math.min(1, (t - t0) / ms); el.textContent = Math.round(von + (bis - von) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); };
  requestAnimationFrame(f);
}

/** Ein Korn/Münze fliegt im Bogen von (x,y) zum Ziel-Element. */
function fliege(x, y, ziel, svg, fertig) {
  if (!ziel) { fertig?.(); return; }
  const el = document.createElement('div');
  el.className = 'flieger'; el.innerHTML = svg;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  document.body.appendChild(el);
  const zx = ziel.left + 26 - x, zy = ziel.top + ziel.height / 2 - y;
  const hoch = Math.min(-60, zy * 0.4 - 80);
  const anim = el.animate([
    { transform: 'translate(0,0) scale(.6)', opacity: 0 },
    { transform: `translate(${zx * 0.3}px,${hoch}px) scale(1.3)`, opacity: 1, offset: 0.35 },
    { transform: `translate(${zx}px,${zy}px) scale(.8)`, opacity: 1 },
  ], { duration: 750, easing: 'cubic-bezier(.4,0,.6,1)' });
  anim.onfinish = () => { el.remove(); fertig?.(); };
}

/** Kleine Funken an einer Stelle. */
function funken(x, y, n = 8) {
  if (!S.einstellungen.animationen) return;
  for (let i = 0; i < n; i++) {
    const f = document.createElement('i');
    f.className = 'funken';
    f.style.left = x + 'px'; f.style.top = y + 'px';
    f.style.background = ['var(--gold)', '#fff3c4', 'var(--korn)'][i % 3];
    document.body.appendChild(f);
    const w = (i / n) * Math.PI * 2 + Math.random() * 0.5, r = 26 + Math.random() * 26;
    f.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(w) * r}px,${Math.sin(w) * r - 10}px) scale(.2)`, opacity: 0 }], { duration: 600 + Math.random() * 300, easing: 'ease-out' }).onfinish = () => f.remove();
  }
}

function plusText(x, y, text) {
  const el = document.createElement('div');
  el.className = 'plus-text'; el.textContent = text;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  document.body.appendChild(el);
  if (!S.einstellungen.animationen) { setTimeout(() => el.remove(), 1500); return; }
  el.animate([{ transform: 'translate(-50%,-30%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-90%) scale(1.1)', opacity: 1, offset: 0.25 }, { transform: 'translate(-50%,-200%) scale(1)', opacity: 0 }], { duration: 1600, easing: 'ease-out' }).onfinish = () => el.remove();
}

function zeigeKornInfo() {
  const zeilen = INHALT.bloecke.filter((b) => ['produziert', 'ruht'].includes(gebaeudeStatus(b, S, INHALT.bloecke, CFG))).map((b) => {
    const f = S.felder[b.id];
    const p = f ? f.pflanzen : [0, 0, 0, 0, 0, 0];
    return `<div class="korn-zeile"><b>${esc(b.gebaeude.name)}</b>${beetMini(f)}<span class="klein">${anzahlReif(f)} reif · ${p.filter((x) => x > 0 && x < 4).length} wachsen</span></div>`;
  }).join('');
  oeffneDialog(`<div class="blatt-kopf"><h2>🌾 ${S.korn} Korn geerntet</h2>${kreuz}</div>
    <p>Jede <b>richtige Antwort</b> lässt das Korn im Beet des passenden Gebäudes wachsen: Saat → Spross → Halm → reif. Nach vier richtigen Antworten ist das erste Korn reif.</p>
    <p>Reifes Korn erntest du auf dem Hof durch Antippen: je Korn <b>${CFG.muenzenProKorn ?? 5} Münzen</b> und <b>${CFG.xpProKorn ?? 2} XP</b>. Falsche Antworten kosten nichts – es wächst dann nur nichts.</p>
    <div class="korn-liste">${zeilen || '<p class="klein">Noch kein Beet – tippe dein Kornfeld an und beginne eine Lernrunde.</p>'}</div>`);
}

/* =====================================================================
   Gebäude-Dialog
   ===================================================================== */
function sterneHtml(stufe) { return `<span class="sterne" aria-label="Beherrschung ${stufe} von 5">${Array.from({ length: 5 }, (_, i) => `<i class="${i < stufe ? 'an' : ''}"></i>`).join('')}</span>`; }

function oeffneGebaeude(id) {
  const b = INHALT.bloecke.find((x) => x.id === id);
  const info = blockInfo(b);
  const lv = levelAusXp(S.xp, CFG.levelXp).level;
  const vorstufenHtml = b.vorstufen.length ? `<p class="klein">Produktionskette: braucht ${b.vorstufen.map((v) => { const vb = INHALT.bloecke.find((x) => x.id === v); const anteil = Math.round(vb.aufgaben.filter((a) => S.karten[a.id]?.box >= 2).length / vb.aufgaben.length * 100); return `<b>${esc(vb.gebaeude.name)}</b> (${anteil} % gelernt, nötig ${Math.round(CFG.produktionsSchwelle * 100)} %)`; }).join(' und ')}.</p>` : '';
  let haupt = '';
  if (info.status === 'gesperrt') haupt = `<div class="hinweis-box warm">🔒 Dieses Gebäude kannst du ab <b>Level ${b.level}</b> bauen (du bist Level ${lv}). Sammle Erfahrung durch Lernrunden, Aufträge und Korn-Ernten.</div>`;
  else if (info.status === 'kaufbar') haupt = `<div class="hinweis-box warm">Bereit zum Bauen! Kosten: <b>${b.preis} Münzen</b> (du hast ${S.muenzen}).</div>
    <div class="reihe ende"><button class="knopf" type="button" data-bauen ${S.muenzen < b.preis ? 'disabled' : ''}>🔨 ${esc(b.gebaeude.name)} bauen</button></div>`;
  else if (info.status === 'ruht') {
    const f = fehlendeVorstufen(b, S, INHALT.bloecke, CFG).map((v) => v.gebaeude.name).join(' und ');
    haupt = `<div class="hinweis-box warm">🌱 Gebaut, aber die Produktion ruht noch: Erst muss das Vorstufenwissen aus <b>${esc(f)}</b> sitzen (mindestens ${Math.round(CFG.produktionsSchwelle * 100)} % der Aufgaben einmal richtig beantwortet). So siehst du die Lernreihenfolge.</div>`;
  } else {
    haupt = `<div class="statistik"><div><b>${info.faellig}</b><span>fällig</span></div><div><b>${info.neu}</b><span>neu</span></div><div><b>${info.gesamt}</b><span>Aufgaben</span></div></div>
      <div class="reihe ende">${anzahlReif(S.felder[id]) ? '<button class="knopf zweit" type="button" data-korn-ernten>🌾 ${anzahlReif(S.felder[id])} Korn ernten</button>' : ''}<button class="knopf" type="button" data-ernten>📚 Lernrunde (${Math.min(S.einstellungen.ernteAufgaben, info.gesamt)} Aufgaben)</button></div>`;
  }
  const skizzen = SKIZZEN.filter((s) => s.block === id);
  const blatt = oeffneDialog(`
    <div class="blatt-kopf">${gebaeudeMini(b.gebaeude.typ, info.status === 'produziert')}<div><h2>${esc(b.gebaeude.name)}</h2><p class="klein" style="margin:0">${esc(b.titel)}</p>
      <p style="margin:.3em 0 0">${sterneHtml(info.stufe)} <span class="klein">Beherrschung ${info.stufe}/5</span></p></div>${kreuz}</div>
    <p class="klein">${esc(b.gebaeude.warum)}</p>
    ${vorstufenHtml}${haupt}
    <div class="reihe" style="margin-top:14px">
      <button class="knopf zweit" type="button" data-nachlesen>📖 Nachlesen</button>
      ${skizzen.map((s) => `<button class="knopf zweit" type="button" data-skizze="${s.id}">🛠️ ${esc(s.titel)}</button>`).join('')}
    </div>
    <p class="klein" style="margin-top:12px">Die Beherrschung steigt nur durch richtige Antworten über mehrere Tage (Wiederholung nach 1, 3, 7 und 14 Tagen).</p>`);
  blatt.addEventListener('click', (e) => {
    if (e.target.closest('[data-ernten]')) { schliesseDialog(); starteErnte(id); }
    if (e.target.closest('[data-korn-ernten]')) { schliesseDialog(); setTimeout(() => ernteBeet(id), 60); }
    if (e.target.closest('[data-bauen]')) {
      const erg = kaufeGebaeude(b, S, CFG);
      if (erg.fehler) return toast(erg.fehler);
      S = erg.zustand; speichern(); klang.muenze(); konfetti();
      schliesseDialog(); zeichneHof();
      setTimeout(() => $(`.geb[data-block="${id}"]`)?.classList.add('geb-hupf'), 50);
      toast(`${b.gebaeude.name} ist gebaut! 🎉`);
    }
    if (e.target.closest('[data-nachlesen]')) zeigeNachlesen(id);
    const sk = e.target.closest('[data-skizze]');
    if (sk) zeigeSkizze(sk.dataset.skizze);
  });
}

/* =====================================================================
   Lernrunde (Gebäude) und Auftrag
   Jede richtige Antwort lässt Korn im Beet des passenden Gebäudes wachsen.
   ===================================================================== */
function starteErnte(blockId) {
  const b = INHALT.bloecke.find((x) => x.id === blockId);
  const ids = waehleErnte(b.aufgaben.map((a) => a.id), S.karten, heute(), Math.min(S.einstellungen.ernteAufgaben, b.aufgaben.length));
  const ort = { kornfeld: 'im Kornfeld', brunnen: 'am Brunnen', muehle: 'in der Mühle', stall: 'im Stall', scheune: 'in der Scheune', werkstatt: 'in der Werkstatt', imkerei: 'in der Imkerei', baeckerei: 'in der Bäckerei' }[b.gebaeude.typ] || `bei: ${b.gebaeude.name}`;
  starteSitzung({ art: 'ernte', titel: `Lernrunde ${ort}`, blockId, ids, faktor: 1 });
}

/** Darf im Beet dieses Blocks Korn wachsen? (Gebäude muss gebaut sein.) */
function beetAktiv(blockId) {
  const b = INHALT.bloecke.find((x) => x.id === blockId);
  const st = gebaeudeStatus(b, S, INHALT.bloecke, CFG);
  return st === 'produziert' || st === 'ruht';
}

/** Lässt das Beet eines Blocks wachsen. Liefert das Ergebnis von wachse() oder null. */
function lasseWachsen(blockId) {
  if (!beetAktiv(blockId)) return null;
  const erg = wachse(S.felder[blockId]);
  S.felder[blockId] = erg.feld;
  return erg;
}

function starteSitzung({ art, titel, ids, faktor, blockId = null, auftragId = null }) {
  const sitzung = { art, titel, blockId, auftragId, faktor, ids, queue: ids.map((id) => ({ id, versuch: 1 })), pos: 0, ergebnis: Object.fromEntries(ids.map((id) => [id, ''])), sofort: 0, spaeter: 0, gewachsen: 0, neuReif: 0, beete: new Set(), vorherStatus: Object.fromEntries(INHALT.bloecke.map((b) => [b.id, gebaeudeStatus(b, S, INHALT.bloecke, CFG)])) };
  const el = document.createElement('div');
  el.className = 'lernen';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', titel);
  document.body.appendChild(el);
  zeigeSitzungsAufgabe(el, sitzung);
}

function beetStreifen(blockId, hervorheben = []) {
  const b = INHALT.bloecke.find((x) => x.id === blockId);
  if (!beetAktiv(blockId)) return `<div class="beet-streifen ruht" aria-label="Beet ${esc(b.gebaeude.name)}: noch nicht gebaut">${beetMini(null)}<div class="beet-text"><b>${esc(b.gebaeude.name)}</b>noch nicht gebaut</div></div>`;
  const f = S.felder[blockId];
  const reif = anzahlReif(f);
  const text = istVoll(f) ? 'Beet voll – auf dem Hof ernten!' : reif ? `${reif} reif` : 'Richtig = Korn wächst';
  return `<div class="beet-streifen" role="img" aria-label="Beet ${esc(b.gebaeude.name)}: ${(f?.pflanzen || []).map((s) => STUFEN[s]).join(', ')}">${beetMini(f, hervorheben)}<div class="beet-text"><b>${esc(b.gebaeude.name)}</b>${text}</div></div>`;
}

function zeigeSitzungsAufgabe(el, s) {
  const eintrag = s.queue[s.pos];
  if (!eintrag) return beendeSitzung(el, s);
  const a = AUFGABE[eintrag.id];
  const block = BLOCK_VON[a.id];
  el.innerHTML = `
    <div class="lern-kopf">
      <button class="rund-knopf" type="button" data-abbrechen aria-label="Lernrunde beenden"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
      <div><h1>${esc(s.titel)}</h1><p class="klein">${eintrag.versuch > 1 ? '🔁 Zweiter Versuch · ' : ''}Aufgabe ${Math.min(s.pos + 1, s.queue.length)} von ${s.queue.length}</p>
        <div class="fortschritt" aria-hidden="true">${s.queue.map((q, i) => `<i class="${i < s.pos ? (s.ergebnis[q.id] === 'richtig' ? 'ok' : 'offen') : i === s.pos ? 'jetzt' : ''}"></i>`).join('')}</div></div>
      <div class="beet-ort">${beetStreifen(block.id)}</div>
    </div>
    <article class="karte" aria-live="polite">
      <div class="aufgabe-ort"></div>
      <div class="rueck-ort"></div>
      <div class="aktionen"><button class="knopf" type="button" data-pruefen disabled>Prüfen</button></div>
    </article>`;
  el.scrollTop = 0;
  const pruefenKnopf = $('[data-pruefen]', el);
  const ctl = baueAufgabe($('.aufgabe-ort', el), a, { onAenderung: () => { pruefenKnopf.disabled = !ctl.bereit(); } });
  pruefenKnopf.disabled = !ctl.bereit();
  $('.aufgabe-ort', el).addEventListener('enter', () => { if (!pruefenKnopf.disabled) pruefenKnopf.click(); });
  pruefenKnopf.addEventListener('click', () => {
    const erg = ctl.pruefe();
    const mitLoesung = ctl.mitLoesung();
    const zaehltRichtig = erg.richtig && !mitLoesung;
    S.karten[a.id] = beantworte(S.karten[a.id], zaehltRichtig, heute(), CFG.intervalleTage);
    S.statistik.antworten++;
    if (zaehltRichtig) S.statistik.richtig++;
    let titel, text, klasse, wachsText = '';
    if (zaehltRichtig) {
      s.ergebnis[a.id] = 'richtig';
      if (eintrag.versuch === 1) s.sofort++; else s.spaeter++;
      const w = lasseWachsen(block.id);
      klang.richtig();
      if (w) {
        s.beete.add(block.id);
        s.gewachsen++; s.neuReif += w.neuReif.length;
        const hervor = [...w.gewachsen, ...(w.gesaet !== null ? [w.gesaet] : [])];
        $('.beet-ort', el).innerHTML = beetStreifen(block.id, hervor);
        if (hervor.length) setTimeout(() => klang.wachsen(), 180);
        wachsText = w.neuReif.length ? `🌾 ${w.neuReif.length} Korn ist reif geworden!` : w.gesaet !== null || w.gewachsen.length ? '🌱 Dein Korn wächst.' : '🌾 Dein Beet ist voll reif – ernte es auf dem Hof.';
      }
      titel = eintrag.versuch === 1 ? lob() : 'Jetzt sitzt es! 🌱';
      klasse = 'gut';
      text = '';
    } else {
      klang.nochmal();
      klasse = 'weiter';
      s.ergebnis[a.id] = 'nochmal';
      if (erg.richtig && mitLoesung) titel = 'Mit Lösungsweg geschafft – sehr gut nachvollzogen';
      else titel = 'Noch nicht ganz – kein Problem';
      if (eintrag.versuch === 1) { s.queue.push({ id: a.id, versuch: 2 }); text = 'Die Aufgabe kommt in dieser Runde gleich noch einmal. Dein Korn wartet so lange.'; }
      else text = 'Sie kommt in deiner nächsten Lernrunde wieder – so festigt sich das Wissen.';
    }
    const zusatz = a.typ === 'rechnen' && !erg.richtig && erg.zahlOk && !erg.einheitOk ? '<p><b>Die Zahl stimmt</b> – aber die Einheit fehlt oder passt nicht.</p>' : '';
    $('.rueck-ort', el).innerHTML = `<div class="rueckmeldung ${klasse}" role="status">
      <h3>${zaehltRichtig ? '✅' : '💡'} ${esc(titel)}</h3>${zusatz}${wachsText ? `<p class="wachs-text">${wachsText}</p>` : ''}
      ${!zaehltRichtig ? `<p class="loesung-text">Richtig ist: ${esc(loesungText(a))}</p>` : ''}
      <p>${esc(a.erklaerung)}</p>${text ? `<p class="klein">${esc(text)}</p>` : ''}
      ${quelleHtml(a.quelle)}</div>`;
    speichern();
    pruefenKnopf.remove();
    const weiter = document.createElement('button');
    weiter.className = 'knopf'; weiter.type = 'button';
    weiter.textContent = s.pos + 1 < s.queue.length ? 'Weiter' : (s.art === 'auftrag' ? 'Auftrag liefern' : 'Runde abschließen');
    $('.aktionen', el).appendChild(weiter);
    weiter.focus({ preventScroll: true });
    $('.rueck-ort', el).scrollIntoView({ behavior: S.einstellungen.animationen ? 'smooth' : 'auto', block: 'nearest' });
    weiter.addEventListener('click', () => { s.pos++; zeigeSitzungsAufgabe(el, s); });
  });
  $('[data-abbrechen]', el).addEventListener('click', () => {
    const beantwortet = Object.values(s.ergebnis).some((k) => k);
    if (!beantwortet || confirm('Lernrunde beenden? Deine Antworten und dein gewachsenes Korn sind gespeichert. Die XP für die Runde gibt es aber nur, wenn du sie abschließt.')) {
      el.remove(); zeichneHof();
    }
  });
}

const LOBE = ['Richtig! 🌾', 'Genau so! ✨', 'Sitzt! 👏', 'Stark! 🌻', 'Prima! 🍎', 'Volltreffer! 🎯'];
function lob() { return LOBE[Math.floor(Math.random() * LOBE.length)]; }

function beendeSitzung(el, s) {
  const lvVorher = levelAusXp(S.xp, CFG.levelXp).level;
  const bel = belohnung(s.sofort, s.spaeter, s.faktor, CFG);
  // Lernrunde: nur XP (Münzen gibt es beim Korn-Ernten). Auftrag: XP und Münzen ×Faktor.
  const muenzen = s.art === 'auftrag' ? bel.muenzen : 0;
  S.xp += bel.xp; S.muenzen += muenzen;
  if (s.art === 'ernte') S.statistik.ernten++;
  if (s.art === 'auftrag') { S.statistik.auftraege++; S.auftraege = S.auftraege.filter((x) => x.id !== s.auftragId); }
  const { serie, ereignis } = aktualisiereSerie(S.serie, heute());
  S.serie = serie;
  const lvNachher = levelAusXp(S.xp, CFG.levelXp).level;
  const neuProduziert = INHALT.bloecke.filter((b) => s.vorherStatus[b.id] !== 'produziert' && gebaeudeStatus(b, S, INHALT.bloecke, CFG) === 'produziert');
  const neuBaubar = lvNachher > lvVorher ? INHALT.bloecke.filter((b) => b.level > lvVorher && b.level <= lvNachher) : [];
  speichern();
  klang.ernte();
  const richtig = Object.values(s.ergebnis).filter((k) => k === 'richtig').length;
  const reifGesamt = [...s.beete].reduce((n, id) => n + anzahlReif(S.felder[id]), 0);
  const serieText = { neu: '🌱 Deine Tagesserie hat begonnen!', weiter: `🌱 Tagesserie: ${serie.tage} Tage in Folge!`, gerettet: `🌱 Ein Ausfalltag wurde aufgefangen – deine Serie läuft weiter (${serie.tage} Tage). Der Schutz gilt einmal pro Woche.`, zurueckgesetzt: '🌱 Neue Tagesserie gestartet – schön, dass du wieder da bist!', schon: `🌱 Tagesserie: ${serie.tage} Tage – heute schon geschafft.` }[ereignis];
  el.innerHTML = `<div class="ergebnis">
    <h1>${s.art === 'auftrag' ? 'Auftrag geliefert!' : 'Runde geschafft!'}</h1>
    <div class="ergebnis-beete">${[...s.beete].map((id) => beetStreifen(id)).join('') || ''}</div>
    <p class="gross">${richtig} / ${s.ids.length}</p>
    <p>${richtig === s.ids.length ? 'Alles gewusst – wunderbar!' : 'Was noch nicht saß, kommt bald wieder – genau so funktioniert gutes Lernen.'}</p>
    <div class="belohnung"><span class="chip">⭐ +<span data-zaehl="${bel.xp}">0</span> XP</span>${muenzen ? `<span class="chip">${IKON.muenze} +<span data-zaehl="${muenzen}">0</span></span>` : ''}</div>
    ${reifGesamt ? `<div class="hinweis-box warm">🌾 <b>${reifGesamt} Korn ist reif.</b> Tippe auf dem Hof auf das goldene Beet, um es zu ernten – dafür gibt es Münzen.</div>` : s.gewachsen ? '<p class="klein">🌱 Dein Korn ist gewachsen. Noch ein paar richtige Antworten, dann ist es reif.</p>' : ''}
    <p class="klein">${serieText}</p>
    ${lvNachher > lvVorher ? `<div class="hinweis-box warm"><b>Level ${lvNachher}!</b> ${neuBaubar.length ? `Jetzt kannst du ${neuBaubar.map((b) => `<b>${esc(b.gebaeude.name)}</b>`).join(' und ')} bauen.` : ''}</div>` : ''}
    ${neuProduziert.map((b) => `<div class="hinweis-box gut">🏭 <b>${esc(b.gebaeude.name)}</b> produziert jetzt – das Vorstufenwissen sitzt!</div>`).join('')}
    <div class="reihe" style="justify-content:center;margin-top:20px">
      <button class="knopf ${reifGesamt ? '' : 'zweit'}" type="button" data-zurueck>${reifGesamt ? '🌾 Zum Hof – ernten' : 'Zum Hof'}</button>
      ${s.art === 'ernte' ? `<button class="knopf ${reifGesamt ? 'zweit' : ''}" type="button" data-nochmal>Noch eine Runde</button>` : ''}
    </div></div>`;
  if (lvNachher > lvVorher || richtig === s.ids.length) { konfetti(); if (lvNachher > lvVorher) setTimeout(klang.level, 500); }
  zaehleHoch(el);
  $('[data-zurueck]', el).addEventListener('click', () => {
    el.remove(); zeichneHof();
    const ziel = s.blockId || [...s.beete][0];
    if (ziel) setTimeout(() => $(`.geb[data-block="${ziel}"]`)?.classList.add('geb-hupf'), 80);
  });
  $('[data-nochmal]', el)?.addEventListener('click', () => { el.remove(); zeichneHof(); starteErnte(s.blockId); });
}

function zaehleHoch(el) {
  el.querySelectorAll('[data-zaehl]').forEach((z) => {
    const ziel = Number(z.dataset.zaehl);
    if (!S.einstellungen.animationen) { z.textContent = ziel; return; }
    const t0 = performance.now();
    const schritt = (t) => { const p = Math.min(1, (t - t0) / 900); z.textContent = Math.round(ziel * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(schritt); };
    requestAnimationFrame(schritt);
  });
}

/* =====================================================================
   Aufträge
   ===================================================================== */
function aktualisiereAuftraege() {
  const prod = produzierende();
  if (prod.length < 2) return;
  // Aufträge mit Aufgaben, die es nicht mehr gibt, entfernen; auf 3 auffüllen.
  S.auftraege = S.auftraege.filter((x) => x.aufgaben.every((id) => AUFGABE[id]));
  let geaendert = false;
  while (S.auftraege.length < 3) {
    const name = INHALT.auftraege[Math.floor(Math.random() * INHALT.auftraege.length)];
    const auf = erzeugeAuftrag(prod, S.karten, heute(), CFG.auftragAufgaben, name);
    if (!auf) break;
    S.auftraege.push(auf); geaendert = true;
  }
  if (geaendert) speichern();
}

function zeigeAuftraege() {
  const prod = produzierende();
  if (prod.length < 2) {
    oeffneDialog(`<div class="blatt-kopf"><h2>Aufträge</h2>${kreuz}</div>
      <p>Aufträge sind Mischaufgaben aus mehreren Gebäuden – wie in der Klausur. Sie bringen <b>doppelte</b> Münzen und Erfahrung.</p>
      <div class="hinweis-box warm">Sobald zwei Gebäude produzieren, kommen die ersten Bestellungen. Dein Kornfeld und dein Brunnen sind ein guter Anfang!</div>`);
    return;
  }
  aktualisiereAuftraege();
  const blatt = oeffneDialog(`<div class="blatt-kopf"><h2>Auftragsbrett</h2>${kreuz}</div>
    <p class="klein">Mischaufgaben aus mehreren Themen – Belohnung ×${CFG.auftragFaktor}. Keine Wartezeit: Neue Aufträge kommen sofort nach.</p>
    <div class="auftrag-liste">${S.auftraege.map((x) => `<div class="auftrag">
      ${gebaeudeMini(INHALT.bloecke.find((b) => b.id === x.bloecke[0]).gebaeude.typ).replace('class="geb-mini"', 'class="ikone"')}
      <div><b>${esc(x.name)}</b><br><span class="klein">${x.aufgaben.length} Aufgaben aus ${x.bloecke.map((id) => esc(INHALT.bloecke.find((b) => b.id === id).gebaeude.name)).join(', ')}</span></div>
      <button class="knopf" type="button" data-auftrag="${x.id}">Liefern</button></div>`).join('')}</div>
    <div class="reihe ende" style="margin-top:12px"><button class="knopf still" type="button" data-neu>🔄 Andere Aufträge</button></div>`);
  blatt.addEventListener('click', (e) => {
    const k = e.target.closest('[data-auftrag]');
    if (k) {
      const x = S.auftraege.find((y) => y.id === k.dataset.auftrag);
      schliesseDialog();
      starteSitzung({ art: 'auftrag', titel: x.name, ids: x.aufgaben, faktor: CFG.auftragFaktor, auftragId: x.id });
    }
    if (e.target.closest('[data-neu]')) { S.auftraege = []; aktualisiereAuftraege(); speichern(); zeigeAuftraege(); }
  });
}

/* =====================================================================
   Klausurmodus
   ===================================================================== */
function zeigeKlausurStart() {
  const e = S.einstellungen;
  const letzte = S.statistik.klausuren.slice(-3).reverse();
  const blatt = oeffneDialog(`<div class="blatt-kopf"><h2>Probeklausur</h2>${kreuz}</div>
    <p><b>${e.klausurFragen} Fragen</b> aus allen Themenblöcken, <b>${e.klausurMinuten} Minuten</b> Zeit. Du bekommst erst am Ende die Auswertung – wie in der echten Klausur. Du kannst zwischen den Fragen hin- und herspringen.</p>
    <p class="klein">Anzahl und Zeit änderst du in den Einstellungen. Die Klausur nutzt auch Themen, deren Gebäude noch nicht gebaut sind.</p>
    ${letzte.length ? `<h3>Deine letzten Ergebnisse</h3><ul>${letzte.map((k) => `<li>${new Date(k.datum).toLocaleDateString('de-DE')}: ${k.punkte}/${k.max} (${k.prozent} %)</li>`).join('')}</ul>` : ''}
    <div class="reihe ende"><button class="knopf" type="button" data-los>Klausur starten</button></div>`);
  blatt.querySelector('[data-los]').addEventListener('click', () => { schliesseDialog(); starteKlausur(); });
}

function starteKlausur() {
  const e = S.einstellungen;
  const ids = waehleKlausur(INHALT.bloecke, Math.min(e.klausurFragen, Object.keys(AUFGABE).length));
  const ende = Date.now() + e.klausurMinuten * 60000;
  const el = document.createElement('div');
  el.className = 'lernen';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Probeklausur');
  el.innerHTML = `<div class="lern-kopf">
      <button class="rund-knopf" type="button" data-abbrechen aria-label="Klausur abbrechen"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
      <div><h1>Probeklausur</h1><p class="klein frage-nr"></p></div>
      <span class="uhr" role="timer" aria-live="off"></span>
      <button class="knopf" type="button" data-abgeben>Abgeben</button></div>
    <nav class="klausur-navi" aria-label="Fragen">${ids.map((_, i) => `<button type="button" data-geh="${i}">${i + 1}</button>`).join('')}</nav>
    <div class="klausur-fragen">${ids.map((id, i) => `<article class="karte" data-frage="${i}" hidden></article>`).join('')}</div>
    <div class="aktionen" style="max-width:980px;margin:16px auto 0"><button class="knopf zweit" type="button" data-zurueck>← Zurück</button><button class="knopf" type="button" data-vor>Weiter →</button></div>`;
  document.body.appendChild(el);
  // In der Klausur gibt es keine Hilfen beim Rechnen.
  const ctls = ids.map((id, i) => baueAufgabe($(`[data-frage="${i}"]`, el), AUFGABE[id], { onAenderung: () => markiereNavi(), ohneHilfen: true }));
  let pos = 0;
  const markiereNavi = () => el.querySelectorAll('[data-geh]').forEach((b, i) => { b.classList.toggle('beantwortet', ctls[i].bereit()); b.setAttribute('aria-current', i === pos); });
  const zeige = (i) => {
    pos = Math.max(0, Math.min(ids.length - 1, i));
    el.querySelectorAll('[data-frage]').forEach((f, j) => { f.hidden = j !== pos; });
    $('.frage-nr', el).textContent = `Frage ${pos + 1} von ${ids.length}`;
    $('[data-zurueck]', el).disabled = pos === 0;
    $('[data-vor]', el).textContent = pos === ids.length - 1 ? 'Zur Abgabe' : 'Weiter →';
    markiereNavi(); el.scrollTop = 0;
  };
  zeige(0);
  const uhr = $('.uhr', el);
  const tick = () => {
    const rest = Math.max(0, ende - Date.now());
    const m = Math.floor(rest / 60000), s = Math.floor((rest % 60000) / 1000);
    uhr.textContent = `${m}:${String(s).padStart(2, '0')}`;
    uhr.classList.toggle('knapp', rest < 3 * 60000);
    if (rest <= 0) { clearInterval(timer); toast('Die Zeit ist um – deine Klausur wird ausgewertet.'); werteAus(); }
  };
  const timer = setInterval(tick, 1000); tick();
  let fertig = false;
  const werteAus = () => {
    if (fertig) return;
    fertig = true;
    clearInterval(timer);
    const ergebnisse = ids.map((id, i) => ({ id, richtig: ctls[i].bereit() ? !!ctls[i].pruefe().richtig : (ctls[i].pruefe(), false), beantwortet: ctls[i].bereit() }));
    zeigeKlausurErgebnis(el, ids, ergebnisse);
  };
  el.addEventListener('click', (e) => {
    if (fertig) return; // Auswertung hat eigene Knöpfe
    const g = e.target.closest('[data-geh]');
    if (g) zeige(Number(g.dataset.geh));
    if (e.target.closest('[data-zurueck]')) zeige(pos - 1);
    if (e.target.closest('[data-vor]')) { if (pos === ids.length - 1) $('[data-abgeben]', el).click(); else zeige(pos + 1); }
    if (e.target.closest('[data-abgeben]')) {
      const offen = ctls.filter((c) => !c.bereit()).length;
      if (!offen || confirm(`Noch ${offen} Frage${offen === 1 ? '' : 'n'} unbeantwortet. Trotzdem abgeben?`)) werteAus();
    }
    if (e.target.closest('[data-abbrechen]') && confirm('Klausur abbrechen? Es gibt dann keine Auswertung.')) { clearInterval(timer); el.remove(); zeichneHof(); }
  });
}

function zeigeKlausurErgebnis(el, ids, ergebnisse) {
  const aus = werteKlausurAus(ergebnisse, INHALT.bloecke);
  // Fehler fließen in die Wiederholung ein (Fach 1), richtige Antworten bleiben, wie sie sind.
  for (const e of ergebnisse) if (!e.richtig) S.karten[e.id] = beantworte(S.karten[e.id], false, heute(), CFG.intervalleTage);
  // Jede richtige Antwort lässt auch hier Korn im Beet des passenden (gebauten) Gebäudes wachsen.
  let gewachsen = 0;
  for (const e of ergebnisse) if (e.richtig && lasseWachsen(BLOCK_VON[e.id].id)) gewachsen++;
  const xp = aus.punkte * 5, muenzen = aus.punkte * 2;
  S.xp += xp; S.muenzen += muenzen;
  S.statistik.klausuren.push({ datum: new Date().toISOString(), punkte: aus.punkte, max: aus.max, prozent: aus.prozent });
  S.serie = aktualisiereSerie(S.serie, heute()).serie;
  speichern();
  klang.ernte();
  const fragenDom = [...el.querySelectorAll('[data-frage]')];
  const balken = (p) => `<div class="balken ${p < 60 ? 'schwach' : p < 75 ? 'mittel' : ''}"><i style="width:${p}%"></i></div>`;
  el.innerHTML = `<div class="ergebnis" style="max-width:860px">
    <h1>Auswertung</h1>
    <p class="gross">${aus.punkte} / ${aus.max}</p><p><b>${aus.prozent} %</b> richtig · +${xp} XP · +${muenzen} Münzen</p>
    ${gewachsen ? `<p class="klein">🌱 ${gewachsen} richtige Antworten haben Korn in deinen Beeten wachsen lassen.</p>` : ''}
    <div class="hinweis-box warm" style="text-align:left"><b>Empfehlung:</b> ${esc(aus.empfehlung)}</div>
    <table class="auswertung-tabelle"><thead><tr><th>Thema</th><th>Richtig</th><th></th></tr></thead><tbody>
      ${aus.proBlock.map((p) => `<tr><td>${esc(p.name)}<br><span class="klein">${esc(p.titel)}</span></td><td>${p.richtig}/${p.gesamt}</td><td>${balken(p.prozent)}</td></tr>`).join('')}
    </tbody></table>
    <div style="text-align:left">
      ${aus.staerken.length ? `<p>💪 <b>Stärken:</b> ${aus.staerken.map((p) => esc(p.name)).join(', ')}</p>` : ''}
      ${aus.schwaechen.length ? `<p>🌱 <b>Schwächen:</b> ${aus.schwaechen.map((p) => esc(p.name)).join(', ')}</p>` : ''}
      <p>📌 <b>Als Nächstes wiederholen:</b> ${aus.wiederholen.map((id) => { const b = INHALT.bloecke.find((x) => x.id === id); return `<button class="knopf zweit" type="button" data-spick="${id}" style="min-height:44px;margin:4px">${esc(b.gebaeude.name)} nachlesen</button>`; }).join('')}</p>
      <p class="klein">Falsch beantwortete Aufgaben sind jetzt in deinen Gebäuden als „fällig“ markiert und kommen in den nächsten Lernrunden wieder.</p>
    </div>
    <h2 style="margin-top:24px">Alle Fragen durchsehen</h2>
    <div class="durchsicht">${ergebnisse.map((e, i) => `<details><summary>${e.richtig ? '✅' : e.beantwortet ? '❌' : '⭕'} Frage ${i + 1}: ${esc(frageText(AUFGABE[e.id]).slice(0, 90))}${frageText(AUFGABE[e.id]).length > 90 ? '…' : ''}</summary><div class="durchsicht-ort" data-i="${i}"></div>
      <div class="rueckmeldung ${e.richtig ? 'gut' : 'weiter'}"><p class="loesung-text">Richtig ist: ${esc(loesungText(AUFGABE[e.id]))}</p><p>${esc(AUFGABE[e.id].erklaerung)}</p>${quelleHtml(AUFGABE[e.id].quelle)}</div></details>`).join('')}</div>
    <div class="reihe" style="justify-content:center;margin-top:20px"><button class="knopf" type="button" data-zurueck>Zum Hof</button></div></div>`;
  el.querySelectorAll('.durchsicht-ort').forEach((ort) => { const f = fragenDom[Number(ort.dataset.i)]; f.hidden = false; f.style.boxShadow = 'none'; f.style.padding = '12px 0'; f.style.border = '0'; ort.appendChild(f); });
  el.scrollTop = 0;
  if (aus.prozent >= 75) konfetti();
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-zurueck]')) { el.remove(); zeichneHof(); }
    const sp = e.target.closest('[data-spick]');
    if (sp) zeigeSpickzettel(sp.dataset.spick);
  });
}

/* =====================================================================
   Spickzettel & Nachlesen
   ===================================================================== */
function spickSeite(b, suche = '') {
  const inv = b.inventar;
  const hl = (t) => {
    const s = esc(t);
    if (!suche) return s;
    const re = new RegExp(`(${suche.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return s.replace(re, '<mark>$1</mark>');
  };
  const passt = (...t) => !suche || t.join(' ').toLowerCase().includes(suche.toLowerCase());
  const begriffe = inv.begriffe.filter((e) => passt(e.begriff, e.definition));
  const formelText = (t) => (Array.isArray(t) ? t.map(formelText).join(' ') : typeof t === 'string' ? t : t ? formelText(t.bruch || t.hoch) : '');
  const formeln = inv.formeln.filter((f) => passt(f.name, f.beispiel, f.einheit, formelText(f.darstellung)));
  const merk = inv.merksaetze.filter((m) => passt(m.text));
  if (suche && !begriffe.length && !formeln.length && !merk.length) return '';
  return `<div class="spick-seite">
    ${formeln.length ? `<section><h3>Formeln</h3>${formeln.map((f) => `<div class="formel-karte"><b>${hl(f.name)}</b><br>${formelHtml(f.darstellung)}<br><span class="klein">Einheit: ${esc(f.einheit)} · ${hl(f.beispiel)}</span> ${quelleKurz(f.quelle)}</div>`).join('')}</section>` : ''}
    ${begriffe.length ? `<section><h3>Definitionen</h3>${begriffe.map((e) => `<div class="spick-eintrag"><b>${hl(e.begriff)}:</b> ${hl(e.definition)} ${quelleKurz(e.quelle)}</div>`).join('')}</section>` : ''}
    ${merk.length ? `<section><h3>Merksätze</h3>${merk.map((m) => `<div class="spick-eintrag">• ${hl(m.text)} ${quelleKurz(m.quelle)}</div>`).join('')}</section>` : ''}
  </div>`;
}

function zeigeSpickzettel(startId = null) {
  let aktiv = startId || INHALT.bloecke[0].id;
  let suche = '';
  const blatt = oeffneDialog(`<div class="blatt-kopf"><div style="flex:none"><h2>Spickzettel</h2><p class="klein" style="margin:0">Eine Seite pro Thema</p></div>
      <input class="spick-suche" type="search" placeholder="Durchsuchen, z. B. „Navicular“ oder „BMI“" aria-label="Spickzettel durchsuchen" style="margin:0 0 0 12px;flex:1">${kreuz}</div>
    <div class="reiter" role="tablist">${INHALT.bloecke.map((b) => `<button type="button" role="tab" data-reiter="${b.id}" aria-selected="${b.id === aktiv}" title="${esc(b.titel)}">${esc(b.gebaeude.name)}</button>`).join('')}</div>
    <div class="spick-inhalt" role="tabpanel"></div>`, { breit: true });
  blatt.classList.add('spick');
  const zeichne = () => {
    const ort = $('.spick-inhalt', blatt);
    $('.reiter', blatt).style.display = suche ? 'none' : '';
    if (suche) {
      const treffer = INHALT.bloecke.map((b) => { const s = spickSeite(b, suche); return s ? `<h3 style="margin-top:12px">${esc(b.gebaeude.name)} – ${esc(b.titel)}</h3>${s}` : ''; }).join('');
      ort.innerHTML = treffer || '<p class="klein">Nichts gefunden. Versuch ein anderes Stichwort.</p>';
    } else {
      const b = INHALT.bloecke.find((x) => x.id === aktiv);
      ort.innerHTML = `<p class="unsichtbar">${esc(b.titel)}</p>${spickSeite(b)}`;
      blatt.querySelectorAll('[data-reiter]').forEach((r) => r.setAttribute('aria-selected', r.dataset.reiter === aktiv));
    }
  };
  zeichne();
  $('.spick-suche', blatt).addEventListener('input', (e) => { suche = e.target.value.trim(); zeichne(); });
  blatt.addEventListener('click', (e) => { const r = e.target.closest('[data-reiter]'); if (r) { aktiv = r.dataset.reiter; zeichne(); } });
}

function zeigeNachlesen(id) {
  const b = INHALT.bloecke.find((x) => x.id === id);
  const inv = b.inventar;
  oeffneDialog(`<div class="blatt-kopf"><div><h2>${esc(b.gebaeude.name)}: Nachlesen</h2><p class="klein" style="margin:0">${esc(b.titel)}</p></div>${kreuz}</div>
    ${spickSeite(b)}
    ${inv.abbildungen?.length ? `<h3>Abbildungen im Material</h3>${inv.abbildungen.map((a) => `<div class="spick-eintrag"><b>${esc(a.titel)}:</b> ${esc(a.beschreibung)} ${quelleHtml(a.quelle)}${a.svg ? `<div class="bild-rahmen" style="max-width:420px;margin:8px 0">${abbildungSvg(a.svg, { loesung: true, markenZeigen: false })}${/^kreuz-/.test(a.svg) ? '<p class="legende"><i class="lg-hyper"></i> hyperton <i class="lg-hypo"></i> hypoton</p>' : ''}</div>` : ''}</div>`).join('')}` : ''}
    ${inv.beispielaufgaben?.length ? `<h3 style="margin-top:14px">Beispielaufgaben aus dem Material</h3>${inv.beispielaufgaben.map((a) => `<details class="spick-eintrag"><summary><b>${esc(a.aufgabe)}</b></summary><p>${esc(a.loesung)}</p>${quelleHtml(a.quelle)}</details>`).join('')}` : ''}`, { breit: true });
}

function zeigeSkizze(id) {
  const s = SKIZZEN.find((x) => x.id === id);
  const blatt = oeffneDialog(`<div class="blatt-kopf"><div><h2>🛠️ ${esc(s.titel)}</h2><p class="klein" style="margin:0">${esc(s.text)}</p></div>${kreuz}</div><div class="skizze-ort"></div>`, { breit: true });
  s.baue($('.skizze-ort', blatt));
}

/* =====================================================================
   Markt (Deko)
   ===================================================================== */
function zeigeMarkt() {
  const ware = (d) => {
    const st = S.deko[d.id];
    if (st === true) return `<button class="knopf zweit" type="button" data-umschalten="${d.id}">Einlagern</button><span class="klein">✓ steht auf deinem Hof</span>`;
    if (st) return `<button class="knopf" type="button" data-umschalten="${d.id}">Aufstellen</button><span class="klein">gekauft, im Lager</span>`;
    return `<button class="knopf ${S.muenzen < d.preis ? 'zweit' : ''}" type="button" data-kauf="${d.id}" ${S.muenzen < d.preis ? 'disabled' : ''}>${d.preis} Münzen</button>${S.muenzen < d.preis ? `<span class="klein">noch ${d.preis - S.muenzen} Münzen</span>` : ''}`;
  };
  const blatt = oeffneDialog(`<div class="blatt-kopf"><div><h2>Markt</h2><p class="klein" style="margin:0">Verschönere deinen Hof. Du hast ${IKON.muenze.replace('<svg', '<svg style="width:18px;height:18px;vertical-align:-3px"')} <span class="markt-muenzen">${S.muenzen}</span> Münzen. Gekaufte Deko kannst du jederzeit einlagern und wieder aufstellen.</p></div>${kreuz}</div>
    <div class="markt-liste">${INHALT.deko.map((d) => `<div class="markt-ware" data-ware="${d.id}">${dekoMini(d.id)}<b>${esc(d.name)}</b><span class="klein">${esc(d.beschreibung)}</span><div class="markt-aktion">${ware(d)}</div></div>`).join('')}</div>`, { breit: true });
  blatt.addEventListener('click', (e) => {
    const k = e.target.closest('[data-kauf]');
    const u = e.target.closest('[data-umschalten]');
    if (u) {
      const d = INHALT.deko.find((x) => x.id === u.dataset.umschalten);
      S.deko[d.id] = S.deko[d.id] === true ? 'lager' : true; speichern(); klang.tipp();
      $(`[data-ware="${d.id}"] .markt-aktion`, blatt).innerHTML = ware(d);
      return;
    }
    if (!k) return;
    const d = INHALT.deko.find((x) => x.id === k.dataset.kauf);
    if (S.muenzen < d.preis) return;
    S.muenzen -= d.preis; S.deko[d.id] = true; speichern(); klang.muenze();
    schliesseDialog(); zeichneHof(); toast(`${d.name} steht jetzt auf deinem Hof. 🌼`);
  });
  blatt._onSchliessen = () => setTimeout(zeichneHof, 0);
}

/* =====================================================================
   Info-Dialoge: Level, Serie, Willkommen
   ===================================================================== */
function zeigeLevelInfo() {
  const lv = levelAusXp(S.xp, CFG.levelXp);
  const st = S.statistik;
  const tag = heute();
  const zeilen = INHALT.bloecke.map((b) => {
    const i = blockInfo(b, tag);
    const gelernt = Math.round(b.aufgaben.filter((a) => S.karten[a.id]?.box >= 2).length / b.aufgaben.length * 100);
    return `<tr><td><b>${esc(b.gebaeude.name)}</b><br><span class="klein">${esc(b.titel)}</span></td><td>${sterneHtml(i.stufe)}</td><td>${balkenHtml(gelernt)}<span class="klein">${gelernt} % gelernt · ${i.faellig} fällig</span></td></tr>`;
  }).join('');
  const kl = st.klausuren.slice(-5).reverse();
  oeffneDialog(`<div class="blatt-kopf"><h2>Level ${lv.level} · Fortschritt</h2>${kreuz}</div>
    <p>Noch <b>${lv.bisNaechstes} XP</b> bis Level ${lv.level + 1}. XP gibt es für richtige Antworten (bei Aufträgen doppelt), für die Probeklausur und fürs Korn-Ernten.</p>
    <div class="statistik vier"><div><b>${st.ernten}</b><span>Lernrunden</span></div><div><b>${st.auftraege}</b><span>Aufträge</span></div><div><b>${st.kornGeerntet || 0}</b><span>Korn geerntet</span></div><div><b>${st.antworten ? Math.round((st.richtig / st.antworten) * 100) : 0} %</b><span>richtig</span></div></div>
    <h3>Deine Themen</h3>
    <table class="auswertung-tabelle fortschritt-tabelle"><tbody>${zeilen}</tbody></table>
    <h3 style="margin-top:14px">Probeklausuren</h3>
    ${kl.length ? `<ul>${kl.map((k) => `<li>${new Date(k.datum).toLocaleDateString('de-DE')}: ${k.punkte}/${k.max} Punkte (${k.prozent} %)</li>`).join('')}</ul>` : '<p class="klein">Noch keine Probeklausur geschrieben.</p>'}
    <h3 style="margin-top:14px">Was Level freischalten</h3><ul>${INHALT.bloecke.filter((b) => b.level > 1).map((b) => `<li>Level ${b.level}: ${esc(b.gebaeude.name)} – ${esc(b.titel)} (${b.preis} Münzen)</li>`).join('')}</ul>
    <p class="klein">Mit steigendem Level ziehen außerdem mehr Tiere auf deinen Hof.</p>`, { breit: true });
}
function balkenHtml(p) { return `<div class="balken ${p < 40 ? 'schwach' : p < 70 ? 'mittel' : ''}"><i style="width:${p}%"></i></div>`; }
function zeigeSerieInfo() {
  const sa = serieAnzeige(S.serie, heute());
  const text = { leer: 'Mach heute deine erste Lernrunde – dann beginnt deine Tagesserie.', heute: 'Für heute ist deine Serie gesichert. 🌱', offen: 'Heute noch eine Lernrunde, dann wächst deine Serie weiter.', schutz: 'Gestern hast du ausgesetzt – kein Problem: Einmal pro Woche wird ein Ausfalltag aufgefangen. Lerne heute, dann läuft die Serie weiter.', vorbei: 'Deine letzte Serie ist vorbei. Heute ist ein guter Tag für eine neue!' }[sa.status];
  oeffneDialog(`<div class="blatt-kopf"><h2>Tagesserie: ${sa.tage} ${sa.tage === 1 ? 'Tag' : 'Tage'}</h2>${kreuz}</div><p>${text}</p>
    <p class="klein">Längste Serie: ${S.serie?.beste || 0} Tage. Eine Lernrunde, ein Auftrag oder eine Probeklausur pro Tag reicht. Fällt ein Tag aus, bleibt die Serie einmal pro Woche erhalten.</p>`);
}
function zeigeWillkommen(erneut = false) {
  const blatt = oeffneDialog(`<div class="blatt-kopf"><h2>${erneut ? 'So funktioniert der Statik-Hof' : 'Willkommen auf deinem Statik-Hof 🌾'}</h2>${erneut ? kreuz : ''}</div>
    <p>Hier wächst dein Hof nur durch Lernen – ohne Uhr, ohne Wartezeit, ohne Strafe.</p>
    <ul class="anleitung">
      <li><b>📚 Lernrunde:</b> Tippe ein Gebäude an und beantworte 5–8 kurze Aufgaben aus diesem Thema.</li>
      <li><b>🌱 Korn wächst:</b> Jede richtige Antwort lässt das Korn im Beet neben dem Gebäude eine Stufe wachsen: Saat → Spross → Halm → reif.</li>
      <li><b>🌾 Ernten:</b> Reifes Korn leuchtet golden. Tippe auf das Beet – dafür gibt es Münzen und XP. Mit Münzen baust du neue Gebäude.</li>
      <li><b>💡 Fehler sind okay:</b> Dann wächst einfach nichts. Du bekommst eine Erklärung, und die Aufgabe kommt später noch einmal.</li>
      <li><b>✨ Leuchtende Beete:</b> Aufgaben kommen nach 1, 3, 7 und 14 Tagen wieder. Die Zahl am Gebäude zeigt, was heute fällig ist.</li>
      <li><b>🏭 Produktionsketten:</b> Spätere Gebäude produzieren erst, wenn das Grundwissen sitzt.</li>
      <li><b>Aufträge, Probeklausur & Spickzettel</b> findest du ${formatJetzt() === 'quer' ? 'rechts' : 'unten'}.</li>
    </ul>
    <p class="klein">Jede Aufgabe zeigt, wo sie im Material steht. Dein Spielstand bleibt auf diesem Gerät – sichere ihn ab und zu über die Einstellungen. Diese Anleitung findest du jederzeit in den Einstellungen.</p>
    <div class="reihe ende"><button class="knopf" type="button" data-los>${erneut ? 'Verstanden' : "Los geht's – zum Kornfeld"}</button></div>`);
  blatt.querySelector('[data-los]').addEventListener('click', () => {
    schliesseDialog();
    if (!erneut) { S.begruesst = true; speichern(); oeffneGebaeude('grundlagen'); }
  });
}

/* =====================================================================
   Einstellungen
   ===================================================================== */
function zeigeEinstellungen() {
  const e = S.einstellungen;
  const istIOS = /iPad|iPhone|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
  const installiert = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const stepper = (key, min, max, schritt, einheit) => `<span class="stepper"><button type="button" data-step="${key}" data-d="${-schritt}" data-min="${min}" data-max="${max}" aria-label="weniger">−</button><output data-wert="${key}">${e[key]}${einheit}</output><button type="button" data-step="${key}" data-d="${schritt}" data-min="${min}" data-max="${max}" aria-label="mehr">+</button></span>`;
  const blatt = oeffneDialog(`<div class="blatt-kopf"><h2>Einstellungen</h2>${kreuz}</div>
    <div class="einstellung"><div><b>Töne</b><br><span class="klein">Dezente Klänge bei Antworten und Belohnungen</span></div><label class="schalter"><input type="checkbox" data-schalter="ton" ${e.ton ? 'checked' : ''} aria-label="Töne"><span></span></label></div>
    <div class="einstellung"><div><b>Tierlaute</b><br><span class="klein">Wiehern, Gackern und Piepen (nur wenn Töne an sind)</span></div><label class="schalter"><input type="checkbox" data-schalter="tierlaute" ${e.tierlaute ? 'checked' : ''} aria-label="Tierlaute"><span></span></label></div>
    <div class="einstellung"><div><b>Animationen</b><br><span class="klein">Laufende Tiere, Wind, fliegendes Korn, Konfetti</span></div><label class="schalter"><input type="checkbox" data-schalter="animationen" ${e.animationen ? 'checked' : ''} aria-label="Animationen"><span></span></label></div>
    <div class="einstellung"><div><b>Tiere auf dem Hof</b><br><span class="klein">Pferde, Hühner, Küken und Schmetterlinge</span></div><label class="schalter"><input type="checkbox" data-schalter="tiere" ${e.tiere ? 'checked' : ''} aria-label="Tiere auf dem Hof"><span></span></label></div>
    <div class="einstellung"><div><b>Tageszeit</b><br><span class="klein">Himmel passt sich der Uhrzeit an (Morgen, Tag, Abend, Nacht)</span></div><label class="schalter"><input type="checkbox" data-schalter="tageszeit" ${e.tageszeit ? 'checked' : ''} aria-label="Tageszeit"><span></span></label></div>
    <div class="einstellung"><div><b>Darstellung</b></div><div class="wahl">${[['auto', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']].map(([w, t]) => `<button type="button" data-design="${w}" aria-pressed="${e.design === w}">${t}</button>`).join('')}</div></div>
    <div class="einstellung"><div><b>Aufgaben pro Lernrunde</b></div>${stepper('ernteAufgaben', 5, 8, 1, '')}</div>
    <div class="einstellung"><div><b>Klausur: Dauer</b></div>${stepper('klausurMinuten', 10, 120, 5, ' Min.')}</div>
    <div class="einstellung"><div><b>Klausur: Fragen</b></div>${stepper('klausurFragen', 10, 40, 5, '')}</div>
    <div class="einstellung"><div><b>Spielanleitung</b><br><span class="klein">Wie Lernrunde, Korn und Ernte zusammenhängen</span></div><button class="knopf zweit" type="button" data-anleitung>Anzeigen</button></div>
    <h3 style="margin-top:18px">Spielstand</h3>
    <p class="klein">Dein Fortschritt liegt nur auf diesem Gerät. Exportiere ihn ab und zu als Datei (z. B. in „Dateien“ oder iCloud), damit nichts verloren geht.</p>
    <div class="reihe"><button class="knopf zweit" type="button" data-export>⬇️ Exportieren</button><button class="knopf zweit" type="button" data-import>⬆️ Importieren</button><button class="knopf still" type="button" data-reset>Zurücksetzen…</button></div>
    <input type="file" accept=".json,application/json" data-datei hidden>
    ${istIOS && !installiert ? '<div class="hinweis-box warm" style="margin-top:14px"><b>Tipp fürs iPad:</b> In Safari auf „Teilen“ (□↑) tippen und „Zum Home-Bildschirm“ wählen. Dann läuft der Statik-Hof wie eine App – auch offline.</div>' : ''}
    <h3 style="margin-top:18px">Über die App</h3>
    <p class="klein">Statik-Hof ${esc(INHALT.meta.version)} · ${Object.keys(AUFGABE).length} Aufgaben in ${INHALT.bloecke.length} Themenblöcken · Inhalte ausschließlich aus deinen Unterrichtsunterlagen:</p>
    <ul class="klein">${Object.entries(INHALT.quellen).map(([k, q]) => `<li>${esc(q.kurz)} – <i>${esc(q.datei)}</i></li>`).join('')}</ul>`);
  blatt.addEventListener('change', (ev) => {
    const s = ev.target.closest('[data-schalter]');
    if (s) { e[s.dataset.schalter] = s.checked; speichern(); wendeEinstellungenAn(); if (s.dataset.schalter === 'ton' && s.checked) klang.richtig(); if (s.dataset.schalter === 'tierlaute' && s.checked) klang.wiehern(); }
    const d = ev.target.closest('[data-datei]');
    if (d && d.files[0]) {
      d.files[0].text().then((text) => {
        try {
          const neu = leseImport(text, CFG);
          if (!confirm('Importierten Spielstand übernehmen? Der aktuelle Stand auf diesem Gerät wird ersetzt.')) return;
          S = neu; speichern(); wendeEinstellungenAn(); schliesseDialog(); zeichneHof(); toast('Spielstand importiert ✓');
        } catch (err) { toast(err.message, 5000); }
      });
    }
  });
  blatt.addEventListener('click', async (ev) => {
    const ds = ev.target.closest('[data-design]');
    if (ds) { e.design = ds.dataset.design; speichern(); wendeEinstellungenAn(); blatt.querySelectorAll('[data-design]').forEach((b) => b.setAttribute('aria-pressed', b === ds)); }
    const st = ev.target.closest('[data-step]');
    if (st) {
      const k = st.dataset.step;
      e[k] = Math.max(Number(st.dataset.min), Math.min(Number(st.dataset.max), e[k] + Number(st.dataset.d)));
      blatt.querySelector(`[data-wert="${k}"]`).textContent = e[k] + (k === 'klausurMinuten' ? ' Min.' : '');
      speichern();
    }
    if (ev.target.closest('[data-export]')) await exportiere();
    if (ev.target.closest('[data-import]')) blatt.querySelector('[data-datei]').click();
    if (ev.target.closest('[data-reset]')) zeigeReset();
    if (ev.target.closest('[data-anleitung]')) zeigeWillkommen(true);
  });
  blatt._onSchliessen = () => zeichneHof();
}

async function exportiere() {
  const { name, blob } = exportDatei(S);
  const datei = new File([blob], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [datei] })) { await navigator.share({ files: [datei], title: 'Statik-Hof Spielstand' }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('Spielstand exportiert ✓');
}

function zeigeReset() {
  const blatt = oeffneDialog(`<div class="blatt-kopf"><h2>Spielstand zurücksetzen?</h2>${kreuz}</div>
    <p>Dabei werden <b>alle</b> Fortschritte gelöscht: Level, Münzen, Gebäude, Wiederholungen und Statistik. Das lässt sich nicht rückgängig machen – außer du hast vorher exportiert.</p>
    <p>Tippe zur Sicherheit <b>LÖSCHEN</b> in das Feld:</p>
    <input class="spick-suche" type="text" data-bestaetigung autocomplete="off" autocapitalize="characters" aria-label="Bestätigung">
    <div class="reihe ende"><button class="knopf zweit" type="button" data-schliessen>Abbrechen</button><button class="knopf" type="button" data-wirklich disabled style="background:var(--hinweis)">Endgültig zurücksetzen</button></div>`);
  const feld = blatt.querySelector('[data-bestaetigung]');
  const knopf = blatt.querySelector('[data-wirklich]');
  feld.addEventListener('input', () => { knopf.disabled = feld.value.trim().toUpperCase() !== 'LÖSCHEN'; });
  knopf.addEventListener('click', () => {
    const einst = S.einstellungen;
    loesche(); S = neuerSpielstand(CFG); S.einstellungen = einst; S.begruesst = true; speichern();
    schliesseDialog(); zeichneHof(); toast('Neuer Hof angelegt.');
  });
}

/* =====================================================================
   Service Worker (Offline-Betrieb)
   ===================================================================== */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service Worker nicht registriert', e)); });
}

// Nur für automatische Tests: Zugriff auf Zustand/Inhalte.
window.__statikhof = { get S() { return S; }, get INHALT() { return INHALT; }, zeichneHof, tierPositionen, laeuft, ernteBeet,
  testSitzung: (ids) => starteSitzung({ art: 'ernte', titel: 'Test', ids, faktor: 1, blockId: BLOCK_VON[ids[0]].id }) };

start();
