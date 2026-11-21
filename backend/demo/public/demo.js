"use strict";

const byId = (id) => document.getElementById(id);
const form = byId("trip");
const destination = byId("destination");
const nameInput = byId("name");
let activeTrip = null;
let deletedId = null;
let busy = false;
let verified = false;

function render() {
  byId("create").disabled = busy || !!activeTrip || !destination.options.length;
  for (const id of ["read", "update", "remove"]) byId(id).disabled = busy || !activeTrip;
  byId("check").disabled = busy || !deletedId;
  byId("guide").textContent = activeTrip
    ? (verified ? "Puedes comprobar el dato guardado, editar el viaje o borrarlo." : "Consulta el viaje para verificar el dato guardado.")
    : (deletedId ? "Comprueba el borrado para ver la respuesta 404." : "Crea un viaje para comenzar.");
}

function log(method, route, status, request, response) {
  const item = document.createElement("li");
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = `${method} ${route} · ${status}`;
  details.append(summary);
  for (const [title, value] of [["Cuerpo enviado", request], ["Cuerpo recibido", response]]) {
    if (value === undefined) continue;
    const label = document.createElement("p");
    label.textContent = title;
    const body = document.createElement("pre");
    body.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    details.append(label, body);
  }
  const previous = byId("http").querySelector("details[open]");
  if (previous) previous.open = false;
  details.open = true;
  item.append(details);
  byId("http").prepend(item);
}

async function request(method, route, payload, expected = 200) {
  let response;
  try {
    response = await fetch(route, {
      method,
      headers: payload === undefined ? {} : { "Content-Type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (error) {
    log(method, route, "Sin respuesta", payload, error.message);
    throw new Error("No se pudo conectar con el servidor.");
  }
  const raw = await response.text();
  let result = raw;
  try { result = JSON.parse(raw); } catch { /* Conserva las respuestas que no son JSON. */ }
  log(method, route, response.status, payload, result);
  if (response.status !== expected) throw new Error(result?.error?.message || `Respuesta HTTP ${response.status}`);
  return result.data;
}

async function run(action) {
  if (busy) return;
  busy = true;
  render();
  byId("status").textContent = "Consultando al servidor…";
  try {
    byId("status").textContent = await action();
  } catch (error) {
    byId("status").textContent = error.message;
  } finally {
    busy = false;
    render();
  }
}

const tripRoute = (id) => `/api/trips/${encodeURIComponent(id)}`;

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const updating = !!activeTrip;
  if (updating && event.submitter?.value !== "update") return;
  run(async () => {
    const payload = {
      name: nameInput.value.trim(),
      destKey: destination.value,
      departureISO: activeTrip?.departureISO || new Date(Date.now() + 86400000).toISOString(),
      stops: activeTrip?.stops || [],
    };
    activeTrip = updating
      ? await request("PUT", tripRoute(activeTrip.id), payload)
      : await request("POST", "/api/trips", payload, 201);
    deletedId = null;
    verified = false;
    return `Viaje ${updating ? "actualizado" : "creado"} · ID ${activeTrip.id}`;
  });
});

byId("read").addEventListener("click", () => run(async () => {
  activeTrip = await request("GET", tripRoute(activeTrip.id));
  nameInput.value = activeTrip.name;
  destination.value = activeTrip.destKey;
  verified = true;
  return `Dato guardado: ${activeTrip.name}`;
}));

byId("remove").addEventListener("click", () => run(async () => {
  const id = activeTrip.id;
  await request("DELETE", tripRoute(id));
  deletedId = id;
  activeTrip = null;
  return `Viaje borrado · ID ${id}`;
}));

byId("check").addEventListener("click", () => run(async () => {
  await request("GET", tripRoute(deletedId), undefined, 404);
  return "Borrado confirmado. El servidor respondió HTTP 404.";
}));

run(async () => {
  const catalog = await request("GET", "/api/catalog");
  for (const place of catalog) destination.add(new Option(place.name, place.key));
  if (catalog.some((place) => place.key === "osorno")) destination.value = "osorno";
  return "Catálogo cargado desde el servidor.";
});
