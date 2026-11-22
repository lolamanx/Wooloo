/**
 * Acciones de crear, abrir y eliminar viajes.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

function startNewTripFlow(destKey) {
  if (tripListStatus !== "ready" || tripFormSaving) return;
  pendingDestKey = typeof destKey === "string" && LOCATIONS[destKey] ? destKey : null;
  navTo("newtrip");
}

function openTrip(id) {
  if (!tripsData.some((t) => t.id === id)) return;
  if (window.AndroidDemoTrips) {
    const saved = demoTripRequest("GET", id)?.data;
    const trip = saved && { ...saved, originKey: ORIGIN_KEY };
    if (!isValidSavedTrip(trip)) {
      ui("tripDeleteError").textContent =
        "No se pudo consultar el viaje en el servidor de la demo.";
      ui("tripDeleteError").hidden = false;
      return;
    }
    tripsData = tripsData.map((entry) => (entry.id === id ? normalizeTripForStorage(trip) : entry));
    ui("tripDeleteError").hidden = true;
  }
  const resume = id === activeTripId && retainedMapSession;
  activeTripId = id;
  navTo("itinerary", true, resume);
}

async function commitTripAndProceed() {
  if (tripFormSaving) return;
  clearTripFormError();
  const name = ui("tripNameInput").value.trim();
  const destKey = ui("tripDestSelect").value;
  if (tripsData.length >= 100) {
    showTripFormError("Puedes guardar hasta 100 viajes. Elimina uno antes de crear otro.");
    return;
  }
  if (!name || name.length > 120) {
    showTripFormError("Escribe un nombre de entre 1 y 120 caracteres.", "tripNameInput");
    return;
  }
  if (!knownLocation(destKey)) {
    showTripFormError("Selecciona un destino válido.", "tripDestSelect");
    return;
  }
  const d = new Date(ui("tripDateInput").value);
  if (!Number.isFinite(d.getTime())) {
    showTripFormError("Selecciona una fecha y hora válidas.", "tripDateInput");
    return;
  }
  const remote = Boolean(window.AndroidDemoTrips);
  if (remote && !tripDraftId) tripDraftId = "trip-" + crypto.randomUUID();
  const trip = {
    id: remote ? tripDraftId : "trip-" + Date.now(),
    name,
    originKey: ORIGIN_KEY,
    destKey,
    departureISO: d.toISOString(),
    stops: [],
  };
  if (remote) {
    setTripFormSaving(true);
    try {
      await createDemoTrip(trip);
    } catch (error) {
      if (error.savedTrip && isValidSavedTrip(error.savedTrip)) {
        tripsData = [
          normalizeTripForStorage(error.savedTrip),
          ...tripsData.filter((saved) => saved.id !== trip.id),
        ];
        tripDraftId = null;
      }
      showTripFormError(error.message + " Tus datos siguen en el formulario.");
      return;
    } finally {
      setTripFormSaving(false);
    }
    tripsData = [trip, ...tripsData.filter((saved) => saved.id !== trip.id)];
  } else {
    const previous = tripsData;
    tripsData = [trip, ...tripsData];
    if (!persistTrips()) {
      tripsData = previous;
      showTripFormError(
        "No se pudo guardar el viaje en este dispositivo. Tus datos siguen en el formulario.",
      );
      return;
    }
  }
  tripDraftId = null;
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
