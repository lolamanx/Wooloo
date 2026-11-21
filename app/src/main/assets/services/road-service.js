/**
 * Adaptador OSRM: solicitudes y validación de los puntos y geometrías.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

function requestRouting(points, kind, params, options = {}) {
  return routingClient.request(points, kind, params, options);
}

function readRoadData(data, points) {
  if (data?.code === "Ok") {
    if (
      !Array.isArray(data.waypoints) ||
      data.waypoints.length !== points.length ||
      data.waypoints.some((w) => !E.validPoint(w?.location))
    )
      throw Error("El servidor devolvió puntos de ruta inválidos.");
    const i = data.waypoints.findIndex((w, index) => E.distance(w.location, points[index]) > 150);
    if (i >= 0) {
      const entry = Object.values(LOCATIONS).find(
        (loc) => E.distance([loc.lng, loc.lat], points[i]) < 1,
      );
      const label =
        i === 0
          ? "Tu ubicación actual"
          : entry?.name || (i === points.length - 1 ? "El destino" : "La parada " + i);
      const meters = Math.round(E.distance(data.waypoints[i].location, points[i]));
      throw Object.assign(
        Error(
          label + " queda a " + meters + " m de una vía transitable. Revisa el punto seleccionado.",
        ),
        { code: "POINT_OFF_ROAD", pointIndex: i, distance: meters },
      );
    }
  }
  const legs = E.parseRoute(data, points.length - 1);
  if (
    legs.some(
      (leg, i) =>
        E.distance(leg.coords[0], data.waypoints[i].location) > 30 ||
        E.distance(leg.coords.at(-1), data.waypoints[i + 1].location) > 30,
    )
  )
    throw Error("La geometría no coincide con los puntos del recorrido.");
  return legs;
}

async function fetchRoad(points, options = { scope: "navigation", priority: 20 }) {
  return readRoadData(await requestRouting(points, "route", routeParams, options), points);
}
