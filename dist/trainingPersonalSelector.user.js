// ==UserScript==
// @name        [ LSS ] erweiterter Lehrgangszuweiser
// @namespace   papachaotica.leitstellenspiel.de
// @version     1.6.0.260920.1925
// @license     BSD-3-Clause
// @author      BOS-Ernie | papachaotica
// @contributor Codex
// @description Fügt Buttons hinzu, um Personal einer Wache gesammelt einem Lehrgang zuzuweisen. Behebt wechselwirkung mit Ausbildungsmausschoner und erweitert um Vollausblidungs Feature
// @match       https://www.leitstellenspiel.de/buildings/*
// @match       https://polizei.leitstellenspiel.de/buildings/*
// @match       https://www.leitstellenspiel.de/schoolings/*
// @match       https://polizei.leitstellenspiel.de/schoolings/*
// @match       https://www.meldkamerspel.com/buildings/*
// @match       https://politie.meldkamerspel.com/buildings/*
// @match       https://www.meldkamerspel.com/schoolings/*
// @match       https://politie.meldkamerspel.com/schoolings/*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=leitstellenspiel.de
// @run-at      document-idle
// @grant       none
// @resource    https://forum.leitstellenspiel.de/index.php?thread/23382-script-lehrgangszuweiser-by-bos-ernie/
// ==/UserScript==

/* global loadedBuildings */

(function () {
  let requiredNumberOfPersonnel = null;

  document.addEventListener("educationValueChanged", function (e) {
    const numberOfRequiredPersonnel = e.detail;
    if (numberOfRequiredPersonnel === requiredNumberOfPersonnel) return;

    requiredNumberOfPersonnel = numberOfRequiredPersonnel;
    renderPersonnelSelectors();
  });

  function renderPersonnelSelectors() {
    const elements = document.getElementsByClassName("panel-heading personal-select-heading");
    for (let i = 0; i < elements.length; i++) {
      const buildingId = elements[i].getAttribute("building_id");
      elements[i].children[0].appendChild(createPersonnelSelector(buildingId));
    }
    $(".personal-select-heading").unbind("click").bind("click", panelHeadingClickEvent);
  }

  async function selectPersonnelClick(event) {
    await selectPersonnel(event.target.dataset.buildingId, event.target.dataset.capacity, event.target.dataset.selectionMode);
    event.preventDefault();
  }

  async function resetPersonnelClick(event) {
    await resetPersonnel(event.target.dataset.buildingId);
    event.preventDefault();
  }

  async function panelHeadingClickEvent(event) {
    if (event.target.classList.contains("schooling-personnel-select-button") || event.target.parentNode.classList.contains("schooling-personnel-reset-button")) return;

    let buildingIdElement = event.target.outerHTML.match(/building_id="(\d+)"/);
    if (buildingIdElement === null) buildingIdElement = event.target.parentElement.parentElement.parentElement.parentElement.outerHTML.match(/building_id="(\d+)"/);
    await panelHeadingClick(buildingIdElement[1], true);
  }

  async function panelHeadingClick(buildingId, toggle = false) {
    const panelHeading = getPanelHeading(buildingId);
    const panelBody = document.querySelector(".panel-body[building_id='" + buildingId + "']");
    const href = panelHeading.outerHTML.match(/href="([^"]+)"/)[1];

    if (panelBody.classList.contains("hidden")) {
      if (toggle) panelBody.classList.remove("hidden");
      if (loadedBuildings.indexOf(href) === -1) {
        loadedBuildings.push(href);
        await $.get(href, function (data) {
          $(".panel-body[building_id='" + buildingId + "']").html(data);
          // Die aktuelle Spielauswahl liefert den Schlüssel über
          // getSelectedEducationKey(). Damit bleiben bereits ausgebildete
          // Personen auch nach dem Nachladen deaktiviert.
          const legacyEducationKey = $("input[name=education]:checked").attr("education_key");
          const educationKey = typeof window.getSelectedEducationKey === "function"
            ? window.getSelectedEducationKey()
            : typeof legacyEducationKey !== "undefined"
              ? legacyEducationKey
              : typeof globalEducationKey !== "undefined"
                ? globalEducationKey
                : undefined;
          if (typeof educationKey !== "undefined") {
            schooling_disable(educationKey);
            update_schooling_free();
          }
        });
      }
    } else if (toggle) panelBody.classList.add("hidden");
  }

  function addSelectorButton(buttonGroup, buildingId, capacity, selectionMode, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn " + className + " btn-sm schooling-personnel-select-button";
    button.dataset.buildingId = buildingId;
    button.dataset.capacity = capacity.toString();
    button.dataset.selectionMode = selectionMode;
    button.textContent = capacity.toString();
    button.addEventListener("click", selectPersonnelClick);
    buttonGroup.appendChild(button);
  }

  function normaliseEducationName(name) {
    return name.replace(/\s+/g, " ").trim();
  }

  function selectedEducationName() {
    const educationSelect = document.getElementById("education_select");
    if (!educationSelect || educationSelect.selectedIndex < 0) return null;

    // Der sichtbare Text enthält beim Lehrgangsauswahlfeld den Zusatz
    // "(X Tage)"; in der Personaltabelle steht nur der Lehrgangsname.
    return normaliseEducationName(educationSelect.options[educationSelect.selectedIndex].textContent)
      .replace(/\s*\(\d+\s+Tage\)\s*$/, "");
  }

  function hasEducation(row, educationName) {
    const educationCell = row.cells[2]; // Spalte „Ausbildung“
    if (!educationCell || !educationName) return false;

    // Mehrere Ausbildungen werden im Tabellenfeld zeilenweise bzw. mit
    // Kommas getrennt ausgegeben. Exakter Vergleich verhindert Teiltreffer.
    const educations = educationCell.innerText
      .split(/[\n,;]/)
      .map(normaliseEducationName)
      .filter(Boolean);
    return educations.includes(educationName);
  }

  function createPersonnelSelector(buildingId) {
    const existingButtonGroup = document.getElementById("schooling-assigner-" + buildingId);
    if (existingButtonGroup) existingButtonGroup.remove();

    const buttonGroup = document.createElement("div");
    buttonGroup.id = "schooling-assigner-" + buildingId;
    buttonGroup.className = "btn-group btn-group-xs";

    const resetIcon = document.createElement("span");
    resetIcon.className = "glyphicon glyphicon-trash";
    resetIcon.dataset.buildingId = buildingId;
    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "btn btn-default btn-sm schooling-personnel-reset-button";
    resetButton.appendChild(resetIcon);
    resetButton.addEventListener("click", resetPersonnelClick);
    buttonGroup.appendChild(resetButton);

    for (let i = 1; i < 11; i++) addSelectorButton(buttonGroup, buildingId, i, "unassigned", "btn-default");

    // Orange: Personen dürfen andere Lehrgänge oder Fahrzeugzuweisungen haben.
    // Sie werden nur gewählt, wenn ihnen der aktuell ausgewählte Lehrgang fehlt.
    for (const capacity of [25, 50, 100]) addSelectorButton(buttonGroup, buildingId, capacity, "course-only", "btn-warning");

    if (requiredNumberOfPersonnel > 10) addSelectorButton(buttonGroup, buildingId, requiredNumberOfPersonnel, "unassigned", "btn-default");
    return buttonGroup;
  }

  async function selectPersonnel(buildingId, capacity, selectionMode) {
    await panelHeadingClick(buildingId);

    const schoolingFree = $("#schooling_free");
    let free = schoolingFree.html();
    const educationName = selectionMode === "course-only" ? selectedEducationName() : null;
    $(".schooling_checkbox[building_id='" + buildingId + "']").each(function () {
      if (!$(this).prop("checked") && !$(this).prop("disabled") && free > 0 && capacity > 0) {
        const educationCell = document.getElementById("school_personal_education_" + $(this).val());
        const vehicleAssignmentCell = educationCell.nextElementSibling;
        const row = this.closest("tr");
        const maySelect = selectionMode === "course-only"
          ? row !== null && educationName !== null && !hasEducation(row, educationName)
          : educationCell.innerHTML.trim() === "" && vehicleAssignmentCell.innerHTML.trim() === "";
        if (maySelect) {
          $(this).prop("checked", true);
          --free;
          --capacity;
        }
      }
    });
    schoolingFree.html(free);
    update_costs();
    updateSelectionCounter(buildingId);
  }

  async function resetPersonnel(buildingId) {
    await panelHeadingClick(buildingId);
    const schoolingFree = $("#schooling_free");
    let free = schoolingFree.html();
    $(".schooling_checkbox[building_id='" + buildingId + "']").each(function () {
      if ($(this).prop("checked")) {
        $(this).prop("checked", false);
        ++free;
      }
    });
    schoolingFree.html(free);
    update_costs();
    updateSelectionCounter(buildingId);
  }

  function countSelectedPersonnel(buildingId) {
    let count = 0;
    const checkboxes = document.querySelectorAll(".schooling_checkbox[building_id='" + buildingId + "']");
    for (let i = 0; i < checkboxes.length; i++) if (checkboxes[i].checked) count++;
    return count;
  }

  function updateSelectionCounter(buildingId) {
    const elementId = "personnel-selection-counter-" + buildingId;
    const counter = document.createElement("span");
    counter.id = elementId;
    counter.className = "label label-primary";
    counter.textContent = countSelectedPersonnel(buildingId) + " ausgewählt";
    const element = document.getElementById(elementId);
    if (element) element.replaceWith(counter);
    else document.getElementById("schooling-assigner-" + buildingId).parentNode.prepend(counter);
  }

  function getPanelHeading(buildingId) {
    return document.querySelector(".personal-select-heading[building_id='" + buildingId + "']");
  }

  function main() {
    if (window.location.href.match(/\/buildings\/\d+\/hire/)) return;
    renderPersonnelSelectors();
    document.addEventListener("lehrgangszuweiser:render-personnel-selectors", renderPersonnelSelectors);
  }

  main();
})();
