
var database = require("../database/config");

function buscarPerfil(idUsuario) {
    var instrucaoSql = `
        SELECT
            u.id_usuario AS id,
            u.nome,
            u.email,
            u.cargo,
            u.fk_empresa AS empresa_id,
            e.razao_social AS nome_empresa,
            p.nome AS permissao
        FROM usuario u
        JOIN empresa e ON e.id_empresa = u.fk_empresa
        JOIN permissao p ON p.id_permissao = u.fk_permissao
        WHERE u.id_usuario = ${idUsuario};
    `;

    return database.executar(instrucaoSql);
}

function atualizarDados(idUsuario, nome, email, cargo) {
    var instrucaoSql = `
        UPDATE usuario
        SET
            nome = '${nome}',
            email = '${email}',
            cargo = '${cargo}'
        WHERE id_usuario = ${idUsuario};
    `;

    return database.executar(instrucaoSql);
}


function alterarSenha(idUsuario, senhaAtual, senhaNova) {
    var instrucaoSql = `
        UPDATE usuario
        SET senha_hash = SHA2('${senhaNova}', 256)
        WHERE id_usuario = ${idUsuario}
        AND senha_hash = SHA2('${senhaAtual}', 256);
    `;

    return database.executar(instrucaoSql);
}

function atualizarUltimoAcesso(idUsuario) {
    var instrucaoSql = `
        UPDATE usuario
        SET dt_ultimo_acesso = NOW()
        WHERE id_usuario = ${idUsuario};
    `;

    return database.executar(instrucaoSql);
}

module.exports = {
    buscarPerfil,
    atualizarDados,
    alterarSenha,
    atualizarUltimoAcesso
};
