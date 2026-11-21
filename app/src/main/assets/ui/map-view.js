/**
 * Mapa Leaflet, capas y cámara; conserva la guía y el seguimiento.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

function initMap() {
  if (map) return;
  if (typeof L === "undefined") throw Error("No se pudo abrir el motor del mapa.");
  map = L.map("routeMap", {
    zoomControl: false,
    zoomSnap: 0.5,
    attributionControl: false,
    preferCanvas: true,
    zoomAnimation: false,
  });
  L.control.attribution({ prefix: false, position: "bottomright" }).addTo(map);
  new ResizeObserver(() => {
    if (!ui("view-itinerary").classList.contains("active") || !ui("routeMap").clientHeight) return;
    map.invalidateSize({ pan: true, animate: false });
    if (following && cameraReady && lastLocation && Date.now() - lastLocation.timestamp < 15000)
      map.panTo([lastLocation.point[1], lastLocation.point[0]], { animate: false });
  }).observe(ui("routeMap"));
  L.tileLayer(ROUTE_CONFIG.tileUrl, {
    attribution: ROUTE_CONFIG.tileAttribution,
    maxZoom: 19,
    minZoom: 3,
    referrerPolicy: "strict-origin-when-cross-origin",
  })
    .addTo(map)
    .on("tileerror", () => {
      if (navigator.onLine)
        ui("routeMap").setAttribute("aria-description", "Algunas teselas no están disponibles.");
    });
  originalLine = L.polyline([], {
    color: "#8b97a6",
    weight: 7,
    opacity: 0.65,
    dashArray: "9 7",
  }).addTo(map);
  activeLine = L.polyline([], { color: "#0f5c56", weight: 6, opacity: 1 }).addTo(map);
  markers = L.layerGroup().addTo(map);
  map.on("dragstart", () => {
    cancelMapFrame();
    following = false;
    syncCameraControls();
  });
}

function drawMarkers() {
  markers.clearLayers();
  const trip = getActiveTrip(),
    points = trip.stops.map((s, i) => ({
      point: pointOf(s.key),
      name: placeName(s.key),
      label: String(i + 1),
      type: "stop",
    }));
  points.push({
    point: pointOf(trip.destKey),
    name: placeName(trip.destKey),
    label: "⚑",
    type: "destination",
  });
  if (originFix)
    points.unshift({
      point: originFix.point,
      name: "Salida desde mi ubicación",
      label: "●",
      type: "",
    });
  for (const p of points) {
    const icon = L.divIcon({
      className: "",
      html: '<div class="map-pin ' + p.type + '">' + p.label + "</div>",
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    L.marker([p.point[1], p.point[0]], { icon })
      .bindTooltip(p.name, { direction: "top" })
      .addTo(markers);
  }
}

function allOriginalCoords() {
  return plan.flatMap((l) => l.coords).map((p) => [p[1], p[0]]);
}

function drawRoute() {
  if (!plan || !map) return;
  if (drawnOriginalPlan !== plan) {
    originalLine.setLatLngs(allOriginalCoords());
    drawnOriginalPlan = plan;
  }
  const legs = navigatorState?.needsRoute
    ? []
    : navigatorState
      ? navigatorState.legs.slice(navigatorState.index)
      : plan;
  activeLine.setLatLngs(legs.flatMap((l) => l.coords).map((p) => [p[1], p[0]]));
  drawMarkers();
  renderRouteStops();
  syncCameraControls();
}

function cancelMapFrame() {
  if (mapFrame !== null) {
    cancelAnimationFrame(mapFrame);
    mapFrame = null;
  }
}

function fitRoute() {
  cancelMapFrame();
  if (!map || !plan) return;
  following = false;
  syncCameraControls();
  const bounds = originalLine.getBounds();
  const activeBounds = activeLine.getBounds();
  if (activeBounds.isValid()) bounds.extend(activeBounds);
  if (lastLocation) bounds.extend([lastLocation.point[1], lastLocation.point[0]]);
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [32, 45], maxZoom: 15 });
}

function focusNavigation(fix = null) {
  if (!map) return;
  const point =
    fix?.point || currentFix()?.point || navigatorState?.leg?.coords[0] || originFix?.point;
  if (!point) return;
  map.stop();
  map.invalidateSize({ pan: false });
  const zoom = (fix?.speed || 0) > 20 ? 15.5 : 16.5;
  map.setView([point[1], point[0]], zoom, { animate: false });
  cameraReady = !!fix;
  cameraZoomAt = Date.now();
}

function syncCameraControls() {
  const pressed = following && watching,
    busy = pressed && !currentFix();
  for (const id of ["centerButton", "locationButton"]) {
    ui(id).setAttribute("aria-pressed", String(pressed));
    ui(id).setAttribute("aria-busy", String(busy));
  }
  ui("overviewButton").disabled = !plan;
}

function centerOnUser() {
  cancelMapFrame();
  following = true;
  cameraReady = false;
  const fix = currentFix();
  if (fix) focusNavigation(fix);
  else {
    setStatus("Buscando tu ubicación actual para centrar el mapa…");
    ui("gpsLabel").textContent = "Esperando GPS reciente";
  }
  // Centrar no inicia ni pausa la guía y no vuelve a contar un fix ya procesado.
  requestLocation(false, false);
  syncCameraControls();
}

function followPosition(fix) {
  if (!following) return;
  if (!cameraReady) return focusNavigation(fix);
  const ll = [fix.point[1], fix.point[0]];
  if (Date.now() - cameraZoomAt > 10000 && activeNavigation) {
    const zoom = (fix.speed || 0) > 20 ? 15.5 : 16.5;
    if (Math.abs(map.getZoom() - zoom) >= 1) map.setZoom(zoom, { animate: false });
    cameraZoomAt = Date.now();
  }
  const far = map.getCenter().distanceTo(ll) > 1000;
  map.panTo(ll, { animate: !far, duration: 0.6 });
}

function paintLocation(fix) {
  const ll = [fix.point[1], fix.point[0]];
  if (!userMarker) {
    userMarker = L.marker(ll, {
      icon: L.divIcon({
        className: "",
        html: '<div class="user-dot"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
      zIndexOffset: 1000,
    }).addTo(map);
    accuracyCircle = L.circle(ll, {
      radius: fix.accuracy,
      color: "#2584f4",
      weight: 1,
      fillOpacity: 0.07,
    }).addTo(map);
    return;
  }
  if (markerAnimation) cancelAnimationFrame(markerAnimation);
  const from = userMarker.getLatLng(),
    start = performance.now(),
    animate = from.distanceTo(ll) < 200;
  accuracyCircle.setRadius(fix.accuracy);
  const frame = (now) => {
    const t = animate ? Math.min(1, (now - start) / 500) : 1,
      eased = t * (2 - t);
    const p = [from.lat + (ll[0] - from.lat) * eased, from.lng + (ll[1] - from.lng) * eased];
    userMarker.setLatLng(p);
    accuracyCircle.setLatLng(p);
    markerAnimation = t < 1 ? requestAnimationFrame(frame) : null;
  };
  markerAnimation = requestAnimationFrame(frame);
}
