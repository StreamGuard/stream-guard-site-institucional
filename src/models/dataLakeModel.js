var JANELA_MS = 5 * 60 * 1000;
var HORAS_COBERTURA = 24;

var cache = {
    chave: null,
    valor: null,
    expiraEm: 0
};

var avisouSemBucket = false;

// Lê uma variável de ambiente, ignorando valores vazios.
function valorEnv(nome, padrao) {
    var valor = process.env[nome];

    if (valor === undefined || valor === null || String(valor).trim() === "") {
        return padrao;
    }

    return String(valor).trim();
}

function prefixoGold() {
    var prefixo = valorEnv("GOLD_PREFIX", "gold/");
    return prefixo.charAt(prefixo.length - 1) === "/" ? prefixo : prefixo + "/";
}

function offsetGold() {
    var offset = valorEnv("DATA_LAKE_UTC_OFFSET", "-03:00");
    return /^[+-]\d{2}:\d{2}$/.test(offset) ? offset : "-03:00";
}

// Converte "YYYY-MM-DD HH:mm:ss" (sem fuso) para Date.
function paraData(texto) {
    if (!texto) return null;

    var valor = String(texto).trim();
    if (!valor) return null;

    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(valor)) {
        valor = valor.replace(" ", "T") + offsetGold();
    }

    var data = new Date(valor);
    return isNaN(data.getTime()) ? null : data;
}

// O gold é organizado por empresa; os servidores são agrupados pelo servidor_id do JSON.
function chaveS3(idEmpresa) {
    return prefixoGold() + idEmpresa + "/atual/resumo_metricas.json";
}

async function lerDoBucket(idEmpresa, cliente, bucket) {
    var aws = require("@aws-sdk/client-s3");
    var comando = new aws.GetObjectCommand({
        Bucket: bucket,
        Key: chaveS3(idEmpresa)
    });

    var resposta = await cliente.send(comando);
    return JSON.parse(await resposta.Body.transformToString());
}

// Agrupa as linhas de todas as empresas por servidor_id.
function calcularResumo(linhas) {
    var porServidor = new Map();
    var ultimoGold = null;
    var menorJanela = null;
    var maiorJanela = null;

    linhas.forEach(function (linha) {
        var id = linha && linha.servidor_id != null ? String(linha.servidor_id) : null;
        var janela = linha ? paraData(linha.inicio_periodo) : null;

        if (!id || !janela) return;

        var ultima = paraData(linha.ultima_amostra);

        if (!porServidor.has(id)) {
            porServidor.set(id, {
                ultimoLote: null,
                primeiraJanela: janela,
                janelas: new Set()
            });
        }

        var dados = porServidor.get(id);

        if (janela < dados.primeiraJanela) {
            dados.primeiraJanela = janela;
        }

        if (ultima && (!dados.ultimoLote || ultima > dados.ultimoLote)) {
            dados.ultimoLote = ultima;
        }

        if (ultima && (!ultimoGold || ultima > ultimoGold)) {
            ultimoGold = ultima;
        }

        dados.janelas.add(janela.getTime());

        if (!menorJanela || janela < menorJanela) menorJanela = janela;
        if (!maiorJanela || janela > maiorJanela) maiorJanela = janela;
    });

    if (!maiorJanela || !ultimoGold) return null;

    var fimExclusivo = maiorJanela.getTime() + JANELA_MS;
    var inicioGlobal = Math.max(
        fimExclusivo - HORAS_COBERTURA * 60 * 60 * 1000,
        menorJanela.getTime()
    );

    var servidores = Object.create(null);

    porServidor.forEach(function (dados, id) {
        var inicioServidor = Math.max(inicioGlobal, dados.primeiraJanela.getTime());
        var esperadas = Math.max(1, Math.floor((fimExclusivo - inicioServidor) / JANELA_MS));
        var recebidas = 0;

        dados.janelas.forEach(function (janela) {
            if (janela >= inicioServidor && janela < fimExclusivo) {
                recebidas++;
            }
        });

        servidores[id] = {
            ultimo_lote_em: dados.ultimoLote ? dados.ultimoLote.toISOString() : null,
            cobertura_pct: Math.min(100, Math.round((recebidas / esperadas) * 1000) / 10)
        };
    });

    return {
        ultimo_gold_em: ultimoGold.toISOString(),
        servidores: servidores
    };
}

async function buscarResumoGold(idsEmpresas) {
    var empresas = Array.from(new Set((idsEmpresas || []).map(function (id) {
        return String(id);
    }))).sort();

    if (empresas.length === 0) return null;

    var chaveCache = empresas.join(",");
    var agora = Date.now();

    if (cache.chave === chaveCache && cache.expiraEm > agora) {
        return cache.valor;
    }

    var bucket = valorEnv("DATA_LAKE_BUCKET", valorEnv("BUCKET_GOLD", ""));

    if (!bucket) {
        if (!avisouSemBucket) {
            console.log("Data Lake: bucket não configurado (defina DATA_LAKE_BUCKET ou BUCKET_GOLD).");
            avisouSemBucket = true;
        }
        return null;
    }

    var cliente;

    try {
        var aws = require("@aws-sdk/client-s3");
        var regiao = valorEnv("AWS_REGION", "");
        cliente = new aws.S3Client(regiao ? { region: regiao } : {});
    } catch (erroCliente) {
        console.log("Data Lake: falha ao criar o cliente S3 -", erroCliente.message);
        return null;
    }

    var linhas = [];
    var leuAlgum = false;
    var ausentes = 0;

    for (var i = 0; i < empresas.length; i++) {
        var idEmpresa = empresas[i];

        // Evita ids estranhos na chave S3.
        if (!/^[A-Za-z0-9._-]+$/.test(idEmpresa)) {
            console.log("Data Lake: id de empresa ignorado:", idEmpresa);
            continue;
        }

        try {
            var dados = await lerDoBucket(idEmpresa, cliente, bucket);

            if (Array.isArray(dados)) {
                linhas = linhas.concat(dados);
                leuAlgum = true;
            } else {
                console.log("Data Lake: formato inesperado no resumo da empresa", idEmpresa);
            }
        } catch (erro) {
            var nomeErro = erro && (erro.name || erro.Code);
            var mensagem = erro && erro.message ? erro.message : String(erro);

            if (nomeErro === "NoSuchKey") {
                ausentes++;
                continue;
            }

            if (nomeErro === "NoSuchBucket" || nomeErro === "AccessDenied") {
                console.log("Data Lake: falha de acesso ao bucket -", mensagem);
                break;
            }

            console.log("Data Lake: falha ao ler o resumo da empresa", idEmpresa, "-", mensagem);
        }
    }

    if (!leuAlgum) {
        if (ausentes > 0 && ausentes === empresas.length) {
            console.log(
                "Data Lake: nenhum resumo encontrado. Verifique se existe",
                bucket + "/" + prefixoGold() + "<id_empresa>/atual/resumo_metricas.json"
            );
        }
        return null;
    }

    var resumo = calcularResumo(linhas);
    if (!resumo) return null;

    var ttlSegundos = Number(valorEnv("DATA_LAKE_CACHE_SEGUNDOS", "60"));
    if (!Number.isFinite(ttlSegundos) || ttlSegundos < 0) {
        ttlSegundos = 60;
    }

    cache.chave = chaveCache;
    cache.valor = resumo;
    cache.expiraEm = Date.now() + ttlSegundos * 1000;

    return resumo;
}

module.exports = {
    buscarResumoGold
};
