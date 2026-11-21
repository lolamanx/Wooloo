/* RutaViajera: geometría y navegación independientes de la interfaz. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RouteEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const R = 6371000,
    rad = Math.PI / 180;
  const distance = (a, b) => {
    const x =
      Math.sin(((b[1] - a[1]) * rad) / 2) ** 2 +
      Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(((b[0] - a[0]) * rad) / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)));
  };
  const validPoint = (p) =>
    Array.isArray(p) &&
    p.length === 2 &&
    p.every(Number.isFinite) &&
    Math.abs(p[0]) <= 180 &&
    Math.abs(p[1]) <= 90;
  function makeLeg(coords, durationSegments, steps = []) {
    if (!Array.isArray(coords) || coords.length < 2 || !coords.every(validPoint))
      throw Error("Geometría de ruta inválida.");
    const meters = [0],
      seconds = [0];
    coords = coords.map((p) => p.slice());
    for (let i = 1; i < coords.length; i++) {
      const d = distance(coords[i - 1], coords[i]);
      meters.push(meters[i - 1] + d);
      const duration = durationSegments?.[i - 1] ?? d / 15;
      if (!Number.isFinite(duration) || duration < 0) throw Error("Duración de ruta inválida.");
      seconds.push(seconds[i - 1] + duration);
    }
    return { coords, meters, seconds, steps, distance: meters.at(-1), duration: seconds.at(-1) };
  }
  function lowerBound(values, target, upper = false) {
    let lo = 0,
      hi = values.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (values[mid] < target || (upper && values[mid] === target)) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  function nearest(point, leg, min = 0, max = Infinity) {
    let best = null;
    const scaleX = R * rad * Math.cos(point[1] * rad),
      scaleY = R * rad;
    const first = Math.max(0, lowerBound(leg.meters, min) - 1);
    const last = Math.min(leg.coords.length - 2, lowerBound(leg.meters, max, true) - 1);
    for (let i = first; i <= last; i++) {
      if (leg.meters[i + 1] < min || leg.meters[i] > max) continue;
      const a = leg.coords[i],
        b = leg.coords[i + 1];
      const ax = (a[0] - point[0]) * scaleX,
        ay = (a[1] - point[1]) * scaleY;
      const dx = (b[0] - a[0]) * scaleX,
        dy = (b[1] - a[1]) * scaleY;
      const length = leg.meters[i + 1] - leg.meters[i];
      const lo = length ? Math.max(0, (min - leg.meters[i]) / length) : 0;
      const hi = length ? Math.min(1, (max - leg.meters[i]) / length) : 1;
      const t = Math.max(
        lo,
        Math.min(hi, dx * dx + dy * dy ? -(ax * dx + ay * dy) / (dx * dx + dy * dy) : 0),
      );
      if (hi < lo) continue;
      const p = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
      const d = distance(point, p);
      if (!best || d < best.distance)
        best = {
          point: p,
          distance: d,
          index: i,
          t,
          along: leg.meters[i] + t * length,
          elapsed: leg.seconds[i] + t * (leg.seconds[i + 1] - leg.seconds[i]),
        };
    }
    return best;
  }
  function instruction(step) {
    const m = step.maneuver || {},
      road = typeof step.name === "string" && step.name ? " hacia " + step.name.slice(0, 200) : "";
    const directions = {
      left: "a la izquierda",
      right: "a la derecha",
      "slight left": "suavemente a la izquierda",
      "slight right": "suavemente a la derecha",
      "sharp left": "a la izquierda",
      "sharp right": "a la derecha",
      straight: "recto",
      uturn: "y cambia de sentido",
    };
    if (m.type === "arrive") return "Llegas a tu próxima parada";
    if (m.type === "roundabout" || m.type === "rotary")
      return "En la rotonda, toma la salida " + (m.exit || "indicada") + road;
    if (m.type === "exit roundabout" || m.type === "exit rotary") return "Sal de la rotonda" + road;
    if (m.type === "merge") return "Incorpórate " + (directions[m.modifier] || "") + road;
    if (m.type === "off ramp") return "Toma la salida " + (directions[m.modifier] || "") + road;
    if (m.type === "fork") return "Mantente " + (directions[m.modifier] || "en la vía") + road;
    if (m.type === "depart" || m.modifier === "straight") return "Continúa" + road;
    return "Gira " + (directions[m.modifier] || "según la vía") + road;
  }
  function decodePolyline(encoded, precision = 6) {
    if (typeof encoded !== "string" || encoded.length > 8 * 1024 * 1024)
      throw Error("Geometría comprimida inválida.");
    let cursor = 0,
      lat = 0,
      lng = 0;
    const points = [],
      factor = 10 ** precision;
    const value = () => {
      let result = 0,
        shift = 0,
        byte;
      do {
        if (cursor >= encoded.length || shift > 30) throw Error("Geometría comprimida incompleta.");
        byte = encoded.charCodeAt(cursor++) - 63;
        if (byte < 0 || byte > 63) throw Error("Geometría comprimida inválida.");
        result += (byte & 31) * 2 ** shift;
        shift += 5;
      } while (byte >= 32);
      return result % 2 ? -(result + 1) / 2 : result / 2;
    };
    while (cursor < encoded.length) {
      lat += value();
      lng += value();
      const point = [lng / factor, lat / factor];
      if (!validPoint(point) || points.length >= 100000)
        throw Error("Geometría comprimida fuera de rango.");
      points.push(point);
    }
    return points;
  }
  function parseRoute(data, expectedLegs) {
    const route = data?.routes?.[0];
    if (
      data?.code !== "Ok" ||
      !route?.legs?.length ||
      (expectedLegs && route.legs.length !== expectedLegs)
    ) {
      throw Error("No se encontró una ruta transitable por todas las paradas.");
    }
    return route.legs.map((raw) => {
      if (
        !Number.isFinite(raw.duration) ||
        raw.duration < 0 ||
        raw.duration > 30 * 86400 ||
        !Array.isArray(raw.steps) ||
        raw.steps.length > 20000
      )
        throw Error("Respuesta vial inválida.");
      const coords = [],
        steps = [];
      for (const step of raw.steps || []) {
        if (
          !step ||
          typeof step.maneuver?.type !== "string" ||
          (step.maneuver.modifier != null && typeof step.maneuver.modifier !== "string")
        )
          throw Error("Indicación vial inválida.");
        const line =
          typeof step.geometry === "string"
            ? decodePolyline(step.geometry)
            : step.geometry?.coordinates;
        if (!Array.isArray(line) || !line.length || line.length > 100000)
          throw Error("El servidor no entregó indicaciones de navegación válidas.");
        const tail = coords.at(-1),
          head = line[0];
        if (!validPoint(head)) throw Error("Geometría de ruta inválida.");
        const startIndex =
          tail && tail[0] === head[0] && tail[1] === head[1] ? coords.length - 1 : coords.length;
        for (const p of line) {
          if (!validPoint(p)) throw Error("Geometría de ruta inválida.");
          const prev = coords.at(-1);
          if (!prev || prev[0] !== p[0] || prev[1] !== p[1]) coords.push(p);
        }
        steps.push({
          point: line[0],
          startIndex,
          maneuver: step.maneuver,
          text: instruction(step),
        });
      }
      let durations = raw.annotation?.duration;
      if (
        durations != null &&
        (!Array.isArray(durations) ||
          durations.some((value) => !Number.isFinite(value) || value < 0))
      )
        throw Error("Anotaciones de duración inválidas.");
      // OSRM annotations and step geometries can differ at duplicate vertices.
      if (
        durations?.length !== coords.length - 1 ||
        (raw.duration > 0 && durations.reduce((sum, value) => sum + value, 0) === 0)
      ) {
        const lengths = coords.slice(1).map((p, i) => distance(coords[i], p));
        const total = lengths.reduce((a, b) => a + b, 0);
        durations = lengths.map((d) => (total ? (d / total) * raw.duration : 0));
      }
      // Las anotaciones OSRM no incluyen todas las penalizaciones de giro.
      // Distribuir esa diferencia conserva el ETA total informado por el motor.
      const annotatedTotal = durations.reduce((sum, seconds) => sum + seconds, 0);
      if (annotatedTotal > 0)
        durations = durations.map((seconds) => (seconds * raw.duration) / annotatedTotal);
      if (coords.length === 1) coords.push(coords[0].slice());
      const leg = makeLeg(coords, durations);
      // Cada maniobra ya identifica el inicio de su geometría: no buscarla
      // otra vez recorriendo todos los segmentos de la carretera.
      leg.steps = steps.map(({ startIndex, ...step }) => ({
        ...step,
        along: leg.meters[Math.min(startIndex, leg.meters.length - 1)],
      }));
      return leg;
    });
  }
  class Navigator {
    constructor(legs) {
      if (!legs?.length) throw Error("Faltan tramos de ruta.");
      this.original = legs;
      this.legs = legs.slice();
      this.index = 0;
      this.leg = legs[0];
      this.needsRoute = false;
      this.progress = 0;
      this.lastFix = null;
      this.lastGoodTime = 0;
      this.offCount = 0;
      this.offSince = 0;
      this.lastAttempt = -Infinity;
    }
    accept(fix, now = Date.now()) {
      if (
        !validPoint(fix?.point) ||
        !Number.isFinite(fix.accuracy) ||
        fix.accuracy < 0 ||
        fix.accuracy > 50
      )
        return { ignored: "precision" };
      if (
        !Number.isFinite(fix.timestamp) ||
        now - fix.timestamp > 15000 ||
        fix.timestamp > now + 5000 ||
        (this.lastFix && fix.timestamp <= this.lastFix.timestamp)
      )
        return { ignored: "antigua" };
      if (
        !fix.reacquired &&
        this.lastFix &&
        distance(fix.point, this.lastFix.point) >
          Math.max(200, ((fix.timestamp - this.lastFix.timestamp) / 1000) * 65)
      )
        return { ignored: "salto" };
      if (this.needsRoute) return { pending: true };
      const dt = this.lastFix ? (fix.timestamp - this.lastFix.timestamp) / 1000 : null;
      const pos = nearest(
        fix.point,
        this.leg,
        Math.max(0, this.progress - 60),
        dt === null || fix.reacquired ? Infinity : this.progress + Math.max(250, dt * 65),
      );
      this.lastFix = fix;
      this.lastGoodTime = now;
      const off = pos.distance > Math.max(45, fix.accuracy * 1.5);
      if (off) {
        this.offCount++;
        if (!this.offSince) this.offSince = now;
      } else {
        this.offCount = 0;
        this.offSince = 0;
        this.progress = Math.max(this.progress, pos.along);
      }
      const remaining = Math.max(0, this.leg.distance - pos.along);
      const arrive = remaining < 120 && distance(fix.point, this.leg.coords.at(-1)) < 100;
      const reroute =
        off && this.offCount >= 3 && now - this.offSince >= 4000 && now - this.lastAttempt >= 20000;
      const next =
        this.leg.steps.find((s) => s.along > this.progress + 15 && s.maneuver?.type !== "depart") ||
        this.leg.steps.at(-1);
      return {
        pos,
        off,
        arrive,
        reroute,
        remaining,
        next,
        turnDistance: Math.max(0, (next?.along || this.leg.distance) - this.progress),
        remainingSeconds: Math.max(0, this.leg.duration - pos.elapsed),
      };
    }
    beginReroute(now = Date.now()) {
      this.lastAttempt = now;
    }
    applyRemaining(legs) {
      if (
        !Array.isArray(legs) ||
        legs.length !== this.original.length - this.index ||
        legs.some(
          (l, i) =>
            !l?.coords?.length ||
            distance(l.coords.at(-1), this.original[this.index + i].coords.at(-1)) > 150,
        )
      ) {
        throw Error("El nuevo recorrido debe conservar todas las paradas pendientes en su orden.");
      }
      this.legs = this.legs.slice(0, this.index).concat(legs);
      this.leg = legs[0];
      this.needsRoute = false;
      this.progress = 0;
      this.offCount = 0;
      this.offSince = 0;
      this.lastFix = null;
    }
    nextLeg() {
      if (this.needsRoute || this.index >= this.original.length - 1) return false;
      this.index++;
      this.leg = null;
      this.needsRoute = true;
      this.progress = 0;
      this.offCount = 0;
      this.offSince = 0;
      this.lastFix = null;
      return true;
    }
  }
  // Tiempo incremental mínimo al insertar un lugar, conservando el orden existente.
  function bestInsertion(keys, candidate, duration) {
    let best = null;
    for (let i = 0; i < keys.length - 1; i++) {
      const before = duration(keys[i], keys[i + 1]),
        a = duration(keys[i], candidate),
        b = duration(candidate, keys[i + 1]);
      if (![before, a, b].every((n) => Number.isFinite(n) && n >= 0)) continue;
      const seconds = Math.max(0, a + b - before);
      if (!best || seconds < best.seconds) best = { index: i, seconds };
    }
    return best;
  }
  class LocationFilter {
    constructor() {
      this.last = null;
      this.gps = null;
      this.cluster = null;
    }
    accept(fix, now = Date.now()) {
      if (
        !validPoint(fix?.point) ||
        !Number.isFinite(fix.accuracy) ||
        fix.accuracy < 0 ||
        fix.accuracy > 100
      )
        return { ignored: "precision" };
      if (
        !Number.isFinite(fix.timestamp) ||
        now - fix.timestamp > 15000 ||
        fix.timestamp > now + 5000 ||
        (this.last && fix.timestamp <= this.last.timestamp)
      )
        return { ignored: "antigua" };
      if (
        fix.provider !== "gps" &&
        this.gps &&
        now - this.gps.timestamp < 8000 &&
        fix.accuracy > this.gps.accuracy * 1.5
      )
        return { ignored: "proveedor" };
      if (
        this.last &&
        now - this.last.timestamp < 8000 &&
        fix.accuracy > 50 &&
        fix.accuracy > this.last.accuracy * 1.5
      )
        return { ignored: "precision" };
      let reacquired = false;
      if (
        this.last &&
        distance(fix.point, this.last.point) >
          Math.max(200, ((fix.timestamp - this.last.timestamp) / 1000) * 65)
      ) {
        const c = this.cluster;
        if (
          !c ||
          distance(c.fix.point, fix.point) >
            Math.max(80, ((fix.timestamp - c.fix.timestamp) / 1000) * 45)
        )
          this.cluster = { fix, start: fix.timestamp, count: 1 };
        else {
          c.fix = fix;
          c.count++;
        }
        if (this.cluster.count < 3 || fix.timestamp - this.cluster.start < 2000)
          return { ignored: "salto" };
        reacquired = true;
      }
      this.cluster = null;
      this.last = { ...fix, reacquired };
      if (fix.provider === "gps") this.gps = this.last;
      return { fix: this.last };
    }
  }
  return {
    distance,
    validPoint,
    makeLeg,
    nearest,
    instruction,
    parseRoute,
    decodePolyline,
    Navigator,
    bestInsertion,
    LocationFilter,
  };
});
