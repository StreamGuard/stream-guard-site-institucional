// Tela "Data Lake": volume, custo, qualidade e saúde do ETL.
// Os dados chegam no formato do JSON do backend (veja painel_dadosMock.js).
document.addEventListener("DOMContentLoaded", async () => {
    // ---------- Configuração ----------
    const SILENCIO_MIN = 15;      // sem lote há mais que isso: servidor silencioso
    const ALERTA_REJEICAO = 3;    // % de rejeição para destacar
    const GOLD_ATRASADO_MIN = 10;

    const el = (id) => document.getElementById(id);
    let dados = {};
    let servidores = [];
    let dias = 30;
    let base = "total";
    let grafCrescimento = null;
    let grafRejeicao = null;

    // ---------- Dados ----------
    // Hoje devolve o mock. Com o backend pronto, troque pelo fetch:
    //   const resposta = await fetch("/insights/data-lake");
    //   return resposta.json();
    async function carregarDados() {
        return DADOS_MOCK.dataLake;
    }

    // ---------- Formatação ----------
    const numero = (valor, casas = 0) =>
        valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

    const dinheiro = (gb) =>
        "US$ " + (gb * dados.preco_gb_mes).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const minutosDesde = (dataISO) => (Date.now() - new Date(dataISO).getTime()) / 60000;

    function idade(minutos) {
        if (minutos < 1) return "agora";
        if (minutos < 60) return `${Math.round(minutos)} min`;
        if (minutos < 2880) return `${Math.round(minutos / 60)} h`;
        return `${Math.round(minutos / 1440)} d`;
    }

    function dataCurta(dataISO) {
        return new Date(dataISO).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    }

    function dataHora(dataISO) {
        const data = new Date(dataISO);
        return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " +
            data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }

    function escapar(texto) {
        const div = document.createElement("div");
        div.textContent = texto;
        return div.innerHTML;
    }

    const porcentagem = (parte, total) => (total ? (parte / total) * 100 : 0);

    // ---------- Preparação ----------
    function prepararServidores() {
        const nomeEmpresa = {};
        dados.empresas.forEach((e) => { nomeEmpresa[e.id] = e.nome; });

        return dados.servidores.map((s) => {
            const rej = s.rejeicoes_por_periodo[dias];
            return {
                ...s,
                empresa: nomeEmpresa[s.empresa_id],
                minutosSemLote: minutosDesde(s.ultimo_lote_em),
                taxaRejeicao: porcentagem(rej.linhas_rejeitadas, rej.linhas_recebidas),
                linhasRejeitadas: rej.linhas_rejeitadas,
                totalGb: s.bronze_gb + s.silver_gb + s.gold_gb
            };
        });
    }

    // Últimos N dias de uma lista diária.
    const ultimosDias = (lista) => lista.slice(-dias);

    // ---------- Cards ----------
    function card(classe, titulo, fonte, valor, unidade, detalhe) {
        const rotulo = { lake: "Lake", rejeitados: "Rejeitados" }[fonte];
        return `
            <article class="card ${classe}">
                <header class="card-cabecalho">
                    <h3>${titulo}</h3>
                    <span class="fonte fonte-${fonte}">${rotulo}</span>
                </header>
                <p class="card-valor">${valor} ${unidade ? `<small>${unidade}</small>` : ""}</p>
                <p class="card-detalhe">${detalhe}</p>
            </article>`;
    }

    function desenharCards() {
        const { bronze_gb, silver_gb, gold_gb } = dados.camadas;
        const totalGb = bronze_gb + silver_gb + gold_gb;

        const recebidas = ultimosDias(dados.rejeicoes_por_dia).reduce((t, d) => t + d.linhas_recebidas, 0);
        const rejeitadas = ultimosDias(dados.rejeicoes_por_dia).reduce((t, d) => t + d.linhas_rejeitadas, 0);
        const taxa = porcentagem(rejeitadas, recebidas);

        const silenciosos = servidores.filter((s) => s.minutosSemLote > SILENCIO_MIN).length;

        const ultimas = dados.execucoes.slice(0, 10);
        const falhas = ultimas.filter((e) => e.situacao !== "concluida").length;
        const goldMin = minutosDesde(dados.ultimo_gold_em);

        el("cardsKpi").innerHTML = [
            card("", "Volume total", "lake", numero(totalGb, 1), "GB", `Crescendo ${numero(dados.crescimento_gb_semana, 1)} GB por semana`),
            card("card-roxo", "Custo estimado", "lake", dinheiro(totalGb), "/mês", `Preço de referência US$ ${numero(dados.preco_gb_mes, 3)} por GB`),
            card(taxa > ALERTA_REJEICAO ? "card-alerta" : "card-verde", "Taxa de rejeição", "rejeitados", numero(taxa, 2), "%",
                `${numero(rejeitadas)} de ${numero(recebidas)} linhas em ${dias} dias`),
            card(silenciosos ? "card-alerta" : "card-verde", "Servidores sem enviar", "lake", silenciosos, `de ${servidores.length}`,
                `Sem lote há mais de ${SILENCIO_MIN} min`),
            card(falhas ? "card-alerta" : "card-verde", "Falhas do ETL", "lake", falhas, `em ${ultimas.length}`, "Últimas execuções"),
            card(goldMin > GOLD_ATRASADO_MIN ? "card-alerta" : "card-verde", "Último Gold", "lake", Math.round(goldMin), "min atrás",
                goldMin > GOLD_ATRASADO_MIN ? "Processamento atrasado" : "Processamento em dia")
        ].join("");
    }

    // ---------- Camadas ----------
    function desenharCamadas() {
        const camadas = [
            { nome: "Bronze (bruto)", gb: dados.camadas.bronze_gb, classe: "camada-bronze" },
            { nome: "Silver (limpo)", gb: dados.camadas.silver_gb, classe: "camada-silver" },
            { nome: "Gold (resumos)", gb: dados.camadas.gold_gb, classe: "camada-gold" }
        ];
        const maior = Math.max(...camadas.map((c) => c.gb));

        el("listaCamadas").innerHTML = camadas.map((c) => `
            <li class="${c.classe}">
                <p class="ranking-linha">
                    <span class="ranking-nome">${c.nome}</span>
                    <span class="ranking-valor">${numero(c.gb, 1)} GB · ${dinheiro(c.gb)}/mês</span>
                </p>
                <meter min="0" max="${maior}" value="${c.gb}">${numero(c.gb, 1)} GB</meter>
            </li>`).join("");
    }

    // ---------- Armazenamento por empresa ----------
    function desenharEmpresas() {
        const porEmpresa = dados.empresas.map((empresa) => {
            const doGrupo = servidores.filter((s) => s.empresa_id === empresa.id);
            const soma = (campo) => doGrupo.reduce((t, s) => t + s[campo], 0);
            const divisor = base === "servidor" ? doGrupo.length : 1;
            return {
                nome: empresa.nome,
                bronze: soma("bronze_gb") / divisor,
                silver: soma("silver_gb") / divisor,
                gold: soma("gold_gb") / divisor
            };
        }).sort((a, b) => (b.bronze + b.silver + b.gold) - (a.bronze + a.silver + a.gold));

        const maximo = Math.max(...porEmpresa.map((e) => e.bronze + e.silver + e.gold));
        const casas = base === "servidor" ? 2 : 1;

        el("subEmpresas").textContent = base === "servidor"
            ? "GB médios por servidor (mostra quem consome mais por máquina)"
            : "GB totais de cada empresa nas três camadas";

        el("rankEmpresas").innerHTML = porEmpresa.slice(0, 8).map((e) => {
            const total = e.bronze + e.silver + e.gold;
            const largura = (valor) => (valor / maximo) * 100;
            return `
            <li>
                <p class="ranking-linha">
                    <span class="ranking-nome">${escapar(e.nome)}</span>
                    <span class="ranking-valor">${numero(total, casas)} GB · ${dinheiro(total)}/mês</span>
                </p>
                <div class="barra-empilhada" role="img" aria-label="Bronze ${numero(e.bronze, casas)} GB, Silver ${numero(e.silver, casas)} GB, Gold ${numero(e.gold, casas)} GB">
                    <span class="camada-bronze" style="width: ${largura(e.bronze)}%"></span>
                    <span class="camada-silver" style="width: ${largura(e.silver)}%"></span>
                    <span class="camada-gold" style="width: ${largura(e.gold)}%"></span>
                </div>
            </li>`;
        }).join("");
    }

    // ---------- Tabelas ----------
    function desenharRejeicoes() {
        const piores = [...servidores]
            .filter((s) => s.linhasRejeitadas > 0)
            .sort((a, b) => b.taxaRejeicao - a.taxaRejeicao)
            .slice(0, 6);

        el("tabelaRejeicoes").innerHTML = piores.map((s) => {
            const classe = s.taxaRejeicao > ALERTA_REJEICAO ? "tag-critico" : s.taxaRejeicao > 1 ? "tag-alerta" : "tag-ok";
            return `
            <tr>
                <th scope="row">${escapar(s.id)}</th>
                <td>${escapar(s.empresa)}</td>
                <td class="num"><span class="tag ${classe}">${numero(s.taxaRejeicao, 1)}%</span></td>
                <td>${escapar(s.motivo_principal_rejeicao || "—")}</td>
            </tr>`;
        }).join("");
    }

    function desenharSemLote() {
        const lista = [...servidores].sort((a, b) => b.minutosSemLote - a.minutosSemLote).slice(0, 6);

        el("tabelaSemLote").innerHTML = lista.map((s) => {
            let classe = "tag-ok";
            let texto = "Enviando";
            if (s.minutosSemLote > 1440) { classe = "tag-critico"; texto = "Parado"; }
            else if (s.minutosSemLote > SILENCIO_MIN) { classe = "tag-alerta"; texto = "Atrasado"; }
            return `
            <tr>
                <th scope="row">${escapar(s.id)}</th>
                <td>${escapar(s.empresa)}</td>
                <td class="num">${s.minutosSemLote < 1 ? "agora" : "há " + idade(s.minutosSemLote)}</td>
                <td><span class="tag ${classe}">${texto}</span></td>
            </tr>`;
        }).join("");
    }

    function desenharExecucoes() {
        el("tabelaExecucoes").innerHTML = dados.execucoes.map((e) => {
            const taxa = porcentagem(e.linhas_rejeitadas, e.linhas_validas + e.linhas_rejeitadas);
            const ok = e.situacao === "concluida";
            return `
            <tr>
                <th scope="row">${escapar(e.id)}</th>
                <td>${dataHora(e.inicio)}</td>
                <td class="num">${e.duracao_s} s</td>
                <td class="num">${e.lotes}</td>
                <td class="num">${numero(e.linhas_validas)}</td>
                <td class="num">${numero(e.linhas_rejeitadas)}${e.linhas_rejeitadas ? ` (${numero(taxa, 1)}%)` : ""}</td>
                <td>
                    <span class="tag ${ok ? "tag-ok" : "tag-critico"}">${ok ? "Concluída" : "Falhou"}</span>
                    ${e.observacao ? `<small>${escapar(e.observacao)}</small>` : ""}
                </td>
            </tr>`;
        }).join("");
    }

    // ---------- Gráficos (Chart.js) ----------
    const COR_TEXTO = "#6f7a94";
    const COR_GRADE = "#1c1c3a";

    function escalas(sufixo) {
        return {
            x: { ticks: { color: COR_TEXTO, maxTicksLimit: 8, maxRotation: 0 }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { color: COR_TEXTO, callback: (v) => v + sufixo }, grid: { color: COR_GRADE } }
        };
    }

    function desenharGraficoCrescimento() {
        const recorte = ultimosDias(dados.crescimento_bronze);
        const total = recorte.reduce((t, d) => t + d.gb_adicionados, 0);
        el("subCrescimento").textContent = `+${numero(total, 1)} GB em ${dias} dias`;

        // GB acumulados no período, partindo de zero.
        let acumulado = 0;
        const serie = recorte.map((d) => { acumulado += d.gb_adicionados; return Number(acumulado.toFixed(3)); });

        if (grafCrescimento) grafCrescimento.destroy();
        grafCrescimento = new Chart(el("chartCrescimento"), {
            type: "line",
            data: {
                labels: recorte.map((d) => dataCurta(d.dia)),
                datasets: [{
                    label: "GB adicionados (acumulado)",
                    data: serie,
                    borderColor: "#cd7f32",
                    backgroundColor: "rgba(205, 127, 50, 0.15)",
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: escalas(" GB")
            }
        });
    }

    function desenharGraficoRejeicao() {
        const recorte = ultimosDias(dados.rejeicoes_por_dia);
        const taxas = recorte.map((d) => Number(porcentagem(d.linhas_rejeitadas, d.linhas_recebidas).toFixed(2)));

        if (grafRejeicao) grafRejeicao.destroy();
        grafRejeicao = new Chart(el("chartRejeicao"), {
            type: "bar",
            data: {
                labels: recorte.map((d) => dataCurta(d.dia)),
                datasets: [{
                    label: "Taxa de rejeição (%)",
                    data: taxas,
                    backgroundColor: taxas.map((t) => (t > ALERTA_REJEICAO ? "#ff4d6d" : "#4f8cff")),
                    borderRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: escalas("%")
            }
        });
    }

    // ---------- Tela ----------
    function desenharTudo() {
        servidores = prepararServidores();
        desenharCards();
        desenharCamadas();
        desenharEmpresas();
        desenharRejeicoes();
        desenharSemLote();
        desenharExecucoes();
        desenharGraficoCrescimento();
        desenharGraficoRejeicao();
    }

    // ---------- Eventos ----------
    function ativarBotao(grupo, botao) {
        grupo.querySelectorAll(".btn-periodo").forEach((b) => b.classList.toggle("ativo", b === botao));
    }

    el("grupoPeriodo").addEventListener("click", (evento) => {
        const botao = evento.target.closest("[data-dias]");
        if (!botao) return;
        dias = Number(botao.dataset.dias);
        ativarBotao(el("grupoPeriodo"), botao);
        desenharTudo();
    });

    el("grupoBase").addEventListener("click", (evento) => {
        const botao = evento.target.closest("[data-base]");
        if (!botao) return;
        base = botao.dataset.base;
        ativarBotao(el("grupoBase"), botao);
        desenharEmpresas();
    });

    // ---------- Início ----------
    dados = await carregarDados();
    desenharTudo();
});
