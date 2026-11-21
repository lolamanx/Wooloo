/**
 * Ficha de un lugar y su estadía planificada.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

function renderDetailView() {
  const trip = getActiveTrip();
  const schedule = computeTripSchedule(trip);
  const stopInfo = schedule.stops.find((s) => s.key === selectedDetailKey) || schedule.stops[0];

  const container = document.getElementById("stopDetailContainer");
  if (!stopInfo) {
    container.innerHTML = `<p style="padding:20px;">No hay parada seleccionada.</p>`;
    return;
  }

  const loc = LOCATIONS[stopInfo.key];
  const desc = DESCRIPTIONS[stopInfo.key] || "Punto de interés intermedio en la ruta de viaje.";

  container.innerHTML = `
    <div class="detail-banner">${loc.icon}</div>
    <div class="detail-name">${loc.name}</div>
    <div class="detail-badge">${Number.isFinite(stopInfo.arrivalTime) ? "Llegada aprox: " + formatClock(stopInfo.arrivalTime) + " hrs" : "Obtén tu ubicación para calcular la llegada"}</div>

    <div class="card">
      <div class="detail-row">
        <div class="detail-label">Sobre el lugar turístico</div>
        <div class="detail-val">${desc}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Tiempo asignado de descanso</div>
        <div class="detail-val">${stopInfo.stayMin} minutos para recorrer / almorzar.</div>
      </div>
      <div class="detail-row" style="margin-bottom:0;">
        <div class="detail-label">Acceso al lugar</div>
        <div class="detail-val">El acceso está incluido en el cálculo vial del mapa.</div>
      </div>
    </div>
  `;
}
