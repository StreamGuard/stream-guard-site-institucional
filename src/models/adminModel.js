var database = require("../database/config");

function buscarDadosBanco() {

    var instrucaoSql = `
        SELECT
            e.id_empresa,
            e.razao_social,
            e.codigo_empresa,
            COUNT(eq.id_equipamentos) AS qtd_equipamentos

        FROM empresa e

        LEFT JOIN equipamentos eq
            ON eq.fk_empresa = e.id_empresa

        GROUP BY
            e.id_empresa,
            e.razao_social,
            e.codigo_empresa

        ORDER BY e.id_empresa;
    `;

    return database.executar(instrucaoSql);
}

module.exports = {
    buscarDadosBanco
};