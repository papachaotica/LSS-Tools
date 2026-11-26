# [LSS] Ersthelfer

Userscript für das Leitstellenspiel. Auf Einsatzseiten ergänzt es einen Button
und eine Tastatursteuerung, mit denen ein passendes verfügbares Fahrzeug für
die Ersthelfer-Auswahl markiert werden kann. Über einen zusätzlichen Eintrag im
Profilmenü lassen sich die erlaubten Fahrzeugtypen konfigurieren.

Der aktuelle Code wählt nicht anhand einer berechneten geografischen Distanz.
Er prüft die vorhandenen Fahrzeug-Checkboxen in ihrer aktuellen Reihenfolge
und klickt das erste verfügbare, noch nicht ausgewählte Fahrzeug, dessen
Fahrzeugtyp in der Konfiguration enthalten ist.

## Voraussetzungen und Geltungsbereich

Das Script fügt keine Fahrzeuge hinzu und alarmiert keinen Einsatz selbst. Es
klickt bei einer bewussten Nutzeraktion eine vorhandene Fahrzeug-Checkbox der
Spielseite.

## Bedienung

### Fahrzeugtypen konfigurieren

1. Das Profilmenü öffnen.
2. `Ersthelfer Konfiguration` auswählen.
3. Im Overlay die erlaubten Fahrzeugtypen über die Checkboxen auswählen.
4. `Speichern` anklicken.

Beim Öffnen des Overlays ruft das Script die Fahrzeugtypdaten von der
LSS-Manager-API ab. Bereits gespeicherte Fahrzeugtypen werden vorausgewählt.
`Speichern` legt die Auswahl im Userscript-Manager ab und lädt die Seite neu.
`Abbrechen` schließt das Overlay ohne eine neue Auswahl zu speichern.

### Ersthelfer auswählen

Auf einer passenden Einsatzansicht erscheint ein Button mit dem Feuer-Symbol.
Alternativ kann die Taste `f` verwendet werden, solange kein Texteingabefeld
aktiv ist.

Bei einer Auswahlaktion durchsucht das Script die vorhandenen
`vehicle_checkbox`-Elemente. Es überspringt deaktivierte oder bereits
ausgewählte Fahrzeuge und klickt das erste Fahrzeug eines erlaubten Typs.
Wenn kein passendes Fahrzeug vorhanden ist, erscheint eine Meldung. Weitere
Fahrzeuge müssen dann zuerst über die normale Spielfunktion nachgeladen oder
die erlaubten Fahrzeugtypen müssen in der Konfiguration erweitert werden.

## Gespeicherte und verarbeitete Daten

Die Konfiguration wird unter dem Schlüssel
`lss_first_responder_ids` im Speicher des Userscript-Managers gespeichert. Der
Wert ist eine JSON-codierte Liste von Fahrzeugtyp-IDs. Wenn noch keine Auswahl
gespeichert wurde, verwendet das Script zunächst diese Standard-IDs:

```json
[0, 1, 2, 3, 4, 30]
```

Das Script verarbeitet auf der Spielseite die Fahrzeugtyp-ID und den Zustand
der vorhandenen Fahrzeug-Checkboxen. Die Auswahl wird nicht an den Script-
Autor übertragen.

## Netzwerkverbindungen und Rechte

Beim Öffnen der Konfiguration wird per `GM_xmlhttpRequest` ein GET auf

```text
https://api.lss-manager.de/de_DE/vehicles
```

ausgeführt. Die Antwort enthält allgemeine Fahrzeugtypdaten wie IDs und
Bezeichnungen. Das Script sendet dabei nach dem sichtbaren Code keine
Einsatz-, Fahrzeug-, Konto- oder Login-Daten an diesen Dienst.

Der Zugriff ist im Userscript-Header über `@connect api.lss-manager.de`
deklariert. Das Script verwendet außerdem die folgenden
Userscript-Manager-Rechte:

- `GM_getValue` und `GM_setValue` für die lokale Fahrzeugtyp-Konfiguration.
- `GM_xmlhttpRequest` für den Abruf der allgemeinen Fahrzeugtypdaten.

Die eigentliche Auswahl eines Fahrzeugs erfolgt durch den Klick auf die
vorhandene Checkbox der Spielseite. Eine zusätzliche eigene Spielanfrage wird
vom Script nicht erzeugt.

## Richtlinien- und Nutzungshinweis

Das Script startet keine spielverändernde Aktion automatisch. Die Auswahl wird
erst durch den Button oder die Taste `f` ausgelöst. Es wird höchstens ein
Fahrzeug ausgewählt; es gibt keine Sammelaktion und keine automatische
Entscheidung über mehrere Fahrzeuge.

Die Nutzung erfolgt trotzdem auf eigene Verantwortung. Das Script kann durch
den simulierten Checkbox-Klick die normale Auswahl- oder Alarmierungslogik des
Spiels auslösen. Prüfe deshalb vor der Auswahl, welcher Einsatz geöffnet ist,
welche Fahrzeuge nachgeladen wurden und welche Fahrzeugtypen in der
Konfiguration erlaubt sind.

Weitere allgemeine Hinweise stehen in der
[Richtlinie für Scripte und Zusatzprogramme](../../docs/richtlinie-scripte-zusatzprogramme.md)
und im
[Nutzungs-, Daten- und Risikohinweis](../../docs/nutzungs-und-datenhinweis.md).

## Bekannte Grenzen

- Die Reihenfolge der Fahrzeug-Checkboxen wird als Auswahlreihenfolge
  verwendet. Eine Entfernung zum Einsatz wird nicht berechnet.
- Wird kein passendes Fahrzeug gefunden, zeigt das Script nur eine Meldung an.
- Das Script setzt bestimmte Spiel-Elemente und Selektoren voraus. Änderungen
  an `#iframe-bottom-content`, `vehicle_checkbox`,
  `#mission_alliance_share_btn` oder `#mission_next_mission_btn` können die
  Anzeige unterbrechen.
- Auf abweichenden Einsatzansichten kann der erwartete Einfügepunkt fehlen.
  Der aktuelle Code behandelt nicht jeden fehlenden Spiel-Container mit einer
  eigenen Fehlermeldung.
- Fahrzeugbezeichnungen der externen API werden direkt in die erzeugte
  Konfigurationstabelle eingefügt. Die Antwort wird als vertrauenswürdige
  Katalogquelle vorausgesetzt.
- Ist die externe Fahrzeugtyp-API nicht erreichbar oder liefert sie ungültiges
  JSON, kann die Konfiguration nicht vollständig geladen werden.

## Herkunft und Lizenz

Der Header nennt `BOS-Ernie` als ursprünglichen Autor und `papachaotica` als
Autor der Erweiterung. Die ursprüngliche Arbeit ist im Archiv unter
[`archive/BOS-Ernie/Ersthelfer.user.js`](../../archive/BOS-Ernie/Ersthelfer.user.js)
aufbewahrt und steht unter der BSD-3-Clause-Lizenz. Die aktuelle Erweiterung
steht unter `AGPL-3.0-or-later`.


## Nutzung auf eigene Verantwortung

Das Script ist kein offizieller Bestandteil des Leitstellenspiels und wird vom
Betreiber weder freigegeben noch unterstützt. Spieländerungen können die
Funktion oder die Zulässigkeit beeinflussen.
