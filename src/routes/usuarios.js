var express = require("express");
var router = express.Router();

var usuarioController = require("../controllers/usuarioController");
var sessao = require("../middleware/sessao");

router.post("/cadastrar", function (req, res) {
  usuarioController.cadastrar(req, res);
});

router.post("/autenticar", sessao.validarOrigem, function (req, res) {
  usuarioController.autenticar(req, res);
});

router.post("/sair", sessao.exigirOrigem, usuarioController.sair);

module.exports = router;
