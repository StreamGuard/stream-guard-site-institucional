var dashboard_analista_geralModel = require("../models/dashboard_analista_geralModel");

async function buscar(req,res){
    try{
    var metricas = await dashboard_analista_geralModel.buscarMetricas();
    var processos = await dashboard_analista_geralModel.buscaProcessos();

    return res.status(200).json({
        metricas: metricas,
        processos: processos
    
    });
}catch(erro){
    console.error("Erro ao ler os CSVs:", erro.message);

    return res.status(500).json({
erro: "Não foi possível carregar os dados da dashboard."
    });
    }

}

module.exports ={
    buscar
};