var projeto = process.env.JIRA_ALERTA_PROJECT_KEY || "SUP";

// Prazo (em minutos) para resolver um chamado, por gravidade.
// Defina o de vocês no .env (JIRA_SLA_CRITICO_MIN e JIRA_SLA_ALERTA_MIN).
var SLA_MINUTOS = {
    critico: Number(process.env.JIRA_SLA_CRITICO_MIN) || 30,
    alerta: Number(process.env.JIRA_SLA_ALERTA_MIN) || 60
};

var MINUTO = 60 * 1000;
var HORA = 60 * MINUTO;

// Cada período do dashboard é dividido em "baldes" (as barras do gráfico)
var PERIODOS = {
    "24h": { baldes: 12, tamanho: 2 * HORA },
    "7d": { baldes: 7, tamanho: 24 * HORA },
    "30d": { baldes: 30, tamanho: 24 * HORA }
};

var CAMPOS = [
    "summary",
    "description",
    "status",
    "created",
    "updated",
    "resolutiondate",
    "priority",
    "assignee",
    "reporter",
    "issuetype",
    "labels"
];

function obterBaseUrl() {
    var dominio = process.env.JIRA_DOMAIN;

    if (!dominio) {
        throw new Error("JIRA_DOMAIN não está configurado no .env.");
    }

    dominio = dominio.replace(/^https?:\/\//, "").replace(/\/$/, "");

    if (!dominio.includes(".atlassian.net")) {
        dominio += ".atlassian.net";
    }

    return "https://" + dominio;
}

function obterCabecalhos() {
    if (!process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN) {
        throw new Error("JIRA_EMAIL ou JIRA_API_TOKEN não está configurado no .env.");
    }

    var token = Buffer.from(
        process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
    ).toString("base64");

    return {
        Authorization: "Basic " + token,
        Accept: "application/json",
        "Content-Type": "application/json"
    };
}

async function requisicaoJira(caminho, metodo, corpo) {
    var opcoes = {
        method: metodo || "GET",
        headers: obterCabecalhos()
    };

    if (corpo) {
        opcoes.body = JSON.stringify(corpo);
    }

    var resposta = await fetch(obterBaseUrl() + caminho, opcoes);
    var texto = await resposta.text();
    var dados = {};

    if (texto) {
        try {
            dados = JSON.parse(texto);
        } catch (erro) {
            dados = { mensagem: texto };
        }
    }

    if (!resposta.ok) {
        var mensagem = dados.errorMessages
            ? dados.errorMessages.join(", ")
            : dados.message || dados.mensagem || "Erro na comunicação com o Jira.";

        var erroJira = new Error(mensagem);
        erroJira.status = resposta.status;
        throw erroJira;
    }

    return dados;
}

function converterDescricao(conteudo) {
    if (!conteudo) return "";

    if (typeof conteudo === "string") return conteudo;

    if (Array.isArray(conteudo)) {
        return conteudo.map(converterDescricao).filter(Boolean).join("\n");
    }

    var texto = conteudo.text || "";
    var filhos = conteudo.content
        ? converterDescricao(conteudo.content)
        : "";

    return [texto, filhos].filter(Boolean).join("");
}

// Gravidade (não depende de o chamado já estar resolvido).
// Prioridade Highest = Crítico; o resto = Atenção.
function calcularSeveridade(issue) {
    var prioridade = issue.fields.priority
        ? issue.fields.priority.name.toLowerCase()
        : "";

    var titulo = (issue.fields.summary || "").toUpperCase();

    if (
        prioridade.includes("highest") ||
        prioridade.includes("blocker") ||
        prioridade.includes("critical") ||
        prioridade.includes("crítica") ||
        prioridade.includes("critica") ||
        titulo.startsWith("[CRÍTICO]") ||
        titulo.startsWith("[CRITICO]")
    ) {
        return "critico";
    }

    return "alerta";
}

function classificarStatus(issue) {
    var categoria = issue.fields.status &&
        issue.fields.status.statusCategory
        ? issue.fields.status.statusCategory.key
        : "";

    if (categoria === "done") {
        return "resolvido";
    }

    return calcularSeveridade(issue);
}

function identificarComponente(texto) {
    var t = texto.toLowerCase();

    if (t.includes("cpu")) return "CPU";
    if (t.includes("ram") || t.includes("memória") || t.includes("memoria")) return "RAM";
    if (t.includes("disco")) return "Disco";
    if (t.includes("rede")) return "Rede";

    return "Outros";
}

// "srv-servidor1" -> "Servidor 1" | "emp-atlas-media" -> "Atlas Media"
function nomeDoRotulo(rotulo, prefixo) {
    return rotulo.slice(prefixo.length)
        .replace(/-/g, " ")
        .replace(/([a-zA-Z])(\d)/g, "$1 $2")
        .replace(/\b\w/g, function (letra) { return letra.toUpperCase(); });
}

// "Servidor 1" -> "servidor1"
function slug(texto) {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function acharRotulo(rotulos, prefixo) {
    return rotulos.find(function (rotulo) {
        return rotulo.startsWith(prefixo);
    }) || null;
}

// Plano B quando o chamado ainda não tem labels.
// Exemplo de título: "[ATENÇÃO] Servidor 1 - CPU em 83,74%"
function extrairDadosDoTitulo(titulo) {
    var partes = /^\[[^\]]+\]\s*(.+?)\s+[-–—]\s+(.+?)\s+em\s+([\d.,]+)/i.exec(titulo || "");

    if (!partes) {
        return { servidor: null, componente: null, medido: null };
    }

    return {
        servidor: partes[1].trim(),
        componente: identificarComponente(partes[2]),
        medido: converterNumero(partes[3])
    };
}

function converterNumero(texto) {
    var numero = parseFloat(String(texto).replace(",", "."));

    return isNaN(numero) ? null : numero;
}

// Lê "medido=98.2 limite=85" gravado na descrição pelo Java
function extrairMedidoELimite(descricao) {
    var medido = /medido\s*=\s*([\d.,]+)/i.exec(descricao || "");
    var limite = /limite\s*=\s*([\d.,]+)/i.exec(descricao || "");

    return {
        medido: medido ? converterNumero(medido[1]) : null,
        limite: limite ? converterNumero(limite[1]) : null
    };
}

function formatarAlerta(issue) {
    var campos = issue.fields || {};
    var status = campos.status || {};
    var prioridade = campos.priority || {};
    var tipo = campos.issuetype || {};
    var rotulos = campos.labels || [];

    var descricao = converterDescricao(campos.description);
    var doTitulo = extrairDadosDoTitulo(campos.summary);
    var medidos = extrairMedidoELimite(descricao);

    var rotuloServidor = acharRotulo(rotulos, "srv-");
    var rotuloEmpresa = acharRotulo(rotulos, "emp-");
    var rotuloComponente = acharRotulo(rotulos, "comp-");

    var servidor = rotuloServidor
        ? nomeDoRotulo(rotuloServidor, "srv-")
        : doTitulo.servidor;

    return {
        id: issue.id,
        chave: issue.key,
        titulo: campos.summary || "Sem título",
        descricao: descricao,
        status: classificarStatus(issue),
        severidade: calcularSeveridade(issue),
        statusJira: status.name || "Não informado",
        categoriaStatus: status.statusCategory
            ? status.statusCategory.key
            : "",
        prioridade: prioridade.name || "Não definida",
        tipo: tipo.name || "Não definido",
        responsavel: campos.assignee
            ? campos.assignee.displayName
            : "Não atribuído",
        relator: campos.reporter
            ? campos.reporter.displayName
            : "Não informado",
        etiquetas: rotulos,
        servidor: servidor,
        servidorChave: rotuloServidor || (servidor ? "srv-" + slug(servidor) : null),
        empresa: rotuloEmpresa ? nomeDoRotulo(rotuloEmpresa, "emp-") : null,
        componente: rotuloComponente
            ? identificarComponente(rotuloComponente)
            : doTitulo.componente,
        medido: medidos.medido !== null ? medidos.medido : doTitulo.medido,
        limite: medidos.limite,
        hora: campos.created || null,
        atualizado: campos.updated || null,
        resolvidoEm: campos.resolutiondate || null,
        url: obterBaseUrl() + "/browse/" + issue.key
    };
}

// O Jira devolve até 100 por vez; se houver mais, manda um nextPageToken
async function buscarIssues(jql, maxPaginas) {
    var issues = [];
    var token = null;
    var paginas = 0;

    do {
        var corpo = { jql: jql, maxResults: 100, fields: CAMPOS };

        if (token) {
            corpo.nextPageToken = token;
        }

        var resultado = await requisicaoJira("/rest/api/3/search/jql", "POST", corpo);

        issues = issues.concat(resultado.issues || []);
        token = resultado.nextPageToken || null;
        paginas++;

    } while (token && paginas < maxPaginas);

    return issues;
}

async function listarAlertas() {
    var jql = 'project = "' + projeto + '" ORDER BY created DESC';

    var issues = await buscarIssues(jql, 1);

    return issues.map(formatarAlerta);
}

async function buscarAlerta(chave) {
    var issue = await requisicaoJira(
        "/rest/api/3/issue/" + encodeURIComponent(chave) +
        "?fields=" + CAMPOS.join(","),
        "GET"
    );

    return formatarAlerta(issue);
}

// PONTO DE INTEGRAÇÃO: última coleta de cada servidor (Data Lake / S3 ou banco).
// Deve devolver, por servidor, o horário do último dado: { "srv-servidor1": "2026-11-19T14:31:00Z" }
async function buscarUltimasColetas() {
    return {};
}

function periodoValido(chave) {
    return Object.prototype.hasOwnProperty.call(PERIODOS, chave);
}

function minutosEntre(inicioIso, fimIso) {
    return (new Date(fimIso).getTime() - new Date(inicioIso).getTime()) / MINUTO;
}

function mediaMinutos(alertas) {
    if (alertas.length === 0) return null;

    var soma = alertas.reduce(function (total, alerta) {
        return total + minutosEntre(alerta.hora, alerta.resolvidoEm);
    }, 0);

    return Math.round(soma / alertas.length);
}

function ordenarPorNome(a, b) {
    return a.nome.localeCompare(b.nome, "pt-BR", { numeric: true });
}

function ordenarContagem(objeto) {
    return Object.keys(objeto)
        .map(function (nome) { return { nome: nome, total: objeto[nome] }; })
        .sort(function (a, b) { return b.total - a.total; });
}

async function obterDashboard(chavePeriodo, filtros) {
    filtros = filtros || {};

    var periodo = PERIODOS[chavePeriodo] || PERIODOS["24h"];
    var duracao = periodo.baldes * periodo.tamanho;
    var agora = Date.now();
    var inicio = agora - duracao;
    var inicioAnterior = inicio - duracao;
    var horasBusca = (duracao * 2) / HORA;

    var inicioDoDia = new Date();
    inicioDoDia.setHours(0, 0, 0, 0);
    inicioDoDia = inicioDoDia.getTime();

    // Base da consulta: projeto + empresa do usuário (label emp-*)
    var base = 'project = "' + projeto + '"';

    if (filtros.empresa) {
        base += ' AND labels = "' + filtros.empresa + '"';
    }

    // 3 consultas: criados (período atual + anterior), abertos agora e resolvidos
    var resultados = await Promise.all([
        buscarIssues(base + " AND created >= -" + horasBusca + "h ORDER BY created DESC", 10),
        buscarIssues(base + " AND statusCategory != Done ORDER BY created DESC", 5),
        buscarIssues(base + " AND resolved >= -" + horasBusca + "h ORDER BY resolved DESC", 10)
    ]);

    var criadosTodos = resultados[0].map(formatarAlerta);
    var abertosTodos = resultados[1].map(formatarAlerta);
    var resolvidosTodos = resultados[2].map(formatarAlerta);

    // Lista do seletor de servidor (antes de filtrar)
    var vistos = {};

    criadosTodos.concat(abertosTodos).forEach(function (alerta) {
        if (alerta.servidorChave) {
            vistos[alerta.servidorChave] = alerta.servidor;
        }
    });

    var servidoresDisponiveis = Object.keys(vistos)
        .map(function (chave) { return { chave: chave, nome: vistos[chave] }; })
        .sort(ordenarPorNome);

    // O Jira não filtra por servidor com a nossa lógica de fallback, então filtramos aqui
    function doServidor(alerta) {
        return !filtros.servidor || alerta.servidorChave === filtros.servidor;
    }

    var criados = criadosTodos.filter(doServidor);
    var abertos = abertosTodos.filter(doServidor);
    var resolvidos = resolvidosTodos.filter(doServidor);

    // --- Período atual x anterior ---
    var doPeriodo = [];
    var criadosAnterior = 0;

    criados.forEach(function (alerta) {
        var momento = new Date(alerta.hora).getTime();

        if (momento >= inicio) {
            doPeriodo.push(alerta);
        } else if (momento >= inicioAnterior) {
            criadosAnterior++;
        }
    });

    var resolvidosCriados = doPeriodo.filter(function (alerta) {
        return alerta.categoriaStatus === "done";
    }).length;

    // --- Alertas em aberto e variação desde o começo do dia ---
    var abertosNoInicioDoDia =
        abertos.filter(function (alerta) {
            return new Date(alerta.hora).getTime() < inicioDoDia;
        }).length +
        resolvidos.filter(function (alerta) {
            return new Date(alerta.hora).getTime() < inicioDoDia &&
                alerta.resolvidoEm &&
                new Date(alerta.resolvidoEm).getTime() >= inicioDoDia;
        }).length;

    // --- Tempo para resolver e prazo (SLA) ---
    var resolvidosAtual = resolvidos.filter(function (alerta) {
        return alerta.resolvidoEm && new Date(alerta.resolvidoEm).getTime() >= inicio;
    });

    var resolvidosAnterior = resolvidos.filter(function (alerta) {
        var momento = alerta.resolvidoEm ? new Date(alerta.resolvidoEm).getTime() : 0;

        return momento >= inicioAnterior && momento < inicio;
    });

    var dentroDoSla = null;

    if (resolvidosAtual.length > 0) {
        var noPrazo = resolvidosAtual.filter(function (alerta) {
            return minutosEntre(alerta.hora, alerta.resolvidoEm) <= SLA_MINUTOS[alerta.severidade];
        }).length;

        dentroDoSla = Math.round(noPrazo / resolvidosAtual.length * 100);
    }

    // --- Etapas dos chamados e o mais antigo ainda aberto ---
    var etapas = {
        abertos: abertos.filter(function (a) { return a.categoriaStatus !== "indeterminate"; }).length,
        emAndamento: abertos.filter(function (a) { return a.categoriaStatus === "indeterminate"; }).length,
        resolvidos: resolvidosAtual.length
    };

    var maisAntigo = null;

    if (abertos.length > 0) {
        var antigo = abertos[abertos.length - 1]; // lista vem do mais novo pro mais antigo

        maisAntigo = {
            chave: antigo.chave,
            minutos: Math.round((agora - new Date(antigo.hora).getTime()) / MINUTO)
        };
    }

    // --- Recorrentes: mesmo servidor + componente de novo em menos de 24h ---
    var recorrentes = 0;
    var ultimaVez = {};

    doPeriodo.slice().reverse().forEach(function (alerta) {
        if (!alerta.servidorChave || !alerta.componente) return;

        var chave = alerta.servidorChave + "|" + alerta.componente;
        var momento = new Date(alerta.hora).getTime();

        if (ultimaVez[chave] !== undefined && momento - ultimaVez[chave] <= 24 * HORA) {
            recorrentes++;
        }

        ultimaVez[chave] = momento;
    });

    // --- Barras do gráfico ---
    function posicaoNoBalde(alerta) {
        var posicao = Math.floor((new Date(alerta.hora).getTime() - inicio) / periodo.tamanho);

        return Math.min(Math.max(posicao, 0), periodo.baldes - 1);
    }

    var baldes = [];

    for (var i = 0; i < periodo.baldes; i++) {
        baldes.push({
            inicio: new Date(inicio + i * periodo.tamanho).toISOString(),
            alerta: 0,
            critico: 0
        });
    }

    doPeriodo.forEach(function (alerta) {
        baldes[posicaoNoBalde(alerta)][alerta.severidade]++;
    });

    // --- Servidores ---
    var porServidor = {};

    doPeriodo.forEach(function (alerta) {
        var chave = alerta.servidorChave || "srv-nao-identificado";

        if (!porServidor[chave]) {
            porServidor[chave] = {
                chave: chave,
                nome: alerta.servidor || "Não identificado",
                empresa: alerta.empresa,
                total: 0,
                criticos: 0,
                abertos: 0,
                componentes: {},
                ultimoAlerta: alerta.hora // o primeiro que aparece é o mais recente
            };
        }

        var servidor = porServidor[chave];
        var componente = alerta.componente || "Outros";

        servidor.total++;
        servidor.componentes[componente] = (servidor.componentes[componente] || 0) + 1;

        if (alerta.severidade === "critico") {
            servidor.criticos++;
        }
    });

    abertos.forEach(function (alerta) {
        var chave = alerta.servidorChave || "srv-nao-identificado";

        if (porServidor[chave]) {
            porServidor[chave].abertos++;
        }
    });

    var coletas = await buscarUltimasColetas();

    var servidores = Object.keys(porServidor)
        .map(function (chave) { return porServidor[chave]; })
        .sort(function (a, b) { return b.total - a.total; })
        .slice(0, 5)
        .map(function (servidor) {
            return {
                chave: servidor.chave,
                nome: servidor.nome,
                empresa: servidor.empresa,
                total: servidor.total,
                criticos: servidor.criticos,
                abertos: servidor.abertos,
                componentes: ordenarContagem(servidor.componentes),
                ultimoAlerta: servidor.ultimoAlerta,
                ultimaColeta: coletas[servidor.chave] || null
            };
        });

    // --- Insight: servidor que mais concentra alertas ---
    var insight = null;

    if (servidores.length > 0 && doPeriodo.length > 0) {
        var topo = servidores[0];
        var somaTopo = topo.componentes[0].total;
        var nomesComponentes = [topo.componentes[0].nome];
        var quaseTodos = false;

        if (somaTopo / topo.total >= 0.8) {
            quaseTodos = true;
        } else if (topo.componentes.length > 1 &&
            (somaTopo + topo.componentes[1].total) / topo.total >= 0.8) {
            quaseTodos = true;
            nomesComponentes.push(topo.componentes[1].nome);
        }

        // Faixa de 2 duas barras seguidas com mais alertas desse servidor (só faz sentido no período de 24h)
        var janela = null;

        if (chavePeriodo === "24h") {
            var contagem = baldes.map(function () { return 0; });

            doPeriodo.forEach(function (alerta) {
                if ((alerta.servidorChave || "srv-nao-identificado") === topo.chave) {
                    contagem[posicaoNoBalde(alerta)]++;
                }
            });

            var melhor = 0;
            var melhorSoma = -1;

            for (var j = 0; j < contagem.length - 1; j++) {
                if (contagem[j] + contagem[j + 1] > melhorSoma) {
                    melhorSoma = contagem[j] + contagem[j + 1];
                    melhor = j;
                }
            }

            if (melhorSoma / topo.total >= 0.5) {
                janela = [melhor, melhor + 1];
            }
        }

        insight = {
            servidor: topo.nome,
            total: topo.total,
            totalGeral: doPeriodo.length,
            percentual: Math.round(topo.total / doPeriodo.length * 100),
            componentes: nomesComponentes,
            quaseTodos: quaseTodos,
            janela: janela
        };
    }

    // --- Histórico: TODOS os alertas do período, com os resolvidos no final ---
    // (dentro de cada grupo continua do mais novo para o mais antigo)
    var historico = doPeriodo.filter(function (alerta) {
        return alerta.categoriaStatus !== "done";
    }).concat(doPeriodo.filter(function (alerta) {
        return alerta.categoriaStatus === "done";
    }));

    return {
        periodo: chavePeriodo,
        abertos: abertos.length,
        variacaoAbertos: abertos.length - abertosNoInicioDoDia,
        criticosAbertos: abertos.filter(function (a) { return a.severidade === "critico"; }).length,
        criados: doPeriodo.length,
        criadosAnterior: criadosAnterior,
        resolvidosCriados: resolvidosCriados,
        taxaResolucao: doPeriodo.length > 0
            ? Math.round(resolvidosCriados / doPeriodo.length * 100)
            : null,
        tempoMedioMinutos: mediaMinutos(resolvidosAtual),
        tempoMedioAnteriorMinutos: mediaMinutos(resolvidosAnterior),
        recorrentes: recorrentes,
        baldes: baldes,
        etapas: etapas,
        dentroDoSla: dentroDoSla,
        maisAntigo: maisAntigo,
        insight: insight,
        servidores: servidores,
        servidoresDisponiveis: servidoresDisponiveis,
        historico: historico,
        notificacoes: abertos.slice(0, 20).map(function (alerta) {
            return { chave: alerta.chave, titulo: alerta.titulo, status: alerta.severidade };
        })
    };
}

async function reconhecerAlerta(chave) {
    var resultado = await requisicaoJira(
        "/rest/api/3/issue/" + encodeURIComponent(chave) + "/transitions",
        "GET"
    );

    var transicoes = resultado.transitions || [];

    // Reconhecer significa concluir o chamado no fluxo do Jira.
    var transicao = transicoes.find(function (item) {
        return item.to &&
            item.to.statusCategory &&
            item.to.statusCategory.key === "done";
    });

    if (!transicao) {
        throw new Error(
            "O Jira não disponibilizou uma transição para concluir este chamado. Verifique o workflow e as permissões do usuário da integração."
        );
    }

    await requisicaoJira(
        "/rest/api/3/issue/" + encodeURIComponent(chave) + "/transitions",
        "POST",
        {
            transition: {
                id: transicao.id
            }
        }
    );

    return true;
}

module.exports = {
    listarAlertas: listarAlertas,
    buscarAlerta: buscarAlerta,
    obterDashboard: obterDashboard,
    periodoValido: periodoValido,
    reconhecerAlerta: reconhecerAlerta
};