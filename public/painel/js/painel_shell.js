

(function () {
  "use strict";


  const PERFIS = ["usuario", "gerente", "admin", "root"];

  const NOMES_PERFIL = {
    usuario: "Usuário",
    gerente: "Gerente",
    admin: "Administrador",
    root: "StreamGuard"
  };

  // o que cada perfil pode fazer (ver = todos)
  const REGRAS = {
    ver: ["usuario", "gerente", "admin", "root"],
    criar: ["gerente", "admin"],
    editar: ["gerente", "admin"],
    excluir: ["admin"],
    configurar: ["admin", "root"],
    conta: ["root"]
  };

  const DASHBOARD_POR_PERFIL = {
    usuario: "./painel_dashGeral.html",
    gerente: "./painel_dashEspecifica.html",
    admin: "./painel_dashGeral.html",
  };

  function guardar(chave, padrao) {
    try {
      return sessionStorage.getItem(chave) || padrao;
    } catch (erro) {
      return padrao;
    }
  }

  function perfilDoBanco(texto) {
    const t = (texto || "").toLowerCase();
    if (t === "root" ) return "root" 
    if(t === "admin" || t === "administrador") return "admin";
    if (t === "gerente") return "gerente";
    if (t === "user" || t === "usuario" || t === "usuário" || t === "comum") return "usuario";
    return null;
  }

  const semLoginReal = !perfilDoBanco(guardar("PERMISSAO", ""));

  function resolverPerfil() {
    const url = new URLSearchParams(location.search).get("perfil");
    if (PERFIS.includes(url)) {
      try { sessionStorage.setItem("PERFIL_DEMO", url); } catch (e) { /* ignora */ }
    }
    const demo = guardar("PERFIL_DEMO", "");
    if (semLoginReal && PERFIS.includes(demo)) return demo;

    return perfilDoBanco(guardar("PERMISSAO", "")) || "usuario";
  }

  const perfil = resolverPerfil();

  function pode(acao) {
    return (REGRAS[acao] || []).includes(perfil);
  }

  function iniciais(nome) {
    const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return "NU";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  function escapar(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  }

  const usuario = {
    nome: guardar("NOME_USUARIO", "Nome do Usuário"),
    cargo: guardar("CARGO", NOMES_PERFIL[perfil]),
    empresa: empresaAtual(),
  };

  function empresaAtual() {
    try {
      const salva = JSON.parse(localStorage.getItem("streamguard:empresa-selecionada"));
      if (salva) return salva;
    } catch (erro) { /* ignora */ }
    return guardar("NOME_EMPRESA", "StreamCo Brasil");
  }


  const ICONES = `
    <svg width="0" height="0" style="position:absolute" aria-hidden="true">
      <symbol id="sg-shield" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></symbol>
      <symbol id="sg-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></symbol>
      <symbol id="sg-server" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></symbol>
      <symbol id="sg-bell" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></symbol>
      <symbol id="sg-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></symbol>
      <symbol id="sg-user" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></symbol>
      <symbol id="sg-building" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><line x1="8" y1="6" x2="8.01" y2="6"/><line x1="12" y1="6" x2="12.01" y2="6"/><line x1="16" y1="6" x2="16.01" y2="6"/><line x1="8" y1="10" x2="8.01" y2="10"/><line x1="12" y1="10" x2="12.01" y2="10"/><line x1="16" y1="10" x2="16.01" y2="10"/></symbol>
      <symbol id="sg-lock" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></symbol>
      <symbol id="sg-alert" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></symbol>
      <symbol id="sg-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></symbol>
      <symbol id="sg-send" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></symbol>
      <symbol id="sg-hash" viewBox="0 0 24 24"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></symbol>
      <symbol id="sg-layers" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></symbol>
      <symbol id="sg-edit" viewBox="0 0 24 24"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></symbol>
      <symbol id="sg-trash" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></symbol>
      <symbol id="sg-plus" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></symbol>
      <symbol id="sg-eye" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></symbol>
      <symbol id="sg-x" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></symbol>
      <symbol id="sg-save" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></symbol>
      <symbol id="sg-user-plus" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></symbol>
      <symbol id="sg-logout" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></symbol>
    </svg>`;

  function item(href, icone, texto, chave) {
    return `
      <a href="${href}" class="menu-item" data-menu="${chave}" title="${texto}">
        <svg class="sg-ic" aria-hidden="true"><use href="#${icone}"/></svg><span>${texto}</span>
      </a>`;
  }

  function desenharSidebar(alvo) {
    alvo.innerHTML = `
      ${ICONES}
      <div class="logo">
        <div class="logo-icone"><img src="../assets/streamGuard_logo.png"></img></div>
        <div class="logo-texto">STREAM<span>GUARD</span></div>
      </div>

      <p class="menu-titulo">Monitoramento</p>
      <nav class="menu">
        ${item(DASHBOARD_POR_PERFIL[perfil], "sg-grid", "Dashboard", "dashboard")}
        ${item("./painel_detalhes.html", "sg-server", "Componentes", "detalhes")}
        ${item("./painel_alerta.html", "sg-bell", "Alertas", "alerta")}
      </nav>

      <div class="menu-div">
        <span></span>
      </div>

      <p class="menu-titulo">Administração</p>
      <nav class="menu">
        ${pode("configurar") ? item("./painel_config.html", "sg-settings", "Configurações", "config") : ""}
        ${item("./painel_perfil.html", "sg-user", "Perfil", "perfil")}
        ${pode("conta") ? item("./painel_admin.html", "sg-building", "Conta", "admin") : ""}
      </nav>

      <div class="ambiente">
        <div class="usuario">
          <div class="avatar">${escapar(iniciais(usuario.nome))}</div>
            <div>
              <strong>${escapar(usuario.nome)}</strong>
              <span class="nivel nivel-${perfil}">${NOMES_PERFIL[perfil]}</span>
            </div>
          </div>
          <div class="usuario-div">
            <span></span>
          </div>
          <div class="usuario-logout">
            <a class="btn-sair" id="btnSairShell" href="../login/login.html" title="Sair" aria-label="Sair">
              <svg class="sg-ic" aria-hidden="true"><use href="#sg-logout"/></svg>
            </a>
            <h6>Sair da conta</h6>
          </div>
        </div>
      </div>

      
        
      <strong id="totalVinculadas">${escapar(usuario.empresa)}</strong>
      `;

    // marca a tela atual
    const pagina = document.body.dataset.pagina;
    const chave = pagina === "dashGeral" || pagina === "dashEspecifica" ? "dashboard" : pagina;
    const ativo = alvo.querySelector(`[data-menu="${chave}"]`);
    if (ativo) {
      ativo.classList.add("ativo");
      ativo.setAttribute("aria-current", "page");
    }
  }

  function desenharTopo(alvo) {
    const demo = semLoginReal
      ? `<label class="demo-perfil">Ver como
           <select id="demoPerfil" aria-label="Ver a tela como outro perfil">
             ${PERFIS.map((p) => `<option value="${p}" ${p === perfil ? "selected" : ""}>${NOMES_PERFIL[p]}</option>`).join("")}
           </select>
         </label>`
      : "";

    alvo.innerHTML = `
      ${demo}
      <span class="selo-online"><i class="bolinha verde"></i> Sistemas online</span>
      <div class="sino-wrap">
        <button class="btn-sino" id="btnSino" type="button" aria-label="Notificações" aria-expanded="false">
          <svg class="sg-ic" aria-hidden="true"><use href="#sg-bell"/></svg>
          <span class="sino-badge" id="sinoBadge" hidden></span>
        </button>
        <div class="painel-notif" id="painelNotif" hidden></div>
      </div>
      `;

    const seletor = document.getElementById("demoPerfil");
    if (seletor) {
      seletor.addEventListener("change", () => {
        try { sessionStorage.setItem("PERFIL_DEMO", seletor.value); } catch (e) { /* ignora */ }
        // volta pro dashboard certo se o perfil novo não pode ver a tela atual
        const url = new URL(location.href);
        url.searchParams.delete("perfil");
        location.href = url.toString();
      });
    }

    document.getElementById("btnSairShell").addEventListener("click", async (evento) => {
      evento.preventDefault();
      const destino = evento.currentTarget.href;
      try {
        const resposta = await fetch("/usuarios/sair", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: "{}"
        });
        if (!resposta.ok) throw new Error("Não foi possível encerrar a sessão. Tente novamente.");
        sessionStorage.clear();
        location.href = destino;
      } catch (erro) {
        window.alert(erro.message);
      }
    });
  }


  const COR_STATUS = { ok: "verde", alerta: "laranja", critico: "vermelho" };

  let notificacoes = [
    { nome: "srv-stream-01", texto: "RAM em 92% (acima do limite)", status: "critico" },
    { nome: "srv-stream-03", texto: "Rede em 78% (perto do limite)", status: "alerta" },
  ];

  function desenharNotificacoes() {
    const painel = document.getElementById("painelNotif");
    const badge = document.getElementById("sinoBadge");
    if (!painel || !badge) return;

    badge.hidden = notificacoes.length === 0;
    badge.textContent = notificacoes.length;

    painel.innerHTML = notificacoes.length
      ? `<h4>Ocorrências ativas</h4>` +
        notificacoes
          .map(
            (n) => `
          <div class="notif-item">
            <i class="bolinha ${COR_STATUS[n.status] || "azul"}"></i>
            <div><strong>${escapar(n.nome)}</strong><small>${escapar(n.texto)}</small></div>
          </div>`
          )
          .join("")
      : `<p class="vazio">Nenhuma ocorrência no momento</p>`;
  }

  function ligarSino() {
    const botao = document.getElementById("btnSino");
    const painel = document.getElementById("painelNotif");

    function alternar(abrir) {
      painel.hidden = !abrir;
      botao.setAttribute("aria-expanded", String(abrir));
    }

    botao.addEventListener("click", (evento) => {
      evento.stopPropagation();
      alternar(painel.hidden);
    });

    document.addEventListener("click", (evento) => {
      if (!painel.hidden && !painel.contains(evento.target)) alternar(false);
    });

    document.addEventListener("keydown", (evento) => {
      if (evento.key === "Escape" && !painel.hidden) alternar(false);
    });
  }


  function aplicarPermissoes(raiz) {
    raiz.querySelectorAll("[data-perm]").forEach((el) => {
      el.hidden = !pode(el.dataset.perm);
    });

    raiz.querySelectorAll("[data-perfis]").forEach((el) => {
      el.hidden = !el.dataset.perfis.split(" ").includes(perfil);
    });

    raiz.querySelectorAll("[data-perm-lock]").forEach((el) => {
      const travar = !pode(el.dataset.permLock);
      el.classList.toggle("somente-leitura", travar);
      if (el.matches("input, select, textarea, button")) el.disabled = travar;
    });
  }

  function mostrarAviso(principal) {
    if (!document.body.hasAttribute("data-edicao") || perfil === "admin") return;
    if (principal.querySelector(".aviso-perfil")) return;

    const textos = {
      usuario:
        "<strong>Modo somente leitura.</strong> Seu perfil de Usuário pode visualizar as informações, mas não pode cadastrar, editar ou excluir.",
      gerente:
        "<strong>Perfil Gerente.</strong> Você pode visualizar, cadastrar e editar. Excluir e as Configurações são exclusivos do Administrador.",
    };

    const faixa = document.createElement("div");
    faixa.className = `aviso-perfil nivel-${perfil}`;
    faixa.innerHTML = `<svg class="sg-ic" aria-hidden="true"><use href="#sg-lock"/></svg><span>${textos[perfil]}</span>`;
    principal.prepend(faixa);
  }

  function bloquearTela(principal) {
    principal.innerHTML = `
      <section class="acesso-negado">
        <div>
          <div class="icone"><svg class="sg-ic" aria-hidden="true"><use href="#sg-lock"/></svg></div>
          <h2>Acesso restrito ao Administrador</h2>
          <p>Seu perfil (${NOMES_PERFIL[perfil]}) não tem permissão para abrir esta tela. Se precisar de acesso, fale com o administrador da sua empresa.</p>
          <a href="${DASHBOARD_POR_PERFIL[perfil]}">Voltar ao dashboard</a>
        </div>
      </section>`;
  }


  function iniciar() {
    const sidebar = document.querySelector('[data-shell="sidebar"]');
    const topoDireita = document.querySelector('[data-shell="topo-direita"]');
    const principal = document.querySelector(".principal");

    if (sidebar) desenharSidebar(sidebar);
    if (topoDireita) {
      desenharTopo(topoDireita);
      desenharNotificacoes();
      ligarSino();
    }

    if (!principal) return;

    const exigida = document.body.dataset.acesso;
    if (exigida && !pode(exigida)) {
      bloquearTela(principal);
      return;
    }

    mostrarAviso(principal);
    aplicarPermissoes(document);

    // as telas desenham listas pelo JS: reaplica sempre que algo novo entra
    let pendente = false;
    new MutationObserver(() => {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(() => {
        pendente = false;
        aplicarPermissoes(principal);
      });
    }).observe(principal, { childList: true, subtree: true });
  }

  window.SG = {
    perfil,
    usuario,
    pode,
    nomePerfil: NOMES_PERFIL[perfil],
    definirNotificacoes(lista) {
      notificacoes = lista;
      desenharNotificacoes();
    },
    reaplicarPermissoes() {
      aplicarPermissoes(document);
    },
  };

  iniciar();
})();
