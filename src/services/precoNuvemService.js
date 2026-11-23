const fs = require("fs");
const path = require("path");

// Catálogo público de preços EC2.
const URL_AWS =
    "https://pricing.us-east-1.amazonaws.com" +
    "/offers/v1.0/aws/AmazonEC2/current/region_index.json";

// Arquivo gerado pelo extrator de tarifas.
const CAMINHO_PRECOS = path.join(
    __dirname,
    "precosAws.json"
);

// ==========================================
// CONSULTAR CATÁLOGO PÚBLICO AWS
// ==========================================

async function consultarCatalogo(regiao) {

    const regioes = ["us-east-1", "sa-east-1"];

    if (!regioes.includes(regiao)) {
        throw new Error("Região AWS inválida.");
    }

    const resposta = await fetch(URL_AWS, {
        signal: AbortSignal.timeout(15000)
    });

    if (!resposta.ok) {
        throw new Error("Erro ao consultar a AWS.");
    }

    const dados = await resposta.json();

    const informacoes = dados.regions[regiao];

    if (!informacoes) {
        throw new Error("Região não encontrada no catálogo.");
    }

    return {
        regiao: regiao,
        urlCatalogo:
            "https://pricing.us-east-1.amazonaws.com" +
            informacoes.currentVersionUrl
    };
}

// ==========================================
// CARREGAR TARIFAS EXTRAÍDAS
// ==========================================

function carregarPrecos() {

    if (!fs.existsSync(CAMINHO_PRECOS)) {

        throw new Error(
            "Execute o extrator de preços AWS primeiro."
        );
    }

    const conteudo = fs.readFileSync(
        CAMINHO_PRECOS,
        "utf8"
    );

    const precos = JSON.parse(conteudo);

    if (
        !precos.instancia ||
        !precos.armazenamento ||
        !Number.isFinite(precos.instancia.usdPorHora) ||
        !Number.isFinite(precos.armazenamento.usdPorGbMes) ||
        precos.instancia.usdPorHora <= 0 ||
        precos.armazenamento.usdPorGbMes <= 0
    ) {
        throw new Error("Tarifas AWS inválidas.");
    }

    return precos;
}

module.exports = {
    consultarCatalogo,
    carregarPrecos
};
