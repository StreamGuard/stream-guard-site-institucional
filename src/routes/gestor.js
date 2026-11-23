const express = require("express");

const router = express.Router();

const gestorController = require(
    "../controllers/gestorController"
);

// Consulta de tarifas públicas.
router.get(
    "/precos",
    gestorController.buscarPrecos
);

// Consulta dos dados operacionais por período.
router.get(
    "/resumo",
    gestorController.buscarResumo
);

// Cálculos financeiros e insights.
router.post(
    "/simular",
    gestorController.simular
);

module.exports = router;
