// klang.js – leise Töne, live mit der Web Audio API erzeugt (keine Audiodateien).
// Alle Klänge sind kurz und leise. „Töne“ und „Tierlaute“ sind getrennt abschaltbar.
// iPadOS/Safari erlaubt Ton erst nach einer Berührung: entsperre() hängt sich an die
// erste Berührung und weckt den Audio-Kontext mit einem stummen Puffer.

let ctx = null;
let an = true;
let tiereAn = true;

export function tonAn(wert, tierlaute = true) { an = !!wert; tiereAn = !!tierlaute; }

function kontext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Einmal bei der ersten Berührung aufrufen (iPadOS-Audiosperre). */
export function entsperre() {
  const los = () => {
    const c = kontext();
    if (c) {
      try {
        const b = c.createBuffer(1, 1, 22050);
        const q = c.createBufferSource();
        q.buffer = b; q.connect(c.destination); q.start(0);
      } catch { /* egal */ }
    }
    window.removeEventListener('pointerdown', los, true);
    window.removeEventListener('touchend', los, true);
    window.removeEventListener('keydown', los, true);
  };
  window.addEventListener('pointerdown', los, true);
  window.addEventListener('touchend', los, true);
  window.addEventListener('keydown', los, true);
}

/** Spielt eine Folge weicher Töne (Frequenzen in Hz). */
function spiele(noten, { abstand = 0.09, dauer = 0.35, lautstaerke = 0.07, typ = 'sine' } = {}) {
  if (!an) return;
  const c = kontext();
  if (!c) return;
  const start = c.currentTime + 0.01;
  noten.forEach((f, i) => {
    const t = start + i * abstand;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = typ;
    osc.frequency.setValueAtTime(f, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(lautstaerke, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dauer + 0.05);
  });
}

/** Gleitender Ton (für Tierlaute): Frequenzverlauf als [Zeit, Hz]-Paare. */
function gleite(verlauf, { lautstaerke = 0.04, typ = 'triangle', vibrato = 0, vibratoTiefe = 0, filter = 0 } = {}) {
  if (!an || !tiereAn) return;
  const c = kontext();
  if (!c) return;
  const t0 = c.currentTime + 0.01;
  const ende = verlauf[verlauf.length - 1][0];
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = typ;
  verlauf.forEach(([t, f], i) => { if (i === 0) osc.frequency.setValueAtTime(f, t0); else osc.frequency.linearRampToValueAtTime(f, t0 + t); });
  if (vibrato) {
    const lfo = c.createOscillator(); const lg = c.createGain();
    lfo.frequency.value = vibrato; lg.gain.value = vibratoTiefe;
    lfo.connect(lg).connect(osc.frequency); lfo.start(t0); lfo.stop(t0 + ende + 0.05);
  }
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(lautstaerke, t0 + 0.03);
  gain.gain.setValueAtTime(lautstaerke, t0 + ende * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + ende);
  let knoten = osc;
  if (filter) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = filter; osc.connect(lp); knoten = lp; }
  knoten.connect(gain).connect(c.destination);
  osc.start(t0); osc.stop(t0 + ende + 0.05);
}

/** Weiches Rauschen (Schnauben, Rascheln). */
function rauschen(dauer, { lautstaerke = 0.05, frequenz = 900 } = {}) {
  if (!an || !tiereAn) return;
  const c = kontext();
  if (!c) return;
  const laenge = Math.floor(c.sampleRate * dauer);
  const puffer = c.createBuffer(1, laenge, c.sampleRate);
  const d = puffer.getChannelData(0);
  for (let i = 0; i < laenge; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / laenge, 1.5);
  const q = c.createBufferSource(); q.buffer = puffer;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = frequenz; bp.Q.value = 0.8;
  const g = c.createGain(); g.gain.value = lautstaerke;
  q.connect(bp).connect(g).connect(c.destination);
  q.start();
}

export const klang = {
  richtig: () => spiele([659.25, 987.77], { abstand: 0.08 }),          // E5 → H5
  nochmal: () => spiele([392.0, 349.23], { abstand: 0.1, lautstaerke: 0.045, typ: 'triangle' }), // weich, nicht strafend
  tipp: () => spiele([880], { dauer: 0.08, lautstaerke: 0.025 }),
  wachsen: () => spiele([783.99, 1174.66], { abstand: 0.06, dauer: 0.22, lautstaerke: 0.035 }),
  ernte: () => spiele([523.25, 659.25, 783.99, 1046.5], { abstand: 0.1, dauer: 0.5 }),
  korn: (i = 0) => spiele([1046.5 + i * 60], { dauer: 0.12, lautstaerke: 0.03 }),
  level: () => spiele([523.25, 659.25, 783.99, 1046.5, 1318.5], { abstand: 0.12, dauer: 0.7, lautstaerke: 0.08 }),
  muenze: () => spiele([1318.5, 1760], { abstand: 0.05, dauer: 0.18, lautstaerke: 0.04 }),
  // Tierlaute (eigene Einstellung „Tierlaute“)
  wiehern: () => gleite([[0, 520], [0.15, 760], [0.55, 640], [0.9, 420]], { lautstaerke: 0.03, vibrato: 18, vibratoTiefe: 40, filter: 2200 }),
  schnauben: () => rauschen(0.35, { lautstaerke: 0.06, frequenz: 600 }),
  piep: () => gleite([[0, 2300], [0.07, 2900], [0.12, 2500]], { lautstaerke: 0.025, typ: 'sine' }),
  gacker: () => { gleite([[0, 420], [0.06, 560], [0.1, 380]], { lautstaerke: 0.03, typ: 'square', filter: 1400 }); setTimeout(() => gleite([[0, 450], [0.08, 600], [0.14, 400]], { lautstaerke: 0.025, typ: 'square', filter: 1400 }), 140); },
};
