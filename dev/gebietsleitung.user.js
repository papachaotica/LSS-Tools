// ==UserScript==
// @name         [ LSS ] Chef der Einheiten und Objekte
// @name:en         [ LSS ] Central Exequte Officer
// @namespace       papachaotica.leitstellenspiel.de
// @version         0.10.0.261017
// @description:de  Zentrale Verwaltung aller Gebäude und Fahrzeuge
// @author          papachaotica
// @homepage        https://github.com/papachaotica
// @match           https://leitstellenspiel.de
// @match           https://www.leitstellenspiel.de
// @exclude-match   https://forum.leitstellenspiel.de
// @require         https://raw.githubusercontent.com/papachaotica/LSS-Tools/dev/lib/indexedDB.js?v261017
// @require         https://raw.githubusercontent.com/papachaotica/LSS-Tools/dev/lib/api-fetch-database-handler.js?v261017
// @run-at          document-idle
// @license         AGPL-3.0-or-later
// ==/UserScript==

/*
 * [X] modal bauen
 * [x] Tab flexible hinzufügen
 * [x] Gebäudetabelle rendern mit Erweiterungen
 * [x] Wachenbaupläne importieren
 * [x] Blueprint auf regex zuordnen oder Default setzen
 * [x] Blueprint auf Erweiterungen anwenden
 * [x] Manuelle Profil Zuordnung und persistent speichern
 * [x] Personal auf Ist/soll und personalSetpoint farblich markieren
 * [x] Leitstelle erkennen
 * [x] Auswahl dropdown auf Leitstelle Übergabe an renderTableBuildings
 * [_] Stellplätze ermitteln und verfügbare anzeigen
 * [_] manuell Abweichungen vom Profi freigeben mit Gültigkeitsverlust bei nächster Profiländerung
 * [_] Fahrzeuge Leitstelle zuordnen und Änderungen erkennen
 * [_] geplante Fahrzeuge vergleichen und Abweichungen anzeigen
 * [_] Lagergröße und verfügbar anzeigen
 * [_] Template Tabelle rendern
 * [_] Link zu CentralSettings bauen (Zugfahrzeug Zuordnung, DGL ELW GRTW Einstellungen)
 * [_] Equipment auf Machbarkeit prüfen
 * [_] renderTableVehicles (Design ausarbeiten)
 */

const defaults = {
    "1": {
        "caption": "Feuerwehrschule",
        "extensions": [
            {"id": 0, "name": "Weiterer Klassenraum"},
            {"id": 1, "name": "Weiterer Klassenraum"},
            {"id": 2, "name": "Weiterer Klassenraum"},
        ],
    },
    "3": {
        "caption": "Rettungsschule",
         "extensions": [
            {"id": 0, "name": "Weiterer Klassenraum"},
            {"id": 1, "name": "Weiterer Klassenraum"},
            {"id": 2, "name": "Weiterer Klassenraum"},
        ],
    },
    "4": {
        "caption": "Krankenhaus",
        "extensions": [
            {"id": 0, "name": "Allgemeine Innere"},
            {"id": 1, "name": "Allgemeine Chirurgie"},
            {"id": 2, "name": "Gynäkologie"},
            {"id": 3, "name": "Urologie"},
            {"id": 4, "name": "Unfallchirurgie"},
            {"id": 5, "name": "Neurologie"},
            {"id": 6, "name": "Neurochirurgie"},
            {"id": 7, "name": "Kardiologie"},
            {"id": 8, "name": "Kardiochirurgie"},
        ],
        "maxLevel": 20,
    },
    "8": {
        "caption": "Polizeischule",
        "extensions": [
            {"id": 0, "name": "Weiterer Klassenraum"},
            {"id": 1, "name": "Weiterer Klassenraum"},
            {"id": 2, "name": "Weiterer Klassenraum"},
        ],
    },
    "10": {
        "caption": "THW Bundesschule",
        "extensions": [
            {"id": 0, "name": "Weiterer Klassenraum"},
            {"id": 1, "name": "Weiterer Klassenraum"},
            {"id": 2, "name": "Weiterer Klassenraum"},
        ],
    },
    "27": {
        "caption": "Schule für Seefahrt und Seenotrettung",
        "extensions": [
            {"id": 0, "name": "Weiterer Klassenraum"},
            {"id": 1, "name": "Weiterer Klassenraum"},
            {"id": 2, "name": "Weiterer Klassenraum"},
        ],
    },
}

//////////////////////////////////////////////////////////////////////////////

'use strict'

const prefix = "dev-ceo";

const lang = I18n.locale ? I18n.locale : 'de_DE'

let buildings;
let buildingTypes;
let dispatchCenters;
let templates;
let assignments;
let vehicles;
let vehicleTypes;

let modal;

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

async function renderTableBuildings(buildings) {
    const tableBody = tableBuildings
    tableBody.replaceChildren();
    buildings.forEach(building => {
        modal
        if (building.id === 'lastUpdate') { return; }

        // name and link
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        const buildingLink = document.createElement('a');
        buildingLink.classList.add('lightbox-open');
        buildingLink.href = `/buildings/${building.id}`;
        buildingLink.append(building.caption);
        nameCell.append(buildingLink);

        // buildingType
        const buildingType = buildingTypes[building.building_type];

        // templates
        let template = undefined;
        const templatesCell = document.createElement('td');
        const profiles = templates.filter(profile =>
            profile.buildingTypeId === building.building_type
        );
        if (profiles.length > 0) {
            const dropdown = document.createElement('select');
            dropdown.style.width = '100%';
            const empty = document.createElement('option');
            empty.value = 'none';
            empty.textContent = "";
            dropdown.appendChild(empty);
            let select = undefined;
            if (assignments[building.id]) {
                select = profiles.find(profile => profile.id === assignments[building.id]);
            } else {
                const match = profiles.filter(profile => {
                    return typeof profile.buildingNameRegexPattern === 'string' &&
                        profile.buildingNameRegexPattern.trim() !== '' &&
                        new RegExp(profile.buildingNameRegexPattern).test(building.caption);
                });
                if (match.length === 1) {
                    select = match[0];
                } else if (match.length === 0 && profiles.length === 1) {
                    select = profiles[0];
                }
            }
            profiles.forEach(profile => {
                const option = document.createElement('option');
                option.textContent = profile.name;
                option.value = profile.id;
                if (select && profile.id === select?.id) {
                    template = profile;
                    option.selected = true;
                }
                dropdown.appendChild(option);
            });
            dropdown.addEventListener('change', event => {
                if (event.target.value === 'none') {
                    delete assignments[building.id];
                } else {
                    assignments[building.id] = event.target.value;
                }
            });
            templatesCell.append(dropdown);
        } else {
            templatesCell.append("keine Vorlage");
            template = defaults[building.building_type];
        }
        if (!template) {
            building.withoutAssignment = true;
        }

        // extensions
        const extensionsCell = document.createElement('td');
        /* eslint-disable no-multi-spaces */
        /*
         *  grün       = label-success ===   geplant   gebaut und   aktiv === succes
         *  hellgrün   = HG = #7FFF00  === ungeplant   gebaut und   aktiv === xtraactiv
         *  gelb       = YE = #FFFF00  === ungeplant   gebaut und inaktiv === xtraDead
         *  orange-rot = label-warning ===   geplant   gebaut und inaktiv === planDead
         *  rot        = label-danger  ===   geplant ungebaut             === missing
         *  blau       = label-info    === in progress                    === build
         */
        const success   = element => { element.classList.add('label', 'label-success'); };
        const xtraActiv = element => { element.style.backgroundColor = '#65C960'; };
        const xtraDead  = element => { element.style.backgroundColor = '#FFFF00'; };
        const planDead  = element => { element.classList.add('label', 'label-warning'); };
        const missing   = element => { element.classList.add('label', 'label-danger'); };
        const build     = element => { element.classList.add('label', 'label-info'); };
        /* eslint-enable no-multi-spaces */

        const types = buildingType ? buildingType.extensions : [];
        const real = building.extensions ? building.extensions : [];
        const plan = template ? template.extensions : [];

        types.forEach((type, index) => {

            const extensionLabel = document.createElement('span');
            extensionLabel.title = type ? type.caption ? type.caption : "" : "";
            extensionLabel.append(index);
            extensionLabel.style.marginRight = '3px';
            extensionLabel.style.fontSize = '8px';
            //extensionLabel.style.cursor = 'help';
            extensionLabel.classList.add('label', 'label-default');

            const current = real.find(item => item.type_id === index);
            const planned = plan.find(item => item.id === index);
            if (current?.available_at) {
                build(extensionLabel);
                const date = new Date(current.available_at);
                extensionLabel.title = `${type.caption}
                ${date.toLocaleString()}`;
            }
            if (!current && planned) {
                extensionLabel.title = `${type.caption}\nfehlt`;
                missing(extensionLabel);
                building.missingExtension = true;

            }
            if (current) {
                extensionLabel.style.fontSize = '10px';
                if (planned && (current?.enabled === false)) {
                    planDead(extensionLabel);
                    building.allExtensionsActiv = false
                }
                if (planned && (current?.enabled === true)) {
                    success(extensionLabel);
                }
                if (!planned && (current?.enabled === false)) {
                    xtraDead(extensionLabel);
                    extensionLabel.title = `${type.caption}\nzusätzlich\nnicht aktiv`
                    building.allExtensionsActiv = false
                }
                if (!planned && (current?.enabled === true)) {
                    xtraActiv(extensionLabel);
                    extensionLabel.title = `${type.caption}\nzusätzlich`
                }
            }

            extensionsCell.append(extensionLabel);
        });

        // personal
        const personalCell = document.createElement('td');
        if (buildingType.startPersonnel >= 0) {
            const count = building.personal_count;
            const target = building.personal_count_target;
            const setpoint = template ? template.personnelSetPoint : null;

            // default
            personalCell.append(`${count} / ${target}`);

            // succes = green
            if ((count === target) && ( setpoint === target )) {
                personalCell.classList.add('text-success');
                personalCell.replaceChildren(count);
            }

            // danger = red
            if ((target === setpoint || setpoint === null) && (count < target)) {
                personalCell.classList.add('text-danger');
            }

            // warning = orange-red
            if ((count > target) && ((setpoint === null) || (setpoint === target))) {

            }
        }

        row.append(nameCell, templatesCell, extensionsCell, personalCell);
        tableBody.append(row);
    });
}
let tableVehicles;
async function addTabVehicles() {
    const paneId = `${prefix}-tab-vehicles`

    const tabLi = document.createElement('li')
    tabLi.setAttribute('role', 'presentation');
    //    tabLi.classList.add('active');

    const tabLink = document.createElement('a');
    tabLink.href = `#${paneId}`;
    tabLink.setAttribute('aria-controls', paneId);
    tabLink.setAttribute('role', 'tab');
    tabLink.setAttribute('data-toggle', 'tab');
    tabLink.append("Fahrzeuge"); // translation

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
    reloadButtonVehicles.id = `${prefix}-reloadBuildingsButton`
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
async function addTabBuildings() {
    const paneId = `${prefix}-tab-buildings`

    const tabLi = document.createElement('li')
    tabLi.setAttribute('role', 'presentation');
    tabLi.classList.add('active');

    const tabLink = document.createElement('a');
    tabLink.href = `#${paneId}`;
    tabLink.setAttribute('aria-controls', paneId);
    tabLink.setAttribute('role', 'tab');
    tabLink.setAttribute('data-toggle', 'tab');
    tabLink.append("Gebäude"); // translation


    tabLi.append(tabLink);
    modal.tabList.append(tabLi);

    const tabPane = document.createElement('div');
    tabPane.id = paneId;
    tabPane.classList.add('tab-pane', 'active');
    tabPane.setAttribute('role', 'tabpanel');

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
        const withoutAssignment = buildings.filter(building => building.withoutAssignment);
        renderTableBuildings(withoutAssignment);
    });

    const filterButtonExtensionMissing = document.createElement('button');
    filterButtonExtensionMissing.classList.add('btn', 'btn-default', 'btn-xs');
    filterButtonExtensionMissing.style.width = '175px';
    filterButtonExtensionMissing.append("Fehlende Erweiterungen");
    filterButtonExtensionMissing.id = `${prefix}-filterButtonExtensionMissing`;
    filterButtonExtensionMissing.addEventListener('click', async () => {
        const extensionMissing = buildings.filter(building => building.missingExtension);
        renderTableBuildings(extensionMissing);
    });
    const filterButtonNotActiv = document.createElement('button');
    filterButtonNotActiv.classList.add('btn', 'btn-default', 'btn-xs');
    filterButtonNotActiv.style.width = '175px';
    filterButtonNotActiv.append("Erweiterung nicht aktiv");
    filterButtonNotActiv.id = `${prefix}-filterButtonExtensionMissing`;
    filterButtonNotActiv.addEventListener('click', async () => {
        const allExtensionsActiv = buildings.filter(building => building.allExtensionsActiv === false);
        renderTableBuildings(allExtensionsActiv);
    });

    const updateBuildings = document.createElement('span');
    updateBuildings.id = `${prefix}-textLastUpdateBuildings`;
    updateBuildings.textContent = `Lade Gebäudeliste ...`;

    let lastupdateBuildings = await showLastUpdate('buildings');
    updateBuildings.textContent = `Letztes update: ${lastupdateBuildings}`;

    const reloadButtonBuildings = document.createElement('button');
    reloadButtonBuildings.classList.add('btn', 'btn-default', 'btn-xs');
    reloadButtonBuildings.addEventListener('click', async () => {
        reloadButtonBuildings.disabled = true;
        updateBuildings.textContent = " Lade Gebäudeliste ..."
        await getBuildings(true);
        lastupdateBuildings = await showLastUpdate('buildings');
        await delay(1000);
        updateBuildings.textContent = ` Letztes update: ${lastupdateBuildings}`;
        reloadButtonBuildings.disabled = false;
        reloadButtonBuildings.blur();
    });
    reloadButtonBuildings.id = `${prefix}-reloadBuildingsButton`
    reloadButtonBuildings.append("Gebäude neuladen");


    //    modal.functionArea.append()
    modal.filterArea.append(
        saveButtonProfiles,
        filterButtonProfiles,
        filterButtonExtensionMissing,
        filterButtonNotActiv,
    );
    modal.footer.append(reloadButtonBuildings, updateBuildings);

    const table = document.createElement('table');
    table.classList.add('table', 'table-striped', 'tablesorter', 'tablesorter-default');

    const thead = document.createElement('thead');
    const theadRow = document.createElement('tr');
    const theadName = document.createElement('th');
    theadName.append("Wache");
    const theadProfiles = document.createElement('th');
    const theadExtensions = document.createElement('th');
    theadExtensions.append("Erweiterungen");
    const theadPersonal = document.createElement('th');
    theadPersonal.append("Personal");

    [theadName, theadExtensions, theadPersonal].forEach(thead => {
        thead.classList.add('text-center');
    });

    theadRow.append(theadName, theadProfiles, theadExtensions, theadPersonal);
    thead.append(theadRow);

    const tableBody = document.createElement('tbody');
    table.append(thead, tableBody);
    tabPane.append(table);
    tableBuildings = tableBody;

    $(tabLink).on('shown.bs.tab', () => {
        /*modal.filterAreaArea.replaceChildren(
            saveButtonProfiles,
            filterButtonProfiles,
            filterButtonExtensionMissing,
            filterButtonNotActiv,
        );*/
        modal.footer.replaceChildren(reloadButtonBuildings, updateBuildings);
        renderTableBuildings(buildings);
    });
}

async function filterDispatchCenters() {
    buildings = [];
    const dispatchCenterType = Object.entries(buildingTypes).find(
        ([, buildingType]) => buildingType.isDispatchCenter
    );
    if (dispatchCenterType) {
        const typeId = Number(dispatchCenterType[0]);
        dispatchCenters = await getBuildings(false, 'type', typeId);
    }
    const dropdown = document.createElement('select');
    dropdown.id = `${prefix}-filter-dispatchCenters`;
    const emptyValue = document.createElement('option');
    emptyValue.value = "";
    dropdown.appendChild(emptyValue);
    const allValue = document.createElement('option');
    allValue.value = "all";
    allValue.textContent = "alle Gebäude";
    dropdown.appendChild(allValue);
    let value;
    dropdown.addEventListener('change', async event => {
        value = event.target.value;
        await refresh();
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
        await refresh();
    });

    const refresh = async () => {
        if (value === "") { return; }
        if (value === "all") {
            const get = await getBuildings(false);
            buildings = get.filter(building => building.building_type !== dispatchCenterType);
        } else {
            const get = await getBuildings(false, 'dispatchCenter', Number(value));
            buildings = get.filter(building => building.building_type !== dispatchCenterType);
        }
        await renderTableBuildings(buildings);

    }
    modal.functionArea.append(dropdown, refreshButton)
}

async function initialize() {

    const config = { name: "BosErnie_StationBlueprints", stores: [] };
    await initDB(config);
    templates = await readKey('blueprints', 'main', config);
    templates = Object.values(templates);
    db.close();

    await initDB(configDB);

    buildingTypes = await getBuildingTypes(I18n.locale);
    vehicleTypes = await getVehicleTypes(I18n.locale);
    const blueprints = await readKey('templates', 'main', configDB);
    assignments = blueprints ? blueprints.assignments ? blueprints.assignments : assignments = {} : assignments = {};

}


function createModal() {

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
    dialog.style.height = '95vh';
    dialog.style.margin = '2.5vh auto';

    const content = document.createElement('div');
    content.classList.add('modal-content');
    content.style.height = '100%';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';

    const header = document.createElement('div');
    header.classList.add('modal-header');

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.classList.add('close');
    closeButton.setAttribute('data-dismiss', 'modal');
    closeButton.setAttribute('aria-label', "close"); // translation

    const closeIcon = document.createElement('span');
    closeIcon.setAttribute('aria-hidden', 'true');
    closeIcon.append('×');

    closeButton.append(closeIcon);

    const title = document.createElement('h4');
    title.id = `${prefix}-title`;
    title.classList.add('modal-title');
    title.style.textAlign = 'center';
    title.append("Central Execute Officer"); // translation

    header.append(closeButton, title);

    const body = document.createElement('div');
    body.classList.add('modal-body');
    body.style.maxHeight = 'none';
    body.style.flex = '1 1 auto';
    body.style.overflowY = 'auto';

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

    body.append(tabList, tabContent);

    const footer = document.createElement('div');
    footer.classList.add('modal-footer');
    footer.style.textAlign = 'left';

    content.append(header, body, footer);
    dialog.append(content);
    modal.append(dialog);

    document.body.append(modal);

    return { modal, body, functionArea, filterArea, tabList, tabContent, footer };

}

if ( ! document.querySelector(`#${prefix}-menu`)) {
    const divider =
        document.querySelector(
            '#menu_profile + .dropdown-menu > li.divider'
        );
    const triggerA = document.createElement("a");
    triggerA.href = `#${prefix}`;
    triggerA.append("Central Exequte Offcer"); // translation
    const triggerLi = document.createElement("li");
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
                await addTabBuildings();
            }
            $(modal.modal).modal('show');
        });
    divider.before(triggerLi);
};
if (document.querySelector(`#${prefix}-menu`)) { document.querySelector(`#${prefix}-menu`).click(); };
