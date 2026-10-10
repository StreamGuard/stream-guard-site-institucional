
const resumo = [
  { cor: "laranja",  icone: "🔔", numero: 3, titulo: "Alertas hoje",  detalhe: "+1 desde ontem" },
  { cor: "vermelho", icone: "⚠️",  numero: 1, titulo: "Críticos",      detalhe: "Requer atenção" },
  { cor: "verde",    icone: "✔",  numero: 1, titulo: "Resolvidos",    detalhe: "Tempo médio 18 min" },
  { cor: "azul",     icone: "➤",  numero: 2, titulo: "Canais ativos", detalhe: "Slack e Jira" }
];

// status pode ser: "critico", "alerta" ou "resolvido"
const alertas = [
  { icone: "", titulo: "RAM acima do limite crítico (92%)", origem: "Memória RAM • srv-stream-01", status: "critico",   hora: "Hoje, 14:32" },
  { icone: "", titulo: "Rede próxima do limite (78%)",      origem: "Placa de rede • srv-stream-01", status: "alerta",    hora: "Hoje, 14:18" },
  { icone: "", titulo: "Uso de disco normalizado (63%)",    origem: "Disco • srv-stream-01",         status: "resolvido", hora: "Hoje, 09:41" }
];

const statusInfo = {
  critico:   { cor: "vermelho", texto: "Crítico" },
  alerta:    { cor: "laranja",  texto: "Alerta" },
  resolvido: { cor: "verde",    texto: "Resolvido" }
};

const logEnvio = [
  { hora: "14:32:08", canal: "Slack", mensagem: "RAM crítica",    status: "Entregue" },
  { hora: "14:32:11", canal: "Jira",  mensagem: "SG-248 criado",  status: "Entregue" },
  { hora: "14:18:03", canal: "Slack", mensagem: "Alerta de rede", status: "Entregue" }
];

const limites = [
  { nome: "CPU",         cor: "verde",    valor: 88 },
  { nome: "RAM",         cor: "roxo",     valor: 85 },
  { nome: "RAM crítico", cor: "vermelho", valor: 98 },
  { nome: "Disco",       cor: "laranja",  valor: 98 },
  { nome: "Rede",        cor: "azul",     valor: 75 }
];

const integracoes = [
  { nome: "Slack", detalhe: "#streamguard-alertas", icone: "", cor: "roxo", status: "Conectado" },
  { nome: "Jira",  detalhe: "STREAM • SG",          icone: "", cor: "azul", status: "Conectado" }
];

const agruparRepetidos = true;

function desenharResumo() {
  document.getElementById("resumo").innerHTML = resumo.map((item) => `
    <article class="card-resumo">
      <div class="icone-resumo ${item.cor}">${item.icone}</div>
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

  // se o filtro não for "todos", mostra só os alertas daquele status
  const filtrados = alertas.filter((a) => filtro === "todos" || a.status === filtro);

  lista.innerHTML = filtrados.map((a) => {
    const info = statusInfo[a.status];
    return `
      <li class="alerta">
        <div class="alerta-icone ${info.cor}">${a.icone}</div>
        <div class="alerta-info">
          <strong>${a.titulo}</strong>
          <small>${a.origem}</small>
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
  document.getElementById("limites").innerHTML = limites.map((l, i) => `
    <li>
      <i class="bolinha ${l.cor}"></i> ${l.nome}
      <input type="number" min="0" max="100" value="${l.valor}" data-cor="${l.cor}" data-indice="${i}">%
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
  document.getElementById("integracoes").innerHTML = integracoes.map((i) => `
    <div class="integracao">
      <span class="integracao-icone ${i.cor}">${i.icone}</span>
      <div><strong>${i.nome}</strong><small>${i.detalhe}</small></div>
      <span class="tag verde">${i.status}</span>
    </div>
  `).join("");
}


const filtros = [
  { valor: "todos",     texto: " Filtrar histórico" },
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

const botaoSalvar = document.getElementById("btnSalvar");
const checkAgrupar = document.getElementById("agrupar");

botaoSalvar.addEventListener("click", () => {
  const config = {
    limites: limites,
    agruparRepetidos: checkAgrupar.checked
  };

  // aqui você enviar para o back-end fetch()
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
