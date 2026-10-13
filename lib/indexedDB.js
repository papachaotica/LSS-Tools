/*!
 * ==UserScript==
 * @name        Indexed Database handler
 * @version     0.12.7.261011.0154
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
 * use it with @require http://raw.github.com/papachaotica/LSS-Tools/main/lib/indexedDB.js
 *
 * async function initDB(config)
 *     // open database with given config, like this is i need
 *     // automatically triggers upgrade when stores or indices are missing
 *
 * async function saveKey(data, store, config, key)
 *     // save given data, keypath will be used. use key only when needed
 *     // triggers initDB when database is closed
 *
 * async function readKey(key, store, config)
 *     // get data for key out of given store
 *     // triggers initDB when database is closed
 *
 * async function queryStore(store, range, config, indexName)
 *     // get range of data output as array using a cursor
 *     // filters by primary key if indexName is omitted, or by specific index
 *     // example: queryStore("example", IDBKeyRange.only(1234), config, "foo")
 *
 * async function readAll(store, config)
 *     // get ALL data out of given store as a complete array using getAll
 *
 * async function saveAll(array, store, config)
 *     // bulk save an array of data inside a single transaction using put
 *     // overwrites existing entries with identical keys
 *
 * async function saveClean(array, store, config)
 *     // clear given store completely and bulk save the new array inside
 *     // a single transaction. prevents old data corpses
 *
 * async function readConfigDB(database)
 *     // analyze any unknown database live and return its structure config object
 *
 * async function exportStore(store, config)
 *     // read all data from a store and trigger browser download as '[store].json'
 *
 * async function exportConfigDB(database)
 *     // read structure of database and trigger browser download as 'configDB-[name].json'
 *
 * async function exportFullDB(database)
 *     // full backup: trigger download for the structure config AND every single
 *     // store as separate json files
 *
 ****************************************************************************/

let db;

async function initDB(config, version) {
    if (!window.indexedDB) { alert("IndexedDB not supported!"); return; }

    return new Promise((resolv, reject) => {
        const request = version
            ? window.indexedDB.open(config.name, version)
            : window.indexedDB.open(config.name);

        request.onerror = (event) => {
            console.error(`Error: Opening database ${config.name}`);
            console.error(event.target.error);
            reject(event);
        };

        request.onupgradeneeded = (event) => {
            console.warn(`Database: ${config.name} upgrade`);
            const init = event.target.result,
                  transaction = event.target.transaction;

            config.stores.forEach(s => {
                if (!init.objectStoreNames.contains(s.name)) {
                    const store = init.createObjectStore(s.name, s.key);
                    console.log(`Database: ${config.name} store: ${s.name} created`);
                    if (s.indices) {
                    s.indices.forEach(i => {
                        store.createIndex(i.name, i.keyPath, i.options);
                        console.log(`Database: ${config.name} store: ${s.name}
                            indices: ${i.name} created`);
                    });
                    };
                } else {
                    const store = transaction.objectStore(s.name);
                    s.indices.forEach(i => {
                        if (!store.indexNames.contains(i.name)) {
                            store.createIndex(i.name, i.keyPath, i.options);
                            console.log(`Database: ${config.name} store: ${s.name}
                                indices: ${i.name} created`);
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
                console.log(`Database store/Indices not found!
                    run upgrade to version ${version}`);
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
        console.warn(`Database ${config.name} opening!`);
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
            console.error(`Error: ${key} could not save on ${store} in database ${config.name}`);
            console.error(event.target.error);
            reject(event);
        };
    });
}

async function readKey(key, store, config) {
    if (!db) {
        console.warn(`Database ${config.name} opening!`);
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
            console.error(`Error: ${key} could not read on ${store} in database ${config.name}`);
            console.error(event.target.error);
            reject(event);
        };
    });
}

async function queryStore(store, indexName, config, range = null) {
    let data = [];
    if (!db) {
        console.warn(`Database ${config.name} opening!`);
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
            const cursor = event.target.result;
            if (cursor) {
                data.push(cursor.value);
                cursor.continue();
            } else {
                resolve(data);
            }

        };

        request.onerror = (event) => {
            console.error(`Error: ${range} could not read on ${store} in database ${config.name}`);
            console.error(event.target.error);
            reject(event);
        };

    });
}

async function readAll(store, config) {
    if (!db) {
        console.warn(`Database ${config.name} opening!`);
        db = await initDB(config);
    }
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, "readonly"),
            objectStore = transaction.objectStore(store),
            request = objectStore.getAll();

        request.onsuccess = (event) => {
            const data = event.target.result;
            if (!data || data.length === 0) {
                console.warn(`No data in ${store} on ${config.name}`);
                resolve([]);
                return;
            }
            resolve(data);
        };

        request.onerror = (event) => {
            console.error(`Error: Could not read in ${store} on ${config.name}`);
            console.error(event.target.error);
            reject(event);
        };
    });
}

async function saveAll(array, store, config) {
    if (!db) {
        console.warn(`Database ${config.name} opening!`);
        db = await initDB(config);
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, "readwrite");
        const objectStore = transaction.objectStore(store);

        array.forEach((item) => {
            objectStore.put(item);
        });

        transaction.oncomplete = (event) => {
            resolve(event);
        };

        transaction.onerror = (event) => {
            console.error(`Error: Could not save all array data in '${store}':`);
            console.error(event.target.error);
            reject(event);
        };
    });
}

async function saveClean(array, store, config) {
    if (!db) {
        console.warn(`Database ${config.name} opening!`);
        db = await initDB(config);
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, "readwrite");
        const objectStore = transaction.objectStore(store);

        objectStore.clear();

        array.forEach((item) => {
            objectStore.put(item);
        });

        transaction.oncomplete = (event) => {
            resolve(event);
        };

        transaction.onerror = (event) => {
            console.error(`Error: '${store}':`, event.target.error);
            reject(event);
        };
    });
}

async function readConfigDB(database) {
    if ( db && db.name != database ) {
        db.close();
    }
    const config = { name: database, stores: [] };
    await initDB(config);
    const output = {
        name: db.name,
        stores: []
    };

    const storeNames = Array.from(db.objectStoreNames);
    if (storeNames.length > 0) {
        const transaction = db.transaction(storeNames, "readonly");
        storeNames.forEach((storeName) => {
            const store = transaction.objectStore(storeName);
            const storeConfig = {
                name: store.name,
                key: {
                    keyPath: store.keyPath,
                    autoIncrement: store.autoIncrement
                },
                indices: []
            };

            const indexNames = Array.from(store.indexNames);
            indexNames.forEach((indexName) => {
                const index = store.index(indexName);
                storeConfig.indices.push({
                    name: index.name,
                    keyPath: index.keyPath,
                    options: {
                        unique: index.unique,
                        multiEntry: index.multiEntry
                    }
                });
            });
            output.stores.push(storeConfig);
        });
    }
    db.close();
    db = null;
    return output;
}

async function exportStore(store, config) {
    const data = await readAll(store, config);
    const json = JSON.stringify(data, null, 2),
        blob = new Blob([json], { type: "application/json"  }),
        url = URL.createObjectURL(blob),
        link = document.createElement("a");
    link.href = url;
    link.download = `${store}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

async function exportConfigDB(database) {
    const data = await readConfigDB(database);
    const json = JSON.stringify(data, null, 2),
        blob = new Blob([json], { type: "application/json"  }),
        url = URL.createObjectURL(blob),
        link = document.createElement("a");
    link.href = url;
    link.download = `configDB-${database}.json`
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

async function exportFullDB(database) {
    const config = await readConfigDB(database);
    for (const store of config.stores) {
        await exportStore(store.name, config);
    }

    const json = JSON.stringify(config, null, 2),
        blob = new Blob([json], { type: "application/json"  }),
        url = URL.createObjectURL(blob),
        link = document.createElement("a");
    link.href = url;
    link.download = `configDB-${database}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
