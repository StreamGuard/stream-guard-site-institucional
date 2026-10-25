var database = require("../database/config");
var usuarioModel = require("./usuarioModel");

async function criarComponente(servidor_id, tipo, nome, usuario_id) {
    return database.transacao(async (consultar) => {
        const empresa = await usuarioModel.obterEmpresa(consultar, usuario_id);
        const servidores = await consultar(
            "SELECT id_equipamentos FROM equipamentos WHERE id_equipamentos = ? AND fk_equipamento = ? FOR UPDATE", [servidor_id, empresa]);
        if (!servidores.length) throw Object.assign(new Error("Servidor não autorizado."), { status: 403 });
        const componentes = await consultar(`SELECT id_componente FROM componente
            WHERE fk_servidor = ? AND tipo = ? AND nome <=> ? FOR UPDATE`, [servidor_id, tipo, nome ?? null]);
        if (componentes.length) {
            return {
                insertId: componentes[0].id_componente
            };
        }
        return consultar("INSERT INTO componente (fk_servidor, tipo, nome) VALUES (?, ?, ?)",
            [servidor_id, tipo, nome ?? null]);
    });
}

function buscarComponentes(){
    var instrucaoSql = `SELECT * FROM componente`;
    return database.executar(instrucaoSql);
}

module.exports = {
    criarComponente,
    buscarComponentes
};