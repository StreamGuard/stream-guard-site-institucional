
var express = require("express");
var router = express.Router();

var alertaController = require("../controllers/alertaController");

// Lista todos os alertas
router.get("/", alertaController.listar);

// Números do dashboard (precisa vir ANTES de "/:chave", senão "dashboard" vira uma chave)
router.get("/dashboard", alertaController.dashboard);

// Busca um alerta específico
router.get("/:chave", alertaController.buscar);

// Reconhece um alerta
router.put("/:chave/reconhecer", alertaController.reconhecer);

module.exports = router;
