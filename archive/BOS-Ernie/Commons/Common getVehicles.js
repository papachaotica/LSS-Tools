// ==UserScript==
// @name        * Common: getVehicles
// @namespace   bos-ernie.leitstellenspiel.de
// @version     1.0.0
// @license     BSD-3-Clause
// @author      BOS-Ernie
// @description Fragt alle Fahrzeuge ab, speichert sie im SessionStorage ab und stellt eine Funktion zum Abrufen zur Verfügung
// @icon        https://www.google.com/s2/favicons?sz=64&domain=leitstellenspiel.de
// @run-at      document-idle
// @grant       none
// ==/UserScript==
 
async function getVehicles() {
  if (
    !sessionStorage.bosErnieVehicles ||
    JSON.parse(sessionStorage.bosErnieVehicles).lastUpdate < new Date().getTime() - 5 * 1000 * 60
  ) {
    return updateVehiclesCache();
  }
 
  return JSON.parse(LZString.decompress(JSON.parse(sessionStorage.bosErnieVehicles).value));
}
 
async function updateVehiclesCache() {
  let vehicles = [];
  let nextPage = null;
  let page = 0;
  let totalPages = null;
 
  do {
    page++;
 
    if (page === 1) {
      nextPage = "/api/v2/vehicles";
    }
 
    const response = await fetch(nextPage).then(response => response.json());
 
    vehicles = vehicles.concat(
      response.result.map(vehicle => ({
        id: vehicle.id,
        caption: vehicle.caption,
        building_id: vehicle.building_id,
        vehicle_type: vehicle.vehicle_type,
        assigned_personnel_count: vehicle.assigned_personnel_count,
        tractive_vehicle_id: vehicle.tractive_vehicle_id,
      })),
    );
 
    nextPage = response.paging.next_page;
 
    if (totalPages === null) {
      totalPages = Math.ceil(response.paging.count_total / 10000);
    }
  } while (nextPage);
 
  const lastUpdate = new Date();
 
  try {
    const compressedVehicleData = LZString.compress(JSON.stringify(vehicles));
 
    const uncompressedSize = JSON.stringify(vehicles).length;
    const compressedSize = compressedVehicleData.length;
 
    sessionStorage.setItem(
      "bosErnieVehicles",
      JSON.stringify({
        lastUpdate: lastUpdate.getTime(),
        value: compressedVehicleData,
        uncompressedSize: uncompressedSize,
        compressedSize: compressedSize,
      }),
    );
  } catch (e) {}
 
  return vehicles;
}
