// ==UserScript==
// @name         LSS Massenentlassungen
// @namespace    www.leitstellenspiel.de
// @version      1.1.0
// @description  Ermöglicht das massenhafte Entlassen von Personal
// @author       MissSobol
// @contributor  papachaotica
// @match        https://www.leitstellenspiel.de/buildings/*/personals
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const authToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    const table = document.querySelector('#personal_table');
    if (!table) return;

    // Hauptinterface
    const controlPanel = document.createElement('div');
    controlPanel.style.margin = '1em 0';

    table.parentElement.insertBefore(controlPanel, table);

    // Zusätzliche Buttons
    let extraButtonsContainer = null;
    let selectedCounter;
    addExtraButtons();

    table.addEventListener('change', event => {
        if (event.target.matches('.personal-delete-checkbox')) {
            updateSelectedCount();
        }
    });

    // Toggle-State
    let checkboxesVisible = false;

    function createButton(label, onClick) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.style.marginRight = '0.5em';
        btn.className = 'btn btn-default btn-xs';
        btn.addEventListener('click', onClick);
        return btn;
    }

    function addExtraButtons() {
        extraButtonsContainer = document.createElement('div');
        extraButtonsContainer.style.margin = '0.5em 0';

        const btnNoTraining = createButton('Personal ohne Ausbildung auswählen', selectWithoutTraining);
        const btnNoBinding = createButton('Personal ohne Bindung auswählen', selectWithoutBinding);
        const btnNoTrainingAndBinding = createButton('Personal ohne Ausbildung und Bindung auswählen', selectWithoutTrainingAndBinding);
        const btnResetSelection = createButton('Auswahl zurücksetzen', resetCheckboxes);
        selectedCounter = document.createElement('span');
        selectedCounter.style.marginLeft = '0.5em';

        extraButtonsContainer.append(btnNoTraining, btnNoBinding, btnNoTrainingAndBinding, btnResetSelection, selectedCounter);
        controlPanel.appendChild(extraButtonsContainer);
    }
    function updateSelectedCount() {
        const count = table.querySelectorAll(
            '.personal-delete-checkbox:checked'
        ).length;

        selectedCounter.textContent =
            `${count} Person${count === 1 ? '' : 'en'} ausgewählt`;
    }

    function resetCheckboxes() {
        const checkboxes = document.querySelectorAll('.personal-delete-checkbox:checked');
        checkboxes.forEach(checkbox => checkbox.click());
    }

    /* Funktionen zum selektieren */

    // Dumm
    function selectWithoutTraining() {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const trainingCell = row.children[2];
            const checkbox = row.querySelector('.personal-delete-checkbox');
            const select = trainingCell.textContent.trim() === '';
            if (checkbox && checkbox.checked !== select) { checkbox.click(); }
        });
    }

    // Faul
    function selectWithoutBinding() {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const bindingCell = row.children[3];
            const checkbox = row.querySelector('.personal-delete-checkbox');
            const select = bindingCell.textContent.trim() === '';
            if (checkbox && checkbox.checked !== select) { checkbox.click(); }
        });
    }

    // Faul und Dumm
    function selectWithoutTrainingAndBinding() {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const trainingCell = row.children[2];
            const bindingCell = row.children[3];
            const checkbox = row.querySelector('.personal-delete-checkbox');
            const select = trainingCell.textContent.trim() === '' && bindingCell.textContent.trim() === '';
            if (checkbox && checkbox.checked !== select) { checkbox.click(); }
        });
    }

})();
