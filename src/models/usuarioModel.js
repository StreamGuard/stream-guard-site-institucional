var database = require("../database/config");

function autenticar(email, senha) {
  console.log(
    "ACESSEI O USUARIO MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function entrar(): ",
    email,
    senha,
  );

  var instrucaoSql = `
        SELECT u.id_usuario, u.nome, u.email, u.cargo, u.fk_empresa, e.razao_social as nome_empresa FROM usuario u JOIN empresa e ON e.id_empresa = u.fk_empresa WHERE u.email = '${email}' AND senha_hash = SHA2('${senha}',256);
    `;

  console.log("Executando a instrução SQL: \n" + instrucaoSql);
  return database.executar(instrucaoSql);
}

function cadastrar(codigo_empresa, nome, cargo, email, senha) {
  var instrucaoSql = `
        INSERT INTO usuario (
            fk_empresa,
            nome,
            cargo,
            email,
            senha_hash,
            fk_permissao
        )
        SELECT
            id_empresa,
            '${nome}',
            '${cargo}',
            '${email}',
            SHA2('${senha}', 256),
            4
        FROM empresa
        WHERE codigo_empresa = '${codigo_empresa}';
    `;

  console.log("Executando a instrução SQL: \n" + instrucaoSql);

  return database.executar(instrucaoSql);
}

module.exports = {
  autenticar,
  cadastrar,
};
