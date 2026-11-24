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

    // ---------- Abas ----------

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

    // ---------- Utilitários de Requisição e Sessão ----------

    const ID_USUARIO = Number(sessionStorage.getItem('ID_USUARIO'));
    let idEmpresa = Number(sessionStorage.getItem('ID_EMPRESA')) || null;

    async function chamar(url, opcoes) {
        const resposta = await fetch(url, {
            ...opcoes,
            headers: {
                ...(opcoes && opcoes.headers),
                Authorization: `Bearer ${sessionStorage.getItem('TOKEN')}`
            }
        });
        if (resposta.status === 401) {
            sessionStorage.clear();
            window.location.href = '../login/login.html';
        }
        let corpo = null;
        try { corpo = await resposta.json(); } catch (e) { /* resposta sem corpo */ }
        if (!resposta.ok) throw new Error((corpo && corpo.mensagem) || 'Erro ao falar com o servidor.');
        return corpo;
    }

    const enviarJson = (metodo, corpo) => ({
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo)
    });

    async function obterEmpresa() {
        if (idEmpresa) return idEmpresa;
        if (!Number.isInteger(ID_USUARIO) || ID_USUARIO <= 0) throw new Error('Sessão inválida. Faça login novamente.');
        const perfil = await chamar(`/perfil/${ID_USUARIO}`);
        idEmpresa = Number(perfil.empresa_id);
        sessionStorage.setItem('ID_EMPRESA', String(idEmpresa));
        return idEmpresa;
    }

    // Mostra erro dentro do modal aberto (ou aviso, se não houver modal)
    function erroNoModal(mensagem) {
        const geral = document.querySelector('[data-erro-geral]');
        if (!geral) { SGModal.fechar(); return SGModal.aviso(mensagem); }
        geral.textContent = mensagem;
        geral.style.display = 'block';
    }

    // ---------- Métricas (ligadas ao banco e ao tipo de componente) ----------

    const ICONES = [
        { valor: 'microchip',        cor: 'ciano',    hex: 'var(--verde)', html: '<i class="fa-solid fa-microchip"></i>' },
        { valor: 'memory',           cor: 'roxo',     hex: 'var(--roxo)',  html: '<i class="fa-solid fa-memory"></i>' },
        { valor: 'hard-drive',       cor: 'laranja',  hex: '#ffa94d',      html: '<i class="fa-solid fa-hard-drive"></i>' },
        { valor: 'network-wired',    cor: 'azul',     hex: 'var(--azul)',  html: '<i class="fa-solid fa-network-wired"></i>' },
        { valor: 'stopwatch',        cor: 'magenta',  hex: '#e04dd0',      html: '<i class="fa-solid fa-stopwatch"></i>' },
        { valor: 'temperature-half', cor: 'vermelho', hex: '#ff5e7a',      html: '<i class="fa-solid fa-temperature-half"></i>' }
    ];

    // Mapeamento estrito baseado no TIPO do componente
    const ICONES_POR_TIPO = {
        'cpu': 'microchip',
        'ram': 'memory',
        'armazenamento': 'hard-drive',
        'disco': 'hard-drive',
        'rede': 'network-wired'
    };

    const iconeDeTipo = (tipoComponente) => {
        const t = normalizar(tipoComponente || '');
        for (let chave in ICONES_POR_TIPO) {
            if (t.includes(chave)) {
                return ICONES.find(i => i.valor === ICONES_POR_TIPO[chave]) || ICONES[0];
            }
        }
        return ICONES[0];
    };

    const UNIDADES = ['%', 'Mbps', 'ms', '°C', 'MB'];
    const INTERVALOS = [5, 10, 15, 30, 60, 300];

    let metricas = [];

    const painelM = document.getElementById('painel-metricas');
    const listaM = document.getElementById('lista-metricas');
    const buscaM = document.getElementById('busca-metrica');
    const vazioM = painelM.querySelector('.sem-resultados');
    const notaM = painelM.querySelector('[data-resumo="nota"]');
    const notaPadrao = notaM.textContent;
    let timerNota;

    async function carregarMetricas() {
        try {
            const empresa = await obterEmpresa();
            const linhas = await chamar(`/config/metricas/${empresa}`);
            metricas = linhas.map((l) => ({
                id: l.id,
                idEquipamentoComponente: l.id_equipamento_componente,
                nome: l.nome,
                unidade: l.unidade,
                tipoComponente: l.tipo_componente || 'CPU',
                intervalo: Number(l.intervalo),
                ativa: Boolean(l.ativa)
            }));
            desenharMetricas();
        } catch (erro) {
            console.error('Erro ao carregar métricas:', erro);
            SGModal.aviso(erro.message || 'Não foi possível carregar as métricas.');
        }
    }

    function desenharMetricas() {
        listaM.innerHTML = metricas.map((m) => {
            const icone = iconeDeTipo(m.tipoComponente);
            const listaIntervalos = INTERVALOS.includes(m.intervalo) ? INTERVALOS : [...INTERVALOS, m.intervalo].sort((a, b) => a - b);
            const opcoes = listaIntervalos.map((s) =>
                `<option value="${s}" ${s === m.intervalo ? 'selected' : ''}>${formatarIntervalo(s)}</option>`
            ).join('');

            return `
            <div class="linha linha-metrica ${m.ativa ? '' : 'is-inativa'}" data-id="${m.id}">
                <div class="col-metrica">
                    <span class="icone-metrica cor-${icone.cor}">${icone.html}</span>
                    <div>
                        <p class="item-nome">${esc(m.nome)}</p>
                        <small style="color: var(--texto-suave); font-size: 11px;">Tipo: ${esc(m.tipoComponente)}</small>
                    </div>
                </div>
                <div class="col-unidade"><span class="chip-unidade">${esc(m.unidade)}</span></div>
                <div class="col-intervalo">
                    <select class="select-sg" aria-label="Intervalo de coleta de ${esc(m.nome)}">${opcoes}</select>
                </div>
                <div class="col-estado">
                    <label class="switch">
                        <input type="checkbox" ${m.ativa ? 'checked' : ''} aria-label="Ativar ${esc(m.nome)}">
                        <span class="switch-track"></span>
                    </label>
                    <span class="estado-texto">${m.ativa ? 'Ativa' : 'Inativa'}</span>
                </div>
                <div class="col-acoes">
                    <button type="button" class="btn-sg btn-ghost" data-acao="editar-metrica" data-perm="editar"><i class="fa-solid fa-pen"></i> Editar</button>
                    <button type="button" class="btn-sg btn-danger" data-acao="remover-metrica" data-perm="excluir"><i class="fa-regular fa-trash-can"></i> Remover</button>
                </div>
            </div>`;
        }).join('');

        filtrarMetricas();
        resumirMetricas();
        SG.reaplicarPermissoes();
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
            if (!metrica) return;
            const mostrar = normalizar(metrica.nome).includes(termo);
            linha.hidden = !mostrar;
            if (mostrar) visiveis++;
        });
        vazioM.hidden = visiveis > 0;
    }

    buscaM.addEventListener('input', filtrarMetricas);

    listaM.addEventListener('change', (evento) => {
        const linha = evento.target.closest('.linha-metrica');
        if (!linha) return;
        const metrica = metricas.find((m) => m.id === Number(linha.dataset.id));
        if (!metrica) return;

        if (evento.target.matches('select')) metrica.intervalo = Number(evento.target.value);
        if (evento.target.matches('input[type="checkbox"]')) {
            metrica.ativa = evento.target.checked;
            linha.classList.toggle('is-inativa', !metrica.ativa);
            linha.querySelector('.estado-texto').textContent = metrica.ativa ? 'Ativa' : 'Inativa';
        }
        resumirMetricas();
    });

    document.getElementById('salvar-metricas').addEventListener('click', async () => {
        try {
            const empresa = await obterEmpresa();
            const payload = metricas.map((m) => ({
                id: m.id,
                idEquipamentoComponente: m.idEquipamentoComponente,
                intervalo: m.intervalo,
                ativa: m.ativa
            }));
            await chamar('/config/metricas/salvar-todas', enviarJson('PUT', { idEmpresa: empresa, metricas: payload }));

            notaM.textContent = 'Alterações salvas. Entram em vigor no próximo ciclo de coleta.';
            clearTimeout(timerNota);
            timerNota = setTimeout(() => (notaM.textContent = notaPadrao), 3500);
            SGModal.aviso('Configurações de métricas salvas.');
        } catch (erro) {
            SGModal.aviso(erro.message || 'Erro ao salvar métricas.');
        }
    });

    async function concluirMetrica(promessa, mensagemOk) {
        try {
            await promessa;
            SGModal.fechar();
            SGModal.aviso(mensagemOk);
            await carregarMetricas();
        } catch (erro) {
            erroNoModal(erro.message);
        }
    }

    function abrirMetrica(id, origem) {
        const editando = id != null;
        if (editando ? !SG.pode('editar') : !SG.pode('criar')) return;

        const atual = editando
            ? metricas.find((m) => m.id === id)
            : { unidade: '%', intervalo: 15, ativa: true, tipoComponente: 'CPU' };
        if (!atual) return;

        // garante que a unidade/intervalo atuais existam nas opções do select
        const unidades = UNIDADES.includes(atual.unidade) ? UNIDADES : [...UNIDADES, atual.unidade];
        const intervalos = INTERVALOS.includes(atual.intervalo)
            ? INTERVALOS
            : [...INTERVALOS, atual.intervalo].sort((a, b) => a - b);

        SGModal.formulario({
            titulo: editando ? 'Editar métrica' : 'Adicionar métrica',
            subtitulo: editando
                ? 'Ajuste a unidade, o intervalo e o estado da coleta.'
                : 'Cadastre uma nova métrica para ser coletada.',
            confirmar: editando ? 'Salvar alterações' : 'Adicionar métrica',
            icone: editando ? 'save' : 'plus',
            gatilho: origem,
            valores: { ...atual, intervalo: String(atual.intervalo) },
            campos: [
                { tipo: 'texto', nome: 'nome', rotulo: 'Nome da métrica', placeholder: 'Ex.: Uso de CPU', max: 40, erro: 'Informe o nome da métrica.' },
                {
                    tipo: 'linha',
                    campos: [
                        { tipo: 'select', nome: 'unidade', rotulo: 'Unidade', opcoes: unidades.map((u) => ({ valor: u, texto: u === '%' ? '% (porcentagem)' : u })) },
                        { tipo: 'select', nome: 'intervalo', rotulo: 'Intervalo de coleta', opcoes: intervalos.map((s) => ({ valor: String(s), texto: formatarIntervalo(s) })) }
                    ]
                },
                {
                    tipo: 'select',
                    nome: 'tipoComponente',
                    rotulo: 'Tipo de Componente (Ícone)',
                    opcoes: [
                        { valor: 'CPU', texto: 'CPU (Processador)' },
                        { valor: 'RAM', texto: 'Memória RAM' },
                        { valor: 'Armazenamento', texto: 'Disco / Armazenamento' },
                        { valor: 'Rede', texto: 'Tráfego de Rede' }
                    ]
                },
                { tipo: 'switch', nome: 'ativa', rotulo: 'Coleta ativa', descricao: 'Quando desligada, a métrica deixa de ser coletada.' }
            ],
            onSalvar(v) {
                const repetida = metricas.some((m) => m.id !== id && normalizar(m.nome) === normalizar(v.nome));
                if (repetida) return 'Já existe uma métrica com esse nome.';

                const envio = obterEmpresa().then((empresa) => editando
                    ? chamar(`/config/metricas/${id}`, enviarJson('PUT', {
                        idEmpresa: empresa,
                        idEquipamentoComponente: atual.idEquipamentoComponente,
                        nome: v.nome,
                        unidade: v.unidade,
                        intervalo: Number(v.intervalo),
                        ativa: v.ativa,
                        tipoComponente: v.tipoComponente
                    }))
                    : chamar('/config/metricas', enviarJson('POST', {
                        idEmpresa: empresa,
                        nome: v.nome,
                        unidade: v.unidade,
                        intervalo: Number(v.intervalo),
                        ativa: v.ativa,
                        tipoComponente: v.tipoComponente
                    })));

                concluirMetrica(envio, editando ? 'Métrica atualizada.' : 'Métrica adicionada.');
                return false;
            }
        });
    }

    function removerMetrica(id, origem) {
        const metrica = metricas.find((m) => m.id === id);
        if (!metrica || !SG.pode('excluir')) return;

        SGModal.confirmar({
            titulo: 'Remover métrica?',
            texto: `A métrica <strong>${esc(metrica.nome)}</strong> deixará de ser coletada. Essa ação não pode ser desfeita.`,
            botao: 'Remover',
            gatilho: origem,
            onConfirmar() {
                const envio = chamar(`/config/metricas/${id}`, enviarJson('DELETE', {
                    idEquipamentoComponente: metrica.idEquipamentoComponente
                }));
                concluirMetrica(envio, 'Métrica removida.');
                return false;
            }
        });
    }

    listaM.addEventListener('click', (evento) => {
        const botao = evento.target.closest('[data-acao]');
        if (!botao) return;
        const id = Number(botao.closest('.linha-metrica').dataset.id);
        if (botao.dataset.acao === 'editar-metrica') abrirMetrica(id, botao);
        if (botao.dataset.acao === 'remover-metrica') removerMetrica(id, botao);
    });

    // ---------- Funcionários (ligados ao banco pela rota /config) ----------

    const PERFIS = {
        root:          { titulo: 'Root',          badge: 'badge-admin',    descricao: 'Equipe StreamGuard: visão e acesso a todas as empresas.' },
        administrador: { titulo: 'Administrador', badge: 'badge-admin',    descricao: 'Acesso total, inclusive a usuários e configurações.' },
        gerente:       { titulo: 'Gerente',       badge: 'badge-gerente',  descricao: 'Cadastra, vê e edita; acompanha métricas e alertas.' },
        comum:         { titulo: 'Usuário comum', badge: 'badge-comum',    descricao: 'Apenas visualiza dashboard e componentes.' }
    };
    const ID_PERMISSAO = { root: 1, administrador: 2, gerente: 3, comum: 4 };
    const EH_ROOT = SG.perfil === 'root';
    const PERFIS_SELECIONAVEIS = EH_ROOT ? ['root', 'administrador', 'gerente', 'comum'] : ['administrador', 'gerente', 'comum'];

    const perfilDoBanco = (nome) => {
        const t = normalizar(String(nome || ''));
        if (t === 'root') return 'root';
        if (t === 'admin' || t === 'administrador') return 'administrador';
        if (t === 'gerente') return 'gerente';
        return 'comum';
    };

    let funcionarios = [];

    const painelF = document.getElementById('painel-funcionarios');
    const listaF = document.getElementById('lista-funcionarios');
    const buscaF = document.getElementById('busca-funcionario');
    const filtroPerfil = document.getElementById('filtro-perfil');
    const vazioF = painelF.querySelector('.sem-resultados');

    const iniciais = (nome) => {
        const p = String(nome || '').trim().split(/\s+/).filter(Boolean);
        if (p.length === 0) return 'NU';
        return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase();
    };

    async function carregarFuncionarios() {
        try {
            const empresa = await obterEmpresa();
            const linhas = await chamar(`/config/funcionarios/${empresa}`);
            funcionarios = linhas.map((l) => ({
                id: l.id,
                nome: l.nome,
                email: l.email,
                cargo: l.cargo || '',
                ativo: Boolean(l.ativo),
                perfil: perfilDoBanco(l.permissao),
                fkPermissao: l.fk_permissao
            }));
            desenharFuncionarios();
        } catch (erro) {
            console.error('Erro ao carregar funcionários:', erro);
            SGModal.aviso(erro.message || 'Não foi possível carregar os funcionários.');
        }
    }

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
                    <button type="button" class="btn-sg btn-ghost" data-acao="editar-funcionario" data-perm="editar" data-perfil-alvo="${f.perfil}"><i class="fa-solid fa-pen"></i> Editar</button>
                    <button type="button" class="btn-sg btn-danger" data-acao="remover-funcionario" data-perm="excluir" data-perfil-alvo="${f.perfil}"><i class="fa-regular fa-trash-can"></i> Remover</button>
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
            if (!f) return;
            const mostrar = normalizar(`${f.nome} ${f.email}`).includes(termo) && (perfil === 'todos' || f.perfil === perfil);
            linha.hidden = !mostrar;
            if (mostrar) visiveis++;
        });
        vazioF.hidden = visiveis > 0;
    }

    if (EH_ROOT && !filtroPerfil.querySelector('option[value="root"]')) {
        filtroPerfil.insertAdjacentHTML('beforeend', '<option value="root">Root</option>');
    }

    buscaF.addEventListener('input', filtrarFuncionarios);
    filtroPerfil.addEventListener('change', filtrarFuncionarios);

    async function concluir(promessa, mensagemOk) {
        try {
            await promessa;
            SGModal.fechar();
            SGModal.aviso(mensagemOk);
            await carregarFuncionarios();
        } catch (erro) {
            erroNoModal(erro.message);
        }
    }

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
                { rotulo: 'Cargo', valor: f.cargo },
                { rotulo: 'Acesso', tag: f.ativo ? 'Ativo' : 'Inativo', cor: f.ativo ? 'verde' : 'laranja' },
                { rotulo: 'O que pode fazer', valor: PERFIS[f.perfil].descricao, inteira: true }
            ],
            onEditar: SG.pode('editar', f.perfil) ? (gatilho) => abrirFuncionario(id, gatilho) : null,
            onExcluir: SG.pode('excluir', f.perfil) ? (gatilho) => removerFuncionario(id, gatilho) : null
        });
    }

    function abrirFuncionario(id, origem) {
        const editando = id != null;

        const atual = editando
            ? funcionarios.find((f) => f.id === id)
            : { perfil: 'comum', ativo: true, cargo: '' };
        if (!atual || !SG.pode(editando ? 'editar' : 'criar', atual.perfil)) return;

        const campos = [
            { tipo: 'texto', nome: 'nome', rotulo: 'Nome completo', placeholder: 'Ex.: Maria Oliveira', max: 60, erro: 'Informe o nome do funcionário.' },
            { tipo: 'email', nome: 'email', rotulo: 'E-mail', placeholder: 'nome@streamco.com.br', erro: 'Informe um e-mail válido.' },
            { tipo: 'texto', nome: 'cargo', rotulo: 'Cargo', placeholder: 'Ex.: Analista de TI', max: 50, obrigatorio: false }
        ];
        if (!editando) {
            campos.push({
                tipo: 'texto', nome: 'senha', rotulo: 'Senha inicial', placeholder: 'Mínimo de 8 caracteres', max: 60,
                validar: (v) => String(v).length >= 8, erro: 'A senha precisa ter pelo menos 8 caracteres.'
            });
        }
        campos.push(
            { tipo: 'perfil', nome: 'perfil', rotulo: 'Perfil', opcoes: PERFIS_SELECIONAVEIS.map((valor) => ({ valor, titulo: PERFIS[valor].titulo, descricao: PERFIS[valor].descricao })) }
        );
        // sem esse campo o formulário não devolvia "ativo" e a edição desativava o usuário
        if (editando) {
            campos.push({ tipo: 'switch', nome: 'ativo', rotulo: 'Acesso ativo', descricao: 'Quando desligado, o funcionário não consegue entrar no StreamGuard.' });
        }

        SGModal.formulario({
            titulo: editando ? 'Editar funcionário' : 'Adicionar funcionário',
            subtitulo: editando ? 'Atualize os dados, o perfil ou o acesso.' : 'Defina os dados de acesso e o nível de perfil.',
            confirmar: editando ? 'Salvar alterações' : 'Adicionar funcionário',
            icone: editando ? 'save' : 'user-plus',
            gatilho: origem,
            valores: atual,
            campos,
            onSalvar(v) {
                const repetido = funcionarios.some((f) => f.id !== id && f.email.toLowerCase() === v.email.toLowerCase());
                if (repetido) return 'Já existe um funcionário com esse e-mail.';

                const idPermissao = ID_PERMISSAO[v.perfil] || (editando ? atual.fkPermissao : ID_PERMISSAO.comum);

                const envio = obterEmpresa().then((empresa) => editando
                    ? chamar(`/config/funcionarios/${id}`, enviarJson('PUT', {
                        idEmpresa: empresa, nome: v.nome, email: v.email, cargo: v.cargo, idPermissao, ativo: v.ativo
                    }))
                    : chamar('/config/funcionarios', enviarJson('POST', {
                        idEmpresa: empresa, nome: v.nome, email: v.email, cargo: v.cargo, senha: v.senha, idPermissao
                    })));

                concluir(envio, editando ? 'Funcionário atualizado.' : 'Funcionário adicionado.');
                return false;
            }
        });

        const campoSenha = document.querySelector('.modal input[name="senha"]') || document.querySelector('input[name="senha"]');
        if (campoSenha) { campoSenha.type = 'password'; campoSenha.autocomplete = 'new-password'; }
    }

    function removerFuncionario(id, origem) {
        const f = funcionarios.find((x) => x.id === id);
        if (!f || !SG.pode('excluir', f.perfil)) return;
        if (id === ID_USUARIO) return SGModal.aviso('Você não pode remover o seu próprio usuário.');

        SGModal.confirmar({
            titulo: 'Remover funcionário?',
            texto: `O acesso de <strong>${esc(f.nome)}</strong> ao StreamGuard será removido. Essa ação não pode ser desfeita.`,
            botao: 'Remover',
            gatilho: origem,
            onConfirmar() {
                const envio = obterEmpresa().then((empresa) =>
                    chamar(`/config/funcionarios/${id}`, enviarJson('DELETE', { idEmpresa: empresa })));
                concluir(envio, 'Funcionário removido.');
                return false;
            }
        });
    }

    listaF.addEventListener('click', (evento) => {
        const botao = evento.target.closest('[data-acao]');
        if (!botao) return;
        const id = Number(botao.closest('.linha-funcionario').dataset.id);
        if (botao.dataset.acao === 'ver-funcionario') verFuncionario(id, botao);
        if (botao.dataset.acao === 'editar-funcionario') abrirFuncionario(id, botao);
        if (botao.dataset.acao === 'remover-funcionario') removerFuncionario(id, botao);
    });

    document.addEventListener('click', (evento) => {
        const botao = evento.target.closest('[data-modal]');
        if (!botao) return;
        if (botao.dataset.modal === 'adicionar-metrica') abrirMetrica(null, botao);
        if (botao.dataset.modal === 'adicionar-funcionario') abrirFuncionario(null, botao);
        if (botao.dataset.modal === 'adicionar-componente') abrirComponente(null, botao);
    });

    async function carregarToken() {
        if (SG.perfil !== 'admin') return;
        try {
            const dados = await chamar(`/perfil/${ID_USUARIO}`);
            document.getElementById('tokenValor').textContent = dados.codigo_empresa || 'Indisponível';
        } catch (erro) {
            document.getElementById('tokenValor').textContent = 'Indisponível';
        }
    }

    const botaoToken = document.getElementById('btnCopiarToken');
    if (botaoToken) {
        botaoToken.addEventListener('click', () => {
            const token = document.getElementById('tokenValor').textContent;
            navigator.clipboard.writeText(token)
                .then(() => SGModal.aviso('Token copiado!'))
                .catch(() => SGModal.aviso('Não foi possível copiar o token.'));
        });
    }

    carregarToken();
    carregarMetricas();
    carregarFuncionarios();
    abrirAba(location.hash.replace('#', '') || 'metricas');
})();
