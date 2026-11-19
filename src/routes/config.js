var express = require("express");
var router = express.Router();

var configController = require("../controllers/configController");

// Rotas de Funcionários
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

// Rotas de Componentes
router.get("/componentes/:idEmpresa", function (req, res) {
    configController.listarComponentes(req, res);
});

router.post("/componentes", function (req, res) {
    configController.cadastrarComponente(req, res);
});

router.put("/componentes/:idVinculo", function (req, res) {
    configController.editarComponente(req, res);
});

router.delete("/componentes/:idVinculo", function (req, res) {
    configController.excluirComponente(req, res);
});

// Rotas de Métricas
router.get("/metricas/:idEmpresa", function (req, res) {
    configController.listarMetricas(req, res);
});

router.post("/metricas", function (req, res) {
    configController.cadastrarMetrica(req, res);
});

router.put("/metricas/salvar-todas", function (req, res) {
    configController.salvarTodasMetricas(req, res);
});

router.put("/metricas/:idMetrica", function (req, res) {
    configController.editarMetrica(req, res);
});

router.delete("/metricas/:idMetrica", function (req, res) {
    configController.excluirMetrica(req, res);
});

module.exports = router;