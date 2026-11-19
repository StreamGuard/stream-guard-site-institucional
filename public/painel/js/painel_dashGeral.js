document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const el = id => document.getElementById(id);
    const cores = { CPU: '#2de2c0', RAM: '#b095fc', Disco: '#66a8ff', Rede: '#f5b45f' };
    const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmt = (n, casas = 1) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
    const dataHora = valor => new Date(valor).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    /* Dados locais e fictícios, usados somente na prévia visual da dashboard geral. */
    const dadosMock = (() => {
        const servidores = [
            { id: '1', nome: 'srv-stream-01', disco: 48, crescimento: 1.05 },
            { id: '2', nome: 'srv-edge-01', disco: 54, crescimento: 0.8 },
            { id: '3', nome: 'srv-backup-01', disco: 58, crescimento: 0.68 }
        ];
        const horarios = {
            CPU: [31, 54, 68, 84], RAM: [43, 58, 71, 79],
            Disco: [62, 67, 74, 81]
        };
        const media = valores => valores.reduce((s, n) => s + n, 0) / valores.length;

        function ajuste(valores) {
            const mx = (valores.length - 1) / 2;
            const my = media(valores);
            const b = valores.reduce((s, y, x) => s + (x - mx) * (y - my), 0) /
                valores.reduce((s, _, x) => s + (x - mx) ** 2, 0);
            return x => my + b * (x - mx);
        }

        function obter(servidor = 'todos') {
            const selecionados = servidor === 'todos' ? servidores : servidores.filter(s => s.id === servidor);
            const ids = selecionados.map(s => servidores.indexOf(s));
            const discoHistorico = Array.from({ length: 28 }, (_, d) => media(selecionados.map(s =>
                s.disco + d * s.crescimento + Math.sin(d * 0.7 + Number(s.id)) * 0.6)));
            const preverDisco = ajuste(discoHistorico);
            return {
                periodo: { inicio: '2026-11-16', fim: '2026-11-23' },
                equipamentos: servidores.map(s => ({ id: s.id, nome: s.nome })),
                horarios: Object.fromEntries(Object.keys(horarios).map(c => [c, horarios[c].map(n => ({
                    valor: media(ids.map(i => n + [7, -2, -5][i])),
                    amostras: 720 * selecionados.length, servidores: selecionados.length
                }))])),
                disco: {
                    observado: [[1, preverDisco(29) - 0.8], [2, preverDisco(30) - 0.25], [2 + 14 / 24, preverDisco(30.5) + 0.6]],
                    predicao: Array.from({ length: 8 }, (_, d) => [d, preverDisco(28 + d)]),
                    limite: 85, diasHistoricos: 28
                },
                avisos: ['Todos os números desta prévia são fictícios e ficam somente no frontend.',
                    'A linha prevista de disco ilustra um ajuste linear sobre 28 valores locais de exemplo.']
            };
        }

        // Um ponto por minuto. Cenários exclusivamente visuais, sem relação com incidentes reais.
        const cenarios = [
            { id: '1', plataforma: 'Twitch', transmissao: 'Alanzoka', disponibilidade: 'Disponível',
                estado: 'critico', rotulo: 'Crítico', resumo: 'RAM acima de 88% há 7 minutos',
                acao: 'Investigar consumo de memória e avaliar redistribuição da carga.',
                cpu: 68, ram: 92, disco: 64 },
            { id: '2', plataforma: 'Kick', transmissao: 'Coringa', disponibilidade: 'Disponível',
                estado: 'atencao', rotulo: 'Atenção', resumo: 'CPU elevada; acompanhar a evolução',
                acao: 'Verificar a carga de processamento e acompanhar sua persistência.',
                cpu: 82, ram: 67, disco: 58 },
            { id: '3', plataforma: 'YouTube', transmissao: 'Cazé', disponibilidade: 'Disponível',
                estado: 'normal', rotulo: 'Normal', resumo: 'Componentes dentro das referências do exemplo',
                acao: 'Manter o acompanhamento dos componentes durante a transmissão.',
                cpu: 43, ram: 57, disco: 49 }
        ].map((c, indice) => ({
            ...c,
            nome: servidores[indice].nome,
            series: Object.fromEntries(['CPU', 'RAM', 'Disco'].map(componente => [componente,
                Array.from({ length: 31 }, (_, minuto) => {
                    let valor;
                    if (componente === 'RAM' && indice === 0) {
                        valor = minuto >= 23 ? 89 + (minuto - 23) * 0.4 + Math.sin(minuto) * 0.5
                            : 60 + minuto * 1.05 + Math.sin(minuto * 0.6) * 2;
                    } else {
                        const base = c[{ CPU: 'cpu', RAM: 'ram', Disco: 'disco' }[componente]];
                        valor = componente === 'Disco' ? base - (30 - minuto) * 0.025
                            : base - (30 - minuto) * (indice === 1 ? 0.45 : 0.2) + Math.sin(minuto * 0.7 + indice) * 2.5;
                    }
                    if (minuto === 30) valor = c[{ CPU: 'cpu', RAM: 'ram', Disco: 'disco' }[componente]];
                    return [minuto, Math.round(valor * 10) / 10];
                })]))
        }));

        // Medições fictícias de um trecho definido. Não derivadas das taxas de tráfego.
        const qualidadeRede = cenarios.map((c, indice) => ({
            id: c.id,
            utilizacao: [62, 48, 35][indice],
            capacidadeMbps: 1000,
            medicoes: Array.from({ length: 31 }, (_, minuto) => {
                const degradacao = indice === 0 && minuto >= 20;
                const oscilacao = indice === 1 && minuto >= 12 && minuto <= 17;
                const perdidos = degradacao ? 6 + (minuto % 5) * 2 : oscilacao ? 2 + minuto % 3 : 0;
                const latencias = Array.from({ length: 10 }, (_, amostra) => {
                    const base = degradacao ? 105 + (minuto % 4) * 12 : oscilacao ? 65 : 28 + indice * 5;
                    const variacao = degradacao ? 24 : oscilacao ? 13 : 2;
                    return Math.round((base + (amostra % 2 ? variacao : -variacao) + Math.sin(minuto + amostra) * 2) * 10) / 10;
                });
                const latencia = media(latencias);
                const jitter = media(latencias.slice(1).map((n, i) => Math.abs(n - latencias[i])));
                return { minuto, enviados: 100, perdidos, perda: perdidos,
                    latencia, jitter };
            })
        }));

        return { obter, cenarios, qualidadeRede };
    })();

    let dados = null;

    function vazio(id, texto) {
        el(id).innerHTML = '<p class="sem-dados">' + esc(texto) + '</p>';
    }

    function eixos(w, h, max, percentual, xMax = 7) {
        const p = { l: 43, r: 20, t: 24, b: 35 };
        const x = v => p.l + (w - p.l - p.r) * v / xMax;
        const y = v => h - p.b - (h - p.t - p.b) * v / max;
        let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
        for (let i = 0; i <= 4; i++) {
            const v = max * i / 4;
            svg += `<line x1="${p.l}" y1="${y(v)}" x2="${w - p.r}" y2="${y(v)}" stroke="#2a2a44"/><text x="${p.l - 8}" y="${y(v) + 4}" text-anchor="end">${Math.round(v)}${percentual ? '%' : ''}</text>`;
        }
        return { svg, x, y, p };
    }

    function linha(pontos, x, y, cor, tracejada = false) {
        let caminho = '', conectar = false;
        for (const [t, v] of pontos) {
            if (v === null || !Number.isFinite(v)) { conectar = false; continue; }
            caminho += `${conectar ? 'L' : 'M'}${x(t).toFixed(2)} ${y(v).toFixed(2)} `;
            conectar = true;
        }
        return `<path d="${caminho}" stroke="${cor}" stroke-width="2.8" fill="none" ${tracejada ? 'stroke-dasharray="6 5"' : ''}/>` + pontos.filter(p => p[1] !== null && Number.isFinite(p[1])).map(p => `<circle cx="${x(p[0])}" cy="${y(p[1])}" r="3" fill="${cor}"><title>${fmt(p[1])}</title></circle>`).join('');
    }

    function contexto() {
        return el('servidor').value === 'todos' ? 'Todos os servidores' : dados?.equipamentos.find(e => e.id === el('servidor').value)?.nome || 'Equipamento';
    }

    function graficoHorarios() {
        const c = el('componente').value;
        const valores = dados?.horarios[c] || [];
        el('horarioContexto').textContent = `${c} · ${contexto()} · médias amostrais da semana`;
        if (!valores.some(p => p.valor !== null)) { vazio('graficoHorarios', 'Sem medições disponíveis para este componente na semana.'); return; }
        const w = Math.max(180, el('graficoHorarios').clientWidth), h = w < 500 ? 300 : 380;
        const max = Math.max(100, Math.ceil(Math.max(...valores.map(p => p.valor || 0)) / 20) * 20);
        const { svg, x, y } = eixos(w, h, max, true, 4);
        const largura = Math.min(86, (w - 63) / 4 * 0.56);
        const faixas = w < 380 ? ['00–06', '06–12', '12–18', '18–24'] : ['00h–06h', '06h–12h', '12h–18h', '18h–24h'];
        let out = svg;
        valores.forEach((p, i) => {
            const cx = x(i + 0.5);
            if (p.valor !== null) out += `<rect x="${cx - largura / 2}" y="${y(p.valor)}" width="${largura}" height="${y(0) - y(p.valor)}" rx="5" fill="${cores[c]}" fill-opacity=".8"><title>${p.amostras} amostras de ${p.servidores} servidor(es)</title></rect><text class="valor-barra" x="${cx}" y="${y(p.valor) - 9}" text-anchor="middle">${fmt(p.valor)}%</text>`;
            else out += `<text x="${cx}" y="${y(0) - 14}" text-anchor="middle">—</text>`;
            out += `<text x="${cx}" y="${h - 11}" text-anchor="middle">${faixas[i]}</text>`;
        });
        el('graficoHorarios').innerHTML = out + '</svg>';
    }

    function graficoDisco() {
        const id = 'graficoDisco';
        const d = dados?.disco;
        const observado = d?.observado || [], predicao = d?.predicao || [];
        el('discoContexto').textContent = contexto() + ' · ocupação média do disco raiz';
        if (!observado.some(p => p[1] !== null) && !predicao.length) {
            vazio(id, 'Sem medições disponíveis na semana e sem histórico suficiente para predição.');
        } else {
            const numeros = [...observado, ...predicao].filter(p => p[1] !== null).map(p => p[1]);
            const max = Math.max(100, Math.ceil(Math.max(...numeros, d.limite || 0) / 20) * 20);
            const w = Math.max(180, Math.min(1400, el(id).clientWidth)), h = 320;
            const { svg, x, y, p } = eixos(w, h, max, true);
            let out = svg;
            if (Number.isFinite(d.limite)) out += `<line x1="${p.l}" x2="${w - p.r}" y1="${y(d.limite)}" y2="${y(d.limite)}" stroke="#ff8799" stroke-dasharray="4 5"/><text x="${w - p.r}" y="${y(d.limite) - 6}" text-anchor="end" style="fill:#ff8799">Limite ${fmt(d.limite)}%</text>`;
            out += linha(predicao, x, y, '#f5b45f', true) + linha(observado, x, y, cores.Disco);
            dias.forEach((dia, i) => out += `<text x="${x(i + 0.5)}" y="${h - 10}" text-anchor="middle">${dia}</text>`);
            el(id).innerHTML = out + '</svg>';
        }
        const ultimo = observado.filter(p => p[1] !== null).at(-1)?.[1];
        el('discoResumo').textContent = `Última média diária observada: ${ultimo !== undefined ? fmt(ultimo) + '%' : 'indisponível'}. ` +
            (predicao.length ? `Predição para o fim de domingo: ${fmt(predicao.at(-1)[1])}%.` : `Histórico insuficiente: ${d?.diasHistoricos || 0}/28 dias com cobertura mínima. Sem predição.`) +
            (d?.limite === null ? ' Limite ausente ou diferente entre servidores: selecione um equipamento.' : '');
    }

    let servidorMonitorado = '1';
    let visaoAtual = 'monitoramento';

    function monitoramentoAtual() {
        const secao = el('monitoramentoAtual');
        secao.hidden = visaoAtual !== 'monitoramento';
        const cenarios = dadosMock.cenarios;
        el('resumoOperacional').innerHTML = `
            <span class="critico"><b>${cenarios.filter(c => c.estado === 'critico').length}</b> servidor crítico</span>
            <span class="atencao"><b>${cenarios.filter(c => c.estado === 'atencao').length}</b> em atenção</span>
            <span class="normal"><b>${cenarios.filter(c => c.disponibilidade === 'Disponível').length}/${cenarios.length}</b> disponíveis</span>
            <small>Saúde dos componentes · disponibilidade simulada</small>`;
        const filtro = el('servidor').value;
        const visiveis = filtro === 'todos' ? cenarios : cenarios.filter(c => c.id === filtro);
        if (!visiveis.some(c => c.id === servidorMonitorado)) servidorMonitorado = visiveis[0].id;
        const selecionado = cenarios.find(c => c.id === servidorMonitorado);
        el('servidoresAtuais').innerHTML = visiveis.map(c => `
            <button type="button" class="servidor-atual ${c.estado}" data-servidor="${c.id}"
                aria-pressed="${c.id === servidorMonitorado}" aria-label="Ver componentes de ${esc(c.nome)}, ${esc(c.transmissao)}">
                <span class="servidor-plataforma">${esc(c.plataforma)} · ${esc(c.transmissao)}</span>
                <span class="servidor-identidade"><strong>${esc(c.nome)}</strong><span class="estado-saude">${esc(c.rotulo)}</span></span>
                <span class="disponibilidade"><i></i>${esc(c.disponibilidade)} <small>· simulado</small></span>
                <span class="componentes-atuais"><span>CPU <b>${c.cpu}%</b></span><span>RAM <b>${c.ram}%</b></span><span>Disco <b>${c.disco}%</b></span></span>
                <span class="resumo-servidor">${esc(c.resumo)}</span>
                <span class="ver-servidor">${c.id === servidorMonitorado ? 'Exibindo no gráfico ↓' : 'Ver componentes →'}</span>
            </button>`).join('');
        el('tituloMonitoramento').textContent = `${selecionado.plataforma} · ${selecionado.transmissao} — ${selecionado.nome}`;
        el('contextoMonitoramento').textContent = 'Disponível no cenário simulado · utilização dos componentes, de 13h30 a 14h';
        const filtroSerie = el('serieMonitoramento').value;
        const mostrarRAM = filtroSerie === 'todos' || filtroSerie === 'RAM';
        const w = Math.max(240, el('graficoMonitoramento').clientWidth);
        const topoGrafico = el('graficoMonitoramento').getBoundingClientRect().top + window.scrollY;
        const h = w < 600 ? 300 : Math.max(160, Math.min(440, window.innerHeight - topoGrafico - 140));
        const { svg, x, y, p } = eixos(w, h, 100, true, 30);
        let out = svg;
        if (mostrarRAM) {
            out += `<rect x="${x(0)}" y="${y(100)}" width="${x(30) - x(0)}" height="${y(88) - y(100)}" fill="#f36d7c" opacity=".07"/>`;
            if (selecionado.id === '1') {
                out += `<rect x="${x(23)}" y="${y(100)}" width="${x(30) - x(23)}" height="${y(0) - y(100)}" fill="#f36d7c" opacity=".12"/>`;
            }
            out += `<line x1="${p.l}" x2="${w - p.r}" y1="${y(88)}" y2="${y(88)}" stroke="#ff8799" stroke-dasharray="6 5"/>`;
        }
        for (const componente of ['CPU', 'RAM', 'Disco']) {
            if (filtroSerie === 'todos' || filtroSerie === componente) {
                out += linha(selecionado.series[componente], x, y, cores[componente]);
            }
        }
        const passo = w < 500 ? 10 : 5;
        for (let minuto = 0; minuto <= 30; minuto += passo) {
            const horario = minuto === 30 ? '14:00' : `13:${30 + minuto}`;
            out += `<text x="${x(minuto)}" y="${h - 11}" text-anchor="${minuto === 30 ? 'end' : 'middle'}">${horario}</text>`;
        }
        el('graficoMonitoramento').innerHTML = out + '</svg>';
        el('graficoMonitoramento').setAttribute('aria-label', `${filtroSerie === 'todos' ? 'CPU, RAM e disco' : filtroSerie} de ${selecionado.nome}, últimos 30 minutos simulados. ${selecionado.resumo}.`);
        el('alertaMonitoramento').className = 'alerta-monitoramento ' + selecionado.estado;
        el('alertaMonitoramento').innerHTML = `<span class="estado-saude">${esc(selecionado.rotulo)}</span><div><strong>${esc(selecionado.resumo)}</strong><p>${esc(selecionado.acao)}</p>${selecionado.id === '1' ? '<small>Faixa destacada: 13h53–14h · regra atingida às 13h58. O servidor continua disponível neste cenário.</small>' : '<small>Não há episódio de RAM ≥ 88% por cinco minutos neste cenário.</small>'}</div>`;
    }

    function qualidadeRede() {
        el('qualidadeRede').hidden = visaoAtual !== 'rede';
        el('abrirRede').setAttribute('aria-pressed', String(visaoAtual === 'rede'));
        const escolhido = el('equipamentoRede').value || '1';
        const cenarios = dadosMock.cenarios;
        el('equipamentoRede').innerHTML = cenarios.map(c => `<option value="${c.id}">${esc(c.plataforma)} · ${esc(c.transmissao)} — ${esc(c.nome)}</option>`).join('');
        el('equipamentoRede').value = escolhido;
        const cenario = cenarios.find(c => c.id === escolhido);
        const rede = dadosMock.qualidadeRede.find(c => c.id === escolhido);
        const ultima = rede.medicoes.at(-1);
        const referencias = {
            perda: { nome: 'Perda de pacotes', unidade: '%', atencao: 1, critico: 5, minimo: 10 },
            latencia: { nome: 'Latência de ida e volta', unidade: 'ms', atencao: 80, critico: 150, minimo: 200 },
            jitter: { nome: 'Variação da latência', unidade: 'ms', atencao: 15, critico: 30, minimo: 50 }
        };
        const classificar = (valor, referencia) => valor >= referencia.critico ? 'critico' : valor >= referencia.atencao ? 'atencao' : 'normal';
        const estados = Object.entries(referencias).map(([tipo, referencia]) => classificar(ultima[tipo], referencia));
        const estado = estados.includes('critico') ? 'critico' : estados.includes('atencao') ? 'atencao' : 'normal';
        const rotulo = { critico: 'Crítico', atencao: 'Atenção', normal: 'Normal' };
        el('trechoRede').textContent = `${cenario.nome} → destino de verificação fictício · ${cenario.plataforma} / ${cenario.transmissao}`;
        el('estadoQualidadeRede').className = 'estado-qualidade-rede ' + estado;
        el('estadoQualidadeRede').innerHTML = `<span class="estado-saude">${rotulo[estado]}</span><strong>${estado === 'normal' ? 'Sem degradação na última medição do exemplo' : 'Conexão degradada na última medição do exemplo'}</strong><span>14h · trecho simulado · referências ilustrativas</span>`;
        const enviados = rede.medicoes.reduce((total, m) => total + m.enviados, 0);
        const perdidos = rede.medicoes.reduce((total, m) => total + m.perdidos, 0);
        el('indicadoresRede').innerHTML = Object.entries(referencias).map(([tipo, referencia]) => `
            <article class="kpi indicador-qualidade ${classificar(ultima[tipo], referencia)}">
                <div class="kpi-label"><span>${referencia.nome}</span><span class="estado-saude">${rotulo[classificar(ultima[tipo], referencia)]}</span></div>
                <strong>${fmt(ultima[tipo])}<span>${referencia.unidade}</span></strong>
                <p>${tipo === 'perda' ? `${ultima.perdidos} de ${ultima.enviados} verificações sem resposta na última medição` : tipo === 'latencia' ? 'Tempo médio de ida e volta nas respostas amostradas' : 'Diferença média absoluta entre tempos de resposta consecutivos'}</p>
                <small>Última medição · atenção ≥ ${referencia.atencao}${referencia.unidade} · crítico ≥ ${referencia.critico}${referencia.unidade}</small>
            </article>`).join('');
        const tipo = el('metricaQualidadeRede').value;
        const referencia = referencias[tipo];
        const pontos = rede.medicoes.map(m => [m.minuto, m[tipo]]);
        const maximo = Math.max(referencia.minimo, Math.ceil(Math.max(...pontos.map(p => p[1])) / 10) * 10);
        const w = Math.max(240, el('graficoQualidadeRede').clientWidth);
        const h = w < 600 ? 300 : 360;
        const { svg, x, y, p } = eixos(w, h, maximo, tipo === 'perda', 30);
        let out = svg;
        out += `<rect x="${p.l}" y="${y(maximo)}" width="${w - p.l - p.r}" height="${y(referencia.critico) - y(maximo)}" fill="#ff8799" opacity=".08"/>`;
        out += `<line x1="${p.l}" x2="${w - p.r}" y1="${y(referencia.critico)}" y2="${y(referencia.critico)}" stroke="#ff8799" stroke-dasharray="5 5"/>`;
        out += linha(pontos, x, y, '#2de2c0');
        for (let minuto = 0; minuto <= 30; minuto += w < 500 ? 10 : 5) {
            out += `<text x="${x(minuto)}" y="${h - 10}" text-anchor="${minuto === 30 ? 'end' : 'middle'}">${minuto === 30 ? '14:00' : '13:' + (30 + minuto)}</text>`;
        }
        el('graficoQualidadeRede').innerHTML = out + '</svg>';
        el('graficoQualidadeRede').setAttribute('aria-label', `${referencia.nome} em ${referencia.unidade}, ${cenario.nome}, de 13h30 a 14h, valores simulados.`);
        el('tituloGraficoRede').textContent = referencia.nome + ' ao longo do tempo';
        el('contextoGraficoRede').textContent = `${referencia.unidade} · 31 medições simuladas · referência crítica ilustrativa: ${referencia.critico}${referencia.unidade}`;
        el('resumoGraficoRede').textContent = tipo === 'perda'
            ? `${perdidos} de ${enviados} verificações sem resposta no intervalo (${fmt(perdidos / enviados * 100)}%). Pico por medição: ${fmt(Math.max(...pontos.map(p => p[1])))}%.`
            : `Maior valor no intervalo: ${fmt(Math.max(...pontos.map(p => p[1])))} ${referencia.unidade}. Última medição: ${fmt(ultima[tipo])} ${referencia.unidade}.`;
        el('trafegoRedeValor').textContent = fmt(rede.utilizacao, 0) + '%';
        el('trafegoRedeBarra').innerHTML = `<span style="width:${rede.utilizacao}%"></span>`;
        el('trafegoRedeContexto').textContent = `${fmt(rede.utilizacao / 100 * rede.capacidadeMbps, 0)} Mbit/s de saída em um enlace fictício de ${fmt(rede.capacidadeMbps, 0)} Mbit/s · última medição`;
    }

    function render() {
        el('perfilUtilizacao').hidden = visaoAtual !== 'perfil';
        el('abrirPerfil').setAttribute('aria-pressed', String(visaoAtual === 'perfil'));
        el('servidorPerfil').innerHTML = el('servidor').innerHTML;
        el('servidorPerfil').value = el('servidor').value;
        el('analiseSemanal').hidden = visaoAtual !== 'semanal';
        el('resumoOperacional').hidden = visaoAtual !== 'monitoramento';
        el('abrirMonitoramento').setAttribute('aria-pressed', String(visaoAtual === 'monitoramento'));
        el('abrirSemanal').setAttribute('aria-pressed', String(visaoAtual === 'semanal'));
        monitoramentoAtual();
        qualidadeRede();
        graficoHorarios();
        graficoDisco();
    }

    function carregar() {
        dados = dadosMock.obter(el('servidor').value);
        const escolhido = el('servidor').value;
        el('servidor').innerHTML = '<option value="todos">Todos os servidores</option>' + dados.equipamentos.map(e => `<option value="${esc(e.id)}">${esc(e.nome)}</option>`).join('');
        el('servidor').value = escolhido;
        el('semanaPeriodo').textContent = `${dataHora(dados.periodo.inicio + 'T00:00:00-03:00').split(',')[0]} — ${dataHora(new Date(Date.parse(dados.periodo.fim + 'T00:00:00-03:00') - 1)).split(',')[0]}`;
        el('estadoDados').textContent = 'Prévia para revisar o layout. Todos os valores são fictícios; explore os filtros de servidor e componente.';
        el('escopo').textContent = 'Quarta-feira, 14h · exemplo fixo';
        el('avisosDados').innerHTML = dados.avisos.map(a => '<li>' + esc(a) + '</li>').join('');
        render();
    }

    function trocarVisao(visao) {
        visaoAtual = visao;
        render();
    }

    el('abrirMonitoramento').addEventListener('click', () => trocarVisao('monitoramento'));
    el('abrirRede').addEventListener('click', () => trocarVisao('rede'));
    el('equipamentoRede').addEventListener('change', qualidadeRede);
    el('metricaQualidadeRede').addEventListener('change', qualidadeRede);
    el('abrirPerfil').addEventListener('click', () => trocarVisao('perfil'));
    el('servidorPerfil').addEventListener('change', () => {
        el('servidor').value = el('servidorPerfil').value;
        carregar();
    });
    el('abrirSemanal').addEventListener('click', () => trocarVisao('semanal'));
    function expandirPainel(ativo) {
        document.body.classList.toggle('modo-telao', ativo);
        el('expandirPainel').setAttribute('aria-pressed', String(ativo));
        el('expandirPainel').textContent = ativo ? 'Sair do telão' : 'Modo telão';
        render();
    }
    el('expandirPainel').addEventListener('click', () => {
        expandirPainel(!document.body.classList.contains('modo-telao'));
    });
    document.addEventListener('keydown', evento => {
        if (evento.key === 'Escape' && document.body.classList.contains('modo-telao')) expandirPainel(false);
    });
    el('servidoresAtuais').addEventListener('click', evento => {
        const botao = evento.target.closest('[data-servidor]');
        if (!botao) return;
        servidorMonitorado = botao.dataset.servidor;
        monitoramentoAtual();
    });
    el('serieMonitoramento').addEventListener('change', monitoramentoAtual);
    el('servidor').addEventListener('change', () => carregar());
    el('componente').addEventListener('change', graficoHorarios);
    el('atualizarDados').addEventListener('click', () => carregar());
    document.querySelector('.aviso-demonstracao')?.remove();
    const selo = document.querySelector('.selo-online');
    if (selo) selo.textContent = 'Prévia visual';
    window.SG?.definirNotificacoes([]);
    let quadro;
    window.addEventListener('resize', () => {
        cancelAnimationFrame(quadro);
        quadro = requestAnimationFrame(render);
    });
    carregar();
});
