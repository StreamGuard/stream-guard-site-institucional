var database = require("../database/config");

function cadastrar(razaoSocial, cnpj, codigoEmpresa) {
    var instrucaoSql = `
        INSERT INTO empresa (razao_social, cnpj, codigo_empresa)
        VALUES ('${razaoSocial}', '${cnpj}', '${codigoEmpresa}');
    `;
    return database.executar(instrucaoSql);
}

function buscarPorCnpj(cnpj) {
    var instrucaoSql = `
        SELECT id FROM empresa WHERE cnpj = '${cnpj}';
    `;
    return database.executar(instrucaoSql);
}

module.exports = {
    cadastrar,
    buscarPorCnpj,
};
