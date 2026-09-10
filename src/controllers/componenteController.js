var componenteModel = require("../models/componenteModel");

function criarComponente(req, res) {
    var { servidor_id, tipo, nome } = req.body;

    if (!servidor_id || !tipo) {
        return res.status(400).json({ erro: "servidor_id e tipo são obrigatórios" });
    }

    componenteModel.criarComponente(servidor_id, tipo, nome)
        .then(function (resultado) {
            res.status(201).json({
                mensagem: "Componente cadastrado com sucesso",
                tipo: tipo,
                nome: nome,
                id: resultado.insertId
            });
        })
        .catch(function (erro) {
            res.status(500).json({ erro: "Erro ao cadastrar componente", detalhes: erro });
        });
}

function buscarComponentes(req, res) {
    componenteModel.buscarComponentes()
        .then(function (resultado) {
            res.status(200).json({ mensagem: "Componente encontrado com sucesso", dados: resultado });
        })
        .catch(function (erro) {
            res.status(500).json({ erro: "Erro ao encontrar componente", detalhes: erro });
        });
}

module.exports = {
    criarComponente,
    buscarComponentes
};
