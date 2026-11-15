var perfilModel = require("../models/perfilModel");

function buscarPerfil(req, res) {
    var idUsuario = Number(req.params.id);

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        return res.status(400).json({
            mensagem: "ID de usuário inválido."
        });
    }

    perfilModel.buscarPerfil(idUsuario)
        .then(resultado => {
            if (resultado.length === 0) {
                return res.status(404).json({
                    mensagem: "Usuário não encontrado."
                });
            }

            var usuario = resultado[0];

            // Nunca enviar o hash da senha para o frontend.
            delete usuario.senha_hash;

            res.status(200).json(usuario);
        })
        .catch(erro => {
            console.error(erro);

            res.status(500).json({
                mensagem: "Erro ao buscar perfil."
            });
        });
}

async function atualizarPerfil(req, res) {
    var idUsuario = Number(req.params.id);

    var nome = req.body.nome;
    var email = req.body.email;
    var cargo = req.body.cargo;

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        return res.status(400).json({
            mensagem: "ID de usuário inválido."
        });
    }

    if (!nome || !email || !cargo) {
        return res.status(400).json({
            mensagem: "Preencha todos os campos."
        });
    }

    try {
        await perfilModel.atualizarDados(
            idUsuario,
            nome.trim(),
            email.trim(),
            cargo.trim()
        );

        res.status(200).json({
            mensagem: "Dados atualizados com sucesso."
        });

    } catch (erro) {
        console.error(erro);

        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensagem: "Este e-mail já está cadastrado."
            });
        }

        res.status(500).json({
            mensagem: "Erro ao atualizar dados."
        });
    }
}



async function alterarSenha(req, res) {
    var idUsuario = Number(req.params.id);
    var senhaAtual = req.body.senhaAtual;
    var senhaNova = req.body.senhaNova;

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        return res.status(400).json({
            mensagem: "ID de usuário inválido."
        });
    }

    if (!senhaAtual || !senhaNova) {
        return res.status(400).json({
            mensagem: "Preencha todos os campos de senha."
        });
    }

    if (senhaNova.length < 8) {
        return res.status(400).json({
            mensagem: "A nova senha precisa ter pelo menos 8 caracteres."
        });
    }

    if (senhaAtual === senhaNova) {
        return res.status(400).json({
            mensagem: "A nova senha precisa ser diferente da atual."
        });
    }

    try {
        var resultado = await perfilModel.alterarSenha(
            idUsuario,
            senhaAtual,
            senhaNova
        );

        if (resultado.affectedRows === 0) {
            return res.status(400).json({
                mensagem: "Senha atual incorreta."
            });
        }

        return res.status(200).json({
            mensagem: "Senha alterada com sucesso!"
        });

    } catch (erro) {
        console.error("Erro ao alterar senha:", erro);

        return res.status(500).json({
            mensagem: "Erro ao alterar senha."
        });
    }
}


module.exports = {
    buscarPerfil,
    atualizarPerfil,
    alterarSenha
};