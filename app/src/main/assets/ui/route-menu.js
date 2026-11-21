/**
 * Menú accesible de paradas, capas y créditos.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

function toggleRouteMenu() {
  ui("drawerLayer").hidden ? openRouteMenu() : closeRouteMenu();
}

function openRouteMenu() {
  drawerReturnFocus = document.activeElement;
  ui("drawerLayer").hidden = false;
  ui("routeMenuButton").setAttribute("aria-expanded", "true");
  document.querySelector(".screen-content").inert = true;
  document.querySelector(".phone-nav-bar").inert = true;
  ui("drawerClose").focus();
}

function closeRouteMenu(restoreFocus = true) {
  if (!ui("drawerLayer") || ui("drawerLayer").hidden) return;
  ui("drawerLayer").hidden = true;
  ui("routeMenuButton").setAttribute("aria-expanded", "false");
  document.querySelector(".screen-content").inert = false;
  document.querySelector(".phone-nav-bar").inert = false;
  if (restoreFocus) drawerReturnFocus?.focus();
}

function showRouteOverview() {
  closeRouteMenu();
  fitRoute();
}

function renderRouteStops() {
  const trip = getActiveTrip();
  ui("stopCount").textContent = "(" + trip.stops.length + ")";
  ui("routeStops").replaceChildren();
  const schedule = computeTripSchedule(trip);
  const points = [
    { key: ORIGIN_KEY, label: "Salida por GPS" },
    ...trip.stops.map((s) => ({ ...s, label: s.stayMin + " min de estadía" })),
    { key: trip.destKey, label: "Destino" },
  ];
  points.forEach((s, i) => {
    const li = document.createElement("li"),
      b = document.createElement("button"),
      t = document.createElement("span");
    const visited = finished || (navigatorState && i > 0 && i <= navigatorState.index);
    if (visited) li.classList.add("visited");
    b.textContent =
      (visited ? "✓ " : i === 0 ? "● " : i === points.length - 1 ? "⚑ " : i + ". ") +
      placeName(s.key);
    t.textContent = s.label;
    if (i > 0 && i < points.length - 1) {
      b.onclick = () => {
        selectedDetailKey = s.key;
        navTo("detail");
      };
      if (schedule.roadCalculated)
        t.textContent += " · " + formatClock(schedule.stops[i - 1].arrivalTime);
    } else b.disabled = true;
    li.append(b, t);
    ui("routeStops").append(li);
  });
}
