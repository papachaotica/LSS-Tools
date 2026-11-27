# LSS Massenentlassungen

Userscript für das Leitstellenspiel. Auf Gebäudeseiten mit der Personalverwaltung ergänzt es Auswahlbuttons, mit denen Personal nach Ausbildung und Bindung gesammelt markiert werden kann.

Das aktuelle Script führt die Entlassung nicht selbst aus. Es verändert nur die vorhandenen Auswahl-Checkboxen. Die normale Entlassungsfunktion der Spielseite muss anschließend bewusst durch den Nutzer ausgelöst werden.

## Bedienung

- `Personal ohne Ausbildung auswählen` markiert Zeilen, deren dritte Zelle leer ist.
- `Personal ohne Bindung auswählen` markiert Zeilen, deren vierte Zelle leer ist.
- `Personal ohne Ausbildung und Bindung auswählen` markiert nur Zeilen, bei denen beide Zellen leer sind.
- `Auswahl zurücksetzen` hebt alle aktuell markierten Personal-Checkboxen auf.

Die Auswahlbuttons ersetzen die bestehende Auswahl. Neben den Buttons wird die Anzahl markierter Personen angezeigt.

## Voraussetzungen und Grenzen

Das Script sendet selbst keine Entlassung. Prüfe die Auswahl vor der bewussten Nutzung der normalen Entlassungsfunktion. Ein Zurücksetzen macht nur die lokale Checkbox-Auswahl rückgängig.

## Daten und Rechte

Das Script liest nur die geöffnete HTML-Seite, speichert keine Daten und verwendet keine `@grant`-Rechte, keine `@require`-Bibliotheken und keinen eigenen externen Dienst.

## Herkunft und Lizenz

`MissSobol` ist  Autor und `papachaotica` Contributor. Der ursprüngliche Stand ist im Archiv unter [`archive/Sobol0202/LSS Massenentlassungen.user.js`](../../archive/Sobol0202/LSS%20Massenentlassungen.user.js) erhalten.

Die Nutzung erfolgt auf eigene Verantwortung. Das Script ist kein offizieller Bestandteil des Leitstellenspiels. Beachte die [Richtlinie für Scripte und Zusatzprogramme](../../docs/richtlinie-scripte-zusatzprogramme.md) und den [Nutzungs-, Daten- und Risikohinweis](../../docs/nutzungs-und-datenhinweis.md).
