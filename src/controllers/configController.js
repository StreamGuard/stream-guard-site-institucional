var configModel = require("../models/configModel");

// IDs da tabela permissao (inserts fixos): 1 Root, 2 Admin, 3 Gerente, 4 User.
// Admin, Gerente e User valem em qualquer empresa. Root é a visão da StreamGuard e só pode
// ser dado dentro da empresa StreamGuard (a que já tem usuários Root).
var PERMISSOES_VALIDAS = [1, 2, 3, 4];

async function perfilPermitido(idEmpresa, idPermissao) {
    if (PERMISSOES_VALIDAS.indexOf(idPermissao) === -1) return false;
    if (idPermissao !== 1) return true;

    var resultado = await configModel.empresaTemRoot(idEmpresa);
    return Number(resultado[0].total) > 0;
}

function idValido(valor) {
    var numero = Number(valor);
    return Number.isInteger(numero) && numero > 0;
}

function listarFuncionarios(req, res) {
    var idEmpresa = Number(req.params.idEmpresa);

    if (!idValido(idEmpresa)) {
        return res.status(400).json({ mensagem: "Empresa inválida." });
    }

    configModel.listarFuncionarios(idEmpresa)
        .then(function (resultado) {
            res.status(200).json(resultado);
        })
        .catch(function (erro) {
            console.error("Erro ao listar funcionários:", erro);
            res.status(500).json({ mensagem: "Erro ao listar funcionários." });
        });
}

function buscarFuncionario(req, res) {
    var idUsuario = Number(req.params.idUsuario);
    var idEmpresa = Number(req.query.idEmpresa);

    if (!idValido(idUsuario) || !idValido(idEmpresa)) {
        return res.status(400).json({ mensagem: "Dados obrigatórios não informados." });
    }

    configModel.buscarFuncionario(idUsuario, idEmpresa)
        .then(function (resultado) {
            if (resultado.length === 0) {
                return res.status(404).json({ mensagem: "Funcionário não encontrado." });
            }
            res.status(200).json(resultado[0]);
        })
        .catch(function (erro) {
            console.error("Erro ao buscar funcionário:", erro);
            res.status(500).json({ mensagem: "Erro ao buscar funcionário." });
        });
}

async function cadastrarFuncionario(req, res) {
    var idEmpresa = Number(req.body.idEmpresa);
    var idPermissao = Number(req.body.idPermissao);
    var nome = String(req.body.nome || "").trim();
    var email = String(req.body.email || "").trim();
    var senha = String(req.body.senha || "");
    var cargo = String(req.body.cargo || "").trim();

    if (!idValido(idEmpresa) || !nome || !email || !senha || !idValido(idPermissao)) {
        return res.status(400).json({ mensagem: "Preencha os campos obrigatórios." });
    }

    if (senha.length < 8) {
        return res.status(400).json({ mensagem: "A senha precisa ter pelo menos 8 caracteres." });
    }

    try {
        if (!(await perfilPermitido(idEmpresa, idPermissao))) {
            return res.status(400).json({ mensagem: "Perfil inválido para esta empresa." });
        }

        await configModel.cadastrarFuncionario(idEmpresa, nome, email, senha, idPermissao, cargo);
        res.status(201).json({ mensagem: "Funcionário cadastrado com sucesso." });
    } catch (erro) {
        console.error("Erro ao cadastrar funcionário:", erro);

        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ mensagem: "Este e-mail já está cadastrado." });
        }
        res.status(500).json({ mensagem: "Erro ao cadastrar funcionário." });
    }
}

async function editarFuncionario(req, res) {
    var idUsuario = Number(req.params.idUsuario);
    var idEmpresa = Number(req.body.idEmpresa);
    var idPermissao = Number(req.body.idPermissao);
    var nome = String(req.body.nome || "").trim();
    var email = String(req.body.email || "").trim();
    var cargo = String(req.body.cargo || "").trim();
    var ativo = req.body.ativo ? 1 : 0;

    if (!idValido(idUsuario) || !idValido(idEmpresa) || !nome || !email || !idValido(idPermissao)) {
        return res.status(400).json({ mensagem: "Preencha os campos obrigatórios." });
    }

    try {
        if (!(await perfilPermitido(idEmpresa, idPermissao))) {
            return res.status(400).json({ mensagem: "Perfil inválido para esta empresa." });
        }

        var resultado = await configModel.editarFuncionario(idUsuario, idEmpresa, nome, email, idPermissao, ativo, cargo);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensagem: "Funcionário não encontrado." });
        }
        res.status(200).json({ mensagem: "Funcionário atualizado com sucesso." });
    } catch (erro) {
        console.error("Erro ao editar funcionário:", erro);

        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ mensagem: "Este e-mail já está cadastrado." });
        }
        res.status(500).json({ mensagem: "Erro ao editar funcionário." });
    }
}

async function excluirFuncionario(req, res) {
    var idUsuario = Number(req.params.idUsuario);
    var idEmpresa = Number(req.body.idEmpresa);

    if (!idValido(idUsuario) || !idValido(idEmpresa)) {
        return res.status(400).json({ mensagem: "Dados obrigatórios não informados." });
    }

    try {
        var resultado = await configModel.excluirFuncionario(idUsuario, idEmpresa);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensagem: "Funcionário não encontrado." });
        }
        res.status(200).json({ mensagem: "Funcionário removido com sucesso." });
    } catch (erro) {
        console.error("Erro ao excluir funcionário:", erro);
        res.status(500).json({ mensagem: "Erro ao excluir funcionário." });
    }
}

module.exports = {
    listarFuncionarios,
    buscarFuncionario,
    cadastrarFuncionario,
    editarFuncionario,
    excluirFuncionario
};
