"use strict";

process.env.DB_PATH = "db/wooloo-demo.db";
process.env.PORT = process.env.PORT || "43101";
process.argv.push("--demo");
require("../server");
