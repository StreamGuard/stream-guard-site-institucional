var database = require("../database/config");

const PADROES = {
    USO_CPU: [5, 90, "%"], USO_RAM: [10, 90, "%"], RAM_DISPONIVEL: [10, null, "bytes"],
    TAXA_ENVIO_REDE: [5, null, "bytes/s"], TAXA_RECEBIMENTO_REDE: [10, null, "bytes/s"],
    TAXA_LEITURA_DISCO: [15, null, "bytes/s"], TAXA_ESCRITA_DISCO: [15, null, "bytes/s"],
    USO_DISCO: [60, 95, "%"], CARGA_CPU_1M: [30, null, "load"],
    CARGA_CPU_5M: [60, null, "load"], CARGA_CPU_15M: [60, null, "load"]
};

function erroValidacao(mensagem, status = 400) {
    return Object.assign(new Error(mensagem), { status });
}

function inteiroPositivo(valor) {
    return Number.isSafeInteger(valor) && valor > 0 && valor <= 2147483647;
}

async function cadastrarMetrica(componente_id, tipo, nome, unidade) {
    if (!inteiroPositivo(componente_id) || typeof tipo !== "string" || typeof unidade !== "string" ||
        typeof nome !== "string" || !nome.trim() || nome.length > 255 ||
        !Object.hasOwn(PADROES, tipo) || unidade !== PADROES[tipo][2]) {
        throw erroValidacao("Componente, tipo, nome ou unidade de métrica inválidos.");
    }
    return database.transacao(async (consultar) => {
        const componentes = await consultar("SELECT id_componente, tipo FROM componente WHERE id_componente = ? FOR UPDATE", [componente_id]);
        if (!componentes.length) throw erroValidacao("Componente não encontrado.", 404);
        const esperado = tipo.includes("CPU") ? "CPU" : tipo.includes("RAM") ? "RAM" : tipo.includes("DISCO") ? "DISCO" : "REDE";
        if (componentes[0].tipo !== esperado) throw erroValidacao("Métrica incompatível com o componente.");
        const metricas = await consultar(
            "SELECT id_metrica, unidade FROM metrica WHERE fk_componente = ? AND tipo = ? FOR UPDATE", [componente_id, tipo]);
        if (metricas.length > 1) throw erroValidacao("Métricas duplicadas; revise o banco antes de continuar.", 409);
        let id;
        if (metricas.length) {
            id = metricas[0].id_metrica;
            if (metricas[0].unidade !== unidade) throw erroValidacao("Unidade existente incompatível.", 409);
        } else {
            const criada = await consultar("INSERT INTO metrica (fk_componente, tipo, nome, unidade) VALUES (?, ?, ?, ?)",
                [componente_id, tipo, nome.trim(), unidade]);
            id = criada.insertId;
        }
        const configs = await consultar("SELECT id_config_metrica FROM config_metrica WHERE fk_metrica = ? FOR UPDATE", [id]);
        if (configs.length > 1) throw erroValidacao("Configurações duplicadas; revise o banco antes de continuar.", 409);
        if (!configs.length) {
            await consultar(`INSERT INTO config_metrica
                (fk_metrica, habilitado, intervalo_coleta, limite_minimo, limite_maximo) VALUES (?, 1, ?, NULL, ?)`,
            [id, PADROES[tipo][0], PADROES[tipo][1]]);
        }
        return {
            insertId: id
        };
    });
}

function buscarConfiguracoes(servidor_id) {
    var consultaSql = `
        SELECT
            m.id_metrica,
            m.tipo,
            m.unidade,
            c.tipo AS componente,
            cm.id_config_metrica,
            cm.habilitado,
            cm.intervalo_coleta,
            cm.limite_minimo,
            cm.limite_maximo
        FROM componente c
        JOIN metrica m
            ON m.fk_componente = c.id_componente
        LEFT JOIN config_metrica cm
            ON cm.fk_metrica = m.id_metrica
        WHERE c.fk_servidor = ?
        ORDER BY m.id_metrica, cm.id_config_metrica;
    `;

    return database.executar(consultaSql, [servidor_id]);
}

function validarConfiguracao(config, unidade) {
    if (!config || !inteiroPositivo(config.id_metrica) || ![0, 1].includes(config.habilitado) ||
        !inteiroPositivo(config.intervalo_coleta)) throw erroValidacao("ID, habilitação ou intervalo inválido.");
    for (const campo of ["limite_minimo", "limite_maximo"]) {
        const valor = config[campo];
        if (valor === null) continue;
        if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0 ||
            valor > Number.MAX_SAFE_INTEGER / 100 || Number(valor.toFixed(2)) !== valor ||
            (unidade === "%" && valor > 100)) {
            throw erroValidacao("Limites devem ser nulos ou números não negativos com até duas casas; percentuais vão até 100.");
        }
    }
    if (config.limite_minimo !== null && config.limite_maximo !== null &&
        config.limite_minimo > config.limite_maximo) throw erroValidacao("O limite mínimo não pode superar o máximo.");
}

async function atualizarConfiguracoes(servidor_id, configuracoes, usuario_id) {
    if (!inteiroPositivo(usuario_id)) throw erroValidacao("Sessão inválida.", 401);
    if (!inteiroPositivo(servidor_id) || !Array.isArray(configuracoes) || !configuracoes.length || configuracoes.length > 1000) {
        throw erroValidacao("Informe um servidor válido e de 1 a 1000 configurações.");
    }
    const ids = configuracoes.map(c => c && c.id_metrica);
    if (ids.some(id => !inteiroPositivo(id)) || new Set(ids).size !== ids.length) {
        throw erroValidacao("IDs de métricas inválidos ou repetidos.");
    }
    return database.transacao(async (consultar) => {
        const usuarios = await consultar(`SELECT u.fk_empresa, p.nome AS permissao
            FROM usuario u JOIN permissao p ON p.id_permissao = u.fk_permissao
            WHERE u.id_usuario = ? FOR SHARE`, [usuario_id]);
        if (!usuarios.length) throw erroValidacao("Usuário da sessão não encontrado.", 401);
        if (usuarios[0].permissao !== "Admin") throw erroValidacao("Apenas Admin pode modificar configurações.", 403);
        const servidores = await consultar("SELECT id_equipamentos, fk_equipamento FROM equipamentos WHERE id_equipamentos = ? FOR UPDATE", [servidor_id]);
        if (!servidores.length) throw erroValidacao("Servidor não encontrado.", 404);
        if (servidores[0].fk_equipamento !== usuarios[0].fk_empresa) {
            throw erroValidacao("Servidor não pertence à empresa do usuário.", 403);
        }
        for (const config of [...configuracoes].sort((a, b) => a.id_metrica - b.id_metrica)) {
            const metricas = await consultar(`SELECT m.unidade, cm.id_config_metrica
                FROM metrica m JOIN componente c ON c.id_componente = m.fk_componente
                LEFT JOIN config_metrica cm ON cm.fk_metrica = m.id_metrica
                WHERE m.id_metrica = ? AND c.fk_servidor = ? FOR UPDATE`, [config.id_metrica, servidor_id]);
            if (!metricas.length) throw erroValidacao("Métrica não pertence ao servidor.", 404);
            if (metricas.length !== 1 || metricas[0].id_config_metrica === null) {
                throw erroValidacao("Configuração ausente ou duplicada; regularize o cadastro.", 409);
            }
            validarConfiguracao(config, metricas[0].unidade);
            await consultar(`UPDATE config_metrica SET habilitado = ?, intervalo_coleta = ?,
                limite_minimo = ?, limite_maximo = ? WHERE id_config_metrica = ?`,
            [config.habilitado, config.intervalo_coleta, config.limite_minimo, config.limite_maximo, metricas[0].id_config_metrica]);
        }
    });
}

module.exports = {
    cadastrarMetrica,
    buscarConfiguracoes,
    atualizarConfiguracoes
};