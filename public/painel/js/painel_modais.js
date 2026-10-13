

(function () {
  "use strict";

  const icone = (nome) => `<svg class="sg-ic" aria-hidden="true"><use href="#sg-${nome}"/></svg>`;

  function escapar(valor) {
    const div = document.createElement("div");
    div.textContent = valor == null ? "" : String(valor);
    return div.innerHTML;
  }

  const podeFazer = (acao) => !window.SG || window.SG.pode(acao);

  let overlay = null;
  let gatilho = null;
  let timerAviso;
  let contador = 0;


  function abrir(elemento, origem) {
    fechar(false);
    overlay = elemento;
    gatilho = origem || null;
    document.body.appendChild(overlay);
    document.body.classList.add("modal-aberto");

    overlay.addEventListener("mousedown", (evento) => {
      if (evento.target === overlay) fechar();
    });
    overlay.querySelectorAll("[data-fechar]").forEach((botao) => botao.addEventListener("click", () => fechar()));

    const primeiro =
      overlay.querySelector('input:not([type="radio"]):not([type="checkbox"]):not([readonly])') ||
      overlay.querySelector(".btn-ghost") ||
      overlay.querySelector("button");
    if (primeiro) primeiro.focus();
  }

  function fechar(devolverFoco = true) {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.body.classList.remove("modal-aberto");
    if (devolverFoco && gatilho && document.contains(gatilho)) gatilho.focus();
    if (devolverFoco) gatilho = null;
  }

  document.addEventListener("keydown", (evento) => {
    if (!overlay) return;

    if (evento.key === "Escape") {
      fechar();
      return;
    }

    // mantém o foco do teclado dentro do modal
    if (evento.key === "Tab") {
      const focaveis = [...overlay.querySelectorAll("button, input, select")].filter(
        (el) => !el.disabled && el.offsetParent !== null
      );
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];

      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }
  });

  function montar(classeModal, tag, html) {
    const el = document.createElement("div");
    el.className = "modal-overlay";
    el.innerHTML = `<${tag} class="modal ${classeModal || ""}" role="dialog" aria-modal="true" ${tag === "form" ? "novalidate" : ""}>${html}</${tag}>`;
    return el;
  }

  function topo(titulo, subtitulo, idTitulo) {
    return `
      <div class="modal-topo">
        <div>
          <h3 id="${idTitulo}">${escapar(titulo)}</h3>
          ${subtitulo ? `<p>${escapar(subtitulo)}</p>` : ""}
        </div>
        <button type="button" class="modal-fechar" data-fechar aria-label="Fechar">${icone("x")}</button>
      </div>`;
  }


  function aviso(texto) {
    document.querySelector(".toast-sg")?.remove();
    const el = document.createElement("div");
    el.className = "toast-sg";
    el.setAttribute("role", "status");
    el.innerHTML = `${icone("check")}<span></span>`;
    el.querySelector("span").textContent = texto;
    document.body.appendChild(el);
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => el.remove(), 3500);
  }


  function achatar(campos) {
    return campos.flatMap((c) => (c.tipo === "linha" ? achatar(c.campos) : [c]));
  }

  function campoHtml(c, valores, prefixo) {
    if (c.tipo === "linha") {
      return `<div class="form-linha">${c.campos.map((x) => campoHtml(x, valores, prefixo)).join("")}</div>`;
    }

    const id = `${prefixo}-${c.nome}`;
    const valor = valores[c.nome];
    const rotulo = c.rotulo ? `<label class="form-label" for="${id}">${escapar(c.rotulo)}</label>` : "";
    const erro = `<span class="form-erro">${escapar(c.erro || "Confira este campo.")}</span>`;
    const dica = c.dica ? `<span class="form-dica">${escapar(c.dica)}</span>` : "";

    if (c.tipo === "select") {
      const opcoes = c.opcoes
        .map((o) => `<option value="${escapar(o.valor)}" ${String(o.valor) === String(valor) ? "selected" : ""}>${escapar(o.texto)}</option>`)
        .join("");
      return `<div class="form-grupo" data-campo="${c.nome}">${rotulo}<select class="select-sg" id="${id}" name="${c.nome}">${opcoes}</select>${dica}${erro}</div>`;
    }

    if (c.tipo === "icones") {
      const opcoes = c.opcoes
        .map(
          (o, i) => `
        <label class="opcao-icone" style="--cor:${o.cor || "var(--verde)"}">
          <input type="radio" name="${c.nome}" value="${escapar(o.valor)}" ${(valor == null ? i === 0 : o.valor === valor) ? "checked" : ""}>
          <span>${o.html}</span>
        </label>`
        )
        .join("");
      return `<div class="form-grupo"><span class="form-label">${escapar(c.rotulo)}</span><div class="opcoes-icone" role="radiogroup">${opcoes}</div></div>`;
    }

    if (c.tipo === "perfil") {
      const opcoes = c.opcoes
        .map(
          (o, i) => `
        <label class="opcao-perfil">
          <input type="radio" name="${c.nome}" value="${escapar(o.valor)}" ${(valor == null ? i === c.opcoes.length - 1 : o.valor === valor) ? "checked" : ""}>
          <div><span><strong>${escapar(o.titulo)}</strong><small>${escapar(o.descricao)}</small></span>${icone("check")}</div>
        </label>`
        )
        .join("");
      return `<div class="form-grupo"><span class="form-label">${escapar(c.rotulo)}</span><div class="opcoes-perfil" role="radiogroup">${opcoes}</div></div>`;
    }

    if (c.tipo === "switch") {
      return `
        <div class="form-switch">
          <div><strong>${escapar(c.rotulo)}</strong>${c.descricao ? `<small>${escapar(c.descricao)}</small>` : ""}</div>
          <label class="switch">
            <input type="checkbox" name="${c.nome}" ${valor === false ? "" : "checked"} aria-label="${escapar(c.rotulo)}">
            <span class="switch-track"></span>
          </label>
        </div>`;
    }

    // texto, email, numero
    const tipoInput = c.tipo === "numero" ? "number" : c.tipo === "email" ? "email" : "text";
    const atributos = [
      c.placeholder ? `placeholder="${escapar(c.placeholder)}"` : "",
      c.max != null ? (c.tipo === "numero" ? `max="${c.max}"` : `maxlength="${c.max}"`) : "",
      c.min != null ? `min="${c.min}"` : "",
      c.step != null ? `step="${c.step}"` : "",
      c.somenteLeitura ? "readonly" : ""
    ].join(" ");
    const entrada = `<input class="input-sg" id="${id}" name="${c.nome}" type="${tipoInput}" value="${escapar(valor)}" autocomplete="off" ${atributos}>`;
    const campo = c.sufixo ? `<div class="campo-sufixo">${entrada}<span>${escapar(c.sufixo)}</span></div>` : entrada;
    return `<div class="form-grupo" data-campo="${c.nome}">${rotulo}${campo}${dica}${erro}</div>`;
  }

  function coletar(form, campos) {
    const valores = {};
    achatar(campos).forEach((c) => {
      const el = form.elements[c.nome];
      if (!el) return;
      if (c.tipo === "switch") valores[c.nome] = el.checked;
      else if (c.tipo === "icones" || c.tipo === "perfil") valores[c.nome] = form.querySelector(`input[name="${c.nome}"]:checked`)?.value;
      else if (c.tipo === "numero") valores[c.nome] = el.value === "" ? null : Number(el.value);
      else valores[c.nome] = el.value.trim();
    });
    return valores;
  }

  function validar(form, campos, valores) {
    let valido = true;
    let primeiroErro = null;

    achatar(campos).forEach((c) => {
      const grupo = form.querySelector(`[data-campo="${c.nome}"]`);
      if (!grupo) return;

      const v = valores[c.nome];
      const obrigatorio = c.obrigatorio !== false && (c.tipo === "texto" || c.tipo === "email" || c.tipo === "numero");
      let ok = true;

      if (obrigatorio && (v === "" || v == null)) ok = false;
      if (ok && c.tipo === "email" && v) ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if (ok && c.tipo === "numero" && v != null) {
        if (c.min != null && v < c.min) ok = false;
        if (c.max != null && v > c.max) ok = false;
      }
      if (ok && c.validar) ok = c.validar(v, valores) !== false;

      grupo.classList.toggle("tem-erro", !ok);
      if (!ok && !primeiroErro) primeiroErro = grupo;
      if (!ok) valido = false;
    });

    if (primeiroErro) primeiroErro.querySelector("input, select")?.focus();
    return valido;
  }

  function formulario(op) {
    const idForm = `sgm-${++contador}`;
    const valores = op.valores || {};

    const html = `
      ${topo(op.titulo, op.subtitulo, `${idForm}-titulo`)}
      <div class="modal-corpo">
        ${op.campos.map((c) => campoHtml(c, valores, idForm)).join("")}
        <p class="form-erro" data-erro-geral></p>
      </div>
      <div class="modal-rodape">
        <button type="button" class="btn-sg btn-ghost" data-fechar>Cancelar</button>
        <button type="submit" class="btn-sg btn-primary">${icone(op.icone || "save")} ${escapar(op.confirmar || "Salvar")}</button>
      </div>`;

    const el = montar(op.classe, "form", html);
    const form = el.querySelector("form");
    form.setAttribute("aria-labelledby", `${idForm}-titulo`);

    form.addEventListener("input", (evento) => {
      evento.target.closest(".form-grupo")?.classList.remove("tem-erro");
      form.querySelector("[data-erro-geral]").style.display = "none";
    });

    form.addEventListener("submit", (evento) => {
      evento.preventDefault();
      const coletados = coletar(form, op.campos);
      if (!validar(form, op.campos, coletados)) return;

      const resultado = op.onSalvar ? op.onSalvar(coletados) : undefined;

      if (typeof resultado === "string") {
        const geral = form.querySelector("[data-erro-geral]");
        geral.textContent = resultado;
        geral.style.display = "block";
        return;
      }
      if (resultado === false) return;

      fechar();
      if (op.aviso) aviso(op.aviso);
    });

    abrir(el, op.gatilho);
  }

  /* ---------- visualizar ---------- */

  function itemVer(item) {
    let conteudo;
    if (item.tag != null) conteudo = `<span class="tag ${item.cor || ""}">${escapar(item.tag)}</span>`;
    else if (item.barra) {
      const largura = Math.max(0, Math.min(100, item.barra.valor));
      conteudo = `<div class="ver-barra ${item.barra.cor || ""}"><div><span style="width:${largura}%"></span></div><b>${largura}%</b></div>`;
    } else conteudo = escapar(item.valor == null || item.valor === "" ? "—" : item.valor);

    return `<div class="${item.inteira ? "inteira" : ""}"><dt>${escapar(item.rotulo)}</dt><dd>${conteudo}</dd></div>`;
  }

  function ver(op) {
    const idVer = `sgm-${++contador}`;
    const podeEditar = op.onEditar && podeFazer("editar");
    const podeExcluir = op.onExcluir && podeFazer("excluir");

    const destaque = op.destaque
      ? `<div class="ver-destaque ${op.destaque.cor || ""}">
           <span class="ver-icone">${op.destaque.icone || ""}</span>
           <div><strong>${escapar(op.destaque.titulo)}</strong><small>${escapar(op.destaque.texto || "")}</small></div>
         </div>`
      : "";

    const html = `
      ${topo(op.titulo, op.subtitulo, `${idVer}-titulo`)}
      <div class="modal-corpo">
        ${destaque}
        <dl class="ver-lista">${op.itens.map(itemVer).join("")}</dl>
      </div>
      <div class="modal-rodape">
        ${podeExcluir ? `<button type="button" class="btn-sg btn-danger espaco" data-acao-ver="excluir">${icone("trash")} Excluir</button>` : ""}
        <button type="button" class="btn-sg btn-ghost" data-fechar>Fechar</button>
        ${podeEditar ? `<button type="button" class="btn-sg btn-primary" data-acao-ver="editar">${icone(op.iconeEditar || "edit")} ${escapar(op.textoEditar || "Editar")}</button>` : ""}
      </div>`;

    const el = montar(op.classe, "div", html);
    el.firstElementChild.setAttribute("aria-labelledby", `${idVer}-titulo`);

    el.querySelectorAll("[data-acao-ver]").forEach((botao) =>
      botao.addEventListener("click", () => {
        const origem = gatilho;
        fechar(false);
        // dupla checagem de permissão (não confia só no botão)
        if (botao.dataset.acaoVer === "editar" && podeFazer("editar")) op.onEditar(origem);
        if (botao.dataset.acaoVer === "excluir" && podeFazer("excluir")) op.onExcluir(origem);
      })
    );

    abrir(el, op.gatilho);
  }


  function confirmar(op) {
    const idConf = `sgm-${++contador}`;
    const html = `
      <div class="confirmar-conteudo">
        <span class="confirmar-icone">${icone("alert")}</span>
        <div>
          <h3 id="${idConf}-titulo">${escapar(op.titulo)}</h3>
          <p>${op.texto}</p>
        </div>
      </div>
      <div class="modal-rodape">
        <button type="button" class="btn-sg btn-ghost" data-fechar>Cancelar</button>
        <button type="button" class="btn-sg btn-danger-solid" data-confirmar>${icone("trash")} ${escapar(op.botao || "Excluir")}</button>
      </div>`;

    const el = montar("modal-sm", "div", html);
    el.firstElementChild.setAttribute("role", "alertdialog");
    el.firstElementChild.setAttribute("aria-labelledby", `${idConf}-titulo`);

    el.querySelector("[data-confirmar]").addEventListener("click", () => {
      if (op.onConfirmar && op.onConfirmar() === false) return;
      fechar();
      if (op.aviso) aviso(op.aviso);
    });

    abrir(el, op.gatilho);
  }

  window.SGModal = { formulario, ver, confirmar, aviso, fechar, escapar, icone };
})();
