
const ic = (nome) => `<svg class="sg-ic" aria-hidden="true"><use href="#sg-${nome}"/></svg>`;

const resumo = [
  { cor: "laranja",  icone: "bell",  numero: 3, titulo: "Alertas hoje",  detalhe: "+1 desde ontem" },
  { cor: "vermelho", icone: "alert", numero: 1, titulo: "Críticos",      detalhe: "Requer atenção" },
  { cor: "verde",    icone: "check", numero: 1, titulo: "Resolvidos",    detalhe: "Tempo médio 18 min" },
  { cor: "azul",     icone: "send",  numero: 2, titulo: "Canais ativos", detalhe: "Slack e Jira" }
];

// status pode ser: "critico", "alerta" ou "resolvido"
const alertas = [
  { titulo: "RAM acima do limite crítico (92%)", origem: "Memória RAM • srv-stream-01",   status: "critico",   hora: "Hoje, 14:32",  valor: "92%",    limite: "90%",    canais: "Slack e Jira" },
  { titulo: "Rede próxima do limite (78%)",      origem: "Placa de rede • srv-stream-01", status: "alerta",    hora: "Hoje, 14:18",  valor: "78%",    limite: "75%",    canais: "Slack" },
  { titulo: "CPU próxima do limite (87%)",       origem: "Processador • srv-encode-01",   status: "alerta",    hora: "Hoje, 13:55",  valor: "87%",    limite: "88%",    canais: "Slack" },
  { titulo: "Uso de disco normalizado (63%)",    origem: "Disco • srv-stream-01",         status: "resolvido", hora: "Hoje, 09:41",  valor: "63%",    limite: "98%",    canais: "Slack e Jira" },
  { titulo: "Latência acima do limite (240 ms)", origem: "Rede • srv-edge-01",            status: "resolvido", hora: "Ontem, 22:10", valor: "240 ms", limite: "200 ms", canais: "Slack" },
  { titulo: "RAM próxima do limite (84%)",       origem: "Memória RAM • srv-db-01",       status: "resolvido", hora: "Ontem, 18:02", valor: "84%",    limite: "85%",    canais: "Slack" }
];

const statusInfo = {
  critico:   { cor: "vermelho", texto: "Crítico",   icone: "alert" },
  alerta:    { cor: "laranja",  texto: "Alerta",    icone: "bell" },
  resolvido: { cor: "verde",    texto: "Resolvido", icone: "check" }
};

const logEnvio = [
  { hora: "14:32:08", canal: "Slack", mensagem: "RAM crítica",          status: "Entregue" },
  { hora: "14:32:11", canal: "Jira",  mensagem: "SG-248 criado",        status: "Entregue" },
  { hora: "14:18:03", canal: "Slack", mensagem: "Alerta de rede",       status: "Entregue" },
  { hora: "13:55:40", canal: "Slack", mensagem: "CPU perto do limite",  status: "Entregue" },
  { hora: "09:41:12", canal: "Slack", mensagem: "Disco normalizado",    status: "Entregue" },
  { hora: "09:41:15", canal: "Jira",  mensagem: "SG-247 resolvido",     status: "Entregue" }
];

const limites = [
  { nome: "CPU",         cor: "verde",    valor: 88 },
  { nome: "RAM",         cor: "roxo",     valor: 85 },
  { nome: "RAM crítico", cor: "vermelho", valor: 98 },
  { nome: "Disco",       cor: "laranja",  valor: 98 },
  { nome: "Rede",        cor: "azul",     valor: 75 }
];

const CANAIS = {
  Slack:            { icone: "hash",   cor: "roxo",     dica: "Ex.: #streamguard-alertas" },
  Jira:             { icone: "layers", cor: "azul",     dica: "Ex.: STREAM • SG" },
  "E-mail":         { icone: "send",   cor: "laranja",  dica: "Ex.: plantao@streamco.com.br" },
  "Microsoft Teams": { icone: "bell",  cor: "verde",    dica: "Ex.: Canal NOC" }
};

const integracoes = [
  { canal: "Slack", destino: "#streamguard-alertas", ativa: true },
  { canal: "Jira",  destino: "STREAM • SG",          ativa: true }
];

const agruparRepetidos = true;

function desenharResumo() {
  document.getElementById("resumo").innerHTML = resumo.map((item) => `
    <article class="card-resumo">
      <div class="icone-resumo ${item.cor}">${ic(item.icone)}</div>
      <div>
        <strong class="numero ${item.cor}">${item.numero}</strong>
        <p>${item.titulo}</p>
        <small>${item.detalhe}</small>
      </div>
    </article>
  `).join("");
}

function desenharAlertas(filtro = "todos") {
  const lista = document.getElementById("listaAlertas");
  const mensagemVazia = document.getElementById("mensagemVazia");

  // guarda o índice original pra conseguir reconhecer/excluir o alerta certo
  const filtrados = alertas
    .map((a, indice) => ({ ...a, indice }))
    .filter((a) => filtro === "todos" || a.status === filtro);

  lista.innerHTML = filtrados.map((a) => {
    const info = statusInfo[a.status];
    return `
      <li class="alerta">
        <div class="alerta-icone ${info.cor}">${ic(info.icone)}</div>
        <div class="alerta-info">
          <strong>${a.titulo}</strong>
          <small>${a.origem}</small>
        </div>
        <div class="alerta-acoes">
          <button class="btn-mini" data-acao="ver" data-indice="${a.indice}">${ic("eye")} Ver</button>
          ${a.status !== "resolvido"
            ? `<button class="btn-mini" data-acao="reconhecer" data-indice="${a.indice}" data-perm="editar">${ic("check")} Reconhecer</button>`
            : ""}
          <button class="btn-mini btn-mini-perigo" data-acao="excluir" data-indice="${a.indice}" data-perm="excluir">${ic("trash")} Excluir</button>
        </div>
        <div class="alerta-lado">
          <span class="tag ${info.cor}">● ${info.texto}</span>
          <small>${a.hora}</small>
        </div>
      </li>
    `;
  }).join("");

  mensagemVazia.hidden = filtrados.length > 0;
}

function desenharLog() {
  document.getElementById("log").innerHTML = logEnvio.map((l) => `
    <li>
      <time>${l.hora}</time>
      <b class="azul">${l.canal}</b>
      <span>${l.mensagem}</span>
      <span class="tag verde">${l.status}</span>
    </li>
  `).join("");
}

function desenharLimites() {
  // data-perm-lock="editar": usuário comum enxerga o valor, mas não consegue mudar
  document.getElementById("limites").innerHTML = limites.map((l, i) => `
    <li>
      <i class="bolinha ${l.cor}"></i> ${l.nome}
      <input type="number" min="0" max="100" value="${l.valor}" data-cor="${l.cor}" data-indice="${i}" data-perm-lock="editar">%
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

function desenharIntegracoes() {
  document.getElementById("integracoes").innerHTML = integracoes.length === 0
    ? `<p class="vazio">Nenhuma integração conectada.</p>`
    : integracoes.map((i, indice) => {
        const info = CANAIS[i.canal];
        return `
    <div class="integracao">
      <span class="integracao-icone ${info.cor}">${ic(info.icone)}</span>
      <div><strong>${i.canal}</strong><small>${SGModal.escapar(i.destino)}</small></div>
      <span class="tag ${i.ativa ? "verde" : "laranja"}">${i.ativa ? "Conectado" : "Desativado"}</span>
      <button class="btn-mini" data-acao="editar-integracao" data-indice="${indice}" data-perm="editar">${ic("edit")} Editar</button>
      <button class="btn-mini btn-mini-perigo" data-acao="remover-integracao" data-indice="${indice}" data-perm="excluir">${ic("trash")} Remover</button>
    </div>`;
      }).join("");

  // o card "Canais ativos" do resumo acompanha as integrações
  const ativas = integracoes.filter((i) => i.ativa);
  resumo[3].numero = ativas.length;
  resumo[3].detalhe = ativas.map((i) => i.canal).join(" e ") || "Nenhum";
  desenharResumo();
}

function atualizarSino() {
  const ativos = alertas.filter((a) => a.status !== "resolvido");
  SG.definirNotificacoes(ativos.map((a) => ({ nome: a.origem.split("•")[1].trim(), texto: a.titulo, status: a.status })));
}


const filtros = [
  { valor: "todos",     texto: "Filtrar histórico" },
  { valor: "critico",   texto: "Só críticos" },
  { valor: "alerta",    texto: "Só alertas" },
  { valor: "resolvido", texto: "Só resolvidos" }
];
let filtroAtual = 0;
const botaoFiltro = document.getElementById("btnFiltro");

botaoFiltro.addEventListener("click", () => {
  filtroAtual = (filtroAtual + 1) % filtros.length;
  botaoFiltro.textContent = filtros[filtroAtual].texto;
  desenharAlertas(filtros[filtroAtual].valor);
});


function abrirVerAlerta(indice, origem) {
  const a = alertas[indice];
  const info = statusInfo[a.status];
  const aberto = a.status !== "resolvido";

  SGModal.ver({
    titulo: "Detalhes do alerta",
    subtitulo: a.origem,
    gatilho: origem,
    destaque: { icone: ic(info.icone), cor: info.cor, titulo: a.titulo, texto: a.hora },
    itens: [
      { rotulo: "Situação", tag: info.texto, cor: info.cor },
      { rotulo: "Disparado em", valor: a.hora },
      { rotulo: "Valor medido", valor: a.valor },
      { rotulo: "Limite configurado", valor: a.limite },
      { rotulo: "Notificado via", valor: a.canais, inteira: true }
    ],
    // reconhecer = editar o alerta (só gerente e admin); excluir só admin
    ...(aberto ? { textoEditar: "Reconhecer", iconeEditar: "check", onEditar: () => reconhecer(indice) } : {}),
    onExcluir: (gatilho) => excluirAlerta(indice, gatilho)
  });
}

function reconhecer(indice) {
  if (!SG.pode("editar")) return; // dupla checagem
  alertas[indice].status = "resolvido";
  desenharAlertas(filtros[filtroAtual].valor);
  atualizarSino();
  SGModal.aviso("Alerta reconhecido e marcado como resolvido.");
}

function excluirAlerta(indice, origem) {
  if (!SG.pode("excluir")) return; // dupla checagem

  SGModal.confirmar({
    titulo: "Excluir alerta do histórico?",
    texto: `O registro <strong>${SGModal.escapar(alertas[indice].titulo)}</strong> será removido do histórico. Essa ação não pode ser desfeita.`,
    botao: "Excluir",
    aviso: "Alerta excluído do histórico.",
    gatilho: origem,
    onConfirmar() {
      alertas.splice(indice, 1);
      desenharAlertas(filtros[filtroAtual].valor);
      atualizarSino();
    }
  });
}

function abrirIntegracao(indice, origem) {
  const editando = indice != null;
  if (editando ? !SG.pode("editar") : !SG.pode("criar")) return; // dupla checagem

  const atual = editando ? integracoes[indice] : { canal: "Slack", destino: "", ativa: true };

  SGModal.formulario({
    titulo: editando ? `Editar integração com ${atual.canal}` : "Nova integração",
    subtitulo: editando ? "Altere o destino ou desative o envio." : "Conecte um canal para receber os alertas.",
    confirmar: editando ? "Salvar alterações" : "Conectar canal",
    icone: editando ? "save" : "plus",
    aviso: editando ? "Integração atualizada." : "Integração conectada.",
    gatilho: origem,
    valores: atual,
    campos: [
      editando
        ? { tipo: "texto", nome: "canal", rotulo: "Canal", somenteLeitura: true }
        : { tipo: "select", nome: "canal", rotulo: "Canal", opcoes: Object.keys(CANAIS).map((c) => ({ valor: c, texto: c })) },
      { tipo: "texto", nome: "destino", rotulo: "Destino", placeholder: CANAIS[atual.canal].dica, max: 60, erro: "Informe o canal, projeto ou e-mail de destino." },
      { tipo: "switch", nome: "ativa", rotulo: "Envio ativo", descricao: "Quando desligado, nenhum alerta é enviado para este canal." }
    ],
    onSalvar(v) {
      if (editando) {
        atual.destino = v.destino;
        atual.ativa = v.ativa;
      } else {
        if (integracoes.some((i) => i.canal === v.canal)) return `Já existe uma integração com ${v.canal}. Edite a existente.`;
        integracoes.push({ canal: v.canal, destino: v.destino, ativa: v.ativa });
      }
      desenharIntegracoes();
      atualizarSino();
    }
  });
}

function removerIntegracao(indice, origem) {
  if (!SG.pode("excluir")) return; // dupla checagem

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

document.getElementById("listaAlertas").addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-acao]");
  if (!botao) return;
  const indice = Number(botao.dataset.indice);

  if (botao.dataset.acao === "ver") abrirVerAlerta(indice, botao);
  if (botao.dataset.acao === "reconhecer") {
    reconhecer(indice);
  }
  if (botao.dataset.acao === "excluir") excluirAlerta(indice, botao);
});

document.getElementById("integracoes").addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-acao]");
  if (!botao) return;
  const indice = Number(botao.dataset.indice);

  if (botao.dataset.acao === "editar-integracao") abrirIntegracao(indice, botao);
  if (botao.dataset.acao === "remover-integracao") removerIntegracao(indice, botao);
});

document.getElementById("btnNovaIntegracao").addEventListener("click", (evento) => abrirIntegracao(null, evento.currentTarget));

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
desenharResumo();
desenharAlertas();
desenharLog();
desenharLimites();
desenharIntegracoes();
atualizarSino();
SG.reaplicarPermissoes();
