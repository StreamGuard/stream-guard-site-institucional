var metricaModel = require("../models/metricaModel");

function cadastrarMetrica(req, res) {
    var componente_id = req.body.componente_id;
    var tipo = req.body.tipo;
    var nome = req.body.nome;
    var unidade = req.body.unidadde;

    if (!componente_id) {
        res.status(400).send("Componente_id é obrigatório");
    } else if (!tipo || tipo.trim() === "") {
        res.status(400).send("Tipo é obrigatório!");
    } else if (!nome || nome.trim() === "") {
        res.status(400).send("Nome é obrigatório!");
    } else if (!unidade || unidade.trim() === "") {
        res.status(400).send("Unidade é obrigatório!");
    } else {
        metricaModel.cadastrarMetrica(componente_id,tipo,nome,unidade)
            .then(function (resultadoCadastrarMetrica) {
                let metricas = {
                    componente_id: resultadoCadastrarMetrica.componente_id,
                    tipo: resultadoCadastrarMetrica.tipo,
                    nome: resultadoCadastrarMetrica.nome,
                    unidade: resultadoCadastrarMetrica.unidade
                };

                console.log(`\nMétricas cadastradas: ${JSON.stringify(metricas)}`);
                res.status(201).json(metricas);
            })
            .catch(function (erro) {
                console.log(erro);
                console.log("\nHouve um erro ao cadastrar as metricas! Erro: ", erro.sqlMessage);
                res.status(500).json(erro.sqlMessage);
            });
    }
}

module.exports = {
    cadastrarMetrica,
};
