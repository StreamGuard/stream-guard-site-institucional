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

module.exports = {
    cadastrarMetrica
};