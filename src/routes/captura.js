const router = require("express").Router();
const controller = require("../controllers/capturaController");

router.post("/componentes/cadastrar", controller.componente);
router.post("/metricas/cadastrarMetrica", controller.metrica);
router.get("/metricas/configuracoes/:servidor_id", controller.configuracoes);

module.exports = router;
