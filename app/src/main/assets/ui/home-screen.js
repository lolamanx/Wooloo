/**
 * Presentación de viajes guardados y preparación del gesto de borrado.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

function tapAttrs(tripId) {
  return (
    `role="button" tabindex="0" data-action="openTrip('${tripId}')" ` + `data-key-activate="true"`
  );
}

function renderNextTripCard(trip) {
  const container = document.getElementById("nextTripContainer");

  if (!trip) {
    container.innerHTML = `
      <div class="hero-card" style="cursor:default;">
        <div class="empty-trips" style="border:none; padding:10px 0 4px;">
          <div class="big"><img class="empty-mascot" src="brand/wooloo-mascot.png" width="80" height="88" alt=""/></div>
          <b class="empty-brand-title">Tu aventura empieza aquí</b>
          <div>Aún no tienes viajes.<br/>Toca el botón <b>+</b> para planificar el primero.</div>
        </div>
      </div>`;
    return;
  }

  const schedule = computeTripSchedule(trip);
  const departureMs = new Date(trip.departureISO).getTime();
  const span = Math.max(schedule.finalArrival - departureMs, 1);
  const stopDots = schedule.stops
    .map((s, index) => {
      const pct = Number.isFinite(s.arrivalTime)
        ? Math.min(94, Math.max(6, ((s.arrivalTime - departureMs) / span) * 100))
        : ((index + 1) * 100) / (schedule.stops.length + 1);
      return `<span class="route-dot stop" style="left:${pct.toFixed(1)}%" title="${escapeHtml(s.name)}"></span>`;
    })
    .join("");
  const n = trip.stops.length;

  container.innerHTML = `
    <div class="hero-card" ${tapAttrs(trip.id)}>
      <div class="hero-top">
        <span class="hero-label">Próximo viaje</span>
        <span class="hero-countdown">⏱ ${departureCountdown(departureMs)}</span>
      </div>
      <div class="hero-title">${escapeHtml(trip.name)}</div>
      <div class="hero-date">${formatTripDate(departureMs)}</div>

      <div class="route-line" aria-hidden="true">
        <span class="route-rail"></span>
        <span class="route-dot origin" style="left:0%"></span>
        ${stopDots}
        <span class="route-dot dest" style="left:100%"></span>
      </div>
      <div class="route-labels">
        <div><b>${escapeHtml(shortPlaceName(schedule.origin.name))}</b><small>${formatClock(departureMs)}</small></div>
        <div><b>${escapeHtml(shortPlaceName(schedule.dest.name))}</b><small>${clockWithDay(schedule.finalArrival, departureMs)}</small></div>
      </div>

      <div class="hero-stats">
        <span>📍 ${n} ${n === 1 ? "parada" : "paradas"}</span>
        <span>🚗 ${formatDuration(schedule.totalDriveMinutes)}</span>
        <span>☕ ${formatDuration(schedule.totalStopMinutes)}</span>
      </div>
      <div class="hero-cta">Ver itinerario ➔</div>
    </div>`;
}

function renderDestinationChips() {
  const fix = currentFix();
  document.getElementById("destChipsContainer").innerHTML = POPULAR_DESTINATIONS.map((key) => {
    const loc = LOCATIONS[key];
    const text = fix
      ? "≈ " + formatDuration(estimateDrivingMinutes(fix.point[1], fix.point[0], loc.lat, loc.lng))
      : "Desde mi ubicación";
    return `<button class="dest-chip" data-action="startNewTripFlow('${key}')"><div class="emoji">${loc.icon}</div><b>${escapeHtml(shortPlaceName(loc.name))}</b><small>${text}</small></button>`;
  }).join("");
}

function renderHomeCards(orderedTrips) {
  // Orden por fecha de salida: el más próximo va destacado, el resto en la lista
  const trips = orderedTrips;
  const others = trips.slice(1);

  renderNextTripCard(trips[0]);
  renderDestinationChips();

  document.getElementById("otherTripsSection").style.display = others.length ? "block" : "none";
  document.getElementById("otherTripsCount").textContent =
    `${others.length} ${others.length === 1 ? "viaje" : "viajes"}`;

  document.getElementById("tripsListContainer").innerHTML = others
    .map((trip) => {
      const schedule = computeTripSchedule(trip);
      const departureMs = new Date(trip.departureISO).getTime();
      const n = trip.stops.length;
      return `
      <div class="trip-card" ${tapAttrs(trip.id)}>
        <div class="trip-card-icon">${schedule.dest.icon}</div>
        <div class="trip-card-body">
          <div class="trip-card-title">${escapeHtml(trip.name)}</div>
          <div class="trip-card-route">${escapeHtml(shortPlaceName(schedule.origin.name))} <span>➔</span> ${escapeHtml(shortPlaceName(schedule.dest.name))}</div>
          <div class="trip-card-meta">📅 ${formatTripDate(departureMs)} · ${n} ${n === 1 ? "parada" : "paradas"}</div>
        </div>
        <div class="trip-card-side">
          <b>${formatDuration(Number.isFinite(schedule.totalDriveMinutes) ? schedule.totalDriveMinutes + schedule.totalStopMinutes : null)}</b>
          <small>en total</small>
        </div>
      </div>`;
    })
    .join("");
}

function renderTripsList() {
  const sorted = [...tripsData].sort(
    (a, b) => Date.parse(a.departureISO) - Date.parse(b.departureISO),
  );
  renderHomeCards(sorted);
  const ready = tripListStatus === "ready";
  const message = ui("tripListMessage");
  const notice = ui("tripListNotice");
  const retry = ui("retryTripList");
  ui("nextTripContainer").hidden = !ready;
  notice.hidden = ready;
  const statusText =
    tripListStatus === "loading"
      ? "Cargando tus viajes…"
      : tripListStatus === "error"
        ? "No pudimos cargar tus viajes. Comprueba la conexión y vuelve a intentar."
        : "";
  if (message.textContent !== statusText) message.textContent = statusText;
  retry.hidden = tripListStatus !== "error";
  document.querySelectorAll('button[data-action^="startNewTripFlow("]').forEach((button) => {
    button.disabled = !ready;
  });
  const trip = sorted[0];
  if (trip && !routeCache.has(signature(trip))) {
    const note = document.createElement("div");
    note.className = "estimate-note";
    note.textContent = currentFix()
      ? "Tiempos orientativos desde tu ubicación. Abre el mapa para calcular por carreteras."
      : "El recorrido y la llegada se calcularán desde tu ubicación actual.";
    ui("nextTripContainer").querySelector(".hero-card").append(note);
  }
  TripSwipe.close();
  const hero = ui("nextTripContainer").querySelector("[data-action]");
  if (hero && sorted[0])
    TripSwipe.enhance(hero, { trip: sorted[0], featured: true, onDelete: deleteTrip });
  ui("tripsListContainer")
    .querySelectorAll(".trip-card")
    .forEach((card, i) => TripSwipe.enhance(card, { trip: sorted[i + 1], onDelete: deleteTrip }));
  syncMainTabs();
}
