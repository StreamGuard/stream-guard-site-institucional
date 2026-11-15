var configModel = require("../models/configModel");

var PERMISSOES_VALIDAS = [1, 2, 3, 4];
var TIPOS_COMPONENTE = ["CPU", "RAM", "Armazenamento", "Rede"];

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

function intervaloValido(valor) {
    var numero = Number(valor);
    return Number.isInteger(numero) && numero > 0;
}

// ---------- Funcionários ----------

function listarFuncionarios(req, res) {
    var idEmpresa = Number(req.params.idEmpresa);
    if (!idValido(idEmpresa)) return res.status(400).json({ mensagem: "Empresa inválida." });

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
            if (resultado.length === 0) return res.status(404).json({ mensagem: "Funcionário não encontrado." });
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
        if (erro.code === "ER_DUP_ENTRY") return res.status(409).json({ mensagem: "Este e-mail já está cadastrado." });
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

    // se o front não mandar "ativo", mantém o valor que já está no banco (antes virava 0)
    var ativo = req.body.ativo === undefined || req.body.ativo === null
        ? null
        : (req.body.ativo ? 1 : 0);

    if (!idValido(idUsuario) || !idValido(idEmpresa) || !nome || !email || !idValido(idPermissao)) {
        return res.status(400).json({ mensagem: "Preencha os campos obrigatórios." });
    }

    try {
        if (!(await perfilPermitido(idEmpresa, idPermissao))) {
            return res.status(400).json({ mensagem: "Perfil inválido para esta empresa." });
        }
        var resultado = await configModel.editarFuncionario(idUsuario, idEmpresa, nome, email, idPermissao, ativo, cargo);
        if (resultado.affectedRows === 0) return res.status(404).json({ mensagem: "Funcionário não encontrado." });
        res.status(200).json({ mensagem: "Funcionário atualizado com sucesso." });
    } catch (erro) {
        console.error("Erro ao editar funcionário:", erro);
        if (erro.code === "ER_DUP_ENTRY") return res.status(409).json({ mensagem: "Este e-mail já está cadastrado." });
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
        if (resultado.affectedRows === 0) return res.status(404).json({ mensagem: "Funcionário não encontrado." });
        res.status(200).json({ mensagem: "Funcionário removido com sucesso." });
    } catch (erro) {
        console.error("Erro ao excluir funcionário:", erro);
        res.status(500).json({ mensagem: "Erro ao excluir funcionário." });
    }
}

// ---------- Métricas ----------

async function listarMetricas(req, res) {
    var idEmpresa = Number(req.params.idEmpresa);
    if (!idValido(idEmpresa)) return res.status(400).json({ mensagem: "Empresa inválida." });

    try {
        var resultado = await configModel.listarMetricas(idEmpresa);
        res.status(200).json(resultado);
    } catch (erro) {
        console.error("Erro ao listar métricas:", erro);
        res.status(500).json({ mensagem: "Erro ao listar métricas." });
    }
}

async function cadastrarMetrica(req, res) {
    var idEmpresa = Number(req.body.idEmpresa);
    var nome = String(req.body.nome || "").trim();
    var unidade = String(req.body.unidade || "").trim();
    var intervalo = Number(req.body.intervalo || 15);
    var ativa = req.body.ativa ? 1 : 0;
    var tipoComponente = String(req.body.tipoComponente || "CPU").trim();
    var limiteMaximo = req.body.limiteMaximo;
    var limiteMinimo = req.body.limiteMinimo;

    if (!idValido(idEmpresa) || !nome || !unidade) {
        return res.status(400).json({ mensagem: "Preencha os campos obrigatórios da métrica." });
    }
    if (!intervaloValido(intervalo)) {
        return res.status(400).json({ mensagem: "Intervalo de coleta inválido." });
    }
    if (TIPOS_COMPONENTE.indexOf(tipoComponente) === -1) {
        return res.status(400).json({ mensagem: "Tipo de componente inválido." });
    }

    try {
        await configModel.cadastrarMetrica(idEmpresa, nome, unidade, intervalo, ativa, tipoComponente, limiteMaximo, limiteMinimo);
        res.status(201).json({ mensagem: "Métrica cadastrada com sucesso." });
    } catch (erro) {
        console.error("Erro ao cadastrar métrica:", erro);
        res.status(500).json({ mensagem: "Erro ao cadastrar métrica." });
    }
}

async function editarMetrica(req, res) {
    var idMetrica = Number(req.params.idMetrica);
    var idEquipamentoComponente = req.body.idEquipamentoComponente ? Number(req.body.idEquipamentoComponente) : null;
    var nome = String(req.body.nome || "").trim();
    var unidade = String(req.body.unidade || "").trim();
    var intervalo = Number(req.body.intervalo || 15);
    var ativa = req.body.ativa ? 1 : 0;
    var tipoComponente = String(req.body.tipoComponente || "").trim();

    if (!idValido(idMetrica) || !nome || !unidade) {
        return res.status(400).json({ mensagem: "Dados obrigatórios não informados." });
    }
    if (!intervaloValido(intervalo)) {
        return res.status(400).json({ mensagem: "Intervalo de coleta inválido." });
    }
    if (tipoComponente && TIPOS_COMPONENTE.indexOf(tipoComponente) === -1) {
        return res.status(400).json({ mensagem: "Tipo de componente inválido." });
    }

    try {
        var resultado = await configModel.editarMetrica(idMetrica, nome, unidade, intervalo, ativa, tipoComponente, idEquipamentoComponente);
        if (!resultado) return res.status(404).json({ mensagem: "Métrica não encontrada." });
        res.status(200).json({ mensagem: "Métrica atualizada com sucesso." });
    } catch (erro) {
        console.error("Erro ao editar métrica:", erro);
        res.status(500).json({ mensagem: "Erro ao editar métrica." });
    }
}

async function excluirMetrica(req, res) {
    var idMetrica = Number(req.params.idMetrica);
    var idEquipamentoComponente = req.body && req.body.idEquipamentoComponente ? Number(req.body.idEquipamentoComponente) : null;

    if (!idValido(idMetrica)) {
        return res.status(400).json({ mensagem: "ID da métrica inválido." });
    }

    try {
        await configModel.excluirMetrica(idMetrica, idEquipamentoComponente);
        res.status(200).json({ mensagem: "Métrica removida com sucesso." });
    } catch (erro) {
        console.error("Erro ao excluir métrica:", erro);
        res.status(500).json({ mensagem: "Erro ao excluir métrica." });
    }
}

async function salvarTodasMetricas(req, res) {
    var metricasLista = req.body.metricas;
    if (!Array.isArray(metricasLista)) {
        return res.status(400).json({ mensagem: "Lista de métricas inválida." });
    }

    var invalida = metricasLista.some(function (m) {
        return !idValido(m.id) || !intervaloValido(m.intervalo);
    });
    if (invalida) {
        return res.status(400).json({ mensagem: "Há métricas com dados inválidos." });
    }

    try {
        await configModel.salvarTodasMetricas(metricasLista);
        res.status(200).json({ mensagem: "Configurações de métricas salvas com sucesso." });
    } catch (erro) {
        console.error("Erro ao salvar métricas:", erro);
        res.status(500).json({ mensagem: "Erro ao salvar métricas." });
    }
}

module.exports = {
    listarFuncionarios,
    buscarFuncionario,
    cadastrarFuncionario,
    editarFuncionario,
    excluirFuncionario,
    listarMetricas,
    cadastrarMetrica,
    editarMetrica,
    excluirMetrica,
    salvarTodasMetricas
};
