"use strict";

const { randomUUID } = require("node:crypto");
const db = require("../repositories/dbRepository");

function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}

class TripService {
  getAllTrips() {
    return db.getAllTrips();
  }

  async getTripById(id) {
    const trip = await db.getTripById(id);
    if (!trip) fail(404, "El viaje no existe.");
    return trip;
  }

  async createTrip(body) {
    const trip = await this.validateTripData({ departureISO: new Date().toISOString(), ...body });
    const id = body?.id ?? `trip-${randomUUID()}`;
    if (typeof id !== "string" || !/^[a-zA-Z0-9-]{1,85}$/.test(id)) {
      fail(400, "El ID debe tener hasta 85 letras, números o guiones.");
    }
    try {
      return await db.createTrip({ id, ...trip });
    } catch (error) {
      if (error.message?.includes("UNIQUE constraint failed: trips.id")) fail(409, "El ID de viaje ya existe.");
      if (error.code === "SQLITE_CONSTRAINT") fail(409, "El destino o una parada ya no está disponible.");
      throw error;
    }
  }

  async updateTrip(id, body) {
    await this.getTripById(id);
    const trip = await this.validateTripData(body);
    try {
      const updated = await db.updateTrip(id, trip);
      if (!updated) fail(404, "El viaje no existe.");
      return updated;
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT") fail(409, "El destino o una parada ya no está disponible.");
      throw error;
    }
  }

  async deleteTrip(id) {
    if (!(await db.deleteTrip(id))) fail(404, "El viaje no existe.");
  }

  async validateTripData(body) {
    const { name, destKey, departureISO, stops = [] } = body || {};
    if (typeof name !== "string" || !name.trim() || name.length > 120) {
      fail(400, "El nombre del viaje debe tener entre 1 y 120 caracteres.");
    }
    if (typeof destKey !== "string" || !(await db.getLocationByKey(destKey))) {
      fail(400, "Selecciona un destino válido del catálogo.");
    }
    if (typeof departureISO !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(departureISO) ||
        !Number.isFinite(Date.parse(departureISO))) {
      fail(400, "Indica una fecha y hora ISO 8601 con zona horaria.");
    }
    if (!Array.isArray(stops) || stops.length > 10) fail(400, "Envía un arreglo de hasta 10 paradas.");
    const seen = new Set([destKey]);
    const validatedStops = [];
    for (const stop of stops) {
      const { key, stayMin = 30 } = stop || {};
      if (typeof key !== "string" || seen.has(key) || !Number.isInteger(stayMin) ||
          stayMin < 0 || stayMin > 1440 || !(await db.getLocationByKey(key))) {
        fail(400, "Cada parada requiere una ubicación distinta del destino, sin repeticiones, y 0 a 1440 minutos.");
      }
      seen.add(key);
      validatedStops.push({ key, stayMin });
    }
    return { name: name.trim(), destKey, departureISO, stops: validatedStops };
  }
}

module.exports = new TripService();
