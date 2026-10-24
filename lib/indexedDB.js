/*!
 * ==UserScript==
 * @name        Indexed Database handler
 * @version     0.13.1.261022
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
 * async function queryStore(store, indexName, config, range = null, matches = null)
 *     // get range of data output as array using a cursor
 *     // filters by primary key if indexName is omitted, or by specific index
 *     // matches can filter every cursor item before it is added to the result
 *     // example: queryStore("example", "foo", config, IDBKeyRange.only(1234))
 *
 * async function countStore(store, indexName, config, range = null)
 *     // count items in a range without loading the items
 *
 * async function filterStores(store, config, activeFilters)
 *     // select the indexed active filter with the fewest matches as query source
 *     // and apply every active filter to the cursor result
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

async function caseOfCaddy(dbName, store, keyORindex, range = null) {
    // This function is intended for reading an external IndexedDB, in cases
    // where you cannot be certain whether it actually exists on the user's
    // device. It returns a "resolve" even if no data is found
    if (!window.indexedDB) {
      alert(`IndexedDB not supported!`);
      return;
    }

    let database;
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(dbName);

        request.onerror = (event) => {
            console.log('caseOfCaddy request.onerror')
            console.log(event.target.error.message)
            if (request.error?.name === 'AbortError') {
              resolve(event.target.error);
              return;
            }
            reject(event.target.error.message);
        };

        request.onupgradeneeded = (event) => {
            console.log('caseOfCaddy request.onupgradeneeded db not exist maybe')
            event.target.transaction.abort();
        };

        request.onsuccess = (event) => {
            database = event.target.result;
            console.log('caseOfCaddy request.success')
            if (!database.objectStoreNames.contains(store)) {
              console.log('caseOfCaddy request.success store not exist')
              console.log(event.target.result.objectStoreNames);
              database.close();
              resolve({error: "store not exist"});
              return;
            }

            const transaction = database.transaction(store, 'readonly');
            let objectStore = transaction.objectStore(store);
            let read;
            let data;
            if (range !== null) {
              data = [];
              console.log(`objectStore.openCursor(${keyORindex})`)
              objectStore = objectStore.index(keyORindex);
              read = objectStore.openCursor(range);
            } else {
              console.log(`objectStore.get(${keyORindex})`)
              read = objectStore.get(keyORindex);
            }

            read.onsuccess = (event) => {
                console.log('caseOfCaddy read.onsuccess')
                const result = event.target.result;
                if ((result) && (range !== null)) {
                  data.push(result.value);
                  result.continue();
                  return;
                }
                if ((!result) && (range !== null)) {
                  resolve(data);
                }
                if (range === null) {
                  resolve(result);
                }
                database.close();
            }

            read.onerror = (event) => {
                console.log('caseOfCaddy read.onerror');
                console.log(event);
                database.close();
                reject(read.error);
            };
        }
    });
}

async function initDB(config, version) {
    if (!window.indexedDB) { alert("IndexedDB not supported!"); return; } /* eslint-disable-line */

    if (db && db.name === config.name) { return; }

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
                      if (!init.transaction(s.name, 'readonly')
                        .objectStore(s.name).indexNames.contains(i.name)) {
                        return true;
                      }
                  });
                }
            });

            if (needupgrade) {
              const version = init.version + 1;
              console.log(`Database store/Indices not found! run upgrade to version ${version}`);
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

async function saveKey(data, store, config, key = undefined) {
    if (!db) {
      console.warn(`Database ${config.name} opening!`);
      db = await initDB(config);
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = key !== undefined
          ? objectStore.put(data, key) : objectStore.put(data);

        request.onsuccess = (event) => {
            console.log(`Erfolgreich gespeichert`, data);
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
        const transaction = db.transaction(store, 'readonly');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.get(key);

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

async function queryStore(store, indexName, config, range = null, matches = null) { /* eslint-disable-line */
    let data = [];
    if (!db) {
      console.warn(`Database ${config.name} opening!`);
      db = await initDB(config);
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, 'readonly');
        let objectStore = transaction.objectStore(store);
        if (indexName) {
          objectStore = objectStore.index(indexName);
        }
        const request = objectStore.openCursor(range);

        request.onerror = (event) => {
            console.error(`Error: ${range} could not read on ${store} in database ${config.name}`);
            console.error(event.target.error);
            reject(event);
        };

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              const item = cursor.value;
              if (!matches || matches(item)) {
                data.push(item);
              }
              cursor.continue();
            } else {
              resolve(data);
            }
        };

    });
}

async function countStore(store, indexName, config, range = null) {
    if (!db) {
      console.warn(`Database ${config.name} opening!`);
      db = await initDB(config);
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, 'readonly');
        let objectStore = transaction.objectStore(store);
        if (indexName) {
          objectStore = objectStore.index(indexName);
        }
        const request = objectStore.count(range);

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error(`Error: ${range} could not count on ${store} in database ${config.name}`);
            console.error(event.target.error);
            reject(event);
        };

    });
}

/*async function filterStores(store, config, filtersArray) {
    const filters = await Promise.all(filterArray.map(async filter => ({
        ...filter,
        count: filter.indexName
            ? await countStore(store, filter.indexName, config, filter.range)
            : null,
    })));
    const indexedFilters = filters.filter(filter => filter.indexName);
    const matches = item =>
        filters.every(filter => filter.matches(item));

    const mainFilter = indexedFilters.length === 0
        ? null
        : indexedFilters.reduce(
        (smallest, filter) =>
            filter.count < smallest.count ? filter : smallest
        );
    const data = await queryStore(
        store,
        mainFilter ? mainFilter.indexName : null,
        config,
        mainFilter ? mainFilter.range : null,
        matches
    );

    return { filters, mainFilter, data };
}*/

async function readAll(store, config) {
    if (!db) {
      console.warn(`Database ${config.name} opening!`);
      db = await initDB(config);
    }
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, 'readonly'),
            objectStore = transaction.objectStore(store),
            request = objectStore.getAll();

        request.onerror = (event) => {
            console.error(`Error: Could not read in ${store} on ${config.name}`);
            console.error(event.target.error);
            reject(event);
        };

        request.onsuccess = (event) => {
            const data = event.target.result;
            if (!data || data.length === 0) {
              console.warn(`No data in ${store} on ${config.name}`);
              resolve([]);
              return;
            }
            resolve(data);
        };

    });
}

async function saveAll(array, store, config) {
    if (!db) {
      console.warn(`Database ${config.name} opening!`);
      db = await initDB(config);
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(store, 'readwrite');
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
        const transaction = db.transaction(store, 'readwrite');
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
    if ( db && db.name !== database ) {
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
      const transaction = db.transaction(storeNames, 'readonly');
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

async function exportStore(store, config) { // #fixit problem with json array on toplevel on key Object.values
    const data = await readAll(store, config);
    const json = JSON.stringify(data, null, 2),
        blob = new Blob([json], { type: 'application/json' }),
        url = URL.createObjectURL(blob),
        link = document.createElement('a');
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
        blob = new Blob([json], { type: 'application/json' }),
        url = URL.createObjectURL(blob),
        link = document.createElement('a');
    link.href = url;
    link.download = `configDB-${database}.json`;
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
        blob = new Blob([json], { type: 'application/json' }),
        url = URL.createObjectURL(blob),
        link = document.createElement('a');
    link.href = url;
    link.download = `configDB-${database}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
