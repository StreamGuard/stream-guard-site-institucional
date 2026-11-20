// Importo o Express para criar as rotas.
var express = require("express");
var router = express.Router();

// Importo o controller da dashboard.
var dashboardControler = require("../controllers/dashboard_analista_geralControler");

// Quando chamada, busca os dados da dashboard.
router.get("/dashboard", dashboardControler.buscar);

// Disponibilizo as rotas para o app.
module.exports = router;