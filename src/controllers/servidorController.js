var servidorModel = require("../models/servidorModel");

async function cadastrar(req, res) {
    const { empresa_id, codigo_agente, hostname, sistema_operacional, versao_so, arquitetura } = req.body;
    const codigos = req.body.codigos_anteriores === undefined ? [] : req.body.codigos_anteriores;
    const campos = [[codigo_agente, 64], [hostname, 100], [sistema_operacional, 100], [versao_so, 100], [arquitetura, 50]];
    if (campos.some(([valor, maximo]) => typeof valor !== "string" || !valor.trim() || valor.length > maximo) ||
        (empresa_id !== undefined && (!Number.isSafeInteger(empresa_id) || empresa_id <= 0)) ||
        !Array.isArray(codigos) || codigos.length > 2 ||
        codigos.some(valor => typeof valor !== "string" || !valor.trim() || valor.length > 64)) {
        return res.status(400).json({ erro: "Dados do servidor inválidos." });
    }
    try {
        const resultado = await servidorModel.cadastrar(empresa_id, codigo_agente, hostname, sistema_operacional, versao_so, arquitetura, req.session.usuario_id, codigos);
        const servidor = resultado.servidor;
        return res.status(201).json({
            id: resultado.insertId,
            empresa_id: servidor.fk_equipamento,
            codigo_agente: servidor.codigo_agente,
            hostname: servidor.hostname,
            sistema_operacional: servidor.sistema_operacional,
            versao_so: servidor.versao_so,
            arquitetura: servidor.arquitetura,
            ultimo_health_check: null
        });
    } catch (erro) {
        if (!erro.status) console.error("Erro ao cadastrar servidor:", erro.code || "ERRO_INTERNO");
        return res.status(erro.status || (erro.code === "ER_DUP_ENTRY" ? 409 : 500)).json({
            erro: erro.status ? erro.message : erro.code === "ER_DUP_ENTRY" ? "Identidade já cadastrada; confira o vínculo." : "Não foi possível cadastrar o servidor."
        });
    }
}

module.exports = {
    cadastrar,
};
