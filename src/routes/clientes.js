var express = require("express");
var router = express.Router();

var clientesController = require("../controllers/clientesController");

router.get("/buscarDadosBanco", function (req, res) {
    clientesController.buscarDadosBanco(req, res);
});

module.exports = router;
