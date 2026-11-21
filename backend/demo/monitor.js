"use strict";

module.exports = function attachAndroidMonitor(app) {
  const history = [];
  let sequence = 0;

  app.get("/demo/android-requests", (req, res) => {
    res.set("Cache-Control", "no-store").json(history);
  });

  app.use("/api/trips", (req, res, next) => {
    if (req.get("X-Wooloo-Client") !== "android-demo") return next();
    const started = Date.now();
    const route = req.originalUrl;
    const sendJson = res.json;
    let response;
    res.json = function (body) {
      response = body;
      return sendJson.call(this, body);
    };
    res.once("finish", () => {
      history.unshift({
        id: ++sequence,
        time: new Date(started).toISOString(),
        method: req.method,
        route,
        status: res.statusCode,
        durationMs: Date.now() - started,
        request: req.body,
        response,
      });
      if (history.length > 30) history.pop();
    });
    next();
  });
};
