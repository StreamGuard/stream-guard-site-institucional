var express = require("express");
var router = express.Router();

var servidorController = require("../controllers/servidorController");
var sessao = require("../middleware/sessao");

router.post("/cadastrar", sessao.exigirSessao, function (req, res) {
    servidorController.cadastrar(req, res);
});

module.exports = router;
