var mysql = require("mysql2/promise");

function conectar() {
    if (!["producao", "desenvolvimento"].includes(process.env.AMBIENTE_PROCESSO)) {
        throw new Error("AMBIENTE NÃO CONFIGURADO EM .env");
    }
    return mysql.createConnection({
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT
    });
}

async function executar(instrucao, parametros = []) {
    const conexao = await conectar();
    try {
        const [resultados] = await conexao.query(instrucao, parametros);
        return resultados;
    } finally {
        await conexao.end();
    }
}

async function transacao(operacao) {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
        const conexao = await conectar();
        try {
            await conexao.beginTransaction();
            const consultar = async (sql, parametros = []) => {
                const [resultado] = await conexao.query(sql, parametros);
                return resultado;
            };
            const resultado = await operacao(consultar);
            await conexao.commit();
            return resultado;
        } catch (erro) {
            await conexao.rollback();
            // O InnoDB desfaz a transação vítima; repete toda a operação, nunca só o INSERT.
            if (erro.code !== "ER_LOCK_DEADLOCK" || tentativa === 2) throw erro;
        } finally {
            await conexao.end();
        }
    }
}

module.exports = {
    executar,
    transacao
};