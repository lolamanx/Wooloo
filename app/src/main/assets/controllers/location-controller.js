/**
 * Recepción y filtrado de fijaciones GPS; coordina la guía sin persistir posiciones.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

function currentFix() {
  return lastLocation &&
    E.validPoint(lastLocation.point) &&
    lastLocation.accuracy <= 50 &&
    Date.now() - lastLocation.timestamp >= -5000 &&
    Date.now() - lastLocation.timestamp < 15000
    ? lastLocation
    : null;
}

function requestLocation(navigate = false, replay = true) {
  if (ui("view-itinerary").classList.contains("active") && !plan && !loading && !routeFailure)
    awaitingOrigin = true;
  if (navigate) activeNavigation = true;
  if (!watching) {
    watching = true;
    gpsFilter = new E.LocationFilter();
    lastGoodNavigationAt = 0;
    ui("gpsLabel").textContent = "Buscando señal GPS…";
    setStatus("Solicitando ubicación precisa. La ruta se actualiza con la app visible.");
    if (window.AndroidLocation?.start) window.AndroidLocation.start();
    else if (navigator.geolocation)
      browserWatch = navigator.geolocation.watchPosition(
        (position) =>
          handleLocation({
            point: [position.coords.longitude, position.coords.latitude],
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
            heading: position.coords.heading,
            speed: position.coords.speed,
            provider: "browser",
          }),
        (error) =>
          error.code === 1
            ? locationError(
                "Permiso denegado. Activa la ubicación precisa en los ajustes de la aplicación.",
              )
            : locationWarning("Esperando recuperar la señal GPS…"),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    else locationError("Este dispositivo no ofrece ubicación.");
    locationTimer = setInterval(checkStaleLocation, 5000);
  }
  syncNavigationControls();
  if (replay && activeNavigation && lastLocation && Date.now() - lastLocation.timestamp < 15000)
    handleLocation(lastLocation, true);
}

function stopLocation() {
  if (browserWatch !== null) navigator.geolocation.clearWatch(browserWatch);
  browserWatch = null;
  watching = false;
  clearInterval(locationTimer);
  locationTimer = null;
  window.AndroidLocation?.stop();
  if (markerAnimation) cancelAnimationFrame(markerAnimation);
  markerAnimation = null;
}

function locationWarning(message) {
  if (watching) {
    setStatus(message, "warning");
    ui("gpsLabel").textContent = "Buscando señal GPS…";
  }
}

function locationError(message) {
  pauseNavigation(true);
  setStatus(message, "warning");
  ui("gpsLabel").textContent = "GPS no disponible";
}

function checkStaleLocation() {
  syncCameraControls();
  if (!watching || (lastGoodNavigationAt && Date.now() - lastGoodNavigationAt < 15000)) return;
  setStatus("Señal GPS perdida o desactualizada. Esperando una ubicación precisa…", "warning");
  ui("gpsLabel").textContent = "Sin señal reciente";
  ui("turnInstruction").textContent = "Esperando señal GPS";
}

function handleLocation(fix, reprocess = false) {
  if (!watching) return;
  if (!reprocess) {
    const filtered = gpsFilter.accept(fix);
    if (filtered.ignored) {
      if (filtered.ignored === "precision" && Date.now() - lastGoodNavigationAt > 8000)
        locationWarning("Esperando una posición GPS más precisa…");
      return;
    }
    fix = filtered.fix;
  }
  if (!fix || Date.now() - fix.timestamp > 15000) return;
  const reliable = fix.accuracy <= 50;
  let result;
  if (activeNavigation && navigatorState && !navigatorState.needsRoute && reliable) {
    if (reprocess && navigatorState.lastFix?.timestamp === fix.timestamp)
      navigatorState.lastFix = null;
    result = navigatorState.accept(fix);
    if (result.ignored) {
      if (result.ignored === "salto")
        setStatus("Se detectó un salto de GPS. Esperando confirmar la posición.", "warning");
      return;
    }
  }
  lastLocation = fix;
  if (reliable) lastGoodNavigationAt = fix.timestamp;
  const onMap = ui("view-itinerary").classList.contains("active");
  if (map && onMap) paintLocation(fix);
  updateOriginLabels();
  syncCameraControls();
  ui("gpsLabel").textContent =
    (reliable ? "GPS" : "Ubicación aproximada") + " · ±" + Math.round(fix.accuracy) + " m";
  if (map && onMap) followPosition(fix);
  if (reliable && (onMap || retainedMapSession) && awaitingOrigin && !loading) {
    void beginCurrentPlan(fix);
    return;
  }
  if (
    reliable &&
    ui("view-stops").classList.contains("active") &&
    !matrixPromise &&
    Date.now() - lastMatrixAttempt > 20000 &&
    (!matrixCache ||
      Date.now() - matrixCache.time > 60000 ||
      E.distance(matrixCache.originPoint, fix.point) > 150)
  )
    void updateRecommendedStops();
  if (activeNavigation && navigatorState?.needsRoute) {
    clearMetrics();
    ui("turnInstruction").textContent = rerouting
      ? "Calculando la salida más rápida…"
      : "Siguiente tramo pendiente de cálculo";
    if (reliable && !rerouting && Date.now() - navigatorState.lastAttempt >= 20000)
      void reroute(true);
    return;
  }
  if (!activeNavigation) {
    if (routeFailure) setStatus(routeFailure.message, "error");
    else if (plan && !loading && !awaitingOrigin && !finished)
      setStatus("Ubicación actualizada. Pulsa Iniciar ruta para activar la guía.");
    return;
  }
  if (!result && loading) {
    setStatus("Ubicación recibida. Terminando el cálculo de la ruta…");
    return;
  }
  if (!reliable || !result) {
    setStatus("Se mantiene la guía; esperando mejor precisión para recalcular.", "warning");
    return;
  }
  presentNavigationResult(result);
}

function presentNavigationResult(result) {
  lastResult = result;
  updateSummary(result);
  if (result.arrive) {
    arrived = true;
    ui("arrivalPanel").hidden = false;
    const final = navigatorState.index === plan.length - 1;
    ui("arrivalText").textContent =
      "Estás cerca de " + nextPlace().name + ". Confirma cuando hayas llegado.";
    ui("arrivalButton").textContent = final
      ? "Confirmar llegada y finalizar"
      : "Confirmar visita y continuar";
    ui("turnInstruction").textContent = "Llegando a " + nextPlace().name;
    setStatus("Llegada próxima. Confirma tu visita para avanzar a la siguiente parada.");
    return;
  }
  arrived = false;
  ui("arrivalPanel").hidden = true;
  if (result.off) {
    ui("turnInstruction").textContent = rerouting
      ? "Buscando la ruta más rápida…"
      : "Fuera del recorrido";
    ui("turnDistance").textContent = "PARADAS CONSERVADAS";
    setStatus(
      rerouting
        ? "Calculando la ruta más rápida por tus paradas pendientes…"
        : "Confirmando el desvío con varias posiciones GPS…",
      "warning",
    );
    if (result.reroute && !rerouting) reroute();
  } else {
    setStatus("En ruta · Conservando el orden de tus paradas.");
    ui("turnDistance").textContent =
      result.turnDistance < 1000
        ? Math.round(result.turnDistance / 10) * 10 + " m"
        : (result.turnDistance / 1000).toFixed(1) + " km";
    ui("turnInstruction").textContent = result.next?.text || "Continúa por la vía indicada";
    const modifier = result.next?.maneuver?.modifier || "";
    ui("turnArrow").textContent = modifier.includes("left")
      ? "↰"
      : modifier.includes("right")
        ? "↱"
        : modifier === "uturn"
          ? "↶"
          : "↑";
  }
  ui("nextTarget").textContent = "Próxima parada: " + nextPlace().name;
}
