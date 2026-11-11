
const TIPOS = ["Processador", "Memória", "Armazenamento", "Rede", "Hardware"];
const ICONE_DO_TIPO = { Processador: "i-cpu", Memória: "i-ram", Armazenamento: "i-disk", Rede: "i-network", Hardware: "i-zap" };
const COR_DO_TIPO = { Processador: "verde", Memória: "roxo", Armazenamento: "roxo", Rede: "azul", Hardware: "azul" };

const equipamento = "srv-stream-01";
const empresa = "StreamCo Brasil";

let componentes = [
  { id: 1, nome: "CPU",              tipo: "Processador",   uso: 62,   alerta: 80, critico: 90, ativo: true, atualizacao: "há 2 min" },
  { id: 2, nome: "Memória RAM",      tipo: "Memória",       uso: 92,   alerta: 85, critico: 90, ativo: true, atualizacao: "há 2 min" },
  { id: 3, nome: "Disco",            tipo: "Armazenamento", uso: 34,   alerta: 80, critico: 90, ativo: true, atualizacao: "há 5 min" },
  { id: 4, nome: "Placa de rede",    tipo: "Rede",          uso: 78,   alerta: 70, critico: 90, ativo: true, atualizacao: "há 5 min" },
  { id: 5, nome: "Fonte de energia", tipo: "Hardware",      uso: null, alerta: 80, critico: 90, ativo: true, atualizacao: "há 8 min" }
];
let proximoId = 6;

const corpo = document.getElementById("corpoTabela");
const busca = document.getElementById("busca");
const filtroTipo = document.getElementById("filtroTipo");
const filtroStatus = document.getElementById("filtroStatus");

const esc = SGModal.escapar;


function statusDe(c) {
  if (!c.ativo) return { texto: "INATIVO", cor: "cinza" };
  if (c.uso == null) return { texto: "OK", cor: "verde" };
  if (c.uso >= c.critico) return { texto: "CRÍTICO", cor: "vermelho" };
  if (c.uso >= c.alerta) return { texto: "ALERTA", cor: "laranja" };
  return { texto: "OK", cor: "verde" };
}

function corDe(c) {
  const status = statusDe(c);
  return status.cor === "verde" || status.cor === "cinza" ? COR_DO_TIPO[c.tipo] || "verde" : status.cor;
}

const svg = (id) => `<svg class="ic" aria-hidden="true"><use href="#${id}"/></svg>`;


function desenhar() {
  corpo.innerHTML = componentes.map((c) => {
    const status = statusDe(c);
    const cor = corDe(c);
    const uso = c.uso == null || !c.ativo
      ? `<div class="uso"><div class="barra"><div style="width:0"></div></div><b>-</b></div>`
      : `<div class="uso ${cor}"><div class="barra"><div style="width:${c.uso}%"></div></div><b>${c.uso}%</b></div>`;

    return `
      <tr data-id="${c.id}" data-tipo="${esc(c.tipo)}" data-status="${status.texto}">
        <td><div class="comp"><span class="sigla ${cor}">${svg(ICONE_DO_TIPO[c.tipo])}</span><strong>${esc(c.nome)}</strong></div></td>
        <td class="suave">${esc(c.tipo)}</td>
        <td>${uso}</td>
        <td><span class="tag status ${status.cor}">${status.texto}</span></td>
        <td class="suave">${esc(c.atualizacao)}</td>
        <td>
          <div class="acoes">
            <button class="btn-ver" data-acao="ver">${svg("i-eye")} Ver</button>
            <button class="btn-editar" data-acao="editar" data-perm="editar">${svg("i-edit")} Editar</button>
            <button class="btn-excluir" data-acao="excluir" data-perm="excluir">${svg("i-trash")} Excluir</button>
          </div>
        </td>
      </tr>`;
  }).join("");

  filtrar();
  resumir();
  SG.reaplicarPermissoes();
}

function filtrar() {
  const termo = busca.value.trim().toLowerCase();
  let visiveis = 0;

  corpo.querySelectorAll("tr").forEach((tr) => {
    const ok = tr.textContent.toLowerCase().includes(termo)
      && (!filtroTipo.value || tr.dataset.tipo === filtroTipo.value)
      && (!filtroStatus.value || tr.dataset.status === filtroStatus.value);
    tr.hidden = !ok;
    if (ok) visiveis++;
  });

  document.getElementById("contagem").textContent =
    visiveis ? `Exibindo 1–${visiveis} de ${visiveis} componentes` : "Nenhum componente encontrado";
}

function resumir() {
  const conta = (texto) => componentes.filter((c) => statusDe(c).texto === texto).length;
  document.getElementById("kpiTotal").textContent = componentes.length;
  document.getElementById("kpiOk").textContent = conta("OK");
  document.getElementById("kpiAlerta").textContent = conta("ALERTA");
  document.getElementById("kpiCritico").textContent = conta("CRÍTICO");

  const ativos = componentes.filter((c) => c.ativo).length;
  document.getElementById("seloContagem").innerHTML =
    `<i class="bolinha verde"></i> ${ativos} ${ativos === 1 ? "componente ativo" : "componentes ativos"}`;
}

[busca, filtroTipo, filtroStatus].forEach((el) => el.addEventListener("input", filtrar));


const camposComponente = [
  { tipo: "texto", nome: "nome", rotulo: "Nome do componente", placeholder: "Ex.: Memória RAM", max: 40, erro: "Informe o nome do componente." },
  { tipo: "select", nome: "tipo", rotulo: "Tipo", opcoes: TIPOS.map((t) => ({ valor: t, texto: t })) },
  {
    tipo: "linha",
    campos: [
      { tipo: "numero", nome: "alerta", rotulo: "Limite de alerta", min: 1, max: 100, sufixo: "%", erro: "Use um valor de 1 a 100." },
      {
        tipo: "numero", nome: "critico", rotulo: "Limite crítico", min: 1, max: 100, sufixo: "%",
        erro: "Deve ser maior que o limite de alerta (até 100).",
        validar: (valor, todos) => valor > todos.alerta
      }
    ]
  },
  { tipo: "switch", nome: "ativo", rotulo: "Coleta ativa", descricao: "Quando desligada, o componente deixa de ser monitorado." }
];

function abrirVer(id, origem) {
  const c = componentes.find((x) => x.id === id);
  if (!c) return;
  const status = statusDe(c);

  SGModal.ver({
    titulo: "Detalhes do componente",
    subtitulo: `${equipamento} • ${empresa}`,
    gatilho: origem,
    destaque: { icone: svg(ICONE_DO_TIPO[c.tipo]), cor: corDe(c), titulo: c.nome, texto: c.tipo },
    itens: [
      { rotulo: "Status", tag: status.texto, cor: status.cor },
      { rotulo: "Coleta", valor: c.ativo ? "Ativa" : "Inativa" },
      { rotulo: "Uso atual", inteira: true, ...(c.uso == null || !c.ativo ? { valor: "Sem leitura" } : { barra: { valor: c.uso, cor: corDe(c) } }) },
      { rotulo: "Limite de alerta", valor: `${c.alerta}%` },
      { rotulo: "Limite crítico", valor: `${c.critico}%` },
      { rotulo: "Equipamento", valor: equipamento },
      { rotulo: "Última atualização", valor: c.atualizacao }
    ],
    onEditar: (gatilho) => abrirFormulario(id, gatilho),
    onExcluir: (gatilho) => abrirExcluir(id, gatilho)
  });
}

function abrirFormulario(id, origem) {
  const editando = id != null;
  if (editando ? !SG.pode("editar") : !SG.pode("criar")) return; // checagem dupla

  const atual = editando ? componentes.find((x) => x.id === id) : { tipo: "Processador", alerta: 80, critico: 90, ativo: true };

  SGModal.formulario({
    titulo: editando ? "Editar componente" : "Novo componente",
    subtitulo: editando ? "Ajuste o nome, o tipo e os limites." : `Cadastre um componente em ${equipamento}.`,
    confirmar: editando ? "Salvar alterações" : "Adicionar componente",
    icone: editando ? "save" : "plus",
    aviso: editando ? "Componente atualizado." : "Componente adicionado.",
    gatilho: origem,
    valores: atual,
    campos: camposComponente,
    onSalvar(v) {
      const repetido = componentes.some((x) => x.id !== id && x.nome.toLowerCase() === v.nome.toLowerCase());
      if (repetido) return "Já existe um componente com esse nome neste equipamento.";

      if (editando) {
        Object.assign(atual, { nome: v.nome, tipo: v.tipo, alerta: v.alerta, critico: v.critico, ativo: v.ativo, atualizacao: "agora" });
      } else {
        componentes.push({ id: proximoId++, nome: v.nome, tipo: v.tipo, uso: null, alerta: v.alerta, critico: v.critico, ativo: v.ativo, atualizacao: "agora" });
      }
      desenhar();
    }
  });
}

function abrirExcluir(id, origem) {
  const c = componentes.find((x) => x.id === id);
  if (!c || !SG.pode("excluir")) return; // checagem dupla

  SGModal.confirmar({
    titulo: "Excluir componente?",
    texto: `O componente <strong>${esc(c.nome)}</strong> deixará de ser monitorado em ${esc(equipamento)}. Essa ação não pode ser desfeita.`,
    botao: "Excluir",
    aviso: "Componente excluído.",
    gatilho: origem,
    onConfirmar() {
      componentes = componentes.filter((x) => x.id !== id);
      desenhar();
    }
  });
}

corpo.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-acao]");
  if (!botao) return;
  const id = Number(botao.closest("tr").dataset.id);

  if (botao.dataset.acao === "ver") abrirVer(id, botao);
  if (botao.dataset.acao === "editar") abrirFormulario(id, botao);
  if (botao.dataset.acao === "excluir") abrirExcluir(id, botao);
});

document.querySelector(".btn-adicionar").addEventListener("click", (evento) => abrirFormulario(null, evento.currentTarget));

desenhar();
