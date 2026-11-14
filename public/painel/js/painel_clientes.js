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

    // ---------- Dados ----------
    // Formato esperado (igual ao clientes.json):
    //   { empresas: [ { id, nome, criada_em, usuarios: { usuario, gerente, admin }, alertas_7d,
    //                   servidores: [ { id, ultimo_lote_em?, cobertura_pct? } ] } ],
    //     data_lake?: { bronze_gb, silver_gb, gold_gb, crescimento_gb_semana, ultimo_gold_em } }
    // Os campos com "?" vêm do Data Lake. Enquanto não existirem, a tela mostra "—".
    async function carregarDados() {
        if (USAR_MOCK) return DADOS_MOCK.clientes;

        const resposta = await fetch(URL_API);
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

    // true quando o backend já entregou os dados do Data Lake.
    let temLake = false;

    // Soma e classifica o que a tela precisa de cada empresa.
    function prepararEmpresa(empresa) {
        const servidores = (empresa.servidores || []).map((s) => ({
            ...s,
            minutosSemLote: s.ultimo_lote_em ? minutosDesde(s.ultimo_lote_em) : null
        }));
        const { usuario = 0, gerente = 0, admin = 0 } = empresa.usuarios || {};
        const base = {
            ...empresa,
            servidores,
            alertas_7d: empresa.alertas_7d || 0,
            totalUsuarios: usuario + gerente + admin,
            silenciosos: null,
            reportando: null,
            cobertura: null,
            minutosSemLote: null,
            situacao: "semlake"
        };
        if (!temLake) return base;

        const comLote = servidores.filter((s) => s.minutosSemLote !== null);
        const silenciosos = servidores.filter((s) => s.minutosSemLote === null || s.minutosSemLote > SILENCIO_MIN).length;
        const reportando = servidores.length - silenciosos;

        let situacao = "ativa";
        if (servidores.length === 0 || reportando === 0) situacao = "dormente";
        else if (silenciosos > 0) situacao = "agente";

        return {
            ...base,
            silenciosos,
            reportando,
            situacao,
            cobertura: comLote.length ? media(comLote.map((s) => s.cobertura_pct)) : null,
            minutosSemLote: comLote.length ? Math.min(...comLote.map((s) => s.minutosSemLote)) : null
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
        const novas = empresas.filter((e) => e.criada_em && minutosDesde(e.criada_em) < 30 * 1440).length;
        const usuarios = empresas.reduce((total, e) => total + e.totalUsuarios, 0);
        const admins = empresas.reduce((total, e) => total + (e.usuarios?.admin || 0), 0);
        const gerentes = empresas.reduce((total, e) => total + (e.usuarios?.gerente || 0), 0);
        const todosServidores = empresas.flatMap((e) => e.servidores);
        const textoNovas = `${novas} nova${novas === 1 ? "" : "s"} nos últimos 30 dias`;

        const cardsBanco = [
            temLake
                ? card("", "Empresas ativas", "banco", empresas.filter((e) => e.situacao !== "dormente").length,
                    `de ${empresas.length}`, textoNovas)
                : card("", "Empresas", "banco", empresas.length, "", textoNovas),
            card("card-roxo", "Usuários", "banco", usuarios, "", `${admins} admins · ${gerentes} gerentes`)
        ];

        if (!temLake) {
            const aguardando = "Aguardando o Data Lake";
            el("cardsKpi").innerHTML = [
                ...cardsBanco,
                card("card-verde", "Servidores cadastrados", "banco", todosServidores.length, "", "Quantos reportam depende do lake"),
                card("", "Servidores silenciosos", "lake", "—", "", aguardando),
                card("", "Cobertura média", "lake", "—", "", aguardando),
                card("", "Último Gold", "lake", "—", "", aguardando)
            ].join("");
            return;
        }

        const reportando = empresas.reduce((total, e) => total + e.reportando, 0);
        const silenciosos = todosServidores.length - reportando;
        const comDado = todosServidores.filter((s) => s.cobertura_pct > 0);
        const goldMin = minutosDesde(lake.ultimo_gold_em);

        el("cardsKpi").innerHTML = [
            ...cardsBanco,
            card("card-verde", "Servidores monitorados", "lake", todosServidores.length, "", `${reportando} reportando agora`),
            card(silenciosos ? "card-alerta" : "card-verde", "Servidores silenciosos", "lake", silenciosos, "",
                `Sem dado há mais de ${SILENCIO_MIN} min`),
            card("card-verde", "Cobertura média", "lake", comDado.length ? numero(media(comDado.map((s) => s.cobertura_pct)), 1) : "—", "%",
                "Janelas de 5 min recebidas (servidores com dado)"),
            card(goldMin > GOLD_ATRASADO_MIN ? "card-alerta" : "", "Último Gold", "lake", Math.round(goldMin), "min atrás",
                goldMin > GOLD_ATRASADO_MIN ? "Processamento atrasado" : "Processamento em dia")
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
            el("listaAtencao").innerHTML = `<li class="vazio">Depende dos dados do Data Lake.</li>`;
            return;
        }
        empresas.forEach((e) => {
            if (e.situacao === "dormente") {
                avisos.push({ ordem: 0, classe: "critico", nome: e.nome, tag: "Dormente",
                    texto: `Nenhum servidor envia dado há ${idade(e.minutosSemLote)}` });
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
            ? avisos.map((a) => `
                <li class="aviso ${a.classe === "critico" ? "aviso-critico" : ""}">
                    <div>
                        <strong>${escapar(a.nome)}</strong>
                        <small>${a.texto}</small>
                    </div>
                    <span class="tag tag-${a.classe}">${a.tag}</span>
                </li>`).join("")
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
        new Chart(el("chartPerfis"), {
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

        new Chart(el("chartNovas"), {
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

    // Sem o Data Lake, filtrar por situação ou ordenar por cobertura/alertas não faz sentido.
    function ajustarFiltrosSemLake() {
        el("filtroSituacao").style.display = "none";
        ["cobertura", "alertas"].forEach((valor) => {
            el("selectOrdem").querySelector(`option[value="${valor}"]`).remove();
        });
    }

    // ---------- Eventos ----------
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
    try {
        const dados = await carregarDados();
        lake = dados.data_lake;
        temLake = Boolean(lake);
        empresas = dados.empresas.map(prepararEmpresa);
    } catch (erro) {
        console.error("Erro:", erro);
        el("cardsKpi").innerHTML = `<p class="vazio">Não foi possível carregar os dados dos clientes.</p>`;
        return;
    }

    if (!temLake) ajustarFiltrosSemLake();

    desenharCards();
    desenharRankings();
    desenharAtencao();
    desenharTabela();
    desenharGraficoPerfis();
    desenharGraficoNovas();
});
