/*!
 * ==UserScript==
 * @name        fetch api handler
 * @version     0.15.4.261012
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

const configDB = {
    name: "leitstellenspiel",
    stores:
    [
        {
            name: "buildings",
            key: { keyPath: "id", autoIncrement: false },
            indices:
            [
                { name: "id", keyPath: "id", options: { unique: true } },
                { name: "type", keyPath: "building_type", options: { unique: false } },
                { name: "caption", keyPath: "caption", options: { unique: false } },
                { name: "dispatchCenter", keyPath: "leitstelle_building_id", options: { unique: false } },
                { name: "enabled", keyPath: "enabled", options: { unique: false } },
                { name: "hiring_automatic", keyPath: "hiring_automatic", options: { unique: false } },
            ]
        },
        {
            name: "main",
            key: { autoIncrement: false },
        },
        {
            name: "missionTypes",
            key: { keyPath: "id", autoIncrement: false },
            indices:
            [
                { name: "id", keyPath: "id", options: { unique: true } },
            ]
        },
        {
            name: "vehicles",
            key: { keyPath: "id", autoIncrement: false },
            indices:
            [
                { name: "id", keyPath: "id", options: { unique: true } },
                { name: "type", keyPath: "vehicle_type", options: { unique: false } },
                { name: "building", keyPath: "building_id", options: { unique: false } },
            ]
        },
    ]
};

const lssm = "https://api.lss-manager.de";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const now = () =>
    new Date().toLocaleString('sv-SE', { timeZoneName: 'longOffset' })
        .replace(' ', 'T')
        .replace(' GMT', '');

async function fetchJSON(url) {
    try {
        const response = await fetch(url);
        console.log(`Trigger fetch from ${url}`);
        if (!response.ok) {
            throw new Error(`Error: ${response.url} status: ${response.status}`);
        }
        const result = await response.json();
        return result
    } catch (error) {
        console.error(`Error: ${error.message}`);
        throw error;
    };
}

async function fetchBuildings(reload = false, timestamp) {
    const store = "buildings";
    let data = [];
    let url = "/api/v2/buildings";
    const fallbackUrl = "/api/buildings"
    if ( reload === false && timestamp ) {
        url = `${url}?from=${timestamp}`;
    }
    try {
        console.log(`Try fetch buildings from v2`)
        while (url) {
            let succes = false;
            for ( let retry = 1; retry <= 2; retry++ ) {
                try {
                    const page = await fetchJSON(url);
                    const nextPage = page.paging.next_page ? page.paging.next_page : null;
                        url = nextPage;
                    data.push(...page.result);
                    succes = true;
                    break;
                } catch (error) {
                    if ( retry < 2 ) {
                        await delay(5000);
                    }
                }
            }
            if (!succes) {
                throw new Error(`Error fetch ${url} after 2 try's`);
            }
        }
        console.log(`fetch building v2 passed `)
    } catch (error) {
        console.log(`Fetch buildings from v2 failed, now use fallback`);
        data = await fetchJSON(fallbackUrl);
    }
    return data;
}

async function fetchVehicles(reload = false, timestamp) {
    const store = "vehicles"
    let data = [];
    let url = "/api/v2/vehicles"
    const fallbackUrl = "/api/vehicles"
    if ( reload === false && timestamp ) {
        url = `${url}?from=${timestamp}`;
    }
    try {
        console.log(`Try fetch vehicles from v2`)
        while (url) {
            let succes = false;
            for ( let retry = 1; retry <= 2; retry++ ) {
                try {
                    const page = await fetchJSON(url);
                    const nextPage = page.paging.next_page ? page.paging.next_page : null;
                    url = nextPage ? nextPage : null;
                    data.push(...page.result);
                    succes = true;
                    break;
                } catch (error) {
                    if ( retry < 2 ) {
                        await delay(5000);
                    }
                }
            }
            if (!succes) {
                throw new Error(`Error fetch ${url} after 2 try's`);
            }
        }
        console.log(`Try fetch vehicles v2 passed`)
    } catch (error) {
        console.log(`Fetch vehicles from v2 failed, now use fallback`);
        data = await fetchJSON(fallbackUrl);
    }
    return data;
}

async function getBuildings(reload = false, indexName, range = null) {
    const store = "buildings";
        const maxAge = 24;
    let data = [];
    let age;
    let timestamp;
    if (reload === false) {
        const lastUpdate = await readKey("lastUpdate", store, configDB);
        timestamp = lastUpdate ? lastUpdate.date ? lastUpdate.date : null : null;
        age = timestamp ? ( new Date() - new Date(timestamp) ) / ( 60 * 60 * 1000 ) : null;
    }
    if (!timestamp || age > maxAge || reload === true) {
        if (!timestamp || reload === true) {
            reload = true;
            data = await fetchBuildings(reload);
        } else if ( age > maxAge ) {
            data = await fetchBuildings(false, timestamp);
        }
        const smallBuildings = await getSmallBuildings(lang);
        data = data.map(building => {
            const mapBuilding = { ...building };
            if (mapBuilding.small_building === true) {
                const map = smallBuildings[mapBuilding.building_type];
                mapBuilding.building_type = map
            }
            return mapBuilding;
        });
        const item = { id: "lastUpdate", date: now() };
        data.push(item);
        if ( reload === true ) {
            await saveClean(data, store, configDB);
            return data;
        } else {
            await saveAll(data, store, configDB);
        }
    }
    if (range === null && !indexName) {
        return await readAll(store, configDB);
    } else {
        return await queryStore(store, indexName, configDB, range);
    }
}

async function getBuildingTypes(lang) {
    const store = "main";
    const key = "buildingTypes";
    const url = `${lssm}/${lang}/buildings`;
    let data = await readKey(key, store, configDB);
    const lastUpdate = data ? data.lastUpdate ? data.lastUpdate : null : null;
    const maxAge = 3;
    const age = lastUpdate ? ( new Date() - new Date(lastUpdate) ) / ( 24 * 60 * 60 * 1000 ) : null;
    if (!lastUpdate || age > maxAge ) {
        const result = await fetchJSON(url);
        data = { lastUpdate: now(), types: result };
        await saveKey(data, store, configDB, key);
    }
    return data.types;
}

async function getSmallBuildings(lang) {
    const store = "main";
    const key = "smallBuildings";
    const url = `${lssm}/${lang}/small_buildings`;
    let data = await readKey(key, store, configDB);
    const lastUpdate = data ? data.lastUpdate ? data.lastUpdate : null : null;
    const maxAge = new Date("2026-10-15T00:00");
    const age = lastUpdate ? ( new Date(lastUpdate) ) : null;
    if (!lastUpdate || age < maxAge) {
        const result = await fetchJSON(url);
        data = { lastUpdate: now(), mapping: result };
        await saveKey(data, store, configDB, key);
    }
    return data.mapping;
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

async function getVehicles(reload = false, indexName, range = null) {
    const store = "vehicles";
    const maxAge = 24;
    let data = [];
    let age;
    let timestamp;
    if (reload === false) {
        const lastUpdate = await readKey("lastUpdate", store, configDB);
        timestamp = lastUpdate ? lastUpdate.date ? lastUpdate.date : null : null;
        age = timestamp ? ( new Date() - new Date(timestamp) ) / ( 60 * 60 * 1000 ) : null;
    }
    if (!timestamp || age > maxAge || reload === true) {
        console.log(`Timestamp vehicless not ok fetch ${timestamp}`);
        if (!timestamp || reload === true) {
            reload = true;
            data = await fetchVehicles(reload);
        } else if ( age > maxAge ) {
            data = await fetchVehicles(false, timestamp);
        }
        const item = { id: "lastUpdate", date: now() };
        data.push(item);
        if ( reload === true ) {
            await saveClean(data, store, configDB);
            return data;
        } else {
            await saveAll(data, store, configDB);
        }
    }
    if (range === null && !indexName) {
        return await readAll(store, configDB);
    } else {
        return await queryStore(store, indexName, configDB, range);
    }
}

async function getVehicleTypes(lang) {
    const store = "main";
    const key = "vehicleTypes";
    let url = `${lssm}/${lang}/vehicles`
    let data = await readKey(key, store, configDB);
    const lastUpdate = data ? data.lastUpdate ? data.lastUpdate : null : null;
    const maxAge = 3;
    const age = lastUpdate ? ( new Date() - new Date(lastUpdate) ) / ( 24 * 60 * 60 * 1000 ) : null;
    if (!lastUpdate || age > maxAge ) {
        const result = await fetchJSON(url);
        data = { lastUpdate: now(), types: result };
        await saveKey(data, store, configDB, key);
    }
    return data.types;
}
