
var express = require("express");
var router = express.Router();

var alertaController = require("../controllers/alertaController");

// Lista todos os alertas
router.get("/", alertaController.listar);

// Busca um alerta específico
router.get("/:chave", alertaController.buscar);

// Reconhece um alerta
router.put("/:chave/reconhecer", alertaController.reconhecer);

module.exports = router;
