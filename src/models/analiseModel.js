var fs = require("fs");
var path = require("path");

// Transforma o texto do CSV em uma lista de objetos
// Ex.: { servidor_id: "77", tipo: "USO_CPU", media_amostral: "72.5", ... }
function csvParaLista(texto) {
    var linhas = texto.trim().split(/\r?\n/);
    var colunas = linhas[0].split(",");
    var lista = [];

    for (var i = 1; i < linhas.length; i++) {
        var partes = linhas[i].split(",");
        var objeto = {};
        for (var j = 0; j < colunas.length; j++) {
            objeto[colunas[j]] = partes[j];
        }
        lista.push(objeto);
    }

    return lista;
}

// Lê o arquivo da pasta public/painel/dados (serve para testar sem AWS)
function lerLocal(nomeDoArquivo) {
    var caminho = path.join(__dirname, "../../public/painel/dados", nomeDoArquivo);
    return fs.promises.readFile(caminho, "utf-8");
}

// Lê o arquivo do bucket gold no S3
// As credenciais NÃO ficam no código: o SDK usa a role da EC2 (ou o "aws configure")
async function lerDoS3(chave) {
    var aws = require("@aws-sdk/client-s3");
    var cliente = new aws.S3Client({ region: process.env.AWS_REGION });
    var comando = new aws.GetObjectCommand({ Bucket: process.env.BUCKET_GOLD, Key: chave });
    var resposta = await cliente.send(comando);
    return resposta.Body.transformToString();
}

// Se o .env tiver BUCKET_GOLD, lê do S3. Se não tiver, lê da pasta local.
async function buscarArquivo(nomeLocal, chaveS3) {
    var texto;

    if (process.env.BUCKET_GOLD) {
        texto = await lerDoS3(chaveS3);
    } else {
        texto = await lerLocal(nomeLocal);
    }

    return csvParaLista(texto);
}

function buscarMetricas() {
    return buscarArquivo("resumo_metricas.csv", process.env.GOLD_RESUMO_METRICAS);
}

function buscarProcessos() {
    return buscarArquivo("resumo_processos.csv", process.env.GOLD_RESUMO_PROCESSOS);
}

module.exports = {
    buscarMetricas,
    buscarProcessos
};
