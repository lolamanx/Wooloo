/** Persistencia de viajes: normaliza y coordina la consulta del servidor o almacenamiento local. */
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

let demoTripRequestId = 0;

function requestDemoTripAsync(method, id = "", trip = null) {
  return new Promise((resolve, reject) => {
    const requestId = ++demoTripRequestId;
    const timer = setTimeout(() => finish(null), 6000);
    function finish(result) {
      clearTimeout(timer);
      window.removeEventListener("nativeTripResponse", receive);
      if (result && typeof result.success === "boolean") resolve(result);
      else
        reject(
          new Error(
            "No pudimos comunicarnos con el servidor. Comprueba la conexión e inténtalo de nuevo.",
          ),
        );
    }
    function receive(event) {
      if (event.detail?.requestId !== requestId) return;
      let result;
      try {
        result = JSON.parse(event.detail.response);
      } catch {
        finish(null);
        return;
      }
      finish(result);
    }
    window.addEventListener("nativeTripResponse", receive);
    try {
      const payload = trip ? JSON.stringify(normalizeTripForStorage(trip)) : "";
      window.AndroidDemoTrips.requestAsync(requestId, method, id, payload);
    } catch {
      finish(null);
    }
  });
}

async function loadDemoTrips() {
  const result = await requestDemoTripAsync("GET");
  if (!result.success || !Array.isArray(result.data)) {
    throw new Error("No se pudo consultar la lista de viajes.");
  }
  return result.data
    .map((trip) => ({ ...trip, originKey: ORIGIN_KEY }))
    .filter(isValidSavedTrip)
    .map(normalizeTripForStorage);
}

async function createDemoTrip(trip) {
  const result = await requestDemoTripAsync("POST", "", trip);
  if (result.success) return;
  if (result.error?.code === 409) {
    // Si se perdió la respuesta de un intento previo, confirma el mismo ID.
    const existing = await requestDemoTripAsync("GET", trip.id);
    const saved = existing.success && existing.data;
    if (
      saved &&
      saved.name === trip.name &&
      saved.destKey === trip.destKey &&
      Date.parse(saved.departureISO) === Date.parse(trip.departureISO) &&
      Array.isArray(saved.stops) &&
      saved.stops.length === 0
    )
      return;
    if (saved) {
      throw Object.assign(
        new Error(
          "El viaje se guardó con los datos de un intento anterior. Vuelve a Mis viajes para revisarlo.",
        ),
        { savedTrip: { ...saved, originKey: ORIGIN_KEY } },
      );
    }
  }
  throw new Error(
    result.error?.code === 400
      ? "El servidor no aceptó los datos. Revisa el nombre, el destino y la fecha."
      : "El servidor no pudo guardar tu viaje. Inténtalo de nuevo.",
  );
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
