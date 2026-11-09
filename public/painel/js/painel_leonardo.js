
// procuro o canvas no meu html
const historico = document.getElementById("graficoHistorico");
const correlacao = document.getElementById("graficoCorrelacao");
const canvasRankingRam = document.getElementById("graficoRamServidores");
const canvasHistogramaRam = document.getElementById("graficoHistogramaRam");
const buscaRam = document.getElementById("filtroServidorRam");

if (canvasRankingRam && canvasHistogramaRam && buscaRam ) {
    const horarios = [
        "17:11", "17:13", "17:15", "17:17", "17:19",
        "17:21", "17:23", "17:25", "17:27", "17:29",
        "17:31", "17:33", "17:35", "17:37", "17:39"
    ];
const limite80 = [];

for (let i = 0; i < horarios.length; i++) {
    limite80.push(80);
}

    new Chart(historico, {
        type: "line",
        data: {
            labels: horarios,
            datasets: [
                {
                    label: "CPU",
                    data: [78, 80, 77, 82, 79, 84, 86, 80, 83, 81, 77, 75, 79, 82, 78],
                    borderColor: "#4f8cff",
                    backgroundColor: "#4f8cff",
                    tension: 0.35,
                    pointRadius: 2
                },
                {
                    label: "RAM",
                    data: [75, 73, 78, 76, 80, 74, 70, 65, 69, 61, 64, 67, 72, 70, 90],
                    borderColor: "#8b5cf6",
                    backgroundColor: "#8b5cf6",
                    tension: 0.35,
                    pointRadius: 2
                },
                {
                    label: "Disco",
                    data: [42, 52, 48, 57, 53, 60, 49, 44, 38, 32, 35, 41, 46, 43, 55],
                    borderColor: "#2de2c0",
                    backgroundColor: "#2de2c0",
                    tension: 0.35,
                    pointRadius: 2
                },
                {
                    label: "Rede",
                    data: [50, 48, 39, 29, 27, 24, 35, 47, 58, 49, 42, 36, 34, 25, 30],
                    borderColor: "#f5b700",
                    backgroundColor: "#f5b700",
                    tension: 0.35,
                    pointRadius: 2
                },
                {
                    label: "Limite de 80%",
                   data: limite80,
                    borderColor: "#ff4d6d",
                    backgroundColor: "#ff4d6d",
                    borderDash: [4, 4],
                    pointRadius: 0,
                    tension: 0
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



   
    const servidores = [
        {
            nome: "srv-stream-01",
            usada: 12,
            total: 16,
            historico: [61, 64, 68, 66, 70, 72, 69, 73, 75, 74, 77, 75, 78, 76, 75]
        },
        {
            nome: "srv-stream-02",
            usada: 10,
            total: 16,
            historico: [48, 50, 49, 52, 55, 53, 56, 58, 57, 60, 59, 61, 62, 60, 62]
        },
        {
            nome: "srv-stream-03",
            usada: 13,
            total: 16,
            historico: [70, 72, 74, 73, 75, 78, 77, 80, 79, 82, 81, 83, 80, 82, 81]
        },
        {
            nome: "srv-encode-01",
            usada: 23,
            total: 32,
            historico: [62, 65, 64, 66, 68, 67, 69, 71, 73, 72, 70, 71, 73, 72, 72]
        }
    ];
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

    // Junto as medições de todos os meus servidores.
    for (let i = 0; i < servidores.length; i++) {
        for (let j = 0; j < servidores[i].historico.length; j++) {
            valores.push(servidores[i].historico[j]);
        }
    }

    // Crio as faixas de 10%.
    const faixas = [];

    for (let i = 0; i < 10; i++) {
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
        let numeroFaixa = Math.floor(valores[i] / 10);

        if (numeroFaixa > 9) {
            numeroFaixa = 9;
        }

        faixas[numeroFaixa].y++;
    }

    // Calcula a média.
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

    // barras horizontais: mostro os 10 servidores com maior uso.
    const ranking = new Chart(canvasRankingRam, {
        type: "bar",
        data: {
            // começo sem os dados depois minh afunçãoa atualizarRanking() preenche.
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
                            for (const servidor of servidores) {
                                if (servidor.nome === context.label) {
                                    const percentual = Math.round(
                                        servidor.usada / servidor.total * 100
                                    );
                                    return `${percentual}% — ${servidor.usada} de ${servidor.total} GB`;
                                }
                            }

                            return `${context.parsed.x}%`;
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


    // Vou preencher meu gráfico acima
    function atualizarRanking() {
        const textoBusca = buscaRam.value.toLowerCase();
        const resultados = [];

        for (const servidor of servidores) {
            if (servidor.nome.toLowerCase().includes(textoBusca)) {
                resultados.push({
                    nome: servidor.nome,
                    percentual: Math.round(servidor.usada / servidor.total * 100)
                });
            }
        }
        
        // A minha função atualizarRanking() le oq digitei e procura os servidores e ordena do
        // maior para o menor
        resultados.sort((a, b) => b.percentual - a.percentual);

        const nomes = [];
        const percentuais = [];
        const cores = [];

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
        

    //Entrego ao gráfico os nomes, os valores e as cores preparados.Por fim, 
    // ranking.update() pede ao Chart.js para redesenhar o gráfico com esses dados.
        ranking.data.labels = nomes;
        ranking.data.datasets[0].data = percentuais;
        ranking.data.datasets[0].backgroundColor = cores;
        ranking.update();
    }

  buscaRam.addEventListener("input", atualizarRanking);

atualizarRanking();
atualizarHistogramaRam();

    new Chart(correlacao, {
        type: "scatter",
        data: {
            datasets: [
                {
                    label: "Normal",
                    data: [
                        { x: 25, y: 38 }, { x: 30, y: 48 }, { x: 34, y: 45 },
                        { x: 38, y: 52 }, { x: 42, y: 49 }, { x: 47, y: 56 },
                        { x: 52, y: 60 }, { x: 55, y: 58 }
                    ],
                    backgroundColor: "#2de2c0",
                    pointRadius: 3
                },
                {
                    label: "Atenção",
                    data: [
                        { x: 48, y: 55 }, { x: 53, y: 62 }, { x: 58, y: 65 },
                        { x: 61, y: 70 }, { x: 66, y: 68 }, { x: 70, y: 74 },
                        { x: 74, y: 77 }
                    ],
                    backgroundColor: "#f5b700",
                    pointRadius: 3
                },
                {
                    label: "Alerta",
                    data: [
                        { x: 82, y: 80 }, { x: 85, y: 86 }, { x: 88, y: 83 },
                        { x: 91, y: 89 }, { x: 94, y: 87 }
                    ],
                    backgroundColor: "#ff4d6d",
                    pointRadius: 3
                },
                {
                    label: "Tendência",
                    type: "line",
                    data: [
                        { x: 22, y: 42 },
                        { x: 95, y: 90 }
                    ],
                    borderColor: "#f1f1f8",
                    borderDash: [5, 5],
                    pointRadius: 0,
                    borderWidth: 1.5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom"
                }
            },
            scales: {
                x: {
                    type: "linear",
                    min: 20,
                    max: 100,
                    title: {
                        display: true,
                        text: "Uso de CPU"
                    },
                    ticks: {
                    
                        callback: valor => `${valor}%`
                    },
                    grid: {
                        color: "rgba(136, 136, 168, 0.15)"
                    }
                },
                y: {
                    min: 20,
                    max: 100,
                    title: {
                        display: true,
                        text: "Uso de RAM"
                    },
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
}
