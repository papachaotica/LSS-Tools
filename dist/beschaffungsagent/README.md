# Beschaffungsagent

Userscript für das Leitstellenspiel. Der Beschaffungsagent liest hinterlegte
Wachenbauplan-Konfigurationen und fügt auf passenden Gebäudeseiten Buttons zum
Beschaffen der darin vorgesehenen Fahrzeuge ein.

Der aktuelle Stand beschafft Fahrzeuge. Die im Header angekündigte Vergabe von
Erweiterungen ist noch nicht implementiert.

## Voraussetzungen

- Tampermonkey oder ein kompatibler Userscript-Manager.
- Eine Gebäudeseite unter `leitstellenspiel.de/buildings/...`.
- Eine vorhandene Konfiguration im lokalen IndexedDB-Speicher des Browsers.
- Die Gebäudeseite muss den normalen Fahrzeugmarkt-Link
  `a[href$='/vehicles/new']` und die Fahrzeugbilder mit `vehicle_type_id`
  enthalten.

Das Script bringt keine Oberfläche zum Erstellen oder Bearbeiten der
Bauplan-Konfigurationen mit. Die Datenbank und der Datensatz müssen deshalb
bereits durch einen passenden Wachenbauplan-Ablauf oder eine andere bewusst
ausgeführte Einrichtung angelegt worden sein.

## Bedienung

Nach dem Laden einer unterstützten Gebäudeseite liest das Script die lokalen
Konfigurationen und fügt passende Buttons neben dem Fahrzeugmarkt ein.

- Der Buttontext entspricht dem Namen der Konfiguration.
- Eine konfigurierte Gebäudenamens-RegEx kann den Button für passende Wachen
  hervorheben.
- Nur Konfigurationen mit `enabled: true` sind anklickbar.
- Deaktivierte Konfigurationen werden sichtbar, aber mit deaktivierter
  Bedienung dargestellt.
- Wenn der aktuelle Fahrzeugbestand die Konfiguration nach der internen
  Prüfung erfüllt, wird keine Beschaffung ausgelöst.

Beim Klick auf einen aktivierten Button wird für jede konfigurierte
Fahrzeugart die Differenz zwischen aktuellem Bestand und Zielmenge berechnet.
Die Beschaffungsanfragen werden nacheinander gesendet. Danach zeigt das Script
den Fortschritt als Balken an und lädt die Gebäudeseite neu, sobald mindestens
eine Beschaffung ausgelöst wurde.

## Wichtiger Nutzungshinweis

Der Klick auf einen aktivierten Konfigurationsbutton kann unmittelbar mehrere
Fahrzeuge beschaffen und dadurch Spielwährung verbrauchen. Der aktuelle Stand

- zeigt vor dem Start keine Vorschau der Fahrzeuge, Mengen oder Kosten,
- verlangt keine zusätzliche Bestätigung,
- bietet während der Beschaffung keinen programminternen Abbruch,
- bündelt mehrere Fahrzeuge einer Fahrzeugart in einer einzelnen Anfrage.

Prüfe deshalb vor jedem Klick die aktuelle Wache, den Konfigurationsnamen, die
angezeigten Fahrzeugdaten und die Zielmengen. Ein Neuladen der Seite beendet
in der Regel nur die weitere clientseitige Verarbeitung. Bereits an das Spiel
gesendete Kaufanfragen werden dadurch nicht zurückgenommen und bereits
gekaufte Fahrzeuge nicht automatisch rückgängig gemacht.

## Gespeicherte und verarbeitete Daten

Das Script verwendet die lokale IndexedDB-Datenbank
`BosErnie_StationBlueprints` in Version `2` und den Object Store `main`.
Gelesen wird der Datensatz unter dem Schlüssel `blueprints`.

Eine Konfiguration kann unter anderem folgende Felder enthalten:

```json
{
  "id": "beispiel-1",
  "name": "Standardwache",
  "buildingTypeId": 0,
  "buildingNameRegexPattern": "Feuerwehr",
  "enabled": true,
  "vehicles": [
    { "id": 30, "quantity": 2 }
  ]
}
```

Die konkrete Datenstruktur und die Zuordnung der Fahrzeug- und Gebäudetyp-IDs
müssen zum erzeugenden Wachenbauplan passen. Das Script liest den Datensatz und
schreibt keine Bauplan-Konfiguration zurück. Beim erstmaligen Öffnen kann es
die eigene IndexedDB-Datenbank beziehungsweise den Object Store anlegen.

Während der Verarbeitung liest das Script außerdem aus der geöffneten Seite:

- die Gebäudetyp-ID und den Gebäudenamen,
- vorhandene Links und Fahrzeugbilder,
- die auf den Fahrzeugbildern vorhandenen `vehicle_type_id`-Attribute,
- das CSRF-Token aus dem Seiten-Metaelement.

Die Daten werden nicht an den Script-Autor oder einen zusätzlichen externen
Dienst übertragen. Es werden keine `@grant`-Rechte und keine `@require`-
Bibliotheken verwendet.

## Netzwerkverbindungen

Beim bewussten Klick auf einen aktivierten Button sendet das Script POST-
Anfragen an die Server des Leitstellenspiels. Die URL folgt diesem Muster:

```text
/buildings/{buildingId}/vehicle/{buildingId}/{vehicleTypeId}/credits
```

Die Zielmenge wird als `quantity` übermittelt. Als Formularwerte werden unter
anderem `_method=get` und das CSRF-Token der geöffneten Spielseite gesendet.
Zwischen den einzelnen Kaufanfragen wartet das Script 100 Millisekunden.

Es gibt keinen eigenen externen Netzwerkdienst. Der `@resource`-Eintrag im
Header verweist auf den ursprünglichen Forenbeitrag des Scripts; der Code liest
diese Ressource nicht aktiv ab.

## Bekannte Grenzen und Risiken

- Die Konfiguration wird ohne eigene Fehleranzeige aus IndexedDB gelesen. Bei
  fehlender oder inkompatibler Konfiguration können Buttons fehlen oder die
  Verarbeitung mit einem Fehler abbrechen.
- Die Prüfung des Fahrzeugbestands zählt aktuell Einträge des jeweiligen
  Fahrzeugtyps und nicht zuverlässig die konfigurierte Menge. Konfigurationen
  mit Mengen größer als eins sollten deshalb besonders sorgfältig geprüft
  werden.
- Wenn mehr Fahrzeuge vorhanden sind als in der Konfiguration vorgesehen,
  kann die Differenzberechnung eine unpassende Menge ergeben. Eine automatische
  Korrektur des Bestands findet nicht statt.
- Das Script prüft die HTTP-Antworten der Kaufanfragen nicht ausdrücklich. Ein
  sichtbarer Abschluss des Fortschrittsbalkens bestätigt daher nicht, dass jede
  Anfrage erfolgreich war.
- Der Fortschrittsbalken zeigt den Zielbestand der Konfiguration, nicht
  zwingend die Zahl tatsächlich erfolgreich gekaufter Fahrzeuge.
- Änderungen an HTML-Struktur, CSRF-Metaelement, Fahrzeugmarkt-Link,
  `vehicle_type_id` oder den Spielendpunkten können die Funktion unterbrechen.
- Bestimmte Gebäudetypen werden absichtlich übersprungen. Zusätzlich werden
  einige kleine beziehungsweise besondere Gebäudetypen intern auf einen
  anderen Konfigurationstyp abgebildet.
- Das Script setzt beim Einfügen voraus, dass der Fahrzeugmarkt-Link vorhanden
  ist. Auf abweichenden Gebäudeseiten kann dadurch ein Fehler entstehen.

## Richtlinien- und Lizenzhinweis

Der Beschaffungsagent verändert den Spielzustand und kann mehrere Fahrzeuge
mit einem einzigen bewussten Klick beschaffen. Nach der im Projekt
dokumentierten Richtlinie ist deshalb besonders relevant, dass der aktuelle
Stand keine Vorschau, keine Bestätigung und keinen programminternen Abbruch
vor der Sammelaktion anbietet. Die Nutzung sollte vor einer Veröffentlichung
und unabhängig vom Projekttext an den aktuellen Betreiberregeln geprüft
werden.

Der Userscript-Header nennt `BOS-Ernie` als Autor und `BSD-3-Clause` als
Lizenz. Der ursprüngliche Forenbeitrag ist als `@resource` hinterlegt.

Weitere allgemeine Hinweise stehen in der
[Richtlinie für Scripte und Zusatzprogramme](../../docs/richtlinie-scripte-zusatzprogramme.md)
und im
[Nutzungs-, Daten- und Risikohinweis](../../docs/nutzungs-und-datenhinweis.md).

Die Nutzung erfolgt auf eigene Verantwortung. Das Script ist kein offizieller
Bestandteil des Leitstellenspiels und wird vom Betreiber weder freigegeben
noch unterstützt.