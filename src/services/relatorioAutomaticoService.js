const fs = require("fs");
const gestorModel = require("../models/gestorModel");
const financeiroService = require("./gestorFinanceiroService");
const precoService = require("./precoNuvemService");

const LIMITES = {
    CPU: 85,
    RAM: 90,
    Disco: 85
};

const TIPOS = {
    USO_CPU: "CPU",
    USO_RAM: "RAM",
    USO_DISCO: "Disco"
};

function consolidar(metricas) {
    let grupos = new Map();

    for (let metrica of metricas) {
        let componente = TIPOS[metrica.tipo];

        if (!Object.hasOwn(TIPOS, metrica.tipo) ||
            metrica.servidor_id == null ||
            metrica.media_amostral == null ||
            metrica.quantidade_amostras == null) {
            continue;
        }

        let media = Number(metrica.media_amostral);
        let quantidade = Number(metrica.quantidade_amostras);

        if (!Number.isFinite(media) ||
            !Number.isFinite(quantidade) ||
            quantidade <= 0) {
            continue;
        }

        let id = String(metrica.servidor_id);

        if (!grupos.has(id)) {
            grupos.set(id, {});
        }

        let servidor = grupos.get(id);

        if (!servidor[componente]) {
            servidor[componente] = {
                soma: 0,
                quantidade: 0,
                pico: false
            };
        }

        let registro = servidor[componente];

        registro.soma += media * quantidade;
        registro.quantidade += quantidade;

        let maximo = Number(metrica.maximo);

        if (metrica.maximo != null &&
            Number.isFinite(maximo) &&
            maximo >= LIMITES[componente]) {
            registro.pico = true;
        }
    }

    let total = 0;
    let atencao = 0;
    let riscoComputacao = false;
    let riscoArmazenamento = false;

    for (let servidor of grupos.values()) {
        if (!servidor.CPU ||
            !servidor.RAM ||
            !servidor.Disco) {
            continue;
        }

        total++;

        let risco = false;

        for (let componente of Object.keys(LIMITES)) {
            let registro = servidor[componente];

            let media = Math.round(
                registro.soma / registro.quantidade
            );

            if (registro.pico || media >= LIMITES[componente]) {
                risco = true;

                if (componente === "Disco") {
                    riscoArmazenamento = true;
                } else {
                    riscoComputacao = true;
                }
            }
        }

        if (risco) {
            atencao++;
        }
    }

    return {
        total,
        atencao,
        riscoComputacao,
        riscoArmazenamento
    };
}

async function buscarDados() {
    let caminho = process.env.RELATORIO_CONFIG;

    if (!caminho) {
        throw new Error("Configuração do relatório não informada.");
    }

    let config = JSON.parse(
        fs.readFileSync(caminho, "utf8")
    );

    let historico = await gestorModel.buscarMetricasPeriodo(
        config.empresaId,
        config.periodo
    );

    let resumo = consolidar(historico.metricas);

    if (resumo.total === 0) {
        throw new Error("Histórico operacional indisponível.");
    }

    let precos = precoService.carregarPrecos();

    let financeiro = financeiroService.calcular(
        config.financeiro,
        precos
    );

    let recomendacoes = [...financeiro.insights];

    if (resumo.riscoComputacao) {
        recomendacoes.push(
            "Avaliar a capacidade computacional e o impacto financeiro da expansão."
        );
    }

    if (resumo.riscoArmazenamento) {
        recomendacoes.push(
            "Avaliar a capacidade e o planejamento de armazenamento."
        );
    }

    if (recomendacoes.length === 0) {
        recomendacoes.push(
            "Continuar acompanhando o orçamento e os indicadores operacionais."
        );
    }

    let previsoes = [];

    for (let previsao of financeiro.previsoes) {
        previsoes.push({
            mes: "Mês " + previsao.mes,
            custo: previsao.custo
        });
    }

    return {
        dataGeracao: new Date().toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo"
        }),

        cenario: "Histórico operacional - " +
            config.periodo + " | Projeção financeira programada",

        totalServidores: resumo.total,
        servidoresAtencao: resumo.atencao,
        custoEstimado: financeiro.custoTotal,
        orcamentoMensal: financeiro.orcamentoTotal,
        previsoes: previsoes,
        recomendacoes: recomendacoes
    };
}

module.exports = {
    buscarDados,
    consolidar
};
