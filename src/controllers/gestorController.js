const gestorModel = require("../models/gestorModel");
const usuarioModel = require("../models/usuarioModel");
const relatorioService = require("../services/relatorioService");
const precoService = require("../services/precoNuvemService");
const financeiroService = require("../services/gestorFinanceiroService");

// TARIFAS AWS

function buscarPrecos(req, res) {

    try {

        let precos = precoService.carregarPrecos();

        return res.status(200).json(precos);

    } catch (erro) {

        console.error("Erro nos preços:", erro.message);

        return res.status(503).json({
            mensagem: "Preços AWS indisponíveis."
        });
    }
}

// CONSULTAR MÉTRICAS 

async function buscarResumo(req, res) {
    let usuarioId = Number(req.query.idUsuario);

    if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {

        return res.status(401).json({
            mensagem: "Faça login para consultar o histórico."
        });
    }

    let periodo = req.query.periodo || "24h";

    if (!["24h", "7d", "30d"].includes(periodo)) {

        return res.status(400).json({
            mensagem: "Período inválido."
        });
    }

    try {

        let usuario = await usuarioModel.buscarEmpresaPorId(usuarioId);

        if (!usuario || usuario.length === 0) {
            return res.status(401).json({
                mensagem: "Usuário não encontrado ou inativo."
            });
        }

        let empresaId = Number(usuario[0].empresa_id);

        let resultado = await gestorModel.buscarMetricasPeriodo(
            empresaId,
            periodo
        );

        return res.status(200).json(resultado);

    } catch (erro) {

        console.error("Erro no Gold:", erro.message);

        return res.status(503).json({
            mensagem: "Não foi possível consultar o Data Lake."
        });
    }
}


// ORÇAMENTO E INSIGHTS


function simular(req, res) {

    try {

        // O orçamento é informado pelo navegador.
        let dados = req.body;

        // As tarifas vêm do cache do backend.
        let precos = precoService.carregarPrecos();

        let resultado = financeiroService.calcular(
            dados,
            precos
        );

        return res.status(200).json(resultado);

    } catch (erro) {

        console.error("Erro na simulação:", erro.message);

        if (
            erro.message.startsWith("Valor inválido") ||
            erro.message.startsWith("Parâmetros financeiros") ||
            erro.message.startsWith("A distribuição") ||
            erro.message.startsWith("Informe a distribuição")
        ) {

            return res.status(400).json({
                mensagem: erro.message
            });
        }

        return res.status(503).json({
            mensagem: "Simulação financeira indisponível."
        });
    }
}

async function gerarRelatorio(req, res) {

    try {

        let dados = req.body;

        if (
            !dados ||
            typeof dados.cenario !== "string" ||
            !Number.isFinite(dados.custoEstimado) ||
            !Number.isFinite(dados.orcamentoMensal) ||
            !Number.isInteger(dados.totalServidores) ||
            !Number.isInteger(dados.servidoresAtencao) ||
            !Array.isArray(dados.previsoes) ||
            !Array.isArray(dados.recomendacoes)
        ) {

            return res.status(400).json({
                mensagem: "Dados do relatório inválidos."
            });
        }

        let caminhoPdf = await relatorioService.gerarRelatorio(dados);

        return res.download(
            caminhoPdf,
            "relatorio-gerencial.pdf"
        );

    } catch (erro) {

        console.error("Erro ao gerar relatório:", erro.message);

        return res.status(500).json({
            mensagem: "Não foi possível gerar o relatório."
        });
    }
}

module.exports = {
    buscarPrecos,
    buscarResumo,
    simular,
    gerarRelatorio
};
