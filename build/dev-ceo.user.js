// ==UserScript==
// @name         [DEV] LSS Chef der Einheiten und Objekte
// @namespace    papachaotica.leitstellenspiel.de
// @version     20261021.2237
// @match        https://leitstellenspiel.de/*
// @match        https://www.leitstellenspiel.de/*
// @exclude-match https://forum.leitstellenspiel.de/*
// @run-at       document-idle
// ==/UserScript==
(() => {
        
    const reloadSocket = new WebSocket('ws://127.0.0.1:8080/ws');

    reloadSocket.addEventListener('message', event => {
        if (event.data === 'reload') {
        
            window.location.reload();
        }
    });


    const files = [
        'http://127.0.0.1:8080/lib/indexedDB.js',
        'http://127.0.0.1:8080/lib/api-fetch-database-handler.js',
        'http://127.0.0.1:8080/dev/gebietsleitung.user.js',
    ];

async function loadCurrentDevelopmentFiles() {
    const revision = Date.now();
    let combinedSource = '';

    for (const file of files) {
        const response = await fetch(`${file}?dev=${revision}`, {
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error(`${response.status} beim Laden von ${file}`);
        }

        combinedSource += `\n\n// Anfang: ${file}\n`;
        combinedSource += await response.text();
        combinedSource += `\n// Ende: ${file}\n`;
    }

    (0, eval)(combinedSource);
}

loadCurrentDevelopmentFiles().catch(error => {
    console.error('[DEV] Lokale Dateien konnten nicht geladen werden:', error);
});
})();
