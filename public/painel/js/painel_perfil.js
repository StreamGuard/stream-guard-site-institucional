"use strict";

const ID_USUARIO = Number(sessionStorage.getItem("ID_USUARIO"));

const formDados = document.getElementById("formDados");
const formSenha = document.getElementById("formSenha");

const inNome = document.getElementById("inNome");
const inEmail = document.getElementById("inEmail");
const inCargo = document.getElementById("inCargo");
const inEmpresa = document.getElementById("inEmpresa");

const pwAtual = document.getElementById("pwAtual");
const pwNova = document.getElementById("pwNova");
const pwConf = document.getElementById("pwConf");

let timerToast;

// Guarda os dados originais para comparar alterações
let dadosOriginais = {
    nome: "",
    email: "",
    cargo: ""
};

function avisar(mensagem, tipo) {
    const toast = document.getElementById("toast");

    toast.textContent = mensagem;
    toast.className = `toast show ${tipo}`;

    clearTimeout(timerToast);

    timerToast = setTimeout(() => {
        toast.className = "toast";
    }, 3500);
}

function gerarIniciais(nome) {
    const partes = String(nome || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (partes.length === 0) return "NU";

    if (partes.length === 1) {
        return partes[0].slice(0, 2).toUpperCase();
    }

    return (
        partes[0][0] +
        partes[partes.length - 1][0]
    ).toUpperCase();
}

function formatarData(data) {
    if (!data) return "Não registrado";

    const dataConvertida = new Date(data);

    if (Number.isNaN(dataConvertida.getTime())) {
        return "Não registrado";
    }

    return dataConvertida.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

async function buscarPerfil() {
    if (!Number.isInteger(ID_USUARIO) || ID_USUARIO <= 0) {
        avisar("Sessão inválida. Faça login novamente.", "err");
        return;
    }

    try {
        const resposta = await fetch(`/perfil/${ID_USUARIO}`);

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.mensagem || "Erro ao buscar perfil.");
        }

        preencherPerfil(resultado);

    } catch (erro) {
        console.error("Erro ao carregar perfil:", erro);
        avisar(erro.message || "Não foi possível carregar seu perfil.", "err");
    }
}

function preencherPerfil(usuario) {
    // Preenche os campos do formulário
    inNome.value = usuario.nome || "";
    inEmail.value = usuario.email || "";
    inCargo.value = usuario.cargo || "";
    inEmpresa.value = usuario.nome_empresa || "";

    // Salva os valores originais
    dadosOriginais = {
        nome: inNome.value.trim(),
        email: inEmail.value.trim(),
        cargo: inCargo.value.trim()
    };

    // Atualiza os dados exibidos no cartão lateral
    document.querySelector("[data-nome]").textContent =
        usuario.nome || "";

    document.querySelector("[data-email]").textContent =
        usuario.email || "";

    document.querySelector("[data-empresa]").textContent =
        usuario.nome_empresa || "";

    document.querySelector("[data-nivel]").textContent =
        usuario.permissao || "";

    document.querySelector("[data-nivel-up]").textContent =
        usuario.permissao || "";

    document.querySelector("[data-iniciais]").textContent =
        gerarIniciais(usuario.nome);

    document.getElementById("ultimoAcesso").textContent =
        formatarData(usuario.dt_ultimo_acesso);

    // Sincroniza os dados com a sessão
    sessionStorage.setItem("NOME_USUARIO", usuario.nome || "");
    sessionStorage.setItem("EMAIL_USUARIO", usuario.email || "");
    sessionStorage.setItem("CARGO", usuario.cargo || "");
    sessionStorage.setItem("NOME_EMPRESA", usuario.nome_empresa || "");
}

formDados.addEventListener("submit", evento => {
    evento.preventDefault();

    const nome = inNome.value.trim();
    const email = inEmail.value.trim();
    const cargo = inCargo.value.trim();

    // Verifica campos obrigatórios
    if (!nome || !email || !cargo) {
        avisar("Preencha todos os campos.", "err");
        return;
    }

    // Verifica se houve alguma alteração
    const houveAlteracao =
        nome !== dadosOriginais.nome ||
        email !== dadosOriginais.email ||
        cargo !== dadosOriginais.cargo;

    if (!houveAlteracao) {
        avisar("Nenhuma alteração foi realizada.", "err");
        return;
    }

    // Abre o modal de confirmação
    document.getElementById("modalConfirmacao").style.display = "flex";
});

async function confirmarAlteracoes() {
    const nome = inNome.value.trim();
    const email = inEmail.value.trim();
    const cargo = inCargo.value.trim();

    const botaoConfirmar = document.querySelector(".btn-confirmar");

    if (botaoConfirmar) {
        botaoConfirmar.disabled = true;
        botaoConfirmar.textContent = "Salvando...";
    }

    try {
        const resposta = await fetch(`/perfil/${ID_USUARIO}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nome,
                email,
                cargo
            })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.mensagem || "Erro ao atualizar perfil.");
        }

        // Atualiza os dados originais
        dadosOriginais = {
            nome,
            email,
            cargo
        };

        // Atualiza os dados visíveis
        document.querySelector("[data-nome]").textContent = nome;
        document.querySelector("[data-email]").textContent = email;

        document.querySelector("[data-iniciais]").textContent =
            gerarIniciais(nome);

        // Atualiza a sessão
        sessionStorage.setItem("NOME_USUARIO", nome);
        sessionStorage.setItem("EMAIL_USUARIO", email);
        sessionStorage.setItem("CARGO", cargo);

        // Atualiza o objeto global do shell
        if (window.SG && SG.usuario) {
            SG.usuario.nome = nome;
            SG.usuario.cargo = cargo;
            SG.usuario.email = email;
        }

        fecharModal();

        avisar(resultado.mensagem || "Dados atualizados com sucesso!", "ok");

    } catch (erro) {
        console.error("Erro ao atualizar dados:", erro);

        fecharModal();

        avisar(erro.message || "Erro ao atualizar dados.", "err");

    } finally {
        if (botaoConfirmar) {
            botaoConfirmar.disabled = false;
            botaoConfirmar.textContent = "Sim, confirmar";
        }
    }
}

function fecharModal() {
    inNome.value = dadosOriginais.nome;
    inEmail.value = dadosOriginais.email;
    inCargo.value = dadosOriginais.cargo;

    document.getElementById("modalConfirmacao").style.display = "none";
}

// Fecha o modal ao clicar fora dele
document.getElementById("modalConfirmacao").addEventListener("click", evento => {
    if (evento.target.id === "modalConfirmacao") {
        fecharModal();
    }
});

formSenha.addEventListener("submit", async evento => {
    evento.preventDefault();

    [pwAtual, pwNova, pwConf].forEach(campo => {
        campo.removeAttribute("aria-invalid");
    });

    if (!pwAtual.value || !pwNova.value || !pwConf.value) {
        avisar("Preencha os três campos de senha.", "err");
        return;
    }

    if (pwNova.value.length < 8) {
        pwNova.setAttribute("aria-invalid", "true");
        avisar("A nova senha precisa ter pelo menos 8 caracteres.", "err");
        return;
    }

    if (pwNova.value !== pwConf.value) {
        pwConf.setAttribute("aria-invalid", "true");
        avisar("A confirmação da senha não corresponde.", "err");
        return;
    }

    if (pwAtual.value === pwNova.value) {
        pwNova.setAttribute("aria-invalid", "true");
        avisar("A nova senha precisa ser diferente da atual.", "err");
        return;
    }

    try {
        const resposta = await fetch(`/perfil/${ID_USUARIO}/senha`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                senhaAtual: pwAtual.value,
                senhaNova: pwNova.value
            })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.mensagem || "Erro ao alterar senha.");
        }

        formSenha.reset();

        avisar(resultado.mensagem || "Senha alterada com sucesso!", "ok");

    } catch (erro) {
        console.error("Erro ao alterar senha:", erro);

        avisar(erro.message || "Não foi possível alterar a senha.", "err");
    }
});

document.querySelectorAll(".eye").forEach(botao => {
    botao.addEventListener("click", () => {
        const campo = botao.previousElementSibling;
        const icone = botao.querySelector("i");

        const mostrar = campo.type === "password";

        campo.type = mostrar ? "text" : "password";

        if (mostrar) {
            icone.classList.remove("fa-eye-slash");
            icone.classList.add("fa-eye");
            botao.setAttribute("aria-label", "Ocultar senha");
        } else {
            icone.classList.remove("fa-eye");
            icone.classList.add("fa-eye-slash");
            botao.setAttribute("aria-label", "Mostrar senha");
        }
    });
});

document.getElementById("sair").addEventListener("click", () => {
    sessionStorage.clear();

    window.location.href = "../login/login.html";
});

buscarPerfil();
