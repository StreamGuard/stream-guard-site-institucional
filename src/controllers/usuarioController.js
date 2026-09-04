var usuarioModel = require("../models/usuarioModel");

function autenticar(req, res) {
    var email = req.body.emailServer;
    var senha = req.body.senhaServer;

    if (!email || email.trim() === "") {
        res.status(400).send("Email é obrigatório!");
    } else if (!senha || senha.trim() === "") {
        res.status(400).send("Senha é obrigatória!");
    } else if (!email.includes("@") || !email.includes(".")) {
        res.status(400).send("Email inválido!");
    } else {
        usuarioModel
            .autenticar(email, senha)
            .then(function (resultadoAutenticar) {
                console.log(
                    `\nResultados encontrados: ${resultadoAutenticar.length}`,
                );
                console.log(
                    `Resultados: ${JSON.stringify(resultadoAutenticar)}`,
                ); // transforma JSON em String

                if (resultadoAutenticar.length == 1) {
                    console.log(resultadoAutenticar);

                    res.json({
                        id: resultadoAutenticar[0].id,
                        email: resultadoAutenticar[0].email,
                        nome: resultadoAutenticar[0].nome,
                        cargo: resultadoAutenticar[0].cargo,
                        empresa_id: resultadoAutenticar[0].empresa_id,
                        nome_empresa: resultadoAutenticar[0].nome_empresa
                    });
                } else if (resultadoAutenticar.length == 0) {
                    res.status(403).send("Email e/ou senha inválido(s)");
                } else {
                    res.status(403).send(
                        "Mais de um usuário com o mesmo login e senha!",
                    );
                }
            })
            .catch(function (erro) {
                console.log(erro);
                console.log(
                    "\nHouve um erro ao realizar o login! Erro: ",
                    erro.sqlMessage,
                );
                res.status(500).json(erro.sqlMessage);
            });
    }
}

module.exports = {
    autenticar,
};
