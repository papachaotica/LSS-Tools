/*!
 * ==UserScript==
 * @name        fetch api handler
 * @version     0.17.2.261112
 * @author      papachaotica
 * @description library to handle fetch from api
 * @connect     https://api.lss-manager.de
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

'use strict'

// configs
const configDB = {
  name: "leitstellenspiel",
  stores:
    [
      {
        name: 'buildings',
        key: { keyPath: 'id', autoIncrement: false },
        indices:
          [
            { name: 'id', keyPath: 'id', options: { unique: true } },
            { name: 'type', keyPath: 'building_type', options: { unique: false } },
            { name: 'caption', keyPath: 'caption', options: { unique: false } },
            { name: 'dispatchCenter', keyPath: 'leitstelle_building_id', options: { unique: false } },
            { name: 'enabled', keyPath: 'enabled', options: { unique: false } },
            { name: 'hiring_automatic', keyPath: 'hiring_automatic', options: { unique: false } },
          ]
      },
      {
        name: 'main',
        key: { autoIncrement: false },
      },
      {
        name: 'missionTypes',
        key: { keyPath: 'id', autoIncrement: false },
        indices:
          [
            { name: 'id', keyPath: 'id', options: { unique: true } },
          ]
      },
      {
        name: 'vehicles',
        key: { keyPath: 'id', autoIncrement: false },
        indices:
          [
            { name: 'id', keyPath: 'id', options: { unique: true } },
            { name: 'type', keyPath: 'vehicle_type', options: { unique: false } },
            { name: 'building', keyPath: 'building_id', options: { unique: false } },
          ]
      },
    ]
};

// little helper
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const parkingLots = () => {
  if (!parkingLots?.containers) {
    const hooklifts = international[lang].vehicles.hooklifts;

    const containers = new Set(
      Object.entries(vehicleTypes).filter(([_, c]) =>
        c.tractiveVehicles?.some(id => hooklifts.includes(id)))
        .map(([typeId, _]) => parseInt(typeId, 10))
    );

    const trailers = new Set(
      Object.entries(vehicleTypes).filter(([typeId, v]) =>
        v.isTrailer === true && !containers.has(parseInt(typeId, 10)))
        .map(([typeId, _]) => parseInt(typeId, 10))
    );

    const vehicleLots = {};
    const trailerLots = {};
    const containerLots = {};
    const totalLots = {};

    Object.entries(buildingTypes).forEach(([bType, building]) => {
      const vehicleLot = {};
      const trailerLot = {};
      const containerLot = {};
      const totalLot = {};

      building.extensions.forEach((extension, eIndex) => {
        const givesParkingLots = extension?.givesParkingLots ?? 0;
        if (!givesParkingLots) return;

        const unlocksVehicleTypes = extension.unlocksVehicleTypes ?? [];
        let containerCount = 0;
        let trailerCount = 0;
        let classified = false;

        if (unlocksVehicleTypes.length
          && unlocksVehicleTypes.every(id => containers.has(id))) {
          containerCount = givesParkingLots;
          classified = true;
        }
        if (unlocksVehicleTypes.length
          && unlocksVehicleTypes.every(id => trailers.has(id))) {
          trailerCount = givesParkingLots;
          classified = true;
        }

        if (!classified) {
          (extension.parkingLotReservations
            ?? []).forEach(reservation => {
              if (!reservation.length) return;
              if (reservation.every(id => containers.has(id))) {
                containerCount++;
              }
            });
        }

        const vehicleCount = givesParkingLots - containerCount

        if (vehicleCount > 0) vehicleLot[eIndex] = vehicleCount;
        if (trailerCount > 0) trailerLot[eIndex] = trailerCount;
        if (containerCount > 0) containerLot[eIndex] = containerCount;
        totalLot[eIndex] = givesParkingLots;
      });
      vehicleLots[bType] = vehicleLot;
      trailerLots[bType] = trailerLot;
      totalLots[bType] = totalLot;
      containerLots[bType] = containerLot;
    });
    Object.assign(parkingLots, {
      hooklifts,
      containers,
      containerLots,
      trailers,
      trailerLots,
      totalLots,
      vehicleLots,
    });
  }
  return parkingLots;
};

function date(date) {
  const newDate = date ? new Date(date) : new Date();
  return newDate.toLocaleString('sv-SE', { timeZoneName: 'longOffset' })
    .replace(' ', 'T')
    .replace(' GMT', '')
    .replace('−', '-');
}

async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    console.log(`Trigger fetch from ${url}`);
    if (!response.ok) {
      throw new Error(`${response.url} status: ${response.status}`);
    }
    const result = await response.json();
    return result
  } catch (error) {
    console.error(`Error: ${error.message}`);
    throw error;
  };
}

// lss
async function fetchBuildings(reload = false, timestamp) {
  const store = 'buildings';
  let data = [];
  let url = '/api/v2/buildings?limit=4000';
  const fallbackUrl = '/api/buildings';
  if (reload === false && timestamp) {
    url = `${url}&from=${timestamp}`;
  }
  try {
    console.log(`Try fetch buildings from v2`);
    let pageCount = 1;
    while (url) {
      let succes = false;
      for (let retry = 1; retry <= 2; retry++) {
        try {
          const page = await fetchJSON(url);
          const nextPage =
            page.paging.next_page ? page.paging.next_page : null;
          url = nextPage;
          data.push(...page.result);
          succes = true;
          break;
        } catch (error) {
          if (retry < 2) {
            await delay(5000);
          }
        }
      }
      if (!succes) {
        throw new Error(`Error fetch ${url} after 2 try's`);
      }
    }
    console.log(`fetch building v2 page ${pageCount} passed `);
    pageCount = pageCount + 1;
  } catch (error) {
    console.log(`Fetch buildings from v2 failed, now use fallback`);
    data = await fetchJSON(fallbackUrl);
  }
  return data;
}

async function getBuildings(reload = false, indexName, range = null, matches = null) {
  const store = 'buildings';
  const maxAge = 24;
  let data = [];
  let age;
  let timestamp;
  if (reload === false || indexName === 'update') {
    const lastUpdate = await readKey('lastUpdate', store, configDB);
    timestamp = lastUpdate ? lastUpdate?.date : null;
    age = timestamp ? (new Date() - new Date(timestamp)) / (60 * 60 * 1000) : null;
  }
  if (!timestamp || age > maxAge || reload === true || indexName === 'update') {
    if (!timestamp || reload === true || age > maxAge) {
      reload = true;
      data = await fetchBuildings(reload);
    } else {
      const last = new Date(timestamp) - (maxAge * 60 * 60 * 1000)
      data = await fetchBuildings(false, new Date(last).toISOString());
    }
    const smallBuildings = await getSmallBuildings(lang);
    data = data.map(building => {
      const mapBuilding = { ...building };
      if (mapBuilding.small_building === true) {
        const map = smallBuildings[mapBuilding.building_type];
        mapBuilding.building_type = map;
      }
      return mapBuilding;
    });
    const item = { id: 'lastUpdate', date: date() };
    data.push(item);
    if (reload === true) {
      await saveClean(data, store, configDB);
    } else {
      await saveAll(data, store, configDB);
    }
  }
  if (!indexName) {
    data = await readAll(store, configDB);
  } else if (indexName === 'update') {
    return data.filter(i => i.id !== 'lastUpdate');
  } else {
    data = await queryStore(store, indexName, configDB, range, matches);
  }
  return data.filter(i => i.id !== 'lastUpdate');
}

async function getMissionType(missionTypeId) {
  try {
    const store = "missionsTypes";
    let mission = await readKey(missionTypeId, store, configDB);
    if (!mission) {
      console.log(`Reload missions ...`);
      const url = `/einsaetze.json`;
      const missions = await fetchJSON(url);
      await saveClean(missions, store, configDB);
      mission = missions[missionTypeId];
    }
  } catch (error) {
    console.error('getMissionType:', error.message);
  }
  return mission;
}

async function getVehicles(reload = false, indexName, range = null, matches = null) {
  const store = 'vehicles';
  const maxAge = 24;
  let building =
    indexName === 'building' && (typeof range === 'number')
      ? range : undefined;
  let data = [];
  let age;
  let timestamp;
  let url = building ? `/api/v2/buildings/${building}/vehicles` : `/api/v2/vehicles?limit=4000`;
  let fetch = reload === true ? true : false;

  if (reload === false || indexName === 'update') {
    const lastUpdate = await readKey('lastUpdate', store, configDB);
    timestamp = lastUpdate ? lastUpdate?.date : undefined;
    age = timestamp ? (new Date() - new Date(timestamp)) / (60 * 60 * 1000) : undefined;
    if (!timestamp || age > maxAge) {
      reload = true;
      fetch = true;
    } else if (indexName === 'update') {
      url = `${url}&from=${new Date(
        new Date(timestamp) - (maxAge * 60 * 60 * 1000)
      ).toISOString()}`;
      fetch = true;
    }
  }

  if (fetch === true) {
    const fallbackUrl = building ? `/buildings/${building}/vehicles` : `/api/vehicles`;
    let pageCount = 1;
    try {
      console.log(`Try fetch vehicles from v2`);
      while (url) {
        let succes = false;
        for (let retry = 1; retry <= 2; retry++) {
          try {
            const page = await fetchJSON(url);
            const nextPage =
              page.paging.next_page ? page.paging.next_page : null;
            url = nextPage ? nextPage : null;
            data.push(...page.result);
            succes = true;
            break;
          } catch (error) {
            if (retry < 2) {
              await delay(5000);
            }
          }
        }
        if (!succes) {
          throw new Error(`Error fetch ${url} after 2 try's`);
        }
      }
      console.log(`Try fetch vehicles v2 page ${pageCount} passed`);
      pageCount = pageCount + 1;
    } catch (error) {
      console.log(`Fetch vehicles from v2 failed, at page ${pageCount} now use fallback`);
      data = await fetchJSON(fallbackUrl);
    }
    if (!building) {
      const item = { id: 'lastUpdate', date: date() };
      data.push(item);
    }
    if (reload === true && !building) {
      await saveClean(data, store, configDB);
    } else {
      await saveAll(data, store, configDB);
    }
    if (indexName && range) {
      const field = keyPath(store, indexName);
      const keyRange = range instanceof IDBKeyRange
        ? range : IDBKeyRange.only(range);
      data = data.filter(i =>
        i.id !== 'lastUpdate' && keyRange.includes(i[field])
      );
    }
    if (matches) {
      data = data.filter(matches);
    }

  } else {
    if (!indexName) {
      data = await readAll(store, configDB);
    } else {
      data = await queryStore(store, indexName, configDB, range, matches);
    }
  }

  return data.filter(i => i.id !== 'lastUpdate');
}

// lssm

const lssm = 'https://api.lss-manager.de';

async function getBuildingTypes(lang) {
  const store = 'main';
  const key = 'buildingTypes';
  const url = `${lssm}/${lang}/buildings`;
  let data = await readKey(key, store, configDB);
  const lastUpdate = data?.lastUpdate ?? null;
  const maxAge = 3;
  const age =
    lastUpdate ? (new Date() - new Date(lastUpdate)) / (24 * 60 * 60 * 1000) : null;
  if (!lastUpdate || age > maxAge) {
    const result = await fetchJSON(url);
    data = { lastUpdate: date(), types: result };
    await saveKey(data, store, configDB, key);
  }
  return data.types;
}

async function getBuildingCategories(lang) {
  const store = 'main';
  const key = 'buildingCategories';
  const url = `${lssm}/${lang}/buildingCategories`;
  let data = await readKey(key, store, configDB);
  const lastUpdate = data ? data?.lastUpdate : null;
  const maxAge = 6;
  const age =
    lastUpdate ? (new Date() - new Date(lastUpdate)) / (24 * 60 * 60 * 1000) : null;
  if (!lastUpdate || age > maxAge) {
    const result = await fetchJSON(url);
    data = { lastUpdate: date(), buildingCategories: result };
    await saveKey(data, store, configDB, key);
  }
  return data.buildingCategories;
}

async function getSmallBuildings(lang) {
  const store = 'main';
  const key = 'smallBuildings';
  const url = `${lssm}/${lang}/small_buildings`;
  let data = await readKey(key, store, configDB);
  const lastUpdate = data ? data?.lastUpdate : null;
  const maxAge = new Date('2026-10-15T00:00');
  const age = lastUpdate ? (new Date(lastUpdate)) : null;
  if (!lastUpdate || age < maxAge) {
    const result = await fetchJSON(url);
    data = { lastUpdate: date(), mapping: result };
    await saveKey(data, store, configDB, key);
  }
  return data.mapping;
}


async function getVehicleTypes(lang) {
  const store = "main";
  const key = 'vehicleTypes';
  let url = `${lssm}/${lang}/vehicles`
  let data = await readKey(key, store, configDB);
  const lastUpdate = data ? data.lastUpdate ? data.lastUpdate : null : null;
  const maxAge = 3;
  const age =
    lastUpdate ? (new Date() - new Date(lastUpdate)) / (24 * 60 * 60 * 1000) : null;
  if (!lastUpdate || age > maxAge) {
    const result = await fetchJSON(url);
    data = { lastUpdate: date(), types: result };
    await saveKey(data, store, configDB, key);
  }
  return data.types;
}

async function getVehicleCategories(lang) {
  const store = 'main';
  const key = 'vehicleCategories';
  const url = `${lssm}/${lang}/vehicleCategories`;
  let data = await readKey(key, store, configDB);
  const lastUpdate = data ? data?.lastUpdate : null;
  const maxAge = 6;
  const age =
    lastUpdate ? (new Date() - new Date(lastUpdate)) / (24 * 60 * 60 * 1000) : null;
  if (!lastUpdate || age > maxAge) {
    const result = await fetchJSON(url);
    data = { lastUpdate: date(), vehicleCategories: result };
    await saveKey(data, store, configDB, key);
  }
  return data.vehicleCategories;
}