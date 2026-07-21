

    // ==UserScript==
    // @name        * Ersthelfer
    // @namespace   bos-ernie.leitstellenspiel.de
    // @version     1.1.0
    // @license     BSD-3-Clause
    // @author      BOS-Ernie
    // @description Wählt das nächstliegende Ersthelferfahrzeug aus
    // @match       https://*.leitstellenspiel.de/missions/*
    // @icon        https://www.google.com/s2/favicons?sz=64&domain=leitstellenspiel.de
    // @run-at      document-idle
    // @grant       none
    // @resource    https://forum.leitstellenspiel.de/index.php?thread/25554-script-ersthelfer-by-bos-ernie/
    // ==/UserScript==
     
    (function () {
      /**
       * Liste der Fahrzeugtypen die als Ersthelfer ausgewählt werden dürfen.
       *
       * Nicht zu verwendende Fahrzeuge auskommentieren oder entfernen. Die Liste aktueller Fahrzeugtypen wird im Forum
       * gepflegt (siehe Link).
       * https://forum.leitstellenspiel.de/index.php?thread/8406-infos-f%C3%BCr-entwickler/&postID=485487#post485487
       *
       *  @type {number[]}
       */
      const firstResponderVehicleTypeIds = [
        0, // LF 20
        1, // LF 10
        2, // DLK 23
        3, // ELW 1
        4, // RW
        5, // GW-A
        6, // LF 8/6
        7, // LF 20/16
        8, // LF 10/6
        9, // LF 16-TS
        10, // GW-Öl
        11, // GW-L2-Wasser
        12, // GW-Messtechnik
        13, // SW 1000
        14, // SW 2000
        15, // SW 2000-Tr
        16, // SW Kats
        17, // TLF 2000
        18, // TLF 3000
        19, // TLF 8/8
        20, // TLF 8/18
        21, // TLF 16/24-Tr
        22, // TLF 16/25
        23, // TLF 16/45
        24, // TLF 20/40
        25, // TLF 20/40-SL
        26, // TLF 16
        27, // GW-Gefahrgut
        28, // RTW
        29, // NEF
        30, // HLF 20
        31, // RTH
        32, // FuStW
        33, // GW-Höhenrettung
        34, // ELW 2
        35, // leBefKw
        36, // MTW
        37, // TSF-W
        38, // KTW
        39, // GKW
        40, // MTW-TZ
        41, // MzGW (FGr N)
        42, // LKW K 9
        43, // BRmG R
        44, // Anh DLE
        45, // MLW 5
        46, // WLF
        47, // AB-Rüst
        48, // AB-Atemschutz
        49, // AB-Öl
        50, // GruKw
        51, // FüKw
        52, // GefKw
        53, // Dekon-P
        54, // AB-Dekon-P
        55, // KdoW-LNA
        56, // KdoW-OrgL
        57, // FwK
        58, // KTW Typ B
        59, // ELW 1 (SEG)
        60, // GW-San
        61, // Polizeihubschrauber
        62, // AB-Schlauch
        63, // GW-Taucher
        64, // GW-Wasserrettung
        65, // LKW 7 Lkr 19 tm
        66, // Anh MzB
        67, // Anh SchlB
        68, // Anh MzAB
        69, // Tauchkraftwagen
        70, // MZB
        71, // AB-MZB
        72, // WaWe 10
        73, // GRTW
        74, // NAW
        75, // FLF
        76, // Rettungstreppe
        77, // AB-Gefahrgut
        78, // AB-Einsatzleitung
        79, // SEK - ZF
        80, // SEK - MTF
        81, // MEK - ZF
        82, // MEK - MTF
        83, // GW-Werkfeuerwehr
        84, // ULF mit Löscharm
        85, // TM 50
        86, // Turbolöscher
        87, // TLF 4000
        88, // KLF
        89, // MLF
        90, // HLF 10
        91, // Rettungshundefahrzeug
        92, // Anh Hund
        93, // MTW-O
        94, // DHuFüKw
        95, // Polizeimotorrad
        96, // Außenlastbehälter (allgemein)
        97, // ITW
        98, // Zivilstreifenwagen
        100, // MLW 4
        101, // Anh SwPu
        102, // Anh 7
        103, // FuStW (DGL)
        104, // GW-L1
        105, // GW-L2
        106, // MTF-L
        107, // LF-L
        108, // AB-L
        109, // MzGW SB
        110, // NEA50
        111, // NEA50
        112, // NEA200
        113, // NEA200
        114, // GW-Lüfter
        115, // Anh Lüfter
        116, // AB-Lüfter
        117, // AB-Tank
        118, // Kleintankwagen
        119, // AB-Lösch
        120, // Tankwagen
        121, // GTLF
        122, // LKW 7 Lbw (FGr E)
        123, // LKW 7 Lbw (FGr WP)
        124, // MTW-OV
        125, // MTW-Tr UL
        126, // MTF Drohne
        127, // GW UAS
        128, // ELW Drohne
        129, // ELW2 Drohne
        130, // GW-Bt
        131, // Bt-Kombi
        132, // FKH
        133, // Bt LKW
        134, // Pferdetransporter klein
        135, // Pferdetransporter groß
        136, // Anh Pferdetransport
        137, // Zugfahrzeug Pferdetransport
      ];
     
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
     
      function clickEventHandler(event) {
        event.preventDefault();
        selectFirstResponder();
      }
     
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
     
      function main() {
        addSelectButton();
     
        document.addEventListener("keydown", function (event) {
          if (event.key !== "f") {
            return;
          }
     
          const activeElement = document.activeElement;
          if (activeElement.tagName.toLowerCase() === "input" && activeElement.type.toLowerCase() === "text") {
            return;
          }
     
          selectFirstResponder();
        });
      }
     
      main();
    })();

