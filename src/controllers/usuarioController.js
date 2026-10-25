var usuarioModel = require("../models/usuarioModel");
var sessao = require("../middleware/sessao");

async function autenticar(req, res) {
  var email = req.body.emailServer;
  var senha = req.body.senhaServer;

  try {
    if (typeof email !== "string" || email.trim() === "") {
      return res.status(400).send("Email é obrigatório!");
    } else if (typeof senha !== "string" || senha === "") {
      return res.status(400).send("Senha é obrigatória!");
    } else if (!email.includes("@") || !email.includes(".")) {
      return res.status(400).send("Email inválido!");
    }

    var resultadoAutenticar = await usuarioModel.autenticar(email, senha);
    if (resultadoAutenticar.length !== 1) {
      if (req.session) {
        await new Promise((resolve, reject) => req.session.destroy(erro => erro ? reject(erro) : resolve()));
      }
      return res.status(403).send("Email e/ou senha inválido(s)");
    }

    await sessao.iniciarSessao(req, resultadoAutenticar[0].id);
    res.set("Cache-Control", "no-store");
    if (resultadoAutenticar[0].email.includes("@streamguard.com")) {
      return res.json({
        id: resultadoAutenticar[0].id,
        email: resultadoAutenticar[0].email,
        nome: resultadoAutenticar[0].nome,
        cargo: resultadoAutenticar[0].cargo,
        permissao: resultadoAutenticar[0].permissao,
      });
    } else {
      return res.json({
        id: resultadoAutenticar[0].id,
        email: resultadoAutenticar[0].email,
        nome: resultadoAutenticar[0].nome,
        cargo: resultadoAutenticar[0].cargo,
        permissao: resultadoAutenticar[0].permissao,
        empresa_id: resultadoAutenticar[0].empresa_id,
        nome_empresa: resultadoAutenticar[0].nome_empresa,
      });
    }
  } catch (erro) {
    if (req.session) {
      const seguro = req.session.cookie.secure;
      req.session.destroy(function () {});
      res.clearCookie("streamguard.sid", { path: "/", httpOnly: true, sameSite: "lax", secure: seguro });
    }
    console.error("Erro ao realizar login:", erro.code || "ERRO_INTERNO");
    return res.status(500).json({ erro: "Não foi possível realizar o login." });
  }
}

function sair(req, res) {
  if (!req.session) return res.status(204).end();
  const seguro = req.session.cookie.secure;
  req.session.destroy(function (erro) {
    if (erro) return res.status(500).json({ erro: "Não foi possível encerrar a sessão." });
    res.clearCookie("streamguard.sid", { path: "/", httpOnly: true, sameSite: "lax", secure: seguro });
    res.status(204).end();
  });
}

function cadastrar(req, res) {
  var id_empresa = req.body.idEmpresaServer;
  var nome = req.body.nomeServer;
  var cargo = req.body.cargoServer;
  var email = req.body.emailServer;
  var senha = req.body.senhaServer;

  if (id_empresa.trim() === "") {
    res.status(400).send("Id de empresa é obrigatório!");
  } else if (nome.trim() === "") {
    res.status(400).send("Nome é obrigatório!");
  } else if (cargo.trim() === "") {
    res.status(400).send("Cargo é obrigatório!");
  } else if (!email || email.trim() === "") {
    res.status(400).send("Email é obrigatório!");
  } else if (!senha || senha.trim() === "") {
    res.status(400).send("Senha é obrigatória!");
  } else if (!email.includes("@") || !email.includes(".")) {
    res.status(400).send("Email inválido!");
  } else {
    usuarioModel
      .cadastrar(id_empresa, nome, cargo, email, senha)
      .then(function (resultadoCadastrar) {
        console.log(`\nResultados encontrados: ${resultadoCadastrar.length}`);
        console.log(`Resultados: ${JSON.stringify(resultadoCadastrar)}`);
        res.status(201).send(resultadoCadastrar);
      });
  }
}

module.exports = {
  autenticar,
  cadastrar,
  sair,
};
