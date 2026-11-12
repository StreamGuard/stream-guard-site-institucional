var express = require("express");
var router = express.Router();

var clientesController = require("../controllers/clientesController");

router.get("/buscarDadosBanco/:IdEmpresa", function (req, res) {
    clientesController.BuscarDadosBanco(req, res);
});

module.exports = router;
