# LSS Tools

Modulare Open-Source Userscripts und Bibliotheken für das Leitstellenspiel.

Dieses Projekt entwickelt Werkzeuge zur Erweiterung und Verbesserung der Spielverwaltung.
Der Schwerpunkt liegt auf einer sauberen, erweiterbaren Architektur mit wiederverwendbaren Modulen.

## Verbindliche Arbeitsregeln für Codex

- Bearbeite ausschließlich den Auftrag, den der Nutzer gerade ausdrücklich erteilt hat. Führe keine naheliegenden Folgearbeiten oder vermuteten nächsten Schritte eigenständig aus.
- Eine Frage nach Ursache oder Erklärung ist keine Erlaubnis, den Code zu ändern. Ein Auftrag, einen konkreten Fehler zu beheben, erlaubt nur die dafür nötige Änderung – nicht die Fertigstellung angrenzender Funktionen.
- Wenn der Umfang einer Anweisung wie „den letzten Punkt beheben“ mehrdeutig ist, kläre zuerst, welcher Punkt gemeint ist und wie weit die Änderung gehen soll.
- Nenne angrenzende offene Probleme als Hinweis, behandle sie aber nicht als Arbeitsauftrag.
- Halte Änderungen auf die betroffene Stelle begrenzt. Keine zusätzlichen Umstrukturierungen, Bereinigungen, Tests oder Änderungen an anderen Dateien ohne ausdrücklichen Auftrag.
- Ändere keine Datei, an der der Nutzer gerade arbeitet oder die noch geöffnet ist. Warte, bis der Nutzer bestätigt, dass die Datei geschlossen ist. Erhalte vorhandene Änderungen und überschreibe keine ganze Datei für eine kleine Korrektur.
- Berichte knapp, was geändert wurde und was offen bleibt. Behaupte nicht, etwas getestet zu haben, wenn es nicht tatsächlich ausgeführt wurde.

<!-- BEGIN DIST SCRIPTS -->
## Skripte in `dist`

- [`[LSS] Ersthelfer`](dist/FirstResponder.user.js) — Wählt das nächstliegende Ersthelferfahrzeug aus; Fahrzeuge können über ein Menü konfiguriert werden.
- [`Gebietsleiter - Zentrale Leitstelle`](dist/gebietsleitung.user.js)
- [`[ LSS  ] Hide elemnts`](dist/killmap.user.js) — Löscht die Karte vollständig aus dem Speicher, um CPU-Last zu sparen.
- [`LSS Massenentlassungen`](dist/LSS Massenentlassungen.user.js) — Ermöglicht das massenhafte Entlassen von Personal
- [`[LSS] Layout 04`](dist/lssm-layout-04.user.js) — Kompaktes Layout für das Leitstellenspiel (Basiert auf LSSM v3)
- [`[LSSM] MissionsOut`](dist/lssm-missionsOut.user.js) — Einsatz aus/ein-blenden
- [`LSS Einsatz-Generierungszeitpunkt`](dist/missionDateAge.user.js) — Zeigt den Erstellungszeitpunkt und das Alter des Einsatzes an (Rot ab 24h um 01:00 Uhr nachts).
- [`[ LSS ] fehlendes Personal schnell FMS 6 setzen`](dist/missionVehicleErrrorFMS6.user.js) — erstellt bei der Fehlermeldung im Einsatz einen Button, um bei fehlendem Personal schnell FMS6 zu setzen
- [`[LSS] showAddress`](dist/ShowAddress.user.js) — zeigt die Adresse der Wache im Gebäude an
- [`* Wachenbaupläne`](dist/teplateEditor.js) — Verwaltet Baupläne für benutzerdefinierte Vorlagen, wie Wachen ausgebaut und ausgestattet werden sollen
- [`[ LSS ] erweiterter Lehrgangszuweiser`](dist/trainingPersonalSelector.user.js) — Fügt Buttons hinzu, um Personal einer Wache gesammelt einem Lehrgang zuzuweisen. Behebt wechselwirkung mit Ausbildungsmausschoner und erweitert um Vollausblidungs Feature
- [`* Wachenbaupläne`](dist/Wachenbaupläne.user.js) — Verwaltet Baupläne für benutzerdefinierte Vorlagen, wie Wachen ausgebaut und ausgestattet werden sollen
<!-- END DIST SCRIPTS -->
## libarys
Diese scripts werden per @require eingebunden und stellen dadurch ihre Funktionen bereit

- [`api-fetch-database-handler.js`](lib/api-fetch-database-handler.js) -- stellt funktionen zum fetch incl update inteligenz der api's bereit
- [`indexedDb.js`](lib/indexedDb.js) -- stellt funktioen zur nutzen einer indexedDb bereit
## Funktionen

Geplant:

- Weiterenticklung vom Wachenbauplan
- Beschaffungsagent
- Gebäude u. Fuhrpark Verwalter

## Lizenz

Dieses Projekt steht unter der GNU Affero General Public License v3.0 oder später.

Einzelne Bestandteile können unter abweichenden Lizenzen stehen.
Siehe `NOTICE.md` und `THIRD_PARTY_LICENSES.md`.

## Herkunft

Dieses Projekt basiert teilweise auf bestehenden Open-Source-Arbeiten der LSS-Community.

Ursprüngliche Bestandteile werden mit ihrem jeweiligen Copyright und ihrer ursprünglichen Lizenz kenntlich gemacht.
