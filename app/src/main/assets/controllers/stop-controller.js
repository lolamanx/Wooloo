/**
 * Acciones sobre las paradas del viaje.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

/** Aplica y guarda una edición; restaura los datos si el almacenamiento falla. */
function commitStopChanges(change) {
  const trip = getActiveTrip();
  if (!trip) return false;
  const previous = trip.stops.map((stop) => ({ ...stop }));
  change(trip);
  if (!persistTrips("PUT", trip.id, trip)) {
    trip.stops = previous;
    ui("stopsSaveError").textContent =
      "No se pudo guardar el cambio. Tus paradas se conservan; vuelve a intentar.";
    ui("stopsSaveError").hidden = false;
    renderStopsManager();
    return false;
  }
  ui("stopsSaveError").hidden = true;
  renderStopsManager();
  return true;
}

function addStopToTrip(key) {
  const trip = getActiveTrip();
  if (
    !trip ||
    !knownLocation(key) ||
    key === trip.originKey ||
    key === trip.destKey ||
    trip.stops.some((s) => s.key === key)
  )
    return;
  if (trip.stops.length >= 10) {
    ui("stopsSaveError").textContent = "Puedes añadir hasta 10 paradas por viaje.";
    ui("stopsSaveError").hidden = false;
    return;
  }
  const keys = [trip.originKey, ...trip.stops.map((s) => s.key), trip.destKey];
  const best =
    matrixCache && matrixCache.base === ROUTE_CONFIG.routerBase
      ? E.bestInsertion(keys, key, matrixCache.get)
      : null;
  commitStopChanges((current) => {
    current.stops.splice(best?.index ?? current.stops.length, 0, {
      key,
      stayMin: 30,
      detourMin: 0,
    });
  });
}

function removeStopFromTrip(key) {
  commitStopChanges((trip) => {
    trip.stops = trip.stops.filter((s) => s.key !== key);
  });
}

function alterStopVal(key, property, delta) {
  if (property !== "stayMin" || !Number.isSafeInteger(delta)) return;
  commitStopChanges((trip) => {
    const s = trip.stops.find((s) => s.key === key);
    if (s) s.stayMin = Math.max(0, Math.min(1440, s.stayMin + delta));
  });
}

function calculateAndShowItinerary() {
  navTo("itinerary");
}
