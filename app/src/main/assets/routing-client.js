(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RoutingIO = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const cancelled = () =>
    Object.assign(new Error("Consulta reemplazada por una solicitud más reciente."), {
      code: "CANCELLED",
    });
  class RoutingClient {
    constructor(config, fetcher = (...args) => fetch(...args)) {
      this.config = config;
      this.fetcher = fetcher;
      this.queue = [];
      this.jobs = new Map();
      this.active = null;
      this.running = false;
      this.lastStart = -Infinity;
      this.blockedUntil = 0;
    }
    request(points, kind, params, { scope = "plan", priority = 10 } = {}) {
      let url;
      try {
        const base = new URL(this.config().routerBase);
        if (base.protocol !== "https:" || base.username || base.password)
          throw Error("Configura un servidor de rutas HTTPS válido.");
        if (
          !["route", "table"].includes(kind) ||
          !Array.isArray(points) ||
          points.length < 2 ||
          points.length > 30 ||
          !points.every(
            (p) =>
              Array.isArray(p) &&
              p.length === 2 &&
              p.every(Number.isFinite) &&
              Math.abs(p[0]) <= 180 &&
              Math.abs(p[1]) <= 90,
          )
        )
          throw Error("Puntos de ruta inválidos.");
        url = new URL(
          base.href.replace(/\/$/, "") +
            "/" +
            kind +
            "/v1/driving/" +
            points.map((p) => p.map((n) => n.toFixed(6)).join(",")).join(";"),
        );
        url.search = new URLSearchParams(params);
      } catch (error) {
        return Promise.reject(error);
      }
      const key = url.href;
      if (this.jobs.has(key)) return this.jobs.get(key).promise;
      let resolve, reject;
      const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
      });
      const job = {
        key,
        promise,
        resolve,
        reject,
        scope,
        priority,
        controller: new AbortController(),
        cancelled: false,
      };
      this.jobs.set(key, job);
      this.queue.push(job);
      // Los cálculos secundarios nunca retienen la navegación detrás de un timeout.
      if (this.active?.scope === "matrix" && priority > this.active.priority)
        this.cancelScope("matrix");
      this.pump();
      return promise;
    }
    cancelScope(scope) {
      for (const job of [...this.queue, this.active].filter(Boolean)) {
        if (job.scope !== scope || job.cancelled) continue;
        job.cancelled = true;
        job.controller.abort();
        job.reject(cancelled());
        if (this.jobs.get(job.key) === job) this.jobs.delete(job.key);
      }
      this.queue = this.queue.filter((job) => !job.cancelled);
    }
    async pump() {
      if (this.running) return;
      this.running = true;
      try {
        while (this.queue.length) {
          this.queue.sort((a, b) => b.priority - a.priority);
          const job = this.queue.shift();
          this.active = job;
          let timeout;
          try {
            if (this.blockedUntil > Date.now())
              throw Object.assign(
                new Error(
                  "El servidor limitó las solicitudes. Reintenta en " +
                    Math.ceil((this.blockedUntil - Date.now()) / 1000) +
                    " s.",
                ),
                { code: "RATE_LIMIT" },
              );
            const delay = Math.max(
              0,
              this.config().minRequestIntervalMs - (Date.now() - this.lastStart),
            );
            if (delay)
              await new Promise((resolve, reject) => {
                const abort = () => {
                  clearTimeout(timer);
                  reject(cancelled());
                };
                const timer = setTimeout(() => {
                  job.controller.signal.removeEventListener("abort", abort);
                  resolve();
                }, delay);
                job.controller.signal.addEventListener("abort", abort, { once: true });
                if (job.cancelled) abort();
              });
            if (job.cancelled) throw cancelled();
            this.lastStart = Date.now();
            timeout = setTimeout(() => job.controller.abort(), this.config().requestTimeoutMs);
            const response = await this.fetcher(job.key, {
              signal: job.controller.signal,
              credentials: "omit",
              referrerPolicy: "no-referrer",
            });
            if (!response.ok) {
              if (response.status === 429) {
                const value = response.headers.get("Retry-After");
                const seconds =
                  value && Number.isFinite(Number(value))
                    ? Number(value)
                    : (Date.parse(value) - Date.now()) / 1000;
                this.blockedUntil =
                  Date.now() +
                  Math.max(
                    1000,
                    Math.min(120000, Number.isFinite(seconds) ? seconds * 1000 : 20000),
                  );
              }
              throw Error(
                response.status === 429
                  ? "El servidor está ocupado. Espera antes de reintentar."
                  : "El servidor de rutas no está disponible (" + response.status + ").",
              );
            }
            const max = 8 * 1024 * 1024;
            if (Number(response.headers.get("Content-Length")) > max)
              throw Error("La respuesta vial excede el tamaño admitido.");
            let body = "";
            if (response.body?.getReader) {
              const reader = response.body.getReader(),
                decoder = new TextDecoder();
              let bytes = 0;
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                bytes += value.byteLength;
                if (bytes > max) {
                  await reader.cancel();
                  throw Error("La respuesta vial excede el tamaño admitido.");
                }
                body += decoder.decode(value, { stream: true });
              }
              body += decoder.decode();
            } else body = await response.text();
            if (body.length > 8 * 1024 * 1024)
              throw Error("La respuesta vial excede el tamaño admitido.");
            if (job.cancelled) throw cancelled();
            job.resolve(JSON.parse(body));
          } catch (error) {
            job.reject(
              job.cancelled
                ? cancelled()
                : error.name === "AbortError"
                  ? new Error("El cálculo tardó demasiado. Revisa tu conexión y reintenta.")
                  : error,
            );
          } finally {
            clearTimeout(timeout);
            if (this.jobs.get(job.key) === job) this.jobs.delete(job.key);
            this.active = null;
          }
        }
      } finally {
        this.running = false;
      }
    }
  }
  class PlanStore {
    constructor(indexedDB = globalThis.indexedDB) {
      this.db = null;
      this.ready = new Promise((resolve) => {
        if (!indexedDB) {
          resolve(null);
          return;
        }
        try {
          const request = indexedDB.open("rutaviajera-planning-v1", 1);
          const timer = setTimeout(() => resolve(null), 200);
          request.onupgradeneeded = () => {
            const store = request.result.createObjectStore("plans", { keyPath: "key" });
            store.createIndex("savedAt", "savedAt");
          };
          request.onsuccess = () => {
            clearTimeout(timer);
            this.db = request.result;
            this.db.onversionchange = () => {
              this.db?.close();
              this.db = null;
            };
            resolve(this.db);
          };
          request.onerror = request.onblocked = () => {
            clearTimeout(timer);
            resolve(null);
          };
        } catch {
          resolve(null);
        }
      });
    }
    async get(key, ttl) {
      const db = this.db || (await this.ready);
      if (!db) return null;
      return new Promise((resolve) => {
        try {
          const request = db.transaction("plans").objectStore("plans").get(key);
          request.onsuccess = () => {
            const row = request.result;
            resolve(
              row?.schema === 1 &&
                Number.isFinite(row.savedAt) &&
                Date.now() - row.savedAt >= 0 &&
                Date.now() - row.savedAt < ttl
                ? row.data
                : null,
            );
          };
          request.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }
    async put(key, data) {
      if (typeof key !== "string" || key.length > 2000) return;
      let bytes;
      try {
        bytes = new TextEncoder().encode(JSON.stringify(data)).byteLength;
      } catch {
        return;
      }
      if (bytes > 1024 * 1024) return;
      const db = this.db || (await this.ready);
      if (!db) return;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction("plans", "readwrite"),
            store = tx.objectStore("plans");
          store.put({ key, data, schema: 1, savedAt: Date.now() });
          let count = 0;
          store.index("savedAt").openCursor(null, "prev").onsuccess = (event) => {
            const cursor = event.target.result;
            if (!cursor) return;
            if (++count > 8) cursor.delete();
            cursor.continue();
          };
          tx.oncomplete = tx.onabort = tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
    async remove(key) {
      const db = this.db || (await this.ready);
      if (!db) return;
      try {
        db.transaction("plans", "readwrite").objectStore("plans").delete(key);
      } catch {}
    }
  }
  return { RoutingClient, PlanStore };
});
