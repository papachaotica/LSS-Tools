// ==UserScript==
// @name        * Common: getBuildings
// @namespace   bos-ernie.leitstellenspiel.de
// @version     1.0.0
// @license     BSD-3-Clause
// @author      BOS-Ernie
// @description Fragt alle Gebäude ab, speichert sie im SessionStorage ab und stellt eine Funktion zum Abrufen zur Verfügung
// @icon        https://www.google.com/s2/favicons?sz=64&domain=leitstellenspiel.de
// @run-at      document-idle
// @grant       none
// ==/UserScript==
 
async function getBuildings() {
  if (
    !sessionStorage.bosErnieBuildings ||
    JSON.parse(sessionStorage.bosErnieBuildings).lastUpdate < new Date().getTime() - 5 * 1000 * 60
  ) {
    return updateBuildingsCache();
  }
  return JSON.parse(sessionStorage.bosErnieBuildings).value;
}
 
async function updateBuildingsCache() {
  const buildings = await fetch("/api/buildings.json").then(response => response.json());
 
  try {
    sessionStorage.setItem("bosErnieBuildings", JSON.stringify({ lastUpdate: new Date().getTime(), value: buildings }));
  } catch (e) {
    return buildings;
  }
}
