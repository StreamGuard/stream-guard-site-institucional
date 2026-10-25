var express = require("express");
var router = express.Router();

var metricaController = require("../controllers/metricaController");
var sessao = require("../middleware/sessao");

router.post("/cadastrarMetrica", function (req, res) {
    metricaController.cadastrarMetrica(req, res);
});

router.get(
    "/configuracoes/:servidor_id",
    sessao.informarCsrf,
    metricaController.buscarConfiguracoes
);

router.put("/configuracoes/:servidor_id", sessao.exigirSessao, metricaController.atualizarConfiguracoes);

module.exports = router;
