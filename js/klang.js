// klang.js – dezente Töne, live mit der Web Audio API erzeugt (keine Audiodateien nötig).
// Alle Töne sind kurz und leise. In den Einstellungen abschaltbar.

let ctx = null;
let an = true;

export function tonAn(wert) { an = !!wert; }

function kontext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
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

export const klang = {
  richtig: () => spiele([659.25, 987.77], { abstand: 0.08 }),          // E5 → H5
  nochmal: () => spiele([392.0, 349.23], { abstand: 0.1, lautstaerke: 0.045, typ: 'triangle' }), // weich, nicht strafend
  tipp: () => spiele([880], { dauer: 0.08, lautstaerke: 0.025 }),
  ernte: () => spiele([523.25, 659.25, 783.99, 1046.5], { abstand: 0.1, dauer: 0.5 }),
  level: () => spiele([523.25, 659.25, 783.99, 1046.5, 1318.5], { abstand: 0.12, dauer: 0.7, lautstaerke: 0.08 }),
  muenze: () => spiele([1318.5, 1760], { abstand: 0.05, dauer: 0.18, lautstaerke: 0.04 }),
};
