const usuario = {
    nome: SG.usuario.nome
};

const CHAVE_SELECIONADA = "streamguard:empresa-selecionada";

let empresas = [];
let selecionada = null;
let termoBusca = "";

let timerToast;

function lerStorage(chave, padrao) {
    try {
        const valor = localStorage.getItem(chave);

        if (valor === null || valor === "undefined") {
            localStorage.removeItem(chave);
            return padrao;
        }

        return JSON.parse(valor);

    } catch (erro) {
        console.warn(`Valor inválido no localStorage: ${chave}`);

        localStorage.removeItem(chave);

        return padrao;
    }
}

function salvarStorage(chave, valor) {
    try {
        localStorage.setItem(chave, JSON.stringify(valor));
        return true;
    } catch (erro) {
        console.error("Erro ao salvar localStorage:", erro);
        return false;
    }
}

function gerarSigla(nome) {
    const palavras = String(nome ?? "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    return palavras
        .slice(0, 2)
        .map(palavra => palavra[0].toUpperCase())
        .join("");
}

function normalizar(texto) {
    return String(texto ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function escapar(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
}

function mostrarToast(mensagem) {
    const toast = document.getElementById("toast");

    if (!toast) return;

    toast.textContent = mensagem;
    toast.hidden = false;

    clearTimeout(timerToast);

    timerToast = setTimeout(() => {
        toast.hidden = true;
    }, 2500);
}

async function buscarDados() {
    const resposta = await fetch("/admin/buscarDadosBanco", {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("TOKEN")}` }
    });

    // sessão expirada (ou servidor reiniciado): volta pro login
    if (resposta.status === 401) {
        sessionStorage.clear();
        window.location.href = "../login/login.html";
        return;
    }

    if (!resposta.ok) {
        throw new Error("Erro ao buscar empresas.");
    }

    const resultado = await resposta.json();

    if (!Array.isArray(resultado.dados)) {
        throw new Error("Formato de dados inválido.");
    }

    empresas = resultado.dados.map(empresa => ({
        ...empresa,
        id_empresa: Number(empresa.id_empresa),
        qtd_equipamentos: Number(empresa.qtd_equipamentos || 0),
        sigla: gerarSigla(empresa.razao_social)
    }));

    console.log("Empresas carregadas:", empresas);

    // Recupera a empresa selecionada anteriormente.
    const idSalvo = Number(lerStorage(CHAVE_SELECIONADA, null));

    // Verifica se a empresa salva ainda existe no banco.
    const empresaSalva = empresas.find(
        empresa => empresa.id_empresa === idSalvo
    );

    if (empresaSalva) {
        selecionada = empresaSalva.id_empresa;
    } else {
        // Se o ID salvo não existir mais, seleciona a primeira empresa.
        selecionada = empresas.length > 0
            ? empresas[0].id_empresa
            : null;

        if (selecionada !== null) {
            salvarStorage(CHAVE_SELECIONADA, selecionada);
        } else {
            localStorage.removeItem(CHAVE_SELECIONADA);
        }
    }

    // Sincroniza o usuário global com a empresa selecionada.
    atualizarEmpresaUsuario();
}

function atualizarEmpresaUsuario() {
    if (!SG.usuario) return;

    SG.usuario.id_empresa = selecionada;

    console.log(
        "Empresa atual do usuário:",
        SG.usuario.id_empresa
    );
}

function monitorarEmpresa(idEmpresa) {
    const empresa = empresas.find(
        e => e.id_empresa === Number(idEmpresa)
    );

    if (!empresa) {
        mostrarToast("Empresa não encontrada.");
        return;
    }

    selecionada = empresa.id_empresa;

    // Salva o ID, não o nome da empresa.
    const salvo = salvarStorage(
        CHAVE_SELECIONADA,
        selecionada
    );

    if (!salvo) {
        mostrarToast("Não foi possível salvar a empresa selecionada.");
        return;
    }

    // Atualiza a empresa vinculada ao usuário no sistema.
    atualizarEmpresaUsuario();

    // Atualiza os cards.
    desenharEmpresas();

    mostrarToast(`Monitorando ${empresa.razao_social}`);
}

function desenharResumo() {
    document.getElementById("saudacao").textContent =
        `Olá, ${usuario.nome}`;

    document.getElementById("textoResumo").textContent =
        `Você tem acesso a ${empresas.length} empresas.`;

    document.getElementById("totalVinculadas").textContent =
        `${empresas.length} empresas vinculadas`;

    document.getElementById("miniCards").innerHTML = `
        <div class="mini-card">
            <strong class="verde">${empresas.length}</strong>
            <small>Empresas</small>
        </div>
    `;
}

function desenharEmpresas() {
    const container = document.getElementById("empresas");

    // filtra pelo que foi digitado na busca (nome da empresa ou token)
    const busca = normalizar(termoBusca);
    const lista = empresas.filter(empresa =>
        normalizar(empresa.razao_social).includes(busca) ||
        normalizar(empresa.codigo_empresa).includes(busca)
    );

    if (!lista.length) {
        container.innerHTML = `
            <p>Nenhuma empresa encontrada.</p>
        `;
        return;
    }

    container.innerHTML = lista.map((empresa) => {

        const ativa = empresa.id_empresa === selecionada;

        return `
            <article class="card-empresa ${ativa ? "selecionada" : ""}">

                <div class="empresa-topo">

                    <div class="sigla">
                        ${escapar(empresa.sigla)}
                    </div>

                    <div>
                        <strong>
                            ${escapar(empresa.razao_social)}
                        </strong>

                        <small>
                            ${empresa.qtd_equipamentos} equipamentos monitorados
                        </small>
                    </div>

                    <div class="token-empresa" title="Token da empresa">
                        <small>Token</small>
                        <code>${escapar(empresa.codigo_empresa)}</code>
                        <button
                            type="button"
                            class="btn-copiar"
                            data-token="${escapar(empresa.codigo_empresa)}"
                            aria-label="Copiar token"
                        >
                        <i class="fa-regular fa-copy"></i>
                        Copiar
                        </button>
                    </div>

                </div>

                <button
                    class="btn-monitorar ${ativa ? "ativo" : ""}"
                    data-id-empresa="${empresa.id_empresa}"
                    ${ativa ? "disabled" : ""}
                >
                    ${ativa
                        ? "✔ Monitorando esta empresa"
                        : "↗ Monitorar esta empresa"
                    }
                </button>

            </article>
        `;
    }).join("");
}

document.getElementById("buscaEmpresa").addEventListener("input", evento => {
    termoBusca = evento.target.value;
    desenharEmpresas();
});

document.getElementById("empresas").addEventListener("click", evento => {

    const botaoCopiar = evento.target.closest(".btn-copiar");

    if (botaoCopiar) {
        navigator.clipboard.writeText(botaoCopiar.dataset.token)
            .then(() => mostrarToast("Token copiado!"))
            .catch(() => mostrarToast("Não foi possível copiar o token."));
        return;
    }

    const botao = evento.target.closest(".btn-monitorar");

    if (!botao) return;

    const idEmpresa = Number(botao.dataset.idEmpresa);

    monitorarEmpresa(idEmpresa);
});

function desenharNotificacoes() {
    // A consulta atual não retorna ocorrências.
    // Quando os dados de alertas forem implementados,
    // esta função poderá ser preenchida.

    SG.definirNotificacoes([]);
}

document.getElementById("btnAdicionar").addEventListener("click", () => {
    window.location.href = "./painel_cadastroEmpresa.html";
});

async function atualizarTela() {
    try {
        await buscarDados();

        desenharResumo();
        desenharEmpresas();
        desenharNotificacoes();

    } catch (erro) {
        console.error(erro);

        mostrarToast("Não foi possível carregar as empresas.");
    }
}

atualizarTela();