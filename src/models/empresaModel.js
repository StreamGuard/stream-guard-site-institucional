var database = require("../database/config");

function cadastrar(razaoSocial, cnpj, codigoEmpresa) {
    var instrucaoSql = `
        INSERT INTO empresa (razao_social, cnpj, codigo_empresa)
        VALUES (?, ?, ?);
    `;
    return database.executar(instrucaoSql, [razaoSocial, cnpj, codigoEmpresa]);
}

function buscarPorCnpj(cnpj) {
    var instrucaoSql = `
        SELECT id_empresa FROM empresa WHERE cnpj = ?;
    `;
    return database.executar(instrucaoSql, [cnpj]);
}

function buscarPorCodigoEmpresa(codigoEmpresa) {
    var instrucaoSql = `SELECT id_empresa FROM empresa WHERE codigo_empresa = ?`;
    return database.executar(instrucaoSql, [codigoEmpresa]);
}

module.exports = {
    cadastrar,
    buscarPorCnpj,
    buscarPorCodigoEmpresa
};
