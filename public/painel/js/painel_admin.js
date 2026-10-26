const usuario = { nome: SG.usuario.nome };

const CHAVE_EXTRAS = "streamguard:empresas-extras";
const CHAVE_SELECIONADA = "streamguard:empresa-selecionada";

const empresas = [
  { sigla: "SB", nome: "StreamCo Brasil", equipamentos: 32, status: "ok", ocorrencias: 0, saude: 100 },
  { sigla: "MF", nome: "MediaFlow LTDA", equipamentos: 18, status: "alerta", ocorrencias: 2, saude: 89 },
  { sigla: "CN", nome: "CastNet Serviços", equipamentos: 9, status: "critico", ocorrencias: 1, saude: 71 },
  { sigla: "VP", nome: "Vivo Play Infra", equipamentos: 27, status: "ok", ocorrencias: 0, saude: 100 }
];

const statusInfo = {
  ok: { cor: "verde", texto: () => "Tudo OK" },
  alerta: { cor: "laranja", texto: (n) => `${n} alerta${n > 1 ? "s" : ""} ativo${n > 1 ? "s" : ""}` },
  critico: { cor: "vermelho", texto: (n) => `${n} crítico${n > 1 ? "s" : ""}` }
};


function lerStorage(chave, padrao) {
  try {
    const valor = localStorage.getItem(chave);
    return valor ? JSON.parse(valor) : padrao;
  } catch (erro) {
    return padrao;
  }
}

function salvarStorage(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch (erro) {
  }
}

function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

let timerToast;
function mostrarToast(mensagem) {
  const toast = document.getElementById("toast");
  toast.textContent = mensagem;
  toast.hidden = false;
  clearTimeout(timerToast);
  timerToast = setTimeout(() => { toast.hidden = true; }, 2500);
}

empresas.push(...lerStorage(CHAVE_EXTRAS, []));
let selecionada = lerStorage(CHAVE_SELECIONADA, null);


function desenharResumo() {
  const qtd = (status) => empresas.filter((e) => e.status === status).length;
  const ocorrencias = empresas.reduce((total, e) => total + e.ocorrencias, 0);

  document.getElementById("saudacao").textContent = `Olá, ${usuario.nome}`;
  document.getElementById("textoResumo").textContent =
    `Você tem acesso a ${empresas.length} empresas. Há ${ocorrencias} ocorrências que precisam de atenção.`;
  document.getElementById("totalVinculadas").textContent = `${empresas.length} empresas vinculadas`;

  document.getElementById("miniCards").innerHTML = `
    <div class="mini-card"><strong class="verde">${qtd("ok")}</strong><small>Tudo OK</small></div>
    <div class="mini-card"><strong class="laranja">${qtd("alerta")}</strong><small>Com alerta</small></div>
    <div class="mini-card"><strong class="vermelho">${qtd("critico")}</strong><small>Crítica</small></div>
  `;
}


function desenharEmpresas() {
  document.getElementById("empresas").innerHTML = empresas.map((e, i) => {
    const info = statusInfo[e.status];
    const ativa = e.nome === selecionada;
    return `
      <article class="card-empresa ${ativa ? "selecionada" : ""}">
        <div class="empresa-topo">
          <div class="sigla ${info.cor}">${escapar(e.sigla)}</div>
          <div>
            <strong>${escapar(e.nome)}</strong>
            <small>${e.equipamentos} equipamentos monitorados</small>
          </div>
          <span class="tag ${info.cor}">● ${info.texto(e.ocorrencias)}</span>
        </div>

        <div class="saude-linha">
          <span>Saúde da infraestrutura</span>
          <b class="${info.cor}">${e.saude}%</b>
        </div>
        <div class="barra ${info.cor}"><div style="width: ${e.saude}%"></div></div>

        <button class="btn-monitorar ${ativa ? "ativo" : ""}" data-indice="${i}">
          ${ativa ? "✔ Monitorando esta empresa" : "↗ Monitorar esta empresa"}
        </button>
      </article>
    `;
  }).join("");
}

document.getElementById("empresas").addEventListener("click", (evento) => {
  const botao = evento.target.closest(".btn-monitorar");
  if (!botao) return;

  const empresa = empresas[botao.dataset.indice];
  selecionada = empresa.nome;
  salvarStorage(CHAVE_SELECIONADA, selecionada);
  desenharEmpresas();
  mostrarToast(`Monitorando ${empresa.nome}`);
});


function desenharNotificacoes() {
  const comOcorrencia = empresas
    .filter((e) => e.ocorrencias > 0)
    .sort((a, b) => (a.status === "critico" ? -1 : 1) - (b.status === "critico" ? -1 : 1));

  SG.definirNotificacoes(
    comOcorrencia.map((e) => ({
      nome: e.nome,
      texto: statusInfo[e.status].texto(e.ocorrencias),
      status: e.status
    }))
  );
}

function gerarSigla(nome) {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return "";
  if (palavras.length === 1) return palavras[0].slice(0, 2).toUpperCase();
  return (palavras[0][0] + palavras[1][0]).toUpperCase();
}

// Adicionar empresa (modal padrão do painel_modais.js). Só gerente e admin chegam aqui.
document.getElementById("btnAdicionar").addEventListener("click", () => {
  window.location.href = "./painel_cadastroEmpresa.html";
});

function atualizarTela() {
  desenharResumo();
  desenharEmpresas();
  desenharNotificacoes();
}

atualizarTela();