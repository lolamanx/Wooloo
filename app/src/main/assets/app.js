/**
 * Punto de entrada: inicializa presentación, eventos y viajes guardados.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

async function refreshSavedTrips() {
  if (!window.AndroidDemoTrips || tripListStatus === "loading") return;
  tripListStatus = "loading";
  renderTripsList();
  try {
    tripsData = await loadDemoTrips();
    activeTripId = tripsData[0]?.id || null;
    tripListStatus = "ready";
  } catch {
    tripListStatus = "error";
  }
  renderTripsList();
}

function startApplication() {
  updateClock();
  setInterval(updateClock, 10000);
  registerLocationEvents();
  ui("tripNameInput").maxLength = 120;
  registerUIActions();
  if (window.AndroidDemoTrips) {
    tripsData = [];
    activeTripId = null;
    refreshSavedTrips();
  } else {
    restoreTrips();
  }
  navTo("trips");
}

startApplication();
