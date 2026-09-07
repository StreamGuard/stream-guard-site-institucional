var empresaModel = require("../models/empresaModel");

function cadastrar(req, res) {
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
            .then(function (resultadoBusca) {
                if (resultadoBusca.length > 0) {
                    res.status(409).send("CNPJ já cadastrado!");
                } else {
                    empresaModel
                        .cadastrar(razaoSocial, cnpj)
                        .then(function (resultadoCadastro) {
                            res.status(201).json({
                                id: resultadoCadastro.insertId,
                                razaoSocial: razaoSocial,
                                cnpj: cnpj,
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