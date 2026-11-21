-- Script de creación de base de datos SQLite - Hito 2 Wooloo
-- Arquitectura de Persistencia

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS catalog_locations (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    icon TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dest_key TEXT NOT NULL,
    departure_iso TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dest_key) REFERENCES catalog_locations(key)
);

CREATE TABLE IF NOT EXISTS stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id TEXT NOT NULL,
    stop_key TEXT NOT NULL,
    stay_min INTEGER NOT NULL DEFAULT 30,
    sequence_order INTEGER NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (stop_key) REFERENCES catalog_locations(key)
);

CREATE INDEX IF NOT EXISTS idx_trips_dest ON trips(dest_key);
CREATE INDEX IF NOT EXISTS idx_stops_trip ON stops(trip_id);
