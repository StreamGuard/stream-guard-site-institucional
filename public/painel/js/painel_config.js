
(() => {
    'use strict';

    // quem não é admin vê a tela de acesso restrito (o shell troca o conteúdo): não há nada pra ligar
    if (!document.getElementById('painel-metricas')) return;

    const esc = SGModal.escapar;
    const normalizar = (texto) =>
        texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const formatarIntervalo = (s) => (s >= 60 && s % 60 === 0 ? `${s / 60}min` : `${s}s`);
    const definirResumo = (painel, chave, valor) => {
        const el = painel.querySelector(`[data-resumo="${chave}"]`);
        if (el) el.textContent = valor;
    };


    const ABAS = ['metricas', 'funcionarios'];
    const botoesAba = document.querySelectorAll('[data-tab]');
    const paineis = document.querySelectorAll('[data-panel]');

    function abrirAba(nome) {
        if (!ABAS.includes(nome)) nome = 'metricas';
        botoesAba.forEach((botao) => {
            const ativo = botao.dataset.tab === nome;
            botao.classList.toggle('active', ativo);
            botao.setAttribute('aria-selected', String(ativo));
            botao.tabIndex = ativo ? 0 : -1;
        });
        paineis.forEach((painel) => {
            const ativo = painel.dataset.panel === nome;
            painel.classList.toggle('is-visible', ativo);
            painel.hidden = !ativo;
        });
        history.replaceState(null, '', `#${nome}`);
    }

    botoesAba.forEach((botao, indice) => {
        botao.addEventListener('click', () => abrirAba(botao.dataset.tab));
        botao.addEventListener('keydown', (evento) => {
            if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') return;
            const passo = evento.key === 'ArrowRight' ? 1 : -1;
            const proximo = botoesAba[(indice + passo + botoesAba.length) % botoesAba.length];
            abrirAba(proximo.dataset.tab);
            proximo.focus();
        });
    });


    const ICONES = [
        { valor: 'microchip',        cor: 'ciano',    hex: 'var(--verde)', html: '<i class="fa-solid fa-microchip"></i>' },
        { valor: 'memory',           cor: 'roxo',     hex: 'var(--roxo)',  html: '<i class="fa-solid fa-memory"></i>' },
        { valor: 'hard-drive',       cor: 'laranja',  hex: '#ffa94d',      html: '<i class="fa-solid fa-hard-drive"></i>' },
        { valor: 'network-wired',    cor: 'azul',     hex: 'var(--azul)',  html: '<i class="fa-solid fa-network-wired"></i>' },
        { valor: 'stopwatch',        cor: 'magenta',  hex: '#e04dd0',      html: '<i class="fa-solid fa-stopwatch"></i>' },
        { valor: 'temperature-half', cor: 'vermelho', hex: '#ff5e7a',      html: '<i class="fa-solid fa-temperature-half"></i>' }
    ];
    let metricas = [];
    let servidorAtual = null;
    let carregando = false;
    let salvando = false;
    let alterado = false;
    let tokenCsrf = null;

    const painelM = document.getElementById('painel-metricas');
    const listaM = document.getElementById('lista-metricas');
    const buscaM = document.getElementById('busca-metrica');
    const vazioM = painelM.querySelector('.sem-resultados');
    const notaM = painelM.querySelector('[data-resumo="nota"]');
    const servidorInput = document.getElementById('servidor-metricas');
    const carregarBotao = document.getElementById('carregar-metricas');
    const salvarBotao = document.getElementById('salvar-metricas');

    const iconeDe = (tipo) => ICONES.find(i => i.valor === (
        tipo.includes('CPU') ? 'microchip' : tipo.includes('RAM') ? 'memory' :
        tipo.includes('DISCO') ? 'hard-drive' : 'network-wired')) || ICONES[0];

    function desenharMetricas() {
        listaM.innerHTML = metricas.map(m => {
            const icone = iconeDe(m.tipo);
            const limites = `Mín.: ${m.limite_minimo ?? 'não definido'} · Máx.: ${m.limite_maximo ?? 'não definido'}`;
            return `<div class="linha linha-metrica ${m.ativa ? '' : 'is-inativa'}" data-id="${m.id}">
                <div class="col-metrica">
                    <span class="icone-metrica cor-${icone.cor}"><i class="fa-solid fa-${icone.valor}"></i></span>
                    <div><p class="item-nome">${esc(m.tipo)}</p><small>${esc(limites)}</small></div>
                </div>
                <div class="col-unidade"><span class="chip-unidade">${esc(m.unidade)}</span></div>
                <div class="col-intervalo"><input class="input-sg" type="number" min="1" max="2147483647" step="1"
                    value="${m.intervalo}" aria-label="Intervalo em segundos de ${esc(m.tipo)}"></div>
                <div class="col-estado"><label class="switch">
                    <input type="checkbox" ${m.ativa ? 'checked' : ''} aria-label="Ativar ${esc(m.tipo)}">
                    <span class="switch-track"></span></label><span class="estado-texto">${m.ativa ? 'Ativa' : 'Inativa'}</span>
                </div>
                <div class="col-acao"><button type="button" class="btn-sg btn-ghost"
                    data-acao="editar-metrica" data-perm="editar">Editar limites</button></div>
            </div>`;
        }).join('');
        filtrarMetricas();
        resumirMetricas();
        SG.reaplicarPermissoes();
        atualizarControles();
    }

    function atualizarControles() {
        const podeEditar = SG.pode('editar') && Boolean(tokenCsrf);
        salvarBotao.disabled = carregando || salvando || !metricas.length || !podeEditar;
        carregarBotao.disabled = carregando || salvando;
        servidorInput.disabled = carregando || salvando;
        listaM.querySelectorAll('input, button').forEach(el => { el.disabled = salvando || carregando || !podeEditar; });
    }

    function resumirMetricas() {
        const ativas = metricas.filter((m) => m.ativa);
        definirResumo(painelM, 'total', metricas.length);
        definirResumo(painelM, 'ativas', ativas.length);
        definirResumo(painelM, 'inativas', metricas.length - ativas.length);
        definirResumo(painelM, 'menor', ativas.length ? formatarIntervalo(Math.min(...ativas.map((m) => m.intervalo))) : '—');
    }

    function filtrarMetricas() {
        const termo = normalizar(buscaM.value);
        let visiveis = 0;
        listaM.querySelectorAll('.linha-metrica').forEach((linha) => {
            const metrica = metricas.find((m) => m.id === Number(linha.dataset.id));
            const mostrar = normalizar(metrica.tipo).includes(termo);
            linha.hidden = !mostrar;
            if (mostrar) visiveis++;
        });
        vazioM.hidden = visiveis > 0;
    }

    function validarMetrica(m) {
        if (!Number.isInteger(m.intervalo) || m.intervalo < 1 || m.intervalo > 2147483647) {
            return 'O intervalo deve ser um número inteiro positivo de segundos.';
        }
        for (const valor of [m.limite_minimo, m.limite_maximo]) {
            if (valor === null) continue;
            if (!Number.isFinite(valor) || valor < 0 || valor > Number.MAX_SAFE_INTEGER / 100 ||
                Number(valor.toFixed(2)) !== valor || (m.unidade === '%' && valor > 100)) {
                return 'Limites devem ser não negativos, com até duas casas; percentuais vão até 100.';
            }
        }
        if (m.limite_minimo !== null && m.limite_maximo !== null && m.limite_minimo > m.limite_maximo) {
            return 'O limite mínimo não pode superar o máximo.';
        }
        return null;
    }

    async function respostaJson(resposta) {
        const dados = await resposta.json();
        if (!resposta.ok) throw Object.assign(new Error(dados.erro || 'Não foi possível processar as configurações.'), { status: resposta.status });
        return dados;
    }

    async function carregarMetricas() {
        if (carregando || salvando) return;
        const id = Number(servidorInput.value);
        if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
            notaM.textContent = 'Informe um ID de servidor válido.';
            return;
        }
        if (alterado && !window.confirm('Descartar alterações ainda não salvas?')) return;
        carregando = true;
        servidorAtual = null;
        tokenCsrf = null;
        metricas = [];
        desenharMetricas();
        notaM.textContent = 'Carregando configurações…';
        try {
            const resposta = await fetch(`/metricas/configuracoes/${id}`, { credentials: 'same-origin' });
            const dados = await respostaJson(resposta);
            tokenCsrf = resposta.headers.get('X-CSRF-Token');
            if (!Array.isArray(dados)) throw new Error('Resposta de configurações inválida.');
            const ids = new Set();
            const novas = dados.map(m => {
                if (ids.has(m.id_metrica) || !m.id_config_metrica) {
                    throw new Error('Há configurações ausentes ou duplicadas. Regularize o cadastro antes de editar.');
                }
                ids.add(m.id_metrica);
                return { id: m.id_metrica, tipo: m.tipo, unidade: m.unidade,
                    intervalo: m.intervalo_coleta, ativa: m.habilitado === 1,
                    limite_minimo: m.limite_minimo === null ? null : Number(m.limite_minimo),
                    limite_maximo: m.limite_maximo === null ? null : Number(m.limite_maximo) };
            });
            metricas = novas;
            servidorAtual = id;
            alterado = false;
            const url = new URL(location.href);
            url.searchParams.set('servidor_id', id);
            history.replaceState(null, '', url);
            notaM.textContent = metricas.length ? `Configurações do servidor ${id} carregadas.` : 'Servidor sem métricas cadastradas.';
            if (metricas.length && !tokenCsrf) notaM.textContent += ' Entre novamente para editar; a consulta continua disponível.';
        } catch (erro) {
            notaM.textContent = `Falha ao carregar: ${erro.message}`;
        } finally {
            carregando = false;
            desenharMetricas();
        }
    }

    buscaM.addEventListener('input', filtrarMetricas);
    carregarBotao.addEventListener('click', carregarMetricas);
    listaM.addEventListener('change', evento => {
        if (salvando || !SG.pode('editar') || !tokenCsrf) return;
        const linha = evento.target.closest('.linha-metrica');
        if (!linha) return;
        const metrica = metricas.find(m => m.id === Number(linha.dataset.id));
        if (evento.target.type === 'number') metrica.intervalo = evento.target.value === '' ? NaN : Number(evento.target.value);
        if (evento.target.type === 'checkbox') {
            metrica.ativa = evento.target.checked;
            linha.classList.toggle('is-inativa', !metrica.ativa);
            linha.querySelector('.estado-texto').textContent = metrica.ativa ? 'Ativa' : 'Inativa';
        }
        alterado = true;
        notaM.textContent = 'Há alterações não salvas.';
        resumirMetricas();
    });

    salvarBotao.addEventListener('click', async () => {
        if (!SG.pode('editar') || !tokenCsrf || !servidorAtual || salvando || !metricas.length) return;
        const erro = metricas.map(validarMetrica).find(Boolean);
        if (erro) { notaM.textContent = erro; return; }
        salvando = true;
        atualizarControles();
        notaM.textContent = 'Salvando configurações…';
        try {
            await respostaJson(await fetch(`/metricas/configuracoes/${servidorAtual}`, {
                method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': tokenCsrf },
                body: JSON.stringify({ configuracoes: metricas.map(m => ({
                    id_metrica: m.id, habilitado: m.ativa ? 1 : 0, intervalo_coleta: m.intervalo,
                    limite_minimo: m.limite_minimo, limite_maximo: m.limite_maximo
                })) })
            }));
            alterado = false;
            notaM.textContent = 'Configurações salvas no servidor. O agente as consulta no próximo ciclo de atualização.';
            SGModal.aviso('Configurações salvas.');
        } catch (erro) {
            if (erro.status === 401) tokenCsrf = null;
            notaM.textContent = `Falha ao salvar: ${erro.message}. Suas alterações continuam nesta tela.`;
        } finally {
            salvando = false;
            atualizarControles();
        }
    });

    function abrirMetrica(id, origem) {
        if (!SG.pode('editar') || !tokenCsrf || salvando) return;
        const atual = metricas.find(m => m.id === id);
        if (!atual) return;
        const maximo = atual.unidade === '%' ? 100 : Number.MAX_SAFE_INTEGER / 100;
        SGModal.formulario({
            titulo: `Configurar ${atual.tipo}`,
            subtitulo: `Limites em ${atual.unidade}. Deixe vazio para não definir um limite.`,
            confirmar: 'Aplicar à edição', gatilho: origem,
            aviso: 'Alterações preparadas. Use Salvar alterações para persistir.',
            valores: atual,
            campos: [
                { tipo: 'numero', nome: 'intervalo', rotulo: 'Intervalo (segundos)', min: 1, max: 2147483647, step: 1 },
                { tipo: 'numero', nome: 'limite_minimo', rotulo: 'Limite mínimo', min: 0, max: maximo, step: 0.01, obrigatorio: false },
                { tipo: 'numero', nome: 'limite_maximo', rotulo: 'Limite máximo', min: 0, max: maximo, step: 0.01, obrigatorio: false }
            ],
            onSalvar(v) {
                const erro = validarMetrica({ ...atual, ...v });
                if (erro) return erro;
                Object.assign(atual, v);
                alterado = true;
                notaM.textContent = 'Há alterações não salvas.';
                desenharMetricas();
            }
        });
    }

    listaM.addEventListener('click', evento => {
        const botao = evento.target.closest('[data-acao="editar-metrica"]');
        if (botao) abrirMetrica(Number(botao.closest('.linha-metrica').dataset.id), botao);
    });


    const PERFIS = {
        administrador: { titulo: 'Administrador', badge: 'badge-admin',    descricao: 'Acesso total, inclusive a usuários e configurações.' },
        gerente:       { titulo: 'Gerente',       badge: 'badge-gerente',  descricao: 'Cadastra, vê e edita; acompanha métricas e alertas.' },
        comum:         { titulo: 'Usuário comum', badge: 'badge-comum',    descricao: 'Apenas visualiza dashboard e componentes.' }
    };

    let funcionarios = [
        { id: 1, nome: 'Carlos Souza', email: 'carlos@streamco.com.br',   perfil: 'administrador', ativo: true },
        { id: 2, nome: 'Fernanda Lima', email: 'fernanda@streamco.com.br', perfil: 'gerente',       ativo: true },
        { id: 3, nome: 'João Pedro',    email: 'joao@streamco.com.br',     perfil: 'comum',         ativo: true },
        { id: 4, nome: 'Ana Torres',    email: 'ana@streamco.com.br',      perfil: 'comum',         ativo: false }
    ];
    let proximoFunc = 5;

    const painelF = document.getElementById('painel-funcionarios');
    const listaF = document.getElementById('lista-funcionarios');
    const buscaF = document.getElementById('busca-funcionario');
    const filtroPerfil = document.getElementById('filtro-perfil');
    const vazioF = painelF.querySelector('.sem-resultados');

    const iniciais = (nome) => {
        const p = nome.trim().split(/\s+/);
        return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase();
    };

    function desenharFuncionarios() {
        listaF.innerHTML = funcionarios.map((f) => `
            <div class="linha linha-funcionario" data-id="${f.id}" data-perfil="${f.perfil}" data-status="${f.ativo ? 'ativo' : 'inativo'}">
                <div class="col-func">
                    <span class="avatar-sg">${esc(iniciais(f.nome))}</span>
                    <p class="item-nome">${esc(f.nome)}</p>
                </div>
                <div class="col-email">${esc(f.email)}</div>
                <div class="col-perfil"><span class="badge-perfil ${PERFIS[f.perfil].badge}">${PERFIS[f.perfil].titulo}</span></div>
                <div class="col-status"><span class="badge-status ${f.ativo ? 'badge-ativo' : 'badge-inativo'}">${f.ativo ? 'Ativo' : 'Inativo'}</span></div>
                <div class="col-acoes">
                    <button type="button" class="btn-sg btn-ghost" data-acao="ver-funcionario"><i class="fa-regular fa-eye"></i> Ver</button>
                </div>
            </div>`).join('');

        filtrarFuncionarios();
        resumirFuncionarios();
        SG.reaplicarPermissoes();
    }

    function resumirFuncionarios() {
        const ativos = funcionarios.filter((f) => f.ativo).length;
        definirResumo(painelF, 'total', funcionarios.length);
        definirResumo(painelF, 'ativos', ativos);
        definirResumo(painelF, 'inativos', funcionarios.length - ativos);
        definirResumo(painelF, 'niveis', new Set(funcionarios.map((f) => f.perfil)).size);
        definirResumo(painelF, 'rodape', `${funcionarios.length} funcionários • ${ativos} com acesso ativo`);
    }

    function filtrarFuncionarios() {
        const termo = normalizar(buscaF.value);
        const perfil = filtroPerfil.value;
        let visiveis = 0;
        listaF.querySelectorAll('.linha-funcionario').forEach((linha) => {
            const f = funcionarios.find((x) => x.id === Number(linha.dataset.id));
            const mostrar = normalizar(`${f.nome} ${f.email}`).includes(termo) && (perfil === 'todos' || f.perfil === perfil);
            linha.hidden = !mostrar;
            if (mostrar) visiveis++;
        });
        vazioF.hidden = visiveis > 0;
    }

    buscaF.addEventListener('input', filtrarFuncionarios);
    filtroPerfil.addEventListener('change', filtrarFuncionarios);

    function verFuncionario(id, origem) {
        const f = funcionarios.find((x) => x.id === id);
        if (!f) return;
        SGModal.ver({
            titulo: 'Detalhes do funcionário',
            subtitulo: 'Dados de acesso ao StreamGuard',
            gatilho: origem,
            destaque: { icone: `<b>${esc(iniciais(f.nome))}</b>`, cor: f.ativo ? 'verde' : '', titulo: f.nome, texto: f.email },
            itens: [
                { rotulo: 'Perfil', valor: PERFIS[f.perfil].titulo },
                { rotulo: 'Acesso', tag: f.ativo ? 'Ativo' : 'Inativo', cor: f.ativo ? 'verde' : 'laranja' },
                { rotulo: 'O que pode fazer', valor: PERFIS[f.perfil].descricao, inteira: true }
            ],
        });
    }

    listaF.addEventListener('click', (evento) => {
        const botao = evento.target.closest('[data-acao]');
        if (!botao) return;
        const id = Number(botao.closest('.linha-funcionario').dataset.id);
        if (botao.dataset.acao === 'ver-funcionario') verFuncionario(id, botao);


    });


    desenharMetricas();
    servidorInput.value = new URLSearchParams(location.search).get('servidor_id') || '';
    if (servidorInput.value) carregarMetricas();
    desenharFuncionarios();
    abrirAba(location.hash.replace('#', '') || 'metricas');
})();
