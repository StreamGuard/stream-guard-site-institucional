// ==========================================
// SERVIÇO FINANCEIRO DO STREAMGUARD
// ==========================================

function numero(valor, nome) {

    if (
        valor === null ||
        valor === undefined ||
        valor === "" ||
        !Number.isFinite(Number(valor)) ||
        Number(valor) < 0
    ) {
        throw new Error("Valor inválido: " + nome);
    }

    return Number(valor);
}

function calcular(dados, precos) {

    let servidores = numero(
        dados.servidores, "servidores"
    );

    let horas = numero(
        dados.horasMes, "horas mensais"
    );

    let armazenamento = numero(
        dados.armazenamentoGb, "armazenamento"
    );

    let trafego = numero(
        dados.trafegoSaidaGb, "tráfego"
    );

    let cambio = numero(
        dados.cambio, "câmbio"
    );

    let precoRede = numero(
        dados.precoRedeUsdGb, "preço da rede"
    );

    let orcamento = numero(
        dados.orcamentoMensal, "orçamento"
    );

    let rateioCpu = numero(
        dados.rateioCpu, "rateio da CPU"
    );

    let crescimento = numero(
        dados.crescimentoMensal, "crescimento"
    );

    if (
        !Number.isInteger(servidores) ||
        servidores > 100000 ||
        horas > 744 ||
        rateioCpu > 100 ||
        crescimento > 100 ||
        cambio <= 0
    ) {
        throw new Error("Parâmetros financeiros inválidos.");
    }

    // Distribuição do orçamento definida pelo gestor.
    let distribuicao = dados.distribuicaoOrcamento;

    if (!distribuicao || typeof distribuicao !== "object") {
        throw new Error("Informe a distribuição do orçamento.");
    }

    let componentes = ["CPU", "RAM", "Disco", "Rede"];

    let somaPercentuais = 0;

    for (let i = 0; i < componentes.length; i++) {

        let nome = componentes[i];

        distribuicao[nome] = numero(
            distribuicao[nome], nome
        );

        somaPercentuais += distribuicao[nome];
    }

    if (Math.abs(somaPercentuais - 100) > 0.001) {
        throw new Error(
            "A distribuição do orçamento deve somar 100%."
        );
    }

    // ======================================
    // CUSTOS ESTIMADOS EM DÓLARES
    // ======================================

    let computacaoUsd =
        servidores *
        horas *
        precos.instancia.usdPorHora;

    let discoUsd =
        armazenamento *
        precos.armazenamento.usdPorGbMes;

    let redeUsd =
        trafego *
        precoRede;

    // CPU e RAM dividem o custo da EC2.
    let cpuUsd = computacaoUsd * rateioCpu / 100;

    let ramUsd = computacaoUsd - cpuUsd;

    // ======================================
    // CONVERSÃO PARA REAIS
    // ======================================

    let custos = {
        CPU: cpuUsd * cambio,
        RAM: ramUsd * cambio,
        Disco: discoUsd * cambio,
        Rede: redeUsd * cambio
    };

    let resultado = {};
    let insights = [];
    let total = 0;

    // ======================================
    // COMPARAÇÃO COM O ORÇAMENTO
    // ======================================

    for (let i = 0; i < componentes.length; i++) {

        let nome = componentes[i];

        let custo = custos[nome];

        let limite =
            orcamento * distribuicao[nome] / 100;

        let diferenca = custo - limite;

        let percentual = 0;

        if (limite > 0) {
            percentual = custo / limite * 100;
        }

        let situacao = "Dentro do orçamento";

        if (custo > limite) {
            situacao = "Orçamento excedido";
        } else if (limite > 0 && percentual >= 80) {
            situacao = "Próximo do limite";
        }

        resultado[nome] = {
            custo: custo,
            orcamento: limite,
            diferenca: diferenca,
            percentual: percentual,
            situacao: situacao
        };

        if (diferenca > 0) {

            insights.push(
                nome + " ultrapassou o orçamento em R$ " +
                diferenca.toFixed(2)
            );
        }

        total += custo;
    }

    // ======================================
    // PREVISÃO PARA TRÊS MESES
    // ======================================

    let previsoes = [];

    for (let mes = 1; mes <= 3; mes++) {

        let fator = Math.pow(
            1 + crescimento / 100,
            mes - 1
        );

        // Computação permanece constante.
        // Armazenamento e tráfego crescem.

        let custoMesUsd =
            computacaoUsd +
            discoUsd * fator +
            redeUsd * fator;

        previsoes.push({
            mes: mes,
            custo: custoMesUsd * cambio
        });
    }

    // ======================================
    // RESULTADO FINANCEIRO
    // ======================================

    return {
        custoTotal: total,
        orcamentoTotal: orcamento,
        saldo: orcamento - total,
        componentes: resultado,
        previsoes: previsoes,
        insights: insights,
        fonte: "Estimativa gerencial com tarifas AWS e premissas",
        regiao: precos.regiao,
        instancia: precos.instancia.tipo,
        tarifasConsultadasEm: precos.consultadoEm
    };
}

module.exports = {
    calcular
};
