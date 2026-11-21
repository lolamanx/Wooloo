/**
 * Planificación, inicio, recálculo y confirmación de las visitas.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

function renderItineraryView() {
  try {
    initMap();
  } catch (error) {
    setStatus(error.message, "error");
    return;
  }
  const trip = getActiveTrip(),
    key = signature(trip);
  if (planKey === key && (retainedMapSession || activeNavigation || loading || awaitingOrigin)) {
    renderRouteStops();
    if (plan) updateSummary();
    if (awaitingOrigin && !loading && currentFix()) void beginCurrentPlan(currentFix());
    return;
  }
  routingClient.cancelScope("plan");
  routingClient.cancelScope("navigation");
  generation++;
  const preserve = planKey === key && !finished ? navigatorState : null;
  activeNavigation = false;
  wantStart = false;
  rerouting = false;
  arrived = false;
  finished = false;
  lastResult = null;
  loading = false;
  awaitingOrigin = true;
  routeFailure = null;
  navigatorState = preserve;
  if (preserve) {
    preserve.needsRoute = true;
    preserve.leg = null;
  } else {
    plan = null;
    originFix = null;
    originalLine.setLatLngs([]);
    drawnOriginalPlan = null;
    routeCache.clear();
  }
  planKey = key;
  activeLine.setLatLngs([]);
  ui("arrivalPanel").hidden = true;
  ui("routeRecovery").hidden = true;
  drawMarkers();
  renderRouteStops();
  clearMetrics();
  syncNavigationControls();
  ui("turnInstruction").textContent = "Esperando tu ubicación";
  ui("turnDistance").textContent = "SALIDA DESDE GPS";
  ui("nextTarget").textContent = "Próximo destino: " + nextPlace().name;
  setStatus("Obteniendo una ubicación precisa para calcular desde donde estás.");
  const bounds = markers.getBounds
    ? markers.getBounds()
    : L.latLngBounds(
        [...trip.stops.map((s) => pointOf(s.key)), pointOf(trip.destKey)].map((p) => [p[1], p[0]]),
      );
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  requestLocation(false);
  const fix = currentFix();
  if (fix) void beginCurrentPlan(fix);
}

async function beginCurrentPlan(fix) {
  if (
    !awaitingOrigin ||
    loading ||
    !currentFix() ||
    (!ui("view-itinerary").classList.contains("active") && !retainedMapSession)
  )
    return;
  routeFailure = null;
  ui("routeRecovery").hidden = true;
  awaitingOrigin = false;
  loading = true;
  const token = ++generation,
    trip = getActiveTrip(),
    key = signature(trip),
    state = navigatorState;
  const source = { ...fix, point: fix.point.slice() },
    index = state?.index || 0;
  const points = [
    source.point,
    ...trip.stops.slice(index).map((s) => pointOf(s.key)),
    pointOf(trip.destKey),
  ];
  originFix = source;
  drawMarkers();
  setStatus("Calculando la ruta más rápida desde tu ubicación…");
  ui("turnInstruction").textContent = "Calculando desde donde estás…";
  try {
    const legs = await fetchRoad(points, { scope: "plan", priority: 10 });
    if (token !== generation || signature(getActiveTrip()) !== key) return;
    if (!currentFix() || E.distance(source.point, currentFix().point) > 500)
      throw Error("La ubicación cambió durante el cálculo. Vuelve a intentar.");
    if (state) {
      state.applyRemaining(legs);
    } else {
      plan = legs;
      navigatorState = new E.Navigator(legs);
    }
    loading = false;
    routeCache.set(key, navigatorState.legs);
    drawRoute();
    if (ui("view-itinerary").classList.contains("active")) {
      if (following) focusNavigation(currentFix());
      else fitRoute();
    } else retainedCamera = null;
    updateSummary();
    ui("turnInstruction").textContent = "Tu ruta desde aquí está lista";
    ui("nextTarget").textContent = "Próximo destino: " + nextPlace().name;
    setStatus("Recorrido calculado desde tu ubicación actual.");
    if (wantStart) activateNavigation();
    else syncNavigationControls();
  } catch (error) {
    if (token !== generation) return;
    loading = false;
    wantStart = false;
    activeNavigation = false;
    syncNavigationControls();
    clearMetrics();
    showRouteFailure(error, "No se pudo calcular. ");
    ui("turnInstruction").textContent = "Ruta pendiente de cálculo";
  }
}

async function retryRoute() {
  if (loading) return;
  if (activeNavigation && navigatorState) return reroute(true);
  awaitingOrigin = true;
  ui("routeRecovery").hidden = true;
  requestLocation(false);
  const fix = currentFix();
  if (fix) return beginCurrentPlan(fix);
}

function activateNavigation() {
  wantStart = false;
  activeNavigation = true;
  following = true;
  cameraReady = false;
  requestLocation(true);
  focusNavigation(currentFix());
  syncNavigationControls();
}

function startNavigation() {
  wantStart = true;
  following = true;
  cameraReady = false;
  focusNavigation(currentFix());
  if (finished) {
    planKey = "";
    renderItineraryView();
    wantStart = true;
  }
  requestLocation(false);
  syncNavigationControls();
  if (loading) return;
  const fix = currentFix();
  if (!fix) {
    awaitingOrigin = true;
    setStatus("Esperando tu ubicación precisa para iniciar…");
    return;
  }
  if (!plan || awaitingOrigin) {
    awaitingOrigin = true;
    return beginCurrentPlan(fix);
  }
  if (navigatorState.needsRoute || !originFix || E.distance(fix.point, originFix.point) > 50) {
    navigatorState.needsRoute = true;
    navigatorState.leg = null;
    activateNavigation();
    activeLine.setLatLngs([]);
    clearMetrics();
    return reroute(true);
  }
  activateNavigation();
}

function pauseNavigation(silent = false) {
  const wasActive = watching || activeNavigation;
  activeNavigation = false;
  wantStart = false;
  awaitingOrigin = false;
  generation += rerouting ? 1 : 0;
  rerouting = false;
  routingClient.cancelScope("navigation");
  stopLocation();
  syncNavigationControls();
  ui("gpsLabel").textContent = lastLocation ? "Última ubicación · GPS pausado" : "GPS sin activar";
  if (!silent && wasActive) {
    setStatus("Ruta pausada. No se está consultando tu ubicación.");
    ui("turnInstruction").textContent = "Navegación pausada";
  }
}

async function reroute(force = false) {
  if (
    !activeNavigation ||
    !navigatorState ||
    !lastLocation ||
    lastLocation.accuracy > 50 ||
    rerouting ||
    Date.now() - lastLocation.timestamp > 15000
  )
    return;
  if (!force && Date.now() - navigatorState.lastAttempt < 20000) return;
  routeFailure = null;
  rerouting = true;
  const token = generation,
    state = navigatorState;
  state.beginReroute();
  ui("routeRecovery").hidden = true;
  const source = lastLocation,
    trip = getActiveTrip();
  const pending = [...trip.stops.slice(state.index).map((s) => s.key), trip.destKey];
  setStatus("Buscando la ruta más rápida por tus paradas pendientes…", "warning");
  try {
    const legs = await fetchRoad([source.point, ...pending.map(pointOf)]);
    if (token !== generation || !activeNavigation || state !== navigatorState) return;
    if (
      !lastLocation ||
      Date.now() - lastLocation.timestamp > 15000 ||
      E.distance(source.point, lastLocation.point) > 500
    )
      throw Error("La posición cambió durante el cálculo. Se intentará de nuevo.");
    state.applyRemaining(legs);
    originFix = { ...source, point: source.point.slice() };
    lastResult = null;
    drawRoute();
    updateSummary();
    setStatus("Ruta actualizada: trayecto más rápido disponible por tus paradas.");
    ui("turnInstruction").textContent = "Sigue la nueva guía";
    // Proyectar la posición más reciente sobre el nuevo recorrido sin esperar otro segundo.
    handleLocation(lastLocation, true);
  } catch (error) {
    if (token !== generation) return;
    showRouteFailure(
      error,
      state.needsRoute
        ? "No hay una guía actualizada para el siguiente tramo. "
        : "Se conserva la guía anterior. ",
    );
  } finally {
    if (token === generation) rerouting = false;
  }
}

function confirmVisit() {
  if (
    !arrived ||
    !activeNavigation ||
    !currentFix() ||
    !navigatorState ||
    navigatorState.needsRoute ||
    rerouting ||
    E.distance(currentFix().point, navigatorState.leg.coords.at(-1)) >= 100
  )
    return;
  arrived = false;
  ui("arrivalPanel").hidden = true;
  lastResult = null;
  routeFailure = null;
  generation++;
  rerouting = false;
  routingClient.cancelScope("navigation");
  if (navigatorState.nextLeg()) {
    drawRoute();
    clearMetrics();
    ui("nextTarget").textContent = "Próximo destino: " + nextPlace().name;
    ui("turnInstruction").textContent = "Calculando la salida más rápida…";
    setStatus("Visita confirmada. Calculando desde tu ubicación al siguiente destino.");
    void reroute(true);
  } else {
    finished = true;
    pauseNavigation(true);
    updateSummary();
    renderRouteStops();
    setStatus("Llegaste a tu destino. Viaje finalizado y GPS desactivado.");
    ui("turnInstruction").textContent = "¡Llegaste! Gracias por viajar con Wooloo.";
    ui("turnDistance").textContent = "DESTINO ALCANZADO";
  }
}
