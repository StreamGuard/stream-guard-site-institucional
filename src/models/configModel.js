var database = require("../database/config");

// Escapa aspas/barras para não quebrar o SQL com nomes tipo "D'Água"
function txt(valor) {
    return String(valor == null ? "" : valor)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "''");
}

function numeroOuNull(valor) {
    if (valor === undefined || valor === null || (typeof valor === "string" && valor.trim() === "")) return "NULL";
    if (typeof valor !== "number" && typeof valor !== "string") {
        throw new TypeError("Limite numérico inválido.");
    }
    var numero = Number(valor);
    if (!Number.isFinite(numero)) throw new TypeError("Limite numérico inválido.");
    return numero;
}

var NOME_COMPONENTE = {
    CPU: "Processador",
    RAM: "Memória RAM",
    Armazenamento: "Disco",
    Rede: "Rede"
};

// ---------- Funcionários ----------

function listarFuncionarios(idEmpresa) {
    var instrucaoSql = `
        SELECT
            u.id_usuario AS id,
            u.nome,
            u.email,
            u.cargo,
            u.ativo,
            u.fk_permissao,
            p.nome AS permissao
        FROM usuario u
        INNER JOIN permissao p
            ON p.id_permissao = u.fk_permissao
        WHERE u.fk_empresa = ${idEmpresa}
        ORDER BY u.nome;
    `;
    return database.executar(instrucaoSql);
}

function buscarFuncionario(idUsuario, idEmpresa) {
    var instrucaoSql = `
        SELECT
            u.id_usuario AS id,
            u.nome,
            u.email,
            u.cargo,
            u.ativo,
            u.fk_permissao,
            p.nome AS permissao
        FROM usuario u
        INNER JOIN permissao p
            ON p.id_permissao = u.fk_permissao
        WHERE u.id_usuario = ${idUsuario}
        AND u.fk_empresa = ${idEmpresa};
    `;
    return database.executar(instrucaoSql);
}

function cadastrarFuncionario(idEmpresa, nome, email, senha, idPermissao, cargo) {
    var instrucaoSql = `
        INSERT INTO usuario (
            nome,
            email,
            senha_hash,
            fk_empresa,
            fk_permissao,
            cargo,
            ativo
        )
        VALUES (
            '${txt(nome)}',
            '${txt(email)}',
            SHA2('${txt(senha)}', 256),
            ${idEmpresa},
            ${idPermissao},
            '${txt(cargo)}',
            1
        );
    `;
    return database.executar(instrucaoSql);
}

// ativo = 1, 0 ou null (null mantém o valor que já está no banco)
function editarFuncionario(idUsuario, idEmpresa, nome, email, idPermissao, ativo, cargo) {
    var valorAtivo = ativo === null || ativo === undefined ? "NULL" : Number(ativo);
    var instrucaoSql = `
        UPDATE usuario
        SET
            nome = '${txt(nome)}',
            email = '${txt(email)}',
            fk_permissao = ${idPermissao},
            ativo = COALESCE(${valorAtivo}, ativo),
            cargo = '${txt(cargo)}'
        WHERE id_usuario = ${idUsuario}
        AND fk_empresa = ${idEmpresa};
    `;
    return database.executar(instrucaoSql);
}

function excluirFuncionario(idUsuario, idEmpresa) {
    var instrucaoSql = `
        DELETE FROM usuario
        WHERE id_usuario = ${idUsuario}
        AND fk_empresa = ${idEmpresa};
    `;
    return database.executar(instrucaoSql);
}

function empresaTemRoot(idEmpresa) {
    var instrucaoSql = `
        SELECT COUNT(*) AS total
        FROM usuario
        WHERE fk_empresa = ${idEmpresa}
        AND fk_permissao = 1;
    `;
    return database.executar(instrucaoSql);
}

// ---------- Métricas ----------

function listarMetricas(idEmpresa) {
    var instrucaoSql = `
        SELECT
            m.id_metrica AS id,
            m.nome,
            m.unidade,
            m.tipo AS tipo_metrica,
            c.tipo AS tipo_componente,
            cm.id_config_metrica,
            cm.intervalo_coleta AS intervalo,
            cm.habilitado AS ativa,
            cm.limite_maximo,
            cm.limite_minimo,
            ec.id_equipamento_componente
        FROM empresa e
        JOIN equipamentos eq ON eq.fk_empresa = e.id_empresa
        JOIN equipamento_componente ec ON ec.fk_equipamento = eq.id_equipamentos
        JOIN componente c ON c.id_componente = ec.fk_componente
        JOIN metrica m ON m.fk_componente = c.id_componente
        JOIN config_metrica cm ON cm.fk_equipamento_componente = ec.id_equipamento_componente
            AND cm.fk_metrica = m.id_metrica
        WHERE e.id_empresa = ${idEmpresa}
        ORDER BY m.nome;
    `;
    return database.executar(instrucaoSql);
}

function buscarEquipamentoEmpresa(idEmpresa) {
    var instrucaoSql = `
        SELECT id_equipamentos
        FROM equipamentos
        WHERE fk_empresa = ${idEmpresa}
        ORDER BY id_equipamentos
        LIMIT 1;
    `;
    return database.executar(instrucaoSql);
}

function buscarVinculoEquipamentoComponente(idEquipamento, idComponente) {
    var instrucaoSql = `
        SELECT id_equipamento_componente
        FROM equipamento_componente
        WHERE fk_equipamento = ${idEquipamento}
        AND fk_componente = ${idComponente}
        LIMIT 1;
    `;
    return database.executar(instrucaoSql);
}

async function obterOuCriarEquipamento(idEmpresa) {
    var eq = await buscarEquipamentoEmpresa(idEmpresa);
    if (eq.length > 0) return eq[0].id_equipamentos;

    var res = await database.executar(`
        INSERT INTO equipamentos (hostname, codigo_agente, tipo, status, dt_atualizacao, fk_empresa)
        VALUES ('srv-padrao-${idEmpresa}', CONCAT('AGENTE-${idEmpresa}-', UNIX_TIMESTAMP()), 'Servidor', 'Ativo', NOW(), ${idEmpresa});
    `);
    return res.insertId;
}

async function obterOuCriarComponente(tipo) {
    var comp = await database.executar(`
        SELECT id_componente
        FROM componente
        WHERE tipo = '${txt(tipo)}'
        ORDER BY id_componente
        LIMIT 1;
    `);
    if (comp.length > 0) return comp[0].id_componente;

    var res = await database.executar(`
        INSERT INTO componente (nome, tipo)
        VALUES ('${txt(NOME_COMPONENTE[tipo] || tipo)}', '${txt(tipo)}');
    `);
    return res.insertId;
}

async function obterOuCriarVinculo(idEquipamento, idComponente) {
    var v = await buscarVinculoEquipamentoComponente(idEquipamento, idComponente);
    if (v.length > 0) return v[0].id_equipamento_componente;

    var res = await database.executar(`
        INSERT INTO equipamento_componente (fk_equipamento, fk_componente, data_instalacao, status)
        VALUES (${idEquipamento}, ${idComponente}, NOW(), 'Ativo');
    `);
    return res.insertId;
}

async function cadastrarMetrica(idEmpresa, nome, unidade, intervalo, ativa, tipoComponente, limiteMaximo, limiteMinimo) {
    var idEquipamento = await obterOuCriarEquipamento(idEmpresa);
    var idComponente = await obterOuCriarComponente(tipoComponente || "CPU");
    var idEquipamentoComponente = await obterOuCriarVinculo(idEquipamento, idComponente);

    var resMetrica = await database.executar(`
        INSERT INTO metrica (tipo, nome, unidade, fk_componente)
        VALUES ('Uso', '${txt(nome)}', '${txt(unidade)}', ${idComponente});
    `);
    var idMetrica = resMetrica.insertId;

    try {
        return await database.executar(`
            INSERT INTO config_metrica (habilitado, intervalo_coleta, limite_maximo, limite_minimo, fk_equipamento_componente, fk_metrica)
            VALUES (${ativa ? 1 : 0}, ${intervalo}, ${numeroOuNull(limiteMaximo)}, ${numeroOuNull(limiteMinimo)}, ${idEquipamentoComponente}, ${idMetrica});
        `);
    } catch (erro) {
        // não deixa métrica órfã se a config falhar
        await database.executar(`DELETE FROM metrica WHERE id_metrica = ${idMetrica};`);
        throw erro;
    }
}

// Retorna null se a métrica não existir
async function editarMetrica(idMetrica, nome, unidade, intervalo, ativa, tipoComponente, idEquipamentoComponente) {
    // 1. Descobre o vínculo atual da métrica (e o tipo de componente em que ela está hoje)
    var filtroVinculo = idEquipamentoComponente
        ? `AND cm.fk_equipamento_componente = ${Number(idEquipamentoComponente)}`
        : "";

    var atual = await database.executar(`
        SELECT
            ec.id_equipamento_componente AS idEC,
            ec.fk_equipamento AS idEquipamento,
            c.tipo AS tipo_atual
        FROM config_metrica cm
        JOIN equipamento_componente ec ON ec.id_equipamento_componente = cm.fk_equipamento_componente
        JOIN componente c ON c.id_componente = ec.fk_componente
        WHERE cm.fk_metrica = ${idMetrica}
        ${filtroVinculo}
        ORDER BY cm.id_config_metrica
        LIMIT 1;
    `);
    if (atual.length === 0) return null;

    var idEC = atual[0].idEC;

    // 2. Nome e unidade
    await database.executar(`
        UPDATE metrica
        SET nome = '${txt(nome)}', unidade = '${txt(unidade)}'
        WHERE id_metrica = ${idMetrica};
    `);

    // 3. Só mexe no componente se o tipo realmente mudou.
    //    A métrica e o config_metrica precisam mudar JUNTOS, senão o JOIN da listagem
    //    deixa de casar e a métrica "some" da tela.
    if (tipoComponente && tipoComponente !== atual[0].tipo_atual) {
        var idComponente = await obterOuCriarComponente(tipoComponente);
        var novoEC = await obterOuCriarVinculo(atual[0].idEquipamento, idComponente);

        await database.executar(`
            UPDATE metrica SET fk_componente = ${idComponente} WHERE id_metrica = ${idMetrica};
        `);
        await database.executar(`
            UPDATE config_metrica
            SET fk_equipamento_componente = ${novoEC}
            WHERE fk_metrica = ${idMetrica} AND fk_equipamento_componente = ${idEC};
        `);
        idEC = novoEC;
    }

    // 4. Intervalo e estado
    return database.executar(`
        UPDATE config_metrica
        SET intervalo_coleta = ${intervalo}, habilitado = ${ativa ? 1 : 0}
        WHERE fk_metrica = ${idMetrica} AND fk_equipamento_componente = ${idEC};
    `);
}

async function excluirMetrica(idMetrica, idEquipamentoComponente) {
    var filtroConfig = idEquipamentoComponente
        ? `WHERE fk_metrica = ${idMetrica} AND fk_equipamento_componente = ${Number(idEquipamentoComponente)}`
        : `WHERE fk_metrica = ${idMetrica}`;

    await database.executar(`DELETE FROM config_metrica ${filtroConfig};`);

    // só apaga a métrica se não sobrou config em nenhum outro equipamento (evita erro de FK)
    var restantes = await database.executar(`
        SELECT COUNT(*) AS total FROM config_metrica WHERE fk_metrica = ${idMetrica};
    `);
    if (Number(restantes[0].total) === 0) {
        await database.executar(`DELETE FROM metrica WHERE id_metrica = ${idMetrica};`);
    }
}

function salvarTodasMetricas(lista) {
    var promessas = lista.map(function (m) {
        var filtroConfig = m.idEquipamentoComponente
            ? `WHERE fk_metrica = ${Number(m.id)} AND fk_equipamento_componente = ${Number(m.idEquipamentoComponente)}`
            : `WHERE fk_metrica = ${Number(m.id)}`;

        return database.executar(`
            UPDATE config_metrica
            SET intervalo_coleta = ${Number(m.intervalo)}, habilitado = ${m.ativa ? 1 : 0}
            ${filtroConfig};
        `);
    });
    return Promise.all(promessas);
}

//  Componentes 

function erroNegocio(codigo, mensagem) {
    var erro = new Error(mensagem);
    erro.code = codigo;
    return erro;
}

// Cada linha da tela é um vínculo equipamento <-> componente (id = id_equipamento_componente)
function listarComponentes(idEmpresa) {
    var instrucaoSql = `
        SELECT
            ec.id_equipamento_componente AS id,
            c.id_componente,
            c.nome,
            c.tipo,
            ec.status,
            ec.data_instalacao,
            eq.hostname,
            (SELECT COUNT(*) FROM config_metrica cm
              WHERE cm.fk_equipamento_componente = ec.id_equipamento_componente) AS total_metricas
        FROM equipamentos eq
        JOIN equipamento_componente ec ON ec.fk_equipamento = eq.id_equipamentos
        JOIN componente c ON c.id_componente = ec.fk_componente
        WHERE eq.fk_empresa = ${idEmpresa}
        ORDER BY c.nome;
    `;
    return database.executar(instrucaoSql);
}

// Garante que o vínculo pertence à empresa. Retorna null se não existir.
async function buscarComponenteDaEmpresa(idVinculo, idEmpresa) {
    var r = await database.executar(`
        SELECT
            ec.id_equipamento_componente AS idVinculo,
            ec.fk_equipamento AS idEquipamento,
            c.id_componente AS idComponente,
            c.nome,
            c.tipo
        FROM equipamento_componente ec
        JOIN equipamentos eq ON eq.id_equipamentos = ec.fk_equipamento
        JOIN componente c ON c.id_componente = ec.fk_componente
        WHERE ec.id_equipamento_componente = ${Number(idVinculo)}
        AND eq.fk_empresa = ${Number(idEmpresa)}
        LIMIT 1;
    `);
    return r.length > 0 ? r[0] : null;
}

async function nomeComponenteJaExiste(idEmpresa, nome, idVinculoIgnorar) {
    var filtro = idVinculoIgnorar
        ? `AND ec.id_equipamento_componente <> ${Number(idVinculoIgnorar)}`
        : "";
    var r = await database.executar(`
        SELECT COUNT(*) AS total
        FROM equipamento_componente ec
        JOIN equipamentos eq ON eq.id_equipamentos = ec.fk_equipamento
        JOIN componente c ON c.id_componente = ec.fk_componente
        WHERE eq.fk_empresa = ${Number(idEmpresa)}
        AND LOWER(c.nome) = LOWER('${txt(nome)}')
        ${filtro};
    `);
    return Number(r[0].total) > 0;
}

async function cadastrarComponente(idEmpresa, nome, tipo, ativo) {
    if (await nomeComponenteJaExiste(idEmpresa, nome)) {
        throw erroNegocio("COMPONENTE_DUPLICADO", "Já existe um componente com esse nome.");
    }

    var idEquipamento = await obterOuCriarEquipamento(idEmpresa);
    var resComp = await database.executar(`
        INSERT INTO componente (nome, tipo)
        VALUES ('${txt(nome)}', '${txt(tipo)}');
    `);
    var idComponente = resComp.insertId;

    try {
        return await database.executar(`
            INSERT INTO equipamento_componente (fk_equipamento, fk_componente, data_instalacao, status)
            VALUES (${idEquipamento}, ${idComponente}, NOW(), '${ativo ? "Ativo" : "Inativo"}');
        `);
    } catch (erro) {
        // não deixa componente órfão se o vínculo falhar
        await database.executar(`DELETE FROM componente WHERE id_componente = ${idComponente};`);
        throw erro;
    }
}

// Retorna null se o componente não existir. O tipo não muda aqui (as métricas dependem dele).
// ativo = 1, 0 ou null (null mantém o status atual)
async function editarComponente(idVinculo, idEmpresa, nome, ativo) {
    var atual = await buscarComponenteDaEmpresa(idVinculo, idEmpresa);
    if (!atual) return null;

    if (nome !== atual.nome) {
        if (await nomeComponenteJaExiste(idEmpresa, nome, idVinculo)) {
            throw erroNegocio("COMPONENTE_DUPLICADO", "Já existe um componente com esse nome.");
        }

        // o registro em "componente" pode ser compartilhado com outras empresas
        var outras = await database.executar(`
            SELECT COUNT(*) AS total
            FROM equipamento_componente ec
            JOIN equipamentos eq ON eq.id_equipamentos = ec.fk_equipamento
            WHERE ec.fk_componente = ${atual.idComponente}
            AND eq.fk_empresa <> ${Number(idEmpresa)};
        `);
        if (Number(outras[0].total) > 0) {
            throw erroNegocio("COMPONENTE_COMPARTILHADO", "Este componente é compartilhado com outras empresas: só o status pode ser alterado.");
        }

        await database.executar(`
            UPDATE componente SET nome = '${txt(nome)}' WHERE id_componente = ${atual.idComponente};
        `);
    }

    if (ativo !== null && ativo !== undefined) {
        await database.executar(`
            UPDATE equipamento_componente
            SET status = '${Number(ativo) ? "Ativo" : "Inativo"}'
            WHERE id_equipamento_componente = ${atual.idVinculo};
        `);
    }
    return atual;
}

// Retorna null se o componente não existir. Remove também as métricas ligadas a ele.
async function excluirComponente(idVinculo, idEmpresa) {
    var atual = await buscarComponenteDaEmpresa(idVinculo, idEmpresa);
    if (!atual) return null;

    await database.executar(`
        DELETE FROM config_metrica WHERE fk_equipamento_componente = ${atual.idVinculo};
    `);
    await database.executar(`
        DELETE FROM metrica
        WHERE fk_componente = ${atual.idComponente}
        AND NOT EXISTS (SELECT 1 FROM config_metrica cm WHERE cm.fk_metrica = metrica.id_metrica);
    `);
    await database.executar(`
        DELETE FROM equipamento_componente WHERE id_equipamento_componente = ${atual.idVinculo};
    `);

    // só apaga o componente se ninguém mais usa (ele pode ser compartilhado)
    var uso = await database.executar(`
        SELECT
            (SELECT COUNT(*) FROM equipamento_componente WHERE fk_componente = ${atual.idComponente}) AS vinculos,
            (SELECT COUNT(*) FROM metrica WHERE fk_componente = ${atual.idComponente}) AS metricas;
    `);
    if (Number(uso[0].vinculos) === 0 && Number(uso[0].metricas) === 0) {
        await database.executar(`DELETE FROM componente WHERE id_componente = ${atual.idComponente};`);
    }
    return true;
}

module.exports = {
    empresaTemRoot,
    listarFuncionarios,
    buscarFuncionario,
    cadastrarFuncionario,
    editarFuncionario,
    excluirFuncionario,
    listarMetricas,
    cadastrarMetrica,
    editarMetrica,
    excluirMetrica,
    salvarTodasMetricas,
    listarComponentes,
    cadastrarComponente,
    editarComponente,
    excluirComponente
};
