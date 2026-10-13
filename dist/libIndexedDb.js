/*!
 * ==UserScript==
 * @name        Indexed Database handler
 * @version     0.5.4.260913.1941
 * @author      papachaotica
 * @description library to handle indexedDB
 * ==/UserScript==
 *
 * Copyright (c) 2026 papachaotica. All rights reserved.
 *
 * License Terms:
 * 1. Free Use: Permission is hereby granted to anyone to use and distribute
 *    this script for both private and commercial purposes free of charge.
 * 2. No Derivatives: Modifying, altering, translating, or creating derivative
 *    works based on this software is strictly prohibited.
 * 3. Attribution: This copyright and license notice must remain intact and
 *    included in all copies or substantial portions of the software.
 *
 * The author reserves the right to modify or change the licensing terms
 * for any future versions or releases of this software at any time.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OFMERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

'use strict';

/* example indexedDB database config *****************************************

const config = {
    name: "example",
    stores:
    [
        {
            name: "foobar",
            key: { keyPath: "id", autoIncrement: true },
            indices:
            [
                { name: "foo", keyPath: "foo", options: { unique: true } },
                { name: "bar", keyPath: "bar", options: { unique: false } }
            ]
        }
    ]
};

// exaple indexedDB database config *****************************************/

/* manpage: ******************************************************************
 *
 * async function foobar() {
 *     await initDB(config);
 *         // open database, with given config. like hello this is i need
 *
 *     await saveKey(data, store, config, key);
 *         // save given data, keypath will used. use key only wen need
 *         // saveData triggers initDB, wen ist database is closed
 *
 *     await readKey(key, store, config);
 *         // get data for key out of given store
 *         // readData trigger initDB, wen database is closed
 *
 *     await queryStore(store, range, config, indexName);
 *         // get range of data output as array
 *
 *
 ****************************************************************************/

let db = null;

function initDB(config, version) {
    if (!window.indexedDB) { alert("IndexedDB wird nicht unterstützt!"); }
    return new Promise((resolv, reject) => {
        const request = version
            ? window.indexedDB.open(config.name, version)
            : window.indexedDB.open(config.name);

        request.onerror = (event) => {
            console.error(`Fehler beim Öffnen der Datenbank: ${config.name}`);
            console.error(event.target.error);
            reject(event);
        };

        request.onupgradeneeded = (event) => {
            console.warn(`Datenbank: ${config.name} upgrade`);
            const init = event.target.result,
                  transaction = event.target.transaction;

            config.stores.forEach(s => {
                if (!init.objectStoreNames.contains(s.name)) {
                    const store = init.createObjectStore(s.name, s.key);
                    console.log(`Datenbank: ${config.name} Store: ${s.name} angelegt`);
                    if (s.indices) {
                    s.indices.forEach(i => {
                        store.createIndex(i.name, i.keyPath, i.options);
                        console.log(`Datenbank: ${config.name} Store: ${s.name}
                            Index: ${i.name} angelegt`);
                    });
                    };
                } else {
                    const store = transaction.objectStore(s.name);
                    s.indices.forEach(i => {
                        if (!store.indexNames.contains(i.name)) {
                            store.createIndex(i.name, i.keyPath, i.options);
                            console.log(`Datenbank: ${config.name} Store: ${s.name}
                                Index: ${i.name} angelegt`);
                        }
                    });
                }
            });
        };

        request.onsuccess = (event) => {
            const init = event.target.result;

            const needupgrade = config.stores.some(s => {
                if (!init.objectStoreNames.contains(s.name)) {
                    return true;
                }
                if (s.indices) {
                return s.indices.some(i => {
                    if (!init.transaction(s.name, "readonly")
                        .objectStore(s.name).indexNames.contains(i.name)) {
                        return true;
                    }
                });
                }
            });

            if (needupgrade) {
                const version = init.version + 1;
                console.log(`Datenbank Store/Index nicht 
                    gefunden! starte Upgrade zu Version ${version}`);
                init.close();
                resolv(initDB(config, version));
            } else {
                db = init;
                resolv(db);
            }

            init.onversionchange = (event) => {
                init.close();
                db = null;
            };
        };
    });
}
async function saveKey(data, store, config, key) {
    if (!db) {
        console.warn(`Datenbank ${config.name} wird geöffnet!`);
        db = await initDB(config);
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, "readwrite"),
              objectStore = transaction.objectStore(store),
              request = key !== undefined ? objectStore.put(data, key) : objectStore.put(data)

        request.onsuccess = (event) => {
            resolve(event);
        };

        request.onerror = (event) => {
            console.error(`Fehler beim speichern von ${key} in ${store} on ${config.name}`);
            console.error(event.target.error);
            reject(event);
        };
    });
}

async function readKey(key, store, config) {
    if (!db) {
        console.warn(`Datenbank ${config.name} wird geöffnet!`);
        db = await initDB(config);
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, "readonly"),
              objectStore = transaction.objectStore(store),
              request = objectStore.get(key);

        request.onsuccess = (event) => {
            const data = event.target.result;
            resolve(data);
        };

        request.onerror = (event) => {
            console.error(`Fehler beim lesen von ${key} in ${store} on ${config.name}`);
            console.error(event.target.error);
            reject(event);
        };
    });
}
/* query */
async function queryStore(store, range, config, indexName) {
    let data = [];
    if (!db) {
        console.warn(`Datenbank ${config.name} wird geöffnet!`);
        db = await initDB(config);
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, "readonly");
        let objectStore = transaction.objectStore(store);
        if (indexName) {
            objectStore = objectStore.index(indexName);
        }
        const request = objectStore.openCursor(range);

        request.onsuccess = (event) => {
            console.log(`indexedDb: Lese daten für ${range}`);
            const cursor = event.target.result;
            if (cursor) {
                data.push(cursor.value);
                cursor.continue();
            } else {
                resolve(data);
            }

        };

        request.onerror = (event) => {
            console.error(`Fehler beim lesen von ${range} in ${store} on ${config.name}`);
            console.error(event.target.error);
            reject(event);
        };

    });
}

async function exportStore(store, config) {
    if (!db) {
        console.warn(`Datenbank ${config.name} wird geöffnet!`);
        db = await initDB(config);
    }
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, "readonly"),
            objectStore = transaction.objectStore(store),
            request = objectStore.getAll();

        request.onsuccess = (event) => {
            const daten = event.target.result;
            if (!daten || daten.length === 0) {
                console.warn(`Keine Daten in ${store} on ${config.name}`);
                resolve();
                return;
            }
            const json = JSON.stringify(daten, null, 4),
                blob = new Blob([json], { type: "application/json"  }),
                url = URL.createObjectURL(blob),
                link = document.createElement("a");
            link.href = url;
            link.download = `${store}.json`;
            document.body.appendChild(link);
            URL.revokeObjectURL(url);

            resolve();
        };

        request.onerror = (event) => {
            console.error(`Fehler beim lesen von ${store} on ${config.name}`);
            console.error(event.target.error);
            reject(event);
        };


    });
}

/*
async function importData(array, store, config) {
    for (const item of array) {
        await saveData(item, store, config);
    }
}

/*
async function exportDB(database) {}

/*
async function importDB(file) {}
*/
