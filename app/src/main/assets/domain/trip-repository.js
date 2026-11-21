/** Persistencia local: valida, normaliza y guarda únicamente los campos del viaje. */
"use strict";

function normalizeTripForStorage(trip) {
  return {
    id: trip.id,
    name: trip.name,
    originKey: ORIGIN_KEY,
    destKey: trip.destKey,
    departureISO: trip.departureISO,
    stops: trip.stops.map((stop) => ({
      key: stop.key,
      stayMin: stop.stayMin,
      detourMin: 0,
    })),
  };
}

function isValidSavedStop(stop, destinationKey) {
  return (
    stop &&
    knownLocation(stop.key) &&
    stop.key !== destinationKey &&
    Number.isFinite(stop.stayMin) &&
    stop.stayMin >= 0 &&
    stop.stayMin <= 1440
  );
}

function isValidSavedTrip(trip) {
  return (
    trip &&
    typeof trip.id === "string" &&
    /^trip-[a-z0-9-]+$/i.test(trip.id) &&
    typeof trip.name === "string" &&
    trip.name.length <= 120 &&
    (trip.originKey === ORIGIN_KEY || knownLocation(trip.originKey)) &&
    knownLocation(trip.destKey) &&
    Number.isFinite(Date.parse(trip.departureISO)) &&
    Array.isArray(trip.stops) &&
    trip.stops.length <= 10 &&
    new Set(trip.stops.map((stop) => stop?.key)).size === trip.stops.length &&
    trip.stops.every((stop) => isValidSavedStop(stop, trip.destKey))
  );
}

function demoTripRequest(method, id, trip) {
  try {
    const payload = trip ? JSON.stringify(normalizeTripForStorage(trip)) : "";
    return JSON.parse(window.AndroidDemoTrips.request(method, id, payload));
  } catch {
    return null;
  }
}

function persistTrips(method, id, trip) {
  try {
    if (tripsData.length > 100 || !tripsData.every(isValidSavedTrip)) return false;
    if (window.AndroidDemoTrips) return demoTripRequest(method, id, trip)?.success === true;
    const savedTrips = tripsData.map(normalizeTripForStorage);
    localStorage.setItem(storageKey, JSON.stringify(savedTrips));
    return true;
  } catch {
    return false;
  }
}

function restoreTrips() {
  if (window.AndroidDemoTrips) {
    const result = demoTripRequest("GET", "");
    const saved = result?.data?.map((trip) => ({ ...trip, originKey: ORIGIN_KEY }));
    tripsData = Array.isArray(saved) ? saved.filter(isValidSavedTrip).map(normalizeTripForStorage) : [];
    activeTripId = tripsData[0]?.id || null;
    if (!result?.success) {
      ui("tripDeleteError").textContent = "Servidor de la demo no disponible. Ejecuta npm run demo y vuelve a abrir Wooloo.";
      ui("tripDeleteError").hidden = false;
    }
    return;
  }
  try {
    const savedTrips = JSON.parse(localStorage.getItem(storageKey));
    if (!Array.isArray(savedTrips) || savedTrips.length > 100) return;
    if (!savedTrips.every(isValidSavedTrip)) return;
    tripsData = savedTrips.map(normalizeTripForStorage);
    activeTripId = tripsData[0]?.id || null;
    persistTrips();
  } catch {
    // Conservar el estado inicial si el almacenamiento no está disponible o es inválido.
  }
}
