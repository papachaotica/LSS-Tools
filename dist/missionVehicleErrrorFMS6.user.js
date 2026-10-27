// ==UserScript==
// @name            [ LSS ] fehlendes Personal schnell FMS 6 setzen
// @description     erstellt bei der Fehlermeldung im Einsatz einen Button, um bei fehlendem Personal schnell FMS6 zu setzen
// @namespace       papachaotica.leitstellenspiel.de
// @author          papachaotica
// @version         0.0.0.20261027.0953
// @match           https://leitstellenspiel.de/missions/*
// @match           https://www.leitstellenspiel.de/missions/*
// @run-at          document-idle
// ==/UserScript==

'use strict';

(function () {
  const links = document.querySelectorAll(
    '[id^="alert_danger_"] a[href^="/vehicles/"]'
  );

  links.forEach(link => {
      const match = link.getAttribute('href').match(/^\/vehicles\/(\d+)(?:\/|$)/);
      if (!match) return;
      if (link.nextElementSibling?.classList.contains('set-fms-six')) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-danger btn-xs set-fms-six';
      button.textContent = 'FMS 6';
      button.style.marginLeft = '6px';

      button.addEventListener('click', async () => {
          button.disabled = true;

          try {
            const response = await fetch(`/vehicles/${match[1]}/set_fms/6`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            button.textContent = 'FMS 6 ✓';
          } catch (error) {
            button.disabled = false;
            console.error('FMS 6 konnte nicht gesetzt werden:', error);
          }
      });

      link.insertAdjacentElement('afterend', button);
  });
})();
