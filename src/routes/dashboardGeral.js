var express = require("express");
var router = express.Router();

var dashboardGeralController = require("../controllers/dashboardGeralController");

router.get("/", function (req, res) {
    dashboardGeralController.buscar(req, res);
});

module.exports = router;
