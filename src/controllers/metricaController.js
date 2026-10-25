var metricaModel = require("../models/metricaModel");

function responderErro(res, erro) {
    if (!erro.status) console.error("Erro ao processar métricas:", erro.code || erro.message);
    return res.status(erro.status || 500).json({ erro: erro.status ? erro.message : "Não foi possível processar as métricas." });
}

async function cadastrarMetrica(req, res) {
    const { componente_id, tipo, nome, unidade } = req.body;
    try {
        await metricaModel.cadastrarMetrica(componente_id, tipo, nome, unidade, req.session.usuario_id);
        return res.status(201).json({
            componente_id,
            tipo,
            nome,
            unidade
        });
    } catch (erro) {
        return responderErro(res, erro);
    }
}

function obterServidor(req) {
    const id = Number(req.params.servidor_id);
    return Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

async function buscarConfiguracoes(req, res) {
    const servidor_id = obterServidor(req);
    if (!servidor_id) {
        return res.status(400).json({
            erro: "O ID do servidor deve ser um inteiro positivo."
        });
    }
    try {
        return res.status(200).json(await metricaModel.buscarConfiguracoes(servidor_id));
    } catch (erro) {
        return responderErro(res, erro);
    }
}

async function atualizarConfiguracoes(req, res) {
    const servidor_id = obterServidor(req);
    if (!servidor_id) {
        return res.status(400).json({
            erro: "O ID do servidor deve ser um inteiro positivo."
        });
    }
    try {
        await metricaModel.atualizarConfiguracoes(servidor_id, req.body.configuracoes, req.session.usuario_id);
        return res.status(200).json({ mensagem: "Configurações salvas." });
    } catch (erro) {
        return responderErro(res, erro);
    }
}

module.exports = {
    cadastrarMetrica,
    buscarConfiguracoes,
    atualizarConfiguracoes
};
