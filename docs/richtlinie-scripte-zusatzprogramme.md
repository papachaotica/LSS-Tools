# Richtlinie für Scripte und Zusatzprogramme

Scripte und Zusatzprogramme sind ein wichtiger Teil dieses Spiels. Ein großer Teil des Komforts, den viele Spieler täglich nutzen, stammt aus der Community, die diesen freiwillig, kostenlos und in unzähligen Stunden Arbeit schafft. Diese Richtlinie soll Scriptschaffenden Sicherheit geben: Sie beschreibt, welche Scripte erlaubt sind und welche nicht.

## Geltungsbereich

Diese Richtlinie gilt für alle Scripte und Zusatzprogramme mit Bezug zum leitstellenspiel und seinen Sprachversionen. Dazu gehören insbesondere aber nicht ausschließlich Userscripts, Browser-Erweiterungen und externe Tools (z. B. Webseiten und Tabellenkalkulationen). Sie gilt für die Scriptschaffenden gleichermaßen wie für die Nutzenden der Scripte.

## Regelungen

Regeln mit „muss“ sind verbindlich. Ein Verstoß dagegen ist ein Verstoß gegen diese Richtlinie und damit gegen die AGB. Regeln mit „soll“ sind zu befolgen, soweit technisch möglich, Abweichungen sollten kurz begründen werden können. Die Bezeichnungen „muss“ und „soll“ folgen der Technischen Richtlinie BSI TR-03153-1 (Anhang B) und somit deren englischsprachigen Äquivalent gemäß RFC 2119.

### 1. Du spielst selbst (Automatisierung & Bots)

Jede spielrelevante Aktion muss durch eine eigene, bewusste Handlung (Klick, Tastendruck) ausgelöst werden, bevor sie ausgeführt wird.

Scripte dürfen nicht von selbst aktiv werden. Insbesondere nicht durch Timer, Spielereignisse (z. B. neuer Einsatz oder Sprechwunsch), Seitenaufrufe oder das Beobachten von Spielzuständen. Ausgenommen hiervon sind Funktionen rein informativer Natur (z.B. Statistiken oder Zähler).

Scripte dürfen keine Entscheidungen treffen und ausführen (z. B. Fahrzeuge alarmieren, Sprechwünsche bearbeiten). Empfehlungen und Vorschläge einblenden („hier fehlen Fahrzeuge“) ist erlaubt, das Auswählen und Absenden muss die Spielerin oder der Spieler.

Die Nutzung des Spiels muss durch die Spielerin oder den Spieler persönlich erfolgen. Bots sind verboten.

### 2. Massenaktionen & Fairness gegenüber dem Spiel

Spielgeschehen (z. B. Alarmieren, Nachalarmieren, Sprechwünsche bearbeiten): Jeder Vorgang erfordert eine eigene Nutzeraktion. Ein Knopf, der danach hunderte Vorgänge selbst abarbeitet, ist nicht erlaubt.

Ausgenommen hiervon ist das Freigeben von Einsätzen sowie das Schreiben von Rückmeldungen in Einsätze. Dies ist erlaubt, sofern die im nächsten Punkt beschriebenen Voraussetzungen erfüllt sind.

Verwaltung und Konfiguration (z. B. Fahrzeuge umbenennen, Fahrzeugeinstellungen ändern, Gebäude nach Vorlage ausbauen, Fahrzeuge nach Vorlage kaufen): als Sammelaktion erlaubt, wenn das Script:

- vor der Ausführung eine Vorschau zeigt (was, wie viele, welche Kosten),
- eine ausdrückliche Bestätigung einholt,
- jederzeit abgebrochen werden kann.

Zwischen gleichartigen Anfragen an den Server müssen mindestens 100ms liegen. Es dürfen nie zwei gleichartige Anfragen gleichzeitig laufen.

Daten, die das Spiel bereits im Browser bereitstellt, sollen aus dem Spiel gelesen werden, statt sie erneut vom Server anzufragen. Caching soll genutzt werden, wo möglich.

### 3. Sicherheit & Datenschutz

Scripte dürfen keine Login-Daten abfragen, speichern oder übermitteln (E-Mail-Adresse, Passwort, Sitzungsdaten). Gebt eure Login-Daten niemals an Dritte weiter, auch nicht an Scripte.

Scripte dürfen keine personenbezogenen Daten verarbeiten und keine Spieler- oder Verbandsdaten an externe Dienste übermitteln, außer die betroffenen Personen haben ausdrücklich zugestimmt.

Verbindungen zu externen Servern sollen vermieden werden. Sind sie nötig, müssen sie im Header deklariert (@connect) und in der Beschreibung genannt werden.

Telemetrie, Statistik- und Tracking-Funktionen sind nur mit ausdrücklicher Einzelfall-Genehmigung des Betreibers erlaubt. Auch dann müssen Nutzende aktiv zustimmen und die Funktion deaktivieren können.

### 4. Transparenz & Verantwortung

Der Code muss lesbar und nicht minifiziert oder verschleiert sein. Ausnahme: externe Bibliotheken über @require. Wer Build-Tools (z. B. TypeScript, Bundler) nutzt, muss den Quellcode öffentlich verlinken.

Das Script muss einen vollständigen Header haben: Name, Version, Beschreibung, Lizenz und eine verantwortliche Person unter @author, die im Forum erreichbar ist, solange das Script unterstützt wird.

Die verantwortliche Person muss das Script erklären können. Auf Nachfrage des Betreibers oder des Teams ist sie zur Auskunft verpflichtet.

Scripte dürfen keine Premium-Funktionen des Spiels nachbauen.

Scripte dürfen keine Fehler oder Bugs im Spiel ausnutzen und keine versteckten oder undokumentierten Spielzugänge verwenden.

### 5. Nutzung von KI

KI darf bei der Entwicklung genutzt werden. Voraussetzung: Alle Regeln dieser Richtlinie gelten für den gesamten Code, egal, wer ihn geschrieben hat.

Die KI-Nutzung muss gekennzeichnet werden: im Header (@ai) und in der Veröffentlichung. Stufen: none (keine KI), assisted (KI-unterstützt, z. B. einzelne Funktionen, Erklärungen, Texte), generated (im Kern KI-generiert).

Wer ein Script veröffentlicht, ist für den kompletten Code verantwortlich, auch für den KI-generierten Teil. „Das hat die KI so geschrieben“ ist keine Begründung.

KI-generierte Scripte dürfen nicht als eigenes, handgeschriebenes Werk ausgegeben werden.

### 6. Urheberrecht

Fremder Code darf nur gemäß seiner Lizenz übernommen oder erweitert werden. Ohne Lizenz ist die Zustimmung der Urheberin oder des Urhebers einzuholen.

Bei Übernahmen und Erweiterungen ist die Herkunft zu nennen. Erweiterungen sind, wenn möglich, vorher mit der Original-Autorin oder dem Original-Autor abzustimmen.

Das eigene Script muss unter @license eine Lizenz angeben.

## Empfehlungen („soll“)

- @grant so sparsam wie möglich setzen: Keine Rechte anfordern, die das Script nicht braucht.
- Code kommentieren und verständlich strukturieren.
- Vor der Veröffentlichung Feedback einholen, die Scripting-Community hilft gern. Fang klein an.
- Auf vorhandene Dokumentation und bekannte Schnittstellen zurückgreifen, statt Endpunkte zu raten.
- Fehler behandeln statt sie ins Spiel „durchzureichen“.
- Respektvoll mit Feedback umgehen, auch Kritik an KI-generierten Scripten ernst nehmen und selbst beantworten.
- Vor einem Fehlerbericht im Forum: erst prüfen, ob der Fehler auch ohne Scripte auftritt.

## Für Nutzende

Die Nutzung von Scripten und Zusatzprogrammen erfolgt auf eigene Gefahr.

Auch für Nutzende gelten die AGB: Wer ein verbotenes Script nutzt, verstößt selbst gegen die AGB.

Prüft vor der Installation, was ein Script tut, der Code muss lesbar sein, genau dafür.

Login-Daten gehören niemals in ein Script oder an Dritte.

## Durchsetzung

Verstöße gegen diese Richtlinie und die AGB werden vom Betreiber im Einzelfall geprüft und können bis zur Sperrung des Accounts reichen. Bei Unklarheiten, ob ein Vorhaben erlaubt ist, ist vorher beim Betreiber nachzufragen.
