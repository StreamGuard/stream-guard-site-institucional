var analiseModel = require("../models/analiseModel");

function buscarMetricas(req, res) {
    analiseModel.buscarMetricas()
        .then(function (resultado) {
            res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.log("\nErro ao buscar as métricas da análise: ", erro.message);
            res.status(500).json(erro.message);
        });
}

function buscarProcessos(req, res) {
    analiseModel.buscarProcessos()
        .then(function (resultado) {
            res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.log("\nErro ao buscar os processos da análise: ", erro.message);
            res.status(500).json(erro.message);
        });
}

module.exports = {
    buscarMetricas,
    buscarProcessos
};
