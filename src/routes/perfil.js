var express = require("express");
var router = express.Router();

var perfilController = require("../controllers/perfilController");

router.get("/:id", function (req, res) {
    perfilController.buscarPerfil(req, res);
});

router.put("/:id", function (req, res) {
    perfilController.atualizarPerfil(req, res);
});

router.put("/:id/senha", function (req, res) {
    perfilController.alterarSenha(req, res);
});

module.exports = router;