var express = require("express");
var router = express.Router();

var componenteController = require("../controllers/componenteController");

router.post("/", function (req, res) {
    componenteController.criarComponente(req, res);
});

router.get("/", function (req, res) {
    componenteController.buscarComponentes(req, res);
});

module.exports = router;