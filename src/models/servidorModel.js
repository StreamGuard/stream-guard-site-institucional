var database = require("../database/config");

 async function cadastrar(empresa_id, codigo_agente, hostname, sistema_operacional, versao_so, arquitetura) {
    var consultaSql = `SELECT id_equipamentos, fk_equipamento FROM equipamentos WHERE codigo_agente = '${codigo_agente}'`; 

    var equipamentos = await database.executar(consultaSql);

    if(equipamentos.length > 0){
        var equipamento = equipamentos[0];
        
        if(equipamento.fk_equipamento !== Number(empresa_id)){
            throw new Error("Este agente ja está vinculado a outra empresa.");
        }

        return {
            insertId: equipamento.id_equipamentos
        }
    }

    var instrucaoSql = `
        INSERT INTO equipamentos (fk_equipamento, codigo_agente, hostname, sistema_operacional, versao_so, arquitetura)
        VALUES (${empresa_id}, '${codigo_agente}', '${hostname}', '${sistema_operacional}', '${versao_so}', '${arquitetura}');
    `;

    console.log("Executando SQL: \n" + instrucaoSql);

    return database.executar(instrucaoSql);

    
}

module.exports = {
    cadastrar,
};
