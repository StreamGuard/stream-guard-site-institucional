const form = document.getElementById("formCadastroEmpresa");
const cnpjInput = document.getElementById("cnpjEmpresa");
const codigoValor = document.getElementById("codigoValor");
const codigoHint = document.getElementById("codigoHint");
const btnCadastrar = document.getElementById("btnCadastrar");

// máscara do CNPJ: 00.000.000/0000-00
cnpjInput.addEventListener("input", function () {
  let v = this.value.replace(/\D/g, "").slice(0, 14);

  if (v.length > 12) {
    v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, "$1.$2.$3/$4-$5");
  } else if (v.length > 8) {
    v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4");
  } else if (v.length > 5) {
    v = v.replace(/^(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
  } else if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d{0,3})/, "$1.$2");
  }

  this.value = v;
});

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const nome = document.getElementById("nomeEmpresa").value.trim();
  const cnpj = cnpjInput.value.replace(/\D/g, "");

  btnCadastrar.disabled = true;
  btnCadastrar.textContent = "Cadastrando...";

  try {
    const resposta = await fetch("/empresas/cadastrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ razaoSocial: nome, cnpj }),
    });

    if (!resposta.ok) throw new Error(await resposta.text());

    const dados = await resposta.json();
    codigoValor.textContent = dados.codigoEmpresa || dados.id;
    codigoHint.textContent = "Empresa cadastrada com sucesso. Copie o código e envie para o cliente.";
    form.reset();
  } catch (erro) {
    codigoValor.textContent = "—";
    codigoHint.textContent = "Não foi possível cadastrar a empresa. Tente novamente.";
  } finally {
    btnCadastrar.disabled = false;
    btnCadastrar.textContent = "Cadastrar empresa";
  }
});

document.getElementById("btnCopiarCodigo").addEventListener("click", function () {
  const texto = codigoValor.textContent.trim();
  if (!texto || texto === "—") return;
  navigator.clipboard.writeText(texto);
  this.textContent = "Copiado!";
  setTimeout(() => (this.textContent = "Copiar"), 1500);
});