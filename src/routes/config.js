var express = require("express");
var router = express.Router();

var configController = require("../controllers/configController");

router.get("/funcionarios/:idEmpresa", function (req, res) {
    configController.listarFuncionarios(req, res);
});

router.get("/funcionario/:idUsuario", function (req, res) {
    configController.buscarFuncionario(req, res);
});

router.post("/funcionarios", function (req, res) {
    configController.cadastrarFuncionario(req, res);
});

router.put("/funcionarios/:idUsuario", function (req, res) {
    configController.editarFuncionario(req, res);
});

router.delete("/funcionarios/:idUsuario", function (req, res) {
    configController.excluirFuncionario(req, res);
});

module.exports = router;
