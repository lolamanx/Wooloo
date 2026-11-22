/**
 * Formulario de creación del viaje.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

let tripFormSaving = false;
let tripDraftId = null;

function clearTripFormError() {
  ui("formError").hidden = true;
  for (const id of ["tripNameInput", "tripDestSelect", "tripDateInput"]) {
    ui(id).removeAttribute("aria-invalid");
    ui(id).removeAttribute("aria-describedby");
  }
}

function showTripFormError(message, field) {
  ui("formError").textContent = message;
  ui("formError").hidden = false;
  if (field) {
    ui(field).setAttribute("aria-invalid", "true");
    ui(field).setAttribute("aria-describedby", "formError");
    ui(field).focus();
  }
}

function setTripFormSaving(saving) {
  tripFormSaving = saving;
  ui("tripSaveStatus").textContent = saving ? "Guardando tu viaje…" : "";
  ui("tripSaveStatus").hidden = !saving;
  for (const id of [
    "tripNameInput",
    "tripDestSelect",
    "tripDateInput",
    "saveTripButton",
    "mobileBackBtn",
  ]) {
    ui(id).disabled = saving;
  }
}

function renderNewTripForm() {
  clearTripFormError();
  setTripFormSaving(false);
  tripDraftId = null;
  ui("tripNameInput").value = "";
  const destSelect = document.getElementById("tripDestSelect");
  destSelect.innerHTML = "";

  Object.keys(LOCATIONS).forEach((k) => {
    const opt2 = new Option(LOCATIONS[k].name, k);
    destSelect.add(opt2);
  });

  destSelect.value = "osorno";

  // Si el usuario llegó tocando un destino popular del inicio, se preselecciona
  if (pendingDestKey) {
    destSelect.value = pendingDestKey;
    document.getElementById("tripNameInput").value =
      "Viaje a " + shortPlaceName(LOCATIONS[pendingDestKey].name);
    pendingDestKey = null;
  }

  const dateInput = document.getElementById("tripDateInput");
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 3);
  defaultDate.setHours(9, 0, 0, 0);
  // Hora local (toISOString devolvía UTC y el formulario mostraba 12:00 en vez de 09:00)
  const pad = (n) => String(n).padStart(2, "0");
  dateInput.value = `${defaultDate.getFullYear()}-${pad(defaultDate.getMonth() + 1)}-${pad(defaultDate.getDate())}T${pad(defaultDate.getHours())}:${pad(defaultDate.getMinutes())}`;
}
