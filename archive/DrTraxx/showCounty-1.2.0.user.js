// ==UserScript==
// @name         [LSS] showAdress
// @version      0.1.1
// @description  zeigt die Adresse der Wache im Gebäude an
// @author       papachaotica
// @match        https://*.leitstellenspiel.de/buildings/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      nominatim.openstreetmap.org

// ==/UserScript==
/* global $ */

(async function () {
    'use strict';

    const scriptName = "showCountry"

    // buildingID
    function getBuildingID() {
        const buildingID = window.location.pathname.match(/\/buildings\/(\d+)/)?.[1];
        console.warn('Building ID = ', buildingID);
        if (!buildingID) {
            console.warn('[${scriptName}] Keine Wachen-ID gefunden.');
            return;
        }
    }
    getBuildingID();

    // building data load
    function getApiBuilding (buildingID) {
        return new Promise((resolv, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `/api/buildings/${buildingID}`,
                onload: function(response) {
                    console.log("HTTP Status:", response.status);
                    const building = JSON.parse(response.responseText);
                    console.log(building);
                    console.log(Object.entries(building));
                    response.response.Text;
                }
            });
        });
    }
})();
/*
        if (building.latitude == null || building.longitude == null) {
            console.warn('[showCountry] Keine Koordinaten vorhanden.', buildingID);
            return; }

        // adress load
        const data = await $.getJSON('https://nominatim.openstreetmap.org/reverse', {
            format: 'json',
            lat: building.latitude,
            lon: building.longitude,
            zoom: 18,
            addressdetails: 1 } );
        const address = data.address || {};
        const road = address.road || '';
        const postcode = address.postcode || '';
        const city =
              address.city ||
              address.town ||
              address.village ||
              address.municipality ||
              '';
        const state = address.state;
        $('#showCountry-labels').remove();
        const $labels = $('<span>', {
            id: 'showCountry-labels' });
        $('<span>', {
            class: 'label label-info',
            text: city,
            css: {
                cursor: 'default',
                marginLeft: '2em' }
        }).appendTo($labels);

        // state of if given
        if (state) {
            $('<span>', {
                class: 'label label-primary',
                text: state,
                css: {
                    cursor: 'default',
                    marginLeft: '1em' }
            }).appendTo($labels); }
        $('.active:first').after($labels);
    } catch (error) {
        console.error(
            '[showCountry] Fehler beim Ermitteln der Landkreises:',
            error ); }
*/
/*
        const cacheKey = `showAdress_buildingID_${buildingID}`;

// odl code


        const building = await $.getJSON("/api/buildings/" + window.location.href.replace(/\D+/g, ""));

        await $.getJSON("https://nominatim.openstreetmap.org/reverse?format=json&lat=" + building.latitude + "&lon=" + building.longitude + "&zoom=18&addressdetails=1",
                        function (data) {
            const county = data.address.county ? data.address.county : (data.address.city || data.address.town),
                  state = data.address.state,
                  html = `<span class="label label-info" style="cursor:default;margin-left:2em">${ county }</span>
                        <span class="label label-primary" style="cursor:default;margin-left:1em">${ state }</span>`;
        $(".active:first").after(html);
    });
*/