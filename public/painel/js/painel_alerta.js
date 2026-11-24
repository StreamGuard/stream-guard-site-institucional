const ic = (nome) => `<svg class="sg-ic" aria-hidden="true"><use href="#sg-${nome}"/></svg>`;
const esc = (texto) => SGModal.escapar(texto);

let dashboard = null;
let periodoAtual = "24h";
let servidorAtual = "";
let filtroAtual = 0;
let limiteHistorico = 6;

const statusInfo = {
    critico: { cor: "vermelho", texto: "Crítico", icone: "alert" },
    alerta: { cor: "laranja", texto: "Alerta", icone: "bell" },
    resolvido: { cor: "verde", texto: "Resolvido", icone: "check" }
};

const filtros = [
    { valor: "todos", texto: "Filtrar histórico" },
    { valor: "critico", texto: "Só críticos" },
    { valor: "alerta", texto: "Só alertas" },
    { valor: "resolvido", texto: "Só resolvidos" }
];

// Textos que mudam conforme o período escolhido
const TEXTO_PERIODO = {
    "24h": {
        titulo: "nas últimas 24 h",
        anterior: "ontem",
        tituloGrafico: "Alertas ao longo do dia",
        subGrafico: "Quantos alertas por faixa de 2 horas, últimas 24 h"
    },
    "7d": {
        titulo: "nos últimos 7 dias",
        anterior: "7 dias anteriores",
        tituloGrafico: "Alertas ao longo da semana",
        subGrafico: "Quantos alertas por dia, últimos 7 dias"
    },
    "30d": {
        titulo: "nos últimos 30 dias",
        anterior: "30 dias anteriores",
        tituloGrafico: "Alertas ao longo do mês",
        subGrafico: "Quantos alertas por dia, últimos 30 dias"
    }
};

function obterEmpresaDoUsuario() {
    return sessionStorage.getItem("EMPRESA_JIRA") || null;
}

// 90 -> "1 h 30 min" | 18 -> "18 min" | 3000 -> "2 d 2 h" | null -> "–"
function formatarMinutos(minutos) {
    if (minutos === null || minutos === undefined) return "–";

    minutos = Math.round(minutos);

    if (minutos < 60) return minutos + " min";

    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;

    if (horas < 24) {
        return resto === 0 ? horas + " h" : horas + " h " + resto + " min";
    }

    const dias = Math.floor(horas / 24);
    const horasRestantes = horas % 24;

    return horasRestantes === 0 ? dias + " d" : dias + " d " + horasRestantes + " h";
}

function minutosDesde(iso) {
    return Math.max(0, (Date.now() - new Date(iso).getTime()) / 60000);
}

function haQuanto(iso) {
    return iso ? "há " + formatarMinutos(minutosDesde(iso)) : "–";
}

function formatarDataHora(iso) {
    if (!iso) return "–";

    const data = new Date(iso);
    const dois = (numero) => String(numero).padStart(2, "0");

    return `${dois(data.getDate())}/${dois(data.getMonth() + 1)} ${dois(data.getHours())}:${dois(data.getMinutes())}`;
}

function numeroBR(numero) {
    return numero.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

// Mostra "▼ 2 vs. ontem" (verde se diminuiu, laranja se aumentou)
function notaVariacao(diferenca, unidade, comparado) {
    if (diferenca === 0) {
        return { texto: "= igual a " + comparado, classe: "nota-neutro" };
    }

    const seta = diferenca > 0 ? "▲" : "▼";

    return {
        texto: `${seta} ${Math.abs(diferenca)}${unidade} vs. ${comparado}`,
        classe: diferenca > 0 ? "nota-ruim" : "nota-bom"
    };
}

async function carregarDashboard() {
    const parametros = new URLSearchParams({ periodo: periodoAtual });
    const empresa = obterEmpresaDoUsuario();

    if (empresa) parametros.set("empresa", empresa);
    if (servidorAtual) parametros.set("servidor", servidorAtual);

    try {
        const resposta = await fetch("/alerta/dashboard?" + parametros.toString());
        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.mensagem || "Erro ao montar o dashboard.");
        }

        dashboard = dados;

        desenharSeletorServidor();
        desenharResumo();
        desenharInsight();
        desenharGrafico();
        desenharChamados();
        desenharServidores();
        desenharHistorico();
        atualizarSino();

    } catch (erro) {
        console.error("Erro ao carregar o dashboard:", erro);

        document.getElementById("resumo").innerHTML =
            `<p class="vazio">Não foi possível carregar o dashboard do Jira.</p>`;
    }
}

function desenharResumo() {
    const d = dashboard;
    const periodo = TEXTO_PERIODO[periodoAtual];

    // 1) Em aberto
    const notaAbertos = d.variacaoAbertos === 0 && d.abertos === 0
        ? { texto: "Nenhum chamado aberto", classe: "nota-bom" }
        : notaVariacao(d.variacaoAbertos, "", "ontem");

    // 3) Tempo médio
    let notaTempo = { texto: "Sem chamados resolvidos", classe: "nota-neutro" };

    if (d.tempoMedioMinutos !== null && d.tempoMedioAnteriorMinutos !== null) {
        notaTempo = notaVariacao(
            d.tempoMedioMinutos - d.tempoMedioAnteriorMinutos, " min", periodo.anterior
        );
    } else if (d.tempoMedioMinutos !== null) {
        notaTempo = { texto: "Sem período anterior para comparar", classe: "nota-neutro" };
    }

    // 5) Total no período
    let notaTotal = { texto: "Sem alertas no período anterior", classe: "nota-neutro" };

    if (d.criadosAnterior > 0) {
        const percentual = Math.round((d.criados - d.criadosAnterior) / d.criadosAnterior * 100);

        notaTotal = notaVariacao(percentual, "%", periodo.anterior);
    }

    const cards = [
        {
            titulo: "Alertas em aberto",
            valor: d.abertos,
            nota: notaAbertos
        },
        {
            titulo: "Críticos em aberto",
            valor: d.criticosAbertos,
            critico: d.criticosAbertos > 0,
            nota: d.criticosAbertos > 0
                ? { texto: "Precisa de ação agora", classe: "nota-critico" }
                : { texto: "Nenhum crítico aberto", classe: "nota-bom" }
        },
        {
            titulo: "Tempo médio p/ resolver",
            valor: formatarMinutos(d.tempoMedioMinutos),
            nota: notaTempo
        },
        {
            titulo: "Taxa de resolução",
            valor: d.taxaResolucao === null ? "–" : d.taxaResolucao + "%",
            nota: { texto: `${d.resolvidosCriados} de ${d.criados} chamados`, classe: "nota-neutro" }
        },
        {
            titulo: "Alertas " + periodo.titulo,
            valor: d.criados,
            nota: notaTotal
        },
        {
            titulo: "Alertas recorrentes",
            valor: d.recorrentes,
            nota: { texto: "Mesmo item em < 24 h", classe: d.recorrentes > 0 ? "nota-ruim" : "nota-neutro" }
        }
    ];

    document.getElementById("resumo").innerHTML = cards.map((card) => `
        <article class="kpi">
            <span class="kpi-titulo">${card.titulo}</span>
            <strong class="kpi-valor ${card.critico ? "critico" : ""}">${card.valor}</strong>
            <span class="kpi-nota ${card.nota.classe}">${card.nota.texto}</span>
        </article>
    `).join("");
}

function desenharInsight() {
    const caixa = document.getElementById("insight");
    const i = dashboard.insight;

    // Com só um servidor (ou com filtro de servidor) a frase não ajuda
    if (!i || dashboard.servidores.length < 2) {
        caixa.hidden = true;
        return;
    }

    let texto = `O <strong>${esc(i.servidor)}</strong> concentra ${i.percentual}% dos alertas (${i.total} de ${i.totalGeral})`;

    if (i.componentes[0] !== "Outros") {
        texto += `, ${i.quaseTodos ? "quase todos de" : "principalmente de"} ${i.componentes.join(" e ")}`;
    }

    if (i.janela) {
        const de = new Date(dashboard.baldes[i.janela[0]].inicio).getHours();
        const ate = new Date(dashboard.baldes[i.janela[1]].inicio).getHours() + 2;

        texto += `, entre ${de} h e ${ate} h`;
    }

    texto += i.percentual >= 40 ? ". Vale revisar a capacidade desse servidor." : ".";

    caixa.innerHTML = `<span class="tag">INSIGHT</span><span>${texto}</span>`;
    caixa.hidden = false;
}

// Escolhe de quanto em quanto o eixo vertical sobe (0, 2, 4, 6, 8...)
function escalaEixo(maximo) {
    const passos = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
    const passo = passos.find((p) => maximo / p <= 4) || 1000;

    return { passo: passo, topo: passo * Math.ceil(maximo / passo) };
}

function desenharGrafico() {
    const textos = TEXTO_PERIODO[periodoAtual];
    const baldes = dashboard.baldes;
    const caixa = document.getElementById("grafico");

    document.getElementById("tituloGrafico").textContent = textos.tituloGrafico;
    document.getElementById("subGrafico").textContent = textos.subGrafico;

    if (dashboard.criados === 0) {
        caixa.innerHTML = `<p class="vazio">Nenhum alerta neste período.</p>`;
        return;
    }

    const maximo = Math.max(...baldes.map((b) => b.alerta + b.critico));
    const escala = escalaEixo(maximo);
    const porHora = periodoAtual === "24h";
    const intervaloRotulo = baldes.length > 12 ? 5 : 1;

    const marcas = [];

    for (let valor = 0; valor <= escala.topo; valor += escala.passo) {
        marcas.push(valor);
    }

    const rotulo = (balde) => {
        const data = new Date(balde.inicio);

        return porHora
            ? String(data.getHours()).padStart(2, "0") + "h"
            : data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    };

    caixa.innerHTML = `
        <div class="grafico">

            <div class="eixo-y">
                ${marcas.map((valor) => `<span style="bottom: ${valor / escala.topo * 100}%">${valor}</span>`).join("")}
            </div>

            <div class="plot">
                ${marcas.map((valor) => `<i class="linha-grade" style="bottom: ${valor / escala.topo * 100}%"></i>`).join("")}

                <div class="barras">
                    ${baldes.map((balde) => {
                        const total = balde.alerta + balde.critico;
                        const altura = total / escala.topo * 100;

                        return `
                            <div class="col-barra"
                                title="${rotulo(balde)}: ${balde.critico} crítico(s), ${balde.alerta} atenção">
                                ${total === 0 ? "" : `
                                    <span class="valor-barra" style="bottom: ${altura}%">${total}</span>
                                    <div class="pilha" style="height: ${altura}%">
                                        <i class="seg-critico" style="flex: ${balde.critico}"></i>
                                        <i class="seg-alerta" style="flex: ${balde.alerta}"></i>
                                    </div>
                                `}
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>

            <div class="eixo-x">
                ${baldes.map((balde, indice) => `<span>${indice % intervaloRotulo === 0 ? rotulo(balde) : ""}</span>`).join("")}
            </div>

        </div>
    `;
}

function desenharChamados() {
    const e = dashboard.etapas;
    const total = e.abertos + e.emAndamento + e.resolvidos;
    const caixa = document.getElementById("chamados");

    document.getElementById("subChamados").textContent =
        `Em que etapa estão os alertas · ${dashboard.criados} chamados criados ${TEXTO_PERIODO[periodoAtual].titulo}`;

    if (total === 0) {
        caixa.innerHTML = `<p class="vazio">Nenhum chamado neste período.</p>`;
        return;
    }

    const itens = [
        { nome: "Abertos", cor: "vermelho", quantidade: e.abertos },
        { nome: "Em andamento", cor: "laranja", quantidade: e.emAndamento },
        { nome: "Resolvidos", cor: "verde", quantidade: e.resolvidos }
    ];

    caixa.innerHTML = `
        <div class="pilha-etapas">
            ${itens.map((item) => `
                <i style="width: ${item.quantidade / total * 100}%; background: var(--${item.cor})"></i>
            `).join("")}
        </div>

        ${itens.map((item) => `
            <div class="linha-info">
                <span class="nome">
                    <i class="ponto" style="background: var(--${item.cor})"></i>${item.nome}
                </span>
                <strong>${item.quantidade}</strong>
            </div>
        `).join("")}

        ${dashboard.dentroDoSla === null ? "" : `
            <div class="linha-info suave">
                <span>Resolvidos dentro do prazo (SLA)</span>
                <strong class="nota-bom">${dashboard.dentroDoSla}%</strong>
            </div>
        `}

        ${dashboard.maisAntigo === null ? "" : `
            <div class="linha-info suave">
                <span>Chamado aberto mais antigo</span>
                <strong class="nota-neutro">${esc(dashboard.maisAntigo.chave)} · ${formatarMinutos(dashboard.maisAntigo.minutos)}</strong>
            </div>
        `}
    `;
}

function desenharServidores() {
    const lista = dashboard.servidores;
    const caixa = document.getElementById("servidores");

    document.getElementById("subServidores").textContent =
        "Quem precisa de atenção primeiro · " + TEXTO_PERIODO[periodoAtual].titulo;

    if (lista.length === 0) {
        caixa.innerHTML = `<p class="vazio">Nenhum alerta neste período.</p>`;
        return;
    }

    const maximo = lista[0].total;

    caixa.innerHTML = `
        <table class="tabela">
            <thead>
                <tr>
                    <th>Servidor</th>
                    <th>Empresa</th>
                    <th>Volume</th>
                    <th class="centro">Alertas</th>
                    <th>Componentes</th>
                    <th class="centro">Críticos</th>
                    <th class="centro">Chamados abertos</th>
                    <th>Último alerta</th>
                    <th>Última coleta</th>
                </tr>
            </thead>
            <tbody>
                ${lista.map((servidor) => {
                    const proporcao = servidor.total / maximo;
                    const cor = proporcao >= 0.7 ? "vermelho" : proporcao >= 0.2 ? "laranja" : "verde";

                    const coleta = servidor.ultimaColeta
                        ? `<span class="coleta">
                               <i class="ponto" style="background: var(--${minutosDesde(servidor.ultimaColeta) > 5 ? "laranja" : "verde"})"></i>${haQuanto(servidor.ultimaColeta)}
                           </span>`
                        : "–";

                    return `
                        <tr>
                            <td><strong>${esc(servidor.nome)}</strong></td>
                            <td>${servidor.empresa ? esc(servidor.empresa) : "–"}</td>
                            <td>
                                <div class="trilho">
                                    <i style="width: ${proporcao * 100}%; background: var(--${cor})"></i>
                                </div>
                            </td>
                            <td class="centro"><strong>${servidor.total}</strong></td>
                            <td>${servidor.componentes.slice(0, 2).map((c) => `${esc(c.nome)} ${c.total}`).join(" · ")}</td>
                            <td class="centro ${servidor.criticos > 0 ? "perigo" : ""}">${servidor.criticos}</td>
                            <td class="centro">${servidor.abertos}</td>
                            <td>${haQuanto(servidor.ultimoAlerta)}</td>
                            <td>${coleta}</td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;
}

function historicoFiltrado() {
    const filtro = filtros[filtroAtual].valor;

    return dashboard.historico.filter((alerta) => {
        return filtro === "todos" || alerta.status === filtro;
    });
}

function desenharHistorico() {
    const filtro = filtros[filtroAtual].valor;
    const caixa = document.getElementById("historico");
    const mensagemVazia = document.getElementById("mensagemVazia");
    const botaoMais = document.getElementById("btnMais");

    const filtrados = historicoFiltrado();

    const visiveis = filtrados.slice(0, limiteHistorico);
    const totalGeral = filtro === "todos" ? dashboard.criados : filtrados.length;

    document.getElementById("subHistorico").textContent =
        `Ocorrências mais recentes · mostrando ${visiveis.length} de ${totalGeral}`;

    mensagemVazia.hidden = filtrados.length > 0;
    botaoMais.hidden = filtrados.length <= 6;
    botaoMais.textContent = visiveis.length < filtrados.length
        ? `Mostrar mais (restam ${filtrados.length - visiveis.length})`
        : "Mostrar menos";

    if (filtrados.length === 0) {
        caixa.innerHTML = "";
        return;
    }

    caixa.innerHTML = `
        <table class="tabela" style="min-width: 1100px">
            <thead>
                <tr>
                    <th>Gravidade</th>
                    <th>Chamado</th>
                    <th>Servidor · empresa</th>
                    <th>Componente</th>
                    <th>Medido / limite</th>
                    <th>Disparo</th>
                    <th>Duração</th>
                    <th>Status</th>
                    <th>Responsável</th>
                    <th class="centro">Ação</th>
                </tr>
            </thead>
            <tbody>
                ${visiveis.map(linhaDoHistorico).join("")}
            </tbody>
        </table>
    `;

    // Esconde/bloqueia o botão "Resolver" para quem não pode editar
    SG.reaplicarPermissoes();
}

function linhaDoHistorico(alerta) {
    const gravidade = alerta.severidade === "critico"
        ? { cor: "vermelho", texto: "Crítico" }
        : { cor: "laranja", texto: "Atenção" };

    const etapa = alerta.categoriaStatus === "done"
        ? { cor: "verde", texto: "Resolvido" }
        : alerta.categoriaStatus === "indeterminate"
            ? { cor: "laranja", texto: "Em andamento" }
            : { cor: "vermelho", texto: "Aberto" };

    const medido = alerta.medido === null
        ? "–"
        : `<strong>${numeroBR(alerta.medido)}%</strong>` +
          (alerta.limite !== null ? ` <span class="suave">/ limite ${numeroBR(alerta.limite)}%</span>` : "");

    const duracao = alerta.resolvidoEm
        ? "resolvido em " + formatarMinutos((new Date(alerta.resolvidoEm) - new Date(alerta.hora)) / 60000)
        : "aberto há " + formatarMinutos(minutosDesde(alerta.hora));

    return `
        <tr>
            <td><span class="tag ${gravidade.cor}">${gravidade.texto}</span></td>
            <td>
                <button class="link-chamado" data-chave="${esc(alerta.chave)}">${esc(alerta.chave)}</button>
            </td>
            <td>
                <strong>${alerta.servidor ? esc(alerta.servidor) : "–"}</strong>
                ${alerta.empresa ? `<small>${esc(alerta.empresa)}</small>` : ""}
            </td>
            <td>${alerta.componente ? esc(alerta.componente) : "–"}</td>
            <td>${medido}</td>
            <td>${formatarDataHora(alerta.hora)}</td>
            <td>${duracao}</td>
            <td><span class="tag ${etapa.cor}">${etapa.texto}</span></td>
            <td>${esc(alerta.responsavel)}</td>
            <td class="centro">
                ${alerta.categoriaStatus === "done" ? "–" : `
                    <button class="btn-resolver" data-perm="editar" data-resolver="${esc(alerta.chave)}">
                        ${ic("check")} Resolver
                    </button>
                `}
            </td>
        </tr>
    `;
}

function desenharSeletorServidor() {
    const seletor = document.getElementById("filtroServidor");

    seletor.innerHTML =
        `<option value="">Servidor: Todos os servidores</option>` +
        dashboard.servidoresDisponiveis.map((servidor) => `
            <option value="${esc(servidor.chave)}">${esc(servidor.nome)}</option>
        `).join("");

    seletor.value = servidorAtual;
}

function atualizarSino() {
    SG.definirNotificacoes(
        dashboard.notificacoes.map((alerta) => ({
            nome: alerta.chave,
            texto: alerta.titulo,
            status: alerta.status
        }))
    );
}

function abrirVerAlerta(chave, origem) {
    const alerta = dashboard.historico.find((item) => item.chave === chave);

    if (!alerta) return;

    const info = statusInfo[alerta.status] || statusInfo.alerta;
    const aberto = alerta.status !== "resolvido";
    const formatar = (data) => data ? new Date(data).toLocaleString("pt-BR") : "Não informado";

    const itens = [
        { rotulo: "Situação no Jira", valor: alerta.statusJira },
        { rotulo: "Prioridade", valor: alerta.prioridade },
        { rotulo: "Tipo", valor: alerta.tipo },
        { rotulo: "Responsável", valor: alerta.responsavel },
        { rotulo: "Relator", valor: alerta.relator },
        { rotulo: "Criado em", valor: formatar(alerta.hora) },
        { rotulo: "Atualizado em", valor: formatar(alerta.atualizado) },
        { rotulo: "Descrição", valor: alerta.descricao || "Sem descrição cadastrada.", inteira: true },
        { rotulo: "Etiquetas", valor: (alerta.etiquetas || []).join(", ") || "Nenhuma", inteira: true }
    ];

    SGModal.ver({
        titulo: "Detalhes do alerta",
        subtitulo: alerta.chave + " • " + alerta.tipo,
        gatilho: origem,
        destaque: {
            icone: ic(info.icone),
            cor: info.cor,
            titulo: alerta.titulo,
            texto: alerta.hora ? new Date(alerta.hora).toLocaleString("pt-BR") : ""
        },
        itens: itens,
        ...(aberto && SG.pode("editar") ? {
            textoEditar: "Reconhecer",
            iconeEditar: "check",
            onEditar: () => reconhecer(alerta.chave)
        } : {})
    });
}

// Pede confirmação e então resolve o chamado (botão "Resolver" da tabela)
function resolverAlerta(chave, origem) {
    if (!SG.pode("editar")) return;

    SGModal.confirmar({
        titulo: "Resolver alerta?",
        texto: `O chamado <strong>${esc(chave)}</strong> será concluído no Jira.`,
        botao: "Resolver",
        aviso: "Enviando ao Jira...",
        gatilho: origem,
        onConfirmar() {
            reconhecer(chave);
        }
    });
}

// Reconhece o alerta diretamente no Jira
async function reconhecer(chave) {
    if (!SG.pode("editar")) return;

    try {
        const resposta = await fetch(
            "/alerta/" + encodeURIComponent(chave) + "/reconhecer",
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" }
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || dados.mensagem || "Não foi possível atualizar o chamado."
            );
        }

        SGModal.aviso(dados.mensagem || "Chamado atualizado no Jira.");

        await carregarDashboard();

    } catch (erro) {
        console.error("Erro ao reconhecer alerta:", erro);
        SGModal.aviso(erro.message);
    }
}

// Troca de período
document.getElementById("filtroPeriodo").addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-periodo]");

    if (!botao) return;

    periodoAtual = botao.dataset.periodo;
    limiteHistorico = 6;

    document.querySelectorAll("#filtroPeriodo button").forEach((item) => {
        item.classList.toggle("ativo", item === botao);
    });

    carregarDashboard();
});

// Troca de servidor
document.getElementById("filtroServidor").addEventListener("change", (evento) => {
    servidorAtual = evento.target.value;
    limiteHistorico = 6;

    carregarDashboard();
});

// Filtro do histórico (todos / críticos / alertas / resolvidos)
document.getElementById("btnFiltro").addEventListener("click", (evento) => {
    filtroAtual = (filtroAtual + 1) % filtros.length;
    limiteHistorico = 6;

    evento.currentTarget.textContent = filtros[filtroAtual].texto;

    desenharHistorico();
});

// Mostrar mais / menos
document.getElementById("btnMais").addEventListener("click", () => {
    // Cada clique mostra +20; quando já mostrou tudo, volta para 6
    limiteHistorico = limiteHistorico >= historicoFiltrado().length ? 6 : limiteHistorico + 20;

    desenharHistorico();
});

// Clique na chave do chamado
document.getElementById("historico").addEventListener("click", (evento) => {
    const botaoResolver = evento.target.closest("[data-resolver]");

    if (botaoResolver) {
        resolverAlerta(botaoResolver.dataset.resolver, botaoResolver);
        return;
    }

    const botao = evento.target.closest("[data-chave]");

    if (botao) {
        abrirVerAlerta(botao.dataset.chave, botao);
    }
});

// Início

document.getElementById("resumo").innerHTML = `<p class="vazio">Carregando...</p>`;

carregarDashboard();