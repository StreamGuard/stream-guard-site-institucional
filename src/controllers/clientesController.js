var clientesModel = require("../models/clientesModel");

function buscarDadosBanco(req, res) {
    var idEmpresa = req.params.idEmpresa;   

    clientesModel.buscarDadosBanco(idEmpresa)
        .then(function (resultado) {
            res.status(200).json({ mensagem: "Dados retornados com sucesso", dados: resultado });
        })
        .catch(function (erro) {
            res.status(500).json({ erro: "Erro ao encontrar dados", detalhes: erro });
        });
}

module.exports = {
    buscarDadosBanco
};
