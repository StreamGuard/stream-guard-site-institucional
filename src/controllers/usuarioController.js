var usuarioModel = require("../models/usuarioModel");
var perfilModel = require("../models/perfilModel");

function autenticar(req, res) {
    var email = req.body.emailServer;
    var senha = req.body.senhaServer;

    if (!email || email.trim() === "") {
        return res.status(400).send("Email é obrigatório!");

    } else if (!senha || senha.trim() === "") {
        return res.status(400).send("Senha é obrigatória!");

    } else if (!email.includes("@") || !email.includes(".")) {
        return res.status(400).send("Email inválido!");

    } else {
        usuarioModel
            .autenticar(email, senha)
            .then(async function (resultadoAutenticar) {

                console.log(`\nResultados encontrados: ${resultadoAutenticar.length}`);

                if (resultadoAutenticar.length === 1) {

                    var usuario = resultadoAutenticar[0];

                    // Atualiza a data e hora do último acesso no banco
                    await perfilModel.atualizarUltimoAcesso(usuario.id);

                    if (usuario.email.includes("@streamguard.com")) {

                        return res.json({
                            id: usuario.id,
                            email: usuario.email,
                            nome: usuario.nome,
                            cargo: usuario.cargo,
                            permissao: usuario.permissao
                        });

                    } else {

                        return res.json({
                            id: usuario.id,
                            email: usuario.email,
                            nome: usuario.nome,
                            cargo: usuario.cargo,
                            permissao: usuario.permissao,
                            empresa_id: usuario.empresa_id,
                            nome_empresa: usuario.nome_empresa
                        });
                    }

                } else if (resultadoAutenticar.length === 0) {

                    return res.status(403).send("Email e/ou senha inválido(s)");

                } else {

                    return res.status(403).send("Mais de um usuário com o mesmo login e senha!");
                }

            })
            .catch(function (erro) {

                console.log("Erro ao realizar login:", erro);

                res.status(500).send("Erro ao realizar login.");
            });
    }
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
};
