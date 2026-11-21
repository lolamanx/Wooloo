-- Datos iniciales (Seed) para Wooloo Hito 2

INSERT OR IGNORE INTO catalog_locations (key, name, lat, lng, icon, description) VALUES
('stgo', 'Santiago', -33.4489, -70.6693, '🏙️', 'Capital de Chile y punto de partida principal.'),
('valpo', 'Valparaíso', -33.0472, -71.6127, '⚓', 'Puerto principal y patrimonio cultural.'),
('osorno', 'Osorno (Destino)', -40.5738, -73.1339, '🏔️', 'Ciudad base para la zona lacustre sur.'),
('chillan', 'Chillán', -36.6066, -72.1034, '🥖', 'Cuna de O''Higgins y centro gastronómico.'),
('saltolaja', 'Salto del Laja (acceso)', -37.216958, -72.382481, '💦', 'Acceso vial próximo al Salto del Laja.'),
('losangeles', 'Los Ángeles', -37.4694, -72.3532, '🌲', 'Núcleo agrícola y comercial del Biobío.'),
('temuco', 'Temuco', -38.7359, -72.5904, '🏘️', 'Capital de La Araucanía.'),
('villarrica', 'Villarrica / Pucón', -39.2711, -71.9756, '🌋', 'Zona lacustre con vista al volcán activo.'),
('valdivia', 'Valdivia', -39.8142, -73.2459, '🌊', 'Ciudad de ríos navegables y cervecería.'),
('rupanco', 'Mirador Lago Rupanco', -40.783776, -72.689507, '📸', 'Mirador del lago con acceso por Ruta U-981-T.'),
('curico', 'Curicó (Tortas)', -34.9828, -71.2394, '🍰', 'Famoso por sus tortas y repostería tradicional.'),
('casablanca', 'Valle de Casablanca', -33.3167, -71.4064, '🍷', 'Valle vitivinícola de prestigio internacional.');

INSERT OR IGNORE INTO trips (id, name, dest_key, departure_iso) VALUES
('viaje-sur-2026', 'Vacaciones Sur de Chile', 'osorno', '2026-12-15T08:00:00.000Z'),
('escapada-fin-semana', 'Escapada a Valdivia', 'valdivia', '2026-11-25T09:30:00.000Z');

INSERT OR IGNORE INTO stops (trip_id, stop_key, stay_min, sequence_order) VALUES
('viaje-sur-2026', 'chillan', 45, 1),
('viaje-sur-2026', 'saltolaja', 30, 2),
('viaje-sur-2026', 'villarrica', 60, 3),
('escapada-fin-semana', 'temuco', 45, 1);
