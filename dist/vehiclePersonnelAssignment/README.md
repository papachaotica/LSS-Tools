# Fahrzeugzuweisung

Userscript für das Leitstellenspiel, das Personal einer Wache auf Fahrzeuge verteilt und anschließend deren FMS-Status auf 2 oder 6 setzt.


## Voraussetzungen

- Tampermonkey und das installierte Userscript.
- Eine Gebäudeseite mit Personalbereich und Fahrzeugen.

## Bedienung

Auf der Gebäudeseite erscheinen im Informationsbereich zwei Buttons:

- **Personal auf Fahrzeuge zuweisen** startet die Berechnung und überträgt die Änderungen ins Spiel.
- **Zahnrad** öffnet die Dateiauswahl für den Import eigener Einstellungen.

Vorhandene Personalzuweisungen werden neu bewertet. Das Script kann Personen auf andere Fahrzeuge verteilen und bisherige Zuweisungen von Personen aufheben, die in der neuen Verteilung keinem Fahrzeug zugeordnet sind.

## Ablauf der Personalverteilung

1. Fahrzeugtypen, Fahrzeuge und Personaldaten der aktuellen Wache laden.
2. Anforderungen aus Fahrzeugdaten und eigenen Einstellungen ermitteln.
3. Fahrzeuge nach der Anzahl ihrer Lehrgangsanforderungen absteigend sortieren.
4. Zuerst alle Fahrzeuge bis zur Mindestbesatzung bearbeiten.
5. Anschließend alle Fahrzeuge bis zur Maximalbesatzung bearbeiten.
6. Fahrzeuge ohne Lehrgangsanforderungen mit weiterem verfügbaren Personal auffüllen.
7. Geänderte Personalzuweisungen übertragen und nicht mehr benötigte Zuweisungen aufheben.
8. Den FMS-Status anhand der berechneten Besetzung anpassen.

Jede ausgewählte Person wird aus dem verfügbaren Personalpool entfernt. Die Fahrzeugsortierung gilt innerhalb der beiden Durchläufe: Auch das erste Fahrzeug wird zunächst nur bis zur Mindestbesatzung bearbeitet, bevor die anderen Fahrzeuge folgen.

Bei Fahrzeugen mit Lehrgangsanforderungen sucht das Script zuerst nach einer Person mit sämtlichen aufgeführten Lehrgängen. Im Fallback werden Personen nach der Anzahl passender Lehrgänge priorisiert. Fahrzeuge ohne Lehrgangsanforderungen erhalten zunächst bevorzugt Personal ohne Ausbildung.

## Eigene Einstellungen importieren

Eine JSON-Datei erstellen und über das Zahnrad auswählen. Der Import speichert das gesamte Objekt in IndexedDB unter `settings-personalassign` in der Konfiguration `main`.

**Ein Import ersetzt die bisher gespeicherten Einstellungen vollständig.** Die Einstellungen werden beim nächsten Start der Personalzuweisung eingelesen.

Beispiel für ein WLF:

```json
{
  "reverse": false,
  "46": {
    "caption": "WLF",
    "staff": {
      "min": 1,
      "max": 3,
      "training": {
        "Feuerwehr": {
          "wechsellader": { "all": true },
          "elw2": { "min": 1 },
          "gw_hoehenrettung": { "min": 1 }
        }
      }
    }
  }
}
```

| Einstellung | Bedeutung |
| --- | --- |
| `"46"` | Fahrzeugtyp-ID; die Einstellung gilt für alle Fahrzeuge dieses Typs. |
| `caption` | Beschreibender Name; die Zuordnung erfolgt über die Fahrzeugtyp-ID. |
| `staff.min` | Mindestbesatzung des Fahrzeugs. |
| `staff.max` | Maximale Besatzung für die Berechnung. |
| `staff.training` | Lehrgänge, gruppiert nach Schulbereich. Die Schlüssel müssen den internen Lehrgangskennungen entsprechen. |
| `all: true` | Der Lehrgang soll für jede ausgewählte Person Pflicht sein. Einschränkung des aktuellen Max-Durchlaufs beachten. |
| `training.…min` | Hinterlegte Mindestanzahl für einen Lehrgang; derzeit noch keine Prüfung der tatsächlich erreichten Anzahl. |
| `reverse: true` | Kehrt die eingelesene Personalreihenfolge vor der Auswahl um. |

Nicht angegebene Besatzungsgrenzen werden aus den Fahrzeugtypdaten übernommen. Ein eigenes `staff.training` ersetzt die Lehrgangsanforderungen des Fahrzeugtyps vollständig.

Für Importdateien wird gültiges JSON empfohlen.

## FMS-Status

- Erreicht die berechnete Besetzung die Mindestbesatzung und steht das Fahrzeug auf FMS 6, wird FMS 2 gesetzt.
- Wird die Mindestbesatzung nicht erreicht und steht das Fahrzeug auf FMS 2, wird FMS 6 gesetzt.
- Bei Anhängern wird die berechnete Besatzung des zugeordneten Zugfahrzeugs berücksichtigt, sofern dieses in den verarbeiteten Fahrzeugen gefunden wird.


## Aktuelle Grenzen des Entwicklungsstands

- Lehrgangsspezifische Mindestanzahlen werden eingelesen, aber bei der Auswahl nicht als erreichte Kontingente gezählt.
- Die Fortschrittsanzeige bezieht sich auf einzelne Verarbeitungsschritte. Sie ist kein durchgehender Gesamtfortschritt und erreicht nicht in jeder Phase 100 Prozent.
- Fehler einzelner Zuweisungs- oder FMS-Requests werden in der Konsole protokolliert und innerhalb der jeweiligen Funktion abgefangen. Ein bis zum Ende laufender Durchgang bestätigt deshalb nicht, dass sämtliche Änderungen erfolgreich übertragen wurden. Die FMS-Entscheidung basiert auf der berechneten Besetzung.