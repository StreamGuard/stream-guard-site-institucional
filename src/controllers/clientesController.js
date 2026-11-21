var clientesModel = require("../models/clientesModel");
var dataLakeModel = require("../models/dataLakeModel");

var PERIODO_PADRAO = "7d";

// Somente estes períodos podem chegar ao SQL; o número de dias é fixo e seguro.
var PERIODOS = {
    "24h": { dias: 1 },
    "7d": { dias: 7 },
    "30d": { dias: 30 }
};

function periodoDaRequisicao(valor) {
    var chave = String(valor || "").toLowerCase();

    if (!PERIODOS[chave]) {
        chave = PERIODO_PADRAO;
    }

    return {
        chave: chave,
        dias: PERIODOS[chave].dias
    };
}

async function buscarDadosBanco(req, res) {

    try {
        var periodo = periodoDaRequisicao(req.query.periodo);
        const resultado = await clientesModel.buscarDadosBanco(periodo.dias);

        // O banco devolve uma linha por equipamento; aqui vira uma empresa por objeto.
        const empresas = {};
        const idsEmpresas = new Set();

        resultado.forEach(item => {

            if (!empresas[item.id_empresa]) {
                empresas[item.id_empresa] = {
                    id: item.id_empresa,
                    nome: item.razao_social,
                    criada_em: item.dt_cadastro_empresa,
                    usuarios: {
                        usuario: Number(item.qtd_usuarios),
                        gerente: Number(item.qtd_gerente),
                        admin: Number(item.qtd_admin),
                        ativos_periodo: Number(item.qtd_usuarios_ativos)
                    },
                    alertas_7d: 0, // depende da tabela de alertas (ainda não definida)
                    servidores: []
                };
            }

            if (item.id_equipamento !== null) {
                // O gold é lido por empresa; o servidor é identificado pelo servidor_id no JSON.
                idsEmpresas.add(String(item.id_empresa));
                empresas[item.id_empresa].servidores.push({
                    id: item.id_equipamento,
                    nome: item.nome_equipamento,
                    tipo: item.tipo_equipamento,
                    atualizado_em: item.dt_atualizacao_equipamento
                });
            }

        });

        let lake = null;
        let lakeHistorico = null;

        try {
            lake = await dataLakeModel.buscarResumoGold(Array.from(idsEmpresas), periodo.chave);
        } catch (erroLake) {
            console.log("Falha ao consultar o Data Lake:", erroLake.message);
        }

        // Para separar "dormente" (já enviou dado) de "agente parado" (nunca enviou),
        // olha também a maior janela do Gold (30 dias). Em 30d é o próprio resumo.
        try {
            lakeHistorico = periodo.chave === "30d"
                ? lake
                : await dataLakeModel.buscarResumoGold(Array.from(idsEmpresas), "30d");
        } catch (erroHistorico) {
            console.log("Falha ao consultar o histórico do Data Lake:", erroHistorico.message);
        }

        if (lake || lakeHistorico) {
            Object.values(empresas).forEach(empresa => {
                empresa.servidores.forEach(servidor => {
                    const id = String(servidor.id);
                    const resumo = lake ? lake.servidores[id] : null;
                    const historico = lakeHistorico ? lakeHistorico.servidores[id] : null;

                    if (resumo) {
                        servidor.ultimo_lote_em = resumo.ultimo_lote_em;
                        servidor.cobertura_pct = resumo.cobertura_pct;
                    }

                    if (historico) {
                        servidor.ultimo_lote_30d_em = historico.ultimo_lote_em;
                    }
                });
            });
        }

        const dados = {
            periodo: periodo.chave,
            periodo_dias: periodo.dias,
            empresas: Object.values(empresas)
        };

        if (lake && lake.ultimo_gold_em) {
            dados.data_lake = {
                periodo: periodo.chave,
                ultimo_gold_em: lake.ultimo_gold_em
            };
        }

        res.status(200).json({
            mensagem: "Dados retornados com sucesso",
            dados
        });

    } catch (erro) {
        console.log(erro);
        res.status(500).json({ mensagem: "Erro ao buscar dados" });
    }
}

module.exports = {
    buscarDadosBanco
};