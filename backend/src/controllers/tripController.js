/**
 * Capa de Controladores (Ruteo HTTP y Manejo de Peticiones)
 * Implementa la API REST para los recursos 'trips' y 'catalog'.
 */

"use strict";

const tripService = require("../services/tripService");

class TripController {
  async getTrips(req, res, next) {
    try {
      const trips = await tripService.getAllTrips();
      res.status(200).json({
        success: true,
        count: trips.length,
        data: trips,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTrip(req, res, next) {
    try {
      const trip = await tripService.getTripById(req.params.id);
      res.status(200).json({
        success: true,
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }

  async createTrip(req, res, next) {
    try {
      const newTrip = await tripService.createTrip(req.body);
      res.location(`/api/trips/${newTrip.id}`).status(201).json({
        success: true,
        message: "Viaje creado exitosamente.",
        data: newTrip,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTrip(req, res, next) {
    try {
      const updated = await tripService.updateTrip(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: "Viaje actualizado exitosamente.",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTrip(req, res, next) {
    try {
      await tripService.deleteTrip(req.params.id);
      res.status(200).json({
        success: true,
        message: "Viaje eliminado exitosamente.",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TripController();
