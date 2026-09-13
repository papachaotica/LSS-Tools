const fs = require('fs');
const path = require('path');

// Holt den Pfad zur Startdatei (z.B. src/Scriptname/Beispiel.Header.user.js)
const startPfad = process.argv[2];

if (!startPfad) {
    console.error('Fehler: Bitte gib den Pfad zur Start-Datei an! (z.B. node compiler.js src/Scriptname/Beispiel.Header.user.js)');
    process.exit(1);
}

try {
    // 1. Pfade analysieren
    const ordner = path.dirname(startPfad); // Gibt "src/Scriptname" zurück
    const dateiName = path.basename(startPfad); // Gibt "Beispiel.Header.user.js" zurück
    
    // Trennt den Namen am ersten Punkt ab (holt "Beispiel")
    const basisName = dateiName.split('.')[0]; 
    
    // Setzt den Zielpfad im selben Ordner zusammen: "src/Scriptname/Beispiel.User.js"
    const ausgabePfad = path.join(ordner, `${basisName}.user.js`);

    // 2. Start-Datei einlesen
    const inhalt = fs.readFileSync(startPfad, 'utf8');
    const zeilen = inhalt.split('\n');

    let basisText = '';
    const dateiPfade = [];

    // 3. Aktuelles Datum im Format YYMMDD generieren
    const jetzt = new Date();
    const yy = String(jetzt.getFullYear()).slice(-2);
    const mm = String(jetzt.getMonth() + 1).padStart(2, '0');
    const dd = String(jetzt.getDate()).padStart(2, '0');
    const buildDatum = `${yy}${mm}${dd}`;

    // 4. Zeile für Zeile verarbeiten
    zeilen.forEach(zeile => {
        const getrimmteZeile = zeile.trim();

        if (getrimmteZeile.startsWith('@require')) {
            // Extrahiert den Pfad nach der URL (z.B. "src/lib/function.js")
            const relativerPfad = zeile
                .replace('@require', '')
                .replace('http://localhost:8080/', '')
                .trim();
            
            // Da du im Git-Root stehst, ist der Pfad "src/lib/function.js" direkt korrekt
            dateiPfade.push(relativerPfad);
        } 
        else if (getrimmteZeile.startsWith('// @version')) {
            basisText += `${zeile.trimEnd()}.${buildDatum}\n`;
        } 
        else {
            basisText += zeile + '\n';
        }
    });

    // 5. Finalen Text mit IIFE zusammenbauen
    let finalerText = basisText.trim() + '\n\n';
    finalerText += '(function (){\n    "use strict";\n\n';

    // 6. Die Bibliotheken aus dem Git-Root einlesen
    dateiPfade.forEach(pfad => {
        try {
            console.log(`Füge Datei ein: ${pfad}`);
            let dateiInhalt = fs.readFileSync(pfad, 'utf8');
            
            // "use strict" entfernen
            dateiInhalt = dateiInhalt.replace(/['"]use strict['"];?/g, '');

            // Inhalt um 4 Leerzeichen einrücken
            const eingerückterInhalt = dateiInhalt
                .split('\n')
                .map(z => '    ' + z)
                .join('\n');

            finalerText += `    /* --- Start von ${pfad} --- */\n` + eingerückterInhalt + '\n\n';
        } catch (fehler) {
            console.error(`Fehler: Datei "${pfad}" konnte nicht geladen werden!`);
        }
    });

    finalerText += '})();\n';

    // 7. Im richtigen Zielordner speichern
    fs.writeFileSync(ausgabePfad, finalerText, 'utf8');
    console.log(`Erfolgreich! "${ausgabePfad}" erstellt.\n`);

} catch (fehler) {
    console.error(`Fehler beim Verarbeiten: ${fehler.message}`);
}

