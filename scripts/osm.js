'use strict'
/*
bit:    00000 00001 00010 00011 00100 00101 00110 00111 01000 01001 01010
zahl:       0     1     2     3     4     5     6     7     8     9    10
BASE32:     0     1     2     3     4     5     6     7     8     9     b
bit:    01011 01100 01101 01110 01111 10000 10001 10010 10011 10100 10101
zahl:      11    12    13    14    15    16    17    18    19    20    21
BASE32:     c     d     e     f     g     h     j     k     m     n     p
bit:    10110 10111 11000 11001 11010 11011 11100 11101 11110 11111
zahl:      22    23    24    25    26    27    28    29    30    31
BASE32:     q     r     s     t     u     v     w     x     y     z
*/
/*    ost/west  nord/süd
 * 1 ~ 5000km   ~ 5000km
 * 2 ~ 1250km   ~  625Km
 * 3 ~  156km   ~  156km
 * 4 ~   39km   ~   19km
 * 5 ~    5km   ~    5km
 * 6 ~ 1200m    ~  610m
 * 7 ~  153m    ~  153m
 * 8 ~   38m    ~   19m
 * 9 ~    5m    ~    5m
 * 10 ~ 1,2m   ~   0,6m
 * 11 ******************
 */

function decodeGeohash(geohash) {
    // Konstanten für die bit wahr/falsch ermittlung
    const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
    let latMin =  -90, latMax =  90,
        lonMin = -180, lonMax = 180;
    let eventBit = true;

    // schleife bis hash abgearbeitet
    for ( let i = 0; i < geohash.length; i = i+1 ) {
        // Position Wert z.B.                      u
        const chr = geohash[i];
        // indexposition zurückgeben          u = 26
        const idx = BASE32.indexOf(chr);
        // 5 bit lang durchgehen 26 = 11010
        for (let n = 4; n >= 0; n = n-1) {
            // für jedes bit eine stelle verschieben
            const bit = (idx >> n) & 1;
            // wenn eventBit = true "lon" ost/west prüfen
            if (eventBit) {
                // mittelpunkt berechnen
                const lonMid = (lonMin + lonMax) / 2;
                // wenn bit exakt 1 wird untere Grezen zur neuen mitte 
                if (bit === 1) lonMin = lonMid;
                // sonst wird obere Grenz zur neuen Mitte
                else lonMax = lonMid;
                // wenn eventBit = false "lat" nord/süd prüfen
            } else {
                // berechnung der mitte
                const latMid = (latMin + latMax) / 2;
                // ist bit gleich 1 wird untere Grenze zur neuen Mitte
                if (bit === 1) latMin = latMid;
                // sonst obere Grenze
                else latMax = latMid;
            }
            // eventbit drehen
            eventBit = ! eventBit;
        }
    }
    // berechnete werte wiedergeben u = 26 = 11010 === 1 ost (0-90), 1 nord (0-45), 0 ost (0-45), 1 nord (45-90), 0 ost (0-22,5)
    // Kachel "u" von lat 45,0-90,0 norden und lon 0,0-22,5 osten - Nord/Mitteleuropa
    // Kachel "u0" lat (45,0-50,625) nord und lon 0,0-11,25 ost 
    // Kachel "u0w" lat (47,8125-50,625) nord und lon (8,4375-11,25) s'ländle
    // Kachel "u0ww" lat (48,8671875-49,0429875) nord und (9,140625-9,4921875) ost
    return { latitude: (latMin + latMax) / 2, longitude = (lonMin + lonMax) / 2 }
}

function encodeGeohash(lat, lon, precision) {
    // Aufzählung der möglichen Zeichen
    const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
    // startwert 0
    let idx = 0, bit = 0, eventBit = true, geohash = "";
    // Startwerte für den Planeten
    let latMin = -90, latMax = 90, lonMin = -180, lonMax = 180;

    // wiederhole bis hashlänge passt
    while (geohash.length < precision) {
        // wenn eventBit = true ost/west prüfen
        if (eventBit) {
            // berechne mitte
            let lonMid = (lonMin + lonMax) / 2;
            // ist im osten von mitte, lon größer lonmid, dann setze bit 1 und nach mit größerer 1/2 weiter
            if (lon >= lonMid) { idx = idx * 2 + 1; lonMin = lonMid; }
            // ist nicht im osten von mitte, lon kleiner lonmid, dann setzte bit 0 und mach mit kleinerer 1/2 weiter
            else { idx = idx * 2; lonMax = lonMid; }

        } else { // Breitengrad aufteilen
            // ermittle mitte nord/süd 
            let latMid = (latMin + latMax) / 2;
            // ist im lat im norden von mitte, setze bit 1 und nach mit größerer 1/2 weiter
            if (lat >= latMid) { idx = idx * 2 + 1; latMin = latMid; }
            // ist lat im süden von mitte, dann bit 0 und mach mit kleiner hälfte weiter
            else { idx = idx * 2; latMax = latMid; }
        }
        // wechsel dreht die prüfing um aus eventbit=true wird eventbit=false
        eventBit = !eventBit;
        // fertig wenn bitlänge 5 Stellen hat, 31 mögliche Zeichen
        if (++bit === 5) {
            // zählt die buchstaben durch und hängst den nächsten an
            geohash += BASE32[idx];
            // setzt den zähler für den nächsten durchlauf zurück
            bit = 0; idx = 0;
        }
    }
    return geohash;
}
