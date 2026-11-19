var adminModel = require("../models/adminModel");

function buscarDadosBanco(req, res) {

    adminModel.buscarDadosBanco()
        .then(function (resultado) {

            res.status(200).json({
                mensagem: "Quantidade de equipamentos retornada com sucesso",
                dados: resultado
            });

        })
        .catch(function (erro) {
            console.log(erro);

            res.status(500).json({
                mensagem: "Erro ao buscar quantidade de equipamentos"
            });
        });
}

module.exports = {
    buscarDadosBanco
};