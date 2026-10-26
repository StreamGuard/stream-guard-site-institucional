var database = require("../database/config");

var usuarioModel = require("./usuarioModel");

 async function cadastrar(empresa_id, codigo_agente, hostname, sistema_operacional, versao_so, arquitetura, usuario_id, codigos_anteriores = []) {
    return database.transacao(async (consultar) => {
        const empresa = await usuarioModel.obterEmpresa(consultar, usuario_id);
        if (empresa_id !== undefined && empresa_id !== empresa) {
            throw Object.assign(new Error("Empresa não autorizada."), { status: 403 });
        }
        await consultar("SELECT id_empresa FROM empresa WHERE id_empresa = ? FOR UPDATE", [empresa]);
        const codigos = [...new Set([codigo_agente, ...codigos_anteriores])];
        const equipamentos = await consultar(
            "SELECT id_equipamentos, fk_equipamento, codigo_agente, hostname, sistema_operacional, versao_so, arquitetura FROM equipamentos WHERE codigo_agente IN (" +
            codigos.map(() => "?").join(", ") + ") FOR UPDATE", codigos);
        if (equipamentos.length > 1) {
            throw Object.assign(new Error("Identidades conflitantes; revise os cadastros existentes antes de vincular a instalação."), { status: 409 });
        }
        if (equipamentos.length) {
            if (equipamentos[0].fk_equipamento !== empresa) {
                throw Object.assign(new Error("Identidade vinculada a outra empresa."), { status: 403 });
            }
            return {
                insertId: equipamentos[0].id_equipamentos,
                servidor: equipamentos[0]
            };
        }
        const resultado = await consultar(`INSERT INTO equipamentos
            (fk_equipamento, codigo_agente, hostname, sistema_operacional, versao_so, arquitetura)
            VALUES (?, ?, ?, ?, ?, ?)`,
        [empresa, codigo_agente, hostname, sistema_operacional, versao_so, arquitetura]);
        return {
            insertId: resultado.insertId,
            servidor: { fk_equipamento: empresa, codigo_agente, hostname, sistema_operacional, versao_so, arquitetura }
        };
    });
}

module.exports = {
    cadastrar,
};
