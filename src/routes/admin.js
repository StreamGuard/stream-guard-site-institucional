var express = require("express");
var router = express.Router();

var adminController = require("../controllers/adminController");

router.get("/buscarDadosBanco", function (req, res) {
    adminController.buscarDadosBanco(req, res);
});

module.exports = router;
