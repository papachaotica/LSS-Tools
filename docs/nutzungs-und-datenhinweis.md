# Nutzungs-, Daten- und Risikohinweis

**Geltungsstand:** 13.11.2026  
**Geltungsbereich:** derzeit veröffentlichte Scripts im Verzeichnis `dist/` des Projekts LSS-Tools. Nicht veröffentlichte Entwicklungsstände und archivierte Fremdscripts sind nicht umfasst. Die einzelnen READMEs sollen diesen zentralen Hinweis später um scriptbezogene Angaben ergänzen.

## Zweck und Regelkonformität

Die Scripts sollen die Bedienung und Verwaltung im Leitstellenspiel erleichtern. Bei Entwicklung und Pflege wird versucht, die jeweils bekannte Richtlinie für Scripte und Zusatzprogramme sowie die Nutzungsbedingungen des Spiels einzuhalten. Maßgeblich sind die aktuellen Vorgaben des Betreibers und die konkrete Funktionsweise des jeweiligen Scripts.

Eine Garantie, dass der Betreiber ein Script in jeder Auslegung als zulässig bewertet, kann daraus nicht abgeleitet werden. Der Betreiber kann die Regeln ändern und die Nutzung im Einzelfall anders beurteilen. Trotz sorgfältiger Umsetzung kann deshalb das Risiko bestehen, dass die Nutzung als unzulässig angesehen wird und Maßnahmen gegen den Spielaccount folgen, einschließlich einer Sperrung.

Die veröffentlichten Scripts sind keine offiziellen Bestandteile des Leitstellenspiels und werden nicht vom Betreiber freigegeben oder unterstützt. Wer ein Script installiert oder verwendet, muss die aktuellen Spielregeln beachten und selbst entscheiden, ob er das verbleibende Risiko eingehen möchte. Dieser Hinweis ersetzt keine Betreiberfreigabe und keine individuelle rechtliche Beratung.

## Bedienung und Auswirkungen

Die Scripts stellen Informationen, Filter und Verwaltungsfunktionen bereit. Spielverändernde Aktionen werden über Bedienelemente des jeweiligen Scripts ausgelöst. Umfang und Reichweite unterscheiden sich: Eine Funktion kann sich beispielsweise auf das gerade geöffnete Gebäude, eine ausgewählte Leitstelle oder eine gefilterte Auswahl beschränken. Die konkrete Reichweite wird in der jeweiligen README beschrieben.

Sammelaktionen können mehrere gleichartige Anfragen an den Spielserver senden. Die veröffentlichten Verwaltungsfunktionen verwenden dafür, je nach Script und Aktion, Wartezeiten und begrenzte Auswahlbereiche. In verschiedenen Abläufen liegen die Wartezeiten etwa zwischen 250 und 500 Millisekunden; dieser Wert ist keine pauschale Zusicherung für jedes Script oder jede Anfrage. Vor einer Sammelaktion sollten Nutzende die angezeigte Auswahl und die möglichen Folgen prüfen. Bereits erfolgreich übertragene Einzelaktionen lassen sich durch Abbruch eines Ablaufs nicht zwingend rückgängig machen.

Anzeigen oder vorbereitende Ladevorgänge können beim Öffnen einer Spielseite oder eines Scriptbereichs automatisch erfolgen. Daraus folgt keine automatische Ausführung einer spielverändernden Aktion. Konkrete Ausnahmen oder Besonderheiten werden in der jeweiligen README benannt.

## Verarbeitete und gespeicherte Daten

Je nach Funktion lesen Scripts Daten, die das Spiel im Browser oder über seine Schnittstellen bereitstellt. Dazu können Spielinformationen zu Gebäuden, Fahrzeugen, Personal, Einsätzen, Ausbildungen, Erweiterungen, Fahrzeugzuweisungen und Leitstellen gehören. Welche Daten verarbeitet werden, hängt vom Script und dem geöffneten Spielbereich ab.

Für Filter, Vorlagen, Einstellungen und wiederholte Datenabrufe können Daten lokal im Browser gespeichert werden. Im veröffentlichten Bestand kommen dafür insbesondere IndexedDB, `localStorage` und der Speicher des Userscript-Managers zum Einsatz. Gespeichert werden beispielsweise Gebäude- und Fahrzeugdaten, Vorlagen, Einstellungen sowie eine lokal zwischengespeicherte Adresse zu einem Gebäude. Speicherung und Aufbewahrungsdauer sind nicht für alle Scripts gleich; die jeweilige README soll die konkreten Daten und Löschmöglichkeiten nennen. Lokale Speicherung bedeutet, dass die Daten im Browserprofil des Nutzers liegen und nicht auf einem Server des Script-Autors.

Die Scripts fragen keine E-Mail-Adresse oder kein Passwort ab. Sie speichern weder Login-Passwörter noch Sitzungstokens und übermitteln diese nicht an den Script-Autor. Anfragen an das Leitstellenspiel können im bereits angemeldeten Browserkontext erfolgen; die Anmeldung und die zugehörige Sitzung werden dabei vom Browser und dem Spiel verarbeitet.

## Netzwerkverbindungen und externe Dienste

Spielbezogene Lese- und Änderungsanfragen gehen an die Server des Leitstellenspiels. Je nach Funktion beziehen veröffentlichte Scripts außerdem allgemeine Gebäudetyp- oder Fahrzeugtypdaten von `api.lss-manager.de`. Diese Kataloganfragen dienen der Anzeige und Berechnung und enthalten nach dem vorgesehenen Funktionsumfang keine Gebäude-, Fahrzeug- oder Personaldaten des Nutzers.

Das Script **[LSS] showAddress** sendet die Koordinaten des geöffneten virtuellen Gebäudes an `nominatim.openstreetmap.org`, um dazu eine Adresse abzurufen. Das Ergebnis und die zugehörigen Koordinaten werden anschließend lokal im Userscript-Manager zwischengespeichert. Dieser Abruf ist eine Übertragung an einen externen Dienst und wird hier ausdrücklich offengelegt.

Die veröffentlichten Scripts senden keine Nutzungsdaten oder Spielkontodaten an den Script-Autor. Sie enthalten keine Telemetrie- oder Trackingfunktion zur Ermittlung individueller Nutzer. Der Hostingdienst des Repositories kann Abruf- oder Downloadzahlen anzeigen; solche Zahlen entsprechen nicht verlässlich der Zahl einzelner Personen oder aktiver Installationen.

## Fehler, Änderungen und Account-Risiko

Scripts können Fehler enthalten, veraltete Daten anzeigen oder nach Änderungen am Spiel nicht mehr wie vorgesehen funktionieren. Ein Cache kann bis zu seiner Aktualisierung einen älteren Stand enthalten. Vor Sammelaktionen sollten die angezeigten Daten und die ausgewählten Gebäude oder Fahrzeuge geprüft werden. Bei unerwartetem Verhalten sollte die Funktion nicht weiter ausgeführt werden.

Der Script-Autor kann weder die Verfügbarkeit des Spiels noch Änderungen an dessen Schnittstellen, Richtlinien oder AGB kontrollieren. Eine sorgfältige Umsetzung, eine Wartezeit oder ein bewusster Nutzerstart verhindern nicht sicher, dass der Betreiber eine Funktion anders bewertet oder Maßnahmen gegen einen Account trifft.

Soweit gesetzlich zulässig, wird keine Zusicherung gegeben, dass die Scripts fehlerfrei, dauerhaft verfügbar oder mit jeder zukünftigen Spielversion kompatibel sind. Zwingende gesetzliche Rechte bleiben unberührt. Die Nutzung dieses Hinweises als pauschaler Ausschluss jeglicher Verantwortung ist nicht beabsichtigt.

@ai assisted