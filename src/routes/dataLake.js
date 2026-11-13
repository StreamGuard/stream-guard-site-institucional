var express = require("express");
var router = express.Router();

var dataLakeController = require("../controllers/dataLakeController");

router.get("/buscarDadosETL", function (req, res) {
    dataLakeController.buscarDadosETL(req, res);
});

module.exports = router;
