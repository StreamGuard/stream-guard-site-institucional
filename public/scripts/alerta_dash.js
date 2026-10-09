document.addEventListener("DOMContentLoaded", () => {
    // ---------- Configuração ----------
    const METRICAS = {
        CPU: { cor: "#00e699", limite: 85, base: 55 },
        RAM: { cor: "#a259ff", limite: 90, base: 70 },
        Disco: { cor: "#4da3ff", limite: 90, base: 34 },
        Rede: { cor: "#ff9f1c", limite: 75, base: 55 }
    };
    const PERIODOS = {
        "30m": { pontos: 30, passoMin: 1, texto: "Últimos 30 minutos" },
        "1h": { pontos: 12, passoMin: 5, texto: "Última hora" },
        "24h": { pontos: 24, passoMin: 60, texto: "Últimas 24 horas" },
        "7d": { pontos: 28, passoMin: 360, texto: "Últimos 7 dias" },
        "30d": { pontos: 30, passoMin: 1440, texto: "Últimos 30 dias" }
    };
    const SERVIDORES = [ // visão geral 
        { nome: "srv-stream-01", comp: "RAM", valor: 92 },
        { nome: "srv-stream-07", comp: "CPU", valor: 89 },
        { nome: "srv-stream-12", comp: "Rede", valor: 81 },
        { nome: "srv-stream-03", comp: "Rede", valor: 78 },
        { nome: "srv-stream-19", comp: "RAM", valor: 76 }
    ];
    const TOTAL_ATIVOS = 32;

    const el = (id) => document.getElementById(id);
    let periodo = "30m";
    let visiveis = new Set(["CPU", "RAM"]); // set com métricas exibidas no meu gráfico
    let serie = {};      // { CPU: [..], ... }
    let incidentes = []; // lista completa do período
    let chart; // Guardo o gráfico aonde o destruo e recrio

    // ---------- Dados simulados ---------
    function rng(seed) {
        return () => (seed = (seed * 16807) % 2147483647) / 2147483647; // aqui eu retorno uma função que a cada chamada me gera um número entre 0 e 1, 
    }
    function gerarSerie(equip, per) {
        const { pontos } = PERIODOS[per];
        const out = {};
        let s = 7;
        for (const c of equip + per + "x") s = (s * 31 + c.charCodeAt(0)) % 2147483647;
        const r = rng(s || 1);
        Object.entries(METRICAS).forEach(([nome, m]) => {
            let v = m.base, arr = [];
            for (let i = 0; i < pontos; i++) {
                v += (r() - 0.5) * 14 + (m.base - v) * 0.05;
                if (i > pontos - 4 && nome === "RAM") v += 6; // tendência recente
                v = Math.max(5, Math.min(99, v));
                arr.push(Math.round(v));
            }
            out[nome] = arr;
        });
        return out;
    }
    function gerarLabels(per) {
        const { pontos, passoMin } = PERIODOS[per];
        const agora = Date.now();
        return Array.from({ length: pontos }, (_, i) => {
            const d = new Date(agora - (pontos - 1 - i) * passoMin * 60000);
            return passoMin >= 1440
                ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                : passoMin >= 360
                    ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + d.getHours() + "h"
                    : d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        });
    }

    // ---------- Incidentes: faixas contíguas perto/acima do limite ----------
    function detectarIncidentes(labels, equip) {
        const lista = [];
        const passo = PERIODOS[periodo].passoMin;
        Object.entries(METRICAS).forEach(([nome, m]) => {
            let ini = null, pico = 0;
            const fecha = (fim) => {
                // aqui fecho o trecho e adicion à lista um objeto com data, equipamento, componente, severidade
                const n = fim - ini;
                lista.push({
                    data: labels[ini], equip: equip === "todos" ? "srv-stream-01" : equip, comp: nome,
                    sev: pico > m.limite ? "Crítico" : "Alerta", pico, limite: m.limite,
                    duracaoMin: n * passo, aberto: fim >= labels.length
                });
                ini = null; pico = 0;
            };
            serie[nome].forEach((v, i) => {
                if (v >= m.limite - 5) { if (ini === null) ini = i; pico = Math.max(pico, v); }
                else if (ini !== null) fecha(i);
            });
            if (ini !== null) fecha(serie[nome].length);
        });
        return lista;
    }
    function fmtDuracao(min) {
        if (min < 60) return min + " min";
        if (min < 1440) return (min / 60).toFixed(1).replace(".0", "") + " h";
        return Math.round(min / 1440) + " d";
    }

    // ---------- Status por valor ----------
    function status(nome, v) {
        const l = METRICAS[nome].limite;
        return v > l ? "critico" : v >= l - 5 ? "alerta" : "ok";
    }
    const ROTULO = { ok: "● OK", alerta: "● ALERTA", critico: "● CRÍTICO" };

    // ---------- Renderizações ----------
    function renderCards() {
        el("cardsMetricas").innerHTML = Object.keys(METRICAS).map((nome) => {
            const d = serie[nome], ult = d[d.length - 1], ant = d[d.length - 2] ?? ult;
            const media = Math.round(d.reduce((a, b) => a + b, 0) / d.length), pico = Math.max(...d);
            const st = status(nome, ult), delta = ult - ant;
            return `<div class="card card-${st}">
        <div class="card-cabecalho"><span>${nome.toUpperCase()}</span><span class="tag tag-${st}">${ROTULO[st]}</span></div>
        <div class="card-valor">${ult}<span>%</span></div>
        <div class="card-progresso"><div class="barra" style="width:${ult}%"></div></div>
        <div class="card-detalhe"><span>Média ${media}% • Pico ${pico}%</span>
          <span class="card-variacao ${delta > 0 && st !== "ok" ? "perigo" : "positiva"}">${delta >= 0 ? "+" : ""}${delta} p.p. vs. leitura anterior</span></div>
      </div>`;
        }).join("");
    }

    function renderBanner() {
        const crit = Object.keys(METRICAS).filter((n) => status(n, serie[n].at(-1)) === "critico");
        const alt = Object.keys(METRICAS).filter((n) => status(n, serie[n].at(-1)) === "alerta");
        const b = el("bannerAlerta");
        b.style.display = crit.length || alt.length ? "flex" : "none";
        b.innerHTML = `<div class="alerta-info"><span class="icone-alerta">⚠️</span>
      <strong>${crit.length ? crit.map((n) => `${n} acima do limite (${serie[n].at(-1)}%)`).join(", ") : "Nenhum componente crítico"}</strong></div>
      <div class="alerta-link"><span>${alt.length ? alt.map((n) => `${n} próxima do limite (${serie[n].at(-1)}%)`).join(", ") : ""}</span>
      <a href="#painel-incidentes">VER INCIDENTES →</a></div>`;
    }

    function renderStatus() {
        const nomes = { CPU: "CPU", RAM: "Memória RAM", Disco: "Disco", Rede: "Placa de rede" };
        const itens = Object.keys(METRICAS).map((n) => {
            const v = serie[n].at(-1), st = status(n, v);
            return `<li class="${st !== "ok" ? "item-" + st : ""}"><div><strong>${nomes[n]}</strong>
        <small>${v}% • limite ${METRICAS[n].limite}%</small></div><span class="tag tag-${st}">${ROTULO[st]}</span></li>`;
        });
        itens.push(`<li><div><strong>Fonte de energia</strong><small>Operação estável</small></div><span class="tag tag-ok">● OK</span></li>`);
        el("listaStatus").innerHTML = itens.join("");
    }

    function renderVisaoGeral() {
        const crit = SERVIDORES.filter((s) => s.valor > METRICAS[s.comp].limite).length;
        const alt = SERVIDORES.length - crit;
        el("cntCritico").textContent = crit;
        el("cntAlerta").textContent = alt;
        el("cntOk").textContent = TOTAL_ATIVOS - crit - alt;
        el("listaRanking").innerHTML = [...SERVIDORES].sort((a, b) => b.valor - a.valor).map((s) => {
            const st = s.valor > METRICAS[s.comp].limite ? "critico" : "alerta";
            return `<li><span>${s.nome}<small>${s.comp} ${s.valor}%</small></span><span class="tag tag-${st}">${ROTULO[st]}</span></li>`;
        }).join("");
    }

    function renderTabela() {
        const sev = el("filtroSeveridade").value, comp = el("filtroComponente").value;
        const linhas = incidentes.filter((i) => (!sev || i.sev === sev) && (!comp || i.comp === comp));
        el("subIncidentes").textContent = `${PERIODOS[periodo].texto} • ${linhas.length} registro(s)`;
        el("tbodyIncidentes").innerHTML = linhas.length
            ? linhas.map((i) => `<tr><td>${i.data}</td><td>${i.equip}</td><td>${i.comp}</td>
          <td><span class="tag tag-${i.sev === "Crítico" ? "critico" : "alerta"}">${i.sev}</span></td>
          <td>${i.pico}%</td><td>${i.limite}%</td><td>${fmtDuracao(i.duracaoMin)}</td>
          <td>${i.aberto ? "Em aberto" : "Resolvido"}</td></tr>`).join("")
            : `<tr><td colspan="8" class="vazio">Nenhum incidente neste período com os filtros atuais.</td></tr>`;
        return linhas;
    }

    // ---------- Gráfico ----------
    const limitPlugin = {
        id: "limitLine",
        afterDraw(c) {
            const { ctx, chartArea: { left, right }, scales: { y } } = c;
            ctx.save();
            visiveis.forEach((n) => {
                const yy = y.getPixelForValue(METRICAS[n].limite);
                ctx.beginPath(); ctx.setLineDash([5, 4]);
                ctx.strokeStyle = METRICAS[n].cor; ctx.globalAlpha = 0.7; ctx.lineWidth = 1;
                ctx.moveTo(left, yy); ctx.lineTo(right, yy); ctx.stroke();
                ctx.setLineDash([]); ctx.fillStyle = METRICAS[n].cor; ctx.font = "11px sans-serif";
                ctx.fillText(`Limite ${n} ${METRICAS[n].limite}%`, right - 100, yy - 5);
            });
            ctx.restore();
        }
    };

    function datasets() {
        const ds = [];
        visiveis.forEach((n) => {
            ds.push({ label: n, data: serie[n], borderColor: METRICAS[n].cor, borderWidth: 2, tension: 0.4, pointRadius: 0 });
            // marcações de incidente (▲) nos pontos perto/acima do limite
            ds.push({
                label: `Incidente ${n}`, type: "line", showLine: false,
                data: serie[n].map((v) => (v >= METRICAS[n].limite - 5 ? v : null)),
                pointStyle: "triangle", pointRadius: 6, pointBackgroundColor: "#ff002b", pointBorderColor: "#ff002b"
            });
        });
        return ds;
    }

    function desenharGrafico(labels) {
        const cfg = {
            type: "line",
            data: { labels, datasets: datasets() },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: {
                        position: "top", align: "start",
                        labels: { color: "#a0a5b5", usePointStyle: true, boxWidth: 8, filter: (i) => !i.text.startsWith("Incidente") }
                    },
                    tooltip: { filter: (i) => i.raw !== null }
                },
                scales: {
                    x: { grid: { color: "#1e2235" }, ticks: { color: "#6c728f", maxTicksLimit: 8 } },
                    y: { min: 0, max: 100, grid: { color: "#1e2235" }, ticks: { color: "#6c728f", stepSize: 20, callback: (v) => v + "%" } }
                }
            },
          
        };
        if (chart) chart.destroy();
        chart = new Chart(el("chartUsoTempoReal").getContext("2d"), cfg);
    }

    function renderToggles() {
        el("togglesMetricas").innerHTML = Object.entries(METRICAS).map(([n, m]) =>
            `<span class="chip ${visiveis.has(n) ? "on" : ""}" style="--cor:${m.cor}" role="button" tabindex="0" data-m="${n}"><i></i>${n}</span>`
        ).join("");
    }

    // ---------- Atualização geral ----------
    let labels = [];
    function carregar() {
        const equip = el("selectEquipamento").value;
        serie = gerarSerie(equip, periodo);
        labels = gerarLabels(periodo);
        incidentes = detectarIncidentes(labels, equip);
        el("subPeriodo").textContent = PERIODOS[periodo].texto;
        renderCards(); renderBanner(); renderStatus(); renderTabela(); desenharGrafico(labels);
    }

    // ---------- Eventos ----------
    el("grupoPeriodo").addEventListener("click", (e) => {
        const b = e.target.closest(".btn-periodo"); if (!b) return;
        document.querySelectorAll(".btn-periodo").forEach((x) => x.classList.remove("ativo"));
        b.classList.add("ativo"); periodo = b.dataset.p; carregar();
    });
    function alternar(e) {
        const c = e.target.closest(".chip"); if (!c) return;
        if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
        const n = c.dataset.m;
        if (visiveis.has(n)) { if (visiveis.size > 1) visiveis.delete(n); } else visiveis.add(n);
        renderToggles(); chart.data.datasets = datasets(); chart.update();
    }
    el("togglesMetricas").addEventListener("click", alternar);
    el("togglesMetricas").addEventListener("keydown", alternar);
    el("selectEquipamento").addEventListener("change", carregar);
    el("filtroSeveridade").addEventListener("change", renderTabela);
    el("filtroComponente").addEventListener("change", renderTabela);

    el("btnExportar").addEventListener("click", () => {
        const linhas = renderTabela();
        const csv = ["Data/hora;Equipamento;Componente;Severidade;Pico(%);Limite(%);Duracao(min);Status",
            ...linhas.map((i) => [i.data, i.equip, i.comp, i.sev, i.pico, i.limite, i.duracaoMin, i.aberto ? "Em aberto" : "Resolvido"].join(";"))
        ].join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
        a.download = `incidentes_${periodo}.csv`; a.click(); URL.revokeObjectURL(a.href);
    });

    // "Atualizado há X segundos" dinâmico
    let ultima = Date.now();
    setInterval(() => {
        const s = Math.floor((Date.now() - ultima) / 1000);
        el("txtAtualizacao").textContent = s < 5 ? "Atualizado agora" : `Atualizado há ${s} segundos`;
        if (s >= 30) { ultima = Date.now(); if (periodo === "30m" || periodo === "1h") carregar(); }
    }, 1000);

    renderToggles(); renderVisaoGeral(); carregar();
});