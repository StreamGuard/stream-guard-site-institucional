(() => {
    'use strict';


    const $ = (id) => document.getElementById(id);

    const escaparHtml = (valor) =>
        String(valor).replace(/[&<>"']/g, (s) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[s]));

    const CORES = {
        CPU: '#2de2c0',
        RAM: '#b095fc',
        Disco: '#66a8ff',
        Rede: '#f59a3d'
    };

    const LIMITES = {
        CPU: 85,
        RAM: 90,
        Disco: 85,
        Rede: 80
    };

    const LABELS = {
        CPU: 'Processamento',
        RAM: 'Memória',
        Disco: 'Armazenamento',
        Rede: 'Conectividade'
    };



    const HOSTS = [
        {
            id: 'srv-encoder-01',
            role: 'Codificação',
            CPU: 93,
            RAM: 71,
            Disco: 63,
            Rede: 61
        },
        {
            id: 'srv-edge-01',
            role: 'Distribuição / Edge',
            CPU: 65,
            RAM: 68,
            Disco: 56,
            Rede: 91
        },
        {
            id: 'srv-db-01',
            role: 'Banco de dados',
            CPU: 71,
            RAM: 94,
            Disco: 91,
            Rede: 49
        },
        {
            id: 'srv-stream-01',
            role: 'Streaming',
            CPU: 84,
            RAM: 89,
            Disco: 64,
            Rede: 78
        },
        {
            id: 'srv-backup-01',
            role: 'Backup',
            CPU: 43,
            RAM: 60,
            Disco: 89,
            Rede: 36
        },
        {
            id: 'srv-stream-02',
            role: 'Streaming',
            CPU: 67,
            RAM: 76,
            Disco: 54,
            Rede: 72
        },
        {
            id: 'srv-cache-01',
            role: 'Cache',
            CPU: 49,
            RAM: 77,
            Disco: 43,
            Rede: 52
        },
        {
            id: 'srv-api-01',
            role: 'API',
            CPU: 75,
            RAM: 70,
            Disco: 51,
            Rede: 67
        }
    ];

    const CONTRAST = {
        normal: {
            CPU: -13,
            RAM: -9,
            Disco: -4,
            Rede: -17
        },
        pico: {
            CPU: 0,
            RAM: 0,
            Disco: 0,
            Rede: 0
        },
        recuperacao: {
            CPU: -10,
            RAM: -6,
            Disco: -8,
            Rede: -13
        }
    };

    const PERIODO = {
        '24h': {
            nome: '24 horas',
            n: 24,
            step: 'h'
        },
        '7d': {
            nome: '7 dias',
            n: 21,
            step: 'd'
        },
        '30d': {
            nome: '30 dias',
            n: 30,
            step: 'D'
        }
    };

    // ==========================================
    // REGRAS DE ANÁLISE GERENCIAL
    // ==========================================

    const REGRAS = {
        CPU: {
            title: 'Revisar carga de processamento',
            why: 'Processamento elevado pode indicar disputa por CPU em fases de codificação ou streaming, mas não confirma a causa.',
            action: 'Investigar processos de maior consumo e a duração dos picos; avaliar distribuição da carga antes de dimensionar mais nós.'
        },
        RAM: {
            title: 'Investigar pressão de memória',
            why: 'Memória próxima do limite reduz a folga para novos processos e picos de audiência.',
            action: 'Verificar evolução da memória e processos residentes; investigar vazamentos ou necessidade de redistribuição.'
        },
        Disco: {
            title: 'Planejar capacidade de armazenamento',
            why: 'Disco com ocupação elevada pode limitar gravações, registros e processamento caso continue crescendo.',
            action: 'Examinar crescimento histórico, retenção dos arquivos e políticas de limpeza antes de ampliar capacidade.'
        },
        Rede: {
            title: 'Verificar saturação de conectividade',
            why: 'Tráfego alto no enlace pode elevar a chance de gargalos no fluxo de transmissão, sem comprovar impacto ao usuário.',
            action: 'Comparar taxa de saída/entrada, configuração do enlace e picos recorrentes; investigar distribuição de tráfego.'
        }
    };

    // ==========================================
    // CONFIGURAÇÕES FINANCEIRAS
    // ==========================================

    const BASE = {
        nodes: 8,
        storage: 1200,
        egress: 4
    };

    const STATE = {
        hosts: [],
        active: 'Todos',
        plans: [],
        scenario: 'pico',
        period: '7d',
        cost: null
    };

    const BRL = (valor) =>
        new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0
        }).format(valor);

    const USD = (valor) =>
        new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 2
        }).format(valor);

    const fmt = (valor) =>
        new Intl.NumberFormat('pt-BR', {
            maximumFractionDigits: 1
        }).format(valor);

    const cap = (valor) =>
        Math.max(1, Math.min(99, Math.round(valor)));

    const cl = (valor) =>
        valor >= 1 ? 'critico' :
        valor >= 0.92 ? 'atencao' : 'normal';

    const lbl = {
        critico: 'Crítico',
        atencao: 'Atenção',
        normal: 'Normal'
    };

    // ==========================================
    // CLASSIFICAÇÃO DOS SERVIDORES
    // ==========================================

    function statusValue(servidor) {

        const scores = Object.keys(LIMITES).map(componente => ({
            c: componente,
            value: servidor[componente],
            factor: servidor[componente] / LIMITES[componente]
        }));

        scores.sort((a, b) => b.factor - a.factor);

        return {
            ...scores[0],
            status: cl(scores[0].factor)
        };
    }

    // FUTURA INTEGRAÇÃO:
    // Substituir pelos dados recebidos da API.

    function hosts() {

        const delta = CONTRAST[$('cenario').value];

        return HOSTS.map(servidor => {

            const resultado = { ...servidor };

            for (const componente of Object.keys(LIMITES)) {

                resultado[componente] = cap(
                    servidor[componente] +
                    delta[componente] +
                    (servidor.id.length % 3 - 1)
                );
            }

            resultado.risk = statusValue(resultado);

            return resultado;

        }).sort((a, b) => b.risk.factor - a.risk.factor);
    }

    function topFor(componente) {

        return [...STATE.hosts]
            .sort((a, b) => b[componente] - a[componente])[0];
    }

    function allIssues() {

        return Object.keys(LIMITES).map(componente => {

            const servidor = topFor(componente);

            const factor =
                servidor[componente] / LIMITES[componente];

            return {
                key: componente,
                host: servidor,
                value: servidor[componente],
                factor: factor,
                status: cl(factor)
            };

        }).sort((a, b) => b.factor - a.factor);
    }

    // ==========================================
    // MENSAGENS E MODAIS
    // ==========================================

    function toast(mensagem) {

        const elemento = $('toast');

        elemento.textContent = mensagem;
        elemento.hidden = false;

        clearTimeout(window.sgIndividualToaster);

        window.sgIndividualToaster = setTimeout(() => {
            elemento.hidden = true;
        }, 3200);
    }

    function modal(titulo, mensagem) {

        $('dialogTitle').textContent = titulo;
        $('dialogText').textContent = mensagem;

        $('overlay').hidden = false;
        $('closeDialog').focus();
    }

    // ==========================================
    // INDICADORES EXECUTIVOS
    // ==========================================

    function renderOverview() {

        const issues = allIssues();

        const count = STATE.hosts.filter(
            servidor => servidor.risk.status !== 'normal'
        ).length;

        const critical = STATE.hosts.reduce((total, servidor) => {

            return total + Object.keys(LIMITES).filter(
                componente => servidor[componente] >= LIMITES[componente]
            ).length;

        }, 0);

        const main = STATE.hosts[0];

        $('kpiRisk').innerHTML =
            `${count}<small> / ${STATE.hosts.length}</small>`;

        $('kpiRiskNote').textContent =
            STATE.hosts.filter(
                servidor => servidor.risk.status === 'critico'
            ).length + ' com pelo menos um limite excedido';

        $('kpiComp').textContent = critical;

        $('kpiMain').textContent =
            main.id.replace('srv-', '');

        $('kpiMainNote').textContent =
            `${main.risk.c} ${main.risk.value}% • limite ${LIMITES[main.risk.c]}%`;

        $('noticeTitle').textContent =
            `${issues.filter(item => item.status === 'critico').length} recursos prioritários neste cenário`;

        $('noticeDesc').textContent =
            `Maior excedência: ${issues[0].key} em ${issues[0].host.id} (${issues[0].value}%). Use as evidências abaixo para priorizar a investigação.`;
    }

    // ==========================================
    // INSIGHTS E DECISÕES GERENCIAIS
    // ==========================================

    function decisions() {

        const arr = allIssues();

        $('decisionList').innerHTML = arr.map((item, indice) => {

            const regra = REGRAS[item.key];

            const cor =
                item.status === 'critico' ? 'var(--pink)' :
                item.status === 'atencao' ? 'var(--orange)' :
                'var(--mint)';

            const already = STATE.plans.some(
                plano => plano.key === item.key
            );

            return `
                <article class="card decision" style="--status:${cor}">

                    <span class="decision-num">
                        0${indice + 1}
                    </span>

                    <div>

                        <div class="decision-top">
                            <h3>${regra.title} · ${item.key}</h3>

                            <span class="decision-tag">
                                ${item.status.toUpperCase()}
                            </span>
                        </div>

                        <p>${regra.why}</p>

                        <div class="evidence">
                            <b>Evidência:</b>
                            ${escaparHtml(item.host.id)}
                            • ${item.key} ${item.value}%
                            • limite de referência ${LIMITES[item.key]}%.
                        </div>

                        <div class="recommendation">

                            <span>DECISÃO ›</span>

                            <span style="color:#d8d8ec;font-weight:500">
                                ${regra.action}
                            </span>

                        </div>

                        <button
                            class="inline-action"
                            data-add="${item.key}"
                            ${already ? 'disabled' : ''}
                        >
                            ${already
                                ? '✓ No plano de ação'
                                : '+ Adicionar ao plano'}
                        </button>

                    </div>

                </article>
            `;

        }).join('');
    }

    // ==========================================
    // PLANO DE AÇÃO
    // ==========================================

    function plans() {

        const lista = $('planList');

        $('planCount').textContent =
            `${STATE.plans.length} ${
                STATE.plans.length === 1 ? 'item' : 'itens'
            }`;

        if (STATE.plans.length === 0) {

            lista.innerHTML = `
                <li class="plan-empty">
                    Selecione “Adicionar ao plano”
                    em uma das recomendações.
                </li>
            `;

            return;
        }

        lista.innerHTML = STATE.plans.map(plano => `
            <li class="planitem">

                <div class="planitem-top">

                    <strong>
                        ${plano.key} · ${REGRAS[plano.key].title}
                    </strong>

                    <button
                        type="button"
                        aria-label="Remover ${plano.key}"
                        data-remove="${plano.key}"
                    >
                        ×
                    </button>

                </div>

                <p>${REGRAS[plano.key].action}</p>

            </li>
        `).join('');
    }

    function savePlans() {

        try {

            localStorage.setItem(
                'streamguard:demo:actions-v2',
                JSON.stringify(STATE.plans)
            );

        } catch (erro) {
            console.error('Erro ao salvar plano:', erro);
        }
    }

    function loadPlans() {

        try {

            const items = JSON.parse(
                localStorage.getItem(
                    'streamguard:demo:actions-v2'
                ) || '[]'
            );

            STATE.plans = Array.isArray(items)
                ? items.filter(item =>
                    item && REGRAS[item.key]
                ).slice(0, 4)
                : [];

        } catch (erro) {

            STATE.plans = [];
        }
    }

    // ==========================================
    // CARDS DOS COMPONENTES
    // ==========================================

    function componentCards() {

        const issues = allIssues();

        const componentes = [
            'CPU',
            'RAM',
            'Disco',
            'Rede'
        ].map(componente =>
            issues.find(item => item.key === componente)
        );

        $('componentCards').innerHTML = componentes.map(item => `

            <button
                type="button"
                class="card component ${
                    STATE.active === item.key ? 'selected' : ''
                }"
                style="--c:${CORES[item.key]}"
                data-resource="${item.key}"
            >

                <div class="component-header">

                    <span class="component-label">
                        <span class="circle"></span>
                        ${item.key}
                    </span>

                    <span class="component-status">
                        ${lbl[item.status]}
                    </span>

                </div>

                <div class="component-value">
                    ${item.value}
                    <span>% • maior utilização</span>
                </div>

                <div class="meter">
                    <i style="width:${item.value}%"></i>
                </div>

                <small>${escaparHtml(item.host.id)}</small>

                <span class="target">
                    Limite de atenção crítica:
                    ${LIMITES[item.key]}%
                </span>

            </button>

        `).join('');
    }

    // ==========================================
    // GRÁFICO DE RECURSOS
    // ==========================================

    // Os dados do gráfico são demonstrativos.
    // Posteriormente serão substituídos pelas séries da ETL.

    function plot() {

        const periodoSelecionado = $('periodo').value;
        const periodo = PERIODO[periodoSelecionado];

        const servidorSelecionado = $('servidorFiltro').value;

        const componenteAtivo = STATE.active;

        const servidor = STATE.hosts.find(
            item => item.id === servidorSelecionado
        );

        const valores = {};

        for (const componente of Object.keys(LIMITES)) {

            const base = servidor
                ? servidor[componente]
                : STATE.hosts.reduce(
                    (soma, item) => soma + item[componente], 0
                ) / STATE.hosts.length;

            valores[componente] = Array.from(
                { length: periodo.n },
                (_, indice) => {

                    const fase = indice / (periodo.n - 1);

                    const variacao =
                        4.9 * Math.sin(
                            indice * 0.62 + componente.length % 4
                        ) +
                        2.7 * Math.cos(
                            indice * 1.02 + componente.length
                        );

                    return cap(
                        base - 5 + fase * 5.5 + variacao
                    );
                }
            );
        }

        const W = 690;
        const H = 218;

        const padL = 37;
        const padR = 12;
        const padT = 11;
        const padB = 28;

        const x = indice =>
            padL + (W - padL - padR) *
            indice / (periodo.n - 1);

        const y = valor =>
            padT + (H - padT - padB) *
            (100 - valor) / 100;

        let svg = `
            <svg
                viewBox="0 0 ${W} ${H}"
                preserveAspectRatio="none"
                aria-label="Séries de CPU, RAM, Disco e Rede"
            >
        `;

        for (const valor of [0, 20, 40, 60, 80, 100]) {

            svg += `
                <line
                    x1="${padL}"
                    y1="${y(valor)}"
                    x2="${W - padR}"
                    y2="${y(valor)}"
                    class="gridline"
                />

                <text
                    x="${padL - 8}"
                    y="${y(valor) + 4}"
                    text-anchor="end"
                    class="axis"
                >
                    ${valor}%
                </text>
            `;
        }

        const label = indice =>
            periodoSelecionado === '24h'
                ? `${String(indice).padStart(2, '0')}h`
                : `D${indice + 1}`;

        const intervalo = Math.max(
            1,
            Math.floor((periodo.n - 1) / 6)
        );

        for (let indice = 0; indice < periodo.n; indice += intervalo) {

            svg += `
                <text
                    x="${x(indice)}"
                    y="${H - 7}"
                    text-anchor="middle"
                    class="axis"
                >
                    ${label(indice)}
                </text>
            `;
        }

        const componentes = componenteAtivo === 'Todos'
            ? Object.keys(LIMITES)
            : [componenteAtivo];

        for (const componente of componentes) {

            const serie = valores[componente];

            const path = serie.map((valor, indice) => {

                return `${
                    indice ? 'L' : 'M'
                }${x(indice).toFixed(1)} ${y(valor).toFixed(1)}`;

            }).join(' ');

            svg += `
                <path
                    d="${path}"
                    fill="none"
                    stroke="${CORES[componente]}"
                    stroke-width="2.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />

                <circle
                    cx="${x(serie.length - 1)}"
                    cy="${y(serie.at(-1))}"
                    r="4"
                    fill="${CORES[componente]}"
                    stroke="#151529"
                    stroke-width="2"
                />
            `;
        }

        $('chartHost').innerHTML = svg + '</svg>';

        $('chartSubtitle').textContent = `
            ${servidor
                ? servidor.id
                : 'Média ilustrativa dos 8 servidores'}
            • ${periodo.nome}
            • ${componenteAtivo === 'Todos'
                ? 'quatro componentes'
                : componenteAtivo}
        `;

        // Informações de interpretação do gráfico

        const selectedIssue = componenteAtivo === 'Todos'
            ? allIssues()[0]
            : allIssues().find(
                item => item.key === componenteAtivo
            );

        const recurso = selectedIssue.key;
        const regra = REGRAS[recurso];

        $('focusLabel').textContent =
            `${recurso.toUpperCase()} • MAIOR REGISTRO`;

        $('focusValue').textContent =
            selectedIssue.value + '%';

        $('focusValue').style.color =
            CORES[recurso];

        $('focusHost').textContent =
            `${selectedIssue.host.id} • limite ${LIMITES[recurso]}%`;

        $('focusReadout').textContent =
            `${LABELS[recurso]}: ${
                lbl[selectedIssue.status].toLowerCase()
            } no cenário selecionado. ${
                selectedIssue.value >= LIMITES[recurso]
                    ? 'O limite hipotético foi ultrapassado.'
                    : 'Acompanhar folga de utilização.'
            }`;

        $('focusInterpretation').textContent = regra.why;
        $('focusAction').textContent = regra.action;

        $('chartToggles').innerHTML = [
            'Todos',
            ...Object.keys(LIMITES)
        ].map(componente => `

            <button
                type="button"
                data-chart="${componente}"
                class="chart-toggle ${
                    componente === componenteAtivo ? 'on' : ''
                }"
                style="--c:${CORES[componente] || '#8585a8'}"
            >
                <span class="key"></span>
                ${componente}
            </button>

        `).join('');
    }

    // ==========================================
    // TABELA DE SERVIDORES
    // ==========================================

    function table() {

        function valorComponente(servidor, componente) {

            let classe = '';

            if (servidor[componente] >= LIMITES[componente]) {
                classe = 'bad';

            } else if (
                servidor[componente] >= LIMITES[componente] * 0.94
            ) {
                classe = 'warn';
            }

            return `
                <span class="mini-val ${classe}">
                    ${servidor[componente]}%
                </span>
            `;
        }

        $('serverRows').innerHTML = STATE.hosts.map(servidor => `

            <tr>

                <td>
                    <b>${escaparHtml(servidor.id)}</b>
                    <small>${escaparHtml(servidor.role)}</small>
                </td>

                <td>${valorComponente(servidor, 'CPU')}</td>
                <td>${valorComponente(servidor, 'RAM')}</td>
                <td>${valorComponente(servidor, 'Disco')}</td>
                <td>${valorComponente(servidor, 'Rede')}</td>

                <td>
                    <span class="severity ${servidor.risk.status}">
                        ${lbl[servidor.risk.status]}
                        · ${servidor.risk.c}
                    </span>
                </td>

                <td>
                    <button
                        class="tablebutton"
                        type="button"
                        data-server="${escaparHtml(servidor.id)}"
                    >
                        Analisar →
                    </button>
                </td>

            </tr>

        `).join('');
    }

    // ==========================================
    // SIMULADOR FINANCEIRO - BILLING
    // ==========================================

    function getNum(id) {

        return Math.max(0, Number($(id).value) || 0);
    }

    function computeCost(nodes, storage, egress) {

        const horas = getNum('hours');
        const precoServidor = getNum('priceNode');
        const precoArmazenamento = getNum('priceStorage');
        const precoTrafego = getNum('priceTraffic');
        const cambio = getNum('fx');

        const custos = {
            nodes: nodes * horas * precoServidor,
            storage: storage * precoArmazenamento,
            traffic: egress * 1024 * precoTrafego
        };

        const totalDolar =
            custos.nodes +
            custos.storage +
            custos.traffic;

        return {
            ...custos,
            usd: totalDolar,
            brl: totalDolar * cambio,
            fx: cambio
        };
    }

    function renderBill() {

        const extra = getNum('extraNodes');
        const storage = getNum('storage');
        const egress = getNum('egress');

        const base = computeCost(
            BASE.nodes,
            BASE.storage,
            BASE.egress
        );

        const scenario = computeCost(
            BASE.nodes + extra,
            storage,
            egress
        );

        const delta = scenario.brl - base.brl;

        STATE.cost = {
            base,
            scenario,
            delta,
            extra,
            storage,
            egress
        };

        $('extraNodesText').textContent =
            `+${extra} ${extra === 1 ? 'nó' : 'nós'}`;

        $('storageText').textContent =
            `${fmt(storage)} GB`;

        $('egressText').textContent =
            `${fmt(egress)} TB/mês`;

        $('billingTotal').textContent =
            BRL(scenario.brl);

        $('billingUsd').textContent =
            USD(scenario.usd) +
            ' • câmbio assumido R$ ' +
            fmt(scenario.fx);

        $('billingBase').textContent =
            BRL(base.brl);

        $('billingDelta').textContent =
            (delta >= 0 ? '+' : '−') +
            BRL(Math.abs(delta));

        const percentual = base.brl > 0
            ? delta / base.brl * 100
            : 0;

        $('billingDeltaPct').textContent =
            `${delta >= 0 ? '+' : ''}${fmt(percentual)}% em relação à referência`;

        $('billingDelta').style.color =
            delta > 0 ? 'var(--orange)' : 'var(--mint)';

        $('kpiCost').textContent =
            BRL(scenario.brl);

        $('kpiCostNote').textContent =
            `${extra} nó(s) adicional(is) • projeção simulada`;

        // Distribuição dos custos

        const categorias = [
            {
                name: 'Computação (instâncias)',
                key: 'nodes',
                color: CORES.CPU
            },
            {
                name: 'Disco / armazenamento',
                key: 'storage',
                color: CORES.Disco
            },
            {
                name: 'Saída de dados / rede',
                key: 'traffic',
                color: CORES.Rede
            }
        ];

        $('billingStack').innerHTML = categorias.map(item => `

            <span
                class="bill-segment"
                title="${item.name}: ${
                    BRL(scenario[item.key] * scenario.fx)
                }"
                style="
                    width:${
                        scenario.usd > 0
                            ? scenario[item.key] / scenario.usd * 100
                            : 0
                    }%;
                    background:${item.color}
                "
            ></span>

        `).join('');

        $('billingRows').innerHTML = categorias.map(item => `

            <div class="costrow">

                <span>
                    <i style="background:${item.color}"></i>
                    ${item.name}
                </span>

                <strong>
                    ${BRL(scenario[item.key] * scenario.fx)}
                </strong>

            </div>

        `).join('');

        // Análise financeira

        if (delta > 0) {

            $('billingEvaluation').innerHTML = `
                <strong>Impacto da decisão:</strong>
                sua configuração adiciona
                ${BRL(delta)}/mês
                (${fmt(percentual)}%)
                em relação à referência.
                Verifique se o ganho esperado de capacidade
                justifica o gasto.
            `;

        } else if (delta < 0) {

            $('billingEvaluation').innerHTML = `
                <strong>Impacto da decisão:</strong>
                a simulação indica redução de
                ${BRL(Math.abs(delta))}/mês.
                Confirme a viabilidade técnica antes
                de reduzir recursos.
            `;

        } else {

            $('billingEvaluation').innerHTML = `
                <strong>Referência:</strong>
                a configuração atual produz o mesmo
                custo estimado da base.
            `;
        }

        // Comparação de cenários

        const options = [
            {
                n: 0,
                label: 'Manter nós atuais'
            },
            {
                n: extra,
                label: `Sua escolha (+${extra})`
            },
            {
                n: Math.min(6, extra + 2),
                label: `Expandir (+${Math.min(6, extra + 2)})`
            }
        ];

        const valores = options.map(opcao =>
            computeCost(
                BASE.nodes + opcao.n,
                storage,
                egress
            ).brl
        );

        const maior = Math.max(...valores) * 1.06;

        $('forecastBars').innerHTML = options.map((opcao, indice) => `

            <div class="forecast-col">

                <label>${opcao.label}</label>

                <strong>${BRL(valores[indice])}</strong>

                <div class="forecast-bar-area">

                    <div
                        class="forecast-bar"
                        style="
                            height:${
                                maior > 0
                                    ? (valores[indice] / maior * 100).toFixed(1)
                                    : 0
                            }%;
                            background:${
                                indice === 1
                                    ? 'var(--mint)'
                                    : indice === 2
                                        ? 'var(--orange)'
                                        : 'var(--blue)'
                            }
                        "
                    ></div>

                </div>

                <small>
                    ${BASE.nodes + opcao.n} nós • mesmos volumes
                </small>

            </div>

        `).join('');
    }

    // ==========================================
    // EXPORTAÇÃO CSV
    // ==========================================

    function reportCsv() {

        const linhas = [
            ['STREAMGUARD • RELATORIO DEMONSTRATIVO'],

            ['Periodo', PERIODO[STATE.period].nome],
            ['Cenario', STATE.scenario],
            ['Tipo de dados', 'Sinteticos / demonstrativos'],

            [],

            [
                'Servidor',
                'Funcao',
                'CPU (%)',
                'RAM (%)',
                'Disco (%)',
                'Rede (% de 1 Gbit/s)',
                'Prioridade'
            ],

            ...STATE.hosts.map(servidor => [
                servidor.id,
                servidor.role,
                servidor.CPU,
                servidor.RAM,
                servidor.Disco,
                servidor.Rede,
                lbl[servidor.risk.status]
            ]),

            [],

            ['CUSTOS ESTIMADOS • VALORES HIPOTETICOS'],

            [
                'Configuracao de referencia (R$)',
                STATE.cost.base.brl.toFixed(2)
            ],

            [
                'Cenario configurado (R$)',
                STATE.cost.scenario.brl.toFixed(2)
            ],

            [
                'Variacao (R$)',
                STATE.cost.delta.toFixed(2)
            ],

            ['Nos adicionais', STATE.cost.extra],
            ['Armazenamento (GB)', STATE.cost.storage],
            ['Trafego saida (TB)', STATE.cost.egress],

            [],

            ['PLANO DE ACAO'],

            ...STATE.plans.map(plano => [
                plano.key,
                REGRAS[plano.key].action
            ])
        ];

        const conteudo = '\ufeff' + linhas.map(linha =>
            linha.map(campo =>
                '"' + String(campo ?? '').replaceAll('"', '""') + '"'
            ).join(';')
        ).join('\r\n');

        const arquivo = new Blob(
            [conteudo],
            { type: 'text/csv;charset=utf-8' }
        );

        const url = URL.createObjectURL(arquivo);

        const link = document.createElement('a');

        link.href = url;
        link.download =
            'streamguard_inteligencia_gerencial_demonstrativo.csv';

        document.body.appendChild(link);

        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1500);

        toast('Relatório CSV demonstrativo gerado.');
    }

    // ==========================================
    // RENDERIZAÇÃO GERAL
    // ==========================================

    function render() {

        STATE.scenario = $('cenario').value;
        STATE.period = $('periodo').value;

        STATE.hosts = hosts();

        renderOverview();
        decisions();
        plans();
        componentCards();
        plot();
        table();
        renderBill();
    }

    function populateServers() {

        HOSTS.forEach(servidor => {

            const option = document.createElement('option');

            option.value = servidor.id;
            option.textContent = servidor.id;

            $('servidorFiltro').appendChild(option);
        });
    }

    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================

    populateServers();
    loadPlans();
    render();

    // ==========================================
    // EVENTOS DOS FILTROS
    // ==========================================

    $('cenario').addEventListener('change', render);

    $('periodo').addEventListener('change', render);

    $('servidorFiltro').addEventListener('change', plot);

    // Seleção dos componentes

    $('componentCards').addEventListener('click', evento => {

        const botao = evento.target.closest('[data-resource]');

        if (!botao) return;

        STATE.active =
            STATE.active === botao.dataset.resource
                ? 'Todos'
                : botao.dataset.resource;

        componentCards();
        plot();
    });

    $('chartToggles').addEventListener('click', evento => {

        const botao = evento.target.closest('[data-chart]');

        if (!botao) return;

        STATE.active = botao.dataset.chart;

        componentCards();
        plot();
    });

    // ==========================================
    // EVENTOS DO PLANO DE AÇÃO
    // ==========================================

    $('decisionList').addEventListener('click', evento => {

        const botao = evento.target.closest('[data-add]');

        if (!botao) return;

        const jaExiste = STATE.plans.some(
            plano => plano.key === botao.dataset.add
        );

        if (!jaExiste) {

            STATE.plans.push({
                key: botao.dataset.add
            });

            savePlans();
            plans();
            decisions();

            toast('Ação adicionada ao plano gerencial.');
        }
    });

    $('planList').addEventListener('click', evento => {

        const botao = evento.target.closest('[data-remove]');

        if (!botao) return;

        STATE.plans = STATE.plans.filter(
            plano => plano.key !== botao.dataset.remove
        );

        savePlans();
        plans();
        decisions();
    });

    // ==========================================
    // DETALHES DOS SERVIDORES
    // ==========================================

    $('serverRows').addEventListener('click', evento => {

        const botao = evento.target.closest('[data-server]');

        if (!botao) return;

        const servidor = STATE.hosts.find(
            item => item.id === botao.dataset.server
        );

        if (!servidor) return;

        modal(
            `${servidor.id} • ${servidor.role}`,

            `CENÁRIO SIMULADO · ${PERIODO[STATE.period].nome}

CPU: ${servidor.CPU}% (limite ${LIMITES.CPU}%)

RAM: ${servidor.RAM}% (limite ${LIMITES.RAM}%)

Disco: ${servidor.Disco}% (limite ${LIMITES.Disco}%)

Rede: ${servidor.Rede}% do enlace hipotético de 1 Gbit/s
(limite ${LIMITES.Rede}%)

Prioridade: ${lbl[servidor.risk.status]} — ${servidor.risk.c}.

Próxima investigação sugerida:
${REGRAS[servidor.risk.c].action}

A presença de um valor crítico não comprova
indisponibilidade nem explica sua causa.`
        );
    });

    // ==========================================
    // EVENTOS DO SIMULADOR FINANCEIRO
    // ==========================================

    const camposFinanceiros = [
        'extraNodes',
        'storage',
        'egress',
        'priceNode',
        'hours',
        'priceStorage',
        'priceTraffic',
        'fx'
    ];

    camposFinanceiros.forEach(id => {

        $(id).addEventListener('input', renderBill);
    });

    // ==========================================
    // EVENTOS DOS RELATÓRIOS
    // ==========================================

    $('buttonCsv').addEventListener('click', reportCsv);

    for (const id of ['buttonPrintTop', 'buttonPrint']) {

        $(id).addEventListener('click', () => {

            toast(
                'Na janela de impressão, escolha “Salvar como PDF”.'
            );

            setTimeout(() => window.print(), 200);
        });
    }

    // ==========================================
    // EXPLICAÇÃO DA METODOLOGIA
    // ==========================================

    $('buttonMethod').addEventListener('click', () => {

        modal(
            'Como interpretar este painel',

            `Este é um PROTÓTIPO: dados e indicadores são simulados.

1. O resumo exibe servidores com recursos em atenção,
quantidade de limites excedidos e custo configurado.

2. Os cartões CPU, RAM, disco e rede exibem o maior
valor entre os servidores, não a média.

No gráfico, a opção inicial mostra a MÉDIA ilustrativa
do parque.

3. A prioridade usa a relação entre utilização e limite
de cada componente, não um diagnóstico de indisponibilidade.

4. Rede usa um enlace hipotético de 1 Gbit/s para
converter velocidade de tráfego em percentual.

O StreamGuard coleta taxas em bytes/s, portanto será
necessário validar a capacidade real do enlace.

5. A projeção de custos usa:

- Nós × horas × tarifa
- Armazenamento (GB-mês)
- Tráfego de saída (GB)

CPU e RAM por si não determinam a fatura.

6. As tarifas editáveis não são preços AWS verificados.
Os números devem ser validados antes de aplicação real.`
        );
    });

    // ==========================================
    // FECHAMENTO DOS MODAIS
    // ==========================================

    $('closeDialog').addEventListener('click', () => {

        $('overlay').hidden = true;
    });

    $('overlay').addEventListener('click', evento => {

        if (evento.target === $('overlay')) {
            $('overlay').hidden = true;
        }
    });

    document.addEventListener('keydown', evento => {

        if (evento.key === 'Escape') {
            $('overlay').hidden = true;
        }
    });

    // ==========================================
    // INTEGRAÇÃO COM O MENU DO STREAMGUARD
    // ==========================================

    function integrarMenuCompartilhado() {

        const sidebar = document.querySelector(
            '[data-shell="sidebar"]'
        );

        const dashboardLink = sidebar?.querySelector(
            '[data-menu="dashboard"]'
        );

        if (!dashboardLink) return;

        if (
            sidebar.querySelector(
                '[data-menu="dashIndividual"]'
            )
        ) {
            return;
        }

        dashboardLink.classList.remove('ativo');
        dashboardLink.removeAttribute('aria-current');

        const link = document.createElement('a');

        link.href = './painel_dashIndividual.html';
        link.className = 'menu-item ativo';

        link.dataset.menu = 'dashIndividual';

        link.setAttribute('aria-current', 'page');

        link.innerHTML = `
            <svg class="sg-ic" aria-hidden="true">
                <use href="#sg-grid"/>
            </svg>

            <span>Inteligência Gerencial</span>
        `;

        dashboardLink.insertAdjacentElement(
            'afterend',
            link
        );

        const selo = document.querySelector('.selo-online');

        if (selo) {
            selo.textContent = '● Dados demonstrativos';
        }
    }

    integrarMenuCompartilhado();


const SECOES_ABA = {

    executivo: [
        'resumo'
    ],

    recursos: [
        'componentes',
        'servidores'
    ],

    custos: [
        'billing'
    ],

    decisoes: [
        'decisoes',
        'relatorios'
    ]

};



function mostrarAba(nomeAba, rolar = true) {

    if (!SECOES_ABA[nomeAba]) {
        return;
    }

    // Percorre as abas cadastradas

    for (const nome in SECOES_ABA) {

        const secoes = SECOES_ABA[nome];

        // Mostra ou oculta cada seção

        for (const id of secoes) {

            const secao = document.getElementById(id);

            if (secao) {
                secao.hidden = nome !== nomeAba;
            }

        }

    }

    // Atualiza a aparência dos botões

    const botoes = document.querySelectorAll('.di-tab');

    botoes.forEach(botao => {

        const selecionado = botao.dataset.tab === nomeAba;

        botao.classList.toggle('ativo', selecionado);

        botao.setAttribute(
            'aria-pressed',
            String(selecionado)
        );

    });

    // Retorna ao início do conteúdo da aba

    if (rolar) {

        document.querySelector('.di-quicknav').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

    }

}


document.querySelector('.di-quicknav')
    .addEventListener('click', function(evento) {

        const botao = evento.target.closest('[data-tab]');

        if (!botao) {
            return;
        }

        mostrarAba(botao.dataset.tab);

    });


const barraFiltros = document.querySelector('#resumo .filterbar');

const navegacao = document.querySelector('.di-quicknav');

if (barraFiltros && navegacao) {

    navegacao.insertAdjacentElement(
        'afterend',
        barraFiltros
    );

}

const atalhoDecisoes = document.querySelector(
    '.notice a[href="#decisoes"]'
);

if (atalhoDecisoes) {

    atalhoDecisoes.addEventListener('click', function(evento) {

        evento.preventDefault();

        mostrarAba('decisoes');

    });

}


const parametros = new URLSearchParams(window.location.search);

const abaInicial = parametros.get('aba');

if (SECOES_ABA[abaInicial]) {

    mostrarAba(abaInicial, false);

} else {

    mostrarAba('executivo', false);

}



})();