/**
 * Lista cerrada de acciones y navegación con teclado; sin eval.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

const actions = Object.assign(Object.create(null), {
  switchMainTab: (screen) => switchMainTab(screen),
  navTo: (...a) => navTo(...a),
  goBack: () => goBack(),
  startNewTripFlow: (...a) => startNewTripFlow(...a),
  commitTripAndProceed: () => commitTripAndProceed(),
  calculateAndShowItinerary: () => calculateAndShowItinerary(),
  removeStopFromTrip: (...a) => removeStopFromTrip(...a),
  alterStopVal: (...a) => alterStopVal(...a),
  addStopToTrip: (...a) => addStopToTrip(...a),
  openTrip: (...a) => openTrip(...a),
  toggleRouteMenu: () => toggleRouteMenu(),
  closeRouteMenu: () => closeRouteMenu(),
  showRouteOverview: () => showRouteOverview(),
  refreshDetours: () => refreshDetours(),
  centerOnUser: () => centerOnUser(),
  fitRoute: () => fitRoute(),
  requestLocation: (...a) => requestLocation(...a),
  startNavigation: () => startNavigation(),
  pauseNavigation: () => pauseNavigation(),
  retryRoute: () => retryRoute(),
  confirmVisit: () => confirmVisit(),
});

function handleUIAction(event) {
  const target = event.target.closest("[data-action]");
  if (!target || target.disabled) return;
  const match = /^(\w+)\((.*)\)$/.exec(target.dataset.action);
  if (!match || !Object.prototype.hasOwnProperty.call(actions, match[1])) return;
  const args = parseActionArguments(match[2]);
  if (args === null) return;
  actions[match[1]](...args);
}

function handleKeyboardNavigation(event) {
  if (!ui("drawerLayer").hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeRouteMenu();
      return;
    }
    if (event.key === "Tab") {
      const focusable = Array.from(
        ui("routeDrawer").querySelectorAll("button:not(:disabled),a[href],summary"),
      ).filter((e) => e.getClientRects().length);
      const first = focusable[0],
        last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-key-activate]")) {
    event.preventDefault();
    event.target.click();
  }
}

function registerUIActions() {
  document.addEventListener("click", handleUIAction);
  document.addEventListener("keydown", handleKeyboardNavigation);
}

/** Interpreta literales permitidos; nunca ejecuta texto recibido del documento. */
function parseActionArguments(rawArguments) {
  const args = [];
  for (const raw of rawArguments.trim() ? rawArguments.split(",") : []) {
    const value = raw.trim();
    if (/^'[^']*'$/.test(value)) args.push(value.slice(1, -1));
    else if (/^-?\d+$/.test(value)) args.push(Number(value));
    else if (value === "true" || value === "false") args.push(value === "true");
    else return null;
  }
  return args;
}
