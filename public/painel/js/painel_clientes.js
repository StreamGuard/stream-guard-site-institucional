// Tela "Clientes": visão geral de empresas, usuários e servidores monitorados.
// Os dados chegam no formato do JSON do backend (veja painel_dadosMock.js).
document.addEventListener("DOMContentLoaded", async () => {
    // ---------- Configuração ----------
    const SILENCIO_MIN = 15;     // sem lote há mais que isso: servidor silencioso
    const COBERTURA_BAIXA = 92;  // % de janelas recebidas abaixo disso: dados faltando
    const GOLD_ATRASADO_MIN = 10;

    // true: usa o painel_dadosMock.js. false: busca no backend (banco + Data Lake).
    const USAR_MOCK = false;
    const URL_API = "/clientes/buscarDadosBanco";

    const PERIODO_PADRAO = "7d";
    const PERIODOS = {
        "24h": { dias: 1, janelaMin: 5, rotulo: "24h", texto: "últimas 24 horas", emTexto: "nas últimas 24 horas", janela: "5 min" },
        "7d": { dias: 7, janelaMin: 60, rotulo: "7 dias", texto: "últimos 7 dias", emTexto: "nos últimos 7 dias", janela: "1 h" },
        "30d": { dias: 30, janelaMin: 360, rotulo: "30 dias", texto: "últimos 30 dias", emTexto: "nos últimos 30 dias", janela: "6 h" }
    };

    const SITUACOES = {
        semlake: { classe: "tag-neutro", texto: "Sem dados do lake" },
        ativa: { classe: "tag-ok", texto: "Ativa" },
        agente: { classe: "tag-alerta", texto: "Agente parado" },
        dormente: { classe: "tag-critico", texto: "Dormente" }
    };
    const ORDENACOES = {
        usuarios: (a, b) => b.totalUsuarios - a.totalUsuarios,
        servidores: (a, b) => b.servidores.length - a.servidores.length,
        alertas: (a, b) => b.alertas_7d - a.alertas_7d,
        cobertura: (a, b) => (a.cobertura ?? 101) - (b.cobertura ?? 101),
        cadastro: (a, b) => new Date(b.criada_em || 0) - new Date(a.criada_em || 0)
    };

    const el = (id) => document.getElementById(id);
    let empresas = [];
    let lake = {};
    let filtroSituacao = "todas";
    let ordenacao = "usuarios";
    let periodo = PERIODO_PADRAO;
    let temLake = false;
    let graficoPerfis = null;
    let graficoNovas = null;
    let requisicaoAtual = 0;

    // ---------- Dados ----------
    // Formato esperado (igual ao clientes.json):
    //   { periodo, empresas: [ { id, nome, criada_em,
    //                   usuarios: { usuario, gerente, admin, ativos_periodo }, alertas_7d,
    //                   servidores: [ { id, atualizado_em?, ultimo_lote_em?, cobertura_pct? } ] } ],
    //     data_lake?: { periodo, ultimo_gold_em } }
    // Os campos com "?" vêm do Data Lake. Enquanto não existirem, a tela mostra "—".
    async function carregarDados() {
        if (USAR_MOCK) return DADOS_MOCK.clientes;

        const resposta = await fetch(`${URL_API}?periodo=${encodeURIComponent(periodo)}`);
        if (!resposta.ok) throw new Error("Erro ao buscar dados das empresas");
        const corpo = await resposta.json();
        return corpo.dados;
    }

    function minutosDesde(dataISO) {
        return (Date.now() - new Date(dataISO).getTime()) / 60000;
    }

    function media(numeros) {
        return numeros.reduce((total, n) => total + n, 0) / numeros.length;
    }

    // Soma e classifica o que a tela precisa de cada empresa.
    function prepararEmpresa(empresa) {
        const servidores = (empresa.servidores || []).map((s) => {
            const minutosSemLote = s.ultimo_lote_em ? minutosDesde(s.ultimo_lote_em) : null;

            // O status é relativo ao último lote do Gold: assim o filtro de 7d/30d
            // mostra quem parou de enviar dentro do período, e não a defasagem do ETL.
            const minutosSemLoteNoGold = s.ultimo_lote_em && lake.ultimo_gold_em
                ? (new Date(lake.ultimo_gold_em).getTime() - new Date(s.ultimo_lote_em).getTime()) / 60000
                : null;

            return { ...s, minutosSemLote, minutosSemLoteNoGold };
        });
        const { usuario = 0, gerente = 0, admin = 0, ativos_periodo = 0 } = empresa.usuarios || {};
        const base = {
            ...empresa,
            servidores,
            alertas_7d: empresa.alertas_7d || 0,
            totalUsuarios: usuario + gerente + admin,
            ativosPeriodo: Number(ativos_periodo) || 0,
            silenciosos: null,
            reportando: null,
            cobertura: null,
            minutosSemLote: null,
            situacao: "semlake"
        };
        if (!temLake) return base;

        const comGold = servidores.some((s) => s.ultimo_lote_em !== null && s.ultimo_lote_em !== undefined);
        // A tolerância acompanha a janela do Gold: 1 h em 7d e 6 h em 30d.
        const limiteSilencio = PERIODOS[periodo].janelaMin + SILENCIO_MIN;
        const silenciosos = servidores.filter((s) => s.minutosSemLoteNoGold === null || s.minutosSemLoteNoGold > limiteSilencio).length;
        const reportando = servidores.length - silenciosos;
        const comCobertura = servidores.filter((s) => s.cobertura_pct !== undefined && s.cobertura_pct !== null);

        let situacao = "ativa";
        if (!comGold) situacao = "semlake";
        else if (servidores.length === 0 || reportando === 0) situacao = "dormente";
        else if (silenciosos > 0) situacao = "agente";

        return {
            ...base,
            silenciosos,
            reportando,
            situacao,
            cobertura: comCobertura.length ? media(comCobertura.map((s) => s.cobertura_pct)) : null,
            minutosSemLote: servidores.some((s) => s.minutosSemLote !== null)
                ? Math.min(...servidores.filter((s) => s.minutosSemLote !== null).map((s) => s.minutosSemLote))
                : null
        };
    }

    // ---------- Formatação ----------
    const numero = (valor, casas = 0) =>
        valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

    function idade(minutos) {
        if (minutos < 1) return "agora";
        if (minutos < 60) return `${Math.round(minutos)} min`;
        if (minutos < 2880) return `${Math.round(minutos / 60)} h`;
        return `${Math.round(minutos / 1440)} d`;
    }

    function dataCompleta(dataISO) {
        return dataISO ? new Date(dataISO).toLocaleDateString("pt-BR") : "—";
    }

    function escapar(texto) {
        const div = document.createElement("div");
        div.textContent = texto;
        return div.innerHTML;
    }

    // ---------- Cards de indicador ----------
    function card(classe, titulo, fonte, valor, unidade, detalhe) {
        return `
            <article class="card ${classe}">
                <header class="card-cabecalho">
                    <h3>${titulo}</h3>
                    <span class="fonte fonte-${fonte}">${fonte === "banco" ? "Banco" : "Lake"}</span>
                </header>
                <p class="card-valor">${valor} ${unidade ? `<small>${unidade}</small>` : ""}</p>
                <p class="card-detalhe">${detalhe}</p>
            </article>`;
    }

    function desenharCards() {
        const cfg = PERIODOS[periodo];
        const novas = empresas.filter((e) => e.criada_em && minutosDesde(e.criada_em) < cfg.dias * 1440).length;
        const usuarios = empresas.reduce((total, e) => total + e.totalUsuarios, 0);
        const ativos = empresas.reduce((total, e) => total + (e.ativosPeriodo || 0), 0);
        const admins = empresas.reduce((total, e) => total + (e.usuarios?.admin || 0), 0);
        const gerentes = empresas.reduce((total, e) => total + (e.usuarios?.gerente || 0), 0);
        const todosServidores = empresas.flatMap((e) => e.servidores);
        const atualizados = todosServidores.filter((s) =>
            s.atualizado_em && minutosDesde(s.atualizado_em) < cfg.dias * 1440
        ).length;
        const plural = (quantidade, singular, maiorQueUm) =>
            `${quantidade} ${quantidade === 1 ? singular : maiorQueUm}`;
        const textoNovas = `${novas} nova${novas === 1 ? "" : "s"} ${cfg.emTexto}`;

        const cardsBanco = [
            temLake
                ? card("", "Empresas ativas", "banco", empresas.filter((e) => e.situacao === "ativa" || e.situacao === "agente").length,
                    `de ${empresas.length}`, textoNovas)
                : card("", "Empresas", "banco", empresas.length, "", textoNovas),
            card("card-roxo", "Usuários", "banco", usuarios, "",
                `${plural(admins, "admin", "admins")} · ${plural(gerentes, "gerente", "gerentes")} · ${ativos} ativo${ativos === 1 ? "" : "s"} ${cfg.emTexto}`)
        ];

        if (!temLake) {
            const aguardando = `Sem dados ${cfg.emTexto}`;
            el("cardsKpi").innerHTML = [
                ...cardsBanco,
                card("card-verde", "Servidores cadastrados", "banco", todosServidores.length, "",
                    `${atualizados} atualizado${atualizados === 1 ? "" : "s"} ${cfg.emTexto}`),
                card(todosServidores.length ? "card-alerta" : "card-verde", "Servidores silenciosos", "lake", todosServidores.length, "",
                    `Sem dados no Gold ${cfg.emTexto}`),
                card("", "Cobertura média", "lake", "—", "", aguardando),
                card("", "Último Gold", "lake", "—", "", aguardando)
            ].join("");
            return;
        }

        // O card de monitorados usa só quem aparece no Gold; o de silenciosos
        // inclui também os servidores que nunca tiveram dado no Gold.
        const servidoresComGold = todosServidores.filter((s) => s.ultimo_lote_em !== null && s.ultimo_lote_em !== undefined);
        const reportando = empresas.reduce((total, e) => total + e.reportando, 0);
        const silenciosos = todosServidores.length - reportando;
        const comDado = todosServidores.filter((s) => s.cobertura_pct > 0);
        const goldMin = minutosDesde(lake.ultimo_gold_em);
        const limiteAtrasoGold = cfg.janelaMin + GOLD_ATRASADO_MIN;

        el("cardsKpi").innerHTML = [
            ...cardsBanco,
            card("card-verde", "Servidores monitorados", "lake", servidoresComGold.length, "", `${reportando} reportando no período`),
            card(silenciosos ? "card-alerta" : "card-verde", "Servidores silenciosos", "lake", silenciosos, "",
                "Sem dado no fim do período ou sem dados no Gold"),
            card("card-verde", "Cobertura média", "lake", comDado.length ? numero(media(comDado.map((s) => s.cobertura_pct)), 1) : "—", "%",
                `Janelas de ${cfg.janela} recebidas (servidores com dado)`),
            card(goldMin > limiteAtrasoGold ? "card-alerta" : "", "Último Gold", "lake", Math.round(goldMin), "min atrás",
                goldMin > limiteAtrasoGold ? "Processamento atrasado" : "Processamento em dia")
        ].join("");
    }

    // ---------- Rankings ----------
    // Uma linha do ranking: nome, valor em texto e uma barra proporcional ao maior valor.
    function linhaRanking(nome, textoValor, valor, maximo) {
        return `
            <li>
                <p class="ranking-linha">
                    <span class="ranking-nome">${escapar(nome)}</span>
                    <span class="ranking-valor">${textoValor}</span>
                </p>
                <meter min="0" max="${maximo}" value="${valor}">${textoValor}</meter>
            </li>`;
    }

    function desenharRankings() {
        const maisUsuarios = [...empresas].sort(ORDENACOES.usuarios).slice(0, 5);
        el("rankUsuarios").innerHTML = maisUsuarios
            .map((e) => linhaRanking(e.nome, `${e.totalUsuarios} usuários`, e.totalUsuarios, maisUsuarios[0].totalUsuarios))
            .join("");

        const maisServidores = [...empresas].sort(ORDENACOES.servidores).slice(0, 5);
        el("rankServidores").innerHTML = maisServidores
            .map((e) => linhaRanking(e.nome,
                temLake ? `${e.reportando}/${e.servidores.length} reportando` : `${e.servidores.length} servidores`,
                e.servidores.length, maisServidores[0].servidores.length))
            .join("");
    }

    // ---------- Pedem atenção ----------
    function desenharAtencao() {
        const avisos = [];
        if (!temLake) {
            el("listaAtencao").innerHTML = `<li class="vazio">Sem dados do Data Lake ${PERIODOS[periodo].emTexto}.</li>`;
            return;
        }
        empresas.forEach((e) => {
            if (e.situacao === "semlake") {
                avisos.push({ ordem: 3, classe: "neutro", nome: e.nome, tag: "Sem dados",
                    texto: `Nenhum dado do Gold ${PERIODOS[periodo].emTexto}` });
            } else if (e.situacao === "dormente") {
                avisos.push({ ordem: 0, classe: "critico", nome: e.nome, tag: "Dormente",
                    texto: e.minutosSemLote === null
                        ? "Nenhum servidor com dado no período"
                        : `Nenhum servidor envia dado há ${idade(e.minutosSemLote)}` });
            } else if (e.situacao === "agente") {
                avisos.push({ ordem: 1, classe: "alerta", nome: e.nome, tag: "Agente parado",
                    texto: `${e.silenciosos} de ${e.servidores.length} servidores silenciosos` });
            } else if (e.cobertura < COBERTURA_BAIXA) {
                avisos.push({ ordem: 2, classe: "alerta", nome: e.nome, tag: "Dados faltando",
                    texto: `Cobertura de ${numero(e.cobertura, 1)}% no período` });
            }
        });
        avisos.sort((a, b) => a.ordem - b.ordem);

        el("listaAtencao").innerHTML = avisos.length
            ? avisos.map((a) => {
                const classeAviso = a.classe === "critico" ? "aviso-critico"
                    : a.classe === "neutro" ? "aviso-neutro" : "";
                return `
                <li class="aviso ${classeAviso}">
                    <div>
                        <strong>${escapar(a.nome)}</strong>
                        <small>${a.texto}</small>
                    </div>
                    <span class="tag tag-${a.classe}">${a.tag}</span>
                </li>`;
            }).join("")
            : `<li class="vazio">Nenhuma empresa precisa de atenção.</li>`;
    }

    // ---------- Tabela ----------
    function desenharTabela() {
        const lista = empresas
            .filter((e) => filtroSituacao === "todas" || e.situacao === filtroSituacao)
            .sort(ORDENACOES[ordenacao]);

        el("subTabela").textContent = `${lista.length} de ${empresas.length} empresas`;
        el("tabelaEmpresas").innerHTML = lista.length
            ? lista.map((e) => {
                const situacao = SITUACOES[e.situacao];
                return `
                <tr>
                    <th scope="row">${escapar(e.nome)}</th>
                    <td class="num">${e.totalUsuarios}</td>
                    <td class="num">${e.servidores.length}</td>
                    <td>${dataCompleta(e.criada_em)}</td>
                    <td class="num">${e.reportando === null ? "—" : e.reportando + "/" + e.servidores.length}</td>
                    <td class="num">${e.cobertura > 0 ? numero(e.cobertura, 1) + "%" : "—"}</td>
                    <td class="num">${e.alertas_7d}</td>
                    <td>${e.minutosSemLote === null ? "—" : e.minutosSemLote < 1 ? "agora" : "há " + idade(e.minutosSemLote)}</td>
                    <td><span class="tag ${situacao.classe}">${situacao.texto}</span></td>
                </tr>`;
            }).join("")
            : `<tr><td colspan="9"><p class="vazio">Nenhuma empresa nesta situação.</p></td></tr>`;
    }

    // ---------- Gráficos (Chart.js) ----------
    const COR_TEXTO = "#6f7a94";
    const COR_GRADE = "#1c1c3a";

    function desenharGraficoPerfis() {
        const soma = (perfil) => empresas.reduce((total, e) => total + (e.usuarios?.[perfil] || 0), 0);

        if (graficoPerfis) graficoPerfis.destroy();

        graficoPerfis = new Chart(el("chartPerfis"), {
            type: "doughnut",
            data: {
                labels: ["Usuário (analista)", "Gerente", "Admin"],
                datasets: [{
                    data: [soma("usuario"), soma("gerente"), soma("admin")],
                    backgroundColor: ["#4f8cff", "#8b5cf6", "#f59a3d"],
                    borderColor: "#14142a",
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "62%",
                plugins: { legend: { position: "bottom", labels: { color: "#a3adc2", boxWidth: 12, usePointStyle: true } } }
            }
        });
    }

    function desenharGraficoNovas() {
        const hoje = new Date();
        const meses = [];
        const quantidades = [];

        for (let atras = 5; atras >= 0; atras--) {
            const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - atras, 1);
            const fim = new Date(hoje.getFullYear(), hoje.getMonth() - atras + 1, 1);
            meses.push(inicio.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""));
            quantidades.push(empresas.filter((e) => {
                if (!e.criada_em) return false;
                const criada = new Date(e.criada_em);
                return criada >= inicio && criada < fim;
            }).length);
        }

        if (graficoNovas) graficoNovas.destroy();

        graficoNovas = new Chart(el("chartNovas"), {
            type: "bar",
            data: { labels: meses, datasets: [{ label: "Empresas novas", data: quantidades, backgroundColor: "#4f8cff", borderRadius: 6 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: COR_TEXTO }, grid: { display: false } },
                    y: { beginAtZero: true, ticks: { color: COR_TEXTO, precision: 0, stepSize: 1 }, grid: { color: COR_GRADE } }
                }
            }
        });
    }

    // Atualiza os textos que dependem do período escolhido.
    function atualizarRotulosPeriodo() {
        const cfg = PERIODOS[periodo];
        el("thAlertas").textContent = `Alertas ${cfg.rotulo}`;
        el("optAlertas").textContent = `Alertas (${cfg.rotulo})`;
        el("notaCobertura").textContent =
            `Cobertura = % das janelas de ${cfg.janela} esperadas que chegaram ao Gold. ` +
            `Servidor silencioso = sem dado há mais de ${cfg.janelaMin + SILENCIO_MIN} min em relação ao último lote do Gold ou sem dados no Gold.`;
    }

    function atualizarAviso() {
        const aviso = el("avisoLake");

        if (temLake) {
            aviso.hidden = true;
            aviso.textContent = "";
            return;
        }

        aviso.hidden = false;
        aviso.textContent =
            `Sem dados do Data Lake ${PERIODOS[periodo].emTexto}. ` +
            "Selecione outro período ou verifique o processamento do Gold.";
    }

    // Sem o Data Lake, filtrar por situação ou ordenar por cobertura/alertas não faz sentido.
    // As opções continuam no DOM para voltarem a funcionar quando outro período tiver dados.
    function ajustarFiltros() {
        el("filtroSituacao").style.display = temLake ? "" : "none";

        const optCobertura = el("selectOrdem").querySelector('option[value="cobertura"]');
        const optAlertas = el("selectOrdem").querySelector('option[value="alertas"]');

        if (optCobertura) optCobertura.disabled = !temLake;
        if (optAlertas) optAlertas.disabled = !temLake;

        if (!temLake && (ordenacao === "cobertura" || ordenacao === "alertas")) {
            ordenacao = "usuarios";
            el("selectOrdem").value = "usuarios";
        }
    }

    // ---------- Eventos ----------
    el("filtroPeriodo").addEventListener("click", (evento) => {
        const botao = evento.target.closest("[data-periodo]");
        if (!botao || botao.dataset.periodo === periodo) return;

        periodo = botao.dataset.periodo;
        document.querySelectorAll("#filtroPeriodo .btn-periodo").forEach((b) =>
            b.classList.toggle("ativo", b === botao)
        );
        recarregar();
    });

    el("filtroSituacao").addEventListener("click", (evento) => {
        const botao = evento.target.closest("[data-situacao]");
        if (!botao) return;
        filtroSituacao = botao.dataset.situacao;
        document.querySelectorAll("#filtroSituacao .btn-periodo").forEach((b) => b.classList.toggle("ativo", b === botao));
        desenharTabela();
    });

    el("selectOrdem").addEventListener("change", (evento) => {
        ordenacao = evento.target.value;
        desenharTabela();
    });

    // ---------- Início ----------
    async function recarregar() {
        const requisicao = ++requisicaoAtual;
        el("cardsKpi").innerHTML = `<p class="vazio">Carregando dados do período...</p>`;

        try {
            const dados = await carregarDados();

            // Ignora respostas antigas se o usuário trocou de período durante o fetch.
            if (requisicao !== requisicaoAtual) return;

            lake = dados.data_lake || {};
            temLake = Boolean(lake.ultimo_gold_em);
            empresas = dados.empresas.map(prepararEmpresa);

            atualizarRotulosPeriodo();
            atualizarAviso();
            ajustarFiltros();

            desenharCards();
            desenharRankings();
            desenharAtencao();
            desenharTabela();
            desenharGraficoPerfis();
            desenharGraficoNovas();
        } catch (erro) {
            if (requisicao !== requisicaoAtual) return;

            console.error("Erro:", erro);
            el("cardsKpi").innerHTML = `<p class="vazio">Não foi possível carregar os dados dos clientes.</p>`;
        }
    }

    await recarregar();
});
