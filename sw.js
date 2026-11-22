// sw.js – Service Worker: macht den Statik-Hof offline-fähig.
// Beim ersten Öffnen werden alle Dateien zwischengespeichert. Danach startet die App
// aus dem Zwischenspeicher (auch ohne Internet) und holt sich im Hintergrund
// neue Versionen, wenn eine Verbindung besteht („stale-while-revalidate“).
// Wer Dateien ändert, sollte VERSION hochzählen – dann wird der Speicher erneuert.

const VERSION = 'statikhof-v2.0.0';
const DATEIEN = [
  './',
  'index.html',
  'inhalt.json',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/abbildungen.js',
  'js/aufgaben-ui.js',
  'js/datum.js',
  'js/farm.js',
  'js/feld.js',
  'js/formel.js',
  'js/klang.js',
  'js/leben.js',
  'js/leitner.js',
  'js/pruefen.js',
  'js/skizzen.js',
  'js/speicher.js',
  'js/spiel.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const gespeichert = await cache.match(req, { ignoreSearch: true });
      const netz = fetch(req)
        .then((antwort) => { if (antwort && antwort.ok) cache.put(req, antwort.clone()); return antwort; })
        .catch(() => null);
      if (gespeichert) { event.waitUntil(netz); return gespeichert; }
      const antwort = await netz;
      if (antwort) return antwort;
      // Offline und nicht im Speicher: bei Seitenaufrufen die Startseite liefern.
      if (req.mode === 'navigate') return cache.match('index.html');
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    })
  );
});
