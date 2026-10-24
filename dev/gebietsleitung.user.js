// ==UserScript==
// @name            Gebietsleiter - Zentrale Leitstelle
// @namespace       papachaotica.leitstellenspiel.de
// @version         0.17.1.261024
// @description:de  Zentrale Verwaltung aller Gebäude und Fahrzeuge
// @author          papachaotica
// @homepage        https://github.com/papachaotica
// @match           https://leitstellenspiel.de
// @match           https://www.leitstellenspiel.de
// @exclude-match   https://forum.leitstellenspiel.de
// @require         https://raw.githubusercontent.com/papachaotica/LSS-Tools/dev/lib/indexedDB.js?v261024
// @require         https://raw.githubusercontent.com/papachaotica/LSS-Tools/dev/lib/api-fetch-database-handler.js?v261024
// @run-at          document-idle
// @license         AGPL-3.0-or-later
// ==/UserScript==

/*
 * [X] modal bauen
 * [x] Tab flexible hinzufügen
 * [x] Gebäudetabelle rendern mit Erweiterungen
 * [X] wechsel auf html sting
 * [x] Wachenbaupläne importieren
 * [x] Blueprint auf regex zuordnen oder Default setzen
 * [x] Blueprint auf Erweiterungen anwenden
 * [x] Manuelle Profil Zuordnung und persistent speichern
 * [x] Personal auf Ist/soll und personalSetpoint farblich markieren
 * [x] Tabelsorter für alt-neu(ID), Wachentyp, Wachennamen
 * [x] Leitstelle erkennen
 * [x] Auswahl dropdown auf Leitstelle Übergabe an renderTableBuildings
 * [p] Stellplätze ermitteln und verfügbare anzeigen
 * [_] manuell Abweichungen vom Profi freigeben mit Gültigkeitsverlust bei nächster Profiländerung
 * [_] Fahrzeuge Leitstelle zuordnen und Änderungen erkennen
 * [_] geplante Fahrzeuge vergleichen und Abweichungen anzeigen
 * [x] Lagergröße und verfügbar anzeigen
 * [_] Template Tabelle rendern
 * [_] Link zu CentralSettings bauen (Zugfahrzeug Zuordnung, DGL ELW GRTW Einstellungen)
 * [_] Equipment auf Machbarkeit prüfen
 * [_] renderTableVehicles (Design ausarbeiten)
 * [X] Erweiterungen aktivieren ermöglichen
 * [X] Erweiterungen kaufen ermöglichen
 * [X] Gekaufte Erweiterung nach erfolgreicher AJAX-Antwort in IndexedDB speichern
 * [_] Zähler gleicher Erweiterungen über type_id und Erweiterungstyp ermitteln
 * [_] AJAX-Ergebnis, Gebäude und Erweiterung vor dem Zugriff prüfen
 * [_] Kauf gegen Doppelklick absichern und Tabelle nach Erfolg aktualisieren
 * [_] change-Listener der Gebäudetabelle nur einmal registrieren
 * [_] Speichern-Buttontext mit textContent statt append setzen
 * [_] Zahlenformatierung für alle unterstützten Spielsprachen abfangen
 * [_] Werte in Tabellen-HTML vor dem Einfügen escapen
 * [_] Ereignisparameter im Menü-Click-Handler explizit übernehmen
 * [_] storage_upgrades vor dem Zugriff prüfen
 */

const defaults = {
  '1': {
    caption: "Feuerwehrschule",
    extensions: [
      {id: 0, name: "Weiterer Klassenraum"},
      {id: 1, name: "Weiterer Klassenraum"},
      {id: 2, name: "Weiterer Klassenraum"},
    ],
  },
  '3': {
    caption: "Rettungsschule",
    extensions: [
      {id: 0, name: "Weiterer Klassenraum"},
      {id: 1, name: "Weiterer Klassenraum"},
      {id: 2, name: "Weiterer Klassenraum"},
    ],
  },
  '4': {
    caption: "Krankenhaus",
    extensions: [
      {id: 0, name: "Allgemeine Innere"},
      {id: 1, name: "Allgemeine Chirurgie"},
      {id: 2, name: "Gynäkologie"},
      {id: 3, name: "Urologie"},
      {id: 4, name: "Unfallchirurgie"},
      {id: 5, name: "Neurologie"},
      {id: 6, name: "Neurochirurgie"},
      {id: 7, name: "Kardiologie"},
      {id: 8, name: "Kardiochirurgie"},
    ],
    targetLevel: 20,
  },
  '8': {
    caption: "Polizeischule",
    extensions: [
      {id: 0, name: "Weiterer Klassenraum"},
      {id: 1, name: "Weiterer Klassenraum"},
      {id: 2, name: "Weiterer Klassenraum"},
    ],
  },
  '10': {
    caption: "THW Bundesschule",
    extensions: [
      {id: 0, name: "Weiterer Klassenraum"},
      {id: 1, name: "Weiterer Klassenraum"},
      {id: 2, name: "Weiterer Klassenraum"},
    ],
  },
  '27': {
    caption: "Schule für Seefahrt und Seenotrettung",
    extensions: [
      {id: 0, name: "Weiterer Klassenraum"},
      {id: 1, name: "Weiterer Klassenraum"},
      {id: 2, name: "Weiterer Klassenraum"},
    ],
  },
};


//////////////////////////////////////////////////////////////////////////////

'use strict'

const prefix = "gl";
const scriptName = "Gebietsleitung - Zentrale Leitstelle";
const version = "0.17.1.261024";

const lang = I18n.locale ? I18n.locale : 'de_DE';
const langcode = {
  'de_DE': 'de-DE'
}

let buildings;
let buildingTypes;
let dispatchCenters;
let templates;
let assignments;
let vehicles;
let vehicleTypes;

let modal;

async function refreshBuildings(value = dispathCenter) {
    let data;
    if (value === 'none') { return; }
    if (value === 'all') {
      data = await getBuildings(false);
    } else {
      data = await getBuildings(false, 'dispatchCenter', Number(value));
    }
    buildings = data.filter(building =>
      building.building_type !== dispatchCenterType);
    await renderTableBuildings(buildings);
}

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
    } else {
      select = defaults[building.building_type];
      if (select) {
        defaultProfile = true;
      }
    }
    return { select, profiles, defaultProfile };
}

async function renderTableBuildings(buildings) {
    const table = tableBuildings.table;
    const tbody = tableBuildings.tableBody;

    tbody.replaceChildren();

    buildings.forEach(building => {
        if (building.id === 'lastUpdate') { return; }
        const buildingType = buildingTypes[building.building_type];
        let parkingLots = buildingType?.startParkingLots + building.level;

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
        let template = selector.select;
        building.withoutAssignment = false;

        if (profiles.length > 0) {
          row += `<select style='width: 100%;'>`;
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
          if (selector.defaultProfile === true) {
            row += `default Profil gewählt`;
          } else {
            row += `keine Vorlage gefunden`;
          }
        }
        if (!template) {
          building.withoutAssignment = true;
          template = { id: 'none', extensions: [], vehicles: [] };
        }
        building.template = template;
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
        building.allExtensionsActiv = true;
        building.missingExtension = false;
        types.forEach((type, index) => {
            if (!type?.caption) { return; }
            const caption = type.caption;
            const planned = plan.find(item => item.id === index);
            const current = real.find(item => item.type_id === index);

            if (current) {
              const givesParkingLots = type.givesParkingLots ?? 0;
              parkingLots = parkingLots + givesParkingLots;
              if (current?.enabled === false) { // dead
                building.allExtensionsActiv = false
                row += `<a data-remote='true' data-method='post' data-building='${building.id}' data-link-tag='activate'
                  data-extension='${index}' href="/buildings/${building.id}/extension_ready/${index}/${building.id}">`
                row += `<span title='${caption ?? "caption nicht lesbar"}`;
                row += ` nicht aktiv`;
                row += `' class='label label-warning' style='font-size: 12px;'>`;
                row += `${index}</span>`;
                row += `</a>`;
              }
              if (current?.available_at) { // build
                const date = new Date(current.available_at);
                row += `<span title='${caption ?? "caption nicht lesbar"}`;
                row += ` fertig am ${date.toLocaleString()}`;
                row += `' class='label label-info' style='font-size: 8px;'>`;
                row += `${index}</span>`;
              }
              if ((current?.enabled === true)
                  && (current?.available === true)) {
                row += `<span title='${caption ?? "caption nicht lesbar"}`;
                row += `' class='label label-success' style='font-size: 8px;'>`;
                row += `${index}</span>`;
              }
            }
            if (!current && !planned) {
              row += `<span title='${caption ?? "caption nicht lesbar"}`;
              row += `' class='label label-default' style='font-size: 8px;'>`
              row += `${index}</span>`;
            }
            if (!current && planned) {
              if ((realCount[caption] ?? 0) >= planCount[caption]) {
                row += `<span title='${caption ?? "caption nicht lesbar"}`;
                row += `' class='label label-default' style='font-size: 8px;'>`
                row += `${index}</span>`;
              } else {
                row += `<a data-remote='true' data-method='post' data-building='${building.id}' data-link-tag='credits'
                  data-extension='${index}' href="/buildings/${building.id}/extension/credits/${index}?redirect_building_id=${building.id}">`
                row += `<span title='${caption ?? "caption nicht lesbar"}`;
                const formatNumber = new Intl.NumberFormat(`${langcode[lang]}`, {maximumFractionDigits: 0});
                const credits = formatNumber.format(type.credits)
                row += ` bauen für ${credits} dauer ${type.duration}`;
                row += `' class='label label-danger' style='font-size: 12px'>`;
                row += `${index}</span>`;
                row += `</a>`;
                building.missingExtension = true;
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

        row += `<td class='text-center' style='width: 13ch;'>`; // cell parkingslots
        row += Number.isInteger(parkingLots) ? parkingLots : "";
        row += `</td>`;

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
        const personnelSetPoint = template ? template.personnelSetPoint : null;
        building.personnel_target = true;

        if (buildingType?.startPersonnel >= 0) {

          if (personnelCount === personnelTarget) {
            if (personnelSetPoint === personnelTarget) { // succes = green
              row += `<td class='text-success text-center' style='width: 11ch;'>`;
            }
            if (personnelSetPoint !== personnelTarget) { // info
              row += `<td title="SetPiont konnte nicht festegellt werden" class='text-info text-center' style='width: 11ch;'>`
              building.personnel_target = false;
            }
            row += `${personnelCount}`;
          }
          if (personnelCount !== personnelTarget) { // warning = orange
            if (personnelSetPoint === personnelTarget) {
              row += `<td title="Diese Wache ist noch nicht voll" class='text-warning text-center' style='width: 11ch;'>`;
            }
            if (personnelSetPoint !== personnelTarget) { // danger = red
              row += `<td title="SetPiont konnte nicht festegellt werden" class='text-danger text-center' style='width: 11ch;'>`;
              building.personnel_target = false;
            }
            row += `${personnelCount} / ${personnelTarget}`;
          }
        } else {
          row += `<td style='width: 11ch;'>`;
        }
        row += `</td>`;
        row += `</tr>`;
        $(tbody).append(row);
    });
    $(table).trigger('update');

    const allDropdowns = document.querySelectorAll('table select');

    tbody.addEventListener('change', event => {
        const value = event.target.value;
        const row = event.target.closest('tr');
        const cell = row.querySelector('.digit-cell');
        const building = parseInt(cell.dataset.digit, 10);
        if (value === 'none') {
          delete assignments[building];
        } else {
          assignments[building] = value;
        }
    });
}

let tableVehicles;
async function addTabVehicles() {
    const paneId = `${prefix}-tab-vehicles`

    const tabLi = document.createElement('li')
    tabLi.setAttribute('role', 'presentation');

    const tabLink = document.createElement('a');
    tabLink.href = `#${paneId}`;
    tabLink.setAttribute('aria-controls', paneId);
    tabLink.setAttribute('role', 'tab');
    tabLink.setAttribute('data-toggle', 'tab');
    const text = "Fahrzeuge";
    tabLink.append(text);

    tabLi.append(tabLink);
    modal.tabList.append(tabLi);

    const tabPane = document.createElement('div');
    tabPane.id = paneId;
    tabPane.classList.add('tab-pane', 'active');
    tabPane.setAttribute('role', 'tabpanel');

    modal.tabContent.append(tabPane);


    const updateVehicles = document.createElement('span');
    updateVehicles.id = `${prefix}-textLastUpdateVehicles`;
    updateVehicles.textContent = `Lade Fahrzeugliste ...`;

    let lastupdateVehicles = await showLastUpdate('vehicles');
    updateVehicles.textContent = `Letztes update: ${lastupdateVehicles}`;

    const reloadButtonVehicles = document.createElement('button');
    reloadButtonVehicles.classList.add('btn', 'btn-default', 'btn-xs');
    reloadButtonVehicles.addEventListener('click', async () => {
        reloadButtonVehicles.disabled = true;
        updateVehicles.textContent = " Lade Fahrzeugliste ..."
        await getVehicles(true);
        lastupdateVehicles = await showLastUpdate('vehicles');
        await delay(1000);
        updateVehicles.textContent = ` Letztes update: ${lastupdateVehicles}`;
        reloadButtonVehicles.disabled = false;
        reloadButtonVehicles.blur();
    });
    reloadButtonVehicles.id = `${prefix}-reloadBuildingsButton`;
    reloadButtonVehicles.append("Fahrzeuge neuladen");


    $(tabLink).on('shown.bs.tab', () => {
        //modal.filterArea.replaceChildren();
        modal.footer.replaceChildren(
          reloadButtonVehicles,
          updateVehicles
        );
    });
}

let tableBuildings;
async function createTabBuildings() {
    const paneId = `${prefix}-tab-buildings`

    const tabLi = document.createElement('li')
    tabLi.setAttribute('role', 'presentation');
    tabLi.classList.add('active');

    const tabLink = document.createElement('a');
    tabLink.href = `#${paneId}`;
    tabLink.setAttribute('aria-controls', paneId);
    tabLink.setAttribute('role', 'tab');
    tabLink.setAttribute('data-toggle', 'tab');
    tabLink.append("Gebäude");


    tabLi.append(tabLink);
    modal.tabList.append(tabLi);

    const tabPane = document.createElement('div');
    tabPane.id = paneId;
    tabPane.classList.add('tab-pane', 'active');
    tabPane.setAttribute('role', 'tabpanel');
    tabPane.style.height = '100%';
    tabPane.style.minHeight = '0';

    modal.tabContent.append(tabPane);

    const saveButtonProfiles = document.createElement('button');
    saveButtonProfiles.classList.add('btn', 'btn-default', 'btn-xs');
    saveButtonProfiles.style.width = '175px';
    saveButtonProfiles.append("Vorlagen zuordnung speichern");
    saveButtonProfiles.id = `${prefix}-saveProfileButton`;
    saveButtonProfiles.addEventListener('click', async () => {
        saveButtonProfiles.disabled = true;
        saveButtonProfiles.blur();
        const data = { assignments };
        await saveKey(data, 'main', configDB, 'templates');
        await delay(1500);
        saveButtonProfiles.append = "Erfolgreich gespeichert";
        saveButtonProfiles.disabled = false;
        saveButtonProfiles.append = "Vorlagen zuordnung speichern";
    });

    const filterButtonProfiles = document.createElement('button');
    filterButtonProfiles.classList.add('btn', 'btn-default', 'btn-xs');
    filterButtonProfiles.style.width = '175px';
    filterButtonProfiles.append("Wachen ohne Profil anzeigen ");
    filterButtonProfiles.id = `${prefix}-filterButtonProfiles`;
    filterButtonProfiles.addEventListener('click', async () => {
        const withoutAssignment = buildings.filter(building =>
          building.withoutAssignment === true);
        renderTableBuildings(withoutAssignment);
    });

    const filterButtonExtensionMissing = document.createElement('button');
    filterButtonExtensionMissing.classList.add('btn', 'btn-default', 'btn-xs');
    filterButtonExtensionMissing.style.width = '175px';
    filterButtonExtensionMissing.append("Fehlende Erweiterungen");
    filterButtonExtensionMissing.id = `${prefix}-filterButtonExtensionMissing`;
    filterButtonExtensionMissing.addEventListener('click', async () => {
        const extensionMissing = buildings.filter(building =>
          building.missingExtension === true);
        renderTableBuildings(extensionMissing);
    });
    const filterButtonNotActiv = document.createElement('button');
    filterButtonNotActiv.classList.add('btn', 'btn-default', 'btn-xs');
    filterButtonNotActiv.style.width = '175px';
    filterButtonNotActiv.append("Erweiterung nicht aktiv");
    filterButtonNotActiv.titel = "Aktivieren direkt auf den Gelben Button klicken";
    filterButtonNotActiv.id = `${prefix}-filterButtonExtensionNotActiv`;
    filterButtonNotActiv.addEventListener('click', async () => {
        const allExtensionsActiv = buildings.filter(building =>
          building.allExtensionsActiv === false);
        renderTableBuildings(allExtensionsActiv);
    });

    const filterButtonPersonnel = document.createElement('button');
    filterButtonPersonnel.classList.add('btn', 'btn-default', 'btn-xs');
    filterButtonPersonnel.style.width = '175px';
    filterButtonPersonnel.append("Abweichendes Personalsoll");
    filterButtonPersonnel.title = "Achtung es werden nur Gebäude mit einem Profil angezeigt";
    filterButtonPersonnel.id = `${prefix}-filterButtonPersonnel`;
    filterButtonPersonnel.addEventListener('click', async () => {
        const personnelSetPoint = buildings.filter(building =>
          building.personnel_target === false
            && building.withoutAssignment !== true);
        renderTableBuildings(personnelSetPoint);
    });

    const updateBuildings = document.createElement('span');
    updateBuildings.id = `${prefix}-textLastUpdateBuildings`;
    updateBuildings.textContent = `Lade Gebäudeliste ...`;

    let lastupdateBuildings = await showLastUpdate('buildings');
    updateBuildings.textContent = ` Letztes update: ${lastupdateBuildings}
        der update Button zeigt nur Gebäude die sich in den letzen 24 Stunden verändert haben!`;

    const reloadButtonBuildings = document.createElement('button');
    reloadButtonBuildings.classList.add('btn', 'btn-default', 'btn-xs');
    reloadButtonBuildings.addEventListener('click', async () => {
        reloadButtonBuildings.disabled = true;
        updateBuildings.textContent = " Lade Gebäudeliste ..."
        console.log(Number(dispathCenter))
        const fetch = await getBuildings(false, 'update');
        lastupdateBuildings = await showLastUpdate('buildings');
        await delay(1000);
        updateBuildings.textContent = ` Letztes update: ${lastupdateBuildings}
            der update Button zeigt nur Gebäude die sich in den letzen 24 Stunden verändert haben!`;
        reloadButtonBuildings.disabled = false;
        reloadButtonBuildings.blur();
        renderTableBuildings(fetch);
    });
    reloadButtonBuildings.id = `${prefix}-reloadBuildingsButton`
    reloadButtonBuildings.append("Gebäude neuladen");

    //    modal.functionArea.append()
    modal.filterArea.append(
      saveButtonProfiles,
      filterButtonProfiles,
      filterButtonExtensionMissing,
      filterButtonNotActiv,
      filterButtonPersonnel,
    );
    modal.footer.append(reloadButtonBuildings, updateBuildings);

    const table = document.createElement('table');
    table.classList.add('table', 'table-striped', 'tablesorter', 'tablesorter-default');
    table.id = `${prefix}-buildings-table`;
    table.style.width = '100%';
    table.style.display = 'flex';
    table.style.flexDirection = 'column';
    table.style.height = '100%';
    table.style.minHeight = '0';
    table.style.marginBottom = '0';
    const thead =
    /* HTML */`
    <thead style='display: block; flex; 0 0 auto;'>
        <tr style='display: table; width: 100%; table-layout: fixed;'>
            <th class='sorter-digit' style='vertical-align: middle; width: 3ch; background-position: right -1ch center;' title='alt - neu'>
            </th> <!-- tabelsorter -->
            <th class='text-center' style='vertical-align: middle; width: 175px;'>Wachentyp</th> <!-- tabelsorter -->
            <th class='text-center' style='vertical-align: middle; width: 40ch;'>Wache</th> <!-- tabelsorter -->
            <th class='sorter-false' style='vertical-align: middle; width: 40ch;'></th>
            <th class='sorter-false text-center' style='vertical-align: middle;'>Erweiterungen</th>
            <!--<th class='sorter-false' style='width: 60px;'></th>-->
            <th class='sorter-false text-center' style='vertical-align: middle; width: 13ch;'>Stellplätze
                <small style='font-weight: normal;'> Fzg - Anh - AB</small>
            </th>
            <th class='sorter-false text-center' style='vertical-align: middle; width: 11ch;'>Lager</th>
            <th class='sorter-false text-center' style='vertical-align: middle; width: 11ch;'>Personal</th>
        </tr>
    </thead> `
    /* END HTML */

    const tableBody = document.createElement('tbody');
    tableBody.style.display = 'block';
    tableBody.style.minHeight = '0';
    tableBody.style.overflowY = 'auto';
    tableBody.style.width = '100%';
    tableBody.style.boxSizing = 'border-box';

    $(table).append(thead);
    table.append(tableBody);
    tabPane.append(table);

    $(table).tablesorter({
      textExtraction: {
        0: function(node) {
            return $(node).attr('data-digit')
        }
      },
      headers: {
        0: { sorter: 'digit' },
        1: { sorter: 'text' },
        2: { sorter: 'text' },
      }
    });
    $(tabLink).on('shown.bs.tab', () => {
        /*modal.filterAreaArea.replaceChildren(
            saveButtonProfiles,
            filterButtonProfiles,
            filterButtonExtensionMissing,
            filterButtonNotActiv,
        );*/
        modal.footer.replaceChildren(reloadButtonBuildings, updateBuildings);
    });

    $(document).ajaxComplete(async function(event, xhr, settings) {
        if (!settings.url.includes('/extension/credits/')
            && !settings.url.includes('/extension_ready/')
        ) return;

        const match = settings.url.match(
          /\/buildings\/(\d+)\/extension(?:_ready|\/credits)\/(\d+)(?:[\/?].*)?/
        );
        const id = Number(match[1]); // building id
        const type_id = Number(match[2]); // extension type_id
        const building = buildings.find(b => b.id === id);

        // /buildings/building.id/extension_ready/type_id/.*
        if ((settings.url.includes('/extension_ready')) && (xhr.status === 200)) {
          const index = building.extensions.findIndex(i =>
            i.type_id === type_id);
          building.extensions[index].enabled = true;
          await saveKey(building, 'buildings', configDB);
          console.log('extension aktiviert')
        }

        // /buildings/building.id/extension/credits/type_id?redirect_building_id=.*
        if ((settings.url.includes('/extension/credits/')) && (xhr.status === 200)){
          const buildingType = buildingTypes[building.building_type];
          const extensionType = buildingType.extensions[type_id];
          const duration = extensionType.duration.match(/(\d+)/);
          const period = Number(duration[1]) * 24 * 60 * 60 * 1000;
          const completion_date = date((Date.now() + period))
          const extension = {
            type_id,
            caption: extensionType.caption,
            available_at: completion_date
          }
          building.extensions.push(extension);
          await saveKey(building, 'buildings', configDB);
        }
    });
    return { table, tableBody, };
}

let dispathCenter;
let dispatchCenterType;
async function filterDispatchCenters() {
    buildings = [];
    dispatchCenterType = Object.entries(buildingTypes).find(
      ([, buildingType]) => buildingType.isDispatchCenter
    );
    dispatchCenterType = Number(dispatchCenterType[0]);
    if (dispatchCenterType) {
      dispatchCenters = await getBuildings(false, 'type', dispatchCenterType);
      dispatchCenters.sort((a, b) => a.caption.localeCompare(b.caption));

    }
    const dropdown = document.createElement('select');
    dropdown.id = `${prefix}-filter-dispatchCenters`;
    const emptyValue = document.createElement('option');
    emptyValue.value = 'none';
    emptyValue.textContent = "Leitstelle auswählen"
    dropdown.appendChild(emptyValue);
    const allValue = document.createElement('option');
    allValue.value = 'all';
    allValue.textContent = "alle Gebaude";
    dropdown.appendChild(allValue);
    dropdown.addEventListener('change', async event => {
        dispathCenter = event.target.value;
        await refreshBuildings(dispathCenter);
    });
    dispatchCenters.forEach(building => {
        const option = document.createElement('option');
        option.textContent = building.caption;
        option.value = building.id;
        dropdown.appendChild(option);
    });

    const refreshButton = document.createElement('span');
    refreshButton.classList.add('btn', 'btn-default', 'btn-xs', 'glyphicon', 'glyphicon-refresh');
    refreshButton.addEventListener('click', async () => {
        await refreshBuildings(dispathCenter);
    });

    modal.functionArea.append(dropdown, refreshButton)
}

async function initialize() {
    templates = await caseOfCaddy('BosErnie_StationBlueprints', 'main', 'blueprints');
    templates = templates !== undefined ? Object.values(templates) : [];

    await initDB(configDB);

    buildingTypes = await getBuildingTypes(I18n.locale)

    vehicleTypes = await getVehicleTypes(I18n.locale)

    const blueprints = await readKey('templates', 'main', configDB)
    assignments = blueprints ? blueprints.assignments ? blueprints.assignments
      : assignments = {} : assignments = {};

}

function createModal() {
    const html =
    /* HTML */ `
            <div class='modal fade' id='${prefix}-modal' tabindex='-1' role='dialog' aria-labelledby='${prefix}-title'>
                <div class="modal-content" style="height: 100%; display: flex; flex-direction: column;">
                    <div class="modal-header" style="display: flex; align-items: center; justify-content: space-between; position: relative;">
                        <button type="button" class="close" data-dismiss="modal" aria-label="close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                        <h4 class="modal-title" id="${prefix}-title" style="flex-grow: 1; text-align: center; margin: 0">${scriptName}</h4>
                    </div>
                    <div class="modal-body" style="max-height: none; flex: 1 1 auto; overflow-y: auto;">
                        <div id="${prefix}-control" style="min-height: 50px;"></div>
                        <div id="${prefix}-filters" style="min-height: 25px;"></div>
                        <ul class="nav nav-tabs" role="tablist" id="${prefix}-tabs"></ul>
                        <div class="tab-content" style="padding-top: 15px;"></div>
                    </div>
                    <div class="modal-footer" style="text-align: left;"></div>
                </div>
            </div>
    `;/* END HTML */
    const modal = document.createElement('div');
    modal.id = `${prefix}-modal`;
    modal.classList.add('modal', 'fade');
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', `${prefix}-title`);

    const dialog = document.createElement('div');
    dialog.classList.add('modal-dialog');
    dialog.setAttribute('role', 'document');
    dialog.style.width = '95%';
    dialog.style.height = '90vh';
    dialog.style.margin = '7vh auto 3vh auto';

    const content = document.createElement('div');
    content.classList.add('modal-content');
    content.style.height = '100%';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';

    const header = document.createElement('div');
    header.classList.add('modal-header');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.position = 'relative';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.classList.add('close');
    closeButton.setAttribute('data-dismiss', 'modal');
    closeButton.setAttribute('aria-label', 'close');

    const closeIcon = document.createElement('span');
    closeIcon.setAttribute('aria-hidden', 'true');
    closeIcon.append('×');

    closeButton.append(closeIcon);

    const versionSpan = document.createElement('span');
    versionSpan.style.fontSize = '0.8em';
    versionSpan.style.fontWeight = 'normal';
    versionSpan.style.whiteSpace = 'nowrap';
    versionSpan.append(`v${version}`);

    const rightContainer = document.createElement('div');
    rightContainer.style.display = 'flex';
    rightContainer.style.alignItems = 'center';
    rightContainer.style.gap = '15px';
    rightContainer.style.position = 'absolute';
    rightContainer.style.right = '15px';
    rightContainer.style.top = '50%';
    rightContainer.style.transform = 'translateY(-50%)';

    rightContainer.append(versionSpan, closeButton);

    const title = document.createElement('h4');
    title.id = `${prefix}-title`;
    title.classList.add('modal-title');
    title.style.textAlign = 'center';
    title.style.flexGrow = '1'

    title.append(scriptName);

    header.append(title, rightContainer);

    const body = document.createElement('div');
    body.classList.add('modal-body');
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.minHeight = '0';
    body.style.maxHeight = 'none';
    body.style.flex = '1 1 auto';
    body.style.overflowY = 'hidden';

    const functionArea = document.createElement('div');
    functionArea.id = `${prefix}-control`;
    functionArea.style.minHeight = '50px';

    body.append(functionArea);

    const filterArea = document.createElement('div');
    filterArea.id = `${prefix}-filters`;
    filterArea.style.minHeight = '25px';

    body.append(filterArea);

    const tabList = document.createElement('ul');
    tabList.className = 'nav nav-tabs';
    tabList.setAttribute('role', 'tablist');
    tabList.id = `${prefix}-tabs`;

    const tabContent = document.createElement('div');
    tabContent.classList.add('tab-content');
    tabContent.style.paddingTop = '15px';
    tabContent.style.flex = '1 1 0';
    tabContent.style.minHeight = '0';
    tabContent.style.overflow = 'hidden';

    body.append(tabList, tabContent);

    const footer = document.createElement('div');
    footer.classList.add('modal-footer');
    footer.style.textAlign = 'left';

    content.append(header, body, footer);
    dialog.append(content);
    modal.append(dialog);

    document.body.append(modal);

    return {
      modal,
      body,
      functionArea,
      filterArea,
      tabList,
      tabContent,
      footer,
    };

}

if ( ! document.querySelector(`#${prefix}-menu`)) {
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
    'click', async () => {
        event.preventDefault();
        await initialize();

        if (!modal) {
          modal = createModal();
          await filterDispatchCenters();
          await addTabVehicles();
          tableBuildings = await createTabBuildings();
        }
        $(modal.modal).modal('show');
    });
  divider.before(triggerLi);
};
//if (document.querySelector(`#${prefix}-menu`)) { document.querySelector(`#${prefix}-menu`).click(); };
