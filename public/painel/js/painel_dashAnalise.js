// limite = referência de alerta (pode editar)
const COMPONENTES = {
    cpu: { nome: "CPU", tipo: "USO_CPU", limite: 90, cor: "#4f8cff" },
    ram: { nome: "RAM", tipo: "USO_RAM", limite: 90, cor: "#8b5cf6" },
    disco: { nome: "Disco", tipo: "USO_DISCO", limite: 95, cor: "#2de2c0" },
    rede: { nome: "Rede", tipo: "TAXA_ENVIO_REDE", limite: 80, cor: "#f59a3d" }
};
const NOMES_COMPONENTES = ["cpu", "ram", "disco", "rede"];

// a rede vem em bytes/s; 1 Gbit/s é a capacidade usada para virar %
const CAPACIDADE_REDE = 1000000000 / 8;
const MINUTOS_JANELA = 5;
const GIB = 1024 * 1024 * 1024;

let metricas = [];
let processos = [];
let servidores = [];

let servidorAtual = "";
let componenteAtual = "cpu";
let periodoAtual = 0;
let inicioDoPeriodo = "";
let todosInicios = [];

const graficos = {};

async function lerDados(caminho) {
    const resposta = await fetch(caminho);
    if (!resposta.ok) throw new Error("Não consegui buscar " + caminho);
    return await resposta.json();
}

function pegarSerie(servidor, componente) {
    const c = COMPONENTES[componente];
    const fator = (componente === "rede") ? 100 / CAPACIDADE_REDE : 1;

    const linhas = metricas.filter(function (l) { return l.servidor_id === servidor && l.tipo === c.tipo && l.inicio_periodo >= inicioDoPeriodo; });
    linhas.sort(function (a, b) { return a.inicio_periodo < b.inicio_periodo ? -1 : 1; });

    return linhas.map(function (l) {
        return {
            inicio: l.inicio_periodo,
            amostras: Number(l.quantidade_amostras),
            media: Number(l.media_amostral) * fator,
            minimo: Number(l.minimo) * fator,
            maximo: Number(l.maximo) * fator
        };
    });
}

function pegar(id) {
    return document.getElementById(id);
}

function formatar(numero) {
    return numero.toFixed(1).replace(".", ",");
}

function horaMinuto(texto) {
    return texto.slice(11, 16);
}

function diaHoraMinuto(texto) {
    return texto.slice(8, 10) + "/" + texto.slice(5, 7) + " " + texto.slice(11, 16);
}

function somarMinutos(texto, minutos) {
    const data = new Date(texto.replace(" ", "T"));
    data.setMinutes(data.getMinutes() + minutos);
    const dois = function (n) { return String(n).padStart(2, "0"); };
    return dois(data.getDate()) + "/" + dois(data.getMonth() + 1) + " " + dois(data.getHours()) + ":" + dois(data.getMinutes());
}

function mediaPonderada(valores, pesos) {
    let soma = 0;
    let total = 0;
    valores.forEach(function (v, i) {
        soma += v * pesos[i];
        total += pesos[i];
    });
    return soma / total;
}

// alerta = a menos de 10 pontos do limite
function estadoDaJanela(janela, limite) {
    if (janela.maximo > limite) return "critico";
    if (janela.maximo >= limite - 10) return "alerta";
    return "ok";
}

function acharEpisodios(serie, limite) {
    const episodios = [];
    let atual = null;
    serie.forEach(function (janela) {
        if (janela.maximo > limite) {
            if (atual === null) atual = { inicio: janela.inicio, fim: janela.inicio, janelas: 0, pico: 0 };
            atual.fim = janela.inicio;
            atual.janelas++;
            if (janela.maximo > atual.pico) atual.pico = janela.maximo;
        } else if (atual !== null) {
            episodios.push(atual);
            atual = null;
        }
    });
    if (atual !== null) episodios.push(atual);
    return episodios;
}

function criarGrafico(id, configuracao) {
    if (graficos[id]) graficos[id].destroy();
    graficos[id] = new Chart(pegar(id), configuracao);
}

function desenharNumeros(serie, c) {
    const total = serie.length;
    const noLimite = serie.filter(function (j) { return j.maximo > c.limite; }).length;
    const emRisco = serie.filter(function (j) { return estadoDaJanela(j, c.limite) !== "ok"; }).length;

    let maiorEpisodio = 0;
    acharEpisodios(serie, c.limite).forEach(function (e) { if (e.janelas > maiorEpisodio) maiorEpisodio = e.janelas; });

    let pior = serie[0];
    serie.forEach(function (j) { if (j.maximo > pior.maximo) pior = j; });

    const percentualNoLimite = noLimite / total * 100;
    const percentualEmRisco = emRisco / total * 100;
    const piorHorario = horaMinuto(pior.inicio);

    const cartoes = [
        { titulo: "Tempo acima do limite", valor: noLimite * MINUTOS_JANELA + " min", texto: Math.round(percentualNoLimite) + "% do período • limite de " + c.limite + "%", cor: "var(--vermelho)" },
        { titulo: "Tempo em risco", valor: emRisco * MINUTOS_JANELA + " min", texto: "alerta + crítico (" + Math.round(percentualEmRisco) + "% do período)", cor: "var(--laranja)" },
        { titulo: "Maior episódio contínuo", valor: maiorEpisodio > 0 ? maiorEpisodio * MINUTOS_JANELA + " min" : "Nenhum", texto: maiorEpisodio > 0 ? "tempo seguido acima do limite" : "nunca passou do limite", cor: "var(--roxo)" },
        { titulo: "Pior momento", valor: piorHorario, texto: "maior valor: " + Math.round(pior.maximo) + "%", cor: c.cor }
    ];

    let html = "";
    cartoes.forEach(function (k) {
        html += '<div class="kpi" style="--cor:' + k.cor + '"><span>' + k.titulo + '</span><strong>' + k.valor + '</strong><small>' + k.texto + '</small></div>';
    });
    pegar("kpis").innerHTML = html;

    const caixa = pegar("resumo");
    const quem = c.nome + " do Servidor " + servidorAtual;
    if (noLimite === 0) {
        caixa.style.setProperty("--cor", "var(--verde)");
        caixa.innerHTML = "<b>" + quem + " está sob controle.</b> Ficou abaixo do limite de " + c.limite + "% em todo o período. O maior valor foi " + Math.round(pior.maximo) + "% às " + piorHorario + ".";
    } else {
        const critico = percentualNoLimite >= 15;
        caixa.style.setProperty("--cor", critico ? "var(--vermelho)" : "var(--laranja)");
        caixa.innerHTML = "<b>" + quem + (critico ? " precisa de ação." : " pede atenção.") + "</b> Passou do limite de " + c.limite + "% por " + noLimite * MINUTOS_JANELA + " min (" + Math.round(percentualNoLimite) + "% do período). No pior momento chegou a " + Math.round(pior.maximo) + "% às " + piorHorario + ". Veja os episódios no fim da página para ligar com incidentes.";
    }
}

function desenharGraficoPrincipal(serie, c) {
    const nomes = serie.map(function (j) { return horaMinuto(j.inicio); });
    const maximos = serie.map(function (j) { return j.maximo; });
    const minimos = serie.map(function (j) { return j.minimo; });
    const medias = serie.map(function (j) { return j.media; });
    const limites = serie.map(function () { return c.limite; });
    const pontosVermelhos = serie.map(function (j) { return j.maximo > c.limite ? j.maximo : null; });

    pegar("tituloPrincipal").textContent = "Como está o uso de " + c.nome + " no período?";
    pegar("legendaLimite").textContent = "Limite (" + c.limite + "%)";

    criarGrafico("graficoPrincipal", {
        type: "line",
        data: {
            labels: nomes,
            datasets: [
                { data: maximos, borderColor: "transparent", pointRadius: 0 },
                { data: minimos, borderColor: "transparent", pointRadius: 0, backgroundColor: "rgba(79,140,255,.16)", fill: "-1" },
                { data: medias, borderColor: c.cor, borderWidth: 2, pointRadius: 0, tension: 0.3 },
                { data: pontosVermelhos, showLine: false, pointRadius: 5, pointBackgroundColor: "#ff4d6d", pointBorderColor: "#fff", pointBorderWidth: 1.5 },
                { data: limites, borderColor: "#f59a3d", borderDash: [6, 5], borderWidth: 1.2, pointRadius: 0 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    filter: function (item) { return item.datasetIndex === 2; },
                    callbacks: {
                        label: function (item) {
                            const j = serie[item.dataIndex];
                            return "Média " + formatar(j.media) + "% (de " + formatar(j.minimo) + "% a " + formatar(j.maximo) + "%)";
                        }
                    }
                }
            },
            scales: {
                y: { min: 0, max: 105, ticks: { callback: function (v) { return v + "%"; } } },
                x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, callback: function (v, i) { return i % 6 === 0 ? nomes[i] : ""; } } }
            }
        }
    });

    const quantidade = pontosVermelhos.filter(function (p) { return p !== null; }).length;
    let pior = 0;
    serie.forEach(function (j, i) { if (j.maximo > serie[pior].maximo) pior = i; });
    pegar("leituraPrincipal").textContent = quantidade === 0
        ? "Nenhum intervalo passou do limite de " + c.limite + "%."
        : quantidade + " dos " + serie.length + " intervalos passaram do limite. O maior valor foi " + Math.round(serie[pior].maximo) + "% às " + horaMinuto(serie[pior].inicio) + ".";
}

function corDoCalor(valor) {
    const pontos = [
        { ate: 0, cor: [31, 36, 85] },
        { ate: 45, cor: [79, 140, 255] },
        { ate: 65, cor: [139, 92, 246] },
        { ate: 80, cor: [245, 154, 61] },
        { ate: 100, cor: [255, 77, 109] }
    ];
    for (let i = 1; i < pontos.length; i++) {
        if (valor <= pontos[i].ate) {
            const antes = pontos[i - 1];
            const depois = pontos[i];
            const t = (valor - antes.ate) / (depois.ate - antes.ate);
            const rgb = antes.cor.map(function (cor, k) { return Math.round(cor + (depois.cor[k] - cor) * t); });
            return "rgb(" + rgb.join(",") + ")";
        }
    }
    return "rgb(255,77,109)";
}

function desenharMapaDeCalor(serie, c) {
    const linhas = {};
    const ordemDasLinhas = [];
    let pior = { valor: -1, linha: "", bloco: 0 };

    serie.forEach(function (j) {
        const hora = j.inicio.slice(8, 10) + "/" + j.inicio.slice(5, 7) + " " + j.inicio.slice(11, 13) + "h";
        const bloco = Number(j.inicio.slice(14, 16)) / MINUTOS_JANELA;
        if (!linhas[hora]) {
            linhas[hora] = new Array(12).fill(null);
            ordemDasLinhas.push(hora);
        }
        linhas[hora][bloco] = j.media;
        if (j.media > pior.valor) pior = { valor: j.media, linha: hora, bloco: bloco };
    });

    let html = '<div class="nome-dia"></div>';
    for (let b = 0; b < 12; b++) html += '<div class="hora">' + (b % 3 === 0 ? ":" + String(b * 5).padStart(2, "0") : "") + '</div>';

    ordemDasLinhas.forEach(function (hora) {
        html += '<div class="nome-dia">' + hora + '</div>';
        linhas[hora].forEach(function (valor, b) {
            if (valor === null) {
                html += '<div></div>';
                return;
            }
            const ehPior = (hora === pior.linha && b === pior.bloco);
            html += '<div class="' + (ehPior ? "pior" : "") + '" style="background:' + corDoCalor(valor) + '" title="' + hora + " :" + String(b * 5).padStart(2, "0") + " - " + formatar(valor) + '%"></div>';
        });
    });
    pegar("calor").innerHTML = html;

    pegar("tituloCalor").textContent = "Em que momentos o uso de " + c.nome + " fica mais pesado?";
    pegar("leituraCalor").textContent = "O momento mais pesado foi " + pior.linha.slice(0, 5) + " às " + pior.linha.slice(6, 8) + ":" + String(pior.bloco * 5).padStart(2, "0") + ", com média de " + Math.round(pior.valor) + "%.";
}

function desenharEstados(serie, c) {
    let ok = 0, alerta = 0, critico = 0;
    serie.forEach(function (j) {
        const estado = estadoDaJanela(j, c.limite);
        if (estado === "ok") ok++;
        else if (estado === "alerta") alerta++;
        else critico++;
    });

    criarGrafico("graficoEstados", {
        type: "doughnut",
        data: {
            labels: ["OK", "Alerta", "Crítico"],
            datasets: [{ data: [ok, alerta, critico], backgroundColor: ["#2de2c0", "#f59a3d", "#ff4d6d"], borderColor: "#14142a", borderWidth: 3 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%",
            plugins: {
                legend: { position: "bottom", labels: { boxWidth: 10, usePointStyle: true } },
                tooltip: { callbacks: { label: function (item) { return item.label + ": " + item.parsed * MINUTOS_JANELA + " minutos"; } } }
            }
        }
    });

    pegar("tituloEstados").textContent = "Quanto tempo " + c.nome + " fica em cada estado?";
    pegar("leituraEstados").textContent = ok * MINUTOS_JANELA + " min em OK, " + alerta * MINUTOS_JANELA + " min em alerta e " + critico * MINUTOS_JANELA + " min crítico.";
}

function desenharProcessos(c) {
    const temProcessos = (componenteAtual === "cpu" || componenteAtual === "ram");
    pegar("tituloProcessos").textContent = "Quais processos mais pesam em " + c.nome + "?";

    if (!temProcessos) {
        if (graficos["graficoProcessos"]) graficos["graficoProcessos"].destroy();
        pegar("comoProcessos").textContent = "Como ler: cada barra é o uso médio de um processo.";
        pegar("leituraProcessos").textContent = "Os dados da ETL só trazem o consumo por processo de CPU e RAM. Para " + c.nome + " não há essa informação.";
        return;
    }

    const coluna = (componenteAtual === "cpu") ? "cpu_media_amostral" : "ram_media_bytes";
    const doServidor = processos.filter(function (p) { return p.servidor_id === servidorAtual && p.inicio_periodo >= inicioDoPeriodo; });

    const nomes = [];
    const grupos = {};
    doServidor.forEach(function (p) {
        if (!grupos[p.nome]) {
            grupos[p.nome] = { valores: [], pesos: [] };
            nomes.push(p.nome);
        }
        grupos[p.nome].valores.push(Number(p[coluna]));
        grupos[p.nome].pesos.push(Number(p.quantidade_amostras));
    });

    const divisor = (componenteAtual === "cpu") ? 1 : GIB;
    const unidade = (componenteAtual === "cpu") ? "%" : " GiB";
    const dados = nomes.map(function (n) { return mediaPonderada(grupos[n].valores, grupos[n].pesos) / divisor; });

    const ordem = nomes.map(function (n, i) { return i; }).sort(function (a, b) { return dados[b] - dados[a]; });
    const nomesOrdenados = ordem.map(function (i) { return nomes[i].replace("SIMULADO-", ""); });
    const dadosOrdenados = ordem.map(function (i) { return dados[i]; });

    criarGrafico("graficoProcessos", {
        type: "bar",
        data: { labels: nomesOrdenados, datasets: [{ data: dadosOrdenados, backgroundColor: c.cor, borderRadius: 6 }] },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (item) { return formatar(item.parsed.x) + unidade; } } } },
            scales: { x: { ticks: { callback: function (v) { return v + unidade; } } }, y: { grid: { display: false } } }
        }
    });

    pegar("comoProcessos").textContent = componenteAtual === "cpu"
        ? "Como ler: cada barra é o uso médio de CPU do processo. Pode passar de 100% porque um processo usa vários núcleos."
        : "Como ler: cada barra é a memória média usada pelo processo.";
    pegar("leituraProcessos").textContent = "O processo \"" + nomesOrdenados[0] + "\" é o que mais pesa: média de " + formatar(dadosOrdenados[0]) + unidade + ".";
}

function desenharEpisodios(serie, c) {
    const episodios = acharEpisodios(serie, c.limite);
    episodios.sort(function (a, b) { return b.janelas - a.janelas; });

    pegar("tituloEpisodios").textContent = "Quando " + c.nome + " passou de " + c.limite + "%?";

    if (episodios.length === 0) {
        pegar("tabelaEpisodios").innerHTML = '<p class="vazio">Nenhum episódio: ' + c.nome + ' não passou do limite neste período.</p>';
        pegar("leituraEpisodios").textContent = "Bom sinal: este componente ficou dentro do limite o tempo todo.";
        return;
    }

    let linhas = "";
    episodios.slice(0, 5).forEach(function (e) {
        linhas += "<tr><td>" + diaHoraMinuto(e.inicio) + "</td><td>" + somarMinutos(e.fim, MINUTOS_JANELA) + "</td><td><b>" + e.janelas * MINUTOS_JANELA + " min</b></td><td><b>" + Math.round(e.pico) + "%</b></td></tr>";
    });
    pegar("tabelaEpisodios").innerHTML = "<table><thead><tr><th>Começou</th><th>Terminou</th><th>Duração</th><th>Maior valor</th></tr></thead><tbody>" + linhas + "</tbody></table>";

    pegar("leituraEpisodios").textContent = episodios.length + " episódio(s) acima do limite. O mais longo durou " + episodios[0].janelas * MINUTOS_JANELA + " min, começando em " + diaHoraMinuto(episodios[0].inicio) + ".";
}

function desenharTela() {
    const c = COMPONENTES[componenteAtual];
    const serie = pegarSerie(servidorAtual, componenteAtual);

    pegar("selectServidor").value = servidorAtual;
    document.querySelectorAll("#abasMetrica button").forEach(function (botao) {
        botao.classList.toggle("on", botao.dataset.metrica === componenteAtual);
    });

    desenharNumeros(serie, c);
    desenharGraficoPrincipal(serie, c);
    desenharMapaDeCalor(serie, c);
    desenharEstados(serie, c);
    desenharProcessos(c);
    desenharEpisodios(serie, c);
}

function atualizarPeriodo() {
    const janelasPorHora = 60 / MINUTOS_JANELA;
    const posicao = periodoAtual === 0 ? 0 : Math.max(0, todosInicios.length - periodoAtual * janelasPorHora);
    inicioDoPeriodo = todosInicios[posicao];

    const ultimo = todosInicios[todosInicios.length - 1];
    pegar("subtitulo").textContent = servidores.length + " servidores • período de " + diaHoraMinuto(inicioDoPeriodo) + " até " + somarMinutos(ultimo, MINUTOS_JANELA);
}

async function iniciar() {
    Chart.defaults.color = "#8888a8";
    Chart.defaults.borderColor = "#25254a";
    Chart.defaults.font.family = '"Figtree", "Segoe UI", sans-serif';

    try {
        metricas = await lerDados("/analise/metricas");
        processos = await lerDados("/analise/processos");
    } catch (erro) {
        pegar("subtitulo").textContent = "Não foi possível carregar os dados.";
        pegar("kpis").innerHTML = '<p class="leitura">Não consegui buscar os dados na rota /analise. Confira se o servidor está rodando (npm start) e abra a página por ele: http://localhost:PORTA/painel/painel_dashAnalise.html.</p>';
        return;
    }

    servidores = [];
    metricas.forEach(function (l) { if (servidores.indexOf(l.servidor_id) === -1) servidores.push(l.servidor_id); });
    servidores.sort();
    servidorAtual = servidores[0];

    todosInicios = [];
    metricas.forEach(function (l) { if (todosInicios.indexOf(l.inicio_periodo) === -1) todosInicios.push(l.inicio_periodo); });
    todosInicios.sort();
    atualizarPeriodo();

    let opcoes = "";
    servidores.forEach(function (s) { opcoes += '<option value="' + s + '">Servidor ' + s + '</option>'; });
    pegar("selectServidor").innerHTML = opcoes;
    pegar("selectServidor").addEventListener("change", function (e) {
        servidorAtual = e.target.value;
        desenharTela();
    });

    pegar("selectPeriodo").innerHTML = '<option value="0">Todo o período</option><option value="1">Última hora</option><option value="2">Últimas 2 horas</option>';
    pegar("selectPeriodo").addEventListener("change", function (e) {
        periodoAtual = Number(e.target.value);
        atualizarPeriodo();
        desenharTela();
    });

    let botoes = "";
    NOMES_COMPONENTES.forEach(function (nome) { botoes += '<button data-metrica="' + nome + '">' + COMPONENTES[nome].nome + '</button>'; });
    pegar("abasMetrica").innerHTML = botoes;
    pegar("abasMetrica").addEventListener("click", function (e) {
        const botao = e.target.closest("button");
        if (!botao) return;
        componenteAtual = botao.dataset.metrica;
        desenharTela();
    });

    desenharTela();
}

iniciar();