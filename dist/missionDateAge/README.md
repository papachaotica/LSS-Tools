# LSS Einsatz-Generierungszeitpunkt

Userscript für die Einsatzdetailseite des Leitstellenspiels. Es zeigt den im
Einsatz vorhandenen Erstellungszeitpunkt sowie die seitdem vergangene Zeit an.
Wenn der Einsatz zum nächsten Zeitpunkt um 01:00 Uhr mindestens 24 Stunden alt
sein wird, wird die Anzeige rot und fett dargestellt.

## Voraussetzungen und Geltungsbereich

- Tampermonkey oder ein kompatibler Userscript-Manager.
- Eine geöffnete Einsatzdetailseite unter `leitstellenspiel.de/missions/...`.

Das Script verarbeitet ausschließlich die aktuell geöffnete Einsatzseite. Es
liest den Erstellungszeitpunkt aus dem Titel des Elements ergänzt die Anzeige.

## Bedienung und Ablauf

Es gibt keine zusätzlichen Schaltflächen und keine Eingabe. Beim Laden der
Einsatzdetailseite geschieht Folgendes:

1. Das Script liest den Zeitstempel aus `data-original-title` oder `title` von
   `#missionH1`.
2. Der deutsche Zeitstempel wird in ein Datum umgewandelt.
3. Die vergangene Zeit wird in Tagen, Stunden und Minuten angezeigt.
4. Das Alter des Einsatzes beim nächsten 01:00-Uhr-Zeitpunkt wird berechnet.
5. Ist dieses Alter mindestens 24 Stunden, wird die ergänzte Anzeige rot und
   fett dargestellt.

Das Script alarmiert, bearbeitet oder löscht keinen Einsatz und sendet keine
Spielaktion ab. Das automatische Ausführen beim Seitenaufruf dient nur der
Information; es fällt damit unter die informative Ausnahme für automatisch
angezeigte Statistiken/Zähler.

## Verarbeitete Daten und externe Verbindungen

- Gelesen wird nur der auf der geöffneten Seite vorhandene Einsatzzeitpunkt.
- Es werden keine Einstellungen, Einsatzdaten oder andere Spielinformationen
  dauerhaft gespeichert.
- Es gibt keine `@grant`-Rechte, keine `@require`-Bibliotheken und keinen
  eigenen Netzwerkaufruf.
- Es werden keine Login-Daten, Sitzungsdaten, Personen- oder Verbandsdaten an
  den Script-Autor oder einen externen Dienst übermittelt.
- Die vom Spiel selbst geladenen Ressourcen und die normale Verbindung des
  Browsers zum Spiel werden durch dieses Script nicht ersetzt oder erweitert.

## Bekannte Grenzen

- Unterstützt wird derzeit nur die deutsche Monatsnamensliste.
- Die rote Markierung wird nicht genau beim Erreichen von 24 Stunden neu
  berechnet, sondern anhand des nächsten 01:00-Uhr-Zeitpunkts beim Laden der
  Seite. Für eine aktualisierte Anzeige muss die Seite erneut geladen werden.
- Es wird nicht geprüft, ob die Zielcontainer bereits eine gleichartige
  Anzeige enthalten. Bei mehrfacher Ausführung im selben DOM kann die Anzeige
  daher doppelt erscheinen.


## Nutzung auf eigene Verantwortung

Das Script ist kein offizieller Bestandteil des Leitstellenspiels. Spiel- und
Richtlinienänderungen können die Funktion oder die Zulässigkeit beeinflussen.
Vor der Nutzung sollten der lesbare Quellcode, die aktuellen Betreiberregeln
und die Nutzungsbedingungen geprüft werden.

@ai assisted -- 26.11.2026