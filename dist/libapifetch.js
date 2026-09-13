'use strict'

const configDB = {
    name: "papachaotica",
    stores:
    [
        {
            name: "statistics",
            key: { keyPath: "id", autoIncrement: false },
            indices:
            [
                { name: "type", keyPath: "type", options: { unique: true } },
            ]
        },
        {
            name: "missionTypes",
            key: { keyPath: "id", autoIncrement: false },
            indices:
            [
                { name: "id", keyPath: "id", options: { unique: true } },
            ]
        },
    ]
};


async function getMissionType(missionTypeId) {
    const store = "missions";
    let mission = await readData(missionTypeId, store, configDB);
    console.log(`API: mission:`, mission);
    if (!mission) {
            console.warn(`Mission noch nicht bekannt. Lade einsätze neu ...`);
            const url = `/einsaetze.json`;
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Response fetch: ${url} ${response.status}`);
                }

                const result = await response.json();
                const items = Array.isArray(result) ? result : Object.values(result);
                for (const item of items) {
                    await saveData(item, store, configDB);
                }
                mission = await readData(missionTypeId,store, configDB);
                if (!mission) {
                    throw new Error(`Einsätze konnten nicht geladen werden!`);
                }
            } catch (error) {
                console.error('getMissionType:', error.message);
            }
    }
        return mission;
}

async function loadAdditionalInfos() {
    const url = "http://lss-manager.de"
    const lang = "de_DE"
    const api = [ /*'vehicles',*/ /*'vehicleCategories',*/ /*'buildings',*/ /*'buildingCategories',*/ /*'schoolings',*/ /*'ranks',*/ /*'pois',*/ /*'small_buildings',*/ 'einsaetze' ];

    for (const item of api) {
        try {
            console.log(`loading ${item}`);
            const response = await fetch(`${url}/${lang}/${item}`);
            if (!response.ok) {
                throw new Error(`fetch lss-manager ${item}: ${response.status}`);
            }
            const result = await response.json();
            const key = `lssm-api-${item}`;
            const date = new Date();
            const storage = {
                fetchDate: date,
                data: result
            }
            console.log(storage);

            localStorage.setItem(key, storage);

        } catch (error) {
            console.error('loadAdditionalInfos:', error.message);
        }
    }
}
