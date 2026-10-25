var empresaModel = require("../models/empresaModel");

function gerarCodigoEmpresa() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let resultado = '';

    for (let i = 0; i < 8; i++) {
        const indiceAleatorio = Math.floor(Math.random() * caracteres.length);
        resultado += caracteres.charAt(indiceAleatorio);
    }

    return resultado;
}

async function obterCodigoUnico() {
    let codigoEmpresa;
    let codigoExiste = true;

    for (let tentativa = 0; tentativa < 10 && codigoExiste; tentativa++) {
        codigoEmpresa = gerarCodigoEmpresa();
        let resultadoBusca = await empresaModel.buscarPorCodigoEmpresa(codigoEmpresa);
        if (resultadoBusca.length === 0) {
            codigoExiste = false;
        }
    }

    if (codigoExiste) throw new Error("Não foi possível gerar um código de empresa.");
    return codigoEmpresa;
}

function verificarCodigoEmpresa(req, res) {
    var idEmpresa = req.params.idEmpresa;
    if (typeof idEmpresa !== "string" || !/^[A-Z0-9]{8}$/.test(idEmpresa)) {
        return res.status(400).json(false);
    }

    empresaModel.buscarPorCodigoEmpresa(idEmpresa)
        .then(function (resultado) {
            // Se o banco retornar registros, a empresa existe
            if (resultado && resultado.length > 0) {
                res.status(200).json(true);
            } else {
                res.status(200).json(false);
            }
        })
        .catch(function (erro) {
            console.error("Erro ao verificar código da empresa:", erro.code || "ERRO_INTERNO");
            res.status(500).json({ mensagem: "Erro no servidor" });
        });
}


async function cadastrar(req, res) {
    var razaoSocial = req.body.razaoSocial;
    var cnpj = req.body.cnpj;

    if (typeof razaoSocial !== "string" || !razaoSocial.trim() || razaoSocial.length > 100 ||
        typeof cnpj !== "string" || !/^\d{14}$/.test(cnpj)) {
        return res.status(400).json({ erro: "Razão social ou CNPJ inválidos." });
    }
    try {
        if ((await empresaModel.buscarPorCnpj(cnpj)).length) {
            return res.status(409).send("CNPJ já cadastrado!");
        }
        var codigoEmpresa = await obterCodigoUnico();
        var resultado = await empresaModel.cadastrar(razaoSocial.trim(), cnpj, codigoEmpresa);
        return res.status(201).json({
            id: resultado.insertId,
            razaoSocial: razaoSocial.trim(),
            cnpj: cnpj,
            codigoEmpresa: codigoEmpresa
        });
    } catch (erro) {
        console.error("Erro ao cadastrar empresa:", erro.code || "ERRO_INTERNO");
        return res.status(erro.code === "ER_DUP_ENTRY" ? 409 : 500).json({
            erro: erro.code === "ER_DUP_ENTRY" ? "Cadastro já existente; tente novamente." : "Não foi possível cadastrar a empresa."
        });
    }
}

module.exports = {
    cadastrar,
    verificarCodigoEmpresa
};
