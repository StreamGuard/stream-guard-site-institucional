const model = require("../models/capturaModel");

function id(val) { return Number.isSafeInteger(Number(val)) && Number(val) > 0; }
function texto(val, limite) { return typeof val === "string" && val.trim().length > 0 && val.length <= limite; }
function falha(res, erro) {
    console.error("Falha na API de captura:", erro.code || erro.status || "erro");
    res.status(erro.status || 500).json({ mensagem: erro.status ? erro.message : "Erro ao registrar ou consultar a captura." });
}

async function componente(req, res) {
    const d = req.body;
    if (!id(d.empresa_id) || !id(d.servidor_id) || !Object.hasOwn(model.COMPONENTES, d.tipo) || !texto(d.nome, 100)) {
        return res.status(400).json({ mensagem: "Informe empresa, servidor, tipo e nome do componente válidos." });
    }
    try { res.status(201).json(await model.componente(d)); } catch (e) { falha(res, e); }
}

async function metrica(req, res) {
    const d = req.body;
    if (!id(d.empresa_id) || !id(d.servidor_id) || !id(d.componente_id) ||
        !Object.hasOwn(model.METRICAS, d.tipo) || !texto(d.nome, 255) || !texto(d.unidade, 20)) {
        return res.status(400).json({ mensagem: "Informe empresa, servidor, componente e métrica válidos." });
    }
    try { res.status(201).json(await model.metrica(d)); } catch (e) { falha(res, e); }
}

async function configuracoes(req, res) {
    if (!id(req.params.servidor_id) || !id(req.query.empresa_id)) {
        return res.status(400).json({ mensagem: "Informe servidor e empresa válidos." });
    }
    try { res.json(await model.configuracoes(Number(req.params.servidor_id), Number(req.query.empresa_id))); }
    catch (e) { falha(res, e); }
}

module.exports = { componente, metrica, configuracoes };
