# Statik-Hof 🌾

Offline-Lern-App (PWA) für die **Statik-Klausur** im 1. Ausbildungsjahr Physiotherapie. Gelernt wird in kurzen „Ernten“, und jede richtige Antwort lässt einen eigenen Hof wachsen. Das Spielprinzip ist von Farm-Aufbauspielen inspiriert. Grafiken, Namen und Töne sind eigene Entwürfe.

- **Anleitung** (Veröffentlichen, iPad-Installation, Inhalte ergänzen): [ANLEITUNG.md](ANLEITUNG.md)
- **Unklare Stellen im Material:** [OFFENE_PUNKTE.md](OFFENE_PUNKTE.md)
- **Alle Lerninhalte:** [`inhalt.json`](inhalt.json) (getrennt vom Code, jede Aufgabe mit Quellenangabe)

## Aufbau

```
index.html            Startseite
inhalt.json           Lernstoff-Inventar: Themenblöcke, Begriffe, Formeln, Merksätze, Aufgaben
manifest.webmanifest  PWA-Manifest (Installation auf dem iPad)
sw.js                 Service Worker (Offline-Betrieb)
css/app.css           Gestaltung (Hell/Dunkel)
js/app.js             Hauptprogramm und Bildschirme
js/leitner.js         Wiederholungssystem (Fächer 0/1/3/7/14 Tage)
js/spiel.js           Level, Münzen, Gebäude, Produktionsketten, Tagesserie, Aufträge, Klausur
js/pruefen.js         Antwortprüfung (Komma/Punkt, Einheiten, Toleranz)
js/aufgaben-ui.js     Darstellung der 7 Aufgabentypen (Touch)
js/farm.js            Hof als SVG
js/abbildungen.js     Eigene SVG-Abbildungen für Bildaufgaben
js/skizzen.js         Interaktive Mini-Skizzen (Lot, OSG, Navicular Drop, Schultergürtel, Längen, BMI/BAI, USF)
js/speicher.js        Spielstand (localStorage), Export/Import/Reset
tests/                Automatische Tests
material/             Lese-Notizen zum Material (die Original-PDFs werden nicht mitveröffentlicht)
```

Kein Build-Schritt, keine externen Bibliotheken, keine Tracker.

## Tests

```bash
npm test                      # Logik + inhalt.json (inkl. Nachrechnen aller Rechenaufgaben)
python3 -m http.server 8080   # in einem zweiten Terminal
node tests/e2e.mjs            # Ende-zu-Ende im emulierten iPad (braucht Playwright + Chromium)
```
