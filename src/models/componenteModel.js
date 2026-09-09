var database = require("../database/config");

function criarComponente(servidor_id, tipo, nome) {
    var instrucaoSql = `INSERT INTO componente (servidor_id, tipo, nome) 
               VALUES (${servidor_id}, '${tipo}', '${nome}')`;
    return database.executar(instrucaoSql);
}

function buscarComponentes(){
    var instrucaoSql = `SELECT * FROM componente`;
    return database.executar(instrucaoSql);
}

module.exports = {
    criarComponente,
    buscarComponentes
};