var database = require("../database/config");

function listarFuncionarios(idEmpresa) {
    var instrucaoSql = `
        SELECT
            u.id_usuario AS id,
            u.nome,
            u.email,
            u.cargo,
            u.ativo,
            u.fk_permissao,
            p.nome AS permissao
        FROM usuario u
        INNER JOIN permissao p
            ON p.id_permissao = u.fk_permissao
        WHERE u.fk_empresa = ${idEmpresa}
        ORDER BY u.nome;
    `;

    return database.executar(instrucaoSql);
}

function buscarFuncionario(idUsuario, idEmpresa) {
    var instrucaoSql = `
        SELECT
            u.id_usuario AS id,
            u.nome,
            u.email,
            u.cargo,
            u.ativo,
            u.fk_permissao,
            p.nome AS permissao
        FROM usuario u
        INNER JOIN permissao p
            ON p.id_permissao = u.fk_permissao
        WHERE u.id_usuario = ${idUsuario}
        AND u.fk_empresa = ${idEmpresa};
    `;

    return database.executar(instrucaoSql);
}

function cadastrarFuncionario(idEmpresa, nome, email, senha, idPermissao, cargo) {
    var instrucaoSql = `
        INSERT INTO usuario (
            nome,
            email,
            senha_hash,
            fk_empresa,
            fk_permissao,
            cargo,
            ativo
        )
        VALUES (
            '${nome}',
            '${email}',
            SHA2('${senha}', 256),
            ${idEmpresa},
            ${idPermissao},
            '${cargo}',
            1
        );
    `;

    return database.executar(instrucaoSql);
}

function editarFuncionario(idUsuario, idEmpresa, nome, email, idPermissao, ativo, cargo) {
    var instrucaoSql = `
        UPDATE usuario
        SET
            nome = '${nome}',
            email = '${email}',
            fk_permissao = ${idPermissao},
            ativo = ${ativo},
            cargo = '${cargo}'
        WHERE id_usuario = ${idUsuario}
        AND fk_empresa = ${idEmpresa};
    `;

    return database.executar(instrucaoSql);
}

function excluirFuncionario(idUsuario, idEmpresa) {
    var instrucaoSql = `
        DELETE FROM usuario
        WHERE id_usuario = ${idUsuario}
        AND fk_empresa = ${idEmpresa};
    `;

    return database.executar(instrucaoSql);
}

// A empresa StreamGuard é a que possui usuários Root (permissao 1).
function empresaTemRoot(idEmpresa) {
    var instrucaoSql = `
        SELECT COUNT(*) AS total
        FROM usuario
        WHERE fk_empresa = ${idEmpresa}
        AND fk_permissao = 1;
    `;

    return database.executar(instrucaoSql);
}

module.exports = {
    empresaTemRoot,
    listarFuncionarios,
    buscarFuncionario,
    cadastrarFuncionario,
    editarFuncionario,
    excluirFuncionario
};
