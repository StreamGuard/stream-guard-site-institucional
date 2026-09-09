var express = require("express");
var router = express.Router();

var metricaController = require("../controllers/metricaController");

router.post("/cadastrarMetrica", function (req, res) {
    metricaController.cadastrarMetrica(req, res);
});

module.exports = router;
