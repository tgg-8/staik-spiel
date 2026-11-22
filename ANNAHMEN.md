# Annahmen (Spieldesign, Version 2)

Hier steht, was ich beim Ausbau selbst entschieden habe, weil der Auftrag es offenließ. Nichts davon betrifft den Lernstoff: Alle Inhalte stammen unverändert aus `inhalt.json` bzw. den PDFs.

## Korn und Ernte
- **Jedes gebaute Gebäude hat ein Beet mit 6 Plätzen.** Stufen: leer → Saat → Spross → Halm → reif.
- **Wachstumsregel:** Jede richtige Antwort zu einem Thema lässt alle wachsenden Pflanzen in dessen Beet eine Stufe wachsen und sät auf einem freien Platz neu. Nach 4 richtigen Antworten ist das erste Korn reif. Das Beet arbeitet wie ein kleines Fließband: In einer Runde mit 6 richtigen Antworten werden 3 Körner reif.
- **Nur Lernen zählt:** Es gibt keine Timer und kein Verderben. Reifes Korn bleibt stehen, bis es geerntet wird. Ist das Beet komplett reif, wächst nichts weiter, bis geerntet ist (in der Lernrunde steht dann „Beet voll – auf dem Hof ernten!“).
- **„Richtig“** heißt dasselbe wie für das Wiederholungssystem: richtig und ohne Lösungsweg. Der zweite Versuch in derselben Runde zählt auch.
- **Wo wächst es?** Immer im Beet des Themas der Aufgabe, auch bei Aufträgen (Mischaufgaben) und in der Probeklausur (dort erst bei der Auswertung). Gebäude, die noch nicht gebaut sind, haben kein Beet. Bei ihnen wächst nichts.
- **Ernten** passiert auf dem Hof durch Antippen des Beets (oder über „Korn ernten“ im Gebäudedialog). Beim Kornfeld ist das Feld selbst das Beet. Bei reifem Korn öffnet man den Gebäudedialog über das Namensschild.

## Wirtschaft
- **Lernrunde:** nur XP (10 je Antwort im ersten Versuch, 5 im zweiten).
- **Ernte:** je Korn 5 Münzen und 2 XP (`muenzenProKorn`, `xpProKorn` in `inhalt.json → einstellungen`).
- **Auftrag:** XP und Münzen wie bisher, ×2, direkt beim Liefern.
- **Probeklausur:** unverändert 5 XP und 2 Münzen pro Punkt.
- Damit verdient man pro richtiger Antwort ungefähr so viele Münzen wie vorher. Die Gebäudepreise mussten sich nicht ändern.
- Level-Aufstiege werden auch durch Ernte-XP erkannt und gefeiert.

## Alte Spielstände
- Spielstände der Version 1 werden automatisch auf Version 2 gebracht: Karten, XP, Münzen, Gebäude, Deko, Serie, Statistik und Einstellungen bleiben erhalten. Die Beete beginnen leer, der Kornzähler bei 0. Rückwirkend gibt es kein Korn, denn die Münzen von früher sind ja schon ausgezahlt.
- Neue Einstellungen (Tiere, Tierlaute, Tageszeit) starten eingeschaltet.

## Tiere und Stimmung
- **Anzahl nach Level:** Pferde 1 (ab Level 3: 2, ab Level 5: 3), Hühner 2–5, Küken 3–7, Schmetterlinge 2–4.
- Pferde bleiben auf der Weide und gehen gelegentlich ein Stück den Weg hinunter und zurück. Hühner und Küken bleiben im Hühnerhof, Küken folgen meist einer Henne. In diesen Zonen steht kein Gebäude. Die Tiere liegen unter Kopfzeile und Knöpfen, verdecken also keine Bedienung.
- Die Bewegung pausiert, solange ein Dialog oder eine Lernrunde offen ist oder die App im Hintergrund liegt. Ist „Animationen“ aus oder „Bewegung reduzieren“ im System an, stehen die Tiere still.
- **Tageszeit (nur Optik):** Morgen 5–9 Uhr, Tag 9–17 Uhr, Abend 17–21 Uhr, Nacht 21–5 Uhr. Im Dunkelmodus ist immer Nacht. Abschaltbar.
- Tierlaute erklingen nur beim Antippen eines Tieres und selten von selbst (ein Pferd schnaubt). Alle Laute werden mit Web Audio erzeugt, es gibt keine Tondateien.

## Begriffe
- Aus „Ernte“ (Aufgabenrunde) wurde **„Lernrunde“**. „Ernten“ bedeutet jetzt nur noch das Einsammeln von reifem Korn. Fällige Wiederholungen heißen „fällig“ statt „reif“, damit es keine Verwechslung mit reifem Korn gibt.
- Die frühere „Erntekiste“ in der Kopfzeile wurde durch den Beet-Streifen und eine Fortschrittsleiste ersetzt.

## Markt
- Gekaufte Deko lässt sich einlagern und wieder aufstellen, ohne erneut zu bezahlen.
