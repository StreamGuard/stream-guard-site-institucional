var clientesModel = require("../models/clientesModel");
var dataLakeModel = require("../models/dataLakeModel");

var PRECO_GB_MES = 0.023;
var PERIODOS_REJEICAO = [7, 30, 90];

function numero(valor) {
    var convertido = Number(valor);
    return Number.isFinite(convertido) ? convertido : 0;
}

function arredondar(valor, casas) {
    var fator = Math.pow(10, casas);
    return Math.round(numero(valor) * fator) / fator;
}

function diasDoQualidade(qualidade) {
    if (!qualidade || !qualidade.dias || typeof qualidade.dias !== "object") {
        return [];
    }

    return Object.keys(qualidade.dias).sort();
}

function contagemDoServidor(qualidade, dia, idServidor) {
    if (!qualidade || !qualidade.dias || !qualidade.dias[dia]) return null;

    var servidores = qualidade.dias[dia].servidores;
    if (!servidores) return null;

    return servidores[String(idServidor)] || null;
}

// Soma os últimos N registros diários do qualidade.json para cada período da tela.
function totaisPorPeriodo(qualidade, idServidor) {
    var dias = diasDoQualidade(qualidade);
    var totais = {};

    PERIODOS_REJEICAO.forEach(function (periodo) {
        var recebidas = 0;
        var rejeitadas = 0;

        dias.slice(-periodo).forEach(function (dia) {
            var doServidor = contagemDoServidor(qualidade, dia, idServidor);
            if (!doServidor) return;

            recebidas += numero(doServidor.linhas_recebidas);
            rejeitadas += numero(doServidor.linhas_rejeitadas);
        });

        totais[periodo] = {
            linhas_recebidas: recebidas,
            linhas_rejeitadas: rejeitadas
        };
    });

    return totais;
}

function motivoPrincipal(qualidade, idServidor) {
    var motivos = {};

    diasDoQualidade(qualidade).slice(-30).forEach(function (dia) {
        var doServidor = contagemDoServidor(qualidade, dia, idServidor);
        if (!doServidor || !doServidor.motivos) return;

        Object.keys(doServidor.motivos).forEach(function (motivo) {
            motivos[motivo] = numero(motivos[motivo]) + numero(doServidor.motivos[motivo]);
        });
    });

    var principal = Object.keys(motivos).sort(function (a, b) {
        return motivos[b] - motivos[a];
    })[0];

    return principal || null;
}

function listaRejeicoesPorDia(qualidade) {
    return diasDoQualidade(qualidade).map(function (dia) {
        var doDia = qualidade.dias[dia] || {};

        return {
            dia: dia,
            linhas_recebidas: numero(doDia.linhas_recebidas),
            linhas_rejeitadas: numero(doDia.linhas_rejeitadas)
        };
    });
}

function listaCrescimento(inventario) {
    if (!inventario || !Array.isArray(inventario.crescimento_bronze)) {
        return [];
    }

    return inventario.crescimento_bronze
        .filter(function (item) {
            return item && item.dia;
        })
        .map(function (item) {
            return {
                dia: String(item.dia),
                gb_adicionados: arredondar(item.gb_adicionados, 3)
            };
        })
        .sort(function (a, b) {
            return a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : 0;
        });
}

function crescimentoSemana(crescimento) {
    var total = crescimento.slice(-7).reduce(function (soma, item) {
        return soma + numero(item.gb_adicionados);
    }, 0);

    return arredondar(total, 3);
}

function listaExecucoes(qualidade) {
    if (!qualidade || !Array.isArray(qualidade.execucoes)) {
        return [];
    }

    return qualidade.execucoes
        .filter(function (execucao) {
            return execucao && execucao.inicio;
        })
        .slice()
        .sort(function (a, b) {
            return new Date(b.inicio) - new Date(a.inicio);
        })
        .slice(0, 20);
}

function empresasDoBanco(resultado) {
    var empresas = {};
    var ids = new Set();

    resultado.forEach(function (item) {
        if (!empresas[item.id_empresa]) {
            empresas[item.id_empresa] = {
                id: item.id_empresa,
                nome: item.razao_social,
                servidores: []
            };
        }

        if (item.id_equipamento !== null) {
            ids.add(String(item.id_empresa));
            empresas[item.id_empresa].servidores.push({
                id: String(item.id_equipamento),
                nome: item.nome_equipamento || null,
                tipo: item.tipo_equipamento || null
            });
        }
    });

    return {
        empresas: Object.values(empresas),
        ids: Array.from(ids)
    };
}

function volumesDaEmpresa(inventario, idEmpresa) {
    if (!inventario || !inventario.empresas) return null;

    var empresa = inventario.empresas[String(idEmpresa)];
    if (!empresa) return null;

    return {
        bronze: numero(empresa.bronze_gb),
        silver: numero(empresa.silver_gb),
        gold: numero(empresa.gold_gb)
    };
}

// O Silver e o Gold são gravados por empresa; o rateio usa o peso do Bronze de cada servidor.
function volumesDoServidor(inventario, servidor, volumesEmpresa, quantidadeServidores) {
    if (!inventario || !volumesEmpresa) {
        return { bronze_gb: null, silver_gb: null, gold_gb: null };
    }

    var bronzeServidor = inventario.servidores_bronze_gb
        ? numero(inventario.servidores_bronze_gb[servidor.id])
        : 0;

    var peso = volumesEmpresa.bronze > 0
        ? bronzeServidor / volumesEmpresa.bronze
        : (quantidadeServidores > 0 ? 1 / quantidadeServidores : 0);

    return {
        bronze_gb: arredondar(bronzeServidor, 3),
        silver_gb: arredondar(volumesEmpresa.silver * peso, 3),
        gold_gb: arredondar(volumesEmpresa.gold * peso, 3)
    };
}

function montarAviso(faltando, falhas) {
    if (falhas && falhas.length > 0) {
        var texto = "Não foi possível ler " + falhas.join(" e ") + " no bucket. Verifique as credenciais e a região da AWS.";

        if (faltando && faltando.length > 0) {
            texto += " Também não encontrado: " + faltando.join(" e ") + ".";
        }

        return texto;
    }

    if (!faltando || faltando.length === 0) return null;

    var semQualidade = faltando.indexOf("qualidade.json") !== -1;
    var semInventario = faltando.indexOf("inventario.json") !== -1;

    if (semQualidade && semInventario) {
        return "Os arquivos datalake/qualidade.json e datalake/inventario.json ainda não estão no bucket. Volume, rejeições e execuções aparecem como indisponíveis.";
    }

    if (semQualidade) {
        return "O arquivo datalake/qualidade.json ainda não está no bucket. Rejeições e execuções aparecem como indisponíveis.";
    }

    return "O arquivo datalake/inventario.json ainda não está no bucket. Volume e crescimento aparecem como indisponíveis.";
}

async function buscarDadosETL(req, res) {
    try {
        const resultado = await clientesModel.buscarDadosBanco(30);
        const { empresas, ids } = empresasDoBanco(resultado);

        let gold = null;
        try {
            gold = await dataLakeModel.buscarResumoGold(ids, "30d");
        } catch (erroGold) {
            console.log("Falha ao consultar o Gold:", erroGold.message);
        }

        let painel = null;
        try {
            painel = await dataLakeModel.buscarPainel();
        } catch (erroPainel) {
            console.log("Falha ao consultar o painel do Data Lake:", erroPainel.message);
        }

        const inventario = painel ? painel.inventario : null;
        const qualidade = painel ? painel.qualidade : null;
        const faltando = painel && Array.isArray(painel.faltando)
            ? painel.faltando
            : ["qualidade.json", "inventario.json"];
        const falhas = painel && Array.isArray(painel.falhas)
            ? painel.falhas
            : [];

        const crescimento = listaCrescimento(inventario);
        const servidores = [];

        empresas.forEach(function (empresa) {
            const volumesEmpresa = volumesDaEmpresa(inventario, empresa.id);
            const quantidade = empresa.servidores.length;

            empresa.servidores.forEach(function (servidor) {
                const volumes = volumesDoServidor(inventario, servidor, volumesEmpresa, quantidade);
                const doGold = gold && gold.servidores ? gold.servidores[servidor.id] : null;

                servidores.push({
                    id: servidor.id,
                    empresa_id: empresa.id,
                    bronze_gb: volumes.bronze_gb,
                    silver_gb: volumes.silver_gb,
                    gold_gb: volumes.gold_gb,
                    ultimo_lote_em: doGold ? doGold.ultimo_lote_em : null,
                    cobertura_pct: doGold && doGold.cobertura_pct !== undefined
                        ? doGold.cobertura_pct
                        : null,
                    motivo_principal_rejeicao: motivoPrincipal(qualidade, servidor.id),
                    rejeicoes_por_periodo: qualidade
                        ? totaisPorPeriodo(qualidade, servidor.id)
                        : null
                });
            });
        });

        const camadas = inventario && inventario.camadas
            ? {
                bronze_gb: arredondar(inventario.camadas.bronze_gb, 3),
                silver_gb: arredondar(inventario.camadas.silver_gb, 3),
                gold_gb: arredondar(inventario.camadas.gold_gb, 3)
            }
            : null;

        const dados = {
            gerado_em: inventario ? inventario.gerado_em || null : null,
            preco_gb_mes: PRECO_GB_MES,
            camadas: camadas,
            crescimento_gb_semana: inventario ? crescimentoSemana(crescimento) : null,
            ultimo_gold_em: gold ? gold.ultimo_gold_em : null,
            empresas: empresas.map(function (empresa) {
                return { id: empresa.id, nome: empresa.nome };
            }),
            servidores: servidores,
            crescimento_bronze: crescimento,
            rejeicoes_por_dia: qualidade ? listaRejeicoesPorDia(qualidade) : [],
            execucoes: qualidade ? listaExecucoes(qualidade) : [],
            fontes: {
                inventario: Boolean(inventario),
                qualidade: Boolean(qualidade)
            },
            aviso: montarAviso(faltando, falhas)
        };

        res.status(200).json({
            mensagem: "Dados do Data Lake retornados com sucesso",
            dados
        });

    } catch (erro) {
        console.log(erro);
        res.status(500).json({ mensagem: "Erro ao buscar dados do Data Lake" });
    }
}

module.exports = {
    buscarDadosETL
};
