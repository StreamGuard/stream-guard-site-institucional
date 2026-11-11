var fs = require("fs");
var path = require("path");

function transformarCsv(texto) {
    var linhas = texto.trim().split(/\r?\n/);
    var colunas = linhas[0].split(";");
    // guardo os objetos criados
    var dados = [];

    for (var i = 1; i < linhas.length; i++) {
        var valores = linhas[i].split(";");
        // cada linha me vira uma lista de valores
        var registro = {};

        for (var j = 0; j < colunas.length; j++) {
            // associo cada valor ao nome da coluna
            registro[colunas[j]] = valores[j];
        }
        dados.push(registro);
    }
    return dados;
}
async function lerCsv(nomeArquivo, chaveS3) {
    var texto;

    //se  o meu .env tiver BUCKET_GOLD eu leio no S3
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

function buscarMetricas() {
    return lerCsv("resumo_metricas.csv", process.env.GOLD_RESUMO_METRICAS);
}
function buscaProcessos() {
    return lerCsv("resumo_processos.csv", process.env.GOLD_RESUMO_PROCESSOS);
}

module.exports = {
    buscarMetricas,
    buscaProcessos
}