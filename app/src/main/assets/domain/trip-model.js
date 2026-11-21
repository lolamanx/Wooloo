/**
 * Modelo de viajes, ubicaciones de catálogo y estimaciones de planificación.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

function getNextDepartureDate(h, m) {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function getActiveTrip() {
  return tripsData.find((t) => t.id === activeTripId) || tripsData[0];
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function estimateDrivingMinutes(lat1, lon1, lat2, lon2) {
  const km = calculateDistanceKm(lat1, lon1, lat2, lon2) * 1.18; // +18% sinuosidad
  return Math.ceil((km / 82) * 60); // promedio de 82 km/h en carretera
}

function pointOf(key) {
  return key === ORIGIN_KEY
    ? (currentFix()?.point.slice() ?? null)
    : [LOCATIONS[key].lng, LOCATIONS[key].lat];
}

function placeName(key) {
  return key === ORIGIN_KEY ? "Mi ubicación actual" : LOCATIONS[key].name;
}

function signature(trip) {
  return JSON.stringify([
    ROUTE_CONFIG.routerBase,
    trip.id,
    ORIGIN_KEY,
    trip.destKey,
    trip.stops.map((s) => s.key),
  ]);
}

function knownLocation(key) {
  return typeof key === "string" && Object.prototype.hasOwnProperty.call(LOCATIONS, key);
}

function computeTripSchedule(trip) {
  const fix = currentFix(),
    legs =
      fix &&
      originFix &&
      planKey === signature(trip) &&
      E.distance(fix.point, originFix.point) < 100
        ? routeCache.get(signature(trip))
        : null;
  const origin = {
      name: "Mi ubicación actual",
      icon: "📍",
      lat: fix?.point[1],
      lng: fix?.point[0],
    },
    dest = LOCATIONS[trip.destKey];
  let time = Date.parse(trip.departureISO),
    drive = fix ? 0 : null,
    stay = 0,
    previous = origin;
  const stops = [];
  const points = [...trip.stops.map((s) => s.key), trip.destKey];
  points.forEach((key, i) => {
    const next = LOCATIONS[key],
      minutes = legs
        ? Math.ceil(legs[i].duration / 60)
        : fix
          ? estimateDrivingMinutes(previous.lat, previous.lng, next.lat, next.lng)
          : null;
    if (Number.isFinite(minutes)) {
      drive += minutes;
      time += minutes * 60000;
    } else time = null;
    if (i < trip.stops.length) {
      const s = trip.stops[i],
        arrivalTime = time;
      stay += s.stayMin;
      if (time !== null) time += s.stayMin * 60000;
      stops.push({
        ...s,
        name: next.name,
        icon: next.icon,
        driveMin: minutes,
        arrivalTime,
        departureTime: time,
        detourMin: 0,
      });
    }
    previous = next;
  });
  return {
    origin,
    dest,
    totalDriveMinutes: drive,
    totalStopMinutes: stay,
    stops,
    finalArrival: time,
    roadCalculated: !!legs,
  };
}
