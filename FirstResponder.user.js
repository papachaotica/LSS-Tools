// ==UserScript==
// @name         [LSS] Ersthelfer
// @namespace    papachaotica.leitstellenspiel.de
// @version      2.0.0-rc1
// @license      AGPL-3.0-or-later
// @author       BOS-Ernie (Orginal) / papachaotica (Erweiterung)
// @description  Wählt das nächstliegende Ersthelferfahrzeug aus; Fahrzeuge können über ein Menü konfiguriert werden.
// @run-at       document-idle
// @match        https://*.leitstellenspiel.de/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      api.lss-manager.de
// @downloadURL  https://github.com/papachaotica/LSS-Tools/raw/refs/heads/main/FirstResponder.user.js
// @updateURL    https://github.com/papachaotica/LSS-Tools/raw/refs/heads/main/FirstResponder.user.js
// ==/UserScript==

/*
 * Based on original work by BOS-Ernie.
 *
 * Original license:
 * BSD-3-Clause
 *
 * Modified and extended by papachaotica.
 * Current project license:
 * AGPL-3.0-or-later
 */

(function () {
    'use strict';

    /**
    * Lädt die gespeicherten Fahrzeugtypen aus dem Tampermonkey-Speicher.
    * Standardwerte werden verwendet, falls noch keine Konfiguration existiert.
    */
    let firstResponderVehicleTypeIds = JSON.parse(GM_getValue('lss_first_responder_ids', '[0, 1, 2, 3, 4, 30]'));

    /**
     * Öffnet ein neues Overlay Fenster, lädt Fahrzeugdaten von der API und erlaubt die Auswahl via Checkboxen.
     */
    function openConfigWindow() {
        const overlay = document.createElement("div");
        overlay.id = "firstResponderConfig";
        overlay.style.position = "fixed";
        overlay.style.top = "50px";
        overlay.style.left = "50px";
        overlay.style.width = "600px";
        overlay.style.height = "700px";
        overlay.style.background = "#222";
        overlay.style.color = "white";
        overlay.style.zIndex = "99999";
        overlay.style.padding = "20px";
        overlay.style.overflow = "auto";
        overlay.innerHTML = `
        <div class="configBox">
            <h2>Ersthelfer auswählen</h2>
            <table id="vehicleTable">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Auswahl</th>
                        <th>Fahrzeug</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
            <button id="saveConfig">
                Speichern
            </button>
            <button id="closeConfig">
                Abbrechen
            </button>
        </div>
    `;

        document.body.appendChild(overlay);
        const tableBody =
              overlay.querySelector("#vehicleTable tbody");
        fetchVehicles(tableBody);
        overlay
            .querySelector("#saveConfig")
            .addEventListener(
            "click",
            saveConfig
        );

        overlay
            .querySelector("#closeConfig")
            .addEventListener(
            "click",
            () => overlay.remove()
        );
    }

    /**
    * Ruft die verfügbaren Fahrzeugtypen über die LSS-Manager API ab.
    * Übergibt jedes Fahrzeug zur Darstellung an die Tabellenfunktion.
    */
    function fetchVehicles(tableBody) {
        GM_xmlhttpRequest({
            method: "GET",
            url: "https://api.lss-manager.de/de_DE/vehicles",
            onload: function(response) {
                const vehicles = JSON.parse(response.responseText);
                Object.entries(vehicles)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .forEach(([id, vehicle]) => {
                    addVehiclesToTable(
                        Number(id),
                        vehicle.caption,
                        tableBody
                    );
                });
            }
        });
    }

    /**
    * Fügt ein Fahrzeug als auswählbare Zeile in die Konfigurationstabelle ein.
    * Markiert bereits gespeicherte Fahrzeugtypen automatisch als ausgewählt.
    */
    function addVehiclesToTable(vehicleId, caption, tableBody) {
        const checked = firstResponderVehicleTypeIds.includes(vehicleId)
        ? "checked"
        : "";
        const row = document.createElement("tr");
        row.innerHTML = `
        <td>${vehicleId}</td>
        <td>
            <input type="checkbox"
                   class="vehicleConfig"
                   data-vehicle-id="${vehicleId}"
                   value="${vehicleId}"
                   ${checked}>
        </td>
        <td>${caption}</td>
    `;
        tableBody.appendChild(row);
    }

    /**
    * Speichert die aktuell ausgewählten Ersthelfer-Fahrzeugtypen dauerhaft.
    * Die Konfiguration wird im Tampermonkey-Speicher abgelegt.
    */
    function saveConfig(event) {
        const selected = [];
        event.target
            .ownerDocument
            .querySelectorAll(".vehicleConfig:checked")
            .forEach(cb => {
            selected.push(Number(cb.value));
        });
        GM_setValue(
            "lss_first_responder_ids",
            JSON.stringify(selected)
        );
        alert("Konfiguration gespeichert");
        location.reload();
        
    }

    /**   
    * Fügt einen eigenen Menüpunkt in das LSS-Profilmenü ein.
    * Öffnet darüber die Konfiguration der Ersthelfer-Fahrzeugtypen.
    */
    function addConfigMenu() {

        if (document.querySelector("#firstResponderConfigMenu")) {
            return;
        }

        const divider = document.querySelector(
            "#menu_profile + .dropdown-menu > li.divider"
        );

        if (!divider) {
            return;
        }

        const triggerLi = document.createElement("li");
        triggerLi.id = "firstResponderConfigMenu";

        const triggerA = document.createElement("a");
        triggerA.href = "#";
        triggerA.innerHTML = `
        <span class="glyphicon glyphicon-fire"></span>
        &nbsp;Ersthelfer Konfiguration
    `;

        triggerLi.appendChild(triggerA);

        triggerLi.addEventListener("click", event => {
            event.preventDefault();
            openConfigWindow();
        });

        divider.before(triggerLi);
    }

    /*
    * main()
    *
    * Completely rewritten by papachaotica.
    *
    * The original implementation by BOS-Ernie
    * is preserved in the archive directory.
    *
    * Original license: BSD-3-Clause
    */
    
    /**
    * Initialisiert das Script nach dem Laden der Seite.
    * Aktiviert Menü, Einsatzbutton und Tastatursteuerung.
    */
    function main() {

        addConfigMenu();

        if (document.querySelector("#iframe-bottom-content")) {
            addSelectButton();

            document.addEventListener("keydown", function(event) {
                if (event.key !== "f") {
                    return;
                }

                const activeElement = document.activeElement;

                if (
                    activeElement.tagName.toLowerCase() === "input" &&
                    activeElement.type.toLowerCase() === "text"
                ) {
                    return;
                }

                selectFirstResponder();
            });
        }
    }
    
   //
   // Ab hier basiert der Code weiterhin auf der Version von BOS-Ernie.
   // Die ursprüngliche Auswahl-Logik wurde beibehalten und lediglich dokumentiert.
   // Die Fahrzeugkonfiguration erfolgt jetzt über die Erweiterung von papachaotica.
   //
    
    /**
    * Erstellt den Ersthelfer-Button im Einsatzfenster.
    * Fügt den Button neben vorhandenen Einsatzaktionen ein.
    */
    function addSelectButton() {
        const icon = document.createElement("span");
        icon.classList.add("glyphicon", "glyphicon-fire");

        const firstResponderButton = document.createElement("button");
        firstResponderButton.classList.add("btn", "btn-primary");
        firstResponderButton.appendChild(icon);
        firstResponderButton.addEventListener("click", clickEventHandler);
        firstResponderButton.title = "Ersthelfer auswählen (Taste: f)";

        const wrapper = document.createElement("div");
        wrapper.classList.add("flex-row", "flex-nowrap");
        wrapper.appendChild(firstResponderButton);

        const iframeBottomContent = document.querySelector("#iframe-bottom-content");
        if (iframeBottomContent === null) {
            return;
        }

        let parent = iframeBottomContent.querySelector("#mission_alliance_share_btn");
        if (parent === null) {
            parent = iframeBottomContent.querySelector("#mission_next_mission_btn");
        }

        parent.parentElement.after(wrapper);
    }

    /**
    * Verarbeitet den Klick auf den Ersthelfer-Auswahlbutton.
    * Startet die Suche nach einem passenden Fahrzeug.
    */
    function clickEventHandler(event) {
        event.preventDefault();
        selectFirstResponder();
    }

    /**
    * Sucht ein geeignetes Ersthelferfahrzeug im aktuellen Einsatz.
    * Wählt automatisch das erste verfügbare Fahrzeug des gewünschten Typs aus.
    */
    async function selectFirstResponder() {
        const checkboxes = document.getElementsByClassName("vehicle_checkbox");

        let firstResponderFound = false;
        for (let i = 0; i < checkboxes.length; i++) {
            const checkbox = checkboxes[i];

            if (checkbox.disabled) {
                continue;
            }

            if (checkbox.checked) {
                continue;
            }

            const vehicleTypeId = parseInt(checkbox.getAttribute("vehicle_type_id"));
            // Prüft, ob der aktuelle Fahrzeugtyp in der Benutzerkonfiguration erlaubt ist.
            // Nur konfigurierte Fahrzeugtypen werden automatisch ausgewählt.
            if (firstResponderVehicleTypeIds.includes(vehicleTypeId)) {
                checkbox.click();
                firstResponderFound = true;

                break;
            }
        }

        if (!firstResponderFound) {
            alert(
                "[Ersthelfer] Kein passendes Fahrzeug gefunden. Entweder Fahrzeuge nachladen oder erlaubte Fahrzeugtypen erweitern.",
            );
        }
    }

    main();
})();
