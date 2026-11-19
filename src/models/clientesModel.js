var database = require("../database/config");

function buscarDadosBanco(){
    var instrucaoSql = 
    `
        SELECT
            e.id_empresa,
            e.razao_social,
            e.dt_cadastro AS dt_cadastro_empresa,

            COALESCE(u.qtd_usuarios_totais, 0) AS qtd_usuarios_totais,
            COALESCE(u.qtd_gerente, 0) AS qtd_gerente,
            COALESCE(u.qtd_admin, 0) AS qtd_admin,
            COALESCE(u.qtd_usuarios, 0) AS qtd_usuarios,

            eq.id_equipamentos AS id_equipamento,
            eq.hostname AS nome_equipamento,
            eq.tipo AS tipo_equipamento

        FROM empresa e

        LEFT JOIN (
            SELECT
                u.fk_empresa,

                COUNT(CASE WHEN p.nome <> 'Root' THEN u.id_usuario END) AS qtd_usuarios_totais,

                SUM(CASE WHEN p.nome = 'Gerente' THEN 1 ELSE 0 END) AS qtd_gerente,
                SUM(CASE WHEN p.nome = 'Admin' THEN 1 ELSE 0 END) AS qtd_admin,
                SUM(CASE WHEN p.nome = 'User' THEN 1 ELSE 0 END) AS qtd_usuarios

            FROM usuario u

            INNER JOIN permissao p
                ON p.id_permissao = u.fk_permissao

            GROUP BY u.fk_empresa

        ) u ON u.fk_empresa = e.id_empresa

        LEFT JOIN equipamentos eq
            ON eq.fk_empresa = e.id_empresa

        ORDER BY e.id_empresa, eq.id_equipamentos;
    `;

    return database.executar(instrucaoSql);
}

module.exports = {
    buscarDadosBanco
};