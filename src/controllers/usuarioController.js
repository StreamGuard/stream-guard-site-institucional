var usuarioModel = require("../models/usuarioModel");
var sessao = require("../middleware/sessao");

async function autenticar(req, res) {
  var email = req.body.emailServer;
  var senha = req.body.senhaServer;

  try {
    if (typeof email !== "string" || email.trim() === "" || email.length > 100) {
      return res.status(400).send("Email é obrigatório!");
    } else if (typeof senha !== "string" || senha === "" || senha.length > 1024) {
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
    res.set("X-CSRF-Token", req.session.csrf);
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

async function cadastrar(req, res) {
  var id_empresa = req.body.idEmpresaServer;
  var nome = req.body.nomeServer;
  var cargo = req.body.cargoServer;
  var email = req.body.emailServer;
  var senha = req.body.senhaServer;

  if (typeof id_empresa !== "string" || !/^[A-Z0-9]{8}$/.test(id_empresa) ||
      typeof nome !== "string" || !nome.trim() || nome.length > 100 ||
      typeof cargo !== "string" || !cargo.trim() || cargo.length > 50 ||
      typeof email !== "string" || email.length > 100 || !email.includes("@") || !email.includes(".") ||
      typeof senha !== "string" || !senha || senha.length > 1024) {
    return res.status(400).json({ erro: "Dados de cadastro inválidos." });
  }
  try {
    const resultado = await usuarioModel.cadastrar(id_empresa, nome.trim(), cargo.trim(), email.trim(), senha);
    if (!resultado.affectedRows) return res.status(400).json({ erro: "Código de empresa inválido." });
    return res.status(201).send(resultado);
  } catch (erro) {
    console.error("Erro ao cadastrar usuário:", erro.code || "ERRO_INTERNO");
    return res.status(erro.code === "ER_DUP_ENTRY" ? 409 : 500).json({
      erro: erro.code === "ER_DUP_ENTRY" ? "Usuário já cadastrado." : "Não foi possível cadastrar o usuário."
    });
  }
}

module.exports = {
  autenticar,
  cadastrar,
  sair,
};
