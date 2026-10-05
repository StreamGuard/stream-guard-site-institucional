const usuario = { nome: "Nome do Usuário" };

const empresas = [
  { sigla: "SB", nome: "StreamCo Brasil",  equipamentos: 32, status: "ok",      ocorrencias: 0, saude: 100 },
  { sigla: "MF", nome: "MediaFlow LTDA",   equipamentos: 18, status: "alerta",  ocorrencias: 2, saude: 89 },
  { sigla: "CN", nome: "CastNet Serviços", equipamentos: 9,  status: "critico", ocorrencias: 1, saude: 71 },
  { sigla: "VP", nome: "Vivo Play Infra",  equipamentos: 27, status: "ok",      ocorrencias: 0, saude: 100 }
];

const statusInfo = {
  ok:      { cor: "verde",    texto: () => "Tudo OK" },
  alerta:  { cor: "laranja",  texto: (n) => `${n} alerta${n > 1 ? "s" : ""} ativo${n > 1 ? "s" : ""}` },
  critico: { cor: "vermelho", texto: (n) => `${n} crítico${n > 1 ? "s" : ""}` }
};

function desenharResumo() {
  // conta quantas empresas existem em cada status
  const qtd = (status) => empresas.filter((e) => e.status === status).length;
  // soma as ocorrências das empresas com alerta ou crítico
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
    return `
      <article class="card-empresa">
        <div class="empresa-topo">
          <div class="sigla ${info.cor}">${e.sigla}</div>
          <div>
            <strong>${e.nome}</strong>
            <small>${e.equipamentos} equipamentos monitorados</small>
          </div>
          <span class="tag ${info.cor}">● ${info.texto(e.ocorrencias)}</span>
        </div>

        <div class="saude-linha">
          <span>Saúde da infraestrutura</span>
          <b class="${info.cor}">${e.saude}%</b>
        </div>
        <div class="barra ${info.cor}"><div style="width: ${e.saude}%"></div></div>

        <button class="btn-monitorar" data-indice="${i}">↗ Monitorar esta empresa</button>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".btn-monitorar").forEach((botao) => {
    botao.addEventListener("click", () => {
      const empresa = empresas[botao.dataset.indice];
      console.log("Empresa selecionada:", empresa);
      botao.textContent = `✔ Monitorando ${empresa.nome}`;
    });
  });
}

document.getElementById("btnAdicionar").addEventListener("click", () => {
  console.log("Abrir cadastro de nova empresa");
});

desenharResumo();
desenharEmpresas();
