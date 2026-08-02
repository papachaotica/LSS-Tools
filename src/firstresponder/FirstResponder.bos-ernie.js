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
