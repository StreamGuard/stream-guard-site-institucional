var database = require("../database/config");

function autenticar(email, senha) {
    console.log(
        "ACESSEI O USUARIO MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function entrar(): ",
        email,
        senha,
    );
    var instrucaoSql = `
        SELECT u.id, u.nome, u.email, u.cargo, u.empresa_id, e.razao_social as nome_empresa FROM usuario u JOIN empresa e ON e.id = u.empresa_id WHERE email = '${email}' AND senha_hash = SHA2('${senha}',256);
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

module.exports = {
    autenticar,
};
