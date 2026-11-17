
const ic = (nome) => `<svg class="sg-ic" aria-hidden="true"><use href="#sg-${nome}"/></svg>`;

let alertas = [];

const statusInfo = {
    critico: { cor: "vermelho", texto: "Crítico", icone: "alert" },
    alerta: { cor: "laranja", texto: "Alerta", icone: "bell" },
    resolvido: { cor: "verde", texto: "Resolvido", icone: "check" }
};

const limites = [
    { nome: "CPU", cor: "verde", valor: 88 },
    { nome: "RAM", cor: "roxo", valor: 85 },
    { nome: "RAM crítico", cor: "vermelho", valor: 98 },
    { nome: "Disco", cor: "laranja", valor: 98 },
    { nome: "Rede", cor: "azul", valor: 75 }
];

const CANAIS = {
    Slack: { icone: "hash", cor: "roxo", dica: "Ex.: #streamguard-alertas" },
    Jira: { icone: "layers", cor: "azul", dica: "Ex.: STREAM • SG" },
    "E-mail": { icone: "send", cor: "laranja", dica: "Ex.: plantao@streamco.com.br" },
    "Microsoft Teams": { icone: "bell", cor: "verde", dica: "Ex.: Canal NOC" }
};

const integracoes = [
    { canal: "Slack", destino: "#streamguard-alertas", ativa: true },
    { canal: "Jira", destino: "STREAM • SG", ativa: true }
];

const agruparRepetidos = true;

const filtros = [
    { valor: "todos", texto: "Filtrar histórico" },
    { valor: "critico", texto: "Só críticos" },
    { valor: "alerta", texto: "Só alertas" },
    { valor: "resolvido", texto: "Só resolvidos" }
];

let filtroAtual = 0;

const botaoFiltro = document.getElementById("btnFiltro");

// Busca os alertas no backend
async function carregarAlertas() {
    const lista = document.getElementById("listaAlertas");

    try {
        lista.innerHTML = "<li>Carregando alertas...</li>";

        const resposta = await fetch("/alerta");

        if (!resposta.ok) {
            const erro = await resposta.json();
            throw new Error(erro.mensagem || "Erro ao consultar o Jira.");
        }

        alertas = await resposta.json();

        desenharResumo();
        desenharAlertas(filtros[filtroAtual].valor);
        atualizarSino();

    } catch (erro) {
        console.error("Erro ao carregar alertas:", erro);

        lista.innerHTML = "";

        document.getElementById("mensagemVazia").hidden = false;
        document.getElementById("mensagemVazia").textContent =
            "Não foi possível carregar os alertas do Jira.";
    }
}

// Desenha os indicadores do resumo
function desenharResumo() {
    const hoje = new Date().toLocaleDateString("pt-BR");

    const alertasHoje = alertas.filter(function (alerta) {
        if (!alerta.hora) return false;

        return new Date(alerta.hora).toLocaleDateString("pt-BR") === hoje;
    });

    const criticos = alertas.filter(function (alerta) {
        return alerta.status === "critico";
    });

    const resolvidos = alertas.filter(function (alerta) {
        return alerta.status === "resolvido";
    });

    const resumo = [
        {
            cor: "laranja",
            icone: "bell",
            numero: alertasHoje.length,
            titulo: "Alertas hoje",
            detalhe: "Chamados criados hoje"
        },
        {
            cor: "vermelho",
            icone: "alert",
            numero: criticos.length,
            titulo: "Críticos",
            detalhe: "Requerem atenção"
        },
        {
            cor: "verde",
            icone: "check",
            numero: resolvidos.length,
            titulo: "Resolvidos",
            detalhe: "Chamados concluídos no Jira"
        },
        {
            cor: "azul",
            icone: "send",
            numero: integracoes.filter((item) => item.ativa).length,
            titulo: "Canais ativos",
            detalhe: integracoes.filter((item) => item.ativa)
                .map((item) => item.canal).join(" e ") || "Nenhum"
        }
    ];

    document.getElementById("resumo").innerHTML = resumo.map((item) => `
        <article class="card-resumo">
            <div class="icone-resumo ${item.cor}">
                ${ic(item.icone)}
            </div>

            <div>
                <strong class="numero ${item.cor}">${item.numero}</strong>
                <p>${item.titulo}</p>
                <small>${item.detalhe}</small>
            </div>
        </article>
    `).join("");
}

// Desenha os alertas recebidos do Jira
function desenharAlertas(filtro = "todos") {
    const lista = document.getElementById("listaAlertas");
    const mensagemVazia = document.getElementById("mensagemVazia");

    const filtrados = alertas.filter(function (alerta) {
        return filtro === "todos" || alerta.status === filtro;
    });

    lista.innerHTML = filtrados.map(function (alerta) {
        const info = statusInfo[alerta.status] || statusInfo.alerta;

        const data = alerta.hora
            ? new Date(alerta.hora).toLocaleString("pt-BR")
            : "Data não informada";

        return `
            <li class="alerta">

                <div class="alerta-icone ${info.cor}">
                    ${ic(info.icone)}
                </div>

                <div class="alerta-info">
                    <strong>${SGModal.escapar(alerta.titulo)}</strong>

                    <small>
                        ${SGModal.escapar(alerta.chave)}
                        •
                        ${SGModal.escapar(alerta.tipo)}
                    </small>
                </div>

                <div class="alerta-acoes">

                    <button class="btn-mini"
                        data-acao="ver"
                        data-chave="${SGModal.escapar(alerta.chave)}">

                        ${ic("eye")} Ver

                    </button>

                    ${alerta.status !== "resolvido" ? `
                        <button class="btn-mini"
                            data-acao="reconhecer"
                            data-chave="${SGModal.escapar(alerta.chave)}"
                            data-perm="editar">

                            ${ic("check")} Reconhecer

                        </button>
                    ` : ""}

                </div>

                <div class="alerta-lado">

                    <span class="tag ${info.cor}">
                        ● ${info.texto}
                    </span>

                    <small>${data}</small>

                </div>

            </li>
        `;
    }).join("");

    mensagemVazia.hidden = filtrados.length > 0;

    if (filtrados.length === 0) {
        mensagemVazia.textContent = "Nenhum alerta com esse filtro.";
    }

    SG.reaplicarPermissoes();
}

// Log de envio ainda não conectado à API de logs
function desenharLog() {
    const log = document.getElementById("log");

    if (log) {
        log.innerHTML =
            "<li>O histórico de envios ainda não está conectado à API de logs.</li>";
    }
}

// Desenha os limites de monitoramento
function desenharLimites() {
    document.getElementById("limites").innerHTML = limites.map((limite, indice) => `
        <li>
            <i class="bolinha ${limite.cor}"></i>

            ${limite.nome}

            <input
                type="number"
                min="0"
                max="100"
                value="${limite.valor}"
                data-cor="${limite.cor}"
                data-indice="${indice}"
                data-perm-lock="editar"
            >%
        </li>
    `).join("");

    document.querySelectorAll("#limites input").forEach((campo) => {
        campo.addEventListener("input", () => {
            if (campo.value > 100) campo.value = 100;
            if (campo.value < 0) campo.value = 0;

            limites[campo.dataset.indice].valor = Number(campo.value);
        });
    });
}

// Desenha as integrações
function desenharIntegracoes() {
    document.getElementById("integracoes").innerHTML = integracoes.length === 0
        ? `<p class="vazio">Nenhuma integração conectada.</p>`
        : integracoes.map((integracao, indice) => {
            const info = CANAIS[integracao.canal];

            return `
                <div class="integracao">

                    <span class="integracao-icone ${info.cor}">
                        ${ic(info.icone)}
                    </span>

                    <div>
                        <strong>${integracao.canal}</strong>

                        <small>
                            ${SGModal.escapar(integracao.destino)}
                        </small>
                    </div>

                    <span class="tag ${integracao.ativa ? "verde" : "laranja"}">
                        ${integracao.ativa ? "Conectado" : "Desativado"}
                    </span>

                    <button class="btn-mini"
                        data-acao="editar-integracao"
                        data-indice="${indice}"
                        data-perm="editar">

                        ${ic("edit")} Editar

                    </button>

                    <button class="btn-mini btn-mini-perigo"
                        data-acao="remover-integracao"
                        data-indice="${indice}"
                        data-perm="excluir">

                        ${ic("trash")} Remover

                    </button>

                </div>
            `;
        }).join("");

    desenharResumo();
    SG.reaplicarPermissoes();
}

// Atualiza as notificações da tela
function atualizarSino() {
    const ativos = alertas.filter(function (alerta) {
        return alerta.status !== "resolvido";
    });

    SG.definirNotificacoes(
        ativos.map(function (alerta) {
            return {
                nome: alerta.chave,
                texto: alerta.titulo,
                status: alerta.status
            };
        })
    );
}

// Alterna os filtros
botaoFiltro.addEventListener("click", () => {
    filtroAtual = (filtroAtual + 1) % filtros.length;

    botaoFiltro.textContent = filtros[filtroAtual].texto;

    desenharAlertas(filtros[filtroAtual].valor);
});

// Abre os detalhes de um alerta
function abrirVerAlerta(chave, origem) {
    const alerta = alertas.find(function (item) {
        return item.chave === chave;
    });

    if (!alerta) return;

    const info = statusInfo[alerta.status] || statusInfo.alerta;

    const aberto = alerta.status !== "resolvido";

    const itens = [
        {
            rotulo: "Situação no Jira",
            valor: alerta.statusJira
        },
        {
            rotulo: "Prioridade",
            valor: alerta.prioridade
        },
        {
            rotulo: "Tipo",
            valor: alerta.tipo
        },
        {
            rotulo: "Responsável",
            valor: alerta.responsavel
        },
        {
            rotulo: "Relator",
            valor: alerta.relator
        },
        {
            rotulo: "Criado em",
            valor: alerta.hora
                ? new Date(alerta.hora).toLocaleString("pt-BR")
                : "Não informado"
        },
        {
            rotulo: "Atualizado em",
            valor: alerta.atualizado
                ? new Date(alerta.atualizado).toLocaleString("pt-BR")
                : "Não informado"
        },
        {
            rotulo: "Descrição",
            valor: alerta.descricao || "Sem descrição cadastrada.",
            inteira: true
        },
        {
            rotulo: "Etiquetas",
            valor: (alerta.etiquetas || []).join(", ") || "Nenhuma",
            inteira: true
        }
    ];

    SGModal.ver({
        titulo: "Detalhes do alerta",

        subtitulo: alerta.chave + " • " + alerta.tipo,

        gatilho: origem,

        destaque: {
            icone: ic(info.icone),
            cor: info.cor,
            titulo: alerta.titulo,
            texto: alerta.hora
                ? new Date(alerta.hora).toLocaleString("pt-BR")
                : ""
        },

        itens: itens,

        ...(aberto ? {
            textoEditar: "Reconhecer",
            iconeEditar: "check",
            onEditar: () => reconhecer(alerta.chave)
        } : {})
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
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro ||
                dados.mensagem ||
                "Não foi possível atualizar o chamado."
            );
        }

        SGModal.aviso(
            dados.mensagem || "Chamado atualizado no Jira."
        );

        await carregarAlertas();

    } catch (erro) {
        console.error("Erro ao reconhecer alerta:", erro);
        SGModal.aviso(erro.message);
    }
}

// Abre o formulário de integração
function abrirIntegracao(indice, origem) {
    const editando = indice != null;

    if (editando ? !SG.pode("editar") : !SG.pode("criar")) {
        return;
    }

    const atual = editando
        ? integracoes[indice]
        : {
            canal: "Slack",
            destino: "",
            ativa: true
        };

    SGModal.formulario({
        titulo: editando
            ? `Editar integração com ${atual.canal}`
            : "Nova integração",

        subtitulo: editando
            ? "Altere o destino ou desative o envio."
            : "Conecte um canal para receber os alertas.",

        confirmar: editando
            ? "Salvar alterações"
            : "Conectar canal",

        icone: editando ? "save" : "plus",

        aviso: editando
            ? "Integração atualizada."
            : "Integração conectada.",

        gatilho: origem,

        valores: atual,

        campos: [
            editando
                ? {
                    tipo: "texto",
                    nome: "canal",
                    rotulo: "Canal",
                    somenteLeitura: true
                }
                : {
                    tipo: "select",
                    nome: "canal",
                    rotulo: "Canal",
                    opcoes: Object.keys(CANAIS).map((canal) => ({
                        valor: canal,
                        texto: canal
                    }))
                },
            {
                tipo: "texto",
                nome: "destino",
                rotulo: "Destino",
                placeholder: CANAIS[atual.canal].dica,
                max: 60,
                erro: "Informe o canal, projeto ou e-mail de destino."
            },
            {
                tipo: "switch",
                nome: "ativa",
                rotulo: "Envio ativo",
                descricao: "Quando desligado, nenhum alerta é enviado para este canal."
            }
        ],

        onSalvar(valores) {
            if (editando) {
                atual.destino = valores.destino;
                atual.ativa = valores.ativa;

            } else {
                if (integracoes.some((item) => item.canal === valores.canal)) {
                    return `Já existe uma integração com ${valores.canal}. Edite a existente.`;
                }

                integracoes.push({
                    canal: valores.canal,
                    destino: valores.destino,
                    ativa: valores.ativa
                });
            }

            desenharIntegracoes();
        }
    });
}

// Remove uma integração da configuração visual
function removerIntegracao(indice, origem) {
    if (!SG.pode("excluir")) return;

    SGModal.confirmar({
        titulo: "Remover integração?",

        texto: `Os alertas deixarão de ser enviados para <strong>${integracoes[indice].canal}</strong>. Essa ação não pode ser desfeita.`,

        botao: "Remover",

        aviso: "Integração removida.",

        gatilho: origem,

        onConfirmar() {
            integracoes.splice(indice, 1);
            desenharIntegracoes();
        }
    });
}

// Eventos da lista de alertas
document.getElementById("listaAlertas").addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-acao]");

    if (!botao) return;

    const chave = botao.dataset.chave;

    if (botao.dataset.acao === "ver") {
        abrirVerAlerta(chave, botao);
    }

    if (botao.dataset.acao === "reconhecer") {
        reconhecer(chave);
    }
});

// Eventos das integrações
document.getElementById("integracoes").addEventListener("click", (evento) => {
    const botao = evento.target.closest("[data-acao]");

    if (!botao) return;

    const indice = Number(botao.dataset.indice);

    if (botao.dataset.acao === "editar-integracao") {
        abrirIntegracao(indice, botao);
    }

    if (botao.dataset.acao === "remover-integracao") {
        removerIntegracao(indice, botao);
    }
});

// Botão de nova integração
document.getElementById("btnNovaIntegracao").addEventListener("click", (evento) => {
    abrirIntegracao(null, evento.currentTarget);
});

// Botão de salvar configurações
const botaoSalvar = document.getElementById("btnSalvar");
const checkAgrupar = document.getElementById("agrupar");

botaoSalvar.addEventListener("click", () => {
    if (!SG.pode("editar")) return;

    const config = {
        limites: limites,
        agruparRepetidos: checkAgrupar.checked
    };

    console.log("Configurações salvas:", config);

    botaoSalvar.textContent = "✔ Configurações salvas";

    setTimeout(() => {
        botaoSalvar.textContent = "Salvar configurações";
    }, 2000);
});

checkAgrupar.checked = agruparRepetidos;

// Inicialização da tela
desenharLog();
desenharLimites();
desenharIntegracoes();
carregarAlertas();

SG.reaplicarPermissoes();
