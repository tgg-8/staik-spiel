# Statik-Hof – Anleitung

Der Statik-Hof ist eine Lern-App für die Statik-Klausur. Sie läuft im Browser, lässt sich auf dem iPad wie eine App installieren und funktioniert danach **ohne Internet**.

Die App ist ein einfacher Ordner mit Dateien. Ein Server-Programm, eine Datenbank oder ein Login braucht man nicht.

---

## 1. Die App kostenlos veröffentlichen

Die App muss einmal im Internet liegen, damit das iPad sie laden und installieren kann. Danach läuft sie auch offline.

> **Wichtig:** Lade nur die App-Dateien hoch. Die Original-PDFs im Ordner `material/` gehören nicht dazu (sie sind privat und sehr groß). Das Repository schließt sie über `.gitignore` bereits aus.

### Weg A: Netlify Drop (am einfachsten, ohne GitHub)

1. Öffne am Computer **https://app.netlify.com/drop** und melde dich kostenlos an (z. B. mit E-Mail).
2. Lege eine Kopie des Projektordners an und **lösche darin den Ordner `material`** (oder nur die PDF-Dateien darin).
3. Ziehe den Ordner auf die Fläche „Drag and drop your site output folder here“.
4. Nach wenigen Sekunden bekommst du eine Adresse wie `https://irgendwas-123.netlify.app`. Das ist deine App.
5. Optional: Unter „Site configuration → Change site name“ einen schöneren Namen wählen, z. B. `statik-hof-anna`.

**Update später:** In Netlify unter „Deploys“ den geänderten Ordner erneut auf die Fläche ziehen.

### Weg B: GitHub Pages

1. Lade den Projektordner in ein GitHub-Repository hoch (die PDFs bleiben durch `.gitignore` draußen).
2. Im Repository: **Settings → Pages**.
3. Bei „Build and deployment“: Source = **Deploy from a branch**, Branch = `main`, Ordner = `/ (root)`, **Save**.
4. Nach 1–2 Minuten steht oben die Adresse, z. B. `https://deinname.github.io/anatomie-lernen/`.

Hinweis: Mit einem kostenlosen GitHub-Konto funktioniert Pages nur bei **öffentlichen** Repositories. Wer das nicht möchte, nimmt Weg A.

### Lokal testen (optional, für Bastler)

Im Projektordner ein Terminal öffnen und `python3 -m http.server 8080` starten, dann im Browser `http://localhost:8080` öffnen. Ein einfacher Doppelklick auf `index.html` funktioniert **nicht**, weil der Browser die Inhalte dann nicht laden darf.

---

## 2. Auf dem iPad installieren

1. Öffne die Adresse der App in **Safari**. Andere Browser auf dem iPad können keine Web-Apps installieren.
2. Warte, bis der Hof erscheint. Dabei speichert die App alles für den Offline-Betrieb.
3. Tippe oben auf das **Teilen-Symbol** (Quadrat mit Pfeil nach oben).
4. Wähle **„Zum Home-Bildschirm“** und dann **„Hinzufügen“**.
5. Starte den Statik-Hof ab jetzt immer über das neue Symbol auf dem Home-Bildschirm. Er öffnet sich dann ohne Safari-Leiste und funktioniert auch im Flugmodus.

**Gut zu wissen:**

- Der Spielstand wird **auf dem iPad gespeichert**, und zwar getrennt für Safari und für die installierte App. Lerne deshalb immer in der installierten App.
- **Sicherung:** Zahnrad → *Exportieren*. Die Datei z. B. in „Dateien“ oder iCloud Drive sichern. Wiederherstellen geht über *Importieren*.
- Wenn du die App vom Home-Bildschirm löschst, ist der Spielstand weg. Vorher also exportieren!
- Töne, Tierlaute, Animationen, Tiere, Tageszeit-Himmel, Hell/Dunkel, Aufgaben pro Lernrunde und die Klausurdauer stellst du über das Zahnrad ein. Dort findest du auch jederzeit die **Spielanleitung**.
- Auf dem iPad sind Töne erst nach der ersten Berührung möglich (Vorgabe von Safari). Bleibt es still: Stummschalter/Lautstärke prüfen.

### So spielt man

- **Lernrunde:** Gebäude antippen → 5–8 Aufgaben aus diesem Thema.
- **Korn wächst:** Jede richtige Antwort lässt das Beet neben dem Gebäude wachsen (Saat → Spross → Halm → reif). Falsche Antworten kosten nichts.
- **Ernten:** Reifes Korn hat ein goldenes Schild. Beet antippen → Münzen und XP. Mit Münzen baust du neue Gebäude und kaufst Deko.
- **Leuchtende Beete** zeigen fällige Wiederholungen.

---

## 3. Neue Inhalte hinzufügen

Alle Lerninhalte stehen in **einer** Datei: `inhalt.json`. Den Programmcode musst du dafür nicht anfassen.

### So geht's

1. Öffne `inhalt.json` in einem Texteditor, z. B. *Visual Studio Code* (kostenlos) oder direkt auf GitHub über das Stift-Symbol.
2. Suche den passenden Themenblock (z. B. `"id": "sagittal"`) und darin die Liste `"aufgaben": [ … ]`.
3. Kopiere eine vorhandene Aufgabe **desselben Typs**, füge sie dahinter ein (Komma zwischen zwei Aufgaben nicht vergessen) und ändere die Texte.
4. Vergib eine **neue, eindeutige `id`**, z. B. `r45`.
5. Trage bei `"quelle"` ein, wo es im Material steht: Kürzel und PDF-Seite, z. B. `"I/7"` oder `"D/3, I/7"`. Die Kürzel stehen oben in der Datei unter `"quellen"`. Für ein neues PDF dort einen neuen Buchstaben anlegen.
6. Speichern und die App wieder veröffentlichen (siehe Abschnitt 1). Beim nächsten Öffnen mit Internet lädt das iPad die neue Version im Hintergrund, beim übernächsten Start ist sie da.
7. Für ein schnelleres Update in `sw.js` die Zeile `const VERSION = 'statikhof-v1.0.0';` hochzählen, z. B. auf `v1.0.1`.

### Die Aufgabentypen

| Typ | Wichtige Felder |
|---|---|
| `mc` (Multiple Choice) | `frage`, `optionen` (Liste), `richtig` (Nummer der richtigen Option, **ab 0 gezählt**) |
| `wahrfalsch` | `aussage`, `wahr` (`true`/`false`), `begruendungen` (Liste), `richtigeBegruendung` (Nummer ab 0) |
| `luecke` | `text` mit `{}` für jede Lücke, `loesungen` (in Reihenfolge), `ablenker` (falsche Wörter) |
| `zuordnen` | `paare`: Liste aus `["links", "rechts"]` |
| `reihenfolge` | `schritte` in der **richtigen** Reihenfolge (die App mischt sie) |
| `rechnen` | `ergebnis` (Zahl mit Punkt, z. B. `22.7`), `toleranz`, `einheit`, `einheiten` (Auswahl), `hinweise`, `loesungsweg`, `pruefung` (für den Selbsttest) |
| `bild` | `abbildung` (eine Grafik aus `js/abbildungen.js`), `modus` `antippen` mit `ziele` oder `beschriften` mit `marken` |

Jede Aufgabe braucht außerdem eine `erklaerung`. Sie erscheint nach dem Prüfen, kurz und freundlich.

### Spickzettel ergänzen

Im Block unter `"inventar"` stehen `begriffe`, `formeln`, `merksaetze`, `abbildungen` und `beispielaufgaben`. Alles, was du dort einträgst, erscheint automatisch im Spickzettel und bei „Nachlesen“.

### Einen neuen Themenblock (neues Gebäude) anlegen

Einen ganzen Block in `"bloecke"` kopieren und anpassen: `id`, `titel`, `level` (ab welchem Level), `preis` (Münzen), `vorstufen` (welche Blöcke vorher sitzen müssen). Bei `gebaeude.typ` ist eines der vorhandenen Bilder nötig: `kornfeld`, `brunnen`, `muehle`, `stall`, `scheune`, `werkstatt`, `imkerei`, `baeckerei`. Für ein ganz neues Gebäudebild muss man `js/farm.js` erweitern.

### Prüfen, ob alles stimmt (empfohlen)

Wer Node.js installiert hat, kann im Projektordner `npm test` ausführen. Das Programm prüft `inhalt.json` auf Tippfehler im Aufbau und gültige Quellen und **rechnet alle Rechenaufgaben nach**. Ohne Node.js: Nach dem Veröffentlichen die neue Aufgabe einmal in der App ausprobieren. Wenn die App nach einer Änderung leer bleibt, fehlt meist ein Komma oder eine Klammer in `inhalt.json`. Ein JSON-Prüfer wie https://jsonlint.com zeigt die Stelle.
