// app.js – Hauptprogramm des Statik-Hofs.
// Verbindet Inhalte (inhalt.json), Spielstand (speicher.js), Lernlogik (leitner.js),
// Spielsystem (spiel.js) und die Bildschirme.

import { heute } from './datum.js';
import { beantworte, blockStufe, zaehle, waehleErnte, istFaellig } from './leitner.js';
import { levelAusXp, gebaeudeStatus, fehlendeVorstufen, kaufeGebaeude, belohnung, aktualisiereSerie, serieAnzeige, erzeugeAuftrag, waehleKlausur, werteKlausurAus } from './spiel.js';
import { lade, speichere, exportDatei, leseImport, loesche, neuerSpielstand, bitteUmDauerhaftenSpeicher } from './speicher.js';
import { baueAufgabe, loesungText, frageText, TYP_NAMEN } from './aufgaben-ui.js';
import { hofSvg, gebaeudeMini, dekoMini } from './farm.js';
import { formelHtml, esc } from './formel.js';
import { abbildungSvg } from './abbildungen.js';
import { SKIZZEN } from './skizzen.js';
import { klang, tonAn } from './klang.js';

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
  window.addEventListener('resize', entprelle(zeichneHof, 150));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') schliesseDialog(); });
  // Safari (iPad) ignoriert „user-scalable=no“ teilweise – Pinch-Zoom zusätzlich abfangen.
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  bitteUmDauerhaftenSpeicher();
  if (!S.begruesst) zeigeWillkommen();
}

function entprelle(f, ms) { let t; return () => { clearTimeout(t); t = setTimeout(f, ms); }; }

function wendeEinstellungenAn() {
  const e = S.einstellungen;
  const root = document.documentElement;
  if (e.design === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', e.design);
  root.classList.toggle('ruhig', !e.animationen);
  tonAn(e.ton);
  const dunkel = e.design === 'dark' || (e.design === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
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
  markt: '<svg viewBox="0 0 34 34" aria-hidden="true"><path d="M4 12l3-6h20l3 6z" fill="var(--dach)"/><path d="M4 12h26v3H4z" fill="var(--dach-2)"/><rect x="7" y="15" width="20" height="13" fill="var(--wand)"/><circle cx="13" cy="22" r="3" fill="var(--dach)"/><circle cx="21" cy="22" r="3" fill="var(--acker)"/></svg>',
};

function zeichneHof() {
  if (!INHALT) return;
  if ($('.lernen')) return; // während einer Lerneinheit nicht neu zeichnen
  const tag = heute();
  const infos = INHALT.bloecke.map((b) => blockInfo(b, tag));
  const lv = levelAusXp(S.xp, CFG.levelXp);
  const serie = serieAnzeige(S.serie, tag);
  const reif = infos.filter((i) => i.status === 'produziert').reduce((s, i) => s + i.faellig, 0);
  aktualisiereAuftraege();
  const buehneMasse = $('.hof-buehne')?.getBoundingClientRect();
  const quer = buehneMasse ? buehneMasse.width / buehneMasse.height > 1.05 : innerWidth / innerHeight > 1.1;
  const serieText = serie.status === 'heute' ? 'heute geschafft' : serie.status === 'offen' ? 'heute noch offen' : serie.status === 'schutz' ? 'Schutztag aktiv – heute lernen!' : 'Tagesserie';
  app().innerHTML = `
    <header class="kopf">
      <div class="marke">${IKON.hof}<span>Statik-Hof</span></div>
      <button class="chip level" type="button" data-aktion="info-level" aria-label="Level ${lv.level}, ${lv.imLevel} von ${lv.spanne} Erfahrungspunkten">
        <span>Lv ${lv.level}</span><span class="xp-balken"><i style="width:${Math.round((lv.imLevel / lv.spanne) * 100)}%"></i></span></button>
      <span class="chip" aria-label="${S.muenzen} Münzen">${IKON.muenze}<span class="muenz-zahl">${S.muenzen}</span></span>
      <button class="chip" type="button" data-aktion="info-serie" aria-label="Tagesserie ${serie.tage} Tage, ${serieText}">${IKON.serie}<span>${serie.tage}</span></button>
      <button class="rund-knopf" type="button" data-aktion="einstellungen" aria-label="Einstellungen">${IKON.zahnrad}</button>
    </header>
    <main class="hof-seite">
      <section class="hof-buehne" aria-label="Dein Hof">${hofSvg(infos, S.deko, quer ? 'quer' : 'hoch')}</section>
      <nav class="leiste" aria-label="Hof-Aktionen">
        <button class="leisten-knopf" type="button" data-aktion="auftraege">${IKON.auftrag}<div><b>Aufträge</b><span>Mischaufgaben ×${CFG.auftragFaktor}</span></div>${S.auftraege.length ? `<span class="zahl">${S.auftraege.length}</span>` : ''}</button>
        <button class="leisten-knopf" type="button" data-aktion="klausur">${IKON.klausur}<div><b>Probeklausur</b><span>${S.einstellungen.klausurFragen} Fragen · ${S.einstellungen.klausurMinuten} Min.</span></div></button>
        <button class="leisten-knopf" type="button" data-aktion="spick">${IKON.spick}<div><b>Spickzettel</b><span>Formeln & Merksätze</span></div></button>
        <button class="leisten-knopf" type="button" data-aktion="markt">${IKON.markt}<div><b>Markt</b><span>Deko für deinen Hof</span></div></button>
        <div class="tipp" aria-live="polite">${hofTipp(infos, reif, lv)}</div>
      </nav>
    </main>`;
  // Nach dem ersten Zeichnen kennen wir die echte Bühnengröße – ggf. Format anpassen.
  const b = $('.hof-buehne').getBoundingClientRect();
  const sollQuer = b.width / b.height > 1.05;
  if (sollQuer !== quer) $('.hof-buehne').innerHTML = hofSvg(infos, S.deko, sollQuer ? 'quer' : 'hoch');
  app().onclick = hofKlick;
  app().onkeydown = (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.geb')) { e.preventDefault(); oeffneGebaeude(e.target.closest('.geb').dataset.block); } };
}

function hofTipp(infos, reif, lv) {
  const kaufbar = infos.find((i) => i.status === 'kaufbar');
  if (reif > 0) return `🌾 <b>${reif} Aufgaben</b> sind reif zur Ernte. Tippe ein Gebäude mit Zahl an.`;
  if (kaufbar && S.muenzen >= kaufbar.block.preis) return `🔨 Du kannst jetzt <b>${esc(kaufbar.block.gebaeude.name)}</b> bauen!`;
  if (kaufbar) return `🪙 Für ${esc(kaufbar.block.gebaeude.name)} fehlen noch ${kaufbar.block.preis - S.muenzen} Münzen.`;
  const ruht = infos.find((i) => i.status === 'ruht');
  if (ruht) { const f = fehlendeVorstufen(ruht.block, S, INHALT.bloecke, CFG).map((v) => v.gebaeude.name).join(' und '); return `🌱 ${esc(ruht.block.gebaeude.name)} ruht noch. Ernte zuerst mehr hier: ${esc(f)}.`; }
  const neu = infos.filter((i) => i.status === 'produziert').reduce((s, i) => s + i.neu, 0);
  if (neu > 0) return `✨ Es warten noch <b>${neu} neue Aufgaben</b> auf dich.`;
  return `Alles geerntet – stark! Level ${lv.level + 1} in ${lv.bisNaechstes} XP. Eine Probeklausur hält dich in Form.`;
}

function hofKlick(e) {
  const geb = e.target.closest('.geb');
  if (geb) return oeffneGebaeude(geb.dataset.block);
  const a = e.target.closest('[data-aktion]');
  if (!a) return;
  ({
    auftraege: zeigeAuftraege, klausur: zeigeKlausurStart, spick: () => zeigeSpickzettel(), markt: zeigeMarkt,
    einstellungen: zeigeEinstellungen, 'info-serie': zeigeSerieInfo, 'info-level': zeigeLevelInfo,
  })[a.dataset.aktion]?.();
}

/* =====================================================================
   Gebäude-Dialog
   ===================================================================== */
function sterneHtml(stufe) { return `<span class="sterne" aria-label="Beherrschung ${stufe} von 5">${Array.from({ length: 5 }, (_, i) => `<i class="${i < stufe ? 'an' : ''}"></i>`).join('')}</span>`; }

function oeffneGebaeude(id) {
  const b = INHALT.bloecke.find((x) => x.id === id);
  const info = blockInfo(b);
  const lv = levelAusXp(S.xp, CFG.levelXp).level;
  const vorstufenHtml = b.vorstufen.length ? `<p class="klein">Produktionskette: braucht ${b.vorstufen.map((v) => { const vb = INHALT.bloecke.find((x) => x.id === v); const anteil = Math.round(vb.aufgaben.filter((a) => S.karten[a.id]?.box >= 2).length / vb.aufgaben.length * 100); return `<b>${esc(vb.gebaeude.name)}</b> (${anteil} % geerntet, nötig ${Math.round(CFG.produktionsSchwelle * 100)} %)`; }).join(' und ')}.</p>` : '';
  let haupt = '';
  if (info.status === 'gesperrt') haupt = `<div class="hinweis-box warm">🔒 Dieses Gebäude kannst du ab <b>Level ${b.level}</b> bauen (du bist Level ${lv}). Sammle Erfahrung durch Ernten und Aufträge.</div>`;
  else if (info.status === 'kaufbar') haupt = `<div class="hinweis-box warm">Bereit zum Bauen! Kosten: <b>${b.preis} Münzen</b> (du hast ${S.muenzen}).</div>
    <div class="reihe ende"><button class="knopf" type="button" data-bauen ${S.muenzen < b.preis ? 'disabled' : ''}>🔨 ${esc(b.gebaeude.name)} bauen</button></div>`;
  else if (info.status === 'ruht') {
    const f = fehlendeVorstufen(b, S, INHALT.bloecke, CFG).map((v) => v.gebaeude.name).join(' und ');
    haupt = `<div class="hinweis-box warm">🌱 Gebaut, aber die Produktion ruht noch: Erst muss das Vorstufenwissen aus <b>${esc(f)}</b> sitzen (mindestens ${Math.round(CFG.produktionsSchwelle * 100)} % einmal richtig geerntet). So siehst du die Lernreihenfolge.</div>`;
  } else {
    haupt = `<div class="statistik"><div><b>${info.faellig}</b><span>reif (fällig)</span></div><div><b>${info.neu}</b><span>neu</span></div><div><b>${info.gesamt}</b><span>Aufgaben</span></div></div>
      <div class="reihe ende"><button class="knopf" type="button" data-ernten>🧺 Ernten (${Math.min(S.einstellungen.ernteAufgaben, info.gesamt)} Aufgaben)</button></div>`;
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
   Lerneinheit (Ernte und Auftrag)
   ===================================================================== */
function starteErnte(blockId) {
  const b = INHALT.bloecke.find((x) => x.id === blockId);
  const ids = waehleErnte(b.aufgaben.map((a) => a.id), S.karten, heute(), Math.min(S.einstellungen.ernteAufgaben, b.aufgaben.length));
  const ort = { kornfeld: 'im Kornfeld', brunnen: 'am Brunnen', muehle: 'in der Mühle', stall: 'im Stall', scheune: 'in der Scheune', werkstatt: 'in der Werkstatt', imkerei: 'in der Imkerei', baeckerei: 'in der Bäckerei' }[b.gebaeude.typ] || `bei: ${b.gebaeude.name}`;
  starteSitzung({ art: 'ernte', titel: `Ernte ${ort}`, blockId, ids, faktor: 1 });
}

function starteSitzung({ art, titel, ids, faktor, blockId = null, auftragId = null }) {
  const sitzung = { art, titel, blockId, auftragId, faktor, ids, queue: ids.map((id) => ({ id, versuch: 1 })), pos: 0, kiste: Object.fromEntries(ids.map((id) => [id, ''])), sofort: 0, spaeter: 0, vorherStatus: Object.fromEntries(INHALT.bloecke.map((b) => [b.id, gebaeudeStatus(b, S, INHALT.bloecke, CFG)])) };
  const el = document.createElement('div');
  el.className = 'lernen';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', titel);
  document.body.appendChild(el);
  zeigeSitzungsAufgabe(el, sitzung);
}

function kisteHtml(s) {
  return `<div class="kiste" aria-label="Erntekiste: ${Object.values(s.kiste).filter((k) => k === 'voll').length} von ${s.ids.length} gefüllt">${s.ids.map((id) => `<i class="${s.kiste[id]}"></i>`).join('')}</div>`;
}

function zeigeSitzungsAufgabe(el, s) {
  const eintrag = s.queue[s.pos];
  if (!eintrag) return beendeSitzung(el, s);
  const a = AUFGABE[eintrag.id];
  const block = BLOCK_VON[a.id];
  el.innerHTML = `
    <div class="lern-kopf">
      <button class="rund-knopf" type="button" data-abbrechen aria-label="Lerneinheit beenden"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
      <div><h1>${esc(s.titel)}</h1><p class="klein">${eintrag.versuch > 1 ? '🔁 Zweiter Versuch · ' : ''}${s.art === 'auftrag' ? esc(block.gebaeude.name) + ' · ' : ''}Aufgabe ${Math.min(s.pos + 1, s.queue.length)} von ${s.queue.length}</p></div>
      ${kisteHtml(s)}
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
    let titel, text, klasse;
    if (zaehltRichtig) {
      s.kiste[a.id] = 'voll';
      if (eintrag.versuch === 1) s.sofort++; else s.spaeter++;
      klang.richtig();
      titel = eintrag.versuch === 1 ? lob() : 'Jetzt sitzt es! 🌱';
      klasse = 'gut';
      text = '';
    } else {
      klang.nochmal();
      klasse = 'weiter';
      s.kiste[a.id] = 'nochmal';
      if (erg.richtig && mitLoesung) titel = 'Mit Lösungsweg geschafft';
      else titel = 'Noch nicht ganz – kein Problem';
      if (eintrag.versuch === 1) { s.queue.push({ id: a.id, versuch: 2 }); text = 'Die Aufgabe kommt in dieser Ernte gleich noch einmal.'; }
      else text = 'Sie kommt in deiner nächsten Ernte wieder – so festigt sich das Wissen.';
    }
    const zusatz = a.typ === 'rechnen' && !erg.richtig && erg.zahlOk && !erg.einheitOk ? '<p><b>Die Zahl stimmt</b> – aber die Einheit fehlt oder passt nicht.</p>' : '';
    $('.rueck-ort', el).innerHTML = `<div class="rueckmeldung ${klasse}" role="status">
      <h3>${zaehltRichtig ? '✅' : '💡'} ${esc(titel)}</h3>${zusatz}
      ${!zaehltRichtig ? `<p class="loesung-text">Richtig ist: ${esc(loesungText(a))}</p>` : ''}
      <p>${esc(a.erklaerung)}</p>${text ? `<p class="klein">${esc(text)}</p>` : ''}
      ${quelleHtml(a.quelle)}</div>`;
    $('.kiste', el).outerHTML = kisteHtml(s);
    speichern();
    pruefenKnopf.remove();
    const weiter = document.createElement('button');
    weiter.className = 'knopf'; weiter.type = 'button';
    weiter.textContent = s.pos + 1 < s.queue.length ? 'Weiter' : 'Ernte einfahren';
    $('.aktionen', el).appendChild(weiter);
    weiter.focus({ preventScroll: true });
    $('.rueck-ort', el).scrollIntoView({ behavior: S.einstellungen.animationen ? 'smooth' : 'auto', block: 'nearest' });
    weiter.addEventListener('click', () => { s.pos++; zeigeSitzungsAufgabe(el, s); });
  });
  $('[data-abbrechen]', el).addEventListener('click', () => {
    const beantwortet = Object.values(s.kiste).some((k) => k);
    if (!beantwortet || confirm('Lerneinheit beenden? Deine bisherigen Antworten sind gespeichert, die Belohnung gibt es aber nur für eine fertige Ernte.')) {
      el.remove(); zeichneHof();
    }
  });
}

const LOBE = ['Richtig! 🌾', 'Genau so! ✨', 'Sitzt! 👏', 'Stark! 🌻', 'Prima! 🍎', 'Volltreffer! 🎯'];
function lob() { return LOBE[Math.floor(Math.random() * LOBE.length)]; }

function beendeSitzung(el, s) {
  const lvVorher = levelAusXp(S.xp, CFG.levelXp).level;
  const bel = belohnung(s.sofort, s.spaeter, s.faktor, CFG);
  S.xp += bel.xp; S.muenzen += bel.muenzen;
  if (s.art === 'ernte') S.statistik.ernten++;
  if (s.art === 'auftrag') { S.statistik.auftraege++; S.auftraege = S.auftraege.filter((x) => x.id !== s.auftragId); }
  const { serie, ereignis } = aktualisiereSerie(S.serie, heute());
  S.serie = serie;
  const lvNachher = levelAusXp(S.xp, CFG.levelXp).level;
  const neuProduziert = INHALT.bloecke.filter((b) => s.vorherStatus[b.id] !== 'produziert' && gebaeudeStatus(b, S, INHALT.bloecke, CFG) === 'produziert');
  const neuBaubar = lvNachher > lvVorher ? INHALT.bloecke.filter((b) => b.level > lvVorher && b.level <= lvNachher) : [];
  speichern();
  klang.ernte();
  const voll = Object.values(s.kiste).filter((k) => k === 'voll').length;
  const serieText = { neu: '🌱 Deine Tagesserie hat begonnen!', weiter: `🌱 Tagesserie: ${serie.tage} Tage in Folge!`, gerettet: `🌱 Ein Ausfalltag wurde aufgefangen – deine Serie läuft weiter (${serie.tage} Tage). Der Schutz gilt einmal pro Woche.`, zurueckgesetzt: '🌱 Neue Tagesserie gestartet – schön, dass du wieder da bist!', schon: `🌱 Tagesserie: ${serie.tage} Tage – heute schon geschafft.` }[ereignis];
  el.innerHTML = `<div class="ergebnis">
    <h1>${s.art === 'auftrag' ? 'Auftrag geliefert!' : 'Ernte eingefahren!'}</h1>
    <div class="kiste" style="margin:18px auto;display:inline-flex">${s.ids.map((id) => `<i class="${s.kiste[id] === 'voll' ? 'voll' : ''}"></i>`).join('')}</div>
    <p class="gross">${voll} / ${s.ids.length}</p>
    <p>${voll === s.ids.length ? 'Volle Kiste – wunderbar!' : 'Was noch nicht saß, kommt bald wieder – genau so funktioniert gutes Lernen.'}</p>
    <div class="belohnung"><span class="chip">⭐ +<span data-zaehl="${bel.xp}">0</span> XP</span><span class="chip">${IKON.muenze} +<span data-zaehl="${bel.muenzen}">0</span></span></div>
    <p class="klein">${serieText}</p>
    ${lvNachher > lvVorher ? `<div class="hinweis-box warm"><b>Level ${lvNachher}!</b> ${neuBaubar.length ? `Jetzt kannst du ${neuBaubar.map((b) => `<b>${esc(b.gebaeude.name)}</b>`).join(' und ')} bauen.` : ''}</div>` : ''}
    ${neuProduziert.map((b) => `<div class="hinweis-box gut">🏭 <b>${esc(b.gebaeude.name)}</b> produziert jetzt – das Vorstufenwissen sitzt!</div>`).join('')}
    <div class="reihe" style="justify-content:center;margin-top:20px">
      <button class="knopf zweit" type="button" data-zurueck>Zum Hof</button>
      ${s.art === 'ernte' ? '<button class="knopf" type="button" data-nochmal>Noch eine Ernte</button>' : ''}
    </div></div>`;
  if (lvNachher > lvVorher || voll === s.ids.length) { konfetti(); if (lvNachher > lvVorher) setTimeout(klang.level, 500); }
  zaehleHoch(el);
  $('[data-zurueck]', el).addEventListener('click', () => { el.remove(); zeichneHof(); if (s.blockId) setTimeout(() => $(`.geb[data-block="${s.blockId}"]`)?.classList.add('geb-hupf'), 50); });
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
    <div class="hinweis-box warm" style="text-align:left"><b>Empfehlung:</b> ${esc(aus.empfehlung)}</div>
    <table class="auswertung-tabelle"><thead><tr><th>Thema</th><th>Richtig</th><th></th></tr></thead><tbody>
      ${aus.proBlock.map((p) => `<tr><td>${esc(p.name)}<br><span class="klein">${esc(p.titel)}</span></td><td>${p.richtig}/${p.gesamt}</td><td>${balken(p.prozent)}</td></tr>`).join('')}
    </tbody></table>
    <div style="text-align:left">
      ${aus.staerken.length ? `<p>💪 <b>Stärken:</b> ${aus.staerken.map((p) => esc(p.name)).join(', ')}</p>` : ''}
      ${aus.schwaechen.length ? `<p>🌱 <b>Schwächen:</b> ${aus.schwaechen.map((p) => esc(p.name)).join(', ')}</p>` : ''}
      <p>📌 <b>Als Nächstes wiederholen:</b> ${aus.wiederholen.map((id) => { const b = INHALT.bloecke.find((x) => x.id === id); return `<button class="knopf zweit" type="button" data-spick="${id}" style="min-height:44px;margin:4px">${esc(b.gebaeude.name)} nachlesen</button>`; }).join('')}</p>
      <p class="klein">Falsch beantwortete Aufgaben sind jetzt in deinen Gebäuden als „reif“ markiert und kommen in den nächsten Ernten wieder.</p>
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
    ${inv.abbildungen?.length ? `<h3>Abbildungen im Material</h3>${inv.abbildungen.map((a) => `<div class="spick-eintrag"><b>${esc(a.titel)}:</b> ${esc(a.beschreibung)} ${quelleHtml(a.quelle)}${a.svg ? `<div class="bild-rahmen" style="max-width:420px;margin:8px 0">${abbildungSvg(a.svg, { loesung: true, markenZeigen: false })}</div>` : ''}</div>`).join('')}` : ''}
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
  const blatt = oeffneDialog(`<div class="blatt-kopf"><div><h2>Markt</h2><p class="klein" style="margin:0">Verschönere deinen Hof. Du hast ${IKON.muenze.replace('<svg', '<svg style="width:18px;height:18px;vertical-align:-3px"')} ${S.muenzen} Münzen.</p></div>${kreuz}</div>
    <div class="markt-liste">${INHALT.deko.map((d) => `<div class="markt-ware">${dekoMini(d.id)}<b>${esc(d.name)}</b><span class="klein">${esc(d.beschreibung)}</span>
      ${S.deko[d.id] ? '<span class="klein">✓ steht auf deinem Hof</span>' : `<button class="knopf ${S.muenzen < d.preis ? 'zweit' : ''}" type="button" data-kauf="${d.id}" ${S.muenzen < d.preis ? 'disabled' : ''}>${d.preis} Münzen</button>`}</div>`).join('')}</div>`, { breit: true });
  blatt.addEventListener('click', (e) => {
    const k = e.target.closest('[data-kauf]');
    if (!k) return;
    const d = INHALT.deko.find((x) => x.id === k.dataset.kauf);
    if (S.muenzen < d.preis) return;
    S.muenzen -= d.preis; S.deko[d.id] = true; speichern(); klang.muenze();
    schliesseDialog(); zeichneHof(); toast(`${d.name} steht jetzt auf deinem Hof. 🌼`);
  });
}

/* =====================================================================
   Info-Dialoge: Level, Serie, Willkommen
   ===================================================================== */
function zeigeLevelInfo() {
  const lv = levelAusXp(S.xp, CFG.levelXp);
  const st = S.statistik;
  oeffneDialog(`<div class="blatt-kopf"><h2>Level ${lv.level}</h2>${kreuz}</div>
    <p>Noch <b>${lv.bisNaechstes} XP</b> bis Level ${lv.level + 1}. XP gibt es für jede richtige Antwort – bei Aufträgen doppelt.</p>
    <div class="statistik"><div><b>${st.ernten}</b><span>Ernten</span></div><div><b>${st.auftraege}</b><span>Aufträge</span></div><div><b>${st.antworten ? Math.round((st.richtig / st.antworten) * 100) : 0} %</b><span>richtig</span></div></div>
    <h3>Was Level freischalten</h3><ul>${INHALT.bloecke.filter((b) => b.level > 1).map((b) => `<li>Level ${b.level}: ${esc(b.gebaeude.name)} – ${esc(b.titel)} (${b.preis} Münzen)</li>`).join('')}</ul>`);
}
function zeigeSerieInfo() {
  const sa = serieAnzeige(S.serie, heute());
  const text = { leer: 'Mach heute deine erste Ernte – dann beginnt deine Tagesserie.', heute: 'Für heute ist deine Serie gesichert. 🌱', offen: 'Heute noch eine Ernte, dann wächst deine Serie weiter.', schutz: 'Gestern hast du ausgesetzt – kein Problem: Einmal pro Woche wird ein Ausfalltag aufgefangen. Lerne heute, dann läuft die Serie weiter.', vorbei: 'Deine letzte Serie ist vorbei. Heute ist ein guter Tag für eine neue!' }[sa.status];
  oeffneDialog(`<div class="blatt-kopf"><h2>Tagesserie: ${sa.tage} ${sa.tage === 1 ? 'Tag' : 'Tage'}</h2>${kreuz}</div><p>${text}</p>
    <p class="klein">Längste Serie: ${S.serie?.beste || 0} Tage. Eine Ernte, ein Auftrag oder eine Probeklausur pro Tag reicht. Fällt ein Tag aus, bleibt die Serie einmal pro Woche erhalten.</p>`);
}
function zeigeWillkommen() {
  const blatt = oeffneDialog(`<div class="blatt-kopf"><h2>Willkommen auf deinem Statik-Hof 🌾</h2></div>
    <p>Hier wächst dein Hof nur durch Lernen. So funktioniert's:</p>
    <ul>
      <li><b>Ernten:</b> Tippe ein Gebäude an und beantworte 5–8 kurze Aufgaben. Richtige Antworten füllen deine Erntekiste.</li>
      <li><b>Fehler sind okay:</b> Du bekommst sofort eine Erklärung, und die Aufgabe kommt später noch einmal.</li>
      <li><b>Reife Ernte:</b> Aufgaben kommen nach 1, 3, 7 und 14 Tagen wieder – die Zahl am Gebäude zeigt, was heute fällig ist.</li>
      <li><b>Produktionsketten:</b> Spätere Gebäude produzieren erst, wenn das Grundwissen sitzt.</li>
      <li><b>Klausur & Spickzettel</b> findest du rechts – mit allen Themen, jederzeit.</li>
    </ul>
    <p class="klein">Jede Aufgabe zeigt, wo sie im Material steht. Dein Spielstand bleibt auf diesem Gerät – sichere ihn ab und zu über die Einstellungen.</p>
    <div class="reihe ende"><button class="knopf" type="button" data-los>Los geht's – zum Kornfeld</button></div>`);
  blatt.querySelector('[data-los]').addEventListener('click', () => { S.begruesst = true; speichern(); schliesseDialog(); oeffneGebaeude('grundlagen'); });
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
    <div class="einstellung"><div><b>Animationen</b><br><span class="klein">Konfetti, Hüpfen, drehende Mühle</span></div><label class="schalter"><input type="checkbox" data-schalter="animationen" ${e.animationen ? 'checked' : ''} aria-label="Animationen"><span></span></label></div>
    <div class="einstellung"><div><b>Darstellung</b></div><div class="wahl">${[['auto', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']].map(([w, t]) => `<button type="button" data-design="${w}" aria-pressed="${e.design === w}">${t}</button>`).join('')}</div></div>
    <div class="einstellung"><div><b>Aufgaben pro Ernte</b></div>${stepper('ernteAufgaben', 5, 8, 1, '')}</div>
    <div class="einstellung"><div><b>Klausur: Dauer</b></div>${stepper('klausurMinuten', 10, 120, 5, ' Min.')}</div>
    <div class="einstellung"><div><b>Klausur: Fragen</b></div>${stepper('klausurFragen', 10, 40, 5, '')}</div>
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
    if (s) { e[s.dataset.schalter] = s.checked; speichern(); wendeEinstellungenAn(); if (s.dataset.schalter === 'ton' && s.checked) klang.richtig(); }
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
window.__statikhof = { get S() { return S; }, get INHALT() { return INHALT; }, zeichneHof,
  testSitzung: (ids) => starteSitzung({ art: 'ernte', titel: 'Test', ids, faktor: 1, blockId: BLOCK_VON[ids[0]].id }) };

start();
