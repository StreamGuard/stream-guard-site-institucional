var database = require("../database/config");

function cadastrar(empresa_id, codigo_agente, hostname, sistema_operacional, versao_so, arquitetura) {
    var instrucaoSql = `
        INSERT INTO servidor (empresa_id, codigo_agente, hostname, sistema_operacional, versao_so, arquitetura)
        VALUES (${empresa_id}, '${codigo_agente}', '${hostname}', '${sistema_operacional}', '${versao_so}', '${arquitetura}');
    `;

    console.log("Executando SQL: \n" + instrucaoSql);

    return database.executar(instrucaoSql);
}

module.exports = {
    cadastrar,
};
