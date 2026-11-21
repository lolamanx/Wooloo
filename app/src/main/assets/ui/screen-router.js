/**
 * Transiciones de pantalla, pestañas e historial sin perder la sesión de mapa.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

function renderScreen(screenId, pushHistory = true) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.querySelectorAll(".ia-button").forEach((b) => b.classList.remove("active"));

  const targetScreen = document.getElementById("view-" + screenId);
  if (targetScreen) targetScreen.classList.add("active");

  const iaTab = document.getElementById("tab-" + screenId);
  if (iaTab) iaTab.classList.add("active");

  document.getElementById("mobileTitle").textContent = SCREEN_TITLES[screenId] || "Wooloo";
  document.getElementById("mobileBackBtn").disabled = screenId === "trips";

  // El inicio usa el diseño de app móvil (cabecera a sangre + barra de pestañas)
  document.querySelector(".phone-inner").classList.toggle("is-home", screenId === "trips");
  document.querySelector(".screen-content").scrollTop = 0;

  if (pushHistory) {
    if (navigationHistory[navigationHistory.length - 1] !== screenId) {
      navigationHistory.push(screenId);
    }
  }

  // Renderizados correspondientes
  if (screenId === "trips") renderTripsList();
  if (screenId === "newtrip") renderNewTripForm();
  if (screenId === "stops") renderStopsManager();
  if (screenId === "itinerary") renderItineraryView();
  if (screenId === "detail") renderDetailView();
}

function returnToPreviousScreen() {
  if (navigationHistory.length > 1) {
    navigationHistory.pop();
    const prevScreen = navigationHistory[navigationHistory.length - 1];
    navTo(prevScreen, false);
  }
}

function navTo(screen, pushHistory = true, keepSession = false) {
  const start = screen === "live";
  if (start) screen = "itinerary";
  if (["itinerary", "stops", "detail"].includes(screen) && !getActiveTrip()) screen = "trips";
  const preserveMain = keepSession && !!planKey && ["trips", "itinerary"].includes(screen);
  retainedMapSession = preserveMain;
  cancelMapFrame();
  TripSwipe.close();
  closeRouteMenu(false);
  if (screen !== "stops") {
    detourRevision++;
    matrixEpoch++;
    matrixPromise = null;
    routingClient.cancelScope("matrix");
  }
  if (!preserveMain && screen !== "itinerary" && (loading || awaitingOrigin)) {
    generation++;
    loading = false;
    awaitingOrigin = false;
    planKey = "";
    routingClient.cancelScope("plan");
  }
  document.querySelector(".phone-inner").classList.toggle("is-map", screen === "itinerary");
  ui("routeMenuButton").hidden = screen !== "itinerary";
  if (!preserveMain && screen !== "itinerary") following = false;
  if (
    !preserveMain &&
    (!["itinerary", "stops"].includes(screen) || (screen === "stops" && activeNavigation)) &&
    watching
  )
    pauseNavigation(true);
  renderScreen(screen, pushHistory);
  document.querySelector(".phone-inner").classList.toggle("is-map", screen === "itinerary");
  updateOriginLabels();
  syncMainTabs();
  if (screen === "itinerary") {
    const savedCamera = preserveMain ? retainedCamera : null;
    retainedCamera = null;
    mapFrame = requestAnimationFrame(() => {
      mapFrame = null;
      map?.invalidateSize({ pan: false });
      if (lastLocation && map) paintLocation(lastLocation);
      if (preserveMain && following && currentFix()) focusNavigation(currentFix());
      else if (savedCamera) map?.setView(savedCamera.center, savedCamera.zoom, { animate: false });
      else if (preserveMain && plan) fitRoute();
    });
    if (start) startNavigation();
  }
}

function goBack() {
  if (!ui("drawerLayer").hidden) closeRouteMenu();
  else if (ui("view-itinerary").classList.contains("active")) switchMainTab("trips");
  else returnToPreviousScreen();
}

function syncMainTabs() {
  const home = ui("view-trips").classList.contains("active");
  for (const [id, selected] of [
    ["tripsTab", home],
    ["mapTab", !home],
  ]) {
    ui(id).classList.toggle("active", selected);
    if (selected) ui(id).setAttribute("aria-current", "page");
    else ui(id).removeAttribute("aria-current");
  }
  ui("mapTab").disabled = !getActiveTrip();
}

function switchMainTab(screen) {
  if (!["trips", "itinerary"].includes(screen)) return;
  if (ui("view-" + screen).classList.contains("active")) return;
  if (screen === "itinerary" && !getActiveTrip()) return startNewTripFlow();
  if (ui("view-trips").classList.contains("active"))
    mainScrollTop = document.querySelector(".screen-content").scrollTop;
  if (screen === "trips" && map) retainedCamera = { center: map.getCenter(), zoom: map.getZoom() };
  navTo(screen, false, true);
  navigationHistory = screen === "trips" ? ["trips"] : ["trips", "itinerary"];
  if (screen === "trips") document.querySelector(".screen-content").scrollTop = mainScrollTop;
}
