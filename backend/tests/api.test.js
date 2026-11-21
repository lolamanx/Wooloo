"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const path = require("node:path");
const test = require("node:test");

async function start(dbPath) {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DB_PATH: dbPath, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stderr.on("data", (chunk) => { logs += chunk; });
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("El servidor no inició: " + logs));
    }, 8000);
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Servidor detenido (${code}): ${logs}`));
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/Salud: (http:\/\/127\.0\.0\.1:\d+)\/health/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
  });
  return {
    async request(method, route, status, body) {
      const response = await fetch(base + route, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = await response.json();
      assert.equal(response.status, status, JSON.stringify(json));
      if (status >= 400) {
        assert.equal(json.success, false);
        assert.equal(json.error.code, status);
        assert.ok(json.error.message);
      }
      return { ...json, location: response.headers.get("location") };
    },
    async close() {
      if (child.exitCode !== null || child.signalCode !== null) return;
      const done = once(child, "exit");
      child.kill();
      await done;
    },
  };
}

test("CRUD de Viajes y Catálogo, errores y persistencia tras reiniciar", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "wooloo-hito2-"));
  const db = path.join(dir, "db.sqlite");
  let server;
  try {
    server = await start(db);
    const req = (...args) => server.request(...args);
    assert.ok((await req("GET", "/api/catalog", 200)).data.length);
    const place = { key: "mirador-demo", name: "Mirador ficticio", lat: -40.5, lng: -73, icon: "📍" };
    const placeUrl = "/api/catalog/mirador-demo";
    await req("POST", "/api/catalog", 400, { ...place, lat: 93 });
    assert.equal((await req("POST", "/api/catalog", 201, place)).location, placeUrl);
    await req("POST", "/api/catalog", 409, place);
    assert.equal((await req("GET", placeUrl, 200)).data.name, place.name);
    const updatedPlace = { ...place, name: "Mirador de prueba actualizado" };
    await req("PUT", placeUrl, 200, updatedPlace);
    const trip = { name: "Ruta al sur", destKey: place.key, departureISO: "2030-12-15T08:00:00.000Z", stops: [] };
    const created = await req("POST", "/api/trips", 201, trip);
    const tripUrl = created.location;
    await req("POST", "/api/trips", 409, { ...trip, id: created.data.id });
    await req("DELETE", placeUrl, 409);
    await req("PUT", tripUrl, 400, { ...trip, stops: [{ key: place.key, stayMin: 30 }] });
    assert.deepEqual((await req("GET", tripUrl, 200)).data.stops, []);
    await req("PUT", tripUrl, 200, { ...trip, stops: [{ key: "chillan", stayMin: 0 }] });
    assert.equal((await req("GET", tripUrl, 200)).data.stops[0].stayMin, 0);
    await req("DELETE", "/api/catalog/chillan", 409);
    await req("DELETE", "/api/catalog/casablanca", 200);
    await server.close();
    server = await start(db);
    assert.equal((await req("GET", placeUrl, 200)).data.name, updatedPlace.name);
    assert.equal((await req("GET", tripUrl, 200)).data.stops[0].key, "chillan");
    await req("GET", "/api/catalog/casablanca", 404);
    await req("DELETE", tripUrl, 200);
    await req("GET", tripUrl, 404);
    await req("DELETE", placeUrl, 200);
    await req("GET", placeUrl, 404);
    await req("GET", "/api/ruta-inexistente", 404);
  } finally {
    if (server) await server.close();
    await rm(dir, { recursive: true, force: true });
  }
});
