

    // ==UserScript==
    // @name        * Beschaffungsagent
    // @namespace   bos-ernie.leitstellenspiel.de
    // @version     1.0.2
    // @license     BSD-3-Clause
    // @author      BOS-Ernie
    // @description Gibt gemäss Wachenbauplan Erweiterungen in Auftrag (coming soon) und beschafft Fahrzeuge
    // @match       https://www.leitstellenspiel.de/buildings/*
    // @icon        https://www.google.com/s2/favicons?sz=64&domain=leitstellenspiel.de
    // @run-at      document-idle
    // @grant       none
    // @resource    https://forum.leitstellenspiel.de/index.php?thread/27183-script-beschaffungsagent/
    // ==/UserScript==
     
    (async function () {
      const unsupportedBuildingTypeIds = [1, 3, 4, 7, 8, 10];
      const pseudoBuildingTypeIdMapping = {
        0: 18,
        2: 20,
        6: 19,
      };
      let currentVehicleTypes;
     
      let stationConfigurations = [];
     
      const containerId = "procurement-agent-container";
      const progressBarContainerId = "procurement-agent-progress-bar-container";
     
      const databaseName = "BosErnie_StationBlueprints";
      const objectStoreName = "main";
      const cacheKeyBlueprints = "blueprints";
     
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
              objectStore.createIndex("buildings", "buildings", { unique: false });
              objectStore.createIndex("vehicles", "vehicles", { unique: false });
            }
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
     
      async function initStationConfigurations() {
        stationConfigurations = await retrieveData(cacheKeyBlueprints);
     
        if (!stationConfigurations) {
          stationConfigurations = [];
        }
      }
     
      function getStationConfiguration(id) {
        return stationConfigurations[id];
      }
     
      function getBuildingTypeId(h1) {
        let buildingTypeId = parseInt(h1.getAttribute("building_type"));
     
        if (!!document.querySelector("a[href$='small_expand']") && buildingTypeId in pseudoBuildingTypeIdMapping) {
          return pseudoBuildingTypeIdMapping[buildingTypeId];
        }
     
        return buildingTypeId;
      }
     
      function updateCurrentVehicleTypes() {
        const vehicleTypeIds = Array.from(document.getElementsByTagName("img"))
          .filter(e => e.getAttribute("vehicle_type_id") != null)
          .map(e => parseInt(e.getAttribute("vehicle_type_id"), 10)); // Parsing to Integer
     
        const frequencyMap = vehicleTypeIds.reduce((acc, id) => {
          acc[id] = (acc[id] || 0) + 1;
          return acc;
        }, {});
     
        currentVehicleTypes = Object.entries(frequencyMap).map(([id, quantity]) => ({
          id: parseInt(id, 10), // Ensure id is stored as an Integer
          quantity,
        }));
      }
     
      function getTotalNumberOfVehicles(vehicles) {
        return vehicles.reduce((acc, vehicle) => acc + vehicle.quantity, 0);
      }
     
      function isVehicleFleetComplete(vehicles) {
        for (let i = 0; i < vehicles.length; i++) {
          const vehicle = vehicles[i];
          let vehicleTypeAmount = currentVehicleTypes.filter(e => e.id === vehicle.id).length;
          if (vehicleTypeAmount < parseInt(vehicle.quantity)) {
            return false;
          }
        }
     
        return true;
      }
     
      async function completeVehicleFleet(target) {
        let vehicleBought = false;
     
        const buildingId = window.location.pathname.replace("/buildings/", "");
     
        const stationConfigurationId = target.getAttribute("vehicle-fleet-configuration-id");
        let stationConfiguration = getStationConfiguration(stationConfigurationId);
     
        if (isVehicleFleetComplete(stationConfiguration.vehicles)) {
          return;
        }
     
        initProgressBar(0, getTotalNumberOfVehicles(stationConfiguration.vehicles));
        for (let i = 0; i < stationConfiguration.vehicles.length; i++) {
          const vehicleConfiguration = stationConfiguration.vehicles[i];
     
          let numberCurrentVehicles = 0;
          const filteredCurrentVehicles = currentVehicleTypes.filter(e => e.id === vehicleConfiguration.id);
          if (filteredCurrentVehicles.length > 0) {
            numberCurrentVehicles = filteredCurrentVehicles[0].quantity;
          }
     
          if (numberCurrentVehicles === vehicleConfiguration.quantity) {
            advanceProgressBar(numberCurrentVehicles);
            continue;
          }
     
          const numberOfVehiclesToBuy = vehicleConfiguration.quantity - numberCurrentVehicles;
     
          for (let n = 0; n < numberOfVehiclesToBuy; n++) {
            advanceProgressBar();
     
            vehicleBought = true;
     
            await buyVehicle(buildingId, vehicleConfiguration.id);
          }
        }
        finishProgress();
     
        if (vehicleBought) {
          location.reload();
        }
      }
     
      async function buyVehicle(buildingId, vehicleTypeId) {
        await fetch(`/buildings/${buildingId}/vehicle/${buildingId}/${vehicleTypeId}/credits?building=${buildingId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            _method: "get",
            authenticity_token: document.querySelector('meta[name="csrf-token"]').getAttribute("content"),
          }),
        });
     
        await new Promise(resolve => setTimeout(resolve, 100));
      }
     
      function initProgressBar(current, total) {
        const progress = document.createElement("div");
        progress.className = "progress-bar";
        progress.setAttribute("role", "progressbar");
        progress.setAttribute("aria-valuenow", current);
        progress.setAttribute("aria-valuemin", 0);
        progress.setAttribute("aria-valuemax", total);
        progress.style.width = (current / total) * 100 + "%";
        progress.innerText = current + " / " + total;
     
        const progressBar = document.createElement("div");
        progressBar.className = "progress";
        progressBar.style.margin = "0";
        progressBar.appendChild(progress);
     
        const progressBarContainer = document.getElementById(progressBarContainerId);
        progressBarContainer.appendChild(progressBar);
      }
     
      function getProgressBar() {
        return document.getElementById(progressBarContainerId).querySelector(".progress-bar");
      }
     
      function advanceProgressBar(increment = 1) {
        const progress = getProgressBar();
     
        const current = parseInt(progress.getAttribute("aria-valuenow"));
        const total = parseInt(progress.getAttribute("aria-valuemax"));
        const newCurrent = current + increment;
     
        progress.setAttribute("aria-valuenow", newCurrent.toString());
        progress.style.width = (newCurrent / total) * 100 + "%";
        progress.innerText = newCurrent + " / " + total;
      }
     
      function finishProgress() {
        const progress = getProgressBar();
     
        const total = parseInt(progress.getAttribute("aria-valuemax"));
     
        progress.setAttribute("aria-valuenow", total.toString());
        progress.style.width = "100%";
        progress.innerText = total + " / " + total;
      }
     
      function init(h1, buildingTypeId) {
        const buttonGroup = document.createElement("div");
        buttonGroup.className = "btn-group";
     
        for (const [id, configuration] of Object.entries(stationConfigurations)) {
          if (configuration.buildingTypeId !== buildingTypeId) {
            continue;
          }
     
          let className = "btn btn-default btn-xs";
          if (configuration.buildingNameRegexPattern) {
            const stationName = h1.innerText;
            if (stationName.match(new RegExp(configuration.buildingNameRegexPattern))) {
              className = "btn btn-primary btn-xs";
            }
          }
     
          let btn = document.createElement("a");
          btn.className = className;
          btn.setAttribute("vehicle-fleet-configuration-id", configuration.id);
          btn.innerText = configuration.name;
     
          if (configuration.enabled) {
            btn.addEventListener("click", function () {
              completeVehicleFleet(btn);
            });
          } else {
            btn.setAttribute("disabled", "disabled");
            btn.style.cursor = "not-allowed";
          }
     
          buttonGroup.appendChild(btn);
        }
     
        const progressBarContainer = document.createElement("div");
        progressBarContainer.id = progressBarContainerId;
        progressBarContainer.style.position = "relative";
        progressBarContainer.style.display = "inline-block";
        progressBarContainer.style.verticalAlign = "middle";
        progressBarContainer.style.marginLeft = "10px";
        progressBarContainer.style.width = "300px";
     
        const container = document.createElement("span");
        container.id = containerId;
        container.style.marginLeft = "10px";
        container.appendChild(buttonGroup);
        container.appendChild(progressBarContainer);
     
        const btnVehicleMarket = document.querySelector("a[href$='/vehicles/new']");
        btnVehicleMarket.parentNode.insertBefore(container, btnVehicleMarket.nextSibling);
      }
     
      async function main() {
        const h1 = document.querySelector("h1[building_type]");
        if (!h1) {
          return;
        }
     
        const buildingTypeId = getBuildingTypeId(h1);
     
        if (unsupportedBuildingTypeIds.indexOf(buildingTypeId) >= 0) {
          return;
        }
     
        await initStationConfigurations();
        init(h1, buildingTypeId);
        updateCurrentVehicleTypes();
      }
     
      main();
    })();

