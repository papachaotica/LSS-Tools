    /**
    * Lädt die gespeicherten Fahrzeugtypen aus dem Tampermonkey-Speicher.
    * Standardwerte werden verwendet, falls noch keine Konfiguration existiert.
    */
    let firstResponderVehicleTypeIds = JSON.parse(GM_getValue('lss_first_responder_ids', '[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,30,33,34,35,36,37,38,39,40,41,43,44,46,50,51,53,57,63,66,67,68,69,70,71,72,75,76,79,80,81,82,83,84,85,86,87,88,89,90,91,92,94,95,101,102,104,105,106,107,109,110,111,112,113,114,115,118,120,121,124,125,126,127,128,129,130,131,132,134,135,136,139,140,141,143,144,145,146,148,150,152,153,154,155,158,160,162,163,165,166,167,168,173,174,175,177,178,182,183]'));

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
