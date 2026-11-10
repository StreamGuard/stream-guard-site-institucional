var express = require("express");
var router = express.Router();

var componenteController = require("../controllers/componenteController");
var sessao = require("../middleware/sessao");

router.post("/cadastrar", sessao.exigirSessao, function (req, res) {
    componenteController.criarComponente(req, res);
});

router.get("/", function (req, res) {
    componenteController.buscarComponentes(req, res);
});

module.exports = router;
