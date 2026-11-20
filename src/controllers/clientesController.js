var clientesModel = require("../models/clientesModel");
var dataLakeModel = require("../models/dataLakeModel");

async function buscarDadosBanco(req, res) {

    try {
        const resultado = await clientesModel.buscarDadosBanco();

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
                        admin: Number(item.qtd_admin)
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
                    tipo: item.tipo_equipamento
                });
            }

        });

        let lake = null;

        try {
            lake = await dataLakeModel.buscarResumoGold(Array.from(idsEmpresas));
        } catch (erroLake) {
            console.log("Falha ao consultar o Data Lake:", erroLake.message);
        }

        if (lake) {
            Object.values(empresas).forEach(empresa => {
                empresa.servidores.forEach(servidor => {
                    const resumo = lake.servidores[String(servidor.id)];
                    if (resumo) {
                        servidor.ultimo_lote_em = resumo.ultimo_lote_em;
                        servidor.cobertura_pct = resumo.cobertura_pct;
                    }
                });
            });
        }

        const dados = { empresas: Object.values(empresas) };

        if (lake && lake.ultimo_gold_em) {
            dados.data_lake = { ultimo_gold_em: lake.ultimo_gold_em };
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
