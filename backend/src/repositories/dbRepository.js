/**
 * Capa de Persistencia (Acceso a Datos)
 * Implementación SQLite con respaldo en disco.
 */

"use strict";

const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

// Ruta base del backend (un nivel arriba de src/repositories/)
const BACKEND_ROOT = path.resolve(__dirname, "..", "..");

class DatabaseRepository {
  constructor(dbPath = process.env.DB_PATH || "db/wooloo.db") {
    // Ruta absoluta al archivo db desde el directorio raíz del backend
    const fullPath = path.resolve(BACKEND_ROOT, dbPath);
    this.fullPath = fullPath;
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.ready = new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(fullPath, (err) => err ? reject(err) : resolve());
    }).then(() => this.initSchema());
  }

  async initSchema() {
    const schemaSql = fs.readFileSync(path.join(BACKEND_ROOT, "db", "schema.sql"), "utf-8");
    const seedSql = fs.readFileSync(path.join(BACKEND_ROOT, "db", "seed.sql"), "utf-8");

    const execute = (sql) => new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => err ? reject(err) : resolve());
    });
    await execute(schemaSql);
    const initialized = await new Promise((resolve, reject) => {
      this.db.get("PRAGMA user_version", (err, row) => err ? reject(err) : resolve(row.user_version));
    });
    if (initialized === 0) await execute(`BEGIN IMMEDIATE; ${seedSql}\n PRAGMA user_version = 1; COMMIT;`);
    console.log(`[Capa Datos] SQLite lista en: ${this.fullPath}`);
  }

  run(sql, params) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (error) {
        if (error) reject(error);
        else resolve(this.changes);
      });
    });
  }

  createLocation(place) {
    return this.run(
      "INSERT INTO catalog_locations (key, name, lat, lng, icon, description) VALUES (?, ?, ?, ?, ?, ?)",
      [place.key, place.name, place.lat, place.lng, place.icon, place.description],
    );
  }

  updateLocation(key, place) {
    return this.run(
      "UPDATE catalog_locations SET name = ?, lat = ?, lng = ?, icon = ?, description = ? WHERE key = ?",
      [place.name, place.lat, place.lng, place.icon, place.description, key],
    );
  }

  deleteLocation(key) {
    return this.run("DELETE FROM catalog_locations WHERE key = ?", [key]);
  }

  // --- RECURSO: CATALOGO DE UBICACIONES ---
  getAllLocations() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM catalog_locations ORDER BY name ASC", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getLocationByKey(key) {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT * FROM catalog_locations WHERE key = ?", [key], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  // --- RECURSO: VIAJES (TRIPS) ---
  getAllTrips() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT t.id, t.name, t.dest_key as destKey, t.departure_iso as departureISO,
               t.created_at as createdAt, t.updated_at as updatedAt,
               c.name as destName, c.icon as destIcon
        FROM trips t
        LEFT JOIN catalog_locations c ON t.dest_key = c.key
        ORDER BY t.created_at DESC
      `;
      this.db.all(sql, [], async (err, trips) => {
        if (err) return reject(err);
        try {
          for (let trip of trips) {
            trip.stops = await this.getTripStops(trip.id);
          }
          resolve(trips);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  getTripById(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT t.id, t.name, t.dest_key as destKey, t.departure_iso as departureISO,
               t.created_at as createdAt, t.updated_at as updatedAt,
               c.name as destName, c.icon as destIcon
        FROM trips t
        LEFT JOIN catalog_locations c ON t.dest_key = c.key
        WHERE t.id = ?
      `;
      this.db.get(sql, [id], async (err, trip) => {
        if (err) return reject(err);
        if (!trip) return resolve(null);
        try {
          trip.stops = await this.getTripStops(trip.id);
          resolve(trip);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  getTripStops(tripId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT s.stop_key as key, s.stay_min as stayMin, s.sequence_order as sequenceOrder,
               c.name, c.icon
        FROM stops s
        JOIN catalog_locations c ON s.stop_key = c.key
        WHERE s.trip_id = ?
        ORDER BY s.sequence_order ASC
      `;
      this.db.all(sql, [tripId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async writeTrip(trip, create) {
    const { id, name, destKey, departureISO, stops } = trip;
    const connection = await new Promise((resolve, reject) => {
      const writer = new sqlite3.Database(this.fullPath, (error) => error ? reject(error) : resolve(writer));
    });
    const run = (sql, params = []) => new Promise((resolve, reject) => {
      connection.run(sql, params, function (error) {
        if (error) reject(error);
        else resolve(this.changes);
      });
    });
    try {
      await run("PRAGMA foreign_keys = ON");
      await run("BEGIN IMMEDIATE");
      try {
        if (create) {
          await run("INSERT INTO trips (id, name, dest_key, departure_iso) VALUES (?, ?, ?, ?)",
            [id, name, destKey, departureISO]);
        } else {
          const changed = await run("UPDATE trips SET name = ?, dest_key = ?, departure_iso = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [name, destKey, departureISO, id]);
          if (!changed) {
            await run("ROLLBACK");
            return null;
          }
          await run("DELETE FROM stops WHERE trip_id = ?", [id]);
        }
        for (const [index, stop] of stops.entries()) {
          await run("INSERT INTO stops (trip_id, stop_key, stay_min, sequence_order) VALUES (?, ?, ?, ?)",
            [id, stop.key, stop.stayMin, index + 1]);
        }
        await run("COMMIT");
        return trip;
      } catch (error) {
        try { await run("ROLLBACK"); } catch (rollbackError) {
          console.error("No se pudo revertir la escritura:", rollbackError.message);
        }
        throw error;
      }
    } finally {
      await new Promise((resolve) => connection.close(resolve));
    }
  }

  createTrip(trip) {
    return this.writeTrip(trip, true);
  }

  updateTrip(id, trip) {
    return this.writeTrip({ id, ...trip }, false);
  }

  deleteTrip(id) {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM trips WHERE id = ?`, [id], function (err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }
}

module.exports = new DatabaseRepository();

