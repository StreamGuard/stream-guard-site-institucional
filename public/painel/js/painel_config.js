
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
    const UNIDADES = ['%', 'Mbps', 'ms', '°C', 'MB'];
    const INTERVALOS = [5, 15, 30, 60, 300];

    let metricas = [
        { id: 1, nome: 'Uso de CPU',      unidade: '%',    intervalo: 15, ativa: true,  icone: 'microchip' },
        { id: 2, nome: 'Uso de RAM',      unidade: '%',    intervalo: 30, ativa: true,  icone: 'memory' },
        { id: 3, nome: 'Uso de Disco',    unidade: '%',    intervalo: 60, ativa: true,  icone: 'hard-drive' },
        { id: 4, nome: 'Tráfego de Rede', unidade: 'Mbps', intervalo: 15, ativa: true,  icone: 'network-wired' },
        { id: 5, nome: 'Latência',        unidade: 'ms',   intervalo: 15, ativa: false, icone: 'stopwatch' },
        { id: 6, nome: 'Temperatura',     unidade: '°C',   intervalo: 60, ativa: false, icone: 'temperature-half' }
    ];
    let proximaMetrica = 7;

    const painelM = document.getElementById('painel-metricas');
    const listaM = document.getElementById('lista-metricas');
    const buscaM = document.getElementById('busca-metrica');
    const vazioM = painelM.querySelector('.sem-resultados');
    const notaM = painelM.querySelector('[data-resumo="nota"]');
    const notaPadrao = notaM.textContent;
    let timerNota;

    const iconeDe = (valor) => ICONES.find((i) => i.valor === valor) || ICONES[0];

    function desenharMetricas() {
        listaM.innerHTML = metricas.map((m) => {
            const icone = iconeDe(m.icone);
            const opcoes = INTERVALOS.map((s) =>
                `<option value="${s}" ${s === m.intervalo ? 'selected' : ''}>${formatarIntervalo(s)}</option>`
            ).join('');

            return `
            <div class="linha linha-metrica ${m.ativa ? '' : 'is-inativa'}" data-id="${m.id}">
                <div class="col-metrica">
                    <span class="icone-metrica cor-${icone.cor}">${icone.html}</span>
                    <p class="item-nome">${esc(m.nome)}</p>
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
                <div class="col-acao">
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
            const mostrar = normalizar(metrica.nome).includes(termo);
            linha.hidden = !mostrar;
            if (mostrar) visiveis++;
        });
        vazioM.hidden = visiveis > 0;
    }

    buscaM.addEventListener('input', filtrarMetricas);

    // ajustes feitos direto na linha (intervalo e liga/desliga)
    listaM.addEventListener('change', (evento) => {
        const linha = evento.target.closest('.linha-metrica');
        if (!linha) return;
        const metrica = metricas.find((m) => m.id === Number(linha.dataset.id));

        if (evento.target.matches('select')) metrica.intervalo = Number(evento.target.value);
        if (evento.target.matches('input[type="checkbox"]')) {
            metrica.ativa = evento.target.checked;
            linha.classList.toggle('is-inativa', !metrica.ativa);
            linha.querySelector('.estado-texto').textContent = metrica.ativa ? 'Ativa' : 'Inativa';
        }
        resumirMetricas();
    });

    document.getElementById('salvar-metricas').addEventListener('click', () => {
        // aqui você envia `metricas` para o back-end com fetch()
        notaM.textContent = 'Alterações salvas. Entram em vigor no próximo ciclo de coleta.';
        clearTimeout(timerNota);
        timerNota = setTimeout(() => (notaM.textContent = notaPadrao), 3500);
        SGModal.aviso('Configurações de métricas salvas.');
    });

    function abrirMetrica(id, origem) {
        const editando = id != null;
        if (editando ? !SG.pode('editar') : !SG.pode('criar')) return; // checagem dupla

        const atual = editando
            ? metricas.find((m) => m.id === id)
            : { unidade: '%', intervalo: 15, ativa: true, icone: 'microchip' };

        SGModal.formulario({
            titulo: editando ? 'Editar métrica' : 'Adicionar métrica',
            subtitulo: editando
                ? 'Ajuste a unidade, o intervalo e o estado da coleta.'
                : 'Cadastre uma nova métrica para ser coletada.',
            confirmar: editando ? 'Salvar alterações' : 'Adicionar métrica',
            icone: editando ? 'save' : 'plus',
            aviso: editando ? 'Métrica atualizada.' : 'Métrica adicionada.',
            gatilho: origem,
            valores: { ...atual, intervalo: String(atual.intervalo) },
            campos: [
                { tipo: 'texto', nome: 'nome', rotulo: 'Nome da métrica', placeholder: 'Ex.: Uso de CPU', max: 40, erro: 'Informe o nome da métrica.' },
                {
                    tipo: 'linha',
                    campos: [
                        { tipo: 'select', nome: 'unidade', rotulo: 'Unidade', opcoes: UNIDADES.map((u) => ({ valor: u, texto: u === '%' ? '% (porcentagem)' : u })) },
                        { tipo: 'select', nome: 'intervalo', rotulo: 'Intervalo de coleta', opcoes: INTERVALOS.map((s) => ({ valor: String(s), texto: formatarIntervalo(s) })) }
                    ]
                },
                { tipo: 'icones', nome: 'icone', rotulo: 'Ícone', opcoes: ICONES.map((i) => ({ valor: i.valor, html: i.html, cor: i.hex })) },
                { tipo: 'switch', nome: 'ativa', rotulo: 'Coleta ativa', descricao: 'Quando desligada, a métrica deixa de ser coletada.' }
            ],
            onSalvar(v) {
                const repetida = metricas.some((m) => m.id !== id && normalizar(m.nome) === normalizar(v.nome));
                if (repetida) return 'Já existe uma métrica com esse nome.';

                const dados = { nome: v.nome, unidade: v.unidade, intervalo: Number(v.intervalo), ativa: v.ativa, icone: v.icone };
                if (editando) Object.assign(atual, dados);
                else metricas.push({ id: proximaMetrica++, ...dados });
                desenharMetricas();
            }
        });
    }

    function removerMetrica(id, origem) {
        const metrica = metricas.find((m) => m.id === id);
        if (!metrica || !SG.pode('excluir')) return; // checagem dupla

        SGModal.confirmar({
            titulo: 'Remover métrica?',
            texto: `A métrica <strong>${esc(metrica.nome)}</strong> deixará de ser coletada. Essa ação não pode ser desfeita.`,
            botao: 'Remover',
            aviso: 'Métrica removida.',
            gatilho: origem,
            onConfirmar() {
                metricas = metricas.filter((m) => m.id !== id);
                desenharMetricas();
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
    // perfil da tela -> id da tabela permissao (1 Root, 2 Admin, 3 Gerente, 4 User)
    const ID_PERMISSAO = { root: 1, administrador: 2, gerente: 3, comum: 4 };
    // Quem está logado como Root escolhe entre os 4 perfis; os demais só enxergam os 3 perfis das empresas clientes.
    const EH_ROOT = SG.perfil === 'root';
    const PERFIS_SELECIONAVEIS = EH_ROOT ? ['root', 'administrador', 'gerente', 'comum'] : ['administrador', 'gerente', 'comum'];

    // nome que vem da tabela permissao -> perfil da tela
    const perfilDoBanco = (nome) => {
        const t = normalizar(String(nome || ''));
        if (t === 'root') return 'root';
        if (t === 'admin' || t === 'administrador') return 'administrador';
        if (t === 'gerente') return 'gerente';
        return 'comum';
    };

    const ID_USUARIO = Number(sessionStorage.getItem('ID_USUARIO'));
    let idEmpresa = Number(sessionStorage.getItem('ID_EMPRESA')) || null;
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

    // chamada ao back-end: devolve o JSON ou lança Error com a mensagem do servidor
    async function chamar(url, opcoes) {
        const resposta = await fetch(url, opcoes);
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

    // a empresa vem da sessão; se o login não guardou, busca no perfil do usuário logado
    async function obterEmpresa() {
        if (idEmpresa) return idEmpresa;
        if (!Number.isInteger(ID_USUARIO) || ID_USUARIO <= 0) throw new Error('Sessão inválida. Faça login novamente.');
        const perfil = await chamar(`/perfil/${ID_USUARIO}`);
        idEmpresa = Number(perfil.empresa_id);
        sessionStorage.setItem('ID_EMPRESA', String(idEmpresa));
        return idEmpresa;
    }

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
                    <button type="button" class="btn-sg btn-ghost" data-acao="editar-funcionario" data-perm="editar"><i class="fa-solid fa-pen"></i> Editar</button>
                    <button type="button" class="btn-sg btn-danger" data-acao="remover-funcionario" data-perm="excluir"><i class="fa-regular fa-trash-can"></i> Remover</button>
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

    // na visão StreamGuard o filtro de perfil também precisa ter a opção Root
    if (EH_ROOT && !filtroPerfil.querySelector('option[value="root"]')) {
        filtroPerfil.insertAdjacentHTML('beforeend', '<option value="root">Root</option>');
    }

    buscaF.addEventListener('input', filtrarFuncionarios);
    filtroPerfil.addEventListener('change', filtrarFuncionarios);

    // o modal fecha sozinho quando o onSalvar devolve undefined; como aqui a resposta chega
    // depois (fetch), o onSalvar devolve false (modal aberto) e quem fecha é esta função.
    function erroNoModal(mensagem) {
        const geral = document.querySelector('[data-erro-geral]');
        if (!geral) { SGModal.fechar(); return SGModal.aviso(mensagem); } // modal de confirmação não tem área de erro
        geral.textContent = mensagem;
        geral.style.display = 'block';
    }

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
            onEditar: (gatilho) => abrirFuncionario(id, gatilho),
            onExcluir: (gatilho) => removerFuncionario(id, gatilho)
        });
    }

    function abrirFuncionario(id, origem) {
        const editando = id != null;
        if (editando ? !SG.pode('editar') : !SG.pode('criar')) return; // checagem dupla

        const atual = editando
            ? funcionarios.find((f) => f.id === id)
            : { perfil: 'comum', ativo: true, cargo: '' };

        const campos = [
            { tipo: 'texto', nome: 'nome', rotulo: 'Nome completo', placeholder: 'Ex.: Maria Oliveira', max: 60, erro: 'Informe o nome do funcionário.' },
            { tipo: 'email', nome: 'email', rotulo: 'E-mail', placeholder: 'nome@streamco.com.br', erro: 'Informe um e-mail válido.' },
            { tipo: 'texto', nome: 'cargo', rotulo: 'Cargo', placeholder: 'Ex.: Analista de TI', max: 50, obrigatorio: false }
        ];
        // a senha só é pedida no cadastro; quem já existe troca a senha pela tela de perfil
        if (!editando) {
            campos.push({
                tipo: 'texto', nome: 'senha', rotulo: 'Senha inicial', placeholder: 'Mínimo de 8 caracteres', max: 60,
                validar: (v) => String(v).length >= 8, erro: 'A senha precisa ter pelo menos 8 caracteres.'
            });
        }
        campos.push(
            { tipo: 'perfil', nome: 'perfil', rotulo: 'Perfil', opcoes: PERFIS_SELECIONAVEIS.map((valor) => ({ valor, titulo: PERFIS[valor].titulo, descricao: PERFIS[valor].descricao })) }
        );

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
                return false; // mantém o modal aberto até a resposta do servidor
            }
        });

        // o modal não tem campo de senha; aqui o campo de texto passa a esconder o que é digitado
        const campoSenha = document.querySelector('.modal input[name="senha"]') || document.querySelector('input[name="senha"]');
        if (campoSenha) { campoSenha.type = 'password'; campoSenha.autocomplete = 'new-password'; }
    }

    function removerFuncionario(id, origem) {
        const f = funcionarios.find((x) => x.id === id);
        if (!f || !SG.pode('excluir')) return; // checagem dupla
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
    });


    desenharMetricas();
    carregarFuncionarios();
    abrirAba(location.hash.replace('#', '') || 'metricas');
})();
