// ==UserScript==
// @name         [LSS] Layout 04
// @namespace    papachaotica.leitstellenspiel.de
// @version      1.0.5
// @description  Kompaktes Layout für das Leitstellenspiel (Basiert auf LSSM v3)
// @author       papachaotica (Original: LSSM v3 Team)
// @match        https://www.leitstellenspiel.de/*
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';
    $(function() {
        // Kartenspalte im Grid verkleinern
        $('#map_outer').removeClass('col-sm-8').addClass('col-sm-4');

        // Layout-CSS in den Head einfügen (sofern noch nicht vorhanden)
        if (!$('#lss-layout-04-style').length) {
            $('head').append(
                '<style type="text/css" id="lss-layout-04-style">' +
                '#map_outer{height:calc(100vh - 90px)!important;padding-left:0!important;padding-right:0!important;margin-left:20px;width: 33.33333333% !important;}' +
                '#missions_outer{height:49vh!important;padding-left:0;width:calc(66.66666667% - 30px);margin-left:10px;padding-right:10px}' +
                '#missions{max-height:100%;}' +
                '#missions-panel-body{height:calc(49vh - 45px)!important;display:flex;padding:0!important;margin-right:-10px!important}' +
                'div[id^=mission_list]{display:inline-block;width:100% !important;padding:10px;overflow:scroll}' +
                '#map{height:100%!important}' +
                '#missions{margin-right:10px!important}' +
                '.label-speedbutton {padding-top: 4px;padding-bottom: 4px;}' +
                '#buildings_outer,#chat_outer,#radio_outer{height:calc(49vh - 70px);overflow:hidden;overflow-y:scroll}' +
                '#buildings>.panel-default{height:calc(49vh - 70px);margin-bottom:0}' +
                '#buildings_outer .panel-body{height:calc(49vh - 40px);max-height:100%}' +
                '#chat_outer .panel-body,#radio_outer .panel-body{height:calc(100% - 55px);max-height:100%;padding-bottom:0;width: 100%;}' +
                '#chat_outer>div,#radio>div,#radio_outer>div{height:100%;margin:0}' +
                '.missions-panel-head strong{display:none!important}' +
                '.anti-abuse-warning {display:none}' +
                '#anti-abuse-warning strong{display:none!important}' +
                '#missions .btn-group{margin-left:11px}' +
                '#buildings_outer,#chat_outer,#radio_outer{margin-left:5px}' +
                '/* Position & Styling für Verbands-Buttons im Einsatz-Panel */' +
                '.alliance_events_buttons{position:static!important;float:none!important;display:inline-block!important;margin:0 5px 0 0!important;padding:0!important;vertical-align:middle!important}' +
                '.alliance_events_buttons .btn{padding:2px 6px!important;font-size:11px!important;height:auto!important;line-height:normal!important}' +
                '.alliance_true .btn-group{float:right}' +
                '#chat_outer{padding:0}' +
                '#radio_outer{width:calc(16.66666667% - 40px)}' +
                '#buildings{overflow:hidden}' +
                '/* Reihenfolge der Einsatzlisten (Flexbox Order) */' +
                '#mission_list{order:1}' +
                '#mission_list_krankentransporte,#mission_list_krankentransporte_alliance{order:2}' +
                '#mission_list_alliance{order:3}' +
                '#mission_list_alliance_event{order:4}' +
                '#mission_list_sicherheitswache,#mission_list_sicherheitswache_alliance{order:5}' +
                '#missions-panel-body > [id*="mission_list"]:not(:has(> .missionSideBarEntry:not(.hidden))) {display: none !important}' +
                '#patient_no_transports{display:none!important}' +
                '#critical_no_transports{display:none!important}' +
                '</style>'
            );
        }

        // Verbands-Event-Buttons in den Kopfbereich der Einsätze verschieben
        $('.alliance_events_buttons').prependTo('#missions-panel-head');

        // Bootstrap-Spaltenbreiten der Layout-Elemente anpassen
        $(
            '#missions_outer, #buildings_outer, #radio_outer, #chat_outer'
        ).removeClass('col-sm-4');
        $('#missions_outer').addClass('col-md-8');
        $('#buildings_outer').addClass('col-sm-3');
        $('#chat_outer').addClass('col-sm-3');
        $('#radio_outer').addClass('col-md-2');

        // Event-Banner & KTW-Meldungen verschieben
        $('#eventInfo').prependTo('#content');
        $('#ktw_no_transports').prependTo('#mission_list_krankentransporte');

        // Kartendarstellung bei Leaflet erzwingen
        if ('undefined' != typeof mapkit) {} else map.invalidateSize(true);
    });
})();
