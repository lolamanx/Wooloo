/**
 * Formato de fechas, duraciones y texto de la interfaz.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

function ui(id) {
  return document.getElementById(id);
}

function escapeHtml(text) {
  return String(text).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

function shortPlaceName(name) {
  return name.replace(/\s*\((Inicio|Destino)\)/, "");
}

function formatClock(ms) {
  if (!Number.isFinite(ms)) return "Por calcular";
  const d = new Date(ms);
  // Formato 24 h: las pantallas ya agregan "hrs" y así no queda "a. m. hrs"
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

function formatDuration(totalMinutes) {
  if (!Number.isFinite(totalMinutes)) return "Por calcular";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")} min`;
}

function dayShift(fromMs, toMs) {
  const a = new Date(fromMs);
  const b = new Date(toMs);
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((db - da) / 86400000);
}

function clockWithDay(ms, baseMs) {
  const shift = dayShift(baseMs, ms);
  return shift > 0 ? `${formatClock(ms)} (+${shift})` : formatClock(ms);
}

function formatTripDate(ms) {
  const day = new Date(ms).toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${day} · ${formatClock(ms)} hrs`;
}

function departureCountdown(ms) {
  const diff = ms - Date.now();
  if (diff <= 0) return "Salida programada";
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return `Sale en ${days} ${days === 1 ? "día" : "días"}`;
  const hours = Math.round(diff / 3600000);
  if (hours >= 1) return `Sale en ${hours} h`;
  return `Sale en ${Math.max(1, Math.round(diff / 60000))} min`;
}

function formatMetricDuration(minutes) {
  const h = Math.floor(minutes / 60),
    m = minutes % 60;
  return h ? (m ? h + "h " + m + "min" : h + " h") : m + " min";
}

function updateClock() {
  const now = new Date();
  document.getElementById("liveClock").textContent = now.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
