
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

    // Números do dashboard.
    // Ex.: GET /alerta/dashboard?periodo=7d&empresa=emp-atlas-media&servidor=srv-servidor1
    async dashboard(req, res) {
        var periodo = String(req.query.periodo || "24h");
        var empresa = req.query.empresa ? String(req.query.empresa) : "";
        var servidor = req.query.servidor ? String(req.query.servidor) : "";

        if (!alertaModel.periodoValido(periodo)) {
            return res.status(400).json({
                mensagem: "Período inválido. Use 24h, 7d ou 30d."
            });
        }

        // Só aceita o formato dos labels (evita montar um JQL com texto estranho)
        if (empresa && !/^emp-[a-z0-9-]+$/.test(empresa)) {
            return res.status(400).json({
                mensagem: "Empresa inválida. Use o label no formato emp-nome-da-empresa."
            });
        }

        if (servidor && !/^srv-[a-z0-9-]+$/.test(servidor)) {
            return res.status(400).json({
                mensagem: "Servidor inválido. Use o label no formato srv-nome."
            });
        }

        try {
            var dados = await alertaModel.obterDashboard(periodo, {
                empresa: empresa,
                servidor: servidor
            });

            return res.status(200).json(dados);

        } catch (erro) {
            console.error("Erro ao montar o dashboard de alertas:", erro);

            return res.status(erro.status || 500).json({
                mensagem: "Não foi possível montar o dashboard de alertas.",
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
