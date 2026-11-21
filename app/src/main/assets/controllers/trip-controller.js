/**
 * Acciones de crear, abrir y eliminar viajes.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

function startNewTripFlow(destKey) {
  pendingDestKey = typeof destKey === "string" && LOCATIONS[destKey] ? destKey : null;
  navTo("newtrip");
}

function openTrip(id) {
  if (!tripsData.some((t) => t.id === id)) return;
  if (window.AndroidDemoTrips) {
    const saved = demoTripRequest("GET", id)?.data;
    const trip = saved && { ...saved, originKey: ORIGIN_KEY };
    if (!isValidSavedTrip(trip)) {
      ui("tripDeleteError").textContent = "No se pudo consultar el viaje en el servidor de la demo.";
      ui("tripDeleteError").hidden = false;
      return;
    }
    tripsData = tripsData.map((entry) => entry.id === id ? normalizeTripForStorage(trip) : entry);
    ui("tripDeleteError").hidden = true;
  }
  const resume = id === activeTripId && retainedMapSession;
  activeTripId = id;
  navTo("itinerary", true, resume);
}

function commitTripAndProceed() {
  const name = ui("tripNameInput").value.trim().slice(0, 120) || "Viaje nuevo";
  const originKey = ORIGIN_KEY,
    destKey = ui("tripDestSelect").value;
  const formError = (message) => {
    ui("formError").textContent = message;
    ui("formError").hidden = false;
  };
  if (tripsData.length >= 100) {
    formError("Puedes guardar hasta 100 viajes. Elimina uno antes de crear otro.");
    return;
  }
  if (!knownLocation(destKey)) {
    formError("Selecciona un destino válido.");
    return;
  }
  const d = new Date(ui("tripDateInput").value);
  if (!Number.isFinite(d.getTime())) {
    formError("Selecciona una fecha y hora válidas.");
    return;
  }
  ui("formError").hidden = true;
  const trip = {
    id: window.AndroidDemoTrips ? "trip-" + crypto.randomUUID() : "trip-" + Date.now(),
    name,
    originKey,
    destKey,
    departureISO: d.toISOString(),
    stops: [],
  };
  const previous = tripsData;
  tripsData = [trip, ...tripsData];
  if (!persistTrips("POST", "", trip)) {
    tripsData = previous;
    formError("No se pudo guardar el viaje. Revisa el almacenamiento y vuelve a intentar.");
    return;
  }
  activeTripId = trip.id;
  navTo("stops");
}

function deleteTrip(id) {
  const trip = tripsData.find((t) => t.id === id);
  if (!trip) return;
  const rows = Array.from(document.querySelectorAll(".trip-swipe"));
  const focusIndex = Math.max(
    0,
    rows.findIndex((row) => row.dataset.tripId === id),
  );
  const previous = tripsData;
  tripsData = tripsData.filter((t) => t.id !== id);
  if (!persistTrips("DELETE", id)) {
    tripsData = previous;
    ui("tripDeleteError").textContent =
      "No se pudo guardar el cambio. El viaje se conserva; vuelve a intentar borrar.";
    ui("tripDeleteError").hidden = false;
    ui("tripDeleteError").scrollIntoView({ block: "nearest" });
    return;
  }
  ui("tripDeleteError").hidden = true;
  routeCache.delete(signature(trip));
  if (activeTripId === id) {
    pauseNavigation(true);
    generation++;
    routingClient.cancelScope("plan");
    routingClient.cancelScope("matrix");
    detourRevision++;
    matrixEpoch++;
    matrixPromise = null;
    loading = false;
    awaitingOrigin = false;
    plan = null;
    planKey = "";
    navigatorState = null;
    originFix = null;
    lastResult = null;
    drawnOriginalPlan = null;
    routeFailure = null;
    arrived = false;
    finished = false;
    following = false;
    retainedMapSession = false;
    retainedCamera = null;
    routeCache.clear();
    originalLine?.setLatLngs([]);
    activeLine?.setLatLngs([]);
    markers?.clearLayers();
    ui("arrivalPanel").hidden = true;
    ui("routeRecovery").hidden = true;
    clearMetrics();
  }
  if (activeTripId === id) activeTripId = tripsData[0]?.id || null;
  renderTripsList();
  syncNavigationControls();
  ui("tripFeedback").textContent = "Viaje eliminado: " + trip.name;
  const cards = Array.from(document.querySelectorAll(".trip-front [data-action]"));
  (cards[Math.min(focusIndex, cards.length - 1)] || document.querySelector(".tab-fab")).focus({
    preventScroll: true,
  });
}
