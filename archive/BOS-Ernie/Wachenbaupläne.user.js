

    // ==UserScript==
    // @name        * Wachenbaupläne
    // @namespace   bos-ernie.leitstellenspiel.de
    // @version     1.0.0-rc.2
    // @license     BSD-3-Clause
    // @author      BOS-Ernie
    // @description Verwaltet Baupläne für benutzerdefinierte Vorlagen, wie Wachen ausgebaut und ausgestattet werden sollen
    // @match       https://www.leitstellenspiel.de/
    // @match       https://polizei.leitstellenspiel.de/
    // @icon        https://www.google.com/s2/favicons?sz=64&domain=leitstellenspiel.de
    // @run-at      document-idle
    // @grant       none
    // @resource    https://forum.leitstellenspiel.de/index.php?thread/27159-script-wachenbaupl%C3%A4ne/
    // ==/UserScript==
     
    (async function () {
      const cacheKeyBlueprints = "blueprints";
      const cacheKeyBuildings = "buildings";
      const cacheKeyVehicles = "vehicles";
     
      const modalId = "station-blueprint-modal";
      const tableId = "station-blueprint-table";
      const buildingTypeIdSelect = "station-blueprint-building-type-id";
     
      const currentSchemaVersion = "1.0";
     
      let stationBlueprints = [];
      let buildingTypes = {};
      let vehicleTypes = {};
     
      const selectBuildingTypePlaceholder = `<p class="col-sm-10 text-muted"><em>Bitte zuerst Gebäudetyp wählen...</em></p>`;
     
      //////////////////////////////////////////////////
     
      const databaseName = "BosErnie_StationBlueprints";
      const objectStoreName = "main";
     
      function openDB() {
        return new Promise((resolve, reject) => {
          const request = window.indexedDB.open(databaseName, 2);
     
          request.onerror = () => {
            reject("Failed to open the database");
          };
     
          request.onsuccess = event => {
            const db = event.target.result;
     
            resolve(db);
          };
     
          request.onupgradeneeded = event => {
            const db = event.target.result;
     
            if (!db.objectStoreNames.contains(objectStoreName)) {
              const objectStore = db.createObjectStore(objectStoreName);
              objectStore.createIndex("blueprints", "blueprints", { unique: false });
              objectStore.createIndex("buildings", "buildings", { unique: false });
              objectStore.createIndex("vehicles", "vehicles", { unique: false });
            }
          };
        });
      }
     
      async function storeData(data, key) {
        const db = await openDB();
     
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([objectStoreName], "readwrite");
          const objectStore = transaction.objectStore(objectStoreName);
     
          const request = objectStore.put(data, key);
     
          request.onsuccess = () => {
            resolve("Data stored successfully");
          };
     
          request.onerror = () => {
            reject("Failed to store data");
          };
        });
      }
     
      async function retrieveData(key) {
        const db = await openDB();
     
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([objectStoreName], "readonly");
          const objectStore = transaction.objectStore(objectStoreName);
     
          const request = objectStore.get(key);
     
          request.onsuccess = event => {
            const data = event.target.result;
            resolve(data);
          };
     
          request.onerror = () => {
            reject("Failed to retrieve data");
          };
        });
      }
     
      async function fetchAndStoreData(url, key) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          const data = await response.json();
     
          const expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + 1);
     
          const cacheData = {
            data: data,
            expirationDate: expirationDate,
          };
     
          await storeData(cacheData, key);
     
          return data;
        } catch (error) {
          console.error("There was a problem with the fetch operation:", error);
        }
      }
     
      //////////////////////////////////////////////////
     
      async function initBuildingTypes() {
        const cacheData = await retrieveData(cacheKeyBuildings);
        buildingTypes = cacheData?.data;
     
        const expirationDate = cacheData?.expirationDate;
     
        if (!buildingTypes || !expirationDate || new Date(expirationDate) < new Date()) {
          buildingTypes = await fetchAndStoreData("https://api.lss-manager.de/de_DE/buildings", cacheKeyBuildings);
        }
      }
     
      async function initVehicleTypes() {
        const cacheData = await retrieveData(cacheKeyVehicles);
        vehicleTypes = cacheData?.data;
     
        const expirationDate = cacheData?.expirationDate;
     
        if (!vehicleTypes || !expirationDate || new Date(expirationDate) < new Date()) {
          vehicleTypes = fetchAndStoreData("https://api.lss-manager.de/de_DE/vehicles", cacheKeyVehicles);
        }
      }
     
      async function initStationBlueprints() {
        stationBlueprints = await retrieveData(cacheKeyBlueprints);
     
        if (!stationBlueprints) {
          stationBlueprints = [];
        }
      }
     
      //////////////////////////////////////////////////
     
      function flatBuildingTypes(buildingTypes) {
        return Object.entries(buildingTypes)
          .map(([id, building]) => ({ id, name: building.caption }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }
     
      function flatExtensionsByBuildingTypeId(buildingTypeId) {
        const extensions = buildingTypes[buildingTypeId]?.extensions || [];
     
        return Object.entries(extensions)
          .filter(([_, extension]) => extension !== null)
          .map(([id, extension]) => ({ id, name: extension.caption }))
          .sort((a, b) => {
            const nameComparison = a.name.localeCompare(b.name);
            return nameComparison !== 0 ? nameComparison : a.id.localeCompare(b.id, undefined, { numeric: true });
          });
      }
     
      function flatVehicleTypesByBuildingTypeId(buildingTypeId) {
        const vehicles = Object.entries(vehicleTypes)
          .filter(([_, vehicle]) => vehicle.possibleBuildings.includes(buildingTypeId))
          .reduce((acc, [id, vehicle]) => {
            acc[id] = vehicle;
            return acc;
          }, {});
     
        return Object.entries(vehicles)
          .filter(([_, vehicle]) => vehicle !== null)
          .map(([id, vehicle]) => ({ id, name: vehicle.caption }))
          .sort((a, b) => {
            const nameComparison = a.name.localeCompare(b.name);
            return nameComparison !== 0 ? nameComparison : a.id.localeCompare(b.id, undefined, { numeric: true });
          });
      }
     
      function getStaffRequirementsForVehicleTypeId(vehicleTypeId, schoolingTypes) {
        const vehicle = vehicleTypes[vehicleTypeId];
     
        if (!vehicle || !vehicle.staff) {
          return [];
        }
     
        if (vehicle.staff.min === 0 && vehicle.staff.max === 0) {
          return [];
        }
     
        if (!vehicle.schooling) {
          return [{ quantity: vehicle.staff.max, category: null, training: null }];
        }
     
        const staffRequirements = [];
        for (const [category, training] of Object.entries(vehicle.schooling)) {
          if (schoolingTypes.length > 0 && !schoolingTypes.includes(category)) {
            continue;
          }
     
          for (const [trainingType, quantityDefinition] of Object.entries(training)) {
            let quantity = 0;
            if (quantityDefinition.all) {
              quantity = vehicle.staff.max;
            } else if (quantityDefinition.min) {
              quantity = quantityDefinition.min;
            }
     
            staffRequirements.push({
              quantity: quantity,
              category: category,
              training: trainingType,
            });
          }
        }
     
        return staffRequirements;
      }
     
      function generateUniqueId() {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const idLength = 8;
     
        function generateId() {
          let id = "";
          for (let i = 0; i < idLength; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            id += characters[randomIndex];
          }
          return id;
        }
     
        let newId = generateId();
        while (idExists(newId)) {
          newId = generateId();
        }
     
        return newId;
      }
     
      function idExists(id) {
        return Object.keys(stationBlueprints).includes(id);
      }
     
      function populateTable() {
        const table = document.getElementById(tableId);
        const tableBody = table.querySelector("tbody");
        tableBody.innerHTML = "";
     
        if (Object.keys(stationBlueprints).length === 0) {
          const em = document.createElement("em");
          em.textContent =
            "Noch keine Baupläne vorhanden. Klicke auf 'Neuer Bauplan' um deinen ersten Bauplan zu erstellen.";
     
          const cell = document.createElement("td");
          cell.colSpan = 9;
          cell.appendChild(em);
     
          const row = document.createElement("tr");
          row.appendChild(cell);
     
          tableBody.appendChild(row);
        }
     
        for (const [id, stationBlueprint] of Object.entries(stationBlueprints)) {
          const row = document.createElement("tr");
     
          const idCell = document.createElement("td");
          idCell.textContent = stationBlueprint.id;
          row.appendChild(idCell);
     
          const enabledLabel = document.createElement("label");
          enabledLabel.className = "label label-" + (stationBlueprint.enabled ? "success" : "default");
          enabledLabel.textContent = stationBlueprint.enabled ? "Ja" : "Nein";
          const enabledCell = document.createElement("td");
          enabledCell.appendChild(enabledLabel);
          row.appendChild(enabledCell);
     
          const i = getIconByBuildingTypeId(stationBlueprint.buildingTypeId);
     
          const buildingTypeCell = document.createElement("td");
          buildingTypeCell.textContent = " " + buildingTypes[stationBlueprint.buildingTypeId]?.caption || "Unbekannt";
          buildingTypeCell.prepend(i);
          row.appendChild(buildingTypeCell);
     
          const nameCell = document.createElement("td");
          nameCell.textContent = stationBlueprint.name;
          row.appendChild(nameCell);
     
          const regexCell = document.createElement("td");
          if (stationBlueprint.buildingNameRegexPattern !== null) {
            const code = document.createElement("code");
            code.textContent = stationBlueprint.buildingNameRegexPattern;
            regexCell.appendChild(code);
          }
          row.appendChild(regexCell);
     
          const personnelCell = document.createElement("td");
          personnelCell.textContent = stationBlueprint.personnelSetPoint;
          row.appendChild(personnelCell);
     
          const extensionsCell = document.createElement("td");
          extensionsCell.textContent = stationBlueprint.extensions.length;
          row.appendChild(extensionsCell);
     
          const vehicleQuantity = stationBlueprint.vehicles.length;
          const vehicleText = vehicleQuantity === 1 ? "Fahrzeug" : "Fahrzeuge";
          const vehicleTypeQuantity = new Set(stationBlueprint.vehicles.map(v => v.vehicleTypeId)).size;
          const vehicleTypeText = vehicleTypeQuantity === 1 ? "Fahrzeugtyp" : "Fahrzeugtypen";
          const vehiclesCell = document.createElement("td");
          vehiclesCell.textContent =
            vehicleQuantity + " " + vehicleText + " (" + vehicleTypeQuantity + " " + vehicleTypeText + ")";
          row.appendChild(vehiclesCell);
     
          const actionsCell = document.createElement("td");
          const editButton = document.createElement("button");
          editButton.type = "button";
          editButton.className = "btn btn-primary btn-xs";
          editButton.title = "Bearbeiten";
          editButton.innerHTML = '<span class="glyphicon glyphicon-pencil" aria-hidden="true"></span>';
          actionsCell.appendChild(editButton);
     
          const deleteButton = document.createElement("button");
          deleteButton.type = "button";
          deleteButton.className = "btn btn-danger btn-xs";
          deleteButton.title = "Löschen";
          deleteButton.innerHTML = '<span class="glyphicon glyphicon-trash" aria-hidden="true"></span>';
          actionsCell.appendChild(deleteButton);
     
          const exportButton = document.createElement("button");
          exportButton.type = "button";
          exportButton.className = "btn btn-default btn-xs";
          exportButton.title = "Exportieren";
          exportButton.innerHTML = '<span class="glyphicon glyphicon-export" aria-hidden="true"></span>';
          actionsCell.appendChild(exportButton);
     
          row.appendChild(actionsCell);
     
          tableBody.appendChild(row);
     
          editButton.addEventListener("click", function () {
            loadBlueprint(stationBlueprint.id);
          });
     
          deleteButton.addEventListener("click", function () {
            deleteBlueprint(stationBlueprint.id);
          });
     
          exportButton.addEventListener("click", function () {
            exportBlueprint(stationBlueprint.id);
          });
        }
      }
     
      function populateId() {
        const idInput = document.getElementById("station-blueprint-id");
        idInput.value = generateUniqueId();
      }
     
      function populateBuildingTypes(flatBuildingTypes) {
        const select = document.getElementById(buildingTypeIdSelect);
        for (const building of flatBuildingTypes) {
          const option = document.createElement("option");
          option.value = building.id;
          option.textContent = building.name;
          select.appendChild(option);
        }
      }
     
      function buildingTypeChanged() {
        const buildingTypeId = parseInt(document.getElementById(buildingTypeIdSelect).value);
     
        const extensions = flatExtensionsByBuildingTypeId(buildingTypeId);
        populateExtensions(extensions);
     
        const vehicles = flatVehicleTypesByBuildingTypeId(buildingTypeId);
        populateVehicles(vehicles);
     
        const availableExtensionsSelect = getAvailableExtensions();
        const assignedExtensionsSelect = getAssignedExtensions();
     
        availableExtensionsSelect.addEventListener("dblclick", function () {
          moveExtensionOption(availableExtensionsSelect, assignedExtensionsSelect);
        });
     
        assignedExtensionsSelect.addEventListener("dblclick", function () {
          moveExtensionOption(assignedExtensionsSelect, availableExtensionsSelect);
        });
     
        assignedExtensionsSelect.addEventListener("keydown", function (e) {
          if (e.key === "ArrowUp") {
            moveExtensionOptionUpOrDown("up");
            e.preventDefault();
          } else if (e.key === "ArrowDown") {
            moveExtensionOptionUpOrDown("down");
            e.preventDefault();
          }
        });
      }
     
      function populateExtensions(extensions) {
        const selectContainer = document.getElementById("station-blueprint-extensions");
        selectContainer.innerHTML = "";
     
        // Available extensions
        const selectAvailableLabel = document.createElement("label");
        selectAvailableLabel.className = "control-label";
        selectAvailableLabel.textContent = "Verfügbar";
     
        const selectAvailable = document.createElement("select");
        selectAvailable.multiple = true;
        selectAvailable.className = "form-control";
        selectAvailable.id = "station-blueprint-extensions-available";
        selectAvailable.size = 10;
     
        for (const extension of extensions) {
          const option = document.createElement("option");
          option.value = extension.id;
          option.textContent = extension.name;
          selectAvailable.appendChild(option);
        }
     
        const selectAvailableContainer = document.createElement("div");
        selectAvailableContainer.appendChild(selectAvailable);
     
        const selectAvailableColumn = document.createElement("div");
        selectAvailableColumn.className = "col-sm-5";
        selectAvailableColumn.appendChild(selectAvailableLabel);
        selectAvailableColumn.appendChild(selectAvailableContainer);
     
        // Assigned extensions
        const selectAssignedLabel = document.createElement("label");
        selectAssignedLabel.className = "control-label";
        selectAssignedLabel.textContent = "Zugewiesen";
     
        const selectAssigned = document.createElement("select");
        selectAssigned.multiple = true;
        selectAssigned.className = "form-control";
        selectAssigned.id = "station-blueprint-extensions-assigned";
        selectAssigned.size = 10;
     
        const selectAssignedContainer = document.createElement("div");
        selectAssignedContainer.appendChild(selectAssigned);
     
        const selectAssignedColumn = document.createElement("div");
        selectAssignedColumn.className = "col-sm-5 col-sm-offset-2";
        selectAssignedColumn.appendChild(selectAssignedLabel);
        selectAssignedColumn.appendChild(selectAssignedContainer);
     
        // No extensions available
        if (extensions.length === 0) {
          selectAvailableColumn.querySelector("select").disabled = true;
          selectAssignedColumn.querySelector("select").disabled = true;
        }
     
        selectContainer.appendChild(selectAvailableColumn);
        selectContainer.appendChild(selectAssignedColumn);
      }
     
      function populateVehicles(vehicles) {
        const vehicleContainer = document.getElementById("station-blueprint-vehicles");
        vehicleContainer.innerHTML = "";
     
        if (vehicles.length === 0) {
          const noVehiclesEm = document.createElement("em");
          noVehiclesEm.textContent = "Keine Fahrzeuge verfügbar für diesen Gebäudetyp.";
     
          const noVehiclesP = document.createElement("p");
          noVehiclesP.className = "col-sm-10 text-muted";
          noVehiclesP.appendChild(noVehiclesEm);
     
          vehicleContainer.appendChild(noVehiclesP);
          return;
        }
     
        const vehiclesColumn1 = document.createElement("div");
        vehiclesColumn1.className = "col-sm-3";
        const vehiclesColumn2 = document.createElement("div");
        vehiclesColumn2.className = "col-sm-3";
        const vehiclesColumn3 = document.createElement("div");
        vehiclesColumn3.className = "col-sm-3";
        const vehiclesColumn4 = document.createElement("div");
        vehiclesColumn4.className = "col-sm-3";
     
        let i = 0;
        for (const vehicle of vehicles) {
          const vehicleLabel = document.createElement("label");
          vehicleLabel.className = "col-sm-9 control-label";
          vehicleLabel.textContent = vehicle.name;
     
          const vehicleInput = document.createElement("input");
          vehicleInput.type = "number";
          vehicleInput.className = "form-control";
          vehicleInput.id = `station-blueprint-vehicle-type-${vehicle.id}-quantity`;
          vehicleInput.setAttribute("data-vehicle-type-quantity", "true");
          vehicleInput.setAttribute("data-vehicle-type-id", vehicle.id);
          vehicleInput.value = "0";
          vehicleInput.min = "0";
          vehicleInput.addEventListener("change", calculateRequiredPersonnel);
     
          const vehicleInputContainer = document.createElement("div");
          vehicleInputContainer.className = "col-sm-3";
          vehicleInputContainer.appendChild(vehicleInput);
     
          const vehicleRow = document.createElement("div");
          vehicleRow.className = "form-group form-group-sm";
          vehicleRow.appendChild(vehicleLabel);
          vehicleRow.appendChild(vehicleInputContainer);
     
          if (i % 4 === 0) {
            vehiclesColumn1.appendChild(vehicleRow);
          } else if (i % 4 === 1) {
            vehiclesColumn2.appendChild(vehicleRow);
          } else if (i % 4 === 2) {
            vehiclesColumn3.appendChild(vehicleRow);
          } else {
            vehiclesColumn4.appendChild(vehicleRow);
          }
     
          ++i;
        }
     
        vehicleContainer.appendChild(vehiclesColumn1);
        vehicleContainer.appendChild(vehiclesColumn2);
        vehicleContainer.appendChild(vehiclesColumn3);
        vehicleContainer.appendChild(vehiclesColumn4);
      }
     
      function getAvailableExtensions() {
        return document.getElementById("station-blueprint-extensions-available");
      }
     
      function getAssignedExtensions() {
        return document.getElementById("station-blueprint-extensions-assigned");
      }
     
      function moveExtensionOption(fromSelect, toSelect) {
        const selectedOptions = Array.from(fromSelect.selectedOptions);
     
        selectedOptions.forEach(option => {
          fromSelect.removeChild(option);
          toSelect.appendChild(option);
        });
     
        sortAvailableExtensionOptions();
      }
     
      function sortAvailableExtensionOptions() {
        const availableSelect = getAvailableExtensions();
        const optionsArray = Array.from(availableSelect.options);
        optionsArray.sort((a, b) => a.text.localeCompare(b.text));
        availableSelect.innerHTML = "";
        optionsArray.forEach(option => availableSelect.appendChild(option));
      }
     
      function moveExtensionOptionUpOrDown(direction) {
        const assignedSelect = getAssignedExtensions();
        const selectedOptions = Array.from(assignedSelect.selectedOptions);
     
        selectedOptions.forEach(option => {
          const currentIndex = Array.from(assignedSelect.options).indexOf(option);
          let newIndex = currentIndex + (direction === "up" ? -1 : 1);
     
          if (newIndex >= 0 && newIndex < assignedSelect.options.length) {
            assignedSelect.removeChild(option);
            assignedSelect.insertBefore(option, assignedSelect.options[newIndex + (direction === "down" ? 1 : 0)]);
          }
        });
      }
     
      /**
       * @todo Take into account that some vehicles require only partially trained staff, e.g. GRTW (falsely) requiring
       * 1 emergency physician and up to 6 personnel.
       * @param event
       */
      function calculateRequiredPersonnel(event) {
        if (event) {
          event.preventDefault();
        }
     
        const schoolingTypes = getSchoolingTypesByBuildingTypeId(
          parseInt(document.getElementById(buildingTypeIdSelect).value),
        );
     
        const vehicleInputs = document.querySelectorAll("input[data-vehicle-type-quantity]");
     
        const vehicleTypeQuantities = Array.from(vehicleInputs)
          .map(input => ({
            vehicleTypeId: parseInt(input.getAttribute("data-vehicle-type-id")),
            quantity: parseInt(input.value),
          }))
          .filter(vehicle => vehicle.quantity > 0);
     
        const personnelRequirements = vehicleTypeQuantities
          .map(vehicle =>
            getStaffRequirementsForVehicleTypeId(vehicle.vehicleTypeId, schoolingTypes).map(requirement => ({
              quantity: requirement.quantity * vehicle.quantity,
              category: requirement.category,
              training: requirement.training,
            })),
          )
          .flat();
     
        const personnelRequirementsSum = personnelRequirements.reduce((acc, requirement) => {
          const existingRequirement = acc.find(
            r => r.category === requirement.category && r.training === requirement.training,
          );
          if (existingRequirement) {
            existingRequirement.quantity += requirement.quantity;
          } else {
            acc.push({ ...requirement });
          }
          return acc;
        }, []);
     
        personnelRequirementsSum.sort((a, b) => {
          // Handle category comparison
          if (a.category === null && b.category !== null) return 1;
          if (a.category !== null && b.category === null) return -1;
          if (a.category === null && b.category === null) return 0;
     
          if (a.category === b.category) {
            if (a.training === null && b.training !== null) return 1;
            if (a.training !== null && b.training === null) return -1;
            if (a.training === null && b.training === null) return 0;
            return a.training.localeCompare(b.training);
          }
     
          return a.category.localeCompare(b.category);
        });
     
        const table = document.getElementById("station-blueprint-required-personnel");
        const tableBody = table.querySelector("tbody");
        tableBody.innerHTML = "";
     
        personnelRequirementsSum.forEach(requirement => {
          const row = document.createElement("tr");
     
          const quantityCell = document.createElement("td");
          quantityCell.textContent = requirement.quantity;
          row.appendChild(quantityCell);
     
          const categoryCell = document.createElement("td");
          categoryCell.textContent = requirement.category || "(ohne Ausbildung)";
          row.appendChild(categoryCell);
     
          const trainingCell = document.createElement("td");
          trainingCell.textContent = requirement.training || "(ohne Ausbildung)";
          row.appendChild(trainingCell);
     
          tableBody.appendChild(row);
        });
     
        const totalPersonnelRequirement = personnelRequirementsSum.reduce(
          (acc, requirement) => acc + requirement.quantity,
          0,
        );
     
        const totalCell = document.getElementById("station-blueprint-required-personnel-total");
        totalCell.textContent = totalPersonnelRequirement;
     
        validatePersonnelSetPoint();
      }
     
      function validatePersonnelSetPoint() {
        const totalPersonnelRequirement = parseInt(
          document.getElementById("station-blueprint-required-personnel-total").textContent,
        );
        const personnelSetPointInputFormGroup = document.getElementById(
          "station-blueprint-building-personnel-set-point-form-group",
        );
        const personnelSetPointInput = document.getElementById("station-blueprint-building-personnel-set-point");
        const personnelSetPointValidation = document.getElementById(
          "station-blueprint-building-personnel-set-point-validation",
        );
     
        if (parseInt(personnelSetPointInput.value) < totalPersonnelRequirement) {
          personnelSetPointInputFormGroup.classList.remove("has-success");
          personnelSetPointInputFormGroup.classList.add("has-error");
          personnelSetPointValidation.textContent =
            "Das Sollpersonal sollte mindestens so hoch sein wie das benötigte Personal.";
        } else {
          personnelSetPointInputFormGroup.classList.remove("has-error");
          personnelSetPointInputFormGroup.classList.add("has-success");
          personnelSetPointValidation.textContent = "";
        }
      }
     
      function getIconByBuildingTypeId(buildingTypeId) {
        const i = document.createElement("i");
     
        const buildingType = buildingTypes[buildingTypeId];
        if (buildingType) {
          i.className = "fa-solid fa-" + buildingType.icon;
        } else {
          i.className = "fa-solid fa-circle-question";
        }
     
        return i;
      }
     
      function getSchoolingTypesByBuildingTypeId(buildingTypeId) {
        const buildingType = buildingTypes[buildingTypeId];
        if (!buildingType) {
          return [];
        }
     
        return buildingType.schoolingTypes || [];
      }
     
      //////////////////////////////////////////////////
     
      function showForm() {
        document.getElementById("station-blueprint-form").style.display = "block";
        document.getElementById("station-blueprint-list").style.display = "none";
      }
     
      function hideForm() {
        document.getElementById("station-blueprint-form").style.display = "none";
        document.getElementById("station-blueprint-list").style.display = "block";
      }
     
      function newBlueprint() {
        showForm();
      }
     
      function loadBlueprint(blueprintId) {
        resetForm();
     
        const stationBlueprint = stationBlueprints[blueprintId];
     
        // Set id
        document.getElementById("station-blueprint-id").value = stationBlueprint.id;
     
        // Set enabled
        if (stationBlueprint.enabled === true) {
          document.getElementById("station-blueprint-enabled-yes").checked = true;
          document.getElementById("station-blueprint-enabled-no").checked = false;
        } else {
          document.getElementById("station-blueprint-enabled-yes").checked = false;
          document.getElementById("station-blueprint-enabled-no").checked = true;
        }
     
        // Set buildingTypeId
        const buildingTypeSelect = document.getElementById(buildingTypeIdSelect);
        for (let i = 0; i < buildingTypeSelect.options.length; i++) {
          if (buildingTypeSelect.options[i].value === stationBlueprint.buildingTypeId.toString()) {
            buildingTypeSelect.selectedIndex = i;
            buildingTypeChanged();
     
            break;
          }
        }
     
        // Set name
        document.getElementById("station-blueprint-name").value = stationBlueprint.name;
     
        // Set buildingNameRegexPattern
        document.getElementById("station-blueprint-building-name-regex-pattern").value =
          stationBlueprint.buildingNameRegexPattern;
     
        // Set personnelSetPoint
        document.getElementById("station-blueprint-building-personnel-set-point").value =
          stationBlueprint.personnelSetPoint;
     
        // Set extensions
        const extensionsAvailable = getAvailableExtensions();
        const extensionsAssigned = getAssignedExtensions();
        for (const extension of stationBlueprint.extensions) {
          for (let i = 0; i < extensionsAvailable.options.length; i++) {
            if (extensionsAvailable.options[i].value === extension.id.toString()) {
              extensionsAvailable.options[i].selected = true;
              break;
            }
          }
        }
        moveExtensionOption(extensionsAvailable, extensionsAssigned);
        // Unselect all options in extensionsAssigned
        for (let i = 0; i < extensionsAssigned.options.length; i++) {
          extensionsAssigned.options[i].selected = false;
        }
        // Sort extensions in extensionsAssigned according to order in blueprint
        const optionsMap = {};
        Array.from(extensionsAssigned.options).forEach(option => {
          optionsMap[option.value] = option;
        });
        stationBlueprint.extensions.forEach(extension => {
          const option = optionsMap[extension.id];
          if (option) {
            extensionsAssigned.appendChild(option);
          }
        });
     
        // Set vehicles
        for (const vehicle of stationBlueprint.vehicles) {
          const vehicleInput = document.getElementById(`station-blueprint-vehicle-type-${vehicle.id}-quantity`);
          if (vehicleInput) {
            vehicleInput.value = vehicle.quantity;
          }
        }
     
        calculateRequiredPersonnel();
     
        showForm();
      }
     
      function savesBlueprint(event) {
        event.preventDefault();
     
        const id = document.getElementById("station-blueprint-id").value;
        const version = currentSchemaVersion;
        let enabled = false;
        if (document.getElementById("station-blueprint-enabled-yes").checked) {
          enabled = true;
        }
        const buildingTypeId = parseInt(document.getElementById(buildingTypeIdSelect).value);
        const name = document.getElementById("station-blueprint-name").value;
        const buildingNameRegexPattern = document.getElementById("station-blueprint-building-name-regex-pattern").value;
        const personnelSetPointValue = document.getElementById("station-blueprint-building-personnel-set-point").value;
        const personnelSetPoint = personnelSetPointValue === "" ? null : parseInt(personnelSetPointValue);
        const extensions = Array.from(document.getElementById("station-blueprint-extensions-assigned").options).map(
          option => ({
            id: parseInt(option.value),
            name: option.textContent,
          }),
        );
        const vehicles = Array.from(document.querySelectorAll("input[data-vehicle-type-quantity]"))
          .map(input => ({
            id: parseInt(input.getAttribute("data-vehicle-type-id")),
            quantity: parseInt(input.value),
            name: vehicleTypes[input.getAttribute("data-vehicle-type-id")].caption,
          }))
          .filter(vehicle => vehicle.quantity > 0);
     
        stationBlueprints[id] = {
          id: id,
          version: version,
          enabled: enabled,
          buildingTypeId: buildingTypeId,
          name: name,
          buildingNameRegexPattern: buildingNameRegexPattern,
          personnelSetPoint: personnelSetPoint,
          extensions: extensions,
          vehicles: vehicles,
        };
        storeData(stationBlueprints, cacheKeyBlueprints);
     
        hideForm();
        resetForm();
     
        populateTable();
      }
     
      function cancelBlueprint() {
        hideForm();
        resetForm();
      }
     
      function deleteBlueprint(blueprintId) {
        if (!confirm("Soll der Bauplan wirklich gelöscht werden?")) {
          return;
        }
     
        delete stationBlueprints[blueprintId];
        storeData(stationBlueprints, cacheKeyBlueprints);
        populateTable();
      }
     
      function resetForm() {
        populateId();
     
        document.getElementById("station-blueprint-enabled-yes").checked = false;
        document.getElementById("station-blueprint-enabled-no").checked = false;
     
        document.getElementById(buildingTypeIdSelect).selectedIndex = 0;
     
        document.getElementById("station-blueprint-name").value = "";
     
        document.getElementById("station-blueprint-building-name-regex-pattern").value = "";
     
        document.getElementById("station-blueprint-building-personnel-set-point").value = 0;
     
        document.getElementById("station-blueprint-extensions").innerHTML = "";
        document
          .getElementById("station-blueprint-extensions")
          .appendChild(elementFromString(selectBuildingTypePlaceholder));
     
        document.getElementById("station-blueprint-vehicles").innerHTML = "";
        document.getElementById("station-blueprint-vehicles").appendChild(elementFromString(selectBuildingTypePlaceholder));
     
        calculateRequiredPersonnel();
      }
     
      function importBlueprint() {
        const fileInput = document.getElementById("station-blueprint-import-file-input");
     
        if (fileInput.files.length === 0) {
          console.error("No file selected");
          return;
        }
     
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function (event) {
          try {
            const importedBlueprint = JSON.parse(event.target.result);
            let blueprintId = importedBlueprint.id;
            let persistImportedBlueprint = true;
     
            if (idExists(blueprintId)) {
              const userChoice = prompt(`
                Ein Bauplan mit der ID ${blueprintId} existiert bereits.
                Wähle eine Option:
                1. Überschreiben den bestehenden Bauplan
                2. Importierten Bauplan unter einer neuen ID speichern
              `);
     
              switch (userChoice) {
                // Overwrite
                case "1":
                  break;
     
                // Create new
                case "2":
                  blueprintId = generateUniqueId();
                  importedBlueprint.id = blueprintId;
                  break;
     
                default:
                  persistImportedBlueprint = false;
                  break;
              }
            }
     
            if (persistImportedBlueprint) {
              stationBlueprints[blueprintId] = importedBlueprint;
              storeData(stationBlueprints, cacheKeyBlueprints);
            }
     
            populateTable();
     
            fileInput.value = "";
          } catch (error) {
            console.error("Error parsing JSON:", error);
          }
        };
     
        reader.readAsText(file);
      }
     
      function exportBlueprint(blueprintId) {
        const blueprint = stationBlueprints[blueprintId];
     
        if (!blueprint) {
          console.error("Blueprint not found for ID:", blueprintId);
          return;
        }
     
        const blueprintJson = JSON.stringify(blueprint, null, 2);
        const blob = new Blob([blueprintJson], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `blueprint_${blueprintId}.json`;
        a.click();
     
        URL.revokeObjectURL(url);
      }
     
      //////////////////////////////////////////////////
     
      function elementFromString(htmlString) {
        const template = document.createElement("template");
        template.innerHTML = htmlString.trim();
        return template.content.firstElementChild;
      }
     
      function renderFormPanel() {
        return `<div id="station-blueprint-form" class="panel panel-default" style="display: none">
      <div class="panel-heading">
        <div class="row">
          <div class="col-sm-10">
            <h3 class="panel-title">Bauplan erstellen/bearbeiten</h3>
          </div>
          <div class="col-sm-2">
            <button id="station-blueprint-toggle-help" type="button" class="btn btn-default btn-xs pull-right">
              <span class="glyphicon glyphicon-question-sign" aria-hidden="true"></span>
              Hilfe
            </button>
          </div>
        </div>
      </div>
      <div class="panel-body">
        <form class="form-horizontal">
          <div class="form-group">
            <label for="station-blueprint-id" class="col-sm-2 control-label">Id</label>
            <div class="col-sm-10">
              <input type="text" class="form-control" id="station-blueprint-id" disabled value="" />
              <p class="help-block" style="display: none">
                Die Id wird automatisch generiert und wird für die Identifikation des Bauplanes verwendet.
              </p>
            </div>
          </div>
     
          <div class="form-group">
            <label class="col-sm-2 control-label">Aktiviert</label>
            <div class="col-sm-10">
              <label class="radio-inline">
                <input type="radio" name="station-blueprint-enabled" id="station-blueprint-enabled-yes" value="yes" />
                Ja
              </label>
              <label class="radio-inline">
                <input type="radio" name="station-blueprint-enabled" id="station-blueprint-enabled-no" value="no" />
                Nein
              </label>
              <p class="help-block" style="display: none">
                Nur aktivierte Baupläne stehen in den diversen Scripten zur Auswahl. Unvollständige oder im
                Moment nicht benötigte Baupläne können deaktiviert werden.
              </p>
            </div>
          </div>
     
          <div class="form-group">
            <label for="station-blueprint-building-type-id" class="col-sm-2 control-label">Gebäudetyp</label>
            <div class="col-sm-10">
              <select class="form-control" id="station-blueprint-building-type-id">
                <option value="">Bitte wählen...</option>
              </select>
              <p class="help-block" style="display: none">
                Dieser Wert bestimmt für welchen Gebäudetyp der Bauplan angewendet werden kann.
              </p>
            </div>
          </div>
     
          <div class="form-group">
            <label for="station-blueprint-name" class="col-sm-2 control-label">Name</label>
            <div class="col-sm-10">
              <input
                type="text"
                class="form-control"
                id="station-blueprint-name"
                placeholder="Feuerwehr Norm 1"
              />
              <p class="help-block" style="display: none">
                Hierüber kann der Benutzer den Bauplan identifizieren. Der Name wird zum Beispiel in der
                Übersicht angezeigt.
              </p>
            </div>
          </div>
     
          <div class="form-group">
            <label for="station-blueprint-building-name-regex-pattern" class="col-sm-2 control-label"
            >Regex</label
            >
            <div class="col-sm-10">
              <input
                type="text"
                class="form-control"
                id="station-blueprint-building-name-regex-pattern"
                placeholder="^Florian(?: \\d{6})? NW$"
              />
              <p class="help-block" style="display: none">
                Regulärer Ausdruck, der den Namen des Gebäudes beschreibt. Dies erlaubt mehrere Baupläne pro
                Gebäudetyp, bspw. bei der Feuerwehr für Normalwachen und Werkfeuerwehren. Soll der Bauplan für
                alle Gebäude dieses Typs gelten, kann das Feld leer gelassen werden.
              </p>
            </div>
          </div>
     
          <div id="station-blueprint-building-personnel-set-point-form-group" class="form-group">
            <label for="station-blueprint-building-personnel-set-point" class="col-sm-2 control-label"
            >Sollpersonal</label
            >
            <div class="col-sm-10">
              <input
                type="number"
                class="form-control"
                id="station-blueprint-building-personnel-set-point"
                value="0"
                max="400"
                aria-describedby="station-blueprint-building-personnel-set-point-validation"
              />
              <span id="station-blueprint-building-personnel-set-point-validation" class="help-block">A block of help text that breaks onto a new line and may extend beyond one line.</span>
              <p class="help-block" style="display: none">
                Anzahl an Personal, die auf der Wache sein soll. Findet bspw. Verwendung im Gebäude- und
                Fuhrparkverwalter, um das Sollpersonal zu kontrollieren und ggf. berichtigen.
              </p>
            </div>
          </div>
     
          <div class="form-group">
            <label class="col-sm-2 control-label">Erweiterungen</label>
            <div class="col-sm-10">
              <div id="station-blueprint-extensions" class="row">
                <p class="col-sm-10 text-muted"><em>Bitte zuerst Gebäudetyp wählen...</em></p>
              </div>
              <p class="help-block" style="display: none">
                Erweiterungen, die für Gebäude dieses Bauplanes gebaut werden sollen, können hier ausgewählt
                werden. Die Erweiterungen lassen sich per Doppelklick zwischen den beiden Listen bewegen. Mit den
                Pfeiltasten nach oben und unten werden ausgewählte Erweiterungen in der rechten Liste sortiert. Die
                Sortierung bestimmt die Reihenfolge beim Bau der Wachen (oberste zuerst).
              </p>
            </div>
          </div>
     
          <div class="form-group">
            <label class="col-sm-2 control-label">Fahrzeuge</label>
            <div class="col-sm-10">
              <div id="station-blueprint-vehicles" class="row">
                <p class="col-sm-10 text-muted"><em>Bitte zuerst Gebäudetyp wählen...</em></p>
              </div>
              <p class="help-block" style="display: none">
                Die Anzahl legt fest, wie viele Fahrzeuge eines Typs auf der Wache stationiert sein sollen. Dies kann
                in der Überprüfung der Vollständigkeit von Wachen, aber auch beim Kauf von Fahrzeugen zum Einsatz
                kommen.
              </p>
            </div>
          </div>
     
          <!-- Informationen zu benötigtem Personal und Ausbildung -->
          <div class="form-group">
            <label class="col-sm-2 control-label">Benötigtes Personal</label>
            <div class="col-sm-10">
              <table id="station-blueprint-required-personnel" class="table table-hover table-condensed">
                <thead>
                <tr>
                  <th>Anzahl</th>
                  <th>Kategorie</th>
                  <th>Ausbildung</th>
                </tr>
                </thead>
                <tbody></tbody>
                <tfoot>
                <tr>
                  <th id="station-blueprint-required-personnel-total">0</th>
                  <th>Gesamt</th>
                  <th>&nbsp;</th>
                </tr>
                </tfoot>
              </table>
     
              <p class="help-block" style="display: none">
                Das benötigte Personal wird von den Fahrzeugen abgeleitet und gibt eine schnelle Übersicht, wie viel
                Personal mit welchen Ausbildungen für die Wache benötigt wird. Das Sollpersonal sollte mindestens so
                hoch sein wie das benötigte Personal.
              </p>
            </div>
          </div>
     
          <div class="form-group">
            <div class="col-sm-offset-2 col-sm-10">
              <button id="station-blueprint-form-save" type="submit" class="btn btn-primary">
                <span class="glyphicon glyphicon-floppy-disk" aria-hidden="true"></span>
                Speichern
              </button>
              <button id="station-blueprint-form-cancel" type="button" class="btn btn-default">
                <span class="glyphicon glyphicon-remove" aria-hidden="true"></span>
                Abbrechen
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    `;
      }
     
      function renderTablePanel() {
        return `<div id="station-blueprint-list" class="panel panel-default">
            <div class="panel-heading">
              <h3 class="panel-title">Gespeicherte Baupläne</h3>
            </div>
            <div class="panel-body">
              <div class="pull-right">
                <button id="station-blueprint-new" type="button" class="btn btn-primary btn-xs" style="display: inline-block; vertical-align: middle;">
                  <span class="glyphicon glyphicon-plus" aria-hidden="true"></span>
                  Neuer Bauplan
                </button>
                <input id="station-blueprint-import-file-input" type="file" style="display: inline-block; vertical-align: middle; margin-left: 10px;" />
                <button id="station-blueprint-import" type="button" class="btn btn-default btn-xs" style="display: inline-block; vertical-align: middle; margin-left: 10px;">
                  <span class="glyphicon glyphicon-import" aria-hidden="true"></span>
                  Bauplan importieren
                </button>
              </div>
              <table id="station-blueprint-table" class="table table-striped table-hover table-condensed">
                <thead>
                  <tr>
                    <th>Id</th>
                    <th>Aktiv</th>
                    <th>Gebäudetyp</th>
                    <th>Name</th>
                    <th>Regex</th>
                    <th>Sollpersonal</th>
                    <th>Erweiterungen</th>
                    <th>Fahrzeuge</th>
                    <th>&nbsp;</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </div>`;
      }
     
      async function initModal() {
        if (document.getElementById(modalId)) {
          return;
        }
     
        const closeSpan = document.createElement("span");
        closeSpan.setAttribute("aria-hidden", "true");
        closeSpan.textContent = "×";
     
        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "close";
        closeButton.setAttribute("data-dismiss", "modal");
        closeButton.setAttribute("aria-label", "Close");
        closeButton.appendChild(closeSpan);
     
        const modalTitle = document.createElement("h4");
        modalTitle.id = "station-blueprint-modal-title";
        modalTitle.className = "modal-title";
        modalTitle.textContent = "Wachenbaupläne";
     
        const modalHeader = document.createElement("div");
        modalHeader.className = "modal-header";
        modalHeader.appendChild(closeButton);
        modalHeader.appendChild(modalTitle);
     
        const modalBody = document.createElement("div");
        modalBody.className = "modal-body";
        modalBody.appendChild(elementFromString(renderFormPanel()));
        modalBody.appendChild(elementFromString(renderTablePanel()));
     
        const modalContent = document.createElement("div");
        modalContent.className = "modal-content";
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
     
        const modalDialog = document.createElement("div");
        modalDialog.className = "modal-dialog";
        modalDialog.role = "document";
        modalDialog.style.minWidth = "min(1850px, 90%)";
        modalDialog.style.maxWidth = "min(1850px, 90%)";
        modalDialog.appendChild(modalContent);
     
        const modal = document.createElement("div");
        modal.className = "modal fade";
        modal.id = modalId;
        modal.tabIndex = -1;
        modal.role = "dialog";
        modal.setAttribute("aria-labelledby", "station-blueprint-modal-title");
        modal.appendChild(modalDialog);
        modal.style.zIndex = "5000";
     
        document.body.appendChild(modal);
      }
     
      function addMenuEntry() {
        const icon = document.createElement("span");
        icon.className = "glyphicon glyphicon-home";
        icon.setAttribute("aria-hidden", "true");
     
        const a = document.createElement("a");
        a.href = "#";
        a.appendChild(icon);
        a.appendChild(document.createTextNode(" Wachenbaupläne"));
     
        const li = document.createElement("li");
        li.role = "presentation";
        li.setAttribute("data-toggle", "modal");
        li.setAttribute("data-target", `#${modalId}`);
     
        li.appendChild(a);
     
        const aaosLi = document.querySelector('a[href="/aaos"]').parentNode;
        aaosLi.parentNode.insertBefore(li, aaosLi.nextSibling);
      }
     
      function addEventListeners() {
        document
          .getElementById("station-blueprint-building-personnel-set-point")
          .addEventListener("change", calculateRequiredPersonnel);
     
        document.getElementById(buildingTypeIdSelect).addEventListener("change", buildingTypeChanged);
     
        document.getElementById("station-blueprint-form-save").addEventListener("click", function (event) {
          savesBlueprint(event);
        });
     
        document.getElementById("station-blueprint-form-cancel").addEventListener("click", function () {
          cancelBlueprint();
        });
     
        document.getElementById("station-blueprint-new").addEventListener("click", function () {
          newBlueprint();
        });
     
        document.getElementById("station-blueprint-import").addEventListener("click", function () {
          importBlueprint();
        });
     
        document.getElementById("station-blueprint-toggle-help").addEventListener("click", function () {
          const helpBlocks = document.querySelectorAll(".help-block");
          helpBlocks.forEach(helpBlock => {
            helpBlock.style.display = helpBlock.style.display === "none" ? "block" : "none";
          });
        });
      }
     
      async function main() {
        Promise.all([initModal(), initStationBlueprints(), initBuildingTypes(), initVehicleTypes()]).then(() => {
          populateTable();
          populateId();
          populateBuildingTypes(flatBuildingTypes(buildingTypes));
          addEventListeners();
        });
     
        addMenuEntry();
      }
     
      main();
    })();

