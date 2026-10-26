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

async function obterEmpresa(consultar, usuario_id) {
  if (!Number.isSafeInteger(usuario_id) || usuario_id <= 0) {
    throw Object.assign(new Error("Sessão ausente ou expirada."), { status: 401 });
  }
  const usuarios = await consultar("SELECT fk_empresa FROM usuario WHERE id_usuario = ? FOR UPDATE", [usuario_id]);
  if (usuarios.length !== 1 || !usuarios[0].fk_empresa) {
    throw Object.assign(new Error("Usuário sem empresa autorizada."), { status: 403 });
  }
  return usuarios[0].fk_empresa;
}

module.exports = {
  autenticar,
  obterEmpresa,
  cadastrar,
};
