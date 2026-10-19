function entrar() {
  var emailVar = email_usuario.value;
  var senhaVar = senha_usuario.value;

  if (emailVar == "" || senhaVar == "") {
    return false;
  }

  console.log("FORM LOGIN: ", emailVar);
  console.log("FORM SENHA: ", senhaVar);

  fetch("/usuarios/autenticar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      emailServer: emailVar,
      senhaServer: senhaVar,
    }),
  })
    .then(function (resposta) {
      console.log("ESTOU NO THEN DO entrar()!");

      if (resposta.ok) {
        console.log(resposta);

        resposta.json().then((json) => {
          console.log(json);
          console.log(JSON.stringify(json));
          sessionStorage.EMAIL_USUARIO = json.email;
          sessionStorage.NOME_USUARIO = json.nome;
          sessionStorage.ID_USUARIO = json.id;
          sessionStorage.CARGO = json.cargo;
          sessionStorage.PERMISSAO = json.permissao; // Root / Admin / Gerente / User (define o que a pessoa pode fazer no painel)
          sessionStorage.NOME_EMPRESA = json.nome_empresa || "";
          sessionStorage.removeItem("PERFIL_DEMO");

          setTimeout(function () {
  // cada perfil já cai direto na tela que ele mais usa
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
        });
      } else {
        console.log("Houve um erro ao tentar realizar o login!");

        resposta.text().then((texto) => {
          console.error(texto);
        });
      }
    })
    .catch(function (erro) {
      console.log(erro);
    });

  return false;
}
