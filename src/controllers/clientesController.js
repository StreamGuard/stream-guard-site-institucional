var clientesModel = require("../models/clientesModel");

function buscarDadosBanco(req, res) {

    clientesModel.buscarDadosBanco()
        .then(function (resultado) {

            // O banco devolve uma linha por equipamento; aqui vira uma empresa por objeto.
            const empresas = {};

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
                    empresas[item.id_empresa].servidores.push({
                        id: item.id_equipamento,
                        nome: item.nome_equipamento,
                        tipo: item.tipo_equipamento
                    });
                }

            });

            res.status(200).json({
                mensagem: "Dados retornados com sucesso",
                dados: { empresas: Object.values(empresas) }
            });

        })
        .catch(function (erro) {
            console.log(erro);
            res.status(500).json({ mensagem: "Erro ao buscar dados" });
        });
}

module.exports = {
    buscarDadosBanco
};
