/**
 * Estado, métricas y maniobras de la guía.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

function setStatus(text, level = "") {
  if (routeFailure && !level) {
    text = routeFailure.message;
    level = "error";
  }
  ui("routeStatus").textContent = text;
  ui("routeStatus").dataset.level = level;
  ui("routeNotice").hidden = !["warning", "error"].includes(level);
  ui("routeNotice").textContent = ui("routeNotice").hidden ? "" : text;
}

function updateOriginLabels() {
  const fix = currentFix(),
    text = fix
      ? "Origen: mi ubicación actual · precisión ±" + Math.round(fix.accuracy) + " m"
      : "Origen: mi ubicación actual. Activa GPS y permite una ubicación precisa.";
  ui("tripOriginStatus").textContent = text;
  ui("stopsOriginStatus").textContent = text;
}

function showRouteFailure(error, prefix) {
  routeFailure = {
    message: prefix + (error?.message || "Revisa tu conexión y vuelve a intentar."),
    code: error?.code || "ROUTE_FAILED",
  };
  setStatus(routeFailure.message, "error");
  ui("routeRecovery").hidden = false;
}

function clearMetrics() {
  for (const id of ["routeKm", "routeTime", "routeEta"]) ui(id).textContent = "—";
}

function syncNavigationControls() {
  const busy = activeNavigation || wantStart;
  ui("startButton").hidden = busy;
  ui("pauseButton").hidden = !busy;
  ui("routeMascot").hidden = busy;
  ui("turnArrow").hidden = !busy;
  syncCameraControls();
}

function nextPlace() {
  const trip = getActiveTrip();
  return LOCATIONS[trip.stops[navigatorState?.index || 0]?.key || trip.destKey];
}

function updateSummary(result = lastResult) {
  if (!plan || navigatorState?.needsRoute || awaitingOrigin || loading) {
    clearMetrics();
    return;
  }
  const index = navigatorState?.index || 0,
    trip = getActiveTrip();
  const current = navigatorState?.leg || plan[0];
  let meters = result?.remaining ?? current.distance;
  let seconds = result?.remainingSeconds ?? current.duration;
  for (const leg of (navigatorState?.legs || plan).slice(index + 1)) {
    meters += leg.distance;
    seconds += leg.duration;
  }
  const stay = trip.stops.slice(index).reduce((sum, s) => sum + s.stayMin * 60, 0);
  ui("routeKm").textContent = finished
    ? "0"
    : (meters / 1000).toLocaleString("es-CL", { maximumFractionDigits: 1 });
  ui("routeTime").textContent = finished
    ? "0 min"
    : formatMetricDuration(Math.ceil((seconds + stay) / 60));
  const base = activeNavigation ? Date.now() : Date.parse(trip.departureISO);
  const eta = base + (seconds + stay) * 1000;
  ui("routeEta").textContent = finished ? "Llegaste" : formatClock(eta);
  const shift = dayShift(base, eta);
  if (!finished && shift > 0) {
    const day = document.createElement("span");
    day.className = "eta-day";
    day.textContent = " (+" + shift + ")";
    ui("routeEta").append(day);
  }
}
