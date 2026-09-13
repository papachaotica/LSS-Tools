// ==UserScript==
// @name         LSS Einsatz-Generierungszeitpunkt
// @version      1.1.0
// @description  Zeigt den Erstellungszeitpunkt und das Alter des Einsatzes an (Rot ab 24h um 01:00 Uhr nachts).
// @author       gemini
// @match        https://www.leitstellenspiel.de/missions/*
// @match        https://leitstellenspiel.de/missions/*
// ==/UserScript==

/* global I18n, $ */
(function () {
    'use strict';

    if (typeof I18n === 'undefined' || typeof $ === 'undefined') return;

    I18n.translations = I18n.translations || {};
    I18n.translations.de_DE = I18n.translations.de_DE || {};
    I18n.translations.de_DE.lssm = I18n.translations.de_DE.lssm || {};

    I18n.translations.de_DE.lssm.missionDate = {
        ago: 'Vor',
        months: [
            'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
            'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
        ],
        dateRegex: /([0-9]{2})\. (.*), ([0-9]{2}):([0-9]{2})/i,
    };

    function parseMissionDate(dateString) {
        if (!dateString) return null;
        let matches = dateString.match(I18n.t('lssm.missionDate.dateRegex'));
        if (!matches) return null;

        let day = parseInt(matches[1], 10);
        let monthName = matches[2];
        let hour = parseInt(matches[3], 10);
        let minute = parseInt(matches[4], 10);

        let months = I18n.t('lssm.missionDate.months');
        let month = months.indexOf(monthName);
        if (month === -1) return null;

        let today = new Date();
        let year = today.getFullYear();
        let date = new Date(year, month, day, hour, minute, 0, 0);

        if (today.getTime() - date.getTime() < 0) {
            date.setFullYear(date.getFullYear() - 1);
        }
        return date;
    }

    let $h1 = $('#missionH1');
    let missionDate = $h1.length > 0 
        ? ($h1.data('original-title') || $h1.attr('data-original-title') || $h1.attr('title')) 
        : null;

    if (missionDate) {
        let parsedMissionDate = parseMissionDate(missionDate);
        if (!parsedMissionDate) return;

        let today = new Date();
        let timeDiff = today.getTime() - parsedMissionDate.getTime();

        let minutes = timeDiff / 1000 / 60;
        let hours = minutes / 60;
        let days = hours / 24;

        let newDay = Math.floor(days);
        let newHour = Math.floor(hours % 24);
        let newMin = Math.floor(minutes % 60);

        let timeGone = '';
        if (newDay > 0) timeGone += ` ${newDay} d`;
        if (newHour > 0) timeGone += ` ${newHour} h`;
        if (newMin > 0) timeGone += ` ${newMin} min`;

        let rawDate = missionDate.trim().replace(/^.*?:/, '').trim();
        let agoText = I18n.t('lssm.missionDate.ago');
        let markup = `${rawDate} – ${agoText} ${timeGone}`;

        // Nächsten 01:00 Uhr Zeitpunkt berechnen
        let nextOneAM = new Date(today);
        nextOneAM.setHours(1, 0, 0, 0);

        // Wenn es heute schon nach 01:00 Uhr ist, nehmen wir 01:00 Uhr vom nächsten Tag
        if (today.getTime() >= nextOneAM.getTime()) {
            nextOneAM.setDate(nextOneAM.getDate() + 1);
        }

        // Alter des Einsatzes um 01:00 Uhr nachts in Millisekunden
        let ageAtOneAM = nextOneAM.getTime() - parsedMissionDate.getTime();
        let twentyFourHoursMs = 24 * 60 * 60 * 1000;

        // Prüfen, ob der Einsatz um 01:00 Uhr nachts >= 24h alt sein wird
        let isCritical = ageAtOneAM >= twentyFourHoursMs;

        let styleAttribute = isCritical ? 'style="color: #ff4d4d; font-weight: bold;"' : '';

        $('#mission_general_info > small').append(`&nbsp;|&nbsp;<span ${styleAttribute}>${markup}</span>`);
    }
})();
