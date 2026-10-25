var database = require("../database/config");

async function criarComponente(servidor_id, tipo, nome) {
    return database.transacao(async (consultar) => {
        const servidores = await consultar(
            "SELECT id_equipamentos FROM equipamentos WHERE id_equipamentos = ? FOR UPDATE", [servidor_id]);
        if (!servidores.length) throw new Error("Servidor não encontrado.");
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