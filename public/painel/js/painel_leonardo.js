
// procuro o canvas no meu html
const historico = document.getElementById("graficoHistorico");
const canvasTrafegoRede = document.getElementById("graficoTrafegoRede");
const canvasRankingRam = document.getElementById("graficoRamServidores");
const canvasHistogramaRam = document.getElementById("graficoHistogramaRam");
const buscaRam = document.getElementById("filtroServidorRam");
const filtroServidor = document.getElementById("filtroServidor");
const horarioUltimaMedicao = document.getElementById("horarioUltimaMedicao");

function atualizarHorarioUltimaMedicao(metricas) {
    let ultimoHorario = null;

    for (let i = 0; i < metricas.length; i++) {
        const horario = new Date(
            String(metricas[i].inicio_periodo).replace(" ", "T")
        ).getTime();

        if (Number.isFinite(horario) && (ultimoHorario === null || horario > ultimoHorario)) {
            ultimoHorario = horario;
        }
    }

    if (ultimoHorario === null) {
        horarioUltimaMedicao.textContent = "Sem horário válido";
        horarioUltimaMedicao.removeAttribute("datetime");
        return;
    }

    const data = new Date(ultimoHorario);

    horarioUltimaMedicao.dateTime = data.toISOString();
    horarioUltimaMedicao.textContent = data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}


if (canvasRankingRam && canvasHistogramaRam && buscaRam && canvasTrafegoRede) {
    const periodos = {
        "30m": { minutos: 30, texto: "Últimos 30 minutos" },
        "1h": { minutos: 60, texto: "Última hora" },
        "24h": { minutos: 1440, texto: "Últimas 24 horas" }
    };

    function filtrarMetricasPorPeriodo(metricas, periodo) {
        var minutos = periodos[periodo].minutos;
        var ultimoHorario = 0;

        // Uso a data mais recente dos próprios dados como referência.
        // Assim o teste funciona mesmo com CSVs históricos.
        for (var i = 0; i < metricas.length; i++) {
            var horario = new Date(
                String(metricas[i].inicio_periodo).replace(" ", "T")
            ).getTime();

            if (Number.isFinite(horario) && horario > ultimoHorario) {
                ultimoHorario = horario;
            }
        }

        if (ultimoHorario === 0) {
            return [];
        }

        var primeiroHorario = ultimoHorario - minutos * 60 * 1000;

        return metricas.filter(function (linha) {
            var horario = new Date(
                String(linha.inicio_periodo).replace(" ", "T")
            ).getTime();

            return horario >= primeiroHorario && horario <= ultimoHorario;
        });
    }



    const graficoHistorico = new Chart(historico, {
        type: "line",
        data: {
            labels: [],
            datasets: [
                { label: "CPU (%)", data: [], borderColor: "#4f8cff", yAxisID: "y" },
                { label: "RAM (%)", data: [], borderColor: "#8b5cf6", yAxisID: "y" },
                { label: "Disco (%)", data: [], borderColor: "#2de2c0", yAxisID: "y" },

                {
                    label: "Limite 80%",
                    data: [],
                    borderColor: "#ff4d6d",
                    borderDash: [4, 4],
                    pointRadius: 0,
                    yAxisID: "y"
                }
            ]
        },
        options: {
            responsive: true,
            //permito que a altura seja controlada pelo CSS.
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index"
            },
            plugins: {
                legend: {
                    position: "bottom"
                }
            },
            scales: {
                x: {
                    grid: {
                        color: "rgba(204, 204, 204, 0.15)"
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    ticks: {
                        callback: valor => `${valor}%`
                    },
                    grid: {
                        color: "rgba(136, 136, 168, 0.15)"
                    }
                }
            }
        }
    });


    function atualizarGraficoHistorico(metricas, idSelecionado) {
        // Define quais tipos de métricas entram neste gráfico.
        var tipos = [
            { tipo: "USO_CPU", nome: "CPU", cor: "#4f8cff" },
            { tipo: "USO_RAM", nome: "RAM", cor: "#8b5cf6" },
            { tipo: "USO_DISCO", nome: "Disco", cor: "#2de2c0" }
        ];

        // Guardam os servidores, horários e valores que serão usados no gráfico.
        var servidoresDoGrafico = [];
        var horarios = [];
        var valoresPorChave = {};

        // Percorre as métricas recebidas do CSV.
        for (var i = 0; i < metricas.length; i++) {
            var linha = metricas[i];

            // Se há servidor selecionado, ignora as métricas dos outros.
            // ID vazio significa “Todos”.
            if (
                idSelecionado !== "" &&
                String(linha.servidor_id) !== idSelecionado
            ) {
                continue;
            }

            // Confere se a métrica é CPU, RAM ou disco.
            var tipoValido = false;

            for (var j = 0; j < tipos.length; j++) {
                if (linha.tipo === tipos[j].tipo) {
                    tipoValido = true;
                    break;
                }
            }

            // Ignora métricas que não são exibidas neste gráfico.
            if (!tipoValido) {
                continue;
            }

            var id = String(linha.servidor_id);
            var servidorEncontrado = false;

            // Guarda cada servidor uma única vez, junto com seu nome.
            for (var j = 0; j < servidoresDoGrafico.length; j++) {
                if (servidoresDoGrafico[j].id === id) {
                    servidorEncontrado = true;
                    break;
                }
            }

            if (!servidorEncontrado) {
                servidoresDoGrafico.push({
                    id: id,
                    nome: linha.nome_servidor || "Servidor " + id
                });
            }

            // Guarda cada horário uma única vez.
            if (horarios.indexOf(linha.inicio_periodo) === -1) {
                horarios.push(linha.inicio_periodo);
            }

            // Indexa o valor pelo servidor, tipo de métrica e horário.
            var chave = id + "|" + linha.tipo + "|" + linha.inicio_periodo;
            var valor = Number(linha.media_amostral);

            if (Number.isFinite(valor)) {
                valoresPorChave[chave] = valor;
            }
        }

        // Organiza os horários do mais antigo para o mais recente.
        horarios.sort();

        // Formata os horários para aparecerem no eixo horizontal.
        var labels = [];

        for (var i = 0; i < horarios.length; i++) {
            var horario = horarios[i];

            labels.push(
                horario.substring(8, 10) + "/" +
                horario.substring(5, 7) + " " +
                horario.substring(11, 16)
            );
        }

        var datasets = [];

        // Cria três linhas para cada servidor: CPU, RAM e disco.
        for (var i = 0; i < servidoresDoGrafico.length; i++) {
            var servidor = servidoresDoGrafico[i];

            for (var j = 0; j < tipos.length; j++) {
                var tipo = tipos[j];
                var valores = [];

                // Busca o valor daquele servidor e tipo em cada horário.
                for (var h = 0; h < horarios.length; h++) {
                    var chave =
                        servidor.id + "|" + tipo.tipo + "|" + horarios[h];

                    if (Object.prototype.hasOwnProperty.call(valoresPorChave, chave)) {
                        valores.push(valoresPorChave[chave]);
                    } else {
                        // null deixa o ponto vazio se não houver medição naquele horário.
                        valores.push(null);
                    }
                }

                // Cada dataset vira uma linha identificada pelo nome do servidor.
                datasets.push({
                    label: servidor.nome + " - " + tipo.nome,
                    data: valores,
                    borderColor: tipo.cor,
                    borderDash: i % 2 === 0 ? [] : [6, 4],
                    pointRadius: 0,
                    spanGaps: false,
                    yAxisID: "y"
                });
            }
        }

        // Cria a linha de referência de 80%.
        var valoresLimite = [];

        for (var i = 0; i < labels.length; i++) {
            valoresLimite.push(80);
        }

        datasets.push({
            label: "Limite 80%",
            data: valoresLimite,
            borderColor: "#ff4d6d",
            borderDash: [4, 4],
            pointRadius: 0,
            yAxisID: "y"
        });

        // Substitui os dados do gráfico e pede ao Chart.js para redesenhá-lo.
        graficoHistorico.data.labels = labels;
        graficoHistorico.data.datasets = datasets;
        graficoHistorico.update();
    }

    const botoesPeriodoHistorico = document.querySelectorAll("#filtroPeriodo .botao-periodo");
    const botoesPeriodoRede = document.querySelectorAll("#filtroPeriodoRede .botao-periodo");
    const textoPeriodo = document.getElementById("textoPeriodo");
    const textoPeriodoRede = document.getElementById("textoPeriodoRede");

    configurarBotoesPeriodo(botoesPeriodoHistorico, function (periodo) {
        periodoHistorico = periodo;
        textoPeriodo.textContent = periodos[periodo].texto;

        if (metricasParaRanking.length > 0) {
            atualizarGraficoHistorico(
                filtrarMetricasPorPeriodo(metricasParaRanking, periodo),
                filtroServidor.value
            );
        }
    });

    configurarBotoesPeriodo(botoesPeriodoRede, function (periodo) {
        periodoTrafegoRede = periodo;
        textoPeriodoRede.textContent = periodos[periodo].texto;

        if (metricasParaRanking.length > 0) {
            atualizarGraficoTrafego(
                filtrarMetricasPorPeriodo(metricasParaRanking, periodo),
                filtroServidor.value
            );
        }
    });

    let periodoHistorico = "30m";
    let periodoTrafegoRede = "30m";

    function configurarBotoesPeriodo(botoes, aoSelecionar) {
        for (let i = 0; i < botoes.length; i++) {
            botoes[i].addEventListener("click", function () {
                const periodo = this.dataset.periodo;

                if (periodos[periodo] === undefined) {
                    return;
                }

                for (let j = 0; j < botoes.length; j++) {
                    if (botoes[j].dataset.periodo === periodo) {
                        botoes[j].classList.add("ativo");
                    } else {
                        botoes[j].classList.remove("ativo");
                    }
                }

                aoSelecionar(periodo);
            });
        }
    }

    const graficoTrafegoRede = new Chart(canvasTrafegoRede, {
        type: "line",
        data: {
            labels: [],
            datasets: [
                {
                    label: "Envio",
                    data: [],
                    borderColor: "#2de2c0",
                    backgroundColor: "#2de2c0",
                    pointRadius: 2,
                    tension: 0.2,
                    spanGaps: false
                },
                {
                    label: "Recebimento",
                    data: [],
                    borderColor: "#4f8cff",
                    backgroundColor: "#4f8cff",
                    pointRadius: 2,
                    tension: 0.2,
                    spanGaps: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index"
            },
            plugins: {
                legend: {
                    position: "bottom"
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Horário"
                    },
                    grid: {
                        color: "rgba(204, 204, 204, 0.15)"
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Tráfego (MB/s)"
                    },
                    ticks: {
                        callback: valor => `${valor} MB/s`
                    },
                    grid: {
                        color: "rgba(136, 136, 168, 0.15)"
                    }
                }
            }
        }
    });

    function atualizarGraficoTrafego(metricas, idSelecionado) {
        // Tipos de rede e cores usados no gráfico.
        var tipos = [
            { tipo: "TAXA_ENVIO_REDE", nome: "Envio", cor: "#2de2c0" },
            { tipo: "TAXA_RECEBIMENTO_REDE", nome: "Recebimento", cor: "#4f8cff" }
        ];

        var servidores = [];
        var horarios = [];
        var valoresPorChave = {};

        // Coleta os servidores e horários das métricas de rede.
        for (var i = 0; i < metricas.length; i++) {
            var linha = metricas[i];

            // Com um ID selecionado, ignora os outros servidores.
            // ID vazio significa “Todos”.
            if (
                idSelecionado !== "" &&
                String(linha.servidor_id) !== idSelecionado
            ) {
                continue;
            }

            // Ignora métricas que não sejam envio ou recebimento.
            var tipoValido = false;

            for (var j = 0; j < tipos.length; j++) {
                if (linha.tipo === tipos[j].tipo) {
                    tipoValido = true;
                    break;
                }
            }

            if (!tipoValido) {
                continue;
            }

            var id = String(linha.servidor_id);
            var servidorEncontrado = false;

            // Guarda o servidor uma única vez.
            for (var j = 0; j < servidores.length; j++) {
                if (servidores[j].id === id) {
                    servidorEncontrado = true;
                    break;
                }
            }

            if (!servidorEncontrado) {
                servidores.push({
                    id: id,
                    nome: linha.nome_servidor || "Servidor " + id
                });
            }

            // Guarda cada horário uma única vez.
            if (horarios.indexOf(linha.inicio_periodo) === -1) {
                horarios.push(linha.inicio_periodo);
            }

            // Converte bytes/s para MB/s e associa o valor à chave servidor/tipo/horário.
            var chave = id + "|" + linha.tipo + "|" + linha.inicio_periodo;
            var valorMBs = Number(linha.media_amostral) / 1000000;

            if (Number.isFinite(valorMBs)) {
                valoresPorChave[chave] = valorMBs;
            }
        }

        // Organiza os horários do mais antigo para o mais recente.
        horarios.sort();

        var datasets = [];

        // Cria duas linhas de rede para cada servidor encontrado.
        for (var i = 0; i < servidores.length; i++) {
            var servidor = servidores[i];

            for (var j = 0; j < tipos.length; j++) {
                var tipo = tipos[j];
                var valores = [];

                // Procura o valor correspondente em cada horário.
                for (var h = 0; h < horarios.length; h++) {
                    var chave =
                        servidor.id + "|" + tipo.tipo + "|" + horarios[h];

                    if (Object.prototype.hasOwnProperty.call(valoresPorChave, chave)) {
                        valores.push(valoresPorChave[chave]);
                    } else {
                        valores.push(null);
                    }
                }

                // Cada dataset representa envio ou recebimento de um servidor.
                datasets.push({
                    label: servidor.nome + " - " + tipo.nome,
                    data: valores,
                    borderColor: tipo.cor,
                    backgroundColor: tipo.cor,
                    borderDash: i % 2 === 0 ? [] : [6, 4],
                    pointRadius: 2,
                    tension: 0.2,
                    spanGaps: false
                });
            }
        }

        // Substitui os dados e redesenha o gráfico.
        graficoTrafegoRede.data.labels = horarios;
        graficoTrafegoRede.data.datasets = datasets;
        graficoTrafegoRede.update();
    }
    let metricasParaRanking = [];
    let metricasHistorico = [];
    let servidorHistorico = null;


    function atualizarOpcoesServidores(metricas) {
        var selecionado = filtroServidor.value;
        var idsServidores = [];

        filtroServidor.replaceChildren(
            new Option("Todos os servidores", "")
        );

        for (var i = 0; i < metricas.length; i++) {
            var linha = metricas[i];

            if (linha.servidor_id === undefined || linha.servidor_id === null) {
                continue;
            }

            var id = String(linha.servidor_id);

            if (idsServidores.indexOf(id) !== -1) {
                continue;
            }

            idsServidores.push(id);
            filtroServidor.add(
                new Option(linha.nome_servidor || "Servidor " + id, id)
            );
        }

        filtroServidor.value =
            idsServidores.indexOf(selecionado) !== -1 ? selecionado : "";
    }

    // busco os dados na minha rota
    fetch("/analista_geral/dashboard")
        .then(function (resposta) {
            if (!resposta.ok) {
                throw new Error("Não foi possível buscar os dados.");
            }
            return resposta.json();
        })
        .then(function (dados) {
            if (dados.metricas.length === 0) {
                throw new Error("O CSV não tem métricas.");
            }

            console.log(dados)
            metricasParaRanking = dados.metricas;
            atualizarHorarioUltimaMedicao(dados.metricas);

            var idsRecebidos = [];

            for (var i = 0; i < dados.metricas.length; i++) {
                var id = String(dados.metricas[i].servidor_id);

                if (idsRecebidos.indexOf(id) === -1) {
                    idsRecebidos.push(id);
                }
            }

            console.log("IDs de servidor recebidos:", idsRecebidos);



            console.log("Pontos por período:", {
                "30 min": filtrarMetricasPorPeriodo(dados.metricas, "30m").length,
                "1 hora": filtrarMetricasPorPeriodo(dados.metricas, "1h").length,
                "24 horas": filtrarMetricasPorPeriodo(dados.metricas, "24h").length
            });

         atualizarOpcoesServidores(dados.metricas);

            function atualizarHistogramaPorServidor() {
                var idSelecionado = filtroServidor.value;
                metricasHistograma = [];

                // Mantém todas as métricas se “Todos os servidores” estiver selecionado.
                for (var i = 0; i < dados.metricas.length; i++) {
                    var linha = dados.metricas[i];

                    if (
                        idSelecionado === "" ||
                        String(linha.servidor_id) === idSelecionado
                    ) {
                        metricasHistograma.push(linha);
                    }
                }

                histogramaRam.options.scales.x.title.text =
                    "Uso de " + componenteHistograma.toUpperCase();

                atualizarHistogramaRam();
            }

            // Recalcula o histograma quando a seleção de servidor mudar.
            filtroServidor.addEventListener("change", function () {
                atualizarHistogramaPorServidor();
                atualizarGraficosPorServidor();
            });

            // Desenha o histograma inicial com a opção selecionada.
            atualizarHistogramaPorServidor();

            // Media dos Kpis em todos, pego a media mais recente de cada servidor e calculo a media
            function calcularMediaUltima(tipoMetrica) {
                var ultimoHorarioPorServidor = {};
                var ultimoValorPorServidor = {};

                for (var i = 0; i < dados.metricas.length; i++) {
                    var linha = dados.metricas[i];

                    if (linha.tipo !== tipoMetrica) {
                        continue;
                    }

                    var id = String(linha.servidor_id);
                    var horario = linha.inicio_periodo;
                    var valor = Number(linha.media_amostral);

                    if (!Number.isFinite(valor)) {
                        continue;
                    }

                    if (
                        ultimoHorarioPorServidor[id] === undefined ||
                        horario > ultimoHorarioPorServidor[id]
                    ) {
                        ultimoHorarioPorServidor[id] = horario;
                        ultimoValorPorServidor[id] = valor;
                    }
                }

                var soma = 0;
                var quantidade = 0;

                for (var id in ultimoValorPorServidor) {
                    soma += ultimoValorPorServidor[id];
                    quantidade++;
                }

                if (quantidade === 0) {
                    return null;
                }

                return soma / quantidade;
            }

            function atualizarGraficosPorServidor() {
                var servidorSelecionado = filtroServidor.value;

                servidorHistorico = servidorSelecionado;
                metricasHistorico = dados.metricas;

                // Dados do gráfico de histórico
                var horariosReais = [];
                var valoresCpu = [];
                var valoresRam = [];
                var valoresDisco = [];




                // Valores atuais dos indicadores do painel
                var ultimoCpu = null;
                var ultimaRam = null;
                var ultimoDisco = null;
                var ultimaRede = null;

                // Capacidade da rede usada para calcular a porcentagem
                var capacidadeRedeMbps = 1000;



                for (var i = 0; i < dados.metricas.length; i++) {
                    var linha = dados.metricas[i];

                    // Converte o horário da linha para comparação
                    // O CSV tem formato: "2026-10-24 12:00:00"
                    var horaLinha = linha.inicio_periodo;
                    var minutosAgo = 0;
                    if (periodoHistorico === "30m") {
                        minutosAgo = 30;
                    } else if (periodoHistorico === "1h") {
                        minutosAgo = 60;
                    } else if (periodoHistorico === "24h") {
                        minutosAgo = 1440; // 24 * 60
                    }

                    // exibo todas as metricas quando o valor for "" e filtro o servidor 
                    // qunado existir o id
                    if (
                        servidorSelecionado !== "" &&
                        String(linha.servidor_id) !== String(servidorSelecionado)
                    ) {
                        continue;
                    }

                    if (linha.tipo === "USO_CPU") {
                        var valorCpu = Number(linha.media_amostral);
                        valoresCpu.push(valorCpu);
                        ultimoCpu = valorCpu;

                        horariosReais.push(
                            linha.inicio_periodo.substring(8, 10) + "/" +
                            linha.inicio_periodo.substring(5, 7) + " " +
                            linha.inicio_periodo.substring(11, 16)
                        );

                        var usoCpu = Math.round(ultimoCpu);
                        var cpuLivre = 100 - usoCpu;
                        document.getElementById("valorLivreCpu").textContent = cpuLivre + "%";
                        document.getElementById("textoLivreCpu").textContent = cpuLivre + "% livres, com uso de " + usoCpu + "%.";

                    } else if (linha.tipo === "USO_RAM") {
                        var valorRam = Number(linha.media_amostral);
                        valoresRam.push(valorRam);
                        ultimaRam = valorRam;
                        var usoRam = Math.round(ultimaRam);
                        var ramLivre = 100 - usoRam;
                        document.getElementById("valorLivreRam").textContent = ramLivre + "%";
                        document.getElementById("textoLivreRam").textContent = ramLivre + "% livres, com uso de " + usoRam + "%.";

                    } else if (linha.tipo === "USO_DISCO") {
                        var valorDisco = Number(linha.media_amostral);
                        valoresDisco.push(valorDisco);
                        ultimoDisco = valorDisco;
                        var usoDisco = Math.round(ultimoDisco);
                        var discoLivre = 100 - usoDisco;
                        document.getElementById("valorLivreDisco").textContent = discoLivre + "%";
                        document.getElementById("textoLivreDisco").textContent = discoLivre + "% livres, com uso de " + usoDisco + "%.";

                    } else if (linha.tipo === "TAXA_RECEBIMENTO_REDE") {
                        var bytesPorSegundo = Number(linha.media_amostral);
                        var percentualRede =
                            // como minha taxa vem em bytes eu converto para bits * 8, comparo com a capacid em Mbps *1.000.00 
                            // e multiplico por 100 para obter a porcentagem.
                            (bytesPorSegundo * 8 / (capacidadeRedeMbps * 1000000)) * 100;

                        ultimaRede = percentualRede;
                        var usoRede = Math.round(ultimaRede);
                        var redeLivre = 100 - usoRede;
                        document.getElementById("valorLivreRede").textContent = redeLivre + "%";
                        document.getElementById("textoLivreRede").textContent = redeLivre + "% livres, com uso de " + usoRede + "%.";


                        // horario é o inicio_periodo da minha medição uso como ponto de uniao entre meus dois valores ou seja 
                        // se os horarios de ambos forem diferentes eles não são pareados.
                        var horario = linha.inicio_periodo;

                    }
                }

                if (servidorSelecionado === "") {
                    // Calculo a média das medições mais recentes de cada servidor.
                    ultimoCpu = calcularMediaUltima("USO_CPU");
                    ultimaRam = calcularMediaUltima("USO_RAM");
                    ultimoDisco = calcularMediaUltima("USO_DISCO");

                    // Converto a média da rede para percentual de uma capacidade de 1 Gbit/s.
                    var mediaRede = calcularMediaUltima("TAXA_RECEBIMENTO_REDE");
                    ultimaRede = mediaRede === null
                        ? null
                        : (mediaRede * 8 / 1000000000) * 100;

                    // Atualiza os círculos e textos somente quando há valor para exibir.
                    if (ultimoCpu !== null) {
                        var cpuLivre = 100 - Math.round(ultimoCpu);
                        document.getElementById("valorLivreCpu").textContent = cpuLivre + "%";
                        document.getElementById("textoLivreCpu").textContent =
                            cpuLivre + "% livres, com uso de " + Math.round(ultimoCpu) + "%.";
                    }

                    if (ultimaRam !== null) {
                        var ramLivre = 100 - Math.round(ultimaRam);
                        document.getElementById("valorLivreRam").textContent = ramLivre + "%";
                        document.getElementById("textoLivreRam").textContent =
                            ramLivre + "% livres, com uso de " + Math.round(ultimaRam) + "%.";
                    }

                    if (ultimoDisco !== null) {
                        var discoLivre = 100 - Math.round(ultimoDisco);
                        document.getElementById("valorLivreDisco").textContent = discoLivre + "%";
                        document.getElementById("textoLivreDisco").textContent =
                            discoLivre + "% livres, com uso de " + Math.round(ultimoDisco) + "%.";
                    }

                    if (ultimaRede !== null) {
                        var redeLivre = 100 - Math.round(ultimaRede);
                        document.getElementById("valorLivreRede").textContent = redeLivre + "%";
                        document.getElementById("textoLivreRede").textContent =
                            redeLivre + "% livres, com uso de " + Math.round(ultimaRede) + "%.";
                    }
                }
                atualizarGraficoTrafego(
                    filtrarMetricasPorPeriodo(dados.metricas, periodoTrafegoRede),
                    filtroServidor.value
                );


                function atualizarStatus(nome, valor) {
                    var uso = Math.round(valor);

                    document.getElementById("barra" + nome).value = uso;
                    document.getElementById("uso" + nome).textContent = uso + "%";

                    var selo = document.getElementById("selo" + nome);
                    var classeStatus;
                    if (uso >= 80) {
                        selo.textContent = "Alerta";
                        selo.className = "selo-status status-alerta";
                        classeStatus = "status-alerta";
                    } else if (uso >= 60) {
                        selo.textContent = "Atenção";
                        selo.className = "selo-status status-atencao";
                        classeStatus = "status-atencao";
                    } else {
                        selo.textContent = "Normal";
                        selo.className = "selo-status status-normal";
                        classeStatus = "status-normal";
                    }

                    // Atualizando Kpis
                    var cardKpi = document.getElementById("kpi" + nome)
                        .closest(".card-metrica");
                    var seloKpi = document.getElementById("kpiSelo" + nome);

                    seloKpi.textContent = selo.textContent;
                    seloKpi.className = "selo-status " + classeStatus;

                    // removo do cartão qualquer classe de estado anterior
                    cardKpi.classList.remove(
                        "status-alerta",
                        "status-atencao",
                        "status-normal"
                    );
                    cardKpi.classList.add(classeStatus);
                }



                if (ultimoCpu !== null) atualizarStatus("Cpu", ultimoCpu);
                if (ultimaRam !== null) atualizarStatus("Ram", ultimaRam);
                if (ultimoDisco !== null) atualizarStatus("Disco", ultimoDisco);
                if (ultimaRede !== null) atualizarStatus("Rede", ultimaRede);



                if (ultimoCpu !== null) {
                    document.getElementById("kpiCpu").textContent =
                        Math.round(ultimoCpu) + "%";
                }

                if (ultimaRam !== null) {
                    document.getElementById("kpiRam").textContent =
                        Math.round(ultimaRam) + "%";
                }

                if (ultimoDisco !== null) {
                    document.getElementById("kpiDisco").textContent =
                        Math.round(ultimoDisco) + "%";
                }

                if (ultimaRede !== null) {
                    document.getElementById("kpiRede").textContent =
                        Math.round(ultimaRede) + "%";
                }


                atualizarGraficoHistorico(
                    filtrarMetricasPorPeriodo(dados.metricas, periodoHistorico),
                    filtroServidor.value
                );

            }
            atualizarGraficosPorServidor();
            atualizarRanking();
            let atualizacaoEmAndamento = false;

            setInterval(async function () {
                if (atualizacaoEmAndamento) {
                    return;
                }

                atualizacaoEmAndamento = true;

                try {
                    const respostaAtualizada = await fetch(
                        "/analista_geral/dashboard",
                        { cache: "no-store" }
                    );

                    if (!respostaAtualizada.ok) {
                        throw new Error("Não foi possível atualizar os dados da dashboard.");
                    }

                    const dadosAtualizados = await respostaAtualizada.json();

                    if (
                        !Array.isArray(dadosAtualizados.metricas) ||
                        dadosAtualizados.metricas.length === 0
                    ) {
                        throw new Error("A atualização não retornou métricas.");
                    }

                    // Atualiza os dados que as funções da dashboard já usam.
                    dados.metricas = dadosAtualizados.metricas;
                    dados.processos = dadosAtualizados.processos;
                    metricasParaRanking = dadosAtualizados.metricas;

                    atualizarOpcoesServidores(dadosAtualizados.metricas);
                    atualizarHorarioUltimaMedicao(dadosAtualizados.metricas);

                    // Redesenha os componentes...

                    // Redesenha os componentes mantendo o servidor e período selecionados.
                    atualizarHistogramaPorServidor();
                    atualizarGraficosPorServidor();
                    atualizarRanking();
                } catch (erro) {
                    console.error("Erro ao atualizar a dashboard:", erro);
                } finally {
                    atualizacaoEmAndamento = false;
                }
            }, 5 * 60 * 1000);
        })

        .catch(function (erro) {
            console.error("Erro ao carregar métricas:", erro);
        });


    const filtroHistograma = document.getElementById("filtroComponenteHistograma");
    let componenteHistograma = "ram";
    let metricasHistograma = [];
    const histogramaRam = new Chart(canvasHistogramaRam, {
        type: "bar",
        data: {
            datasets: [
                {
                    type: "bar",
                    label: "Medições",
                    data: [],
                    backgroundColor: "rgba(79, 140, 255, 0.65)",
                    borderColor: "#4f8cff",
                    borderWidth: 1,
                    barThickness: 18
                },
                {
                    type: "line",
                    label: "Média",
                    data: [],
                    borderColor: "#ff4d6d",
                    borderWidth: 2,
                    borderDash: [6, 4],
                    pointRadius: 0
                },
                {
                    type: "line",
                    label: "Mediana",
                    data: [],
                    // meu data vai começar vazia pois a minha função 
                    // atualizarHistogramaRam() calcula e coloca os dados aqui
                    borderColor: "#f5b700",
                    borderWidth: 2,
                    borderDash: [3, 3],
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom"
                },
                tooltip: {
                    callbacks: {
                        label(contexto) {
                            if (contexto.dataset.type === "bar") {
                                return "Medições: " + contexto.parsed.y;
                            }

                            return contexto.dataset.label + ": "
                                + contexto.parsed.x.toFixed(1) + "%";
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: "linear",
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: "Uso de RAM"
                    },
                    ticks: {
                        stepSize: 10,
                        callback(valor) {
                            return valor + "%";
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    },
                    title: {
                        display: true,
                        text: "Quantidade de medições"
                    }
                }
            }
        }
    });

    function atualizarHistogramaRam() {
        const valores = [];

        const tipos = {
            ram: "USO_RAM",
            cpu: "USO_CPU",
            disco: "USO_DISCO"
        };

        const tipoSelecionado = tipos[componenteHistograma];

        for (let i = 0; i < metricasHistograma.length; i++) {
            const linha = metricasHistograma[i];

            if (linha.tipo === tipoSelecionado) {
                let valor = Number(linha.media_amostral);



                if (Number.isFinite(valor)) {
                    valores.push(valor);
                }
            }
        }
        const faixas = [];

        // crio a lista com minhas dez barras do histograma
        for (let i = 0; i < 10; i++) {
            // repito o bloco dez vezes criando uma faixa para cada intervalo de 10%
            let nomeFaixa = (i * 10) + "-" + (i * 10 + 9) + "%";

            if (i === 9) {
                nomeFaixa = "90-100%";
            }

            faixas.push({
                x: i * 10 + 5,
                y: 0,
                faixa: nomeFaixa
            });
        }

        // Conto quantas medições caem em cada faixa.
        for (let i = 0; i < valores.length; i++) {
            //depois cada medição vai sendo colocada na faixa correspondemte ex: 20-29%
            let numeroFaixa = Math.floor(valores[i] / 10);

            if (numeroFaixa > 9) {
                numeroFaixa = 9;
            }

            faixas[numeroFaixa].y++;
        }

        // Calculo a média.
        let soma = 0;

        for (let i = 0; i < valores.length; i++) {
            soma = soma + valores[i];
        }

        let media = 0;

        if (valores.length > 0) {
            media = soma / valores.length;
        }

        // Copia e ordena os valores para encontrar a mediana.
        const ordenados = [];

        for (let i = 0; i < valores.length; i++) {
            ordenados.push(valores[i]);
        }

        // ordeno os numeros do menor para o maior, ou seja se um numero da direita for menor que o 
        // da minha esquerda eles trocam de lugar
        for (let i = 0; i < ordenados.length; i++) {
            for (let j = i + 1; j < ordenados.length; j++) {
                if (ordenados[j] < ordenados[i]) {
                    const temporario = ordenados[i];
                    ordenados[i] = ordenados[j];
                    ordenados[j] = temporario;
                }
            }
        }

        let mediana = 0;

        // aqui eu calculo minha mediana a partir dos meus ordenados que fiz acima
        if (ordenados.length > 0) {
            const meio = Math.floor(ordenados.length / 2);

            //se minha qunatidade for par eu tiro minha mediana dos valores centrais
            if (ordenados.length % 2 === 0) {
                mediana = (ordenados[meio - 1] + ordenados[meio]) / 2;
            } else {
                mediana = ordenados[meio];
            }
        }

        // ajusto a altura das linhas de média e mediana.
        let topo = 1;

        for (let i = 0; i < faixas.length; i++) {
            if (faixas[i].y >= topo) {
                topo = faixas[i].y + 1;
            }
        }

        // envio os dados faça meu grafico la em data que iniciei vazio
        histogramaRam.data.datasets[0].data = faixas;

        histogramaRam.data.datasets[1].data = [
            { x: media, y: 0 },
            { x: media, y: topo }
        ];

        histogramaRam.data.datasets[2].data = [
            { x: mediana, y: 0 },
            { x: mediana, y: topo }
        ];


        histogramaRam.update();
    }

    filtroHistograma.addEventListener("change", function () {
        componenteHistograma = this.value;
        atualizarHistogramaRam();
    });

    // barras horizontais: mostro os 10 servidores com maior uso.
    const filtroRanking = document.getElementById("filtroComponenteRanking");
    let componenteRanking = "ram";
    const ranking = new Chart(canvasRankingRam, {
        type: "bar",
        data: {
            // começo sem os dados depois minha afunção atualizarRanking() preenche.
            labels: [],
            datasets: [{
                label: "Uso de RAM",
                data: [],
                backgroundColor: []
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label(context) {
                            return `${Math.round(context.parsed.x)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    min: 0,
                    max: 100,
                    ticks: {
                        callback: valor => `${valor}%`
                    }
                }
            }
        }
    });


    function atualizarRanking() {
        const textoBusca = buscaRam.value.toLowerCase();

        // Relaciona cada opção do filtro ao tipo de métrica do CSV.
        const tipos = {
            ram: "USO_RAM",
            cpu: "USO_CPU",
            disco: "USO_DISCO",
            rede: "TAXA_RECEBIMENTO_REDE"
        };

        const tipoSelecionado = tipos[componenteRanking];
        const resultados = [];

        // Procura as medições mais recentes que correspondem à busca e ao componente.
        for (let i = 0; i < metricasParaRanking.length; i++) {
            const linha = metricasParaRanking[i];

            if (linha.tipo !== tipoSelecionado) {
                continue;
            }

            const id = String(linha.servidor_id);
            const nome = linha.nome_servidor || "Servidor " + id;

            if (!nome.toLowerCase().includes(textoBusca)) {
                continue;
            }

            let percentual = Number(linha.media_amostral);

            // Converte a taxa de recebimento para percentual de uma capacidade de 1 Gbit/s.
            if (componenteRanking === "rede") {
                percentual = (percentual * 8 / 1000000000) * 100;
            }

            if (!Number.isFinite(percentual)) {
                continue;
            }

            let indiceServidor = -1;

            // Localiza se o servidor já foi adicionado à lista do ranking.
            for (let j = 0; j < resultados.length; j++) {
                if (resultados[j].id === id) {
                    indiceServidor = j;
                    break;
                }
            }

            if (indiceServidor === -1) {
                resultados.push({
                    id: id,
                    nome: nome,
                    percentual: percentual,
                    horario: linha.inicio_periodo
                });
            } else if (linha.inicio_periodo > resultados[indiceServidor].horario) {
                // Mantém somente a medição mais recente desse servidor.
                resultados[indiceServidor].percentual = percentual;
                resultados[indiceServidor].horario = linha.inicio_periodo;
            }
        }

        resultados.sort(function (a, b) {
            return b.percentual - a.percentual;
        });

        const nomes = [];
        const percentuais = [];
        const cores = [];

        // Mostra no máximo dez servidores, do maior uso para o menor.
        for (let i = 0; i < resultados.length && i < 10; i++) {
            nomes.push(resultados[i].nome);
            percentuais.push(resultados[i].percentual);

            if (resultados[i].percentual >= 80) {
                cores.push("#ff4d6d");
            } else if (resultados[i].percentual >= 60) {
                cores.push("#f5b700");
            } else {
                cores.push("#2de2c0");
            }
        }

        ranking.data.labels = nomes;
        ranking.data.datasets[0].label =
            "Uso de " + componenteRanking.toUpperCase();
        ranking.data.datasets[0].data = percentuais;
        ranking.data.datasets[0].backgroundColor = cores;
        ranking.update();
    }

    filtroRanking.addEventListener("change", function () {
        componenteRanking = this.value;
        atualizarRanking();
    });

    buscaRam.addEventListener("input", atualizarRanking);

    atualizarRanking();
}
