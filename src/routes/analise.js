var express = require("express");
var router = express.Router();

var analiseController = require("../controllers/analiseController");

router.get("/metricas", function (req, res) {
    analiseController.buscarMetricas(req, res);
});

router.get("/processos", function (req, res) {
    analiseController.buscarProcessos(req, res);
});

module.exports = router;
