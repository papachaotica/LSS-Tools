// ==UserScript==
// @name        * Common: IndexedDB
// @namespace   bos-ernie.leitstellenspiel.de
// @version     1.1.0
// @license     BSD-3-Clause
// @author      BOS-Ernie
// @description Stellt Funktionen zum Speichern und Abrufen von Daten in der IndexedDB bereit
// @icon        https://www.google.com/s2/favicons?sz=64&domain=leitstellenspiel.de
// @run-at      document-idle
// @grant       none
// ==/UserScript==
 
const databaseName = "BosErnie";
const objectStoreName = "GebäudeUndFahrzeugVerwalter";
 
function openDB() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, 2);
 
    request.onerror = () => {
      reject("Failed to open the database");
    };
 
    request.onsuccess = event => {
      const db = event.target.result;
      resolve(db);
    };
 
    request.onupgradeneeded = event => {
      const db = event.target.result;
 
      if (!db.objectStoreNames.contains(objectStoreName)) {
        const objectStore = db.createObjectStore(objectStoreName);
        objectStore.createIndex("IndexName", "propertyName", { unique: false });
      }
    };
  });
}
 
async function storeData(data, key) {
  const db = await openDB();
 
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([objectStoreName], "readwrite");
    const objectStore = transaction.objectStore(objectStoreName);
 
    const request = objectStore.put(data, key);
 
    request.onsuccess = () => {
      resolve("Data stored successfully");
    };
 
    request.onerror = () => {
      reject("Failed to store data");
    };
  });
}
 
async function retrieveData(key) {
  const db = await openDB();
 
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([objectStoreName], "readonly");
    const objectStore = transaction.objectStore(objectStoreName);
 
    const request = objectStore.get(key);
 
    request.onsuccess = event => {
      const data = event.target.result;
      resolve(data);
    };
 
    request.onerror = () => {
      reject("Failed to retrieve data");
    };
  });
}
