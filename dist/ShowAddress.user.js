// ==UserScript==
// @name         [LSS] showAddress
// @version      0.7.33.202608022100
// @description  zeigt die Adresse der Wache im Gebäude an
// @license      AGPL-3.0-or-later
// @author       papachaotica
// @match        https://*.leitstellenspiel.de/buildings/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      nominatim.openstreetmap.org
// @updateURL    http://raw.github.com/papachaotica/LSS-Tools/dev/dist/ShowAddress.user.js
// ==/UserScript==

(async function () {
    'use strict';

    const scriptName = 'showAddress';

    /* lib/getBuildingID.js */
    // building ID aus der Website ziehen
    const buildingID = getBuildingID();
    function getBuildingID () {
        const ID = window.location.pathname.match(/\/buildings\/(\d+)/)?.[1];
        // console.warn(`[${scriptName}] Building ID = , ${ID}`);
        if (!ID) {
            console.warn(`[${scriptName}] Keine Wachen-ID gefunden.`);
            return;
        };
        return(ID);
        console.log(`[${scriptName}] - Building ID: ${ID}`);
    }

    /* lib/fetchLssApiBuilding.js */
    // building data load
    const building = await fetchLssApiBuilding(buildingID);
    function fetchLssApiBuilding (buildingID) {
        return new Promise((resolv, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `/api/buildings/${buildingID}`,
                onerror: error => { console.warn(`[${scriptName}] - `, error) },
                onload:
                function(response) {
                    const data = JSON.parse(response.responseText);
                    resolv(data);
                    console.log(`[${scriptName}] - API: ${data}`);
                }
            });
        });
        console.log(`[${scriptName}] - building: ${building}`);
    }

    /* lib/fetchOsmBuildingData.js */
    // fetch data from openstreetmap.org
    function fetchOsmBuildingData (building) {
        const latlon = "&lat=" + building.latitude + "&lon=" + building.longitude
        return new Promise((resolv, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: "https://nominatim.openstreetmap.org/reverse?format=json" + latlon,
                onerror: error => { console.warn(`[${scriptName}] - `, error) },
                onload:
                function(response) {
                    const data = JSON.parse(response.responseText);
                    resolv(data);
                    console.log(`[${scriptName}] - OSM: ${data}`);
                }
            });
        });
    }


    /* lib/setBuildingData.js */
    // set data from api building and some data from openstreetmap for cache
    function setBuildingCacheData (building, osm) {
        const buildingData = { 
            lon: building.longitude, 
            lat: building.latitude,
            road: osm.address.road,
            postcode: osm.address.postcode,
            city: osm.address.city ||
            osm.address.town ||
            osm.address.village ||
            osm.address.municipality || '',
            county: osm.address.county,
            state: osm.address.state
        }
        GM_setValue(buildingID, buildingData)
        console.log(`[${scriptName}] - buildingData: ${buildingData}`);
    }

    /* lib/getBuildingData.js */
    // get data for building from cache and check cache
    let cache = GM_getValue(buildingID, {});
    if (cache.lon !== building.longitude || cache.lat !== building.latitude) {
        const osm = await fetchOsmBuildingData (building);
        setBuildingCacheData (building, osm);
        cache = GM_getValue(buildingID, {});
    }
    console.log(`[${scriptName}] - cache: ${cache}`);

    // ui set address in website
    function ui (cache) {
        const state = cache.state,
            county = cache.county ? ` - ${cache.county}` : '',
            city = cache.city,
            postcode = cache.postcode,
            road = cache.road,
            html = `<span class="label label-info" style="cursor:default;margin-left:2em">${ road }</span>
                   <span class="label label-primary" style="cursor:default;margin-left:1em">${ postcode } ${ city }${ county }</span>
                   <span class="label label-info" style="cursor:default;margin-left:2em">${ state }</span>`;
        $(".active:first").after(html);
    }
    ui(cache);
    console.log(`[${scriptName}] - works`);
})();
