# LSS Tools

Modulare Open-Source Userscripts und Bibliotheken für das Leitstellenspiel.

Dieses Projekt entwickelt Werkzeuge zur Erweiterung und Verbesserung der Spielverwaltung.
Der Schwerpunkt liegt auf einer sauberen, erweiterbaren Architektur mit wiederverwendbaren Modulen.

<!-- BEGIN DIST SCRIPTS -->
## Skripte in `dist`

- [`Gebietsleiter - Zentrale Leitstelle`](dist/areaManagement/areaManager.user.js)
- [`[LSS] Ersthelfer`](dist/FirstResponder.user.js) — Wählt das nächstliegende Ersthelferfahrzeug aus; Fahrzeuge können über ein Menü konfiguriert werden.
- [`[ LSS  ] Hide elemnts`](dist/killmap.user.js) — Löscht die Karte vollständig aus dem Speicher, um CPU-Last zu sparen.
- [`LSS Massenentlassungen`](dist/LSS Massenentlassungen.user.js) — Ermöglicht das massenhafte Entlassen von Personal
- [`[LSS] Layout 04`](dist/lssm-layout-04.user.js) — Kompaktes Layout für das Leitstellenspiel (Basiert auf LSSM v3)
- [`[LSSM] MissionsOut`](dist/lssm-missionsOut.user.js) — Einsatz aus/ein-blenden
- [`LSS Einsatz-Generierungszeitpunkt`](dist/missionDateAge.user.js) — Zeigt den Erstellungszeitpunkt und das Alter des Einsatzes an (Rot ab 24h um 01:00 Uhr nachts).
- [`[ LSS ] fehlendes Personal schnell FMS 6 setzen`](dist/missionVehicleErrrorFMS6.user.js) — erstellt bei der Fehlermeldung im Einsatz einen Button, um bei fehlendem Personal schnell FMS6 zu setzen
- [`[LSS] showAddress`](dist/ShowAddress.user.js) — zeigt die Adresse der Wache im Gebäude an
- [`* Wachenbaupläne`](dist/teplateEditor.js) — Verwaltet Baupläne für benutzerdefinierte Vorlagen, wie Wachen ausgebaut und ausgestattet werden sollen
- [`[ LSS ] erweiterter Lehrgangszuweiser`](dist/trainingPersonalSelector.user.js) — Fügt Buttons hinzu, um Personal einer Wache gesammelt einem Lehrgang zuzuweisen. Behebt wechselwirkung mit Ausbildungsmausschoner und erweitert um Vollausblidungs Feature
- [`Fahrzeugzuweisung Wachenweise`](dist/vehiclePersonnelAssignment/vehiclePersonnelAssignment.user.js) — Prüft und korrigiert Zuweisungen einer Wache, setzt FMS 2/6.
- [`* Wachenbaupläne`](dist/Wachenbaupläne.user.js) — Verwaltet Baupläne für benutzerdefinierte Vorlagen, wie Wachen ausgebaut und ausgestattet werden sollen
<!-- END DIST SCRIPTS -->

## libarys
Diese scripts werden per @require eingebunden und stellen dadurch ihre Funktionen bereit

- [`api-fetch-database-handler.js`](lib/api-fetch-database-handler.js) -- stellt funktionen zum fetch incl update inteligenz der api's bereit
- [`indexedDb.js`](lib/indexedDb.js) -- stellt funktioen zur nutzen einer indexedDb bereit


## Regeln und Nutzungshinweis

Die Scripts und Zusatzprogramme dieses Projekts richten sich nach der
[Richtlinie für Scripte und Zusatzprogramme](docs/richtlinie-scripte-zusatzprogramme.md).
Diese enthält unter anderem Vorgaben zu bewussten Nutzeraktionen,
Sammelaktionen, Datenschutz, externen Verbindungen, transparentem Quellcode
und dem Einsatz von KI. Die Verantwortung für veröffentlichten Code bleibt
unabhängig von seiner Entstehung bei der veröffentlichenden Person.

Die veröffentlichten Scripts sind keine offiziellen Bestandteile des
Leitstellenspiels und werden vom Betreiber weder freigegeben noch unterstützt.
Bitte prüfe vor der Installation, was ein Script tut, und beachte die jeweils
aktuellen Spielregeln und Nutzungsbedingungen.

Weitere Informationen zu Zweck, Datenverarbeitung, lokalen Speichern,
Netzwerkverbindungen und möglichen Risiken enthält der
[Nutzungs-, Daten- und Risikohinweis](docs/nutzungs-und-datenhinweis.md).


## Lizenz

Dieses Projekt steht unter der GNU Affero General Public License v3.0 oder später.

Einzelne Bestandteile können unter abweichenden Lizenzen stehen.
Siehe `NOTICE.md` und `THIRD_PARTY_LICENSES.md`.

## Herkunft

Dieses Projekt basiert teilweise auf bestehenden Open-Source-Arbeiten der LSS-Community.
Ursprüngliche Bestandteile werden mit ihrem jeweiligen Copyright und ihrer ursprünglichen Lizenz kenntlich gemacht.

@ai assisted
