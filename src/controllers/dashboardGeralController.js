var dashboardGeralModel = require("../models/dashboardGeralModel");

function erroHttp(status, mensagem) {
    var erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

function buscar(req, res) {
    // Localiza a empresa do usuário; contas root podem informar uma empresa diferente na consulta.
    // O ID vem do navegador e é usado somente para a prévia local, não como autenticação.
    var idUsuario = Number(req.query.usuarioId);
    if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
        return res.status(400).json({ mensagem: "ID de usuário inválido." });
    }

    return dashboardGeralModel.buscarEmpresaDoUsuario(idUsuario)
        .then(function (usuarios) {
            var vinculoUsuario = usuarios[0];
            if (!vinculoUsuario) {
                throw erroHttp(404, "Usuário ativo não encontrado no banco.");
            }

            var root = String(vinculoUsuario.permissao).toLowerCase() === "root" ||
                String(vinculoUsuario.email).toLowerCase().includes("@streamguard.com");

            if (!root) return vinculoUsuario;

            var idEmpresa = Number(req.query.empresaId);
            if (!Number.isSafeInteger(idEmpresa) || idEmpresa <= 0) {
                throw erroHttp(400, "Selecione uma empresa para consultar a dashboard.");
            }

            return dashboardGeralModel.buscarEmpresaPorId(idEmpresa)
                .then(function (empresas) {
                    var empresa = empresas[0];
                    if (!empresa) {
                        throw erroHttp(404, "Empresa vinculada à conta não foi encontrada.");
                    }
                    return empresa;
                });
        })
        .then(function (empresa) {
            return dashboardGeralModel.buscarServidoresDaEmpresa(empresa.id_empresa)
                .then(function (linhasBanco) {
                    var servidores = dashboardGeralModel.prepararServidores(linhasBanco);
                    return dashboardGeralModel.buscarMetricasGold(empresa.id_empresa)
                        .then(function (dadosGold) {
                            var empresaResposta = {
                                id: Number(empresa.id_empresa),
                                nome: empresa.razao_social
                            };
                            return res.status(200).json(dashboardGeralModel.montarResposta(
                                empresaResposta,
                                servidores,
                                dadosGold
                            ));
                        });
                });
        })
        .catch(function (erro) {
            if (erro.status) {
                return res.status(erro.status).json({ mensagem: erro.message });
            }

            console.error("Erro ao montar a dashboard geral:", erro.message);
            return res.status(503).json({ mensagem: "Não foi possível carregar os dados da empresa e das medições." });
        });
}

module.exports = { buscar };
