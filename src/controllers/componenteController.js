var componenteModel = require("../models/componenteModel");

function criarComponente(req, res) {
    var { servidor_id, tipo, nome } = req.body;

    if (!Number.isSafeInteger(servidor_id) || servidor_id <= 0 || servidor_id > 2147483647 ||
        !["CPU", "RAM", "DISCO", "REDE"].includes(tipo) ||
        (nome !== undefined && nome !== null && (typeof nome !== "string" || !nome.trim() || nome.length > 100))) {
        return res.status(400).json({ erro: "servidor_id e tipo são obrigatórios" });
    }

    componenteModel.criarComponente(servidor_id, tipo, nome, req.session.usuario_id)
        .then(function (resultado) {
            res.status(201).json({
                mensagem: "Componente cadastrado com sucesso",
                tipo: tipo,
                nome: nome,
                id: resultado.insertId
            });
        })
        .catch(function (erro) {
            if (!erro.status) console.error("Erro ao cadastrar componente:", erro.code || "ERRO_INTERNO");

            res.status(erro.status || 500).json({
                erro: erro.status ? erro.message : "Erro ao cadastrar componente"
            });
        });
}

function buscarComponentes(req, res) {
    componenteModel.buscarComponentes()
        .then(function (resultado) {
            res.status(200).json({ mensagem: "Componente encontrado com sucesso", dados: resultado });
        })
        .catch(function (erro) {
            res.status(500).json({ erro: "Erro ao encontrar componente" });
        });
}

module.exports = {
    criarComponente,
    buscarComponentes
};
