"use strict";

const db = require("../repositories/dbRepository");

function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}

function validate(body) {
  const { name, lat, lng, icon, description = null } = body || {};
  if (typeof name !== "string" || !name.trim() || name.length > 120 ||
      !Number.isFinite(lat) || Math.abs(lat) > 90 ||
      !Number.isFinite(lng) || Math.abs(lng) > 180 ||
      typeof icon !== "string" || !icon.trim() || icon.length > 16 ||
      (description !== null && (typeof description !== "string" || description.length > 500))) {
    fail(400, "Ingresa un nombre, coordenadas válidas, un icono y una descripción opcional.");
  }
  return { name: name.trim(), lat, lng, icon, description };
}

async function get(key) {
  const place = await db.getLocationByKey(key);
  if (!place) fail(404, "La ubicación no existe.");
  return place;
}

async function create(body) {
  const key = body?.key;
  if (typeof key !== "string" || !/^[a-z0-9][a-z0-9-]{0,49}$/.test(key)) {
    fail(400, "La clave debe tener hasta 50 caracteres: letras minúsculas, números y guiones.");
  }
  const place = { key, ...validate(body) };
  try {
    await db.createLocation(place);
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT") fail(409, "La clave de ubicación ya existe.");
    throw error;
  }
  return place;
}

async function update(key, body) {
  if (body?.key !== undefined && body.key !== key) fail(400, "La clave de ubicación es inmutable.");
  const place = validate(body);
  if (!(await db.updateLocation(key, place))) fail(404, "La ubicación no existe.");
  return { key, ...place };
}

async function remove(key) {
  try {
    if (!(await db.deleteLocation(key))) fail(404, "La ubicación no existe.");
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT") {
      fail(409, "La ubicación está asociada a un viaje o una parada.");
    }
    throw error;
  }
}

module.exports = { list: () => db.getAllLocations(), get, create, update, remove };
