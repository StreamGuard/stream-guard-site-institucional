var URL_API = "http://localhost:3000";

document.querySelector(".botao-cadastro").addEventListener("click", function (evento) {
    evento.preventDefault();

    var razaoSocial = document.getElementById("razao_social").value;
    var cnpj = document.getElementById("cnpj").value.replace(/[^\d]/g, "");

    fetch(`${URL_API}/empresas/cadastrar`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            razaoSocial: razaoSocial,
            cnpj: cnpj,
        }),
    })
        .then(function (resposta) {
            if (resposta.ok) {
                return resposta.json();
            } else {
                return resposta.text().then(function (mensagemErro) {
                    throw new Error(mensagemErro);
                });
            }
        })
        .then(function (dados) {
            alert(`Empresa cadastrada com sucesso! Código: ${dados.codigoEmpresa || dados.id}`);
            window.location.href = "index.html";
        })
        .catch(function (erro) {
            alert(erro.message);
        });
});