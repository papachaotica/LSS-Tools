# LSS Tools

Userscripts und Bibliotheken für das Leitstellenspiel.

Diese README beschreibt den Stand des Branches `main`. Sie führt die enthaltenen Userscripts sowie deren dauerhafte lokale Speicherung auf.

## Userscripts in `dist`

| Script | Funktion | Dauerhaft gespeicherte Daten |
| --- | --- | --- |
| [Ersthelfer](dist/FirstResponder.user.js) | Wählt das nächstgelegene Ersthelferfahrzeug aus den konfigurierten Fahrzeugtypen. Die Typen lassen sich über ein Menü auswählen. | Tampermonkey-Speicher: ausgewählte Fahrzeugtyp-IDs unter `lss_first_responder_ids`. |
| [Massenentlassungen](dist/LSS%20Massenentlassungen.user.js) | Ergänzt die Personalseite um Auswahlhilfen, etwa für Personal ohne Ausbildung oder ohne Fahrzeugbindung. | Keine eigene dauerhafte Speicherung. Die Auswahl bleibt im aktuellen Seitenzustand; die eigentliche Entlassung erfolgt über die Spieloberfläche. |
| [ShowAddress](dist/ShowAddress.user.js) | Zeigt auf der Gebäudeseite die Adresse der Wache an. Die Adresse wird anhand der Gebäudekoordinaten über OpenStreetMap/Nominatim ermittelt. | Tampermonkey-Speicher, je Gebäude-ID: Längen- und Breitengrad sowie Straße, Hausnummer, Postleitzahl, Ort, Landkreis und Bundesland. |
| [Hide elements / killmap](dist/killmap.user.js) | Entfernt die Kartenanzeige auf der Startseite aus dem Seiten-DOM. | Keine. |
| [Layout 04](dist/lssm-layout-04.user.js) | Ordnet Karte, Einsatzlisten, Gebäude, Chat und Funk neu an und passt Größen und Scrollbereiche an. | Keine. |
| [Einsatz-Generierungszeitpunkt](dist/missionDateAge.user.js) | Zeigt auf einer Einsatzseite Erstellungszeitpunkt und Einsatzalter an und markiert bestimmte ältere Einsätze. | Keine. |

## Bibliotheken

Die Bibliotheken werden nicht selbstständig als Userscript ausgeführt.

- [`api-fetch-database-handler.js`](lib/api-fetch-database-handler.js) lädt Gebäude- und Fahrzeugdaten aus der Spiel-API und kann sie samt Aktualisierungszeitpunkt in IndexedDB zwischenspeichern. Die Datenbank heißt `leitstellenspiel`; vorgesehen sind die Stores `buildings`, `vehicles`, `missionTypes` und `main`.
- [`indexedDB.js`](lib/indexedDB.js) stellt allgemeine Lese-, Schreib-, Abfrage- und Exportfunktionen für IndexedDB bereit. Welche Inhalte gespeichert werden, bestimmt das jeweilige Script.

Die oben aufgeführten `main`-Userscripts binden diese beiden Bibliotheken nicht ein.

## Archiv

Die folgenden historischen Kopien sind nicht Teil der aktiven `dist)-Sammlung:

- [BOS-Ernie Ersthelfer](archive/BOS-Ernie/Ersthelfer.user.js): wählt ein Ersthelferfahrzeug; keine dauerhafte Speicherung im Script gefunden.
- [Massenentlassungen von MissSobol](archive/Sobol0202/LSS%20Massenentlassungen.user.js): Auswahlhilfe für Personal auf der Gebäudeseite; keine eigene dauerhafte Speicherung.

## Datenschutz und Speicherung

Die dauerhafte Speicherung der oben beschriebenen Scripts erfolgt im Browser des Nutzers über Tampermonkey oder IndexedDB. Die Scripts in diesem Branch speichern keine E-Mail-Adresse oder keinen Premiumstatus. Bei `ShowAddress` werden die genannten Gebäudeadressen lokal im Tampermonkey-Speicher abgelegt.

## Lizenz und Herkunft

Das Projekt steht unter der GNU Affero General Public License v3.0 oder später. Einzelne Bestandteile können abweichende Lizenzen haben. Details stehen in `THIRD_PARTY_LICENSES.md` und den jeweiligen Dateikopfzeilen.

Das Projekt enthält teilweise Arbeiten aus der LSS-Community. Ursprüngliche Urheber und Lizenzen sind in den jeweiligen Dateien kenntlich gemacht.
