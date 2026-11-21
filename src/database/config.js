var mysql = require("mysql2");

// CONEXÃO DO BANCO MYSQL SERVER
var mySqlConfig = {
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    charset: "UTF8MB4_UNICODE_CI"
};

function executar(instrucao) {

    if (process.env.AMBIENTE_PROCESSO !== "producao" && process.env.AMBIENTE_PROCESSO !== "desenvolvimento") {
        console.log("\nO AMBIENTE (produção OU desenvolvimento) NÃO FOI DEFINIDO EM .env OU dev.env OU app.js\n");
        return Promise.reject("AMBIENTE NÃO CONFIGURADO EM .env");
    }

    return new Promise(function (resolve, reject) {
        var conexao = mysql.createConnection(mySqlConfig);
        conexao.connect();
        conexao.query(instrucao, function (erro, resultados) {
            conexao.end();
            if (erro) {
                reject(erro);
            }
            console.log(resultados);
            resolve(resultados);
        });
        conexao.on('error', function (erro) {
            return ("ERRO NO MySQL SERVER: ", erro.sqlMessage);
        });
    });
}

// Uma conexão por transação mantém cadastro e vínculos consistentes.
async function transacao(operacao) {
    const conexao = await require("mysql2/promise").createConnection(mySqlConfig);
    try {
        await conexao.beginTransaction();
        const consultar = async (sql, parametros = []) => {
            const [resultado] = await conexao.execute(sql, parametros);
            return resultado;
        };
        const resultado = await operacao(consultar);
        await conexao.commit();
        return resultado;
    } catch (erro) {
        await conexao.rollback();
        throw erro;
    } finally {
        await conexao.end();
    }
}

module.exports = { executar, transacao };
