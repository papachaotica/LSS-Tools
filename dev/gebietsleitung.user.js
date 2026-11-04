// ==UserScript==
// @name            Gebietsleiter - Zentrale Leitstelle
// @namespace       papachaotica.leitstellenspiel.de
// @version         0.25.0.261105
// @description:de  Zentrale Verwaltung aller Gebäude und Fahrzeuge
// @author          papachaotica
// @homepage        https://github.com/papachaotica
// @match           https://leitstellenspiel.de
// @match           https://www.leitstellenspiel.de
// @exclude-match   https://forum.leitstellenspiel.de
// @updateURL       https://raw.githubusercontent.com/papachaotica/LSS-Tools/dev/dist/gebietsleitung.user.js
// @require         https://raw.githubusercontent.com/papachaotica/LSS-Tools/dev/lib/indexedDB.js?v261105
// @require         https://raw.githubusercontent.com/papachaotica/LSS-Tools/dev/lib/api-fetch-database-handler.js?v261105
// @run-at          document-idle
// @license         AGPL-3.0-or-later
// ==/UserScript==

/*
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
 * [x] Stellplätze ermitteln und verfügbare anzeigen
 * [x] renderTableVehicles (Design ausarbeiten)
 * [_] rendernPannels ist träge rückmeldungen zum zustand geben Progressbar z.B. beim Fahrzeug laden
 * [_] filter button Fahrzeug tab einrichten
 * [_] link vor dem Fahrzeug kauf auf erweiterunge prüfen
 * [_] manuell Abweichungen vom Profi freigeben mit Gültigkeitsverlust bei nächster Profiländerung
 * [c] Fahrzeuge Leitstelle zuordnen und Änderungen erkennen
 * [x] geplante Fahrzeuge vergleichen und Abweichungen anzeigen
 * [_] Template Tabelle rendern
 * [_] Link zu CentralSettings bauen (Zugfahrzeug Zuordnung, DGL ELW GRTW Einstellungen)
 * [_] Equipment auf Machbarkeit prüfen
 * [x] Speichern-Buttontext mit textContent statt append setzen
 * [_] Werte in Tabellen-HTML vor dem Einfügen escapen
 * [_] storage_upgrades vor dem Zugriff prüfen
 * [_] footer progessbar als data-tab-control
 * [_] footer status credits success 
 */ /* x=done p=progress c=canceled */

const defaults = {
  '0': {
    name: "Feuerwache",
    personnelSetPoint: 200,
    extensions: [],
    vehicles: [],
    targetLevel: 19
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
    vehicles: [],
    targetLevel: 14
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
  '6': {
    name: "Polizeiwache",
    extensions: [
      { id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 }, { id: 9 }, // Zellen
      { id: 11, name: "Kriminalpolizei" },
      { id: 12, name: "Dienstgruppenleitung" },
      { id: 13, name: "Motorradstaffel" },
      { id: 16, name: "Autobahnpolizei " },
    ],
    personnelSetPoint: 50,
    vehicles: [],
    targetLevel: 14
  },
  '8': {
    name: "Polizeischule",
    extensions: [
      { id: 0, name: "Weiterer Klassenraum" },
      { id: 1, name: "Weiterer Klassenraum" },
      { id: 2, name: "Weiterer Klassenraum" },
    ],
  },
  '9': {
    name: "THW",
    extensions: [
      { id: 0, name: "1. Technischer Zug: Fachgruppe Notversorgung/Notinstandsetzung" },
      { id: 1, name: "1. Technischer Zug: Zugtrupp" },
      { id: 5, name: "2. Technischer Zug: Fachgruppe Notversorgung/Notinstandsetzung" },
      { id: 6, name: "2. Technischer Zug: Zugtrupp" },
      { id: 4, name: "2. Technischer Zug - Bergungsgruppe" },
      { id: 2, name: "Fachgruppe Räumen" },
      { id: 8, name: "Fachgruppe Wasserschaden/Pumpen" },
      { id: 9, name: "Fachgruppe Schwere Bergung" }
    ],
    vehicles: []
  },
  '10': {
    name: "THW Bundesschule",
    extensions: [
      { id: 0, name: "Weiterer Klassenraum" },
      { id: 1, name: "Weiterer Klassenraum" },
      { id: 2, name: "Weiterer Klassenraum" },
    ],
  },
  '11': {
    name: "Bereitschaftspolizei",
    extensions: [
      { id: 0, name: "2. Zug der 1. Hundertschaft" },
      { id: 1, name: "3. Zug der 1. Hundertschaft" },
      { id: 2, name: "Sonderfahrzeug: Gefangenenkraftwagen" },
      { id: 3, name: "Technischer Zug: Wasserwerfer" },
      { id: 4, name: "SEK: 1. Zug" },
      { id: 6, name: "MEK: 1. Zug" },
      { id: 8, name: "Diesnthundestaffel" },
      { id: 9, name: "Reiterstaffel" },
      { id: 10, name: "Sonderfahrzeug: Lautsprecherkraftwagen" },
    ],
    personnelSetPoint: 240,
    vehicles: []
  },
  '12': {
    name: "Schnelleinsatzgruppe (SEG)",
    extensions: [
      { id: 0, name: "Führung" },
      { id: 1, name: "Sanitätsdienst" },
    ],
    vehicles: []
  },
  '18': {
    name: "Feuerwache (Kleinwache)",
    extensions: [],
    personnelSetPoint: 100,
    vehicles: [],
    targetLevel: 5
  },
  '19': {
    name: "Polizeiwache (Kleinwache)",
    extensions: [
      { id: 0 }, { id: 1 }, // Zellen
      { id: 12, name: "Dienstgruppenleitung" }
    ],
    personnelSetPoint: 25,
    vehicles: [],
    targetLevel: 5
  },
  '20': {
    name: "Rettungswache (Kleinwache)",
    extensions: [],
    personnelSetPoint: 25,
    vehicles: [],
    targetLevel: 5
  },
  '27': {
    name: "Schule für Seefahrt und Seenotrettung",
    extensions: [
      { id: 0, name: "Weiterer Klassenraum" },
      { id: 1, name: "Weiterer Klassenraum" },
      { id: 2, name: "Weiterer Klassenraum" },
    ],
  },
  '28': {
    name: "Hubschrauberstation (Seenotrettung)",
    extensions: [],
    personnelSetPoint: 10,
    vehicles: []
  },
  '29': {
    name: "Autobahnpolizei",
    extensions: [
      { id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 }, { id: 9 }, // Zellen
    ],
    personnelSetPoint: 20,
    vehicles: [],
    targetLevel: 9
  }
};

//////////////////////////////////////////////////////////////////////////////

/* definition
 * bCaption = building.caption
 * bID = Number(building.id || vehicle.building_id)
 * building = object of one building
 * buildings = Array of Buildings
 * buildingTypes = Objekt contain all objects of building Types
 * bType = object of one building Type
 * bTypeCaption = bType.caption
 * bTypeID = Number(building.building_type)
 * extension = Object of one extension on building
 * extensions = Array all extensions on building
 * exType = Object of one extension Type
 * exTypes = Array of all extensions Types on one bType in buildingTypes
 * exTypeID = extension.type_id || exTypes[index]
 * template = Object of one template
 * templates = Array of all templates
 * vCaption = vehicle.caption
 * vID = Number(vehicel.id)
 * vehicle = object of one vehicle
 * vehicels = Array of all vehicles
 * vehicleTypes = Object contain all objects fo vehicle Types
 * vType = Object of one vehicle Type
 * vTypeCaption = vType.caption
 * vTypeID Number(vehicle.vehicel_type)
 * similar at trailer t or container c if needed
 */

'use strict'

const prefix = "gl";
const scriptName = "Gebietsleitung - Zentrale Leitstelle";
const version = "0.25.0.261105";

const lang = I18n.locale ? I18n.locale : 'de_DE';
const international = {
  'de_DE': {
    notSupportedBuildings: [14, 16,],
    langcode: 'de-DE',
    vehicles: { hooklifts: [46,], },
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
  const bTypeID = Number(building.building_type);
  const profiles = templates.filter(profile =>
    Number(profile.buildingTypeId) === bTypeID
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
    select = defaults[bTypeID];
    if (select) {
      select.defaultProfile = true;
    } else {
      select = { id: 'none', extensions: [], vehicles: [], }
    }
  }
  return { select, profiles };
}

const getType = (item, array) => {
  if (item?.building_type !== undefined) {
    const bTypeID = Number(item.building_type);
    return array?.[bTypeID] ?? {
      caption: `Unbekannter Gebäudetyp (${bTypeID})`,
      extensions: [],
    };
  }
  if (item?.vehicle_type !== undefined) {
    const vTypeID = Number(item.vehicle_type);
    return array?.[vTypeID] ?? {
      caption: `Unbekannter Fahrzeugtyp (${vTypeID})`,
      isTrailer: false,
      staff: { min: 0, max: 0, training: 0, trainingAtScene: 0 },
    };
  }
  if (item?.type_id !== undefined) {
    const exTypeID = Number(item.type_id);
    return array?.[exTypeID] ?? {
      caption: `Unbekannte Erweiterung (${exTypeID})`,
      credits: 0,
      duration: '0 Tage',
      givesParkingLots: 0,
      unlocksVehicleTypes: [],
      parkingLotReservations: [],
    };
  }
  return undefined;
};

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
  const bType = getType(building, buildingTypes);
  const extensions = building?.extensions || [];
  const exTypes = bType?.extensions || [];
  const template = profileSelector(building)?.select;
  const vehiclesThisBuilding = vehiclesByBuilding.get(id) || [];

  if (vehiclesThisBuilding.length === 0) {
    const row = ` <tr><td colspan="6" class="text-center" style="padding: 15px;">
                            <h3>Keine Fahrzeuge an dieser Wache.</h3>
                        </td></tr>`;
    $(tbody).append(row);
    return;
  }

  const tags = building?.tags ? building.tags : building.tags = {};
  tags.fms6 = false;

  const sortedByType = [...vehiclesThisBuilding].sort((a, b) => {
    const captionA = getType(a, vehicleTypes)?.caption || '';
    const captionB = getType(b, vehicleTypes)?.caption || '';
    return captionA.localeCompare(captionB);
  });

  const trailers = sortedByType.filter(vehicle =>
    getType(vehicle, vehicleTypes).isTrailer === true);
  const trucks = sortedByType.filter(vehicle =>
    getType(vehicle, vehicleTypes).isTrailer !== true);

  const sortedVehicles = [...trucks, ...trailers];

  // icons
  const truckIcon = `<img src="/images/trailer_vehicle.png" width="18" height="18" style="margin-left: 5px;" title="Zugfahrzeug">`;
  const trailerIcon = `<img src="/images/trailer_2.png" width="18" height="18" style="margin-right: 5px;" title="Anhänger">`;

  let rc = 0;

  const vehicleCount = {};
  sortedVehicles.forEach(vehicle => {
    const vTypeID = vehicle.vehicle_type;
    const vType = getType(vehicle, vehicleTypes);

    const target = template.vehicles.find(t => t.id === vTypeID);
    const quantity = target?.quantity ?? 0;

    vehicleCount[vTypeID] = (vehicleCount[vTypeID] || 0) + 1;

    const isTrailer = vType?.isTrailer ?? false;
    const isConnect = sortedVehicles.some(t => t.id === vehicle.tractive_vehicle_id);
    const hasTrailer = sortedVehicles.some(t => t.tractive_vehicle_id === vehicle.id);



    // Cell vehicleType
    let row;
    row = `<tr data-line="${rc++}" data-vehicle-id="${vehicle.id}" data-building-id='${building.id}' style="display: table; width: 100%; table-layout: fixed;">`;
    row += `<td class="text-right" style="width: 200px;">`;
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

    // Cell buttons
    row += `<td class="text-center" style="width: 200px;">`
    row += `<div class="btn-group">`;
    row += `<a class='lightbox-open btn btn-default btn-xs glyphicon glyphicon-cog' href="/vehicles/${vehicle.id}/edit" title="Fahrzeug bearbeiten"></a>`;
    // assigned_personnel_count === staff.max -- default
    // assigned_personnel_count > staff.min && (> staff.trainingAtScene) && < staff.max -- info
    // assigned_personal_count > staff.min && (< staff.trainingAtScene) -- warning
    // lssm staff assigned_personnel_count < staff.trainingAtScene || staff.min    -- danger
    //
    // if hasTrailer => look for training trailer
    const assStaff = vehicle.assigned_personnel_count ?? 0;
    const minStaff = vType.staff.min;
    const maxStaff = vehicle.max_personnel_override ?? vType.staff.max;
    let training = vType.staff?.training ?? 0;
    let trainingAtScene = vType.staff.trainingAtScene ?? 0;
    if (hasTrailer) {
      const trailerID = sortedVehicles.find(t => t.tractive_vehicle_id === vehicle.id)?.id;
      const trailer = sortedVehicles.find(t => t.id === trailerID);
      const tType = trailer ? getType(trailer, vehicleTypes) : undefined;
      training = tType?.staff?.training ?? vType.staff.training;
      trainingAtScene = tType?.staff?.trainingAtScene ?? vType.staff.trainingAtScene;
    }

    if (!isTrailer) {
      if (assStaff < maxStaff) {
        if (assStaff < minStaff) {
          row += `<a class='lightbox-open btn btn-danger btn-xs glyphicon glyphicon-user' href="/vehicles/${vehicle.id}/zuweisung" title="Personal zuweisen"></a>`;
        } else {
          if (assStaff < trainingAtScene) {
            row += `<a class='lightbox-open btn btn-warning btn-xs glyphicon glyphicon-user' href="/vehicles/${vehicle.id}/zuweisung" title="Personal zuweisen"></a>`;
          } else
            if (assStaff >= trainingAtScene && assStaff < maxStaff) {
              row += `<a class='lightbox-open btn btn-info btn-xs glyphicon glyphicon-user' href="/vehicles/${vehicle.id}/zuweisung" title="Personal zuweisen"></a>`;
            }
        }
      } else {
        row += `<a class='lightbox-open btn btn-default btn-xs glyphicon glyphicon-user' href="/vehicles/${vehicle.id}/zuweisung" title="Personal zuweisen"></a>`;
      }
    }
    if (quantity < vehicleCount[vTypeID]) {
      row += `<a class='lightbox-open btn btn-info btn-xs glyphicon glyphicon-move' href="/vehicles/${vehicle.id}/move" title="Fahrzeug verschieben"></a>`;
    } else {
      row += `<a class='lightbox-open btn btn-default btn-xs glyphicon glyphicon-move' href="/vehicles/${vehicle.id}/move" title="Fahrzeug verschieben"></a>`;
    }
    if (vType?.canBeRefit === true) {
      row += `<a class='lightbox-open btn btn-default btn-xs glyphicon glyphicon-wrench' href="/vehicles/${vehicle.id}/refit" title="Fahrzeug umrüsten"></a>`;
    }
    row += `</div>`;
    row += `</td>`;


    // Cell rsm
    row += `<td class="text-center" style="vertical-align: middle; width: 5ch;">`;
    if (vehicle.fms_real === 6) {
      row += `<a title="Nicht einsatzbereit" class="building_list_fms building_list_fms_6" data-action='fsm' data-remote='true' href='/vehicles/${vehicle.id}/set_fms/2'><span>6</span></a>`; // style="background-color: #000; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold;"
      tags.fms6 = true
    }
    row += `</td>`;

    // Cell empty for spacing
    row += `<td></td>`;

    // Cell staff
    if (maxStaff > 0) {
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

  // Cell less vehicles
  const less = tags.inventory?.less;
  if (!less) return;
  Object.entries(less).forEach(([id, quantity]) => {
    const vTypeID = Number(id);
    const vType = getType({ vehicle_type: vTypeID }, vehicleTypes);
    const needUnlock = exTypes.findIndex(exType => exType.unlocksVehicleTypes?.includes(vTypeID));
    const isUnlocked = needUnlock !== -1 ? extensions.find(extension => extension.type_id === needUnlock) : true;
    for (let i = 0; i < quantity; i++) {
      let row = '';
      row += `<tr data-line='${rc++}' style="display: table; width: 100%; table-layout: fixed; opacity: 0.85;">`;
      row += `<td class="text-center" style="vertical-align: middle; width: 200px;">`;
      row += `<a class="btn btn-default btn-xs disabled">${vType.caption}</a>`;
      row += `</td>`;
      row += `<td style="width: 40ch;" class="text-center text-warning">`;
      if (isUnlocked) {
        row += `<a  data-remote='true' data-building='${building.id}' data-type='${vTypeID}' data-credits='vehicle'
          href="/buildings/${building.id}/vehicle/${building.id}/${vTypeID}/credits"
          style="color: inherit; text-decoration: none;">`;
        row += `Fahrzeug fehlt laut Vorlage`;
        row += `</a>`;
      } else {
        row += `Fahrzeug fehlt laut Vorlage`;
      }
      row += `</td>`;
      row += `</tr>`;
      $(tbody).append(row);
    }
  })
}

let currentFilterVehicles;
let vehicleMapBuildings;
async function renderPanelsVehicles(visibleBuildings) {
  const accordion = modal.accordionVehicles;
  accordion.replaceChildren();
  if (!visibleBuildings?.length) return;

  parkingLots();

  if (!vehicleMapBuildings || vehicleMapBuildings !== buildings) {
    const buildingIds = new Set(
      buildings.map(building => Number(building.id))
    );
    const minId = Math.min(...buildingIds);
    const maxId = Math.max(...buildingIds);
    vehicles = await getVehicles(
      false, 'building', IDBKeyRange.bound(minId, maxId), vehicle => buildingIds.has(Number(vehicle.building_id))
    );
    console.log(`${vehicles.length} vehicles loaded for buildings ${minId} to ${maxId}`);
    currentFilterVehicles = vehicles;
    vehicleMapBuildings = buildings;

    vehiclesByBuilding = new Map();
    vehicles.forEach(vehicle => {
      const bID = vehicle.building_id;
      if (!vehiclesByBuilding.has(bID)) {
        vehiclesByBuilding.set(bID, []);
      }
      vehiclesByBuilding.get(bID).push(vehicle);
    });
  }

  let countBuildings = 0;
  visibleBuildings.forEach(building => {
    countBuildings++;
    const bID = Number(building.id)
    const bCaption = building.caption;
    const bTypeID = Number(building.building_type);
    const bType = getType(building, buildingTypes);

    let containerLots = 0;
    let trailerLots = 0;
    let vehicleLots = bType?.startParkingLots;
    if (!vehicleLots) return;

    const tags = building.tags ? building.tags : building.tags = {};
    tags.missingVehicle = false;
    tags.moreVehicles = false;
    tags.assignedPersonnel = true;
    tags.needTraining = false;
    tags.fms6 = false;

    const vehiclesThisBuilding = vehiclesByBuilding.get(bID) || [];
    vehiclesThisBuilding.forEach(vehicle => {
      const vType = getType(vehicle, vehicleTypes);
      const maxStaff = vType.staff.max;
      const assigned = vehicle.assigned_personnel_count;
      const maxOverride = vehicle?.max_personnel_override;
      const max = maxOverride ?? maxStaff;
      const training = vType.staff?.training ? true : false;

      if (assigned < max) {
        tags.assignedPersonnel = false;
        if (training === true) { tags.needTraining = true; }
      }
      if (vehicle.fms_real === 6) { tags.fms6 = true; }
    });

    const exTypes = bType.extensions;
    const template = profileSelector(building)?.select;
    const planned = template?.vehicles ?? [];

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
      const typeId = type.id;
      const target = type.quantity || 0;
      const current = typeCounts[typeId] || 0;

      delete inventoryList[typeId];

      if (target === current) {
        inventory.ok[typeId] = current;
      } else if (target < current) {
        inventory.more[typeId] = current - target
        tags.moreVehicles = true;
      } else if (target > current) {
        inventory.less[typeId] = target - current
        tags.missingVehicle = true;
      }
    });

    vehicleLots += building.level;
    building.extensions.forEach(extension => {
      if (!extension?.available || !extension?.available_at) return;

      const exTypeID = Number(extension.type_id);
      const exType = getType(extension, exTypes);
      const givesParkingLots = exType.givesParkingLots;
      // if (!givesParkingLots) return; // erweiterung ohne parkingLots? z.B. Zellen

      const containerLot = parkingLots
        ?.containerLots[bTypeID][exTypeID] ?? false;
      const trailerLot = parkingLots
        ?.trailerLots[bTypeID][exTypeID] ?? false;
      const vehicleLot = parkingLots
        ?.vehicleLots[bTypeID][exTypeID] ?? false;

      if (containerLot) containerLots += containerLot;
      if (trailerLot) trailerLots += trailerLot;
      if (vehicleLot) vehicleLots += vehicleLot;
    });

    const panelId = `${prefix}-panel-vehicles-${bID}`
    const panelContentId = `${panelId}-content`;
    let panel = '';
    panel += `<div id='${panelId}' class='building-list building_searchable panel panel-default' data-building-id='${bID}'
                        search_attribute='${bCaption}' building_type_id='${bTypeID}' building_id='${bID}' dispatch_id='${building.leitstelle_building_id}'>`;
    panel += `  <div class="panel-heading row" building_id='${bID}' href='#${panelContentId}' data-toggle='collapse' aria-expanded='false' aria-controls='${panelContentId}'>`;
    panel += `    <div class='col-xs-6 col-sm-1 text-right'>`;
    panel += `      <a class='btn btn-default btn-xs disabled'>${bType.caption}</a>`;
    panel += `    </div>`;
    panel += `    <div class='col-xs-6 col-sm-2'>`;
    panel += `      <a class='lightbox-open' href='/buildings/${bID}'>${bCaption}</a>`;
    panel += `    </div>`;
    panel += `    <div class='col-xs-6 col-sm-1'>`;
    if (template?.name) {
      let templateText = template?.defaultProfile === true ? `default ${template.name}` : `${template.name}`
      panel += `          <small>${templateText}</small>`;
    } else {
      panel += `          <small>Keine Vorlage gefunden</small>`;
    }
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
    if (tags.missingVehicle === true && tags.moreVehicles === false) {
      panel += `    <span class='label label-warning'>Fahrzeuge fehlen</span>`;
    }
    if (tags.missingVehicle === true && tags.moreVehicles === true) {
      panel += `    <span class='label label-danger'>Fahrzeuge fehlen und sind zuviel</span>`;
    }
    if (tags.missingVehicle === false && tags.moreVehicles === true) {
      panel += `    <span class='label label-info'>Fahrzeuge überbestand</span>`;
    }
    panel += `    </div>`;
    panel += `    <div class='pull-right'>`;
    if (tags.missingVehicle) {
      panel += `      <button type="button" class='btn btn-success btn-xs' style='width: 18ch;' data-building-id="${building.id}">comming soon</button>`;
    }
    panel += `    </div>`;
    panel += `  </div>`;
    panel += `<div id='${panelContentId}' class='panel-collapse collapse' data-building-id='${bID}'>`;


    panel += `<div class='panel-body' building_id='${bID}'>`;
    panel += `  <div class='row list-container' style='display: flex; gap: 50px; width: 100%;'>`;

    panel += `    <div class='left-colum' style='flex:1;'>`;
    if (tags.missingVehicle === true) {
      panel += `    <h4>Fehlende Fahrzeuge</h4>`
      Object.entries(tags.inventory.less).forEach(([vTypeID, count]) => {
        panel += `  <ul style='flex: 1; padding-left: 20px; margin: 10px'>`;
        panel += `    <li>${count} x ${getType({ vehicle_type: Number(vTypeID) }, vehicleTypes).caption} </li>`;
        panel += `  </ul>`;
      });
    }
    panel += `    </div>`
    panel += `    <div class='middle-colum' style='flex:1;'>`;
    panel += `    <h4>Fahrzeug plannung</h4>`
    template?.vehicles?.forEach(item => {
      const vTypeID = item.id;
      const quantity = item.quantity;
      panel += `  <ul style='flex: 1; padding-left: 20px; margin: 10px'>`;
      panel += `    <li>${quantity} x ${getType({ vehicle_type: vTypeID }, vehicleTypes).caption}</li>`;
      panel += `  </ul>`;
    });

    panel += `    </div>`;
    panel += `    <div class='right-colum' style='flex:1;'>`;
    if (tags.moreVehicles === true) {
      panel += `    <h4>Fahrzeuge überbestand</h4>`
      Object.entries(tags.inventory.more).forEach(([vTypeID, count]) => {
        panel += `  <ul style='flex: 1; padding-left: 20px; margin: 10px'>`;
        panel += `    <li>${count} x ${getType({ vehicle_type: Number(vTypeID) }, vehicleTypes).caption}</li>`;
        panel += `  </ul>`;
      });
    }
    panel += `    </div>`
    panel += `  </div>`

    panel += `  <table class='table table-striped' id='vehicle_table_${bID}'>`;
    panel += `    <thead>`;
    panel += `      <tr class="tablesorter-headerRow" role="row" style='display: table; width: 100%; table-layout: fixed;'>`;
    panel += `        <th style='text-center' style='vertical-align: middle; width: 200px;'>Fahrzeugtyp</th>`;
    panel += `        <th class='text-center' style='vertical-align: middle; width: 40ch;'>Fahrzeug</th>`;
    panel += `        <th class='text-center' style='vertical-align: middle; width: 40ch;'>Anhänger</th>`;
    panel += `        <th class='text-center' style='vertical-align: middle; width: 200px;'></th>`;
    panel += `        <th></th>`;
    panel += `        <th class='text-center' style='vertical-align: middle; width: 5ch;'>FMS</th>`;
    panel += `        <th class='text-center' style='vertical-align: middle; width: 11ch;'>Besatzung</th>`;
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
async function renderTableBuildings(buildings) {
  const tbody = modal.buildingTableBody;
  currentFilterBuildings = buildings;
  const table = tbody.closest('table');

  tbody.replaceChildren();

  let count = 0;
  buildings.forEach(building => {
    count++;
    const bID = Number(building.id);
    const bCaption = building.caption;
    const selector = profileSelector(building);
    const template = selector.select;
    const profiles = selector.profiles;
    const bType = getType(building, buildingTypes);
    building.tags ? building.tags : building.tags = {};
    building.tags.withoutAssignment = false;
    building.tags.withoutAssignment = template.id === 'none';

    let row = `<tr style='display: table; width: 100%; table-layout: fixed;'>`;
    row += `<td class='digit-cell' data-digit=${bID} style='width: 3ch;'>`; // cell id -- tabelsorter
    row += `</td>`;

    row += `<td class='text-right' data-text='${bType.caption}' style='middle; width: 175px;'>`; // cell building Type -- tabelsorter
    row += `<a class='btn btn-default btn-xs disabled'>${bType.caption}</a>`;
    row += `</td>`;

    row += `<td style='width: 40ch;'>`; // cell building caption -- tabelsorter
    row += `<a class='lightbox-open' href='/buildings/${bID}'>${bCaption}</a>`;
    row += `</td>`;

    row += `<td style='width: 40ch;'>`; // cell dropdown


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
      if (template?.defaultProfile === true) {
        row += `default: ${template.name}`;
      } else {
        row += `keine Vorlage gefunden`;
      }
    }
    row += `</td>`;

    row += `<td class='text-center' style='width: 19ch;'>`; // cell level
    const level = building?.level ?? 0;
    const maxLevel = bType.maxLevel ?? 0;
    if (level >= 0 && maxLevel > 0) {
      row += `${level}`;
      if (level < maxLevel) {
        row += `<a class='btn btn-xs btn-danger disable_after_click'
          data-remote='true' data-building='${building.id}' data-level='${level}' data-credits='level'
                href='/buildings/${building.id}/expand_do/credits?level=${level}'>${level + 1}`;
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
    const exTypes = bType.extensions ?? [];
    const real = building.extensions ?? [];
    const plan = template.extensions;
    const planCount = countDuplicates(plan);
    const realCount = countDuplicates(real);
    building.tags.allExtensionsActiv = true;
    building.tags.missingExtension = false;
    exTypes.forEach((exType, exTypeID) => {
      if (!exType?.caption) { return; }
      const exTypeCaption = exType.caption;
      const planned = plan.find(item => item.id === exTypeID);
      const current = real.find(item => item.type_id === exTypeID);

      if (current) {
        if (current?.enabled === false) { // dead
          building.tags.allExtensionsActiv = false;
          row += `<a data-remote='true' data-method='post' data-building='${bID}' data-type='${exTypeID}' data-action='activate'
                  data-extension='${exTypeID}' href="/buildings/${bID}/extension_ready/${exTypeID}/${bID}">`;
          row += `<span title='${exTypeCaption ?? "caption nicht lesbar"}`;
          row += ` nicht aktiv`;
          row += `' class='label label-warning' style='font-size: 12px;'>`;
          row += `${exTypeID}</span>`;
          row += `</a>`;
        }
        if (current?.available_at) { // build
          const date = new Date(current.available_at);
          row += `<span title='${exTypeCaption}`;
          row += ` fertig am ${date.toLocaleString()}`;
          row += `' class='label label-info' style='font-size: 8px;'>`;
          row += `${exTypeID}</span>`;
        }
        if ((current?.enabled === true)
          && (current?.available === true)) {
          row += `<span title='${exTypeCaption}`;
          row += `' class='label label-success' style='font-size: 8px;'>`;
          row += `${exTypeID}</span>`;
        }
      }
      if (!current && !planned) {
        row += `<span title='${exTypeCaption}`;
        row += `' class='label label-default' style='font-size: 8px;'>`
        row += `${exTypeID}</span>`;
      }
      if (!current && planned) {
        if ((realCount[exTypeCaption] ?? 0) >= planCount[exTypeCaption]) {
          row += `<span title='${exTypeCaption}`;
          row += `' class='label label-default' style='font-size: 8px;'>`
          row += `${exTypeID}</span>`;
        } else {
          const requiredExtensions = exType.requiredExtensions ?? [];
          const requirementsMet = requiredExtensions.every(requiredTypeId =>
            real.some(extension => extension.type_id === requiredTypeId)
          );
          if (requirementsMet) {
            row += `<a data-remote='true' data-method='post' data-building='${bID}' data-credits='extension' data-type='${exTypeID}'
              href="/buildings/${bID}/extension/credits/${exTypeID}?redirect_building_id=${bID}">`
            row += `<span title='${exTypeCaption}`;
            const formatNumber = new Intl.NumberFormat(`${international[lang].langcode}`, { maximumFractionDigits: 0 });
            const credits = formatNumber.format(exType.credits)
            row += ` bauen für ${credits} dauer ${exType.duration}`;
            row += `' class='label label-danger' style='font-size: 12px'>`;
            row += `${exTypeID}</span>`;
            row += `</a>`;
          } else {
            row += `<span title='${exTypeCaption}`;
            row += `' class='label label-danger' style='font-size: 8px;'>`
            row += `${exTypeID}</span>`;
          }
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
    const personnelSetPoint = template.personnelSetPoint ?? null;
    building.tags.personnel_target = true;
    /*
    const hiring_automatic =
      building.hiring_automatic === false && building.personal_count_target
        ? false : undefined;
    building.personnel_target = true;
    */

    if (bType.startPersonnel >= 0) {
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
    ([, bType]) => bType.isDispatchCenter
  );
  const dispatchCenterBTypeID = Number(dispatchCenterTypeEntry[0]);
  if (Number.isFinite(dispatchCenterBTypeID)) {
    dispatchCenters = await getBuildings(false, 'type', dispatchCenterBTypeID);
    dispatchCenters.sort((a, b) => a.caption.localeCompare(b.caption));
  }
  const dispatch = () => {
    let string = `
        <select id='${prefix}-dispatchCenters'>
            <option value='none' selected disabled hidden>Leitstelle auswählen</option>
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
        if (international[lang].notSupportedBuildings.includes(type)) return;
        const bType = getType({ building_type: Number(type) }, buildingTypes);
        const caption = bType.caption;
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

  let dispathCenterID = 'none';
  let filter = 'all';
  area.addEventListener('change', async event => {
    const id = event.target.id;
    const value = event.target.value;
    if (id !== `${prefix}-dispatchCenters`
      && id !== `${prefix}-buildingCategories`) return;

    if (id === `${prefix}-dispatchCenters`) {
      dispathCenterID = value;
    }
    if (dispathCenterID === 'none') return;

    if (id === `${prefix}-buildingCategories`) {
      const group = buildingCategories[value];
      if (group) {
        filter = group.buildings;
      } else {
        filter = value;
      }
    }

    let data;
    if (Number(filter) === dispatchCenterTypeID) {
      buildings = await getBuildings(false, 'type', Number(filter));
    } else {
      if (dispathCenterID === 'all') {
        data = await getBuildings(false);
      } else {
        data = await getBuildings(false, 'dispatchCenter', Number(dispathCenterID));
      }
      if (filter !== 'all') {
        const active = Array.isArray(filter) ? filter : [Number(filter)]
        const filtered = data.filter(b => active.includes(b.building_type));
        data = filtered;
      }
      buildings = data.filter(building =>
        Number(building.building_type) !== dispatchCenterBTypeID
      );
      buildings.sort((a, b) => a.caption.localeCompare(b.caption));
    }

    if (modal.activeTab === 'buildings') {
      await renderTableBuildings(buildings);
    }
    if (modal.activeTab === 'vehicles') {
      await renderPanelsVehicles(buildings)
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
  const html = /* HTML */ `
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
            <div data-tab-controls='vehicles' style='display: none;'>
              <button type='button' data-action='filter-missingVehicle' class='btn btn-default btn-xs' style='width: 175px;'>
                Fahrzeuge fehlen
              </button>
              <button type='button' data-action='filter-moreVehicles' class='btn btn-default btn-xs' style='width: 175px;'>
                Fahrzeuge überbestand
              </button>
              <button type='button' data-action='filter-fms6' class='btn btn-default btn-xs' style='width: 175px;'>
                Fahrzeuge FMS 6
              </button>
              <button type='button' data-action='filter-assignedPersonnel' class='btn btn-default btn-xs' style='width: 175px;'>
                Personalzuweisung
              </button>
              <input type='checkbox' id='filter-onlyTraining' data-action='filter-vehicle-personnel'>
                <label for='filter-vehicle-personnel'>
                  Nur Fahrzeuge die Ausbildungen benötigen
                </label>
              </input>
            </div>
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
                    <th class='sorter-digit' style='vertical-align: middle; width: 3ch; background-position: right -1ch center;' title='alt - neu'>
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
              <div id='${prefix}-vehicle-accordion' class='panel-group' style='height: 100%; overflow-y: auto; overflow-x: hidden'>
              </div>
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
  </div>
  ` /* END HTML */;

  const dom = new DOMParser().parseFromString(html, 'text/html');
  const modal = dom.body.firstElementChild;
  document.body.append(modal);


  const accordionVehicles = modal.querySelector(`#${prefix}-vehicle-accordion`);
  $(accordionVehicles).on('show.bs.collapse', '.panel-collapse', async function () {
    const tbody = this.querySelector('tbody');

    if (!tbody || tbody.dataset.rendered === 'true') return;

    const bID = Number(this.dataset.buildingId);
    const building = buildings.find(item => Number(item.id) === bID);

    const vehiclesThisbuilding = vehiclesByBuilding.get(bID) ?? [];

    await renderVehicleRows(
      tbody,
      bID
    );
    tbody.dataset.rendered = 'true';
  });

  const buildingTableBody = modal.querySelector(`#${prefix}-buildings-table tbody`);
  buildingTableBody.addEventListener('change', event => {
    const select = event.target.closest(`select[data-action='profile-assignment']`);
    if (!select) return;
    const cell = select.closest('tr').querySelector('.digit-cell');
    const bID = Number(cell.dataset.digit);
    if (select.value === 'none') {
      delete assignments[bID];
    } else {
      assignments[bID] = select.value;
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
      await renderPanelsVehicles(buildings);
    }
    if (modal.activeTab === 'buildings') {
      await renderTableBuildings(buildings);
    }
  });

  modal.addEventListener('click', async event => {
    const link = event.target.closest(`a[data-credits], a[data-action='activate']`);
    const button = event.target.closest('[data-action]');
    if (link) {
      if (link.dataset.pending === 'true') {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      link.dataset.pending = 'true';
      return;
    }
    if (button?.dataset?.action === 'refresh-buildings') {
      if (modal.activeTab === 'buildings') {
        await renderTableBuildings(buildings);
      }
      if (modal.activeTab === 'vehicles') {
        await renderPanelsVehicles(buildings);
      }
    }

  });

  const functionArea = modal.querySelector(`#${prefix}-control`)
  const filterArea = modal.querySelector(`#${prefix}-filters`);
  filterArea.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]');
    if (!button || !modal.contains(button)) return;

    // tab equipment

    // tab vehicles
    if (button.dataset.action === 'filter-missingVehicle') {
      const missingVehicle = buildings.filter(building =>
        building.tags?.missingVehicle === true
      );
      await renderPanelsVehicles(missingVehicle);
    }
    if (button.dataset.action === 'filter-moreVehicles') {
      const moreVehicles = buildings.filter(building =>
        building.tags?.moreVehicles === true
      );
      await renderPanelsVehicles(moreVehicles);
    }
    if (button.dataset.action === 'filter-fms6') {
      const fms6Vehicles = buildings.filter(building =>
        building.tags?.fms6 === true
      );
      await renderPanelsVehicles(fms6Vehicles);
    }
    if (button.dataset.action === 'filter-assignedPersonnel') {
      const onlyTraining = filterArea.querySelector(
        '#filter-onlyTraining'
      ).checked;
      const assignedPersonnel = buildings.filter(building =>
        building.tags?.assignedPersonnel === false
        && (!onlyTraining || building.tags?.needTraining === true)
      );
      await renderPanelsVehicles(assignedPersonnel);
    }

    // tab buildings
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
        await renderTableBuildings(buildings);
      }
    }
    if (button.dataset.action === 'filter-unassigned') {
      const withoutAssignment = buildings.filter(building =>
        building.tags?.withoutAssignment === true);
      await renderTableBuildings(withoutAssignment);
    }
    if (button.dataset.action === 'filter-missing-extensions') {
      const missingExtensions = buildings.filter(building =>
        building.tags?.missingExtension === true);
      await renderTableBuildings(missingExtensions);
    }
    if (button.dataset.action === 'filter-inactive-extensions') {
      const inactiveExtensions = buildings.filter(building =>
        building.tags?.allExtensionsActiv === false);
      await renderTableBuildings(inactiveExtensions);
    }
    if (button.dataset.action === 'filter-personnel-target') {
      const personnelTarget = buildings.filter(building =>
        building.tags?.personnel_target === false
        && building.tags.withoutAssignment !== true);
      await renderTableBuildings(personnelTarget);
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
          const template = profileSelector(building)?.select;
          const personnelSetPoint = template?.personnelSetPoint;
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
      const hireAutomatic = buildings.filter(building =>
        building.hiring_automatic === false
        && building.personal_count_target !== 0
        && building.hire_phase === 0);
      await renderTableBuildings(hireAutomatic);
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
  });

  const footer = modal.querySelector(`#${prefix}-footer`);
  footer.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]');
    if (button?.dataset?.action === 'reload-buildings') {
      button.disabled = true;
      const status = modal.querySelector(`#${prefix}-textLastUpdateBuildings`);
      status.textContent = 'Lade Gebäudeliste ...';
      try {
        const updatedBuildings = await getBuildings(false, 'update');
        status.textContent = `Letztes Update: ${await showLastUpdate('buildings')}`;
        await renderTableBuildings(updatedBuildings);
      } finally {
        button.disabled = false;
        button.blur();
      }
    }
    if (button?.dataset?.action === 'reload-vehicles') {
      button.disabled = true;
      const status = modal.querySelector(`#${prefix}-textLastUpdateVehicles`);
      status.textContent = 'Lade Fahrzeugliste ...';
      try {
        const updatedVehicles = await getVehicles(false, 'update');
        let updatedBuildings = [];
        if (updatedVehicles.length > 0) {
          const buildingIds = new Set(
            updatedVehicles.map(vehicle => Number(vehicle.building_id))
          );
          updatedBuildings = buildings.filter(
            building => buildingIds.has(Number(building.id))
          );
        }
        status.textContent = `Letztes Update: ${await showLastUpdate('vehicles')}`;
        vehicleMapBuildings = null;
        await renderPanelsVehicles(updatedBuildings);
      } finally {
        button.disabled = false;
        button.blur();
      }
    }
  });

  const pendingLinks = new WeakMap();
  const links = ['/extension/credits/', '/extension_ready/', '/expand_do/credits', '/credits',];
  $(modal).on('ajax:beforeSend', `a[data-credits], a[data-action='activate']`, function (event, xhr, settings) {
    if (!links.some(link => settings.url.includes(link))) return;
    const row = this.closest('tr[data-line]');
    pendingLinks.set(xhr, {
      link: this,
      action: this.dataset.action,
      credits: this.dataset.credits,
      bID: Number(this.dataset.building),
      typeID: Number(this.dataset.type),
      line: row ? Number(row.dataset.line) : null,
    })
  });
  $(document).ajaxComplete(async function (event, xhr, settings) {
    if (!links.some(link => settings.url.includes(link))) return;
    const pending = pendingLinks.get(xhr);
    if (!pending) return;
    console.log('ajaxComplete', pending);
    if (xhr.status !== 200) {
      pending?.link?.removeAttribute('data-pending');
      console.error('Error: response not Ok');
      return;
    }

    const bID = pending.bID;
    const typeID = pending.typeID;
    const credits = pending.credits;
    const action = pending.action;

    const building = buildings.find(item => Number(item.id) === bID);
    if (!building) return;

    if (action === 'activate') {
      const exTypeID = typeID;
      const extension = building.extensions.find(item =>
        item.type_id === exTypeID);
      if (extension) extension.enabled = true;
    }

    if (credits === 'vehicle') {
      const status = modal.querySelector(
        `#${prefix}-textLastUpdateVehicles`
      );
      const previousText = status.textContent;
      const bCaption = building.caption ?? '';
      const vTypeID = typeID;
      const vCaption = getType({ vehicle_type: vTypeID }, vehicleTypes).caption;
      status.textContent = `Fahrzeug ${vCaption} in Gebäude ${bCaption} gekauft`;
      await delay(3500);
      status.textContent = previousText;
      return;
    }

    if (credits === 'extension') {
      const bType = getType(building, buildingTypes);
      const exTypeID = typeID;
      const exTypes = bType.extensions;
      const exType = getType({ type_id: exTypeID }, exTypes);
      const duration = exType.duration.match(/(\d+)/);
      const period = Number(duration[1]) * 24 * 60 * 60 * 1000;
      const latestDate = building.extensions.reduce((latest, ext) => {
        if (!ext.available_at) return latest;
        if (!latest) return ext;
        return new Date(ext.available_at) > new Date(latest.available_at) ? ext : latest;
      }, null);
      const finishedDate = latestDate ? new Date(lastetDate.available_at) : new Date();
      building.extensions.push({
        type_id: exTypeID,
        caption: exType.caption,
        available_at: date(finishedDate.getTime() + period),
      });
    }
    if (credits === 'level') {
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
  modal.filterArea = filterArea;
  modal.footer = footer;
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
