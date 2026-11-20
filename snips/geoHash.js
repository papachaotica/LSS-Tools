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
    const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
    let latMin = -90, latMax = 90,
        lonMin = -180, lonMax = 180;
    let eventBit = true;

    for (let i = 0; i < geohash.length; i = i + 1) {
        const chr = geohash[i];
        const idx = BASE32.indexOf(chr);
        for (let n = 4; n >= 0; n = n - 1) {
            const bit = (idx >> n) & 1;
            if (eventBit) {
                const lonMid = (lonMin + lonMax) / 2;
                if (bit === 1) lonMin = lonMid;
                else lonMax = lonMid;
            } else {
                const latMid = (latMin + latMax) / 2;
                if (bit === 1) latMin = latMid;
                else latMax = latMid;
            }
            eventBit = !eventBit;
        }
    }
    return { latitude: (latMin + latMax) / 2, longitude = (lonMin + lonMax) / 2 }
}

function encodeGeohash(lat, lon, precision) {
    const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
    let idx = 0, bit = 0, eventBit = true, geohash = "";
    let latMin = -90, latMax = 90, lonMin = -180, lonMax = 180;

    while (geohash.length < precision) {
        if (eventBit) {
            let lonMid = (lonMin + lonMax) / 2;
            if (lon >= lonMid) { idx = idx * 2 + 1; lonMin = lonMid; }
            else { idx = idx * 2; lonMax = lonMid; }

        } else { // Breitengrad aufteilen
            let latMid = (latMin + latMax) / 2;
            if (lat >= latMid) { idx = idx * 2 + 1; latMin = latMid; }
            else { idx = idx * 2; latMax = latMid; }
        }
        eventBit = !eventBit;
        if (++bit === 5) {
            geohash += BASE32[idx];
            bit = 0; idx = 0;
        }
    }
    return geohash;
}
