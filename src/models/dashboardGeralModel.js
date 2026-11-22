var database = require("../database/config");
var aws = require("@aws-sdk/client-s3");

const TIPOS_GRAFICO = {
    USO_CPU: "CPU",
    USO_RAM: "RAM",
    USO_DISCO: "Disco"
};

const TIPOS_REDE = {
    TAXA_ENVIO_REDE: "EnvioRede",
    TAXA_RECEBIMENTO_REDE: "RecebimentoRede"
};

// Relaciona os nomes gravados nos CSVs Gold aos nomes usados nos gráficos.
const TIPOS_METRICA_GOLD = { ...TIPOS_GRAFICO, ...TIPOS_REDE };

// Monta a data de hoje no fuso de São Paulo para definir a semana exibida.
function dataAtualEmSaoPaulo() {
    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());
    const valor = {};
    for (const parte of partes) {
        valor[parte.type] = parte.value;
    }
    return `${valor.year}-${valor.month}-${valor.day}`;
}

function intervaloSemana(data) {
    // Calcula a segunda-feira e o domingo da semana que contém a data recebida.
    const dia = new Date(`${data}T00:00:00Z`);
    const diasDesdeSegunda = (dia.getUTCDay() + 6) % 7;
    dia.setUTCDate(dia.getUTCDate() - diasDesdeSegunda);
    const inicio = dia.toISOString().slice(0, 10);
    dia.setUTCDate(dia.getUTCDate() + 6);
    return { inicio, fim: dia.toISOString().slice(0, 10) };
}

function numero(valor) {
    // Converte valores do MySQL/CSV em número; devolve null quando o valor não é válido.
    if (valor === null || valor === undefined || valor === "") return null;
    const convertido = Number(valor);
    return Number.isFinite(convertido) ? convertido : null;
}

// O JOIN do banco repete o servidor uma vez por componente. Aqui reunimos as linhas
// e guardamos o objeto pelo ID. Map funciona como uma lista de consulta rápida: ID -> servidor.
function prepararServidores(linhasBanco) {
    const servidoresPorId = new Map();

    for (const linha of linhasBanco) {
        const id = Number(linha.id);
        // Se o servidor já apareceu em outra linha do JOIN, reaproveitamos o mesmo objeto.
        let servidor = servidoresPorId.get(id);

        if (!servidor) {
            servidor = {
                id,
                nome: linha.nome,
                tipo: linha.tipo,
                statusCadastro: linha.status_cadastro,
                atualizacaoInventario: linha.atualizacao_inventario,
                limites: {},
                ultimaAmostra: null,
                componentes: {}
            };
            servidoresPorId.set(id, servidor);
        }

        const tipoComponente = String(linha.componente || "").toUpperCase();
        const componente = tipoComponente === "ARMAZENAMENTO" ? "Disco" : tipoComponente;
        if (!TIPOS_GRAFICO["USO_" + componente.toUpperCase()] || !linha.tipo_metrica) continue;
        if (String(linha.tipo_metrica).toLowerCase() !== "uso" || Number(linha.habilitado) !== 1) continue;

        servidor.limites[componente] = {
            minimo: numero(linha.limite_minimo),
            maximo: numero(linha.limite_maximo),
            intervaloColetaMinutos: numero(linha.intervalo_coleta)
        };
    }

    return Array.from(servidoresPorId.values());
}

// Converte cada linha CSV da Gold para os nomes e números usados pela dashboard,
// descartando registros sem servidor, data, média ou quantidade de amostras válidos.
function prepararMetricas(linhasGold) {
    const metricas = [];

    for (const linha of linhasGold) {
        const metrica = {
            servidorId: Number(linha.servidor_id),
            inicio: String(linha.inicio_periodo || "").trim(),
            tipo: TIPOS_METRICA_GOLD[String(linha.tipo || "").toUpperCase()],
            unidade: linha.unidade,
            amostras: Math.max(0, numero(linha.quantidade_amostras) || 0),
            media: numero(linha.media_amostral),
            minimo: numero(linha.minimo),
            maximo: numero(linha.maximo)
        };
        const linhaValida = Number.isSafeInteger(metrica.servidorId) && metrica.servidorId > 0 &&
            metrica.tipo && metrica.inicio && metrica.media !== null && metrica.amostras > 0;

        if (linhaValida) metricas.push(metrica);
    }

    metricas.sort((a, b) => a.inicio.localeCompare(b.inicio));
    return metricas;
}

// Agrupa as medições pela chave informada e calcula a média considerando a quantidade de amostras.
function agregarPorChave(medicoes, chaveDaMetrica) {
    // O Map localiza o acumulador diretamente pela chave, sem percorrer os grupos a cada medição.
    const gruposPorId = new Map();

    for (const metrica of medicoes) {
        const chave = chaveDaMetrica(metrica);
        let grupo = gruposPorId.get(chave.id);

        if (!grupo) {
            // O Set evita contar o mesmo servidor mais de uma vez dentro do grupo.
            grupo = { ...chave, total: 0, amostras: 0, servidores: new Set() };
            gruposPorId.set(chave.id, grupo);
        }

        grupo.total += metrica.media * metrica.amostras;
        grupo.amostras += metrica.amostras;
        grupo.servidores.add(metrica.servidorId);
    }

    const grupos = Array.from(gruposPorId.values());
    for (const grupo of grupos) {
        grupo.media = grupo.amostras ? grupo.total / grupo.amostras : null;
        grupo.servidores = grupo.servidores.size;
        delete grupo.total;
        delete grupo.id;
    }

    return grupos;
}

// Une os CSVs atual e histórico, mantendo uma linha para cada servidor, período e tipo de métrica.
function combinarLinhasGold(dadosGold) {
    const linhasPorIdentidade = new Map();
    const inserir = novasLinhas => {
        for (const linha of novasLinhas || []) {
            const chave = `${linha.servidor_id}|${linha.inicio_periodo}|${linha.tipo}`;
            // Se a chave já existe, a linha inserida por último substitui a anterior.
            linhasPorIdentidade.set(chave, linha);
        }
    };

    inserir(dadosGold.historico);
    inserir(dadosGold.atual);
    return Array.from(linhasPorIdentidade.values());
}

// Monta a resposta da dashboard com cadastro do banco e medições lidas dos CSVs Gold.
function montarResposta(empresa, servidores, dadosGold) {
    const metricas = prepararMetricas(combinarLinhasGold(dadosGold));
    // Guarda IDs cadastrados para ignorar métricas de recursos sem equipamento correspondente.
    const idsCadastrados = new Set();
    for (const servidor of servidores) {
        idsCadastrados.add(servidor.id);
    }
    const metricasRecursos = [];
    const metricasUtilizacaoGold = [];
    const metricasRede = [];

    for (const metrica of metricas) {
        const servidorCadastrado = idsCadastrados.has(metrica.servidorId);

        if (servidorCadastrado && Object.values(TIPOS_GRAFICO).includes(metrica.tipo)) {
            metricasRecursos.push(metrica);
        }
        if (Object.values(TIPOS_REDE).includes(metrica.tipo)) {
            metricasRede.push(metrica);
        }
    }

    const resumo6h = prepararMetricas(dadosGold.resumo6h || []);
    for (const metrica of resumo6h) {
        const servidorCadastrado = idsCadastrados.has(metrica.servidorId);
        if (servidorCadastrado && Object.values(TIPOS_GRAFICO).includes(metrica.tipo)) {
            metricasUtilizacaoGold.push(metrica);
        }
    }

    // Usa o resumo de seis horas para os gráficos; recorre ao arquivo atual se o resumo estiver vazio.
    const baseHistorico = metricasUtilizacaoGold.length ? metricasUtilizacaoGold : metricasRecursos;
    const ultimaAmostra = metricasRecursos.at(-1)?.inicio || null;

    for (const servidor of servidores) {
        const doServidor = [];
        for (const metrica of metricasRecursos) {
            if (metrica.servidorId === servidor.id) doServidor.push(metrica);
        }
        servidor.ultimaAmostra = doServidor.at(-1)?.inicio || null;

        for (const tipo of Object.values(TIPOS_GRAFICO)) {
            let metrica = null;
            for (const item of doServidor) {
                if (item.tipo === tipo) metrica = item;
            }
            if (!metrica) continue;
            servidor.componentes[metrica.tipo] = {
                media: metrica.media,
                minimo: metrica.minimo,
                maximo: metrica.maximo,
                unidade: metrica.unidade,
                inicio: metrica.inicio,
                limite: servidor.limites[metrica.tipo]?.maximo ?? null,
                acimaDoLimite: servidor.limites[metrica.tipo]?.maximo !== null &&
                    servidor.limites[metrica.tipo]?.maximo !== undefined &&
                    metrica.media >= servidor.limites[metrica.tipo].maximo
            };
        }
    }

    const semana = intervaloSemana(dataAtualEmSaoPaulo());
    const destaSemana = [];
    for (const metrica of baseHistorico) {
        const data = metrica.inicio.slice(0, 10);
        if (data >= semana.inicio && data <= semana.fim) destaSemana.push(metrica);
    }
    // Separa o histórico semanal em faixas de seis horas para o gráfico de utilização.
    const faixas = agregarPorChave(destaSemana, metrica => {
        const hora = Number(metrica.inicio.slice(11, 13));
        const faixa = Math.min(3, Math.floor(hora / 6));
        return {
            id: `${metrica.servidorId}|${metrica.tipo}|${faixa}`,
            servidorId: metrica.servidorId,
            tipo: metrica.tipo,
            faixa,
            faixaInicioHora: faixa * 6,
            faixaFimHora: (faixa + 1) * 6,
            total: 0,
            amostras: 0
        };
    });

    const discos = [];
    for (const metrica of baseHistorico) {
        if (metrica.tipo === "Disco") discos.push(metrica);
    }
    // Consolida as médias diárias de disco por servidor, que serão usadas na previsão semanal.
    const historicoDisco = agregarPorChave(discos, metrica => ({
        id: `${metrica.servidorId}|${metrica.inicio.slice(0, 10)}`,
        servidorId: metrica.servidorId,
        dia: metrica.inicio.slice(0, 10)
    }));

    const ultimaAmostraRede = metricasRede.at(-1)?.inicio || null;
    const tempoUltimaAmostraRede = ultimaAmostraRede
        ? new Date(`${ultimaAmostraRede.replace(" ", "T")}-03:00`).getTime()
        : null;
    // Mantém apenas os registros de rede dos 30 minutos anteriores à amostra mais recente.
    const janelaRede = [];
    if (tempoUltimaAmostraRede !== null) {
        for (const metrica of metricasRede) {
            const tempo = new Date(`${metrica.inicio.replace(" ", "T")}-03:00`).getTime();
            if (tempo >= tempoUltimaAmostraRede - 30 * 60 * 1000) janelaRede.push(metrica);
        }
    }

    const servidoresComRede = [];
    for (const metrica of metricasRede) {
        if (!servidoresComRede.includes(metrica.servidorId)) {
            servidoresComRede.push(metrica.servidorId);
        }
    }

    const servidoresRede = [];
    for (const id of servidoresComRede) {
        const cadastrado = servidores.find(servidor => servidor.id === id);
        servidoresRede.push(cadastrado || {
            id,
            nome: `ID Gold ${id}`,
            cadastroCorrespondente: false
        });
    }
    for (const servidor of servidores) {
        if (!servidoresComRede.includes(servidor.id)) {
            servidoresRede.push({
                id: servidor.id,
                nome: servidor.nome,
                cadastroCorrespondente: true
            });
        }
    }

    // Junta envio e recebimento que chegaram em linhas separadas no mesmo servidor e horário.
    const redePorAmostra = new Map();
    for (const metrica of janelaRede) {
        const chave = `${metrica.servidorId}|${metrica.inicio}`;
        let amostra = redePorAmostra.get(chave);

        if (!amostra) {
            amostra = {
                servidorId: metrica.servidorId,
                inicio: metrica.inicio,
                envioBytesPorSegundo: null,
                recebimentoBytesPorSegundo: null,
                amostrasEnvio: 0,
                amostrasRecebimento: 0
            };
            redePorAmostra.set(chave, amostra);
        }

        if (metrica.tipo === "EnvioRede") {
            amostra.envioBytesPorSegundo = metrica.media;
            amostra.amostrasEnvio = metrica.amostras;
        } else {
            amostra.recebimentoBytesPorSegundo = metrica.media;
            amostra.amostrasRecebimento = metrica.amostras;
        }
    }

    // Recorta CPU, RAM e disco para a janela de 30 minutos mais recente.
    const janelaMonitoramento = [];
    const tempoUltimaAmostra = ultimaAmostra
        ? new Date(`${ultimaAmostra.replace(" ", "T")}-03:00`).getTime()
        : null;
    for (const metrica of metricasRecursos) {
        const tempo = new Date(`${metrica.inicio.replace(" ", "T")}-03:00`).getTime();
        if (tempoUltimaAmostra === null || tempo < tempoUltimaAmostra - 30 * 60 * 1000) continue;

        const servidor = servidores.find(item => item.id === metrica.servidorId);
        janelaMonitoramento.push({
            servidorId: metrica.servidorId,
            inicio: metrica.inicio,
            tipo: metrica.tipo,
            media: metrica.media,
            limite: servidor?.limites[metrica.tipo]?.maximo ?? null
        });
    }

    return {
        empresa,
        periodoSemana: semana,
        ultimaAmostra,
        servidores,
        servidoresRede,
        monitoramento: janelaMonitoramento,
        rede: Array.from(redePorAmostra.values()).sort((a, b) => a.inicio.localeCompare(b.inicio)),
        utilizacao: faixas,
        capacidade: historicoDisco
    };
}

function idSeguro(valor) {
    // Impede que um ID inválido seja interpolado nas consultas SQL deste model.
    const id = Number(valor);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Identificador inválido.");
    return id;
}

function buscarEmpresaDoUsuario(idUsuario) {
    // Busca a empresa e a permissão vinculadas a um usuário ativo.
    const id = idSeguro(idUsuario);
    const sql = `
        SELECT e.id_empresa, e.razao_social, p.nome AS permissao, u.email
        FROM usuario u
        JOIN empresa e ON e.id_empresa = u.fk_empresa
        JOIN permissao p ON p.id_permissao = u.fk_permissao
        WHERE u.id_usuario = ${id} AND u.ativo = 1;
    `;

    return database.executar(sql);
}

function buscarEmpresaPorId(idEmpresa) {
    // Busca os dados da empresa selecionada pelo perfil root.
    const id = idSeguro(idEmpresa);
    const sql = `
        SELECT id_empresa, razao_social
        FROM empresa
        WHERE id_empresa = ${id};
    `;

    return database.executar(sql);
}

function buscarServidoresDaEmpresa(idEmpresa) {
    // Busca os servidores da empresa junto com componentes, métricas e limites configurados.
    const id = idSeguro(idEmpresa);
    const sql = `
        SELECT
            eq.id_equipamentos AS id,
            eq.hostname AS nome,
            eq.tipo,
            eq.status AS status_cadastro,
            eq.dt_atualizacao AS atualizacao_inventario,
            c.tipo AS componente,
            m.tipo AS tipo_metrica,
            cm.habilitado,
            cm.intervalo_coleta,
            cm.limite_minimo,
            cm.limite_maximo
        FROM equipamentos eq
        LEFT JOIN equipamento_componente ec
            ON ec.fk_equipamento = eq.id_equipamentos
        LEFT JOIN componente c
            ON c.id_componente = ec.fk_componente
        LEFT JOIN config_metrica cm
            ON cm.fk_equipamento_componente = ec.id_equipamento_componente
        LEFT JOIN metrica m
            ON m.id_metrica = cm.fk_metrica
        WHERE eq.fk_empresa = ${id}
        ORDER BY eq.id_equipamentos, c.tipo, m.tipo;
    `;

    return database.executar(sql);
}

// Divide uma linha CSV sem separar vírgulas que estejam dentro de um campo entre aspas.
function separarLinhaCsv(linha) {
    const valores = [];
    let valor = "";
    let entreAspas = false;

    for (let i = 0; i < linha.length; i++) {
        const caractere = linha[i];

        if (caractere === '"' && entreAspas && linha[i + 1] === '"') {
            valor += '"';
            i++;
        } else if (caractere === '"') {
            entreAspas = !entreAspas;
        } else if (caractere === "," && !entreAspas) {
            valores.push(valor);
            valor = "";
        } else {
            valor += caractere;
        }
    }

    valores.push(valor);
    return valores;
}

function csvParaLista(texto) {
    // Usa a primeira linha como cabeçalho e transforma cada linha seguinte em um objeto.
    const linhas = texto.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
    if (!linhas.length) return [];

    const colunas = separarLinhaCsv(linhas[0]);
    const registros = [];

    for (const linha of linhas.slice(1)) {
        const valores = separarLinhaCsv(linha);
        const registro = {};

        for (let indice = 0; indice < colunas.length; indice++) {
            registro[colunas[indice]] = valores[indice] ?? "";
        }

        registros.push(registro);
    }

    return registros;
}

async function listarChavesHistoricas(cliente, bucket, idEmpresa) {
    // Lista os resumos diários da empresa no S3 e seleciona os 28 dias mais recentes.
    const chaves = [];
    let token;

    do {
        const pagina = await cliente.send(new aws.ListObjectsV2Command({
            Bucket: bucket,
            Prefix: `gold/${idEmpresa}/historico/`,
            MaxKeys: 1000,
            ContinuationToken: token
        }));

        for (const objeto of pagina.Contents || []) {
            if (/\/\d{4}-\d{2}-\d{2}\/resumo_metricas\.csv$/.test(objeto.Key)) {
                chaves.push(objeto.Key);
            }
        }

        // O S3 pode dividir a listagem em páginas; o token solicita a página seguinte.
        token = pagina.IsTruncated ? pagina.NextContinuationToken : undefined;
    } while (token);

    return chaves.sort().slice(-28);
}

async function lerCsvGold(cliente, bucket, chave) {
    // Faz GetObject no S3 e converte o conteúdo CSV em uma lista de registros.
    const resposta = await cliente.send(new aws.GetObjectCommand({ Bucket: bucket, Key: chave }));
    return csvParaLista(await resposta.Body.transformToString());
}

async function lerCsvGoldOpcional(cliente, bucket, chave) {
    // Alguns resumos atuais podem ainda não existir; nesse caso, representa ausência como lista vazia.
    try {
        return await lerCsvGold(cliente, bucket, chave);
    } catch (erro) {
        if (erro.name === "NoSuchKey" || erro.$metadata?.httpStatusCode === 404) return [];
        throw erro;
    }
}

async function buscarMetricasGold(idEmpresa) {
    // Lê os CSVs atuais e históricos da empresa no S3 para montar as séries da dashboard.
    const bucket = process.env.BUCKET_GOLD;
    if (!bucket) throw new Error("BUCKET_GOLD não foi configurado.");

    const cliente = new aws.S3Client({ region: process.env.AWS_REGION || "us-east-1" });

    try {
        const atuais = await lerCsvGoldOpcional(
            cliente,
            bucket,
            `gold/${idEmpresa}/atual/resumo_metricas.csv`
        );
        const resumo6h = await lerCsvGoldOpcional(
            cliente,
            bucket,
            `gold/${idEmpresa}/atual/resumo_metricas_6h.csv`
        );

        const chaves = await listarChavesHistoricas(cliente, bucket, idEmpresa);
        const linhas = [];

        for (let i = 0; i < chaves.length; i += 5) {
            const lote = chaves.slice(i, i + 5);
            const leituras = [];
            for (const chave of lote) {
                leituras.push(lerCsvGold(cliente, bucket, chave));
            }

            // Aguarda até cinco arquivos em paralelo antes de iniciar o próximo grupo.
            const resultados = await Promise.all(leituras);
            for (const registros of resultados) {
                for (const registro of registros) {
                    linhas.push(registro);
                }
            }
        }

        return { atual: atuais, resumo6h, historico: linhas };
    } finally {
        cliente.destroy();
    }
}

module.exports = {
    buscarEmpresaDoUsuario,
    buscarEmpresaPorId,
    buscarServidoresDaEmpresa,
    buscarMetricasGold,
    prepararServidores,
    montarResposta
};
