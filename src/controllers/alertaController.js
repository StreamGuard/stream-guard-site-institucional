
var alertaModel = require("../models/alertaModel");

function validarChave(chave) {
    return /^[A-Z][A-Z0-9_]*-\d+$/.test(chave);
}

module.exports = {
    async listar(req, res) {
        try {
            var alertas = await alertaModel.listarAlertas();

            return res.status(200).json(alertas);

        } catch (erro) {
            console.error("Erro ao listar alertas do Jira:", erro);

            return res.status(erro.status || 500).json({
                mensagem: "Não foi possível buscar os alertas do Jira.",
                erro: erro.message
            });
        }
    },

    async buscar(req, res) {
        var chave = String(req.params.chave || "").trim();

        if (!validarChave(chave)) {
            return res.status(400).json({
                mensagem: "Chave do chamado inválida."
            });
        }

        try {
            var alerta = await alertaModel.buscarAlerta(chave);

            return res.status(200).json(alerta);

        } catch (erro) {
            console.error("Erro ao buscar alerta no Jira:", erro);

            return res.status(erro.status || 500).json({
                mensagem: "Não foi possível buscar o alerta.",
                erro: erro.message
            });
        }
    },

    async reconhecer(req, res) {
        var chave = String(req.params.chave || "").trim();

        if (!validarChave(chave)) {
            return res.status(400).json({
                mensagem: "Chave do chamado inválida."
            });
        }

        try {
            await alertaModel.reconhecerAlerta(chave);

            return res.status(200).json({
                mensagem: "Chamado concluído no Jira.",
                chave: chave
            });

        } catch (erro) {
            console.error("Erro ao reconhecer alerta no Jira:", erro);

            return res.status(erro.status || 500).json({
                mensagem: "Não foi possível concluir o chamado no Jira.",
                erro: erro.message
            });
        }
    }
};
