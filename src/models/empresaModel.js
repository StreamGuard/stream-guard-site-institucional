var database = require("../database/config");

function gerarCodigoEmpresa() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function cadastrar(razaoSocial, cnpj) {
    var codigoEmpresa = gerarCodigoEmpresa();
    var instrucaoSql = `
        INSERT INTO empresa (razao_social, cnpj, codigo_empresa, criado_em, atualizado_em)
        VALUES ('${razaoSocial}', '${cnpj}', '${codigoEmpresa}', NOW(), NOW());
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