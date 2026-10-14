var database = require("../database/config");

async function criarComponente(servidor_id, tipo, nome) {
    var consultaSql = `SELECT id_componente FROM componente WHERE fk_servidor = ${servidor_id} AND tipo = '${tipo}' AND nome = '${nome}';
    `;

    var componentes = await database.executar(consultaSql);

    if (componentes.length > 0) {
        return {
            insertId: componentes[0].id_componente
        };
    }

    var cadastroSql = `
        INSERT INTO componente (fk_servidor, tipo, nome) VALUES (${servidor_id}, '${tipo}', '${nome}');
    `;
    return database.executar(cadastroSql);
}

function buscarComponentes(){
    var instrucaoSql = `SELECT * FROM componente`;
    return database.executar(instrucaoSql);
}

module.exports = {
    criarComponente,
    buscarComponentes
};