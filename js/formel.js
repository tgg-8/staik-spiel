// formel.js – stellt Formeln aus inhalt.json ohne externe Dienste dar.
// Aufbau einer Formel ("darstellung"): Liste aus
//   "Text"                          → normaler Text
//   { "bruch": [oben, unten] }      → Bruch (oben/unten wieder Text oder Liste)
//   { "hoch":  [basis, exponent] }  → Hochzahl
// Beispiel BMI: ["BMI = ", {"bruch": ["Körpergewicht [kg]", ["(Körpergröße [m])", {"hoch": ["", "2"]}]]}]

export function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[z]));
}

function teil(t) {
  if (Array.isArray(t)) return t.map(teil).join('');
  if (typeof t === 'string') return esc(t);
  if (t && t.bruch) return `<span class="bruch"><span>${teil(t.bruch[0])}</span><span>${teil(t.bruch[1])}</span></span>`;
  if (t && t.hoch) return `${teil(t.hoch[0])}<sup>${teil(t.hoch[1])}</sup>`;
  return '';
}

/** HTML für eine Formel. */
export function formelHtml(darstellung) {
  return `<span class="formel" role="math">${teil(darstellung)}</span>`;
}
