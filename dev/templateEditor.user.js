// ==UserScript==
// @name            [ LSS ] Profil Editor
// @namespace       papachaotica.leitstellenspiel.de
// @version         0.0.0.261112
// @description:de  Erstellung und Bearbeitung von Profilen für den Gebietsleiter
// @author          papachaotica
// @homepage        https://github.com/papachaotica
// @match           https://leitstellenspiel.de
// @match           https://www.leitstellenspiel.de
// @exclude-match   https://forum.leitstellenspiel.de
// @require         https://raw.githubusercontent.com/papachaotica/LSS-Tools/dev/lib/indexedDB.js?v261112
// @require         https://raw.githubusercontent.com/papachaotica/LSS-Tools/dev/lib/api-fetch-database-handler.js?v261112
// @run-at          document-idle
// @license         AGPL-3.0-or-later
// ==/UserScript==

/*
 * [_] modal bauen
 */


//////////////////////////////////////////////////////////////////////////////

'use strict'

const prefix = "te";
const scriptName = "Profil Editor";
const version = "0.0.0.261112";

const lang = I18n.locale ? I18n.locale : 'de_DE';

const international = {
  'de_DE': {
    langcode: 'de-DE',
    notSupported: { buildings: [ 7, 16, 22, 23, ], },
    vehicles: { hooklifts: [ 46, ], },
  },
};

let assignments;
let blueprints;
let buildingCategories;
let buildingTypes;
let templates;
let vehicleTypes;

const parkingLots = () => {
    if (!parkingLots?.containers) {
      const hooklifts = international[lang].vehicles.hooklifts;

      const containers = Object.entries(vehicleTypes).filter(([_, c]) =>
    c.tractiveVehicles?.some(id => hooklifts.includes(id)))
        .map(([typeId, _]) => parseInt(typeId, 10));

      const trailers = Object.entries(vehicleTypes).filter(([typeId, v]) =>
        v.isTrailer === true && !containers.includes(parseInt(typeId, 10)))
        .map(([typeId, _]) => parseInt(typeId, 10));

      const vehicle = {};
      const trailer = {};
      const container = {};
      const total = {};

      Object.entries(buildingTypes).forEach(([bType, building]) =>{
          const vehicleLots = {};
          const trailerLots = {};
          const containerLots = {};
          const totalLots = {};

          building.extensions.forEach((extension, eIndex) => {
              const givesParkingLots = extension?.givesParkingLots ?? 0;
              if (!givesParkingLots) return;

              const unlocksVehicleTypes = extension.unlocksVehicleTypes ?? [];
              let containerCount = 0;
              let trailerCount = 0;
              let classified = false;

              if (unlocksVehicleTypes.length
                && unlocksVehicleTypes.every(id => containers.includes(id))) {
                containerCount = givesParkingLots;
                classified = true;
              }
              if (unlocksVehicleTypes.length
                && unlocksVehicleTypes.every(id => trailers.includes(id))) {
                trailerCount = givesParkingLots;
                classified = true;
              }

              if (!classified) {
                (extension.parkingLotReservations
                    ?? []).forEach(reservation => {
                    if (!reservation.length) return;
                    if (reservation.every(id => containers.includes(id))) {
                      containerCount++;
                    }
                });
              }

              const vehicleCount = givesParkingLots - containerCount

              if (vehicleCount > 0) vehicleLots[eIndex] = vehicleCount;
              if (trailerCount > 0) trailerLots[eIndex] = trailerCount;
              if (containerCount > 0) containerLots[eIndex] = containerCount;
              totalLots[eIndex] = givesParkingLots;
          });
          vehicle[bType] = vehicleLots;
          trailer[bType] = trailerLots;
          total[bType] = totalLots;
          container[bType] = containerLots;
      });
      Object.assign(parkingLots, {
        hooklifts,
        containers,
        container,
        trailer,
        total,
        vehicle,
      });
    }
    return parkingLots;
};

function openDynamicTab(id, name) {
    const tabId = `tab-item-${id}`;
    const tabList = document.getElementById('modalTabList');
    const tabContent = document.getElementById('modalTabContent');

    // 1. Prüfen, ob der Tab für dieses Element bereits existiert
    const existingTab = document.getElementById(`link-${tabId}`);
    if (existingTab) {
    // Wenn er existiert, einfach aktivieren (Bootstrap 3 jQuery-Trigger)
      $(existingTab).tab('show');
      return;
    }

    // 2. Inhalt für das Pane festlegen (Unterscheidung zwischen "Neu" und "Bearbeiten")
    let formContent = '';
    if (id === 'new') {
      formContent = `
      <h4>Neues Listenelement anlegen</h4>
      <div class="form-group">
        <label>Name:</label>
        <input type="text" class="form-control" placeholder="Name eingeben...">
      </div>
      <button class="btn btn-primary btn-sm">Speichern</button>
    `;
    } else {
      formContent = `
      <h4>Datensatz bearbeiten (ID: ${id})</h4>
      <div class="form-group">
        <label>Name:</label>
        <input type="text" class="form-control" value="${name}">
      </div>
      <button class="btn btn-primary btn-sm">Änderungen speichern</button>
    `;
    }

    // 3. Den neuen Tab-Reiter (LI) erstellen (inklusive Schließen-Button)
    const newTabLi = document.createElement('li');
    newTabLi.setAttribute('role', 'presentation');
    newTabLi.id = `li-${tabId}`;
    newTabLi.innerHTML = `
    <a href="#${tabId}" id="link-${tabId}" aria-controls="${tabId}" role="tab" data-toggle="tab">
      ${name} 
      <span class="close-tab-btn" style="margin-left: 8px; cursor: pointer; color: red;" onclick="closeDynamicTab(event, '${tabId}')">&times;</span>
    </a>
  `;
    tabList.appendChild(newTabLi);

    // 4. Das passende Inhalts-Pane (DIV) erstellen
    const newTabPane = document.createElement('div');
    newTabPane.setAttribute('role', 'tabpanel');
    newTabPane.className = 'tab-pane';
    newTabPane.id = tabId;
    newTabPane.innerHTML = formContent;
    tabContent.appendChild(newTabPane);

    // 5. Den frisch erstellten Tab sofort aktivieren
    $(`#link-${tabId}`).tab('show');
}

// Funktion zum Schließen eines dynamischen Tabs
function closeDynamicTab(event, tabId) {
    // Verhindert, dass Bootstrap den Tab beim Klick auf das "x" aktiviert
    event.stopPropagation();
    event.preventDefault();

    const tabLi = document.getElementById(`li-${tabId}`);
    const tabPane = document.getElementById(tabId);

    // Falls der zu schließende Tab gerade aktiv war, springen wir zurück zur Übersicht
    if (tabLi.classList.contains('active')) {
      $('#modalTabList a:first').tab('show');
    }

    // Elemente aus dem DOM löschen
    tabLi.remove();
    tabPane.remove();
}


async function functionArea() {
    const area = modal.functionArea;

    const categories = () => {
        let string =`
        <select id='${prefix}-buildingCategories'>
            <option value='none'>bitte Gebäudetyp wählen</option>`

        Object.entries(buildingCategories).forEach(([group, info]) => {
            string += `<option value='none'>${group}</option>`;

            info.buildings.forEach(type => {
                const caption = buildingTypes[type].caption;
                if (caption === "Verbandszellen") return;
                string += `<option value='${type}'>&nbsp;&nbsp;&nbsp;&nbsp;${caption}</option>`;
            });
        });
        string += `</select>`;
        return string;
    }

    area.replaceChildren();
    $(area).append(
      categories(),
    );

    area.addEventListener('change', async event => {
        const id = event.target.id;
        const value = event.target.value;
        if (`id !== ${prefix}-buildingCategories`) return;

        if (id === `${prefix}-buildingCategories`) {
        }
    });
}

async function initialize() {
    blueprints = await caseOfCaddy('BosErnie_StationBlueprints', 'main', 'blueprints');
    blueprints = blueprints !== undefined ? Object.values(blueprints) : [];

    await initDB(configDB);

    buildingCategories = await getBuildingCategories(lang)
    buildingTypes = await getBuildingTypes(lang)

    vehicleTypes = await getVehicleTypes(lang)

    templates = await readKey('templates', 'main', configDB)
    templates?.profiles ?? [];
    assignments = templates?.assignments ?? {};
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
                    <ul class='nav nav-tabs' role='tablist' id='${prefix}-tabList'>
                        <li role='presentation' class='active'>
                            <a href='#${prefix}-tab-profiles' aria-controls='${prefix}-tab-list' role='tab' data-toggle='tab'>List</a>
                        </li>
                    </ul>
                    <div class='tab-content' style='padding-top: 15px; flex: 1 1 0; min-height: 0; overflow: hidden;'>
                        <div id='${prefix}-tab-profiles' class='tab-pane active' role='tabpanel' style='height: 100%; min-height: 0;'>
                            <table class='table table-striped tablesorter tablesorter-default' id='${prefix}-profiles-table' role='grid' style='width: 100%; display: flex; flex-direction: column; height: 100%; min-height: 0; margin-bottom: 0;'>
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
                    </div>
                </div>
                <div id='${prefix}-footer' class='modal-footer' style='text-align: left;'>
                    <div data-tab-controls='profiles'>
                        <button type='button' data-action='import-profil' class='btn btn-default btn-xs' style='width: 175px;'>
                            Vorlage importieren
                        </button>
                        <button type='button' data-action='export-profiles' class='btn btn-default btn-xs' style='width: 175px;'>
                            Vorlagen exportieren
                        </button>
                        <button type='button' data-action='new-profile' class='btn btn-default btn-xs' style='width: 175px;'>
                            neues Profil erstellen
                        </button>
                    </div>
                    <div data-tab-controls='edit' style='display: none;'>
                        <button type='button' data-action='save-profile' class='btn btn-default btn-xs' style='width: 175px;'>
                            Speichern
                        </button>
                    </div>
                </div>
                </div>
            </div>
        </div>
    </div>`;

    const dom = new DOMParser().parseFromString(html, 'text/html');
    const modal = dom.body.firstElementChild;
    document.body.append(modal);

    //const functionArea = modal.querySelector(`#${prefix}-control`)

    const profilesTableBody = modal.querySelector(`#${prefix}-profiles-table tbody`);
    /*
    profilesTableBody.addEventListener('click', event => {
        const select = event.target.closest(`select[data-action='profile-assignment']`);
        if (!select) return;
        const cell = select.closest('tr').querySelector('.digit-cell');
        const profileId = Number(cell.dataset.digit);
        }
    });
    */

    const tableProfiles = profilesTableBody.closest('table');
    $(tableBuildings).tablesorter({
      textExtraction: {
        //0: node => $(node).attr('data-digit'),
      },
      headers: {
        //0: { sorter: 'digit' },
        1: { sorter: 'text' },
        2: { sorter: 'text' },
      },
    });

    $(modal).on('shown.bs.tab', '[data-toggle="tab"]', async event => {
        modal.activeTab = event.target.getAttribute('href').replace(/^.*-tab-/, '').replace('#', '');
        modal.querySelectorAll('[data-tab-controls]').forEach(controls => {
            controls.style.display = controls.dataset.tabControls === modal.activeTab ? '' : 'none';
        });
    });
    /*
data-action='import-profile'
data-action='export-profiles'
data-action='new-profile'
data-action='save-profile'
*/

    modal.addEventListener('click', async event => {
        const button = event.target.closest('[data-action]');
        if (!button || !modal.contains(button)) return;

        if (button.dataset.action === 'import-profile') {
          await renderTableBuildings(buildings);
        }
        if (button.dataset.action === 'save-profile') {
          /*
          button.disabled = true;
          button.blur();
          try {
            await saveKey({ profiles, assignments }, 'main', configDB, 'templates');
            button.textContent = 'Erfolgreich gespeichert';
            await delay(1500);
            button.textContent = 'Vorlage speichern';
          } finally {
            button.disabled = false;
          }
          */
        }
        if (button.dataset.action === 'export-profiles') {
        }
        if (button.dataset.action === 'new-profile') {
        }
        if (button.dataset.action === 'edit-profile') {
        }
    });

    /*
    const links = [ '/extension/credits/', '/extension_ready/', '/expand_do/credits', ];
    $(document).ajaxComplete(async function(event, xhr, settings) {
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
    */


    modal.activeTab = 'profiles';
    modal.profilesTableBody = profilesTableBody;
    //modal.functionArea = functionArea;
    return modal;
}

let modal;
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
    'click', async event => {
        event.preventDefault();
        await initialize();
        if (!modal) {
          modal = createModal();
        }
        $(modal).modal('show');
    });
  divider.before(triggerLi);
};

const autoStart = localStorage.getItem(`${prefix}-autoStart`);
if (autoStart === 'true') {
  document.querySelector(`#${prefix}-menu`).click();
}
