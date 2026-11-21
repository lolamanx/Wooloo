/**
 * Contrato de eventos del puente nativo y del navegador.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

function registerLocationEvents() {
  window.addEventListener("nativePosition", (event) => handleLocation(event.detail));
  window.addEventListener("nativeLocationStatus", (event) =>
    locationWarning(String(event.detail?.message || "Esperando señal GPS…")),
  );
  window.addEventListener("nativeLocationError", (event) =>
    locationError(String(event.detail?.message || "No se pudo obtener la ubicación.")),
  );
  window.addEventListener("nativePause", () => pauseNavigation());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !window.AndroidLocation) pauseNavigation();
  });
  window.addEventListener("offline", () => {
    if (plan)
      setStatus(
        "Sin internet. Se conserva la ruta; no se pueden descargar mapas ni recalcular.",
        "warning",
      );
  });
  window.addEventListener("online", () => {
    if (plan) setStatus("Conexión recuperada. La ruta se actualizará con la próxima posición.");
  });
}
