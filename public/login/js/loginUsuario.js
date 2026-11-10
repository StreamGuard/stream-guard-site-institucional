const formularioLogin = document.getElementById("formLogin");
const campoEmailLogin = document.getElementById("email_usuario");
const campoSenhaLogin = document.getElementById("senha_usuario");
const mensagemLogin = document.getElementById("mensagemErro");
const botaoLogin = formularioLogin.querySelector('button[type="submit"]');
let autenticando = false;

async function entrar(evento) {
  evento.preventDefault();
  if (autenticando) return;

  mensagemLogin.textContent = "";
  campoEmailLogin.removeAttribute("aria-invalid");
  campoSenhaLogin.removeAttribute("aria-invalid");
  const emailVar = campoEmailLogin.value.trim();
  const senhaVar = campoSenhaLogin.value;

  if (!emailVar || !senhaVar) {
    mensagemLogin.textContent = !emailVar && !senhaVar
      ? "Preencha o e-mail e a senha."
      : !emailVar ? "Informe seu e-mail." : "Informe sua senha.";
    if (!emailVar) campoEmailLogin.setAttribute("aria-invalid", "true");
    if (!senhaVar) campoSenhaLogin.setAttribute("aria-invalid", "true");
    (!emailVar ? campoEmailLogin : campoSenhaLogin).focus();
    return;
  }

  autenticando = true;
  botaoLogin.disabled = true;
  botaoLogin.textContent = "Entrando...";
  formularioLogin.setAttribute("aria-busy", "true");
  let respostaRecebida = false;
  let redirecionando = false;

  try {
    const resposta = await fetch("/usuarios/autenticar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailServer: emailVar, senhaServer: senhaVar })
    });
    respostaRecebida = true;

    if (!resposta.ok) {
      mensagemLogin.textContent = resposta.status === 401 || resposta.status === 403
        ? "E-mail ou senha inválidos. Confira os dados e tente novamente."
        : resposta.status === 400
          ? "Confira o e-mail e a senha informados."
          : "O servidor não conseguiu realizar o login. Tente novamente em instantes.";
      return;
    }

    const json = await resposta.json();
    sessionStorage.EMAIL_USUARIO = json.email ?? "";
    sessionStorage.NOME_USUARIO = json.nome ?? "";
    sessionStorage.ID_USUARIO = json.id;
    sessionStorage.CARGO = json.cargo ?? "";
    sessionStorage.PERMISSAO = json.permissao;
    sessionStorage.NOME_EMPRESA = json.nome_empresa || "";
    sessionStorage.removeItem("PERFIL_DEMO");

    redirecionando = true;
    setTimeout(function () {
      const permissao = (json.permissao || "").toLowerCase();
      const root = permissao === "root" || (json.email || "").includes("@streamguard.com");

      window.location = root
        ? "../painel/painel_admin.html"
        : permissao === "admin"
          ? "../painel/painel_config.html"
          : permissao === "gerente"
            ? "../painel/painel_dashEspecifica.html"
            : "../painel/painel_dashGeral.html";
    }, 1000);
  } catch (erro) {
    mensagemLogin.textContent = respostaRecebida
      ? "Não foi possível concluir o login. Tente novamente."
      : "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
  } finally {
    if (!redirecionando) {
      autenticando = false;
      botaoLogin.disabled = false;
      botaoLogin.textContent = "Entrar";
      formularioLogin.removeAttribute("aria-busy");
    }
  }
}

formularioLogin.addEventListener("submit", entrar);
