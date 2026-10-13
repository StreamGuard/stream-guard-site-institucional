
(() => {
    'use strict';

    const esc = SGModal.escapar;
    const TIPOS = ['Streaming', 'Borda/CDN', 'Codificação', 'Banco de dados', 'Cache', 'Backup'];
    const SISTEMAS = ['Ubuntu Server 22.04', 'Debian 12', 'Windows Server 2022', 'Red Hat 9'];

    const extras = {
        'srv-stream-01': { ip: '10.0.1.11', so: 'Ubuntu Server 22.04' },
        'srv-edge-01':   { ip: '10.0.2.21', so: 'Debian 12' },
        'srv-stream-03': { ip: '10.0.1.13', so: 'Ubuntu Server 22.04' },
        'srv-encode-01': { ip: '10.0.3.31', so: 'Ubuntu Server 22.04' },
        'srv-stream-02': { ip: '10.0.1.12', so: 'Ubuntu Server 22.04' },
        'srv-db-01':     { ip: '10.0.4.41', so: 'Red Hat 9' },
        'srv-cache-01':  { ip: '10.0.5.51', so: 'Debian 12' },
        'srv-backup-01': { ip: '10.0.6.61', so: 'Windows Server 2022' }
    };

    const ESTADOS = {
        critico:      { texto: 'Crítico',      cor: 'vermelho' },
        indisponivel: { texto: 'Indisponível', cor: 'azul' },
        degradado:    { texto: 'Degradado',    cor: 'laranja' },
        normal:       { texto: 'Normal',       cor: 'verde' }
    };

    const icone = (nome) => SGModal.icone(nome);


    const cartoes = () => [...document.querySelectorAll('.item-atencao, .item-normal')];
    const nomeDe = (c) => c.querySelector('h4').textContent.trim();
    const tipoDe = (c) => c.querySelector('.atencao-servidor span, h4 + span').textContent.trim();

    const acharCartao = (nome) => cartoes().find((c) => nomeDe(c) === nome);

    function tornarClicavel() {
        document.querySelectorAll('.item-normal').forEach((c) => {
            c.dataset.acao = 'ver-detalhes';
            c.dataset.servidor = nomeDe(c);
            c.tabIndex = 0;
            c.setAttribute('role', 'button');
            c.style.cursor = 'pointer';
        });
    }

    document.addEventListener('keydown', (evento) => {
        const alvo = evento.target.closest('.item-normal');
        if (alvo && (evento.key === 'Enter' || evento.key === ' ')) {
            evento.preventDefault();
            alvo.click();
        }
    });

    function criarCartaoNormal(nome, tipo) {
        const el = document.createElement('article');
        el.className = 'item-normal';
        el.dataset.status = 'normal';
        el.innerHTML = `<span class="ponto-status"></span><h4>${esc(nome)}</h4><span>${esc(tipo)}</span>`;
        document.querySelector('.grade-normais').appendChild(el);
        tornarClicavel();
    }


    function ver(nome, origem) {
        const cartao = acharCartao(nome);
        if (!cartao) return;

        const estado = ESTADOS[cartao.dataset.status] || ESTADOS.normal;
        const dados = extras[nome] || { ip: '—', so: '—' };
        const comProblema = cartao.classList.contains('item-atencao');

        const itens = [
            { rotulo: 'Situação', tag: estado.texto, cor: estado.cor },
            { rotulo: 'Tipo', valor: tipoDe(cartao) }
        ];

        if (comProblema) {
            itens.push(
                { rotulo: 'Problema', valor: cartao.querySelector('.atencao-problema h5').textContent.trim(), inteira: true },
                { rotulo: 'Detalhe', valor: cartao.querySelector('.atencao-problema span').textContent.trim(), inteira: true },
                { rotulo: 'Desde', valor: cartao.querySelector('.atencao-desde strong').textContent.trim() }
            );
        } else {
            itens.push({ rotulo: 'Problema', valor: 'Nenhum no momento' });
        }
        itens.push({ rotulo: 'Endereço IP', valor: dados.ip }, { rotulo: 'Sistema operacional', valor: dados.so });

        SGModal.ver({
            titulo: 'Detalhes do servidor',
            subtitulo: 'StreamCo Brasil',
            gatilho: origem,
            destaque: { icone: icone('server'), cor: estado.cor, titulo: nome, texto: tipoDe(cartao) },
            itens,
            onEditar: (gatilho) => formulario(nome, gatilho),
            onExcluir: (gatilho) => excluir(nome, gatilho)
        });
    }

    /* ---------- cadastrar / editar ---------- */

    function formulario(nome, origem) {
        const editando = nome != null;
        if (editando ? !SG.pode('editar') : !SG.pode('criar')) return; // checagem dupla

        const cartao = editando ? acharCartao(nome) : null;
        const atual = editando
            ? { hostname: nome, tipo: tipoDe(cartao), ...(extras[nome] || { ip: '', so: SISTEMAS[0] }) }
            : { tipo: 'Streaming', so: SISTEMAS[0] };

        SGModal.formulario({
            titulo: editando ? 'Editar servidor' : 'Cadastrar servidor',
            subtitulo: editando ? 'Atualize os dados do equipamento.' : 'Adicione um equipamento para ser monitorado.',
            confirmar: editando ? 'Salvar alterações' : 'Cadastrar servidor',
            icone: editando ? 'save' : 'plus',
            aviso: editando ? 'Servidor atualizado.' : 'Servidor cadastrado.',
            gatilho: origem,
            valores: atual,
            campos: [
                { tipo: 'texto', nome: 'hostname', rotulo: 'Hostname', placeholder: 'Ex.: srv-stream-04', max: 40, erro: 'Informe o hostname do servidor.' },
                {
                    tipo: 'linha',
                    campos: [
                        { tipo: 'select', nome: 'tipo', rotulo: 'Tipo', opcoes: TIPOS.map((t) => ({ valor: t, texto: t })) },
                        {
                            tipo: 'texto', nome: 'ip', rotulo: 'Endereço IP', placeholder: '10.0.0.10', max: 15,
                            erro: 'Informe um IP válido (ex.: 10.0.0.10).',
                            validar: (v) => /^(\d{1,3}\.){3}\d{1,3}$/.test(v) && v.split('.').every((n) => Number(n) <= 255)
                        }
                    ]
                },
                { tipo: 'select', nome: 'so', rotulo: 'Sistema operacional', opcoes: SISTEMAS.map((t) => ({ valor: t, texto: t })) }
            ],
            onSalvar(v) {
                const repetido = cartoes().some((c) => nomeDe(c) === v.hostname && nomeDe(c) !== nome);
                if (repetido) return 'Já existe um servidor com esse hostname.';

                if (editando) {
                    delete extras[nome];
                    cartao.querySelector('h4').textContent = v.hostname;
                    (cartao.querySelector('.atencao-servidor span') || cartao.querySelector('h4 + span')).textContent = v.tipo;
                    const botao = cartao.querySelector('[data-servidor]');
                    if (botao) botao.dataset.servidor = v.hostname;
                    if (cartao.classList.contains('item-normal')) cartao.dataset.servidor = v.hostname;
                } else {
                    criarCartaoNormal(v.hostname, v.tipo);
                }
                extras[v.hostname] = { ip: v.ip, so: v.so };
                SGDash.atualizar();
            }
        });
    }


    function excluir(nome, origem) {
        const cartao = acharCartao(nome);
        if (!cartao || !SG.pode('excluir')) return; // checagem dupla

        SGModal.confirmar({
            titulo: 'Excluir servidor?',
            texto: `O servidor <strong>${esc(nome)}</strong> deixará de ser monitorado e seu histórico será removido. Essa ação não pode ser desfeita.`,
            botao: 'Excluir',
            aviso: 'Servidor excluído.',
            gatilho: origem,
            onConfirmar() {
                cartao.remove();
                delete extras[nome];
                SGDash.atualizar();
            }
        });
    }


    document.addEventListener('sg:ver-detalhes', (evento) => {
        ver(evento.detail.servidor, document.querySelector(`[data-servidor="${evento.detail.servidor}"]`));
    });

    document.addEventListener('sg:cadastrar-servidor', () => formulario(null, document.querySelector('[data-acao="cadastrar-servidor"]')));

    tornarClicavel();
})();
