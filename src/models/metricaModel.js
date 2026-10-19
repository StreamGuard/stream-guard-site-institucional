var database = require("../database/config");

async function cadastrarMetrica(componente_id, tipo, nome, unidade) {
    var consultaSql = `
        SELECT id_metrica
        FROM metrica
        WHERE fk_componente = ${componente_id}
          AND tipo = '${tipo}';
    `;

    var metricas = await database.executar(consultaSql);

    if (metricas.length > 0) {
        return {
            insertId: metricas[0].id_metrica
        };
    }

    var cadastroSql = `
        INSERT INTO metrica (fk_componente, tipo, nome, unidade)
        VALUES (${componente_id}, '${tipo}', '${nome}', '${unidade}');
    `;

    return database.executar(cadastroSql);
}

function buscarConfiguracoes(servidor_id) {
    var consultaSql = `
        SELECT
            m.id_metrica,
            m.tipo,
            m.unidade,
            c.tipo AS componente,
            cm.id_config_metrica,
            cm.habilitado,
            cm.intervalo_coleta,
            cm.limite_minimo,
            cm.limite_maximo
        FROM componente c
        JOIN metrica m
            ON m.fk_componente = c.id_componente
        LEFT JOIN config_metrica cm
            ON cm.fk_metrica = m.id_metrica
        WHERE c.fk_servidor = ${servidor_id}
        ORDER BY m.id_metrica, cm.id_config_metrica;
    `;

    return database.executar(consultaSql);
}

module.exports = {
    cadastrarMetrica,
    buscarConfiguracoes
};