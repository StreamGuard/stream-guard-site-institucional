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

    while (codigoExiste) {
        codigoEmpresa = gerarCodigoEmpresa();
        let resultadoBusca = await empresaModel.buscarPorCodigoEmpresa(codigoEmpresa);
        if (resultadoBusca.length === 0) {
            codigoExiste = false;
        }
    }

    return codigoEmpresa;
}

async function cadastrar(req, res) {
    var razaoSocial = req.body.razaoSocial;
    var cnpj = req.body.cnpj;

    if (!razaoSocial || razaoSocial.trim() === "") {
        res.status(400).send("Razão social é obrigatória!");
    } else if (!cnpj || cnpj.trim() === "") {
        res.status(400).send("CNPJ é obrigatório!");
    } else if (cnpj.length !== 14) {
        res.status(400).send("CNPJ inválido!");
    } else {
        empresaModel
            .buscarPorCnpj(cnpj)
            .then(async function (resultadoBusca) {
                if (resultadoBusca.length > 0) {
                    res.status(409).send("CNPJ já cadastrado!");
                } else {
                    var codigoEmpresa = await obterCodigoUnico();

                    empresaModel
                        .cadastrar(razaoSocial, cnpj, codigoEmpresa)
                        .then(function (resultadoCadastro) {
                            res.status(201).json({
                                id: resultadoCadastro.insertId,
                                razaoSocial: razaoSocial,
                                cnpj: cnpj,
                                codigoEmpresa: codigoEmpresa
                            });
                        })
                        .catch(function (erro) {
                            console.log(erro);
                            res.status(500).json(erro.sqlMessage);
                        });
                }
            })
            .catch(function (erro) {
                console.log(erro);
                res.status(500).json(erro.sqlMessage);
            });
    }
}

module.exports = {
    cadastrar,
};
