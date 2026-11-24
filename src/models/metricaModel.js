var database = require("../database/config");

async function cadastrarMetrica(componente_id, tipo, nome, unidade) {
    var consultaSql = `
        SELECT id_metrica
        FROM metrica
        WHERE fk_componente = ${componente_id}
          AND tipo = '${tipo}';
    `;

    var metricas = await database.executar(consultaSql);

    var resultado;

    if (metricas.length > 0) {
        resultado = {
            insertId: metricas[0].id_metrica
        };
    } else {
        var cadastroSql = `
            INSERT INTO metrica (fk_componente, tipo, nome, unidade)
            VALUES (${componente_id}, '${tipo}', '${nome}', '${unidade}');
        `;

        resultado = await database.executar(cadastroSql);
    }

    var idMetrica = Number(resultado.insertId);
    if (!Number.isSafeInteger(idMetrica) || idMetrica <= 0) {
        throw new Error("O banco não confirmou o identificador da métrica.");
    }

    var limiteMaximo = "NULL";
    if (tipo === "USO_CPU") {
        limiteMaximo = 85;
    } else if (tipo === "USO_RAM") {
        limiteMaximo = 90;
    } else if (tipo === "USO_DISCO") {
        limiteMaximo = 85;
    }

    // Também completa métricas já cadastradas, preservando configurações existentes.
    var configuracaoSql = `
        INSERT INTO config_metrica
            (fk_metrica, habilitado, intervalo_coleta, limite_minimo, limite_maximo)
        SELECT ${idMetrica}, 1, 5, NULL, ${limiteMaximo}
        WHERE NOT EXISTS (
            SELECT 1 FROM config_metrica WHERE fk_metrica = ${idMetrica}
        );
    `;

    await database.executar(configuracaoSql);

    return resultado;
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
