/**
 * Matriz pública y fila GPS en memoria para tiempos de desvío.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

function matrixDiskKey() {
  return (
    "matrix-v2:" +
    ROUTE_CONFIG.routerBase +
    ":" +
    JSON.stringify(
      Object.keys(LOCATIONS)
        .sort()
        .map((key) => [key, LOCATIONS[key].lng, LOCATIONS[key].lat]),
    )
  );
}

function readMatrix(data, keys, base, time) {
  if (
    data?.code !== "Ok" ||
    !Array.isArray(data.durations) ||
    data.durations.length !== keys.length ||
    data.durations.some(
      (row) =>
        !Array.isArray(row) ||
        row.length !== keys.length ||
        row.some((n) => n !== null && (!Number.isFinite(n) || n < 0)),
    )
  )
    throw Error("No se pudieron calcular los tiempos de desvío.");
  const indexes = new Map(keys.map((key, i) => [key, i]));
  return { time, base, get: (a, b) => data.durations[indexes.get(a)]?.[indexes.get(b)] };
}

async function durationMatrix() {
  const fix = currentFix();
  if (!fix)
    throw Object.assign(Error("Esperando ubicación precisa para calcular desvíos."), {
      code: "LOCATION_REQUIRED",
    });
  if (
    matrixCache &&
    matrixCache.base === ROUTE_CONFIG.routerBase &&
    Date.now() - matrixCache.time < 60000 &&
    E.distance(matrixCache.originPoint, fix.point) < 150
  )
    return matrixCache;
  if (matrixPromise) return matrixPromise;
  const keys = Object.keys(LOCATIONS).sort(),
    base = ROUTE_CONFIG.routerBase,
    epoch = matrixEpoch,
    source = fix.point.slice();
  lastMatrixAttempt = Date.now();
  const task = (async () => {
    const diskKey = matrixDiskKey(),
      row = await planningStore.get(diskKey, 600000);
    if (epoch !== matrixEpoch)
      throw Object.assign(Error("Consulta cancelada."), { code: "CANCELLED" });
    let catalog = null;
    if (
      row &&
      JSON.stringify(row.keys) === JSON.stringify(keys) &&
      Number.isFinite(row.createdAt) &&
      Date.now() - row.createdAt >= 0 &&
      Date.now() - row.createdAt < 600000
    ) {
      try {
        readMatrix(row.data, keys, base, row.createdAt);
        catalog = row.data;
      } catch {
        await planningStore.remove(diskKey);
      }
    }
    const options = catalog
      ? { annotations: "duration", sources: "0", destinations: keys.map((_, i) => i + 1).join(";") }
      : { annotations: "duration" };
    const data = await requestRouting([source, ...keys.map(pointOf)], "table", options, {
      scope: "matrix",
      priority: 0,
    });
    if (epoch !== matrixEpoch)
      throw Object.assign(Error("Consulta cancelada."), { code: "CANCELLED" });
    let originRow;
    if (catalog) {
      if (
        data.code !== "Ok" ||
        data.durations?.length !== 1 ||
        data.durations[0]?.length !== keys.length ||
        data.durations[0].some((n) => n !== null && (!Number.isFinite(n) || n < 0))
      )
        throw Error("Tiempos desde ubicación inválidos.");
      originRow = data.durations[0];
    } else {
      readMatrix(data, [ORIGIN_KEY, ...keys], base, Date.now());
      originRow = data.durations[0].slice(1);
      catalog = { code: "Ok", durations: data.durations.slice(1).map((row) => row.slice(1)) };
      void planningStore.put(diskKey, { createdAt: Date.now(), keys, data: catalog });
    }
    const publicMatrix = readMatrix(catalog, keys, base, Date.now()),
      indexes = new Map(keys.map((key, i) => [key, i]));
    matrixCache = {
      base,
      time: Date.now(),
      originPoint: source,
      get: (a, b) => (a === ORIGIN_KEY ? originRow[indexes.get(b)] : publicMatrix.get(a, b)),
    };
    return matrixCache;
  })().finally(() => {
    if (matrixPromise === task) matrixPromise = null;
  });
  matrixPromise = task;
  return task;
}

async function updateRecommendedStops() {
  const revision = ++detourRevision,
    trip = getActiveTrip(),
    key = signature(trip);
  const rows = Array.from(ui("catalogStopsContainer").querySelectorAll(".catalog-entry"));
  rows.forEach((row) => {
    row.querySelector(".detour-time")?.remove();
    const hint = document.createElement("small");
    hint.className = "detour-time";
    hint.textContent = currentFix() ? "Calculando desvío…" : "Esperando ubicación…";
    row.querySelector(".catalog-info").append(hint);
    row.querySelector("button").disabled = true;
  });
  ui("detourRetry").hidden = true;
  try {
    const matrix = await durationMatrix();
    if (revision !== detourRevision || signature(getActiveTrip()) !== key) return;
    const keys = [trip.originKey, ...trip.stops.map((s) => s.key), trip.destKey];
    rows.forEach((row) => {
      const button = row.querySelector("button"),
        candidate = button.dataset.action.match(/'([^']+)'/)[1];
      const best = E.bestInsertion(keys, candidate, matrix.get),
        hint = row.querySelector(".detour-time");
      hint.textContent = best
        ? "≈ +" +
          Math.ceil(best.seconds / 60) +
          " min de conducción · antes de " +
          shortPlaceName(LOCATIONS[keys[best.index + 1]].name)
        : "Sin conexión vial disponible";
      button.disabled = !best;
      row.dataset.detourSeconds = best?.seconds ?? Infinity;
    });
    rows
      .sort((a, b) => Number(a.dataset.detourSeconds) - Number(b.dataset.detourSeconds))
      .forEach((row) => ui("catalogStopsContainer").append(row));
    ui("selectedStopsContainer")
      .querySelectorAll(".selected-detour")
      .forEach((note) => {
        const i = trip.stops.findIndex((s) => s.key === note.dataset.key),
          prev = keys[i],
          next = keys[i + 2],
          candidate = keys[i + 1];
        const values = [
          matrix.get(prev, candidate),
          matrix.get(candidate, next),
          matrix.get(prev, next),
        ];
        note.textContent = values.every(Number.isFinite)
          ? "≈ +" +
            Math.ceil(Math.max(0, values[0] + values[1] - values[2]) / 60) +
            " min de conducción por esta parada; estadía aparte."
          : "Desvío vial no disponible.";
      });
  } catch (error) {
    if (revision !== detourRevision) return;
    rows.forEach((row) => {
      const hint = row.querySelector(".detour-time");
      hint.textContent =
        error.code === "LOCATION_REQUIRED"
          ? "Activa GPS para conocer el desvío. Puedes añadirlo al final."
          : "Desvío no disponible sin conexión. Puedes añadirlo al final.";
      hint.classList.add("unavailable");
      row.querySelector("button").disabled = false;
    });
    ui("selectedStopsContainer")
      .querySelectorAll(".selected-detour")
      .forEach((n) => (n.textContent = "Tiempo de desvío no disponible."));
    ui("detourRetry").hidden = error.code === "LOCATION_REQUIRED";
  }
}

async function refreshDetours() {
  matrixEpoch++;
  matrixPromise = null;
  matrixCache = null;
  routingClient.cancelScope("matrix");
  await planningStore.remove(matrixDiskKey());
  renderStopsManager();
}
