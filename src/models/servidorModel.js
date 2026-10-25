var database = require("../database/config");

 async function cadastrar(empresa_id, codigo_agente, hostname, sistema_operacional, versao_so, arquitetura) {
    return database.transacao(async (consultar) => {
        const empresas = await consultar("SELECT id_empresa FROM empresa WHERE id_empresa = ? FOR UPDATE", [empresa_id]);
        if (!empresas.length) throw new Error("Empresa não encontrada.");
        const equipamentos = await consultar(
            "SELECT id_equipamentos, fk_equipamento FROM equipamentos WHERE codigo_agente = ? FOR UPDATE", [codigo_agente]);
        if (equipamentos.length) {
            if (equipamentos[0].fk_equipamento !== Number(empresa_id)) {
                throw new Error("Este agente ja está vinculado a outra empresa.");
            }
            return {
                insertId: equipamentos[0].id_equipamentos
            };
        }
        return consultar(`INSERT INTO equipamentos
            (fk_equipamento, codigo_agente, hostname, sistema_operacional, versao_so, arquitetura)
            VALUES (?, ?, ?, ?, ?, ?)`,
        [empresa_id, codigo_agente, hostname, sistema_operacional, versao_so, arquitetura]);
    });
}

module.exports = {
    cadastrar,
};
