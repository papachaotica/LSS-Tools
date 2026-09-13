// ==UserScript==
// @name        [ LSS  ] Hide elemnts
// @namespace   papachaotica.leitstellenspiel.de
// @version     0.0.1.260905.1617
// @license     BSD-3-Clause
// @author      papachaotica
// @description  Löscht die Karte vollständig aus dem Speicher, um CPU-Last zu sparen.
// @match       https://leitstellenspiel.de
// @match       https://www.leitstellenspiel.de
// @icon        https://www.google.com/s2/favicons?sz=64&domain=leitstellenspiel.de
// @run-at      document-idle
// @grant       none
// ==/UserScript==

(function() {
    'use strict';

    function killMap() {
        const mapElement = document.getElementById("map");
        if (mapElement) {
            mapElement.remove();
        } else {
            setTimeout(killMap, 500);
        }
    }
    killMap();
})();
