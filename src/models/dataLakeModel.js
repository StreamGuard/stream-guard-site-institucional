// Cada período usa um arquivo diferente do Gold e uma janela de agregação própria.
var PERIODO_PADRAO = "24h";

var PERIODOS = {
    "24h": { arquivo: "resumo_metricas.json", janelaMinutos: 5, horizonteHoras: 24 },
    "7d": { arquivo: "resumo_metricas_1h.json", janelaMinutos: 60, horizonteHoras: 24 * 7 },
    "30d": { arquivo: "resumo_metricas_6h.json", janelaMinutos: 6 * 60, horizonteHoras: 24 * 30 }
};

function configPeriodo(periodo) {
    var chave = String(periodo || "").toLowerCase();

    if (!PERIODOS[chave]) {
        chave = PERIODO_PADRAO;
    }

    var config = PERIODOS[chave];

    return {
        chave: chave,
        arquivo: config.arquivo,
        janelaMs: config.janelaMinutos * 60 * 1000,
        horizonteMs: config.horizonteHoras * 60 * 60 * 1000
    };
}

// Uma entrada por período + conjunto de empresas: trocar de aba não refaz o S3.
var cache = new Map();

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
function chaveS3(idEmpresa, arquivo) {
    return prefixoGold() + idEmpresa + "/atual/" + arquivo;
}

async function lerDoBucket(idEmpresa, cliente, bucket, arquivo) {
    var aws = require("@aws-sdk/client-s3");
    var comando = new aws.GetObjectCommand({
        Bucket: bucket,
        Key: chaveS3(idEmpresa, arquivo)
    });

    var resposta = await cliente.send(comando);
    return JSON.parse(await resposta.Body.transformToString());
}

// Prefixo dos dois JSONs que a ETL grava para a tela Data Lake.
function prefixoDatalake() {
    var prefixo = valorEnv("DATALAKE_PREFIX", "datalake/");
    return prefixo.charAt(prefixo.length - 1) === "/" ? prefixo : prefixo + "/";
}

function chaveDatalake(arquivo) {
    return prefixoDatalake() + arquivo;
}

async function lerDoDatalake(cliente, bucket, arquivo) {
    var aws = require("@aws-sdk/client-s3");
    var comando = new aws.GetObjectCommand({
        Bucket: bucket,
        Key: chaveDatalake(arquivo)
    });

    var resposta = await cliente.send(comando);
    return JSON.parse(await resposta.Body.transformToString());
}

// Sem s3:ListBucket, uma chave inexistente volta como AccessDenied citando ListBucket.
function erroIndicaAusencia(erro) {
    var nome = erro && (erro.name || erro.Code);
    var mensagem = erro && erro.message ? erro.message : String(erro);

    return nome === "NoSuchKey" ||
        (nome === "AccessDenied" && /ListBucket/i.test(mensagem));
}

// Agrupa as linhas de todas as empresas por servidor_id.
function calcularResumo(linhas, config) {
    var janelaMs = config.janelaMs;
    var horizonteMs = config.horizonteMs;
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

    var fimExclusivo = maiorJanela.getTime() + janelaMs;
    var inicioGlobal = Math.max(
        fimExclusivo - horizonteMs,
        menorJanela.getTime()
    );

    var servidores = Object.create(null);

    porServidor.forEach(function (dados, id) {
        var inicioServidor = Math.max(inicioGlobal, dados.primeiraJanela.getTime());
        var esperadas = Math.max(1, Math.floor((fimExclusivo - inicioServidor) / janelaMs));
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

async function buscarResumoGold(idsEmpresas, periodo) {
    var empresas = Array.from(new Set((idsEmpresas || []).map(function (id) {
        return String(id);
    }))).sort();

    if (empresas.length === 0) return null;

    var config = configPeriodo(periodo);
    var chaveCache = config.chave + "|" + empresas.join(",");
    var agora = Date.now();

    var entradaCache = cache.get(chaveCache);

    if (entradaCache && entradaCache.expiraEm > agora) {
        return entradaCache.valor;
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

    // Lê as empresas em paralelo: com várias empresas, uma chamada por vez
    // deixava a troca de período lenta.
    var leituras = empresas.map(function (idEmpresa) {
        // Evita ids estranhos na chave S3.
        if (!/^[A-Za-z0-9._-]+$/.test(idEmpresa)) {
            console.log("Data Lake: id de empresa ignorado:", idEmpresa);
            return Promise.resolve(null);
        }

        return lerDoBucket(idEmpresa, cliente, bucket, config.arquivo)
            .then(function (dados) {
                if (Array.isArray(dados)) {
                    return { linhas: dados };
                }

                console.log("Data Lake: formato inesperado no resumo da empresa", idEmpresa);
                return null;
            })
            .catch(function (erro) {
                var nomeErro = erro && (erro.name || erro.Code);
                var mensagem = erro && erro.message ? erro.message : String(erro);

                // Sem s3:ListBucket, uma chave inexistente volta como AccessDenied
                // citando ListBucket. Nesse caso é ausência de dado, não falha geral.
                var chaveAusente = nomeErro === "NoSuchKey" ||
                    (nomeErro === "AccessDenied" && /ListBucket/i.test(mensagem));

                if (chaveAusente) {
                    return { ausente: true };
                }

                if (nomeErro === "NoSuchBucket" || nomeErro === "AccessDenied") {
                    return { falhaGlobal: mensagem };
                }

                console.log("Data Lake: falha ao ler o resumo da empresa", idEmpresa, "-", mensagem);
                return null;
            });
    });

    var resultados = await Promise.all(leituras);
    var falhaGlobal = null;

    resultados.forEach(function (resultado) {
        if (!resultado) return;

        if (resultado.linhas) {
            linhas = linhas.concat(resultado.linhas);
            leuAlgum = true;
        } else if (resultado.ausente) {
            ausentes++;
        } else if (resultado.falhaGlobal && !falhaGlobal) {
            falhaGlobal = resultado.falhaGlobal;
        }
    });

    if (falhaGlobal) {
        console.log("Data Lake: falha de acesso ao bucket -", falhaGlobal);
    }

    function guardarCache(valor) {
        var ttlSegundos = Number(valorEnv("DATA_LAKE_CACHE_SEGUNDOS", "60"));
        if (!Number.isFinite(ttlSegundos) || ttlSegundos < 0) {
            ttlSegundos = 60;
        }

        cache.set(chaveCache, {
            valor: valor,
            expiraEm: Date.now() + ttlSegundos * 1000
        });
    }

    if (!leuAlgum) {
        if (ausentes > 0 && ausentes === empresas.length) {
            console.log(
                "Data Lake: nenhum resumo encontrado. Verifique se existe",
                bucket + "/" + prefixoGold() + "<id_empresa>/atual/" + config.arquivo
            );
        }
        // Também guarda a ausência: evita repetir todas as leituras no mesmo minuto.
        guardarCache(null);
        return null;
    }

    var resumo = calcularResumo(linhas, config);
    if (!resumo) {
        guardarCache(null);
        return null;
    }

    guardarCache(resumo);

    return resumo;
}

// Lê os dois JSONs novos da tela Data Lake. Um arquivo ausente não impede a leitura do outro.
async function buscarPainel() {
    var bucket = valorEnv("DATA_LAKE_BUCKET", valorEnv("BUCKET_GOLD", ""));

    if (!bucket) {
        if (!avisouSemBucket) {
            console.log("Data Lake: bucket não configurado. Defina DATA_LAKE_BUCKET ou BUCKET_GOLD.");
            avisouSemBucket = true;
        }

        return {
            qualidade: null,
            inventario: null,
            faltando: ["qualidade.json", "inventario.json"],
            falhas: []
        };
    }

    var chaveCache = "painel";
    var agora = Date.now();
    var entradaCache = cache.get(chaveCache);

    if (entradaCache && entradaCache.expiraEm > agora) {
        return entradaCache.valor;
    }

    var aws = require("@aws-sdk/client-s3");
    var cliente;
    var regiao = valorEnv("AWS_REGION", "");

    try {
        cliente = new aws.S3Client(regiao ? { region: regiao } : {});
    } catch (erroCliente) {
        console.log("Data Lake: falha ao criar o cliente S3 -", erroCliente.message);
        return {
            qualidade: null,
            inventario: null,
            faltando: ["qualidade.json", "inventario.json"],
            falhas: []
        };
    }

    var arquivos = ["qualidade.json", "inventario.json"];

    var leituras = arquivos.map(function (arquivo) {
        return lerDoDatalake(cliente, bucket, arquivo)
            .then(function (dados) {
                return { arquivo: arquivo, dados: dados };
            })
            .catch(function (erro) {
                if (erroIndicaAusencia(erro)) {
                    return { arquivo: arquivo, ausente: true };
                }

                console.log("Data Lake: falha ao ler", arquivo, "-", erro.message);
                return { arquivo: arquivo, falha: erro.message };
            });
    });

    var resultados = await Promise.all(leituras);
    var painel = {
        qualidade: null,
        inventario: null,
        faltando: [],
        falhas: []
    };

    resultados.forEach(function (resultado) {
        if (resultado.falha) {
            painel.falhas.push(resultado.arquivo);
            return;
        }

        if (resultado.ausente) {
            painel.faltando.push(resultado.arquivo);
            return;
        }

        if (resultado.arquivo === "qualidade.json") {
            painel.qualidade = resultado.dados;
        } else {
            painel.inventario = resultado.dados;
        }
    });

    var ttlSegundos = Number(valorEnv("DATA_LAKE_CACHE_SEGUNDOS", "60"));
    if (!Number.isFinite(ttlSegundos) || ttlSegundos < 0) {
        ttlSegundos = 60;
    }

    cache.set(chaveCache, {
        valor: painel,
        expiraEm: Date.now() + ttlSegundos * 1000
    });

    return painel;
}

module.exports = {
    buscarResumoGold,
    buscarPainel
};
