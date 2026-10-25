var database = require("../database/config");

function autenticar(email, senha) {
  var instrucaoSql = `
        SELECT u.id_usuario AS id, u.nome, u.email, u.cargo, u.fk_empresa AS empresa_id, e.razao_social AS nome_empresa, p.nome AS permissao FROM usuario u JOIN empresa e ON e.id_empresa = u.fk_empresa JOIN permissao p ON p.id_permissao = u.fk_permissao WHERE u.email = ? AND senha_hash = SHA2(?,256);
    `;

  return database.executar(instrucaoSql, [email, senha]);
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
            ?,
            ?,
            ?,
            SHA2(?, 256),
            4
        FROM empresa
        WHERE codigo_empresa = ?;
    `;

  return database.executar(instrucaoSql, [nome, cargo, email, senha, codigo_empresa]);
}

module.exports = {
  autenticar,
  cadastrar,
};
