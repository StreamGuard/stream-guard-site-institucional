"use strict";

// Fonte temporária, separada da renderização. A futura API pode retornar este
// mesmo formato: equipamento, limites, amostras e processos da Última medição.
const DADOS_DEMONSTRACAO_DG = (() => {
    const periodos = {
        "30m": { texto: "Últimos 30 minutos", pontos: 31, passoMin: 1 },
        "1h": { texto: "Última hora", pontos: 61, passoMin: 1 },
        "24h": { texto: "Últimas 24 horas", pontos: 97, passoMin: 15 },
        "7d": { texto: "Últimos 7 dias", pontos: 169, passoMin: 60 },
        "30d": { texto: "Últimos 30 dias", pontos: 121, passoMin: 360 }
    };
    const servidores = [
        {
            nome: "srv-stream-01", ip: "10.0.1.15", so: "Ubuntu 22.04", uptime: "5 dias, 12 h",
            memoriaGiB: 64, discoGB: 1000, cpuBase: 56,
            atual: { cpu: 91, ram: 78, disco: 71, recebido: 124.8, enviado: 98.4, leitura: 110, escrita: 94 },
            limites: { cpu: { limite: 85, critico: 90 }, ram: { limite: 75, critico: 90 }, disco: { limite: 90, critico: 95 } },
            processos: [
                { nome: "ffmpeg", pesoCpu: 61, rssMiB: 1229 }, { nome: "nginx", pesoCpu: 16, rssMiB: 384 },
                { nome: "python", pesoCpu: 10, rssMiB: 760 }, { nome: "mysql", pesoCpu: 5.5, rssMiB: 896 },
                { nome: "node", pesoCpu: 4, rssMiB: 512 }, { nome: "java", pesoCpu: 2.5, rssMiB: 2458 },
                { nome: "chrome", pesoCpu: 1, rssMiB: 1843 }
            ]
        },
        {
            nome: "srv-stream-02", ip: "10.0.1.16", so: "Ubuntu 24.04", uptime: "12 dias, 3 h",
            memoriaGiB: 32, discoGB: 500, cpuBase: 35,
            atual: { cpu: 37, ram: 49, disco: 56, recebido: 43.6, enviado: 28.1, leitura: 48, escrita: 27 },
            limites: { cpu: { limite: 85, critico: 95 }, ram: { limite: 80, critico: 90 }, disco: { limite: 90, critico: 95 } },
            processos: [
                { nome: "nginx", pesoCpu: 33, rssMiB: 480 }, { nome: "node", pesoCpu: 27, rssMiB: 980 },
                { nome: "postgres", pesoCpu: 18, rssMiB: 1960 }, { nome: "redis-server", pesoCpu: 12, rssMiB: 1340 },
                { nome: "python", pesoCpu: 6, rssMiB: 620 }, { nome: "containerd", pesoCpu: 3, rssMiB: 290 },
                { nome: "systemd", pesoCpu: 1, rssMiB: 96 }
            ]
        },
        {
            nome: "srv-stream-03", ip: "10.0.1.17", so: "Debian 12", uptime: "8 dias, 7 h",
            memoriaGiB: 128, discoGB: 2000, cpuBase: 65,
            atual: { cpu: 83, ram: 93, disco: 86, recebido: 182.3, enviado: 145.6, leitura: 185, escrita: 142 },
            limites: { cpu: { limite: 80, critico: 90 }, ram: { limite: 80, critico: 90 }, disco: { limite: 85, critico: 95 } },
            processos: [
                { nome: "java", pesoCpu: 43, rssMiB: 16384 }, { nome: "ffmpeg", pesoCpu: 26, rssMiB: 6144 },
                { nome: "python", pesoCpu: 15, rssMiB: 8192 }, { nome: "postgres", pesoCpu: 9, rssMiB: 12288 },
                { nome: "nginx", pesoCpu: 4, rssMiB: 768 }, { nome: "redis-server", pesoCpu: 2, rssMiB: 4096 },
                { nome: "node", pesoCpu: 1, rssMiB: 2048 }
            ]
        },
        {
            nome: "srv-stream-04", ip: "10.0.1.18", so: "Ubuntu 22.04", uptime: "2 dias, 18 h",
            memoriaGiB: 64, discoGB: 1000, cpuBase: 47,
            atual: { cpu: 62, ram: 71, disco: 96, recebido: 76.2, enviado: 61.9, leitura: 240, escrita: 196 },
            limites: { cpu: { limite: 85, critico: 95 }, ram: { limite: 80, critico: 90 }, disco: { limite: 90, critico: 95 } },
            processos: [
                { nome: "postgres", pesoCpu: 38, rssMiB: 8192 }, { nome: "ffmpeg", pesoCpu: 29, rssMiB: 2048 },
                { nome: "rsync", pesoCpu: 17, rssMiB: 256 }, { nome: "python", pesoCpu: 8, rssMiB: 1536 },
                { nome: "node", pesoCpu: 5, rssMiB: 1024 }, { nome: "nginx", pesoCpu: 2, rssMiB: 384 },
                { nome: "redis-server", pesoCpu: 1, rssMiB: 3072 }
            ]
        }
    ];
    const arredondar = (valor) => Math.round(valor * 10) / 10;
    const limitar = (valor, min, max) => Math.max(min, Math.min(max, valor));

    function obterDados(nome, periodo) {
        const indice = servidores.findIndex((servidor) => servidor.nome === nome);
        const servidor = servidores[indice];
        const configuracao = periodos[periodo];
        const ultimaMedicao = Date.parse("2026-11-12T15:00:00-03:00") - indice * 180000;
        const amostras = Array.from({ length: configuracao.pontos }, (_, i) => {
            const idadeMin = (configuracao.pontos - 1 - i) * configuracao.passoMin;
            const instante = ultimaMedicao - idadeMin * 60000;
            const fase = instante / 60000 + indice * 137;
            const onda = Math.sin(fase / 83) * 8 + Math.cos(fase / 31) * 4;
            // As janelas compartilham a mesma linha temporal e Última medição.
            const aproximacao = Math.exp(-idadeMin / 50);
            const cpuHistorica = servidor.cpuBase + onda + 12 * Math.exp(-idadeMin / 480);
            const cpu = limitar(cpuHistorica * (1 - aproximacao) + servidor.atual.cpu * aproximacao, 2, 100);
            const variar = (base, amplitude, divisor) => arredondar(Math.max(0, base + amplitude * Math.sin(idadeMin / divisor) * (1 - aproximacao)));
            return {
                instante, cpu: arredondar(cpu),
                ram: arredondar(limitar(variar(servidor.atual.ram - 12 * (1 - aproximacao), 5, 170), 2, 100)),
                disco: arredondar(limitar(servidor.atual.disco - Math.min(9, idadeMin / 4800), 1, 100)),
                recebido: variar(servidor.atual.recebido, 28 + indice * 4, 70),
                enviado: variar(servidor.atual.enviado, 20 + indice * 3, 93),
                leitura: variar(servidor.atual.leitura, 36, 52),
                escrita: variar(servidor.atual.escrita, 25, 81)
            };
        });
        const pesoTotal = servidor.processos.reduce((total, processo) => total + processo.pesoCpu, 0);
        const processos = servidor.processos.map((processo) => ({
            nome: processo.nome,
            cpu: arredondar(processo.pesoCpu / pesoTotal * amostras.at(-1).cpu),
            rssMiB: processo.rssMiB
        }));
        return { servidor, periodo: configuracao, amostras, processos };
    }
    return { obterDados };
})();

document.addEventListener("DOMContentLoaded", () => {
    const el = (id) => document.getElementById(id);
    const painel = document.querySelector(".dg-dashboard");
    if (!painel) return;
    const graficos = new Map();
    const estilo = getComputedStyle(painel);
    const cor = (nome) => estilo.getPropertyValue(nome).trim();
    const cores = { cpu: cor("--azul"), recebido: cor("--verde"), enviado: cor("--azul"), leitura: cor("--azul"), escrita: cor("--roxo"), limite: cor("--vermelho"), texto: cor("--dg-muted"), grade: cor("--borda") };
    const numero = (valor, casas = 1) => valor.toLocaleString("pt-BR", { maximumFractionDigits: casas });
    const horario = (instante, comData = false) => new Date(instante).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo", ...(comData ? { day: "2-digit", month: "2-digit" } : {}), hour: "2-digit", minute: "2-digit"
    });
    const dataCompleta = (instante) => new Date(instante).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
    const rotulos = { cpu: "CPU", ram: "Memória RAM", disco: "Disco" };
    const estados = { ok: "Normal", alerta: "Atenção", critico: "Crítico" };
    function estado(valor, configuracao) {
        return valor >= configuracao.critico ? "critico" : valor > configuracao.limite ? "alerta" : "ok";
    }

    function renderizarEquipamento(dados) {
        const servidor = dados.servidor;
        el("dgEquipamento").innerHTML = [["IP", servidor.ip], ["SO", servidor.so], ["Uptime", servidor.uptime]]
            .map(([nome, valor]) => `<div><dt>${nome}:</dt><dd>${valor}</dd></div>`).join("");
        el("dgUltimaMedicao").textContent = `Última medição: ${dataCompleta(dados.amostras.at(-1).instante)} (Brasília).`;
    }

    function renderizarIndicadores(dados) {
        const ultima = dados.amostras.at(-1);
        el("cardsMetricas").innerHTML = ["cpu", "ram", "disco"].map((recurso) => {
            const valor = ultima[recurso];
            const limite = dados.servidor.limites[recurso];
            const situacao = estado(valor, limite);
            const icone = { cpu: "sg-grid", ram: "sg-layers", disco: "sg-server" }[recurso];
            const detalhe = recurso === "ram"
                ? `${numero(valor / 100 * dados.servidor.memoriaGiB)} de ${dados.servidor.memoriaGiB} GiB em uso`
                : recurso === "disco"
                    ? `${numero(valor / 100 * dados.servidor.discoGB)} de ${numero(dados.servidor.discoGB)} GB ocupados`
                    : "Utilização total do servidor";
            return `<article class="dg-metric dg-${situacao}" data-recurso="${recurso}">
                <div class="dg-metric-heading"><h2 class="dg-metric-label"><svg class="sg-ic" aria-hidden="true"><use href="#${icone}"/></svg>${rotulos[recurso]}</h2>
                    <span class="dg-badge"><i class="bolinha" aria-hidden="true"></i>${estados[situacao]}</span></div>
                <p class="dg-value">${numero(valor)}<span>%</span></p>
                <div class="dg-progress" aria-hidden="true"><span style="width:${valor}%"></span></div>
                <p class="dg-metric-detail">${detalhe}<br>Limite configurado: ${limite.limite}%</p>
            </article>`;
        }).join("") + `<article class="dg-metric" data-recurso="rede">
            <div class="dg-metric-heading"><h2 class="dg-metric-label"><svg class="sg-ic" aria-hidden="true"><path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/></svg>Rede</h2></div>
            <dl class="dg-network-values"><div><dt>↓ Recebido</dt><dd class="dg-received">${numero(ultima.recebido)} <span>MB/s</span></dd></div>
                <div><dt>↑ Enviado</dt><dd class="dg-sent">${numero(ultima.enviado)} <span>MB/s</span></dd></div></dl>
        </article>`;
    }

    function renderizarAlertas(dados) {
        const ultima = dados.amostras.at(-1);
        const alertas = Object.entries(dados.servidor.limites).filter(([recurso, limite]) => ultima[recurso] > limite.limite);
        el("dgContadorAlertas").textContent = `${alertas.length} ${alertas.length === 1 ? "ativo" : "ativos"}`;
        el("dgListaAlertas").innerHTML = alertas.length ? alertas.map(([recurso, configuracao]) => {
            let inicio = dados.amostras.length - 1;
            while (inicio > 0 && dados.amostras[inicio - 1][recurso] > configuracao.limite) inicio--;
            const instante = dados.amostras[inicio].instante;
            const situacao = estado(ultima[recurso], configuracao);
            return `<li class="dg-alert dg-${situacao}" data-alerta="${recurso}">
                <span class="dg-badge"><i class="bolinha" aria-hidden="true"></i>${estados[situacao]}</span>
                <strong>${rotulos[recurso]} acima do limite</strong>
                <p>Observado: ${numero(ultima[recurso])}% · limite: ${configuracao.limite}%</p>
                <time datetime="${new Date(instante).toISOString()}">${inicio === 0 ? "Desde a primeira amostra" : "Início observado"}: ${horario(instante, true)}</time>
            </li>`;
        }).join("") : `<li class="dg-alert dg-ok"><span class="dg-badge"><i class="bolinha" aria-hidden="true"></i>Normal</span>
            <strong>Nenhum alerta ativo</strong><p>CPU, memória e disco dentro dos limites na Última medição.</p>
            <time datetime="${new Date(ultima.instante).toISOString()}">Medição: ${horario(ultima.instante, true)}</time></li>`;
    }

    function renderizarEstatisticas(dados) {
        const media = (recurso) => dados.amostras.reduce((soma, amostra) => soma + amostra[recurso], 0) / dados.amostras.length;
        const acima = dados.amostras.filter((amostra) => amostra.cpu > dados.servidor.limites.cpu.limite).length;
        el("dgEstatisticas").innerHTML = [
            ["CPU média", `${numero(media("cpu"))}%`],
            ["CPU máxima", `${numero(Math.max(...dados.amostras.map((amostra) => amostra.cpu)))}%`],
            ["Amostras > limite (CPU)", `${acima} de ${dados.amostras.length}`],
            ["Memória média", `${numero(media("ram"))}%`]
        ].map(([nome, valor]) => `<div><dt>${nome}</dt><dd>${valor}</dd></div>`).join("");
        el("dgIntervalo").textContent = `Amostras a cada ${dados.periodo.passoMin < 60 ? `${dados.periodo.passoMin} min` : `${dados.periodo.passoMin / 60} h`}. Horários de Brasília.`;
        painel.querySelectorAll("[data-dg-periodo]").forEach((elemento) => {
            elemento.textContent = `${dados.periodo.texto} · ${dados.amostras.length} amostras`;
        });
        painel.querySelectorAll("[data-dg-processos-periodo]").forEach((elemento) => {
            elemento.textContent = `${dados.periodo.texto} · Última amostra às ${horario(dados.amostras.at(-1).instante)}`;
        });
        el("dgLegendaLimite").textContent = `Limite (${dados.servidor.limites.cpu.limite}%)`;
    }

    function opcoesLinha(unidade, dados) {
        return {
            responsive: true, maintainAspectRatio: false, animation: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: {
                    title: (itens) => dataCompleta(dados.amostras[itens[0].dataIndex].instante),
                    label: (item) => `${item.dataset.label}: ${numero(item.parsed.y)}${unidade === "%" ? "%" : ` ${unidade}`}`
                } }
            },
            scales: {
                x: { grid: { display: false }, border: { display: false }, ticks: { color: cores.texto, maxTicksLimit: 5, maxRotation: 0, autoSkip: true, font: { size: 10 } } },
                y: { min: 0, ...(unidade === "%" ? { max: 100 } : {}),
                    title: { display: true, text: unidade, color: cores.texto, font: { size: 10 } },
                    border: { display: false }, grid: { color: cores.grade },
                    ticks: { color: cores.texto, maxTicksLimit: 5, font: { size: 10 }, callback: (valor) => numero(valor, 0) }
                }
            }
        };
    }

    function linha(rotulo, valores, coloracao, preenchimento = false) {
        return { label: rotulo, data: valores, borderColor: coloracao,
            backgroundColor: coloracao + "18", fill: preenchimento,
            borderWidth: 2, tension: 0.25, pointRadius: 0, pointHitRadius: 12, pointHoverRadius: 3 };
    }

    function atualizarGrafico(id, configuracao, descricao) {
        el(id).setAttribute("aria-label", descricao);
        const existente = graficos.get(id);
        if (existente) {
            existente.data = configuracao.data;
            existente.options = configuracao.options;
            existente.update("none");
        } else {
            graficos.set(id, new Chart(el(id), configuracao));
        }
    }

    function renderizarProcessos(id, processos, recurso, unidade, coloracao, contexto) {
        const ordenados = [...processos].sort((a, b) => b[recurso] - a[recurso]).slice(0, 5);
        atualizarGrafico(id, {
            type: "bar",
            data: { labels: ordenados.map((processo) => processo.nome), datasets: [{
                label: recurso === "cpu" ? "CPU (%)" : "Memória RSS (MiB)",
                data: ordenados.map((processo) => processo[recurso]),
                backgroundColor: coloracao, borderRadius: 4, maxBarThickness: 16
            }] },
            options: {
                indexAxis: "y", responsive: true, maintainAspectRatio: false, animation: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: {
                    label: (item) => `${item.dataset.label}: ${numero(item.parsed.x)}${unidade === "%" ? "%" : ` ${unidade}`}`
                } } },
                scales: {
                    x: { beginAtZero: true, ...(recurso === "cpu" ? { max: 100 } : {}), border: { display: false },
                        grid: { color: cores.grade }, ticks: { color: cores.texto, maxTicksLimit: 4, font: { size: 10 }, callback: (valor) => numero(valor, 0) } },
                    y: { grid: { display: false }, border: { display: false }, ticks: { color: cores.texto, font: { size: 11 } } }
                }
            }
        }, `${contexto}. ${ordenados.map((processo) => `${processo.nome}: ${numero(processo[recurso])} ${unidade}`).join("; ")}.`);
    }

    function renderizarGraficos(dados) {
        if (typeof Chart !== "function") {
            el("dgErroGraficos").hidden = false;
            painel.classList.add("dg-no-charts");
            return;
        }
        const labels = dados.amostras.map((amostra) => dados.periodo.passoMin >= 60
            ? new Date(amostra.instante).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" })
            : horario(amostra.instante));
        const valores = (recurso) => dados.amostras.map((amostra) => amostra[recurso]);
        const contexto = `${dados.servidor.nome}, ${dados.periodo.texto.toLowerCase()}`;
        atualizarGrafico("dgChartCpu", {
            type: "line", data: { labels, datasets: [
                linha("CPU", valores("cpu"), cores.cpu, true),
                { ...linha("Limite configurado", dados.amostras.map(() => dados.servidor.limites.cpu.limite), cores.limite), borderDash: [6, 5], borderWidth: 1.5, pointHoverRadius: 0 }
            ] }, options: opcoesLinha("%", dados)
        }, `Evolução da CPU em porcentagem, ${contexto}. Limite: ${dados.servidor.limites.cpu.limite}%. Última medição: ${numero(dados.amostras.at(-1).cpu)}%.`);
        atualizarGrafico("dgChartRede", {
            type: "line", data: { labels, datasets: [
                linha("Recebido", valores("recebido"), cores.recebido, true), linha("Enviado", valores("enviado"), cores.enviado)
            ] }, options: opcoesLinha("MB/s", dados)
        }, `Tráfego de rede recebido e enviado em MB/s, ${contexto}.`);
        atualizarGrafico("dgChartDisco", {
            type: "line", data: { labels, datasets: [
                linha("Leitura", valores("leitura"), cores.leitura, true), linha("Escrita", valores("escrita"), cores.escrita)
            ] }, options: opcoesLinha("MB/s", dados)
        }, `Atividade do disco em leitura e escrita em MB/s, ${contexto}.`);
        renderizarProcessos("dgChartProcessosCpu", dados.processos, "cpu", "%", cores.limite, `Top 5 processos por CPU na última amostra, ${contexto}`);
        renderizarProcessos("dgChartProcessosRam", dados.processos, "rssMiB", "MiB", cores.escrita, `Top 5 processos por memória RSS na última amostra, ${contexto}`);
    }

    function carregar() {
        const dados = DADOS_DEMONSTRACAO_DG.obterDados(el("selectEquipamento").value, el("selectPeriodo").value);
        renderizarEquipamento(dados);
        renderizarIndicadores(dados);
        renderizarAlertas(dados);
        renderizarEstatisticas(dados);
        renderizarGraficos(dados);
        el("dgAtualizacao").textContent = `${dados.servidor.nome}: ${dados.periodo.texto.toLowerCase()}, ${dados.amostras.length} amostras. Painel atualizado.`;
    }

    el("selectEquipamento").addEventListener("change", carregar);
    el("selectPeriodo").addEventListener("change", carregar);
    carregar();
});
