/**
 * Servidor Principal - Backend REST API (Hito 2)
 * Wooloo · INGT1003 Universidad Mayor
 */

"use strict";

const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const tripController = require("./src/controllers/tripController");

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const demoMode = process.argv.includes("--demo");
if (demoMode) app.use("/demo", express.static(path.join(__dirname, "demo", "public")));

// Middlewares globales
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "1mb" }));

if (demoMode) require("./demo/monitor")(app);

// Ruta de estado del servidor
app.get("/health", (req, res, next) => {
  res.status(200).json({
    status: "OK",
    service: "Wooloo Backend API",
    version: "0.10.0",
    timestamp: new Date().toISOString(),
  });
});

// --- API REST ROUTES ---

// 1. Recurso Catálogo de Ubicaciones
app.use("/api/catalog", require("./src/controllers/catalogController"));

// 2. Recurso Viajes (CRUD completo)
app.get("/api/trips", (req, res, next) => tripController.getTrips(req, res, next));
app.get("/api/trips/:id", (req, res, next) => tripController.getTrip(req, res, next));
app.post("/api/trips", (req, res, next) => tripController.createTrip(req, res, next));
app.put("/api/trips/:id", (req, res, next) => tripController.updateTrip(req, res, next));
app.delete("/api/trips/:id", (req, res, next) => tripController.deleteTrip(req, res, next));

app.use((req, res, next) => next(Object.assign(new Error("La ruta solicitada no existe."), { status: 404 })));
// Middleware de manejo centralizado de errores (Evita devolver 200 en errores)
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.message}`, err.stack);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      code: status,
      message: status >= 500 ? "Error interno en el servidor." : err.message,
    },
  });
});

// Iniciar servidor
require("./src/repositories/dbRepository").ready.then(() => {
  const server = app.listen(PORT, "127.0.0.1", () => {
    const base = `http://127.0.0.1:${server.address().port}`;
    console.log(`Salud: ${base}/health`);
    if (demoMode) {
      console.log(`App web: ${base}/demo/`);
      console.log(`Monitor Android: ${base}/demo/android.html`);
    }
  });
}).catch((error) => {
  console.error("No se pudo inicializar la base de datos:", error.message);
  process.exitCode = 1;
});

module.exports = app;
