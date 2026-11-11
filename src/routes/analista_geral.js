var express = require("express");
var router = express.Router();
var dashboardControler = require("../controllers/dashboard_analista_geralControler");

router.get("/metricas", dashboardControler.buscarMetricas);
router.get("processos",dashboardControler.buscarProcessos);

module.exports = router;