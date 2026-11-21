/**
 * Catálogo público y títulos de pantallas.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

const LOCATIONS = {
  stgo: { name: "Santiago", lat: -33.4489, lng: -70.6693, icon: "🏙️" },
  valpo: { name: "Valparaíso", lat: -33.0472, lng: -71.6127, icon: "⚓" },
  osorno: { name: "Osorno (Destino)", lat: -40.5738, lng: -73.1339, icon: "🏔️" },
  chillan: { name: "Chillán", lat: -36.6066, lng: -72.1034, icon: "🥖" },
  saltolaja: { name: "Salto del Laja (acceso)", lat: -37.216958, lng: -72.382481, icon: "💦" },
  losangeles: { name: "Los Ángeles", lat: -37.4694, lng: -72.3532, icon: "🌲" },
  temuco: { name: "Temuco", lat: -38.7359, lng: -72.5904, icon: "🏘️" },
  villarrica: { name: "Villarrica / Pucón", lat: -39.2711, lng: -71.9756, icon: "🌋" },
  valdivia: { name: "Valdivia", lat: -39.8142, lng: -73.2459, icon: "🌊" },
  rupanco: { name: "Mirador Lago Rupanco", lat: -40.783776, lng: -72.689507, icon: "📸" },
  curico: { name: "Curicó (Tortas)", lat: -34.9828, lng: -71.2394, icon: "🍰" },
  casablanca: { name: "Valle de Casablanca", lat: -33.3167, lng: -71.4064, icon: "🍷" },
};

const DESCRIPTIONS = {
  chillan:
    "Cuna de Bernardo O'Higgins y famosa por sus cecinas artesanales, mercado central y artesanía de greda.",
  saltolaja:
    "Acceso vial próximo al Salto del Laja. La visita a la cascada continúa a pie por los accesos habilitados.",
  losangeles: "Núcleo agrícola y comercial del Biobío con fácil conectividad para descanso rápido.",
  temuco:
    "Capital de La Araucanía. Destaca su mercado municipal y oferta gastronómica tradicional mapuche.",
  villarrica:
    "Zona lacustre con vista directa al volcán activo Villarrica, bosques de coigüe y paseos costeros.",
  valdivia:
    "Hermosa ciudad de ríos navegables, torreones hispánicos históricos y fábricas de cerveza artesanal.",
  rupanco:
    "Mirador del lago en el sector Rahue Rupanco, con acceso por la Ruta U-981-T y estacionamiento.",
  casablanca:
    "Valle vitivinícola a medio camino entre Santiago y la costa, famoso por sus viñas y vinos blancos.",
  curico:
    "Tradicional detención al sur de Santiago, ideal para abastecerse de dulces típicos y pastelería chilena.",
};

const SUGGESTED_STOPS = [
  "curico",
  "chillan",
  "saltolaja",
  "temuco",
  "villarrica",
  "valdivia",
  "rupanco",
  "casablanca",
  "losangeles",
];

const POPULAR_DESTINATIONS = ["temuco", "villarrica", "valdivia", "osorno"];

const SCREEN_TITLES = {
  trips: "Mis Viajes Guardados",
  newtrip: "Crear Nuevo Viaje",
  stops: "Configurar Paradas",
  itinerary: "Mapa del recorrido",
  detail: "Información de Parada",
  live: "Modo Navegación Activa",
};
