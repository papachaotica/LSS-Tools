// ==UserScript==
// @name            Gebietsleiter - Zentrale Leitstelle
// @namespace       papachaotica.leitstellenspiel.de
// @version         0.23.2.261105
// @description:de  Zentrale Verwaltung aller Gebäude und Fahrzeuge
// @author          papachaotica
// @homepage        https://github.com/papachaotica
// @match           https://leitstellenspiel.de
// @match           https://www.leitstellenspiel.de
// @exclude-match   https://forum.leitstellenspiel.de
// @require         https://raw.githubusercontent.com/papachaotica/LSS-Tools/dev/lib/indexedDB.js?v261105
// @require         https://raw.githubusercontent.com/papachaotica/LSS-Tools/dev/lib/api-fetch-database-handler.js?v261105
// @run-at          document-idle
// @license         AGPL-3.0-or-later
// ==/UserScript==

/*
 * [x] modal bauen
 * [x] Tab flexible hinzufügen
 * [x] Gebäudetabelle rendern mit Erweiterungen
 * [x] wechsel auf html sting
 * [x] Wachenbaupläne importieren
 * [x] Blueprint auf regex zuordnen oder Default setzen
 * [x] Blueprint auf Erweiterungen anwenden
 * [x] Manuelle Profil Zuordnung und persistent speichern
 * [x] Personal auf Ist/soll und personalSetpoint farblich markieren
 * [x] Tabelsorter für alt-neu(ID), Wachentyp, Wachennamen
 * [x] Leitstelle erkennen
 * [x] Erweiterungen aktivieren ermöglichen
 * [x] Lagergröße und verfügbar anzeigen
 * [x] Erweiterungen kaufen ermöglichen
 * [x] Gekaufte Erweiterung nach erfolgreicher AJAX-Antwort in IndexedDB speichern
 * [x] Schreibweise des title-Attributs am Filter korrigieren
 * [x] AJAX-URL-Match und Gebäude vor dem Zugriff prüfen
 * [x] Ereignisparameter im Menü-Click-Handler explizit übernehmen
 * [x] Kauf gegen Doppelklick absichern und Tabelle nach Erfolg aktualisieren
 * [x] change-Listener der Gebäudetabelle nur einmal registrieren
 * [x] Auswahl dropdown auf Leitstelle Übergabe an renderTableBuildings
 * [p] Stellplätze ermitteln und verfügbare anzeigen
 * [p] renderTableVehicles (Design ausarbeiten)
 * [_] manuell Abweichungen vom Profi freigeben mit Gültigkeitsverlust bei nächster Profiländerung
 * [_] Fahrzeuge Leitstelle zuordnen und Änderungen erkennen
 * [_] geplante Fahrzeuge vergleichen und Abweichungen anzeigen
 * [_] Template Tabelle rendern
 * [_] Link zu CentralSettings bauen (Zugfahrzeug Zuordnung, DGL ELW GRTW Einstellungen)
 * [_] Equipment auf Machbarkeit prüfen
 * [x] Speichern-Buttontext mit textContent statt append setzen
 * [_] Zahlenformatierung für alle unterstützten Spielsprachen abfangen - later
 * [_] Werte in Tabellen-HTML vor dem Einfügen escapen
 * [_] storage_upgrades vor dem Zugriff prüfen
 */

const defaults = {
  '0': {
    name: "Feuerwache",
    personnelSetPoint: 200,
    extensions: [],
  },
  '1': {
    name: "Feuerwehrschule",
    extensions: [
      { id: 0, name: "Weiterer Klassenraum" },
      { id: 1, name: "Weiterer Klassenraum" },
      { id: 2, name: "Weiterer Klassenraum" },
    ],
  },
  '2': {
    name: "Rettungswache",
    personnelSetPoint: 60,
    extensions: [],
  },
  '3': {
    name: "Rettungsschule",
    extensions: [
      { id: 0, name: "Weiterer Klassenraum" },
      { id: 1, name: "Weiterer Klassenraum" },
      { id: 2, name: "Weiterer Klassenraum" },
    ],
  },
  '4': {
    name: "Krankenhaus",
    extensions: [
      { id: 0, name: "Allgemeine Innere" },
      { id: 1, name: "Allgemeine Chirurgie" },
      { id: 2, name: "Gynäkologie" },
      { id: 3, name: "Urologie" },
      { id: 4, name: "Unfallchirurgie" },
      { id: 5, name: "Neurologie" },
      { id: 6, name: "Neurochirurgie" },
      { id: 7, name: "Kardiologie" },
      { id: 8, name: "Kardiochirurgie" },
    ],
    targetLevel: 20,
  },
  '8': {
    name: "Polizeischule",
    extensions: [
      { id: 0, name: "Weiterer Klassenraum" },
      { id: 1, name: "Weiterer Klassenraum" },
      { id: 2, name: "Weiterer Klassenraum" },
    ],
  },
  '10': {
    name: "THW Bundesschule",
    extensions: [
      { id: 0, name: "Weiterer Klassenraum" },
      { id: 1, name: "Weiterer Klassenraum" },
      { id: 2, name: "Weiterer Klassenraum" },
    ],
  },
  '27': {
    name: "Schule für Seefahrt und Seenotrettung",
    extensions: [
      { id: 0, name: "Weiterer Klassenraum" },
      { id: 1, name: "Weiterer Klassenraum" },
      { id: 2, name: "Weiterer Klassenraum" },
    ],
  },
};

//////////////////////////////////////////////////////////////////////////////

'use strict'

const prefix = "gl";
const scriptName = "Gebietsleitung - Zentrale Leitstelle";
const version = "0.23.2.261105";

const lang = I18n.locale ? I18n.locale : 'de_DE';
const international = {
  'de_DE': {
    langcode: 'de-DE',
    vehicles:
    {
      hooklifts: [46,],
    },
  },
};

let assignments;
let buildings;
let buildingCategories;
let buildingTypes;
let dispatchCenters;
let templates;
let vehicles;
let vehicleTypes;
let vehiclesByBuilding;

function countDuplicates(data) {
  const array = Array.isArray(data)
    ? data
    : Object.values(data);
  const counts = array.reduce((acc, index) => {
    if (!index) return acc;
    const item = index.caption ?? index.name;
    if ((item === undefined) || (item === null)) return acc;
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {})
  return counts;
}

async function showLastUpdate(store) {
  let lastUpdate = await readKey('lastUpdate', store, configDB);
  if (!lastUpdate) {
    if (store === 'buildings') {
      await getBuildings(true);
    } else if (store === 'vehicles') {
      await getVehicles(true);
    }
    lastUpdate = await readKey('lastUpdate', store, configDB);
  }
  lastUpdate = lastUpdate.date;
  lastUpdate = new Date(lastUpdate).toLocaleString();
  return lastUpdate;
}

function profileSelector(building) {
  const profiles = templates.filter(profile =>
    profile.buildingTypeId === building.building_type
  );
  let select = undefined;
  let defaultProfile = false;
  let match = [];
  if (assignments[building.id]) {
    select = profiles.find(profile =>
      profile.id === assignments[building.id]);
  } else {
    match = profiles.filter(profile => {
      return typeof profile.buildingNameRegexPattern === 'string' &&
        profile.buildingNameRegexPattern.trim() !== '' &&
        new RegExp(
          profile.buildingNameRegexPattern
        ).test(building.caption);
    });
  }
  if (match.length === 1) {
    select = match[0];
  } else if (match.length === 0 && profiles.length === 1) {
    select = profiles[0];
  }
  if (!select) {
    select = defaults[building.building_type];
    if (select) {
      select.defaultProfile = true;
    } else {
      select = {
        id: 'none',
        extensions: [],
        vehicles: [],
      }
    }
  }
  return { select, profiles };
}

async function renderVehicleRows(tbody, id) {
  /* eslint-disabel */ /*
  <thead>`;
     <tr class="tablesorter-headerRow" role="row" style='display: table; width: 100%; table-layout: fixed;'>`;
         <th class='text-center' style='vertical-align: middle; width: 175px;'>Fahrzeugtyp</th>`;             // btn-xs disabled vehicleType.caption
         <th class='sorter-false' style='vertical-align: middle; width: 40ch;'>Fahrzeug</th>`;                //                 vehicle.caption truck-icon     icon onfle if trailer has tractivVehicle
         <th class='sorter-false' style='vertical-align: middle; width: 40ch;'>Anhänger</th>`;                //    trailer-icon vehicle.caption                icon only if tractivVehicle
         <th class='text-center' style='vertical-align: middle; width: 175px;'></th>`;                        // btn block btn-xs -- link to vehicel-settings personal-settings rebuild
         <th class='text-center sorter-false' style='vertical-align: middle; width: 3ch;'>FMS</th>`;          // only if (fms_real === 6) !!! check thats is black
         <th class='sorter-false text-center' style='vertical-align: middle; width: 11ch;'>Besatzung</th>`;   // assigned_personnel_count (if (max_personnel_override !== maxPersonnel)) else maxPersonnel
      </tr>`;
  </thead>`
  fms = vehicle.fms_real === 6 ? `<span title="Nicht einsatzbereit" class="building_list_fms building_list_fms_6">6</span>` : '';
  truckIcon =   `<img src="/images/trailer_vehicle.png" width="18" height="18">`;
  trailerIcon = `<img src="/images/trailer_2.png" width="18" height="18">`;
  vehicleType = `<a class="btn btn-default btn-xs disabled">${vehicleTypes[vehicle_type].capion}</a>`;
  assStaff    = vehicle.assigned_personnel_count;
  maxStaff    = vehicle.max_personnel_override ?? vehicleTypes[vehicle_type].maxPersonnel;
  caption = building.tag.morVehicles === true ? text-info

  if (assStaff !== maxStaff) building.tag.vehicleAssigned = true;

                                                              EXAMPLE TABLE
(hidden)                         |Fahrzeugtyp           |  Name                           | Anhänger                  |  FMS | Besatzung
-------------------------------------------------------------------------------------------------------------------------------x--------
(data-line=${rc = 0})            |${vehicleType}        |if (tractive_vehicle_id === id) {|if (tractice === id) {     |${fms}| if (maxStaff > 0) ${assStaff} / ${maxStaff}
(data-vehicle-id = ${vehicle.id})|if (tractive === id) {|  ${caption} ${truckIcon}        |  `<br>`                   |      |
                               |  `<br>`              |} else {                         |  ${trailerIcon} ${caption}|${fms}|
                               |  ${vehicleType}      |  ${caption}                     |       ${trailerIcon}      |      |
                               |}                     |}                                | }                         |      |
----------------------------------------------------------------------------------------------------------------------------------------
(data-line=${rc++})              | HLF 20               | Florian Stuttgart 1 46 1        |                           |      | 9 / 9
----------------------------------------------------------------------------------------------------------------------------------------
^^                              | GW-L2                | Florian Stuttgart 1 33 1 {icon} |                           | {fms}| 6 / 6
                               | Anh Schlauch         |                                 | {icon} Stg 1 Anh Schlau   | {fms}|
----------------------------------------------------------------------------------------------------------------------------------------
                               | Anh Sonderlöchmittel |                                 | Stg 1 Anh SLM             |      |
----------------------------------------------------------------------------------------------------------------------------------------
tab.inventory.less.forEac       | <a class="btn btn-waning btn-xs">${vehicleTypes[vehicle_type].capion} href='/buildings/${building.id}/vehicle/${building.id}/${type_id}/credits'<!-- prüfen ob es auch ohne -- ?building=${building.id} &return_tab=fire_engine --></a>`
  /* eslint-enable */

  tbody.replaceChildren();

  const building = buildings.find(b => b.id === id);
  const vehiclesThisBuilding = vehiclesByBuilding.get(id) || [];

  if (vehiclesThisBuilding.length === 0) {
    const row = ` <tr><td colspan="6" class="text-center" style="padding: 15px;">
                            <h3>Keine Fahrzeuge an dieser Wache.</h3>
                        </td></tr>`;
    $(tbody).append(row);
    return;
  }

  const tags = building?.tags
  tags.fms6 = false;

  const getCaption = (vehicle) => {
    const typeId = vehicle.vehicle_type;
    return vehicleTypes[typeId]?.caption;
  };

  const sortedByType = [...vehiclesThisBuilding].sort((a, b) => {
    const captionA = getCaption(a) || '';
    const captionB = getCaption(b) || '';
    return captionA.localeCompare(captionB);
  });

  const trailers = sortedByType.filter(v => vehicleTypes[v.vehicle_type].isTrailer === true);
  const trucks = sortedByType.filter(v => vehicleTypes[v.vehicle_type]?.isTrailer !== true);

  const sortedVehicles = [...trucks, ...trailers];

  // Icons definieren
  const truckIcon = `<img src="/images/trailer_vehicle.png" width="18" height="18" style="margin-left: 5px;" title="Zugfahrzeug">`;
  const trailerIcon = `<img src="/images/trailer_2.png" width="18" height="18" style="margin-right: 5px;" title="Anhänger">`;

  let rc = 0;
  sortedVehicles.forEach(vehicle => {
    const vTypeId = vehicle.vehicle_type;
    const vType = vehicleTypes[vTypeId];

    const isTrailer = vType?.isTrailer ?? false;
    const isConnect = sortedVehicles.some(t => t.id === vehicle.tractive_vehicle_id);
    const hasTrailer = sortedVehicles.some(t => t.tractive_vehicle_id === vehicle.id);

    // Cell vehicleType
    let row;
    row = `<tr data-line="${rc++}" data-vehicle-id="${vehicle.id}" data-building-id='${building.id}' style="display: table; width: 100%; table-layout: fixed;">`;
    row += `<td class="text-right" style="width: 175px;">`;
    row += `<a class="btn btn-default btn-xs disabled">${vType.caption}</a>`;
    row += `</td>`;


    // Cell vehicle caption and trailer caption
    let nameCell = '';
    let trailerCell = '';
    if (!isTrailer) {
      nameCell = hasTrailer ? `${vehicle.caption}${truckIcon}` : `${vehicle.caption}`;
    }
    if (isTrailer) {
      trailerCell = isConnect ? `${trailerIcon}${vehicle.caption}` : `${vehicle.caption}`;
    }
    row += `<td style="width: 40ch;">${nameCell}</td>`
    row += `<td style="width: 40ch;">${trailerCell}</td>`
    /*
<tr class="tablesorter-headerRow" role="row" style='display: table; width: 100%; table-layout: fixed;'>`;
+  586         panel += `        <th class='text-center' style='vertical-align: middle; width: 175px;'>Fahrzeugtyp</th>`;
+  587         panel += `        <th class='sorter-false' style='vertical-align: middle; width: 40ch;'>Fahrzeug</th>`;
+  588         panel += `        <th class='sorter-false' style='vertical-align: middle; width: 40ch;'>Anhänger</th>`;
+  589         panel += `        <th class='text-center' style='vertical-align: middle; width: 175px;'></th>`;
+  590         panel += `        <th class='text-center sorter-false' style='vertical-align: middle; width: 3ch;'>FMS</th>`;
+  591         panel += `        <th class='sorter-false text-center' style='vertical-align: middle; width: 11ch;'>Besatzung</th>`;
*/

    // Cell buttons
    row += `<td class="text-center" style="width: 175px;">`
    row += `<div class="btn-group">`;
    row += `<a class='lightbox-open btn btn-default btn-xs glyphicon glyphicon-cog' href="/vehicles/${vehicle.id}/edit" title="Fahrzeug bearbeiten"></a>`;
    if (!isTrailer) {
      row += `<a class='lightbox-open btn btn-default btn-xs glyphicon glyphicon-user' href="/vehicles/${vehicle.id}/zuweisung" title="Personal zuweisen"></a>`;
    }
    row += `</div>`;
    row += `</td>`;


    // Cell rsm
    row += `<td class="text-center" style="vertical-align: middle; width: 3ch;">`;
    if (vehicle.fms_real === 6) {
      row += `<a title="Nicht einsatzbereit" class="building_list_fms building_list_fms_6" data-remote='true' href='/vehicles/${vehicle.id}/set_fms/2'><span>6</span></a>`; // style="background-color: #000; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold;"
      tags.fms6 = true
    }
    row += `</td>`;

    // Cell empty for spacing
    row += `<td></td>`;

    // Cell staff
    const assStaff = vehicle.assigned_personnel_count ?? 0;
    const maxStaff = vehicle.max_personnel_override ?? vType.maxPersonnel;

    if (maxStaff > 0) {
      console.log(`vehicle ${vehicle.id} assigned_personnel_count: ${assStaff}, max_personnel_override: ${vehicle.max_personnel_override}, vType.maxPersonnel: ${vType.maxPersonnel}`);
      if (assStaff !== maxStaff) {
        row += `<td class='text-warning text-center' style='width: 11ch;'>`
      } else {
        row += `<td class="text-center" style='width: 11ch;'>`;
      }
      row += `${assStaff} / ${maxStaff}`;
    } else {
      row += `<td class="text-center" style='width: 11ch;'>`;
    }
    row += `</td>`;
    row += `</tr>`;


    $(tbody).append(row);
  });

  // 3. Inventar-Check gegen die Vorlage
  const less = tags.inventory?.less;
  if (!less) return;
  Object.entries(less).forEach(([typeId, quantity]) => {
    const type = vehicleTypes[typeId];
    for (let i = 0; i < quantity; i++) {
      let row = '';
      row += `<tr data-line='${rc++}' style="display: table; width: 100%; table-layout: fixed; opacity: 0.85;">`;
      row += `<td class="text-center" style="vertical-align: middle; width: 175px;">`;
      // if (unlockt)
      row += `<a class="btn btn-default btn-xs disabled">${type.caption}</a>`;
      row += `</td>`;
      row += `<td style="width: 40ch;" class="text-center text-warning">`;
      row += `<a  data-remote='true 'href="/buildings/${building.id}/vehicle/${building.id}/${typeId}/credits">`;
      row += `<em>Fahrzeug fehlt laut Vorlage</em></a>`;
      row += `</td>`;
      row += `</tr>`;
      $(tbody).append(row);
    }
  })
}

let currentFilterVehicles;
let lastQueryBuildings
async function renderPanelsVehicles(buildings = currentFilterBuildings) {
  if (!buildings?.length) return;

  parkingLots();

  const accordion = modal.accordionVehicles;

  console.log(buildings)
  const timestamp = buildings.lastQuery;
  console.log(timestamp)

  if (!timestamp || timestamp !== lastQueryBuildings) {
    console.log('new map')
    /*
    const min = Math.min(buildings.building_id);
    const max = Math.max(buildings.building_id);
    const range = IDBKeyRange.bound(min, max, false, false);
    const match = [...new Set(updatedVehicles.map(v => v.building_id))];
    */
    vehicles = await getVehicles(false);
    lastQueryBuildings = timestamp;
    currentFilterVehicles = vehicles;

    vehiclesByBuilding = new Map();
    vehicles.forEach(vehicle => {
      const buildingId = Number(vehicle.building_id);
      if (!vehiclesByBuilding.has(buildingId)) {
        vehiclesByBuilding.set(buildingId, []);
      }
      vehiclesByBuilding.get(buildingId).push(vehicle);
    });
  }
  accordion.replaceChildren();

  let countBuildings = 0;
  buildings.forEach(building => {
    countBuildings++;
    const id = Number(building.id)
    const building_type = Number(building.building_type);
    const buildingType = buildingTypes[building_type];

    let containerLots = 0;
    let trailerLots = 0;
    let vehicleLots = buildingType?.startParkingLots;
    if (!vehicleLots) return;

    const tags = building.tags ? building.tags : building.tags = {};
    tags.missingVehicle = false;
    tags.moreVehicles = false;

    if (!building.template) {
      const selector = profileSelector(building)
      building.template = selector.select;
    }

    const extensionsTypes = buildingType.extensions;
    const template = building.template;
    const planned = template.vehicles ?? [];

    const vehiclesThisBuilding = vehiclesByBuilding.get(id) || [];
    const totalCount = vehiclesThisBuilding.length;
    const totalQuantity = planned.reduce((v, p) => v + p.quantity, 0);

    const container = vehiclesThisBuilding.filter(c =>
      parkingLots.containers.has(c.vehicle_type));
    const containerCount = container.length;

    const vehicle = vehiclesThisBuilding.filter(v =>
      !parkingLots.containers.has(v.vehicle_type));
    const vehicleCount = vehicle.length;

    const typeCounts = vehiclesThisBuilding.reduce((acc, v) => {
      const type = v.vehicle_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    tags.vehicleCounts = typeCounts;

    const inventoryList = { ...typeCounts };
    const inventory = tags.inventory = { less: {}, more: {}, ok: {} };
    planned.forEach(type => {
      const id = type.id;
      const target = type.quantity || 0;
      const current = typeCounts[id] || 0;

      delete inventoryList[id];

      if (target === current) {
        inventory.ok[id] = current;
      } else if (target < current) {
        inventory.more[id] = current - target
        tags.moreVehicles = true;
      } else if (target > current) {
        inventory.less[id] = target - current
        tags.missingVehicle = true;
      }
    });
    Object.entries(inventory).forEach(([type, count]) => {
      inventory.more[type]
    });

    vehicleLots += building.level;
    building.extensions.forEach(extension => {
      if (!extension.available === true) { console.log(`${building.id} ${extension.caption} ${extension.available_at ?? 'have a look'}`); return; }

      const type_id = Number(extension.type_id);
      const extensionType = extensionsTypes[type_id];
      const givesParkingLots = extensionType?.givesParkingLots;
      if (!givesParkingLots) return;

      const containerLot = parkingLots
        ?.containerLots[building_type][type_id] ?? false;
      const trailerLot = parkingLots
        ?.trailerLots[building_type][type_id] ?? false;
      const vehicleLot = parkingLots
        ?.vehicleLots[building_type][type_id] ?? false;

      if (containerLot) containerLots += containerLot;
      if (trailerLot) trailerLots += trailerLot;
      if (vehicleLot) vehicleLots += vehicleLot;
    });

    const panelId = `${prefix}-panel-vehicles-${building.id}`
    const panelContentId = `${panelId}-content`;
    let panel = '';
    panel += `<div id='${panelId}' class='building-list building_searchable panel panel-default' data-building-id='${building.id}'
                        search_attribute='${building.caption}' building_type_id='${building.building_type}' building_id='${building.id}' dispatch_id='${building.leitstelle_building_id}'>`;
    panel += `  <div class="panel-heading row" building_id='${building.id}' href='#${panelContentId}' data-toggle='collapse' aria-expanded='false' aria-controls='${panelContentId}'>`;
    panel += `    <div class='col-xs-6 col-sm-1 text-right'>`;
    panel += `      <a class='btn btn-default btn-xs disabled'>${buildingType.caption}</a>`;
    panel += `    </div>`;
    panel += `    <div class='col-xs-6 col-sm-2'>`;
    panel += `      <a class='lightbox-open' href='/buildings/${building.id}'>${building.caption}</a>`;
    panel += `    </div>`;
    panel += `    <div class='col-xs-6 col-sm-2 text-center'>`;
    panel += `      <span class='label label-default'>${vehicleCount} von ${vehicleLots} Fahrzeugen</span>`;
    panel += `    </div>`;
    panel += `    <div class='col-xs-6 col-sm-2 text-center'>`;
    if (containerLots > 0) {
      panel += `    <span class="label label-default ">${containerCount} von ${containerLots} Abrollbehälter</span>`;
    }
    panel += `    </div>`;
    panel += `    <div class='col-xs-6 col-sm-2 text-center'>`;
    //panel += `          <span class='label label-default'>PLACEHOLDER EXAMPLE</span>`;
    panel += `    </div>`;
    panel += `    <div class='col-xs-6 col-sm-2 text-center'>`;
    if (tags.missingVehicle === true && tags.moreVehicles === false) {
      panel += `    <span class='label label-warning'>Fahrzeuge fehlen</span>`;
    }
    if (tags.missingVehicle === true && tags.moreVehicles === true) {
      panel += `    <span class='label label-danger'>Fahrzeuge fehle und sind zuviel</span>`;
    }
    if (tags.missingVehicle === false && tags.moreVehicles === true) {
      panel += `    <span class='label label-info'>Fahrzeuge überbestand</span>`;
    }
    panel += `    </div>`;
    panel += `    <div class='pull-right'>`;
    //panel += `      <span class="label label-default ">${parkingABLots} AB-Stellplätze - ${freeABLots} frei</span>`;
    panel += `      <button type="button" class='btn btn-success btn-xs' style='width: 18ch;' data-building-id="${building.id}">{credits} Credits</button>`;
    panel += `    </div>`;
    panel += `  </div>`;
    panel += `<div id='${panelContentId}' class='panel-collapse collapse' data-building-id='${building.id}'>`;


    panel += `<div class='panel-body' building_id='${building.id}'>`;
    panel += `  <div class='row list-container' style='display: flex; gap: 50px; width: 100%;'>`;

    panel += `    <div class='left-colum' style='flex:1;'>`;
    if (tags.missingVehicle === true) {
      panel += `    <h4>Fehlende Fahrzeuge</h4>`
      Object.entries(tags.inventory.less).forEach(([type, count]) => {
        panel += `  <ul style='flex: 1; padding-left: 20px; margin: 10px'>`;
        panel += `    <li>${count} x ${vehicleTypes[type].caption} </li>`;
        panel += `  </ul>`;
      });
    }
    panel += `    </div>`
    panel += `    <div class='right-colum' style='flex:1;'>`;
    if (tags.moreVehicles === true) {
      panel += `    <h4>Fahrzeuge überbestand</h4>`
      Object.entries(tags.inventory.more).forEach(([type, count]) => {
        panel += `  <ul style='flex: 1; padding-left: 20px; margin: 10px'>`;
        panel += `    <li>${count} x ${vehicleTypes[type].caption}</li>`;
        panel += `  </ul>`;
      });
    }
    panel += `    </div>`
    panel += `  </div>`

    panel += `  <table class='table table-striped' id='vehicle_table_${building.id}'>`;
    panel += `    <thead>`;
    panel += `      <tr class="tablesorter-headerRow" role="row" style='display: table; width: 100%; table-layout: fixed;'>`;
    panel += `        <th class='text-center' style='vertical-align: middle; width: 175px;'>Fahrzeugtyp</th>`;
    panel += `        <th class='sorter-false' style='vertical-align: middle; width: 40ch;'>Fahrzeug</th>`;
    panel += `        <th class='sorter-false' style='vertical-align: middle; width: 40ch;'>Anhänger</th>`;
    panel += `        <th class='text-center' style='vertical-align: middle; width: 175px;'></th>`;
    panel += `        <th class='text-center sorter-false' style='vertical-align: middle; width: 3ch;'>FMS</th>`;
    panel += `        <th class='sorter-false text-center' style='vertical-align: middle; width: 11ch;'>Besatzung</th>`;
    panel += `       </tr>`;
    panel += `     </thead>`;
    panel += `    <tbody data-rendered='false'>`;
    panel += `    </tbody>`;
    panel += `  </table>`;

    panel += `    </div>`;
    panel += `  </div>`;
    panel += `</div>`;

    $(accordion).append(panel);
  });
  const counter = document.querySelector(`#${prefix}-buildingsCounter`)
  counter.textContent = `\u00a0\u00a0\u00a0\u00a0${countBuildings} Gebäude`;
}

let currentFilterBuildings = [];
async function renderTableBuildings(buildings = currentFilterBuildings) {
  console.log('run renderTabelsBuildings')
  const tbody = modal.buildingTableBody;
  currentFilterBuildings = buildings;
  const table = tbody.closest('table');

  tbody.replaceChildren();

  let count = 0;
  buildings.forEach(building => {
    if (building.id === 'lastUpdate' || building.id === 'lastQuery') { console.log('last...    return'); return; }
    building.tags ? building.tags : building.tags = {};
    if (!building.template) {
      const selector = profileSelector(building)
      building.template = selector.select;
    }
    const template = building.template;
    count++;
    console.log(building)
    const buildingType = buildingTypes[building.building_type];

    let row = `<tr style='display: table; width: 100%; table-layout: fixed;'>`;
    row += `<td class='digit-cell' data-digit=${building.id} style='width: 3ch;'>`; // cell id -- tabelsorter
    row += `</td>`;

    row += `<td class='text-right' data-text='${buildingType.caption}' style='middle; width: 175px;'>`; // cell building Type -- tabelsorter
    row += `<a class='btn btn-default btn-xs disabled'>${buildingType.caption}</a>`;
    row += `</td>`;

    row += `<td style='width: 40ch;'>`; // cell building caption -- tabelsorter
    row += `<a class='lightbox-open' href='/buildings/${building.id}'>${building.caption}</a>`;
    row += `</td>`;

    row += `<td style='width: 40ch;'>`; // cell dropdown
    const selector = profileSelector(building);
    const profiles = selector.profiles;
    building.tags.withoutAssignment = false;

    if (template === 'none') {
      building.tags.withoutAssignment = true;
    }

    if (profiles.length > 0 && template.id !== 'none') {
      row += `<select data-action='profile-assignment' style='width: 100%;'>`;
      row += `<option value='none'></option>`;
      profiles.forEach(profile => {
        if (template && profile.id === template?.id) {
          row += `<option value='${profile.id}' selected>${profile.name}</option>`;
        } else {
          row += `<option value='${profile.id}'>${profile.name}</option>`;
        }
      });
      row += `</select>`;
    } else {
      if (template.defaultProfile === true) {
        row += `${template.name}`;
      } else {
        row += `keine Vorlage gefunden`;
      }
    }
    row += `</td>`;

    row += `<td class='text-center' style='width: 19ch;'>`; // cell level
    const level = building?.level ?? 0;
    const maxLevel = buildingType?.maxLevel ?? 0;
    if (level >= 0 && maxLevel > 0) {
      row += `${level}`;
      if (level < maxLevel) {
        row += `<a class='btn btn-xs btn-danger disable_after_click' data-remote='true' data-building='${building.id}' data-link-tag='level'
                data-level='${level}' href='/buildings/${building.id}/expand_do/credits?level=${level}'>${level + 1}`;
        row += `</a>`;
      }
    }
    row += `</td>`;

    /*
     *  grün   = label-success ===             gebaut und   aktiv === succes
     *  orange = label-warning ===             gebaut und inaktiv === dead
     *  rot    = label-danger  ===   geplant ungebaut             === missing
     *  blau   = label-info    ===          in progress           === build
     */
    row += `<td>`; // cell extensions
    const types = buildingType.extensions ?? [];
    const real = building.extensions ?? [];
    const plan = template.extensions;
    const planCount = countDuplicates(plan); //console.log('plan', planCount)
    const realCount = countDuplicates(real); //console.log('real', realCount)
    building.tags.allExtensionsActiv = true;
    building.tags.missingExtension = false;
    types.forEach((type, index) => {
      if (!type?.caption) { return; }
      const caption = type.caption;
      const planned = plan.find(item => item.id === index);
      const current = real.find(item => item.type_id === index);

      if (current) {
        if (current?.enabled === false) { // dead
          building.tags.allExtensionsActiv = false;
          row += `<a data-remote='true' data-method='post' data-building='${building.id}' data-link-tag='activate'
                  data-extension='${index}' href="/buildings/${building.id}/extension_ready/${index}/${building.id}">`;
          row += `<span title='${caption ?? "caption nicht lesbar"}`;
          row += ` nicht aktiv`;
          row += `' class='label label-warning' style='font-size: 12px;'>`;
          row += `${index}</span>`;
          row += `</a>`;
        }
        if (current?.available_at) { // build
          const date = new Date(current.available_at);
          row += `<span title='${caption}`;
          row += ` fertig am ${date.toLocaleString()}`;
          row += `' class='label label-info' style='font-size: 8px;'>`;
          row += `${index}</span>`;
        }
        if ((current?.enabled === true)
          && (current?.available === true)) {
          row += `<span title='${caption}`;
          row += `' class='label label-success' style='font-size: 8px;'>`;
          row += `${index}</span>`;
        }
      }
      if (!current && !planned) {
        row += `<span title='${caption}`;
        row += `' class='label label-default' style='font-size: 8px;'>`
        row += `${index}</span>`;
      }
      if (!current && planned) {
        if ((realCount[caption] ?? 0) >= planCount[caption]) {
          row += `<span title='${caption}`;
          row += `' class='label label-default' style='font-size: 8px;'>`
          row += `${index}</span>`;
        } else {
          row += `<a data-remote='true' data-method='post' data-building='${building.id}' data-link-tag='credits'
                  data-extension='${index}' href="/buildings/${building.id}/extension/credits/${index}?redirect_building_id=${building.id}">`
          row += `<span title='${caption}`;
          const formatNumber = new Intl.NumberFormat(`${international[lang].langcode}`, { maximumFractionDigits: 0 });
          const credits = formatNumber.format(type.credits)
          row += ` bauen für ${credits} dauer ${type.duration}`;
          row += `' class='label label-danger' style='font-size: 12px'>`;
          row += `${index}</span>`;
          row += `</a>`;
          building.tags.missingExtension = true;
        }
      }
    });
    row += `</td>`;

    /*row += `<td style='width: 60px;'>`; // buy extensions -- comming soon
    if (building.missingExtension === true) {
      row += `<a class="btn btn-success btn-xs">Credits</a>
            comming soon`;
    }
    row += `</td>`;*/

    /*
    row += `<td class='text-center' style='width: 11ch;'>`; // cell storage
    if ((building.storage_upgrades.length >= 0)
        && (building.storage_total !== 0)) {
      const storage_total = building.storage_total ?? '';
      const storage_available = building.storage_available ?? '';
      row += `${storage_available} / ${storage_total}`;
    }
    row += `</td>`;

    /*
     *  grün   = label-success === count === target === setpoint
     *  blau   = label-info    === count === target    !setpoint
     *  orange = label-warning === count >=  target    !setpoint
     *  rot    = label-danger  === count <=  target
     */
    const personnelCount = building.personal_count;
    const personnelTarget = building.personal_count_target;
    const personnelSetPoint = building.template.personnelSetPoint ?? null;
    building.tags.personnel_target = true;
    /*
    const hiring_automatic =
      building.hiring_automatic === false && building.personal_count_target
        ? false : undefined;
    building.personnel_target = true;
    */

    if (buildingType?.startPersonnel >= 0) {
      //if (personnelSetPoint) { building.personal_count_setPoint = personnelSetPoint; }

      if (personnelCount === personnelTarget) {
        if (personnelSetPoint === personnelTarget) { // succes = green
          row += `<td class='text-success text-center' style='width: 11ch;'>`;
        }
        if (personnelSetPoint !== personnelTarget) { // info
          row += `<td title="Das Personalsoll weicht vom Wert der Vorlage ab" class='text-info text-center' style='width: 11ch;'>`
          building.tags.personnel_target = false;

        }
        row += `${personnelCount}`;
      }
      if (personnelCount !== personnelTarget) { // warning = orange
        if (personnelSetPoint === personnelTarget) {
          row += `<td title="Diese Wache ist noch nicht voll" class='text-warning text-center' style='width: 11ch;'>`;
        }
        if (personnelSetPoint !== personnelTarget) { // danger = red
          row += `<td title="Das Personalsoll weicht vom Wert der Vorlage ab und ist noch nicht voll"
                class='text-danger text-center' style='width: 11ch;'>`;
          building.tags.personnel_target = false;
        }
        row += `${personnelCount} / ${personnelTarget}`;
      }
    } else {
      row += `<td style='width: 11ch;'>`;
    }
    row += `</td>`;
    /*
      if ((building.hiring_automatic === false) // cell hiring_automatic
        && (building.personal_count_target)) {
      row += `<td style='width: 2ch;'>`
      row += `<a data-remote='true' data-method='post' data-building='${building.id}'
        href='/buildings/${building.id}/hire_do/automatic'>`
      row += `<span id='${prefix}-hiringAuto' class="btn btn-danger btn-xs glyphicon glyphicon-time"></span>`;
      row += `</a>`
      row += `</td>`;
    } else {
      row += `<td style='width: 2ch;'></td>`;
    }
    */
    row += `</tr>`;
    $(tbody).append(row);
  });

  const counter = document.querySelector(`#${prefix}-buildingsCounter`)
  counter.textContent = `\u00a0\u00a0\u00a0\u00a0${count} Gebäude`;

  $(table).trigger('update');
}

async function functionArea() {
  const area = modal.functionArea;
  buildings = [];
  const dispatchCenterTypeEntry = Object.entries(buildingTypes).find(
    ([, buildingType]) => buildingType.isDispatchCenter
  );
  const dispatchCenterType = Number(dispatchCenterTypeEntry[0]);
  if (dispatchCenterType) {
    dispatchCenters = await getBuildings(false, 'type', dispatchCenterType);
    dispatchCenters.sort((a, b) => a.caption.localeCompare(b.caption));
  }
  const dispatch = () => {
    let string = `
        <select id='${prefix}-dispatchCenters'>
            <option value='none'>Leitstelle auswählen</option>
            <option value='all'>alle Leitstellen</option>
        `;
    dispatchCenters.forEach(dc => {
      string += `<option value='${dc.id}'>${dc.caption}</option>`;
    });
    string += `</select>`;
    return string;
  }

  const refresh = `<button type='button' data-action='refresh-buildings'
      class="btn btn-default btn-xs glyphicon glyphicon-refresh"
      title='Gebäudeliste erneut anzeigen'></button>`;

  const categories = () => {
    let string = `
        <select id='${prefix}-buildingCategories'>
            <option value='all'>alle Gebäudearten</option>`

    Object.entries(buildingCategories).forEach(([group, info]) => {
      string += `<option value='${group}'>${group}</option>`;

      info.buildings.forEach(type => {
        const caption = buildingTypes[type].caption;
        if (caption === "Verbandszellen") return;
        string += `<option value='${type}'>&nbsp;&nbsp;&nbsp;&nbsp;${caption}</option>`;
      });
    });
    string += `</select>`;
    return string;
  }

  const buildingsCounter = `<span id="gl-buildingsCounter">&nbsp;&nbsp;&nbsp;&nbsp;0 Gebäude</span>`

  const searchBuilding =// `
    //<div class="form-field">
    `    <div class="input-group pull-right"> 
            <input type="text" class="form-control input-sm" placeholder="Gebäude oder Fahrzeug suchen" name="search" style='width: 42ch;'>
            <button type='button' data-action='search' class="btn btn-default glyphicon glyphicon-search"></button>
        </div>`
  //</div>`

  area.replaceChildren();
  $(area).append(
    dispatch(),
    refresh,
    categories(),
    buildingsCounter,
    searchBuilding
  );

  let dispathCenterId = 'none';
  let filter = 'all';
  area.addEventListener('change', async event => {
    const id = event.target.id;
    const value = event.target.value;
    if (id !== `${prefix}-dispatchCenters`
      && id !== `${prefix}-buildingCategories`) return;

    if (id === `${prefix}-dispatchCenters`) {
      dispathCenterId = value;
    }
    if (dispathCenterId === 'none') return;

    if (id === `${prefix}-buildingCategories`) {
      const group = buildingCategories[value];
      if (group) {
        filter = group.buildings;
      } else {
        filter = value;
      }
    }

    let data;
    if (Number(filter) === dispatchCenterType) {
      buildings = await getBuildings(false, 'type', Number(filter));
    } else {
      if (dispathCenterId === 'all') {
        data = await getBuildings(false);
      } else {
        data = await getBuildings(false, 'dispatchCenter', Number(dispathCenterId));
      }
      if (filter !== 'all') {
        const active = Array.isArray(filter) ? filter : [Number(filter)]
        const filtered = data.filter(b => active.includes(b.building_type));
        data = filtered;
      }
      buildings = data.filter(building =>
        building.building_type !== dispatchCenterType);
    }
    if (modal.activeTab === 'buildings') {
      await renderTableBuildings(buildings);
    }
    if (modal.activeTab === 'vehicles') {
      await renderPanelsVehicles(buildings)
      currentFilterBuildings = buildings;
    }
  });
}

async function initialize() {
  templates = await caseOfCaddy('BosErnie_StationBlueprints', 'main', 'blueprints');
  templates = templates !== undefined ? Object.values(templates) : [];

  await initDB(configDB);

  buildingCategories = await getBuildingCategories(lang)
  buildingTypes = await getBuildingTypes(lang)

  vehicleTypes = await getVehicleTypes(lang)

  const blueprints = await readKey('templates', 'main', configDB)
  assignments = blueprints ? blueprints.assignments ? blueprints.assignments
    : assignments = {} : assignments = {};
}

function createModal() {
  const html =
    /* HTML */`
    <div id='${prefix}-modal' class='modal fade in' tabindex='-1' role='dialog' aria-labelledby='${prefix}-title' style='display: block;'>
        <div class='modal-dialog' role='document' style='width: 95%; height: 90vh; margin: 7vh auto 3vh;'>
            <div class='modal-content' style='height: 100%; display: flex; flex-direction: column;'>
                <div class='modal-header' style='display: flex; align-items: center; justify-content: space-between; position: relative;'>
                    <h4 id='${prefix}-title' class='modal-title' style='text-align: center; flex-grow: 1;'>${scriptName}</h4>
                    <div style='display: flex; align-items: center; gap: 15px; position: absolute; right: 15px; top: 50%; transform: translateY(-50%);'>
                        <span style='font-size: 0.8em; font-weight: normal; white-space: nowrap;'>v${version}</span>
                        <button type='button' class='close' data-dismiss='modal' aria-label='close'>
                            <span aria-hidden='true'>×</span>
                        </button>
                    </div>
                </div>
                <div class='modal-body' style='display: flex; flex-direction: column; min-height: 0; max-height: none; flex: 1 1 auto; overflow-y: hidden;'>
                    <div id='${prefix}-control' class='panel-heading row' style='min-height: 50px;'></div>
                    <div id='${prefix}-filters' style='min-height: 25px;'>
                        <div data-tab-controls='buildings'>
                            <button type='button' data-action='save-profiles' class='btn btn-default btn-xs' style='width: 175px;'>
                                Vorlagen zuordnung speichern
                            </button>
                            <button type='button' data-action='filter-unassigned' class='btn btn-default btn-xs' style='width: 175px;'>
                                Wachen ohne Profil anzeigen
                            </button>
                            <button type='button' data-action='filter-missing-extensions' class='btn btn-default btn-xs' style='width: 175px;'>
                                Fehlende Erweiterungen
                            </button>
                            <button type='button' data-action='filter-inactive-extensions' class='btn btn-default btn-xs' style='width: 175px;'
                                title='Aktivieren direkt auf den gelben Button klicken'>
                                Erweiterung nicht aktiv
                            </button>
                            <button type='button' data-action='filter-personnel-target' class='btn btn-default btn-xs' style='width: 175px;'
                                title='Achtung: Es werden nur Gebäude mit einem Profil angezeigt'>
                                Abweichendes Personalsoll
                            </button>
                            <button type='button' data-action='fix-personnel-target' class='btn btn-default btn-xs glyphicon glyphicon-ok'
                                title='Personalsoll für die aktuellen Gebäude setzen. Achtung: Es werden nur zwei Gebäude pro Sekunde abgearbeitet. Wachen ohne Profil können nicht verarbeitet werden!'>
                            </button>
                            <button type='button' data-action='filter-hire-automatic' class='btn btn-default btn-xs' style='width: 175px;'>
                                Kein automatisches Werben
                            </button>
                            <button type='button' data-action='fix-hire-automatic' class='btn btn-default btn-xs glyphicon glyphicon-ok'
                                title='Automatisches Personalwerben für die aktuellen Gebäude aktivieren. Achtung: Es werden nur zwei Gebäude pro Sekunde abgearbeitet.'>
                            </button>
                        </div>
                        <div data-tab-controls='vehicles' style='display: none;'></div>
                    </div>
                    <ul class='nav nav-tabs' role='tablist' id='${prefix}-tabList'>
                        <li role='presentation' class='active'>
                            <a href='#${prefix}-tab-buildings' aria-controls='${prefix}-tab-buildings' role='tab' data-toggle='tab'>Gebäude</a>
                        </li>
                        <li role='presentation'>
                            <a href='#${prefix}-tab-vehicles' aria-controls='${prefix}-tab-vehicles' role='tab' data-toggle='tab'>Fahrzeuge</a>
                        </li>
                    </ul>
                    <div class='tab-content' style='padding-top: 15px; flex: 1 1 0; min-height: 0; overflow: hidden;'>
                        <div id='${prefix}-tab-buildings' class='tab-pane active' role='tabpanel' style='height: 100%; min-height: 0;'>
                            <table class='table table-striped tablesorter tablesorter-default' id='${prefix}-buildings-table' role='grid' style='width: 100%; display: flex; flex-direction: column; height: 100%; min-height: 0; margin-bottom: 0;'>
                                <thead style='display: block; flex: 0 0 auto;'>
                                    <tr style='display: table; width: 100%; table-layout: fixed;'>
                                        <th class='sorter-digit' style='vertical-align: middle; width: 3ch; background-position: right -1ch center;'
                                            title='alt - neu'>
                                        </th>
                                        <th class='text-center' style='vertical-align: middle; width: 175px;'>
                                            Wachentyp
                                        </th>
                                        <th class='text-center' style='vertical-align: middle; width: 40ch;'>
                                            Wache
                                        </th>
                                        <th class='sorter-false' style='vertical-align: middle; width: 40ch;'></th>
                                        <th class='text-center sorter-false' style='vertical-align: middle; width: 19ch;'>Ausbaustufe</th>
                                        <th class='sorter-false text-center' style='vertical-align: middle;'>
                                            Erweiterungen
                                        </th>
                                        <!--<th class='sorter-false text-center' style='vertical-align: middle; width: 13ch;'>
                                            Stellplätze
                                            <small style='font-weight: normal;'>
                                            Fzg - Anh - AB
                                            </small>
                                        </th>
                                        <th class='sorter-false text-center' style='vertical-align: middle; width: 11ch;'>
                                            Lager
                                        </th>-->
                                        <th class='sorter-false text-center' style='vertical-align: middle; width: 11ch;'>
                                            Personal
                                        </th>
                                    </tr>
                                </thead>
                                <tbody aria-live='polite' aria-relevant='all' style='display: block; min-height: 0; overflow-y: auto; width: 100%; box-sizing: border-box;'>
                                </tbody>
                            </table>
                        </div>
                        <div id='${prefix}-tab-vehicles' class='tab-pane' role='tabpanel' style='height: 100%; min-height: 0; overflow: hidden;'>
                            <div id='${prefix}-vehicle-accordion' class='panel-group' style='height: 100%; overflow-y: auto; overflow-x: hidden'></div>
                        </div>
                    </div>
                </div>
                <div id='${prefix}-footer' class='modal-footer' style='text-align: left;'>
                    <div data-tab-controls='buildings'>
                        <button type='button' data-action='reload-buildings' class='btn btn-default btn-xs'>
                            Gebäude neuladen
                        </button>
                        <span id='${prefix}-textLastUpdateBuildings'>
                            Lade Gebäudeliste ...
                        </span>
                        <span>
                            -- Der Update-Button zeigt nur Gebäude, die sich in den letzten 24 Stunden verändert haben.
                        </span>
                    </div>
                    <div data-tab-controls='vehicles' style='display: none;'>
                        <button type='button' data-action='reload-vehicles' class='btn btn-default btn-xs'>
                            Fahrzeuge neuladen
                        </button>
                        <span id='${prefix}-textLastUpdateVehicles'>
                            Lade Fahrzeugliste ...
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

  const dom = new DOMParser().parseFromString(html, 'text/html');
  const modal = dom.body.firstElementChild;
  document.body.append(modal);

  const functionArea = modal.querySelector(`#${prefix}-control`)
  const accordionVehicles = modal.querySelector(`#${prefix}-vehicle-accordion`);
  $(accordionVehicles).on('show.bs.collapse', '.panel-collapse', async function () {
    const tbody = this.querySelector('tbody');

    if (!tbody || tbody.dataset.rendered === 'true') return;

    const buildingId = Number(this.dataset.buildingId);
    const building = buildings.find(item => Number(item.id) === buildingId);

    const vehiclesThisbuilding = vehiclesByBuilding.get(buildingId) ?? [];

    await renderVehicleRows(
      tbody,
      buildingId
    );
    tbody.dataset.rendered = 'true';
  });

  const buildingTableBody = modal.querySelector(`#${prefix}-buildings-table tbody`);
  buildingTableBody.addEventListener('change', event => {
    const select = event.target.closest(`select[data-action='profile-assignment']`);
    if (!select) return;
    const cell = select.closest('tr').querySelector('.digit-cell');
    const buildingId = Number(cell.dataset.digit);
    if (select.value === 'none') {
      delete assignments[buildingId];
    } else {
      assignments[buildingId] = select.value;
    }
  });

  const tableBuildings = buildingTableBody.closest('table');
  $(tableBuildings).tablesorter({
    textExtraction: {
      0: node => $(node).attr('data-digit'),
    },
    headers: {
      0: { sorter: 'digit' },
      1: { sorter: 'text' },
      2: { sorter: 'text' },
    },
  });

  $(modal).on('shown.bs.tab', '[data-toggle="tab"]', async event => {
    modal.activeTab = event.target.getAttribute('href').replace(/^.*-tab-/, '').replace('#', '');
    modal.querySelectorAll('[data-tab-controls]').forEach(controls => {
      controls.style.display = controls.dataset.tabControls === modal.activeTab ? '' : 'none';
    });
    if (modal.activeTab === 'vehicles') {
    }
    if (modal.activeTab === 'buildings') {
      await renderTableBuildings();
    }
  });

  modal.addEventListener('click', async event => {
    const extensionLink = event.target.closest(`a[data-link-tag='credits']`);
    if (extensionLink) {
      if (extensionLink.dataset.pending === 'true') {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      extensionLink.dataset.pending = 'true';
      return;
    }

    const button = event.target.closest('[data-action]');
    if (!button || !modal.contains(button)) return;

    if (button.dataset.action === 'refresh-buildings') {
      await renderTableBuildings(buildings);
    }
    if (button.dataset.action === 'save-profiles') {
      button.disabled = true;
      button.blur();
      try {
        await saveKey({ assignments }, 'main', configDB, 'templates');
        button.textContent = 'Erfolgreich gespeichert';
        await delay(1500);
        button.textContent = 'Vorlagen zuordnung speichern';
      } finally {
        button.disabled = false;
      }
    }
    if (button.dataset.action === 'filter-unassigned') {
      await renderenderTableBuildings(buildings.filter(building =>
        building.tags.withoutAssignment === true));
    }
    if (button.dataset.action === 'filter-missing-extensions') {
      await renderTableBuildings(buildings.filter(building =>
        building.tags.missingExtension === true));
    }
    if (button.dataset.action === 'filter-inactive-extensions') {
      await renderTableBuildings(buildings.filter(building =>
        building.tags.allExtensionsActiv === false));
    }
    if (button.dataset.action === 'filter-personnel-target') {
      await renderTableBuildings(buildings.filter(building =>
        building.tags.personnel_target === false
        && building.tags.withoutAssignment !== true));
    }
    if (button.dataset.action === 'fix-personnel-target') {
      button.disabled = true;
      const fixBuildings = buildings.filter(building =>
        building.tags.personnel_target === false
        && building.tags.withoutAssignment !== true);
      try {
        for (const building of fixBuildings) {
          await delay(500);
          const token = document.querySelector(`meta[name='csrf-token']`).content;
          const personnelSetPoint = building.template.personnelSetPoint;
          const body = new URLSearchParams({
            utf8: '✓',
            _method: 'patch',
            authenticity_token: token,
            'building[personal_count_target]': String(personnelSetPoint),
          });
          const response = await fetch(
            `/buildings/${building.id}?personal_count_target_only=1`,
            {
              method: 'POST',
              headers: { 'X-CSRF-Token': token },
              body,
            }
          );
          if (!response.ok) {
            throw new Error(`Speichern fehlgeschlagen: ${response.status}`);
          }
          building.personal_count_target = personnelSetPoint;
          building.tags.personnel_target = true;
          await saveKey(building, 'buildings', configDB);
        }
        await renderTableBuildings(fixBuildings);
      } finally {
        button.disabled = false;
      }
    }
    if (button.dataset.action === 'filter-hire-automatic') {
      await renderTableBuildings(buildings.filter(building =>
        building.hiring_automatic === false
        && building.personal_count_target !== 0
        && building.hire_phase === 0));
    }
    if (button.dataset.action === 'fix-hire-automatic') {
      button.disabled = true;
      const hireAutomatic = currentFilterBuildings.filter(building =>
        building.hiring_automatic === false
        && building.personal_count_target !== 0
        && building.hire_phase === 0);
      try {
        for (const building of hireAutomatic) {
          await delay(500);
          try {
            const response = await fetch(
              `/buildings/${building.id}/hire_do/automatic`
            );
            if (!response.ok) {
              throw new Error(`building ${building.id}: HTTP ${response.status}`);
            }
            building.hiring_automatic = true;
            await saveKey(building, 'buildings', configDB);
          } catch (error) {
            console.error(error);
          }
        }
        await renderTableBuildings(hireAutomatic);
      } finally {
        button.disabled = false;
      }
    }
    if (button.dataset.action === 'reload-buildings') {
      button.disabled = true;
      const status = modal.querySelector(`#${prefix}-textLastUpdateBuildings`);
      status.textContent = 'Lade Gebäudeliste ...';
      try {
        const updatedBuildings = await getBuildings(false, 'update');
        status.textContent = `Letztes Update: ${await showLastUpdate('buildings')}`;
        await delay(1000);
        await renderTableBuildings(updatedBuildings);
      } finally {
        button.disabled = false;
        button.blur();
      }
    }
    if (button.dataset.action === 'reload-vehicles') {
      button.disabled = true;
      const status = modal.querySelector(`#${prefix}-textLastUpdateVehicles`);
      status.textContent = 'Lade Fahrzeugliste ...';
      try {
        const updatedVehicles = await getVehicles(true);
        status.textContent = `Letztes Update: ${await showLastUpdate('vehicles')}`;
        const min = Math.min(updatedVehicles.building_id);
        const max = Math.max(updatedVehicles.building_id);
        //const range = IDBKeyRange.bound(min, max, false, false);
        //const match = [...new Set(updatedVehicles.map(v => v.building_id))];
        //const updatedBuildings = await getBuildingCategories(false, 'id', range, match);
        await delay(1000);
        await renderPanelsVehicles(updatedBuildings);
      } finally {
        button.disabled = false;
        button.blur();
      }
    }
  });

  const links = ['/extension/credits/', '/extension_ready/', '/expand_do/credits',];
  $(document).ajaxComplete(async function (event, xhr, settings) {
    if (!links.some(link => settings.url.includes(link))) return;

    const extension = settings.url.match(
      /\/buildings\/(\d+)\/extension(?:_ready|\/credits)\/(\d+)(?:[\/?].*)?/
    );
    const level = settings.url.match(
      /\/buildings\/(\d+)\/expand_do\/credits\?level=(\d+)/
    );
    if (!extension && !level) return;

    let id;
    let typeId;
    let link;
    if (['/extension/credits/', '/extension_ready/'].some(link => settings.url.includes(link))) {
      id = Number(extension[1]);
      typeId = Number(extension[2]);
      link = modal.querySelector(
        `a[data-building='${extension[1]}'][data-extension='${extension[2]}']`
      );
    }
    if (settings.url.includes('/expand_do/credits')) {
      id = Number(level[1]);
      link = modal.querySelector(
        `a[data-building='${level[1]}'][ data-level='${level[2]}']`
      );

    }

    console.log(id)
    const building = buildings.find(item => Number(item.id) === id);
    console.log(building);
    if (!building) return;

    if (xhr.status !== 200) {
      link?.removeAttribute('data-pending');
      console.error('Error: response not Ok');
      return;
    }

    if (settings.url.includes('/extension_ready/')) {
      const extension = building.extensions.find(item =>
        item.type_id === typeId);
      if (extension) extension.enabled = true;
    }
    if (settings.url.includes('/extension/credits/')) {
      const extensionType = buildingTypes[building.building_type]
        .extensions[typeId];
      const duration = extensionType.duration.match(/(\d+)/);
      const period = Number(duration[1]) * 24 * 60 * 60 * 1000;
      building.extensions.push({
        type_id: typeId,
        caption: extensionType.caption,
        available_at: date(Date.now() + period),
      });
    }
    if (settings.url.includes('/expand_do/credits')) {
      const fromLevel = building.level;
      const toLevel = fromLevel + 1;
      building.level = toLevel;
    }
    await saveKey(building, 'buildings', configDB);
    await renderTableBuildings(currentFilterBuildings);
  });


  modal.accordionVehicles = accordionVehicles;
  modal.activeTab = 'buildings';
  modal.buildingTableBody = buildingTableBody;
  modal.functionArea = functionArea;
  return modal;
}

let modal;
if (!document.querySelector(`#${prefix}-menu`)) {
  const divider =
    document.querySelector(
      '#menu_profile + .dropdown-menu > li.divider'
    );
  const triggerA = document.createElement('a');
  triggerA.href = `#${prefix}`;
  triggerA.append(scriptName);
  const triggerLi = document.createElement('li');
  triggerLi.id = `${prefix}-menu`;
  triggerLi.append(triggerA);
  triggerLi.addEventListener(
    'click', async event => {
      event.preventDefault();
      await initialize();
      if (!modal) {
        modal = createModal();
        await functionArea();
      }
      modal.querySelector(`#${prefix}-textLastUpdateBuildings`).textContent =
        `Letztes Update: ${await showLastUpdate('buildings')}`;
      modal.querySelector(`#${prefix}-textLastUpdateVehicles`).textContent =
        `Letztes Update: ${await showLastUpdate('vehicles')}`;
      $(modal).modal('show');
    });
  divider.before(triggerLi);
};

const autoStart = localStorage.getItem(`${prefix}-autoStart`);
if (autoStart === 'true') {
  document.querySelector(`#${prefix}-menu`).click();
}
