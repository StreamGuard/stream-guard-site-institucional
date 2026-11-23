const {
    S3Client,
    GetObjectCommand
} = require("@aws-sdk/client-s3");

const PERIODOS = {
    "24h": {
        arquivo: "resumo_metricas.json",
        horas: 24
    },
    "7d": {
        arquivo: "resumo_metricas_1h.json",
        horas: 168
    },
    "30d": {
        arquivo: "resumo_metricas_6h.json",
        horas: 720
    }
};

// Converte datas no formato da ETL.
function converterData(valor) {

    if (!valor) {
        return null;
    }

    let texto = String(valor).trim();

    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(texto)) {

        let fuso = process.env.DATA_LAKE_UTC_OFFSET || "-03:00";

        if (!/^[+-]\d{2}:\d{2}$/.test(fuso)) {
            throw new Error("Fuso horário inválido.");
        }

        texto = texto.replace(" ", "T") + fuso;
    }

    let data = new Date(texto);

    if (Number.isNaN(data.getTime())) {
        return null;
    }

    return data;
}

// Busca os dados históricos da empresa.
async function buscarMetricasPeriodo(empresaId, periodo) {

    if (!PERIODOS[periodo]) {
        throw new Error("Período inválido.");
    }

    if (!Number.isSafeInteger(empresaId) || empresaId <= 0) {
        throw new Error("Empresa inválida.");
    }

    let bucket =
        process.env.DATA_LAKE_BUCKET ||
        process.env.BUCKET_GOLD;

    if (!bucket) {
        throw new Error("Bucket não configurado.");
    }

    let regiao = process.env.AWS_REGION;

    if (!regiao) {
        throw new Error("Região AWS não configurada.");
    }

    let prefixo = process.env.GOLD_PREFIX || "gold/";

    if (!prefixo.endsWith("/")) {
        prefixo += "/";
    }

    let arquivo = PERIODOS[periodo].arquivo;

    let chave =
        prefixo + empresaId + "/atual/" + arquivo;

    let cliente = new S3Client({
        region: regiao
    });

    let comando = new GetObjectCommand({
        Bucket: bucket,
        Key: chave
    });

    let resposta = await cliente.send(comando);

    let conteudo = await resposta.Body.transformToString();

    let dados = JSON.parse(conteudo);

    if (!Array.isArray(dados)) {
        throw new Error("Formato do Gold inválido.");
    }

    // Filtra somente o intervalo solicitado.
    let fim = Date.now();

    let inicio =
        fim - PERIODOS[periodo].horas * 60 * 60 * 1000;

    let metricas = dados.filter(function (linha) {

        let data = converterData(linha.inicio_periodo);

        if (!data) {
            return false;
        }

        let timestamp = data.getTime();

        return timestamp >= inicio && timestamp <= fim;
    });

    return {
        periodo: periodo,
        arquivo: arquivo,
        totalRegistros: metricas.length,
        metricas: metricas
    };
}

module.exports = {
    buscarMetricasPeriodo
};
