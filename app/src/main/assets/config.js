/* Sustituir por infraestructura propia o un proveedor OSM antes de producción.
 * Los servidores públicos son una configuración de evaluación, sin SLA.
 * No incluir claves privadas: cualquier asset de un APK es público. */
window.ROUTE_CONFIG = Object.freeze({
  routerBase: "https://router.project-osrm.org",
  tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  tileAttribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  minRequestIntervalMs: 1200,
  requestTimeoutMs: 20000,
});
