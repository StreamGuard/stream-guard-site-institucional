document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const el = id => document.getElementById(id);
    const cores = { CPU: '#2de2c0', RAM: '#b095fc', Disco: '#66a8ff' };
    const paletaServidores = ['#2de2c0', '#b095fc', '#66a8ff', '#f5b45f', '#f36d7c', '#69c4e8'];
    const nomesComponentes = { CPU: 'CPU', RAM: 'Memória RAM', Disco: 'Disco' };
    const artigosComponentes = { CPU: 'da CPU', RAM: 'da memória RAM', Disco: 'do disco' };
    const charts = { horarios: null, disco: null };
    // Converte três minutos para milissegundos, unidade esperada por setInterval.
    const intervaloAtualizacaoMs = 3 * 60 * 1000;
    let dados = null;
    let visaoAtual = 'monitoramento';
    let carregando = false;

    const escapar = texto => String(texto ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[caractere]));

    const numeroPt = valor => Number(valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });

    function dataLocal(valor) {
        if (!valor) return null;
        const data = new Date(`${String(valor).replace(' ', 'T')}-03:00`);
        return Number.isNaN(data.getTime()) ? null : data;
    }

    function dataHora(valor) {
        const data = dataLocal(valor);
        return data ? data.toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }) : 'sem amostra';
    }

    function dataCurta(valor) {
        const data = dataLocal(valor);
        return data ? data.toLocaleDateString('pt-BR', {
            timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit'
        }) : '—';
    }

    function destruirChart(chave) {
        if (charts[chave]) {
            charts[chave].destroy();
            charts[chave] = null;
        }
    }

    function plotarGrafico(chave, canvasId, configuracao) {
        charts[chave] = new Chart(el(canvasId), configuracao);
    }

    function atualizarGrafico(chave, dadosGrafico, opcoes) {
        const grafico = charts[chave];
        grafico.data.labels = dadosGrafico.labels;
        grafico.data.datasets = dadosGrafico.datasets;
        grafico.options = opcoes;
        grafico.update();
    }

    function exibirGrafico(chave, canvasId, configuracao) {
        if (charts[chave]) {
            atualizarGrafico(chave, configuracao.data, configuracao.options);
            return;
        }

        plotarGrafico(chave, canvasId, configuracao);
    }

    function mostrarEstadoGrafico(canvasId, vazioId, mensagem) {
        const canvas = el(canvasId);
        const vazio = el(vazioId);
        canvas.hidden = true;
        vazio.textContent = mensagem;
        vazio.hidden = false;
    }

    function mostrarCanvas(canvasId, vazioId) {
        el(canvasId).hidden = false;
        el(vazioId).hidden = true;
    }

    function temaChart() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: {
                    labels: {
                        color: '#c5c9dc',
                        usePointStyle: true,
                        boxWidth: 9,
                        padding: 16
                    }
                },
                tooltip: {
                    backgroundColor: '#171727',
                    borderColor: '#3a3a54',
                    borderWidth: 1,
                    titleColor: '#f1f2f8',
                    bodyColor: '#d5d8e5',
                    padding: 11
                }
            },
            scales: {
                x: {
                    grid: { color: '#25253a' },
                    ticks: { color: '#a8adc7', maxRotation: 0 }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: '#2a2a44' },
                    ticks: { color: '#a8adc7' },
                    title: { display: true, text: '%', color: '#a8adc7' }
                }
            }
        };
    }

    function empresaSelecionadaRoot() {
        try {
            const valor = JSON.parse(localStorage.getItem('streamguard:empresa-selecionada'));
            return Number.isSafeInteger(Number(valor)) && Number(valor) > 0 ? Number(valor) : null;
        } catch (erro) {
            return null;
        }
    }

    async function carregar() {
        if (carregando) return;
        carregando = true;
        el('estadoAtualizacao').textContent = 'Consultando dados…';

        try {
            const servidorSelecionado = el('servidor').value;
            const parametros = new URLSearchParams();
            const usuarioId = Number(sessionStorage.getItem('ID_USUARIO'));
            if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
                throw new Error('Não encontrei o ID de usuário da conta. Entre novamente para consultar os dados.');
            }
            parametros.set('usuarioId', usuarioId);

            if (String(window.SG?.perfil).toLowerCase() === 'root') {
                const empresaId = empresaSelecionadaRoot();
                if (!empresaId) throw new Error('Selecione uma empresa no painel administrativo antes de abrir esta dashboard.');
                parametros.set('empresaId', empresaId);
            }

            const sufixo = parametros.size ? `?${parametros.toString()}` : '';
            // Consulta o endpoint da dashboard e pede que o navegador não reutilize uma resposta em cache.
            const resposta = await fetch(`/dashboard-geral${sufixo}`, {
                headers: { Accept: 'application/json' },
                cache: 'no-store'
            });

            const corpo = await resposta.json();
            if (!resposta.ok) throw new Error(corpo.mensagem || 'Não foi possível carregar os dados.');

            dados = corpo;
            window.SG?.usuario && (window.SG.usuario.empresa = corpo.empresa.nome);
            el('empresaAtual').textContent = corpo.empresa.nome;
            el('servidor').innerHTML = '<option value="todos">Todos os servidores</option>' +
                corpo.servidores.map(servidor => `<option value="${servidor.id}">${escapar(servidor.nome)}</option>`).join('');
            el('servidor').value = corpo.servidores.some(servidor => String(servidor.id) === servidorSelecionado)
                ? servidorSelecionado
                : 'todos';
            preencherContexto();
            render();
            const horarioConsulta = new Date().toLocaleTimeString('pt-BR', {
                hour: '2-digit', minute: '2-digit'
            });
            el('estadoAtualizacao').textContent = `Consulta às ${horarioConsulta}`;
        } catch (erro) {
            dados = null;
            el('empresaAtual').textContent = 'Empresa não carregada';
            el('escopo').textContent = '';
            el('resumoOperacional').innerHTML = '';
            mostrarEstadoGrafico('graficoHorarios', 'horariosVazio', 'Os gráficos de utilização aguardam dados da API.');
            mostrarEstadoGrafico('graficoDisco', 'discoVazio', 'A previsão depende do histórico de medições disponível.');
            el('servidoresAtuais').innerHTML = `<p class="grafico-vazio">${escapar(erro.message)}</p>`;
            el('estadoAtualizacao').textContent = 'Falha na consulta';
            render();
        } finally {
            carregando = false;
        }
    }

    function preencherContexto() {
        if (!dados) return;
        const inicio = new Date(`${dados.periodoSemana.inicio}T00:00:00-03:00`);
        const fim = new Date(`${dados.periodoSemana.fim}T00:00:00-03:00`);
        const periodo = `${inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}–${fim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
        const ultima = dados.ultimaAmostra ? ` · dados disponíveis até ${dataHora(dados.ultimaAmostra)}` : ' · sem medições disponíveis';
        el('escopo').textContent = `Semana ${periodo}${ultima}`;
        el('tagPeriodo').textContent = dados.ultimaAmostra ? `Dados até ${dataHora(dados.ultimaAmostra)}` : 'Sem medições disponíveis';
        el('semanaPeriodo').textContent = `Semana ${periodo}`;
    }

    function servidoresSelecionados() {
        if (!dados) return [];
        const filtro = el('servidor').value;
        return filtro === 'todos'
            ? dados.servidores
            : dados.servidores.filter(servidor => String(servidor.id) === filtro);
    }

    function atualizarIdentificacaoGraficos(selecionados) {
        const empresa = dados.empresa?.nome || 'Empresa não identificada';
        const servidores = selecionados.map(servidor => servidor.nome).join(', ') || 'nenhum servidor selecionado';
        const identificacao = `Empresa: ${empresa} · Servidor(es): ${servidores}`;
        el('escopoHorarios').textContent = identificacao;
        el('escopoDisco').textContent = identificacao;
    }

    function mostrarResumo() {
        if (!dados) return;

        const estados = dados.servidores.map(estadoDoServidor);
        const criticos = estados.filter(estado => estado === 'critico').length;
        const dentroDosLimites = estados.filter(estado => estado === 'normal').length;
        const ultima = dados.ultimaAmostra ? dataHora(dados.ultimaAmostra) : 'sem amostra disponível';

        el('resumoOperacional').innerHTML = `
            <article class="kpi-saude ${criticos ? 'estado-critico' : ''}"><span>Limite excedido</span><strong>${criticos}</strong><small>servidores para investigar</small></article>
            <article class="kpi-saude estado-normal"><span>Dentro dos limites</span><strong>${dentroDosLimites}</strong><small>na última amostra disponível</small></article>
            <p class="resumo-atualizacao">Última medição de recursos: ${escapar(ultima)}.</p>`;
    }

    // Classifica o servidor usando as últimas medições e os limites configurados para seus componentes.
    function estadoDoServidor(servidor) {
        const componentes = ['CPU', 'RAM', 'Disco'].map(tipo => servidor.componentes[tipo]);
        if (componentes.some(componente => componente?.acimaDoLimite)) return 'critico';
        if (componentes.every(componente => !componente)) return 'sem-dados';
        const avaliacaoCompleta = componentes.every(componente => componente && componente.limite !== null);
        return avaliacaoCompleta ? 'normal' : 'incompleto';
    }

    function renderizarServidores() {
        if (!dados) return;

        const prioridade = { critico: 0, incompleto: 1, 'sem-dados': 2, normal: 3 };
        const servidoresOrdenados = [...dados.servidores].sort((a, b) =>
            prioridade[estadoDoServidor(a)] - prioridade[estadoDoServidor(b)] || a.nome.localeCompare(b.nome, 'pt-BR')
        );

        el('servidoresAtuais').innerHTML = servidoresOrdenados.map(servidor => {
            const estado = estadoDoServidor(servidor);
            const tituloEstado = estado === 'critico' ? 'Limite excedido na última medição'
                : estado === 'sem-dados' ? 'Sem medições disponíveis'
                    : estado === 'incompleto' ? 'Medições ou limites incompletos'
                        : 'Dentro dos limites na última medição';
            const componentes = ['CPU', 'RAM', 'Disco'].map(tipo => {
                const metrica = servidor.componentes[tipo];
                const limite = servidor.limites[tipo]?.maximo;
                const estadoComponente = !metrica ? 'sem-dados'
                    : metrica.acimaDoLimite ? 'critico'
                        : limite === null || limite === undefined ? 'sem-limite' : 'normal';
                const limiteTexto = limite !== null && limite !== undefined
                    ? `Limite ${numeroPt(limite)}%`
                    : 'Limite não configurado';
                const amostraTexto = metrica ? `Medição ${dataHora(metrica.inicio)}` : 'Sem medição disponível';
                return `<div class="indicador-componente ${estadoComponente}">` +
                    `<span>${nomesComponentes[tipo]}</span>` +
                    `<strong>${metrica ? `${numeroPt(metrica.media)}%` : '—'}</strong>` +
                    `<small>${limiteTexto}</small><small>${escapar(amostraTexto)}</small></div>`;
            }).join('');

            return `
                <article class="servidor-atual ${estado}">
                    <span class="servidor-plataforma">${escapar(dados.empresa?.nome || 'Empresa não identificada')}</span>
                    <div class="servidor-identidade">
                        <strong>${escapar(servidor.nome)}</strong>
                        <span class="estado-saude">${escapar(tituloEstado)}</span>
                    </div>
                    <span class="componentes-atuais">${componentes}</span>
                    <span class="resumo-servidor">Última amostra disponível: ${escapar(dataHora(servidor.ultimaAmostra))}</span>
                </article>`;
        }).join('') || '<p class="sem-dados">Nenhum servidor cadastrado nesta empresa.</p>';
    }

    function renderizarUtilizacao() {
        const tipo = el('componente').value;
        el('tituloHorarios').textContent = `Utilização média ${artigosComponentes[tipo]} por faixa horária`;
        const selecionados = servidoresSelecionados();
        atualizarIdentificacaoGraficos(selecionados);
        // O Set permite filtrar as medições pelos IDs selecionados sem repetir a busca na lista.
        const ids = new Set(selecionados.map(servidor => servidor.id));
        const registros = (dados?.utilizacao || []).filter(item => item.tipo === tipo && ids.has(item.servidorId));
        const faixas = [0, 1, 2, 3];
        const valores = faixas.map(faixa => {
            const linhas = registros.filter(item => item.faixa === faixa);
            const totalAmostras = linhas.reduce((soma, item) => soma + item.amostras, 0);
            // Pondera cada média pelo número de amostras, para faixas com volumes diferentes terem peso correto.
            return {
                media: totalAmostras ? linhas.reduce((soma, item) => soma + item.media * item.amostras, 0) / totalAmostras : null,
                servidores: linhas.length,
                amostras: totalAmostras
            };
        });

        const nomesFaixas = ['00–06h', '06–12h', '12–18h', '18–24h'];
        if (!valores.some(valor => valor.media !== null)) {
            destruirChart('horarios');
            mostrarEstadoGrafico('graficoHorarios', 'horariosVazio', 'Não há medições desta semana para o componente e servidor selecionados.');
            return;
        }

        mostrarCanvas('graficoHorarios', 'horariosVazio');
        const options = temaChart();
        options.indexAxis = 'y';
        options.scales.x.beginAtZero = true;
        options.scales.x.max = 100;
        options.scales.x.title = { display: true, text: '%', color: '#a8adc7' };
        options.scales.y.grid.display = false;
        options.scales.y.title = { display: false };
        options.plugins.tooltip.callbacks = {
            afterLabel: contexto => {
                const detalhe = valores[contexto.dataIndex];
                return `${detalhe.servidores} servidor(es) · ${detalhe.amostras} amostras`;
            }
        };
        exibirGrafico('horarios', 'graficoHorarios', {
            type: 'bar',
            data: {
                labels: nomesFaixas,
                datasets: [{
                    label: `Média ${nomesComponentes[tipo]}`,
                    data: valores.map(valor => valor.media),
                    backgroundColor: `${cores[tipo]}cc`,
                    borderColor: cores[tipo],
                    borderWidth: 1,
                    borderRadius: 5,
                    maxBarThickness: 42
                }]
            },
            options
        });
    }

    // Ajusta uma reta aos valores diários e devolve uma função que estima a ocupação para outra data.
    function ajustarRegressao(pontos) {
        if (pontos.length < 2) return null;
        const referencia = new Date(`${pontos[0].dia}T00:00:00Z`).getTime();
        const xs = pontos.map(ponto => (new Date(`${ponto.dia}T00:00:00Z`).getTime() - referencia) / 86400000);
        const ys = pontos.map(ponto => ponto.media);
        const mediaX = xs.reduce((soma, valor) => soma + valor, 0) / xs.length;
        const mediaY = ys.reduce((soma, valor) => soma + valor, 0) / ys.length;
        const divisor = xs.reduce((soma, valor) => soma + (valor - mediaX) ** 2, 0);
        if (!divisor) return null;
        const inclinacao = xs.reduce((soma, valor, indice) => soma + (valor - mediaX) * (ys[indice] - mediaY), 0) / divisor;
        const intercepto = mediaY - inclinacao * mediaX;
        return dia => {
            const x = (new Date(`${dia}T00:00:00Z`).getTime() - referencia) / 86400000;
            return intercepto + inclinacao * x;
        };
    }

    function datasSemana() {
        const datas = [];
        const atual = new Date(`${dados.periodoSemana.inicio}T00:00:00Z`);
        for (let i = 0; i < 7; i++) {
            datas.push(atual.toISOString().slice(0, 10));
            atual.setUTCDate(atual.getUTCDate() + 1);
        }
        return datas;
    }

    function renderizarCapacidade() {
        const selecionados = servidoresSelecionados();
        atualizarIdentificacaoGraficos(selecionados);
        const datas = datasSemana();
        const registros = dados?.capacidade || [];
        const datasets = [];
        let maiorValor = 100;

        selecionados.forEach((servidor, indice) => {
            const historico = registros.filter(item => item.servidorId === servidor.id)
                .sort((a, b) => a.dia.localeCompare(b.dia))
                .slice(-28);
            // Indexa o histórico por data para localizar a ocupação de cada dia da semana rapidamente.
            const porDia = new Map(historico.map(item => [item.dia, item.media]));
            const observadosSemana = datas.map(dia => porDia.has(dia) ? porDia.get(dia) : null);
            const ultimaDataObservada = [...datas].reverse().find(dia => porDia.has(dia));
            const cor = paletaServidores[indice % paletaServidores.length];
            const pontoAtual = ultimaDataObservada ? porDia.get(ultimaDataObservada) : null;
            const limite = servidor.limites.Disco?.maximo;

            datasets.push({
                label: `${servidor.nome} · observado`,
                data: observadosSemana,
                borderColor: cor,
                backgroundColor: cor,
                pointRadius: 3,
                pointHoverRadius: 5,
                borderWidth: 2,
                tension: 0.2,
                spanGaps: false
            });

            const diasEntre = historico.length > 1
                ? (new Date(`${historico.at(-1).dia}T00:00:00Z`) - new Date(`${historico[0].dia}T00:00:00Z`)) / 86400000
                : -1;
            const tem28DiasContiguos = historico.length === 28 && diasEntre === 27;
            const regressao = tem28DiasContiguos ? ajustarRegressao(historico) : null;
            const previsao = regressao && ultimaDataObservada
                ? datas.map(dia => dia < ultimaDataObservada ? null
                    : dia === ultimaDataObservada ? pontoAtual
                        : regressao(dia))
                : datas.map(() => null);

            if (regressao && ultimaDataObservada) {
                datasets.push({
                    label: `${servidor.nome} · predição linear`,
                    data: previsao,
                    borderColor: cor,
                    backgroundColor: cor,
                    borderDash: [6, 5],
                    pointRadius: 2,
                    borderWidth: 2,
                    tension: 0.2,
                    spanGaps: false
                });
                maiorValor = Math.max(maiorValor, ...historico.map(item => item.media), ...previsao.filter(valor => valor !== null), limite || 0);
            } else {
                maiorValor = Math.max(maiorValor, ...historico.map(item => item.media), limite || 0);
            }

            if (limite !== null && limite !== undefined) {
                datasets.push({
                    label: `${servidor.nome} · limite ${numeroPt(limite)}%`,
                    data: datas.map(() => limite),
                    borderColor: '#ff8799',
                    backgroundColor: '#ff8799',
                    borderDash: [3, 5],
                    pointRadius: 0,
                    borderWidth: 1,
                    tension: 0
                });
            }
        });

        const algumDado = datasets.some(dataset => dataset.data.some(valor => valor !== null));
        if (!algumDado) {
            destruirChart('disco');
            mostrarEstadoGrafico('graficoDisco', 'discoVazio', 'Não há medições de disco para esta semana e os servidores selecionados.');
        } else {
            mostrarCanvas('graficoDisco', 'discoVazio');
            const options = temaChart();
            options.scales.x.grid.display = false;
            options.scales.x.ticks.callback = (_, indice) => {
                const dia = new Date(`${datas[indice]}T00:00:00Z`);
                return dia.toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'short', day: '2-digit' });
            };
            options.scales.y.max = Math.max(100, Math.ceil(maiorValor / 10) * 10);
            options.plugins.tooltip.callbacks = {
                title: itens => itens.length ? new Date(`${datas[itens[0].dataIndex]}T00:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC', dateStyle: 'full' }) : ''
            };
            exibirGrafico('disco', 'graficoDisco', {
                type: 'line',
                data: { labels: datas, datasets },
                options
            });
        }

    }

    function render() {
        el('monitoramentoAtual').hidden = visaoAtual !== 'monitoramento';
        el('perfilUtilizacao').hidden = visaoAtual !== 'desempenho';
        el('resumoOperacional').hidden = visaoAtual !== 'monitoramento';
        el('abrirMonitoramento').setAttribute('aria-pressed', String(visaoAtual === 'monitoramento'));
        el('abrirPerfil').setAttribute('aria-pressed', String(visaoAtual === 'desempenho'));

        if (!dados) return;

        mostrarResumo();
        renderizarServidores();

        if (visaoAtual === 'desempenho') {
            renderizarUtilizacao();
            renderizarCapacidade();
        }
    }

    function trocarVisao(visao) {
        visaoAtual = visao;
        render();
    }

    el('abrirMonitoramento').addEventListener('click', () => trocarVisao('monitoramento'));
    el('abrirPerfil').addEventListener('click', () => trocarVisao('desempenho'));
    el('servidor').addEventListener('change', () => {
        if (visaoAtual === 'desempenho') {
            renderizarUtilizacao();
            renderizarCapacidade();
        }
    });
    el('componente').addEventListener('change', renderizarUtilizacao);
    function expandirPainel(ativo) {
        document.body.classList.toggle('modo-telao', ativo);
        el('expandirPainel').setAttribute('aria-pressed', String(ativo));
        el('expandirPainel').textContent = ativo ? 'Sair do telão' : 'Modo telão';
        window.requestAnimationFrame(() => Object.values(charts).forEach(chart => chart?.resize()));
    }

    el('expandirPainel').addEventListener('click', () => {
        expandirPainel(!document.body.classList.contains('modo-telao'));
    });
    document.addEventListener('keydown', evento => {
        if (evento.key === 'Escape' && document.body.classList.contains('modo-telao')) expandirPainel(false);
    });

    window.SG?.definirNotificacoes([]);
    carregar();
    // Atualiza os dados a cada três minutos enquanto a página estiver visível.
    window.setInterval(() => {
        if (document.visibilityState === 'visible') carregar();
    }, intervaloAtualizacaoMs);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') carregar();
    });
});
