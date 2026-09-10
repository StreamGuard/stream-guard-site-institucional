var URL_API = "http://localhost:3000";

document.querySelector(".botao-cadastro").addEventListener("click", async function (evento) {
    evento.preventDefault();

    // 1. Captura dos valores do formulário
    var id_empresa = document.getElementById('id_empresa').value;
    var nome = document.getElementById('nome').value;
    var cargo = document.getElementById('cargo').value;
    var email = document.getElementById('email_usuario').value;
    var senha = document.getElementById('senha_usuario').value;
    var confirma_senha = document.getElementById('confirmacao_senha_usuario').value;

    // 2. Validações básicas no front-end
    if (!id_empresa || !nome || !cargo || !email || !senha || !confirma_senha) {
        alert("Por favor, preencha todos os campos antes de prosseguir.");
        return;
    }

    if (!email.includes("@") || !email.includes(".")) {
        alert("Insira um endereço de e-mail válido.");
        return;
    }

    if (senha !== confirma_senha) {
        alert("As senhas digitadas não coincidem!");
        return;
    }

    try {
        var respostaEmpresa = await fetch(`${URL_API}/empresas/obterCodigo/${id_empresa}`, {
            method: "GET"
        });

        var existeEmpresa = await respostaEmpresa.json();

        if (!respostaEmpresa.ok || existeEmpresa !== true) {
            alert("Código de empresa inválido ou não cadastrado.");
            return;
        }

        console.log("Empresa validada com sucesso!");

    } catch (erro) {
        alert("Erro ao verificar o código da empresa: ");
        return; 
    }

    try {
        var respostaCadastro = await fetch(`${URL_API}/usuarios/cadastrar`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                idEmpresaServer: id_empresa,
                nomeServer: nome,
                cargoServer: cargo,
                emailServer: email,
                senhaServer: senha
            }),
        });

        if (respostaCadastro.ok) {
            alert("Usuário cadastrado com sucesso!");
            window.location.href = "login.html";
        } else {
            var mensagemErro = await respostaCadastro.text();
            throw new Error(mensagemErro);
        }

    } catch (erro) {
        alert("Falha ao cadastrar usuário: " + erro.message);
    }
});