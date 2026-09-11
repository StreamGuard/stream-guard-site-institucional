var express = require("express");
var router = express.Router();

var empresaController = require("../controllers/empresaController");

router.post("/cadastrar", function (req, res) {
    empresaController.cadastrar(req, res);
});

router.get("/obterCodigo/:idEmpresa", function(req,res){
    empresaController.verificarCodigoEmpresa(req,res);
})

module.exports = router;