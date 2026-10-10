var express = require("express");
var router = express.Router();
var path = require("path");

router.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, '../../public/main/index.html'));
});

// captura erro 404
router.use(function (req, res) {
   res.status(404).sendFile(path.join(__dirname, "../../public/main/404.html"));
});

module.exports = router;
