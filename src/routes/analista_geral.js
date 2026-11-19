var express = require("express");
var router = express.Router();
var dashboardControler = require("../controllers/dashboard_analista_geralControler");

router.get("/dashboard",dashboardControler.buscar);

module.exports = router;