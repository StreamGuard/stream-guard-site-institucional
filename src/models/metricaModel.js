var database = require("../database/config");

function cadastrarMetrica(componente_id, tipo, nome, unidade) {
  var instrucaoSql = `
        INSERT INTO metrica (componente_id, tipo, nome, unidade)
        VALUES (${componente_id}, '${tipo}', '${nome}', '${unidade}');
    `;

  console.log("Executando SQL: \n" + instrucaoSql);

  return database.executar(instrucaoSql);
}

module.exports = {
  cadastrarMetrica,
};
