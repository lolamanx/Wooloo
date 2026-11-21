/**
 * Presentación de paradas y sus controles de estadía y orden.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

function renderStopsSections() {
  const trip = getActiveTrip();
  const selectedContainer = document.getElementById("selectedStopsContainer");
  const catalogContainer = document.getElementById("catalogStopsContainer");

  selectedContainer.innerHTML = "";
  if (trip.stops.length === 0) {
    selectedContainer.innerHTML = `
      <div style="text-align:center; padding:18px; color:var(--muted); font-size:13px;">
        No has agregado paradas intermedias aún. Añade una del catálogo abajo.
      </div>
    `;
  } else {
    trip.stops.forEach((s) => {
      const loc = LOCATIONS[s.key];
      const card = document.createElement("div");
      card.className = "stop-card";
      card.innerHTML = `
        <div class="stop-header">
          <span class="stop-title"><span>${loc.icon}</span> ${loc.name}</span>
          <button class="btn-remove" data-action="removeStopFromTrip('${s.key}')">✕ Eliminar</button>
        </div>
        <div class="stepper-row">
          <span>Permanencia en lugar:</span>
          <div class="stepper-ctrl">
            <button data-action="alterStopVal('${s.key}', 'stayMin', -15)">−</button>
            <span>${s.stayMin} min</span>
            <button data-action="alterStopVal('${s.key}', 'stayMin', 15)">+</button>
          </div>
        </div>
      `;
      selectedContainer.appendChild(card);
    });
  }

  // Catálogo disponible excluyendo lo ya seleccionado o extremos
  catalogContainer.innerHTML = "";
  const existingKeys = trip.stops.map((s) => s.key);
  const pool = SUGGESTED_STOPS.filter(
    (k) => !existingKeys.includes(k) && k !== trip.originKey && k !== trip.destKey,
  );

  if (pool.length === 0) {
    catalogContainer.innerHTML = `<div style="font-size:12px; color:var(--muted);">Todas las paradas recomendadas han sido agregadas.</div>`;
  } else {
    pool.forEach((key) => {
      const loc = LOCATIONS[key];
      const row = document.createElement("div");
      row.className = "catalog-entry";
      row.innerHTML = `
        <span class="catalog-info">${loc.icon} ${loc.name}</span>
        <button class="btn btn-sm btn-outline" data-action="addStopToTrip('${key}')">+ Añadir</button>
      `;
      catalogContainer.appendChild(row);
    });
  }
}

function renderStopsManager() {
  renderStopsSections();
  const trip = getActiveTrip();
  ui("selectedStopsContainer")
    .querySelectorAll(".stop-card")
    .forEach((card, i) => {
      const note = document.createElement("p");
      note.className = "stop-note";
      note.classList.add("selected-detour");
      note.dataset.key = trip.stops[i].key;
      note.textContent = "Calculando tiempo extra de conducción…";
      card.append(note);
      const controls = document.createElement("div");
      controls.className = "stop-order";
      for (const [label, direction] of [
        ["↑ Subir", -1],
        ["↓ Bajar", 1],
      ]) {
        const b = document.createElement("button");
        b.textContent = label;
        b.disabled = i + direction < 0 || i + direction >= trip.stops.length;
        b.onclick = () => {
          commitStopChanges((current) => {
            [current.stops[i], current.stops[i + direction]] = [
              current.stops[i + direction],
              current.stops[i],
            ];
          });
        };
        controls.append(b);
      }
      card.append(controls);
    });
  updateOriginLabels();
  updateRecommendedStops();
  requestLocation(false);
}
