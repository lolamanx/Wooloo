"use strict";

const list = document.getElementById("http");
const status = document.getElementById("status");
let snapshot;

function makeEntry(entry, open) {
  const item = document.createElement("li");
  const details = document.createElement("details");
  details.open = open;
  details.dataset.id = entry.id;
  const summary = document.createElement("summary");
  const time = new Date(entry.time).toLocaleTimeString("es-CL");
  summary.textContent = `${entry.method} ${entry.route} · HTTP ${entry.status} · ${entry.durationMs} ms · ${time}`;
  details.append(summary);
  for (const [label, payload] of [["JSON enviado", entry.request], ["JSON recibido", entry.response]]) {
    if (payload === undefined) continue;
    const title = document.createElement("p");
    const body = document.createElement("pre");
    title.textContent = label;
    body.textContent = JSON.stringify(payload, null, 2);
    details.append(title, body);
  }
  item.append(details);
  return item;
}

async function refresh() {
  try {
    const response = await fetch("android-requests", { cache: "no-store" });
    if (!response.ok) throw new Error("Monitor no disponible");
    const entries = await response.json();
    const updated = JSON.stringify(entries);
    if (updated !== snapshot) {
      const open = new Set(Array.from(list.querySelectorAll("details[open]"), (el) => el.dataset.id));
      const lastId = list.querySelector("details")?.dataset.id;
      if (entries[0] && String(entries[0].id) !== lastId) {
        open.delete(lastId);
        open.add(String(entries[0].id));
      }
      list.replaceChildren(...entries.map((entry) => makeEntry(entry, open.has(String(entry.id)))));
      snapshot = updated;
    }
    status.textContent = entries.length ? "Conectado · solicitudes más recientes primero" : "Conectado · esperando solicitudes de Android";
  } catch {
    status.textContent = "Reconectando al servidor…";
  } finally {
    setTimeout(refresh, 750);
  }
}

refresh();
