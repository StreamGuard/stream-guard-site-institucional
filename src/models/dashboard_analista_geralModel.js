var fs = require("fs");
var path = require("path");
var database = require("../database/config");

function transformarCsv(texto) {
    var linhas = texto.trim().split(/\r?\n/);
    var colunas = linhas[0].split(",");
    var dados = [];

    for (var i = 1; i < linhas.length; i++) {
        var valores = linhas[i].split(",");
        var registro = {};

        for (var j = 0; j < colunas.length; j++) {
            registro[colunas[j]] = valores[j];
        }

        dados.push(registro);
    }

    return dados;
}

async function lerCsv(nomeArquivo, chaveS3) {
    var texto;

    if (process.env.BUCKET_GOLD && chaveS3) {
        var aws = require("@aws-sdk/client-s3");
        var cliente = new aws.S3Client({ region: process.env.AWS_REGION });
        var comando = new aws.GetObjectCommand({
            Bucket: process.env.BUCKET_GOLD,
            Key: chaveS3
        });
        var resposta = await cliente.send(comando);
        texto = await resposta.Body.transformToString();
    } else {
        var caminho = path.join(__dirname, "../../public/painel/dados", nomeArquivo);
        texto = await fs.promises.readFile(caminho, "utf8");
    }

    return transformarCsv(texto);
}
// Busco no banco os hostnames dos servidores encontrados nos registros do CSV.
async function incluirNomeDosServidores(registros) {
    var ids = [];

    for (var i = 0; i < registros.length; i++) {
        var id = Number(registros[i].servidor_id);
//verifico se id é um número inteiro válido e seguro.
        if (Number.isSafeInteger(id) && id > 0 && ids.indexOf(id) === -1) {
            ids.push(id);
        }
    }

    var servidores = [];
//  // Consulto a tabela equipamentos somente se houver IDs válidos.
    // Os IDs são validados acima antes de serem inseridos na consulta.
    if (ids.length > 0) {
        servidores = await database.executar(`
            SELECT id_equipamentos, hostname
            FROM equipamentos
            WHERE id_equipamentos IN (${ids.join(",")})
        `);
    }

    var registrosComNome = [];

    for (var i = 0; i < registros.length; i++) {
        var nomeServidor = "Servidor " + registros[i].servidor_id;

        for (var j = 0; j < servidores.length; j++) {
    // Procuro o hostname correspondente a cada servidor_id do CSV.
            if (String(servidores[j].id_equipamentos) === String(registros[i].servidor_id)) {
                nomeServidor = servidores[j].hostname;
                break;
            }
        }
// Mantém os dados originais do CSV e acrescenta o nome do servidor.
        registrosComNome.push({
            ...registros[i],
            nome_servidor: nomeServidor
        });
    }

    return registrosComNome;
}
// Lê as métricas e acrescenta o hostname de cada servidor.
async function buscarMetricas() {
    var registros = await lerCsv(
        "resumo_metricas.csv",
        process.env.GOLD_RESUMO_METRICAS
    );

    return incluirNomeDosServidores(registros);
}

async function buscaProcessos() {
    var registros = await lerCsv(
        "resumo_processos.csv",
        process.env.GOLD_RESUMO_PROCESSOS
    );

    return incluirNomeDosServidores(registros);
}

module.exports = {
    buscarMetricas,
    buscaProcessos
};