var servidorModel = require("../models/servidorModel");

function cadastrar(req, res) {

    var empresa_id = req.body.empresa_id;
    var codigo_agente = req.body.codigo_agente;
    var hostname = req.body.hostname;
    var sistema_operacional = req.body.sistema_operacional;
    var versao_so = req.body.versao_so;
    var arquitetura = req.body.arquitetura;

    if (!empresa_id) {

        res.status(400).send("Empresa é obrigatória!");

    } else if (!codigo_agente || codigo_agente.trim() === "") {

        res.status(400).send("Código do agente é obrigatório!");

    } else if (!hostname || hostname.trim() === "") {

        res.status(400).send("Hostname é obrigatório!");

    } else if (!sistema_operacional || sistema_operacional.trim() === "") {

        res.status(400).send("Sistema operacional é obrigatório!");

    } else if (!versao_so || versao_so.trim() === "") {

        res.status(400).send("Versão do sistema operacional é obrigatória!");

    } else if (!arquitetura || arquitetura.trim() === "") {

        res.status(400).send("Arquitetura é obrigatória!");

    } else {

        servidorModel.cadastrar(empresa_id,codigo_agente,hostname,sistema_operacional,versao_so,arquitetura)
            .then(function (resultadoCadastrar) {
                let servidor = {
                    id: resultadoCadastrar.insertId,
                    empresa_id: empresa_id,
                    codigo_agente: codigo_agente,
                    hostname: hostname,
                    sistema_operacional: sistema_operacional,
                    versao_so: versao_so,
                    arquitetura: arquitetura,
                    ultimo_health_check: null
                };

                console.log(`\nServidor cadastrado: ${JSON.stringify(servidor)}`);
                res.status(201).json(servidor);
            })
            .catch(function (erro) {
                console.log(erro);
                console.log("\nHouve um erro ao cadastrar o servidor! Erro: ", erro.sqlMessage);
                res.status(500).json(erro.sqlMessage);
            });
    }
}

module.exports = {
    cadastrar,
};
