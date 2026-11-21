/**
 * Punto de entrada: inicializa presentación, eventos y viajes guardados.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

function startApplication() {
  updateClock();
  setInterval(updateClock, 10000);
  registerLocationEvents();
  ui("tripNameInput").maxLength = 120;
  registerUIActions();
  restoreTrips();
  navTo("trips");
}

startApplication();
