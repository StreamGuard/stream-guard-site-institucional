const database = require("../database/config");

const COMPONENTES = { CPU: "CPU", RAM: "RAM", DISCO: "Armazenamento", REDE: "REDE" };
const METRICAS = {
    USO_CPU: ["CPU", "%"], CARGA_CPU_1M: ["CPU", "load"],
    CARGA_CPU_5M: ["CPU", "load"], CARGA_CPU_15M: ["CPU", "load"],
    USO_RAM: ["RAM", "%"], RAM_DISPONIVEL: ["RAM", "bytes"],
    USO_DISCO: ["DISCO", "%"], TAXA_LEITURA_DISCO: ["DISCO", "bytes/s"],
    TAXA_ESCRITA_DISCO: ["DISCO", "bytes/s"],
    TAXA_ENVIO_REDE: ["REDE", "bytes/s"], TAXA_RECEBIMENTO_REDE: ["REDE", "bytes/s"]
};

function erro(mensagem, status = 409) {
    return Object.assign(new Error(mensagem), { status });
}

// Confere o vínculo no banco; os IDs recebidos não substituem autenticação de servidor.
async function validarServidor(consultar, servidor, empresa) {
    const registros = await consultar(
        "SELECT id_equipamentos FROM equipamentos WHERE id_equipamentos = ? AND fk_empresa = ? FOR UPDATE",
        [servidor, empresa]);
    if (!registros.length) throw erro("Servidor não pertence à empresa informada.", 403);
}

async function componente(dados) {
    return database.transacao(async consultar => {
        await validarServidor(consultar, dados.servidor_id, dados.empresa_id);
        const tipoBanco = COMPONENTES[dados.tipo];
        // O banco usa um catálogo global por tipo; o vínculo identifica o equipamento.
        await consultar(`INSERT INTO componente (nome, tipo) VALUES (?, ?)
            ON DUPLICATE KEY UPDATE id_componente = id_componente`, [dados.nome, tipoBanco]);
        const [componente] = await consultar("SELECT id_componente, nome FROM componente WHERE tipo = ? FOR UPDATE", [tipoBanco]);
        await consultar(`INSERT INTO equipamento_componente (fk_equipamento, fk_componente, data_instalacao, status)
            VALUES (?, ?, NOW(), 'Ativo') ON DUPLICATE KEY UPDATE id_equipamento_componente = id_equipamento_componente`,
        [dados.servidor_id, componente.id_componente]);
        const [vinculo] = await consultar(`SELECT id_equipamento_componente FROM equipamento_componente
            WHERE fk_equipamento = ? AND fk_componente = ?`, [dados.servidor_id, componente.id_componente]);
        return { id: componente.id_componente, nome: componente.nome, tipo: dados.tipo,
            equipamento_componente_id: vinculo.id_equipamento_componente };
    });
}

async function metrica(dados) {
    return database.transacao(async consultar => {
        await validarServidor(consultar, dados.servidor_id, dados.empresa_id);
        const [vinculo] = await consultar(`SELECT ec.id_equipamento_componente, c.tipo
            FROM equipamento_componente ec JOIN componente c ON c.id_componente = ec.fk_componente
            WHERE ec.fk_equipamento = ? AND ec.fk_componente = ? FOR UPDATE`,
        [dados.servidor_id, dados.componente_id]);
        if (!vinculo) throw erro("Componente não está vinculado ao servidor.", 404);
        const [tipoComponente, unidade] = METRICAS[dados.tipo];
        if (vinculo.tipo !== COMPONENTES[tipoComponente] || dados.unidade !== unidade) {
            throw erro("Tipo ou unidade da métrica incompatível com o componente.", 400);
        }
        // Compatibilidade com as métricas 'Uso' já cadastradas pelo SQL oficial.
        const uso = ["USO_CPU", "USO_RAM", "USO_DISCO"].includes(dados.tipo);
        let registros = await consultar(`SELECT id_metrica FROM metrica WHERE fk_componente = ?
            AND (tipo = ? OR (? = 1 AND tipo = 'Uso' AND unidade = '%')) FOR UPDATE`,
        [dados.componente_id, dados.tipo, uso ? 1 : 0]);
        if (registros.length > 1) throw erro("Há métricas duplicadas para este componente; revise o catálogo.");
        let id;
        if (registros.length) id = registros[0].id_metrica;
        else {
            const resultado = await consultar("INSERT INTO metrica (tipo, nome, unidade, fk_componente) VALUES (?, ?, ?, ?)",
                [dados.tipo, dados.nome, dados.unidade, dados.componente_id]);
            id = resultado.insertId;
        }
        const existentes = await consultar(`SELECT id_config_metrica FROM config_metrica
            WHERE fk_equipamento_componente = ? AND fk_metrica = ?`, [vinculo.id_equipamento_componente, id]);
        // Uma repetição do cadastro preserva os limites já definidos para o equipamento.
        if (!existentes.length) {
            const modelos = await consultar(`SELECT DISTINCT cm.habilitado, cm.intervalo_coleta,
                cm.limite_minimo, cm.limite_maximo FROM config_metrica cm
                JOIN equipamento_componente ec ON ec.id_equipamento_componente = cm.fk_equipamento_componente
                JOIN equipamentos e ON e.id_equipamentos = ec.fk_equipamento
                WHERE e.fk_empresa = ? AND cm.fk_metrica = ?`, [dados.empresa_id, id]);
            if (modelos.length > 1) throw erro("Existem configurações diferentes para esta métrica na empresa; configure o novo servidor no painel.");
            // Sem referência na empresa: mantém a coleta a cada 5 s, sem inventar limites.
            const config = modelos[0] || { habilitado: 1, intervalo_coleta: 5, limite_minimo: null, limite_maximo: null };
            await consultar(`INSERT INTO config_metrica (fk_equipamento_componente, fk_metrica,
                habilitado, intervalo_coleta, limite_minimo, limite_maximo) VALUES (?, ?, ?, ?, ?, ?)`,
            [vinculo.id_equipamento_componente, id, config.habilitado, config.intervalo_coleta, config.limite_minimo, config.limite_maximo]);
        }
        return { id, componente_id: dados.componente_id, tipo: dados.tipo };
    });
}

async function configuracoes(servidor, empresa) {
    return database.transacao(async consultar => {
        await validarServidor(consultar, servidor, empresa);
        const linhas = await consultar(`SELECT m.id_metrica, m.tipo, m.unidade, c.tipo AS componente,
            cm.id_config_metrica, cm.habilitado, cm.intervalo_coleta, cm.limite_minimo, cm.limite_maximo
            FROM equipamento_componente ec JOIN componente c ON c.id_componente = ec.fk_componente
            JOIN metrica m ON m.fk_componente = c.id_componente
            JOIN config_metrica cm ON cm.fk_equipamento_componente = ec.id_equipamento_componente AND cm.fk_metrica = m.id_metrica
            WHERE ec.fk_equipamento = ? ORDER BY m.id_metrica`, [servidor]);
        for (const linha of linhas) {
            if (linha.componente === "Armazenamento") linha.componente = "DISCO";
            if (linha.tipo === "Uso" && linha.unidade === "%") {
                linha.tipo = { CPU: "USO_CPU", RAM: "USO_RAM", DISCO: "USO_DISCO" }[linha.componente] || linha.tipo;
            }
        }
        return linhas;
    });
}

module.exports = { COMPONENTES, METRICAS, componente, metrica, configuracoes };
