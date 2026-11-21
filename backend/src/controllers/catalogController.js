"use strict";

const router = require("express").Router();
const catalog = require("../services/catalogService");

function respond(handler) {
  return (req, res, next) => handler(req, res).catch(next);
}

router.get("/", respond(async (req, res) => {
  const data = await catalog.list();
  res.json({ success: true, count: data.length, data });
}));
router.get("/:key", respond(async (req, res) => {
  res.json({ success: true, data: await catalog.get(req.params.key) });
}));
router.post("/", respond(async (req, res) => {
  const data = await catalog.create(req.body);
  res.location(`/api/catalog/${data.key}`).status(201).json({ success: true, data });
}));
router.put("/:key", respond(async (req, res) => {
  res.json({ success: true, data: await catalog.update(req.params.key, req.body) });
}));
router.delete("/:key", respond(async (req, res) => {
  await catalog.remove(req.params.key);
  res.json({ success: true, message: "Ubicación eliminada." });
}));

module.exports = router;
