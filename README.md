# LSS Tools

Modulare Open-Source Userscripts und Bibliotheken für das Leitstellenspiel.

Dieses Projekt entwickelt Werkzeuge zur Erweiterung und Verbesserung der Spielverwaltung.
Der Schwerpunkt liegt auf einer sauberen, erweiterbaren Architektur mit wiederverwendbaren Modulen.

<!-- BEGIN DIST SCRIPTS -->
## Skripte in `dist`

- [`[LSS] Ersthelfer`](dist/FirstResponder.user.js) — Wählt das nächstliegende Ersthelferfahrzeug aus; Fahrzeuge können über ein Menü konfiguriert werden.
- [`[ LSS  ] Hide elemnts`](dist/killmap.user.js) — Löscht die Karte vollständig aus dem Speicher, um CPU-Last zu sparen.
- [`LSS Massenentlassungen
`](dist/LSS Massenentlassungen.user.js) — Ermöglicht das massenhafte Entlassen von Personal
- [`[LSS] Layout 04`](dist/lssm-layout-04.user.js) — Kompaktes Layout für das Leitstellenspiel (Basiert auf LSSM v3)
- [`[LSSM] MissionsOut`](dist/lssm-missionsOut.user.js) — Einsatz aus/ein-blenden
- [`LSS Einsatz-Generierungszeitpunkt`](dist/missionDateAge.user.js) — Zeigt den Erstellungszeitpunkt und das Alter des Einsatzes an (Rot ab 24h um 01:00 Uhr nachts).
- [`[LSS] showAddress`](dist/ShowAddress.user.js) — zeigt die Adresse der Wache im Gebäude an
- [`[ LSS ] erweiterter Lehrgangszuweiser`](dist/trainingPersonalSelector.user.js) — Fügt Buttons hinzu, um Personal einer Wache gesammelt einem Lehrgang zuzuweisen. Behebt wechselwirkung mit Ausbildungsmausschoner und erweitert um Vollausblidungs Feature
<!-- END DIST SCRIPTS -->

- [`indexedDB.js`](lib/indexedDB.js) — Stellt Funktionen bereit indexedDb zu nutzen. Manpage erklährungen sind im Kopf enthalten.
- [`api-fetch-database-handler.js`](lib/api-fetch-database-handler.js) - Stellt Funktionen bereit, für den api fetch und direktes datenbank verarbeiten.
## Funktionen

Geplant:

- Weiterenticklung vom Wachenbauplan
- Beschaffungsagent
- Gebäude u. Fuhrpark Verwalter - rc1 rcomming soon

## Lizenz

Dieses Projekt steht unter der GNU Affero General Public License v3.0 oder später.

Einzelne Bestandteile können unter abweichenden Lizenzen stehen.
Siehe `NOTICE.md` und `THIRD_PARTY_LICENSES.md`.

## Herkunft

Dieses Projekt basiert teilweise auf bestehenden Open-Source-Arbeiten der LSS-Community.

Ursprüngliche Bestandteile werden mit ihrem jeweiligen Copyright und ihrer ursprünglichen Lizenz kenntlich gemacht.
