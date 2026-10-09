/* Stream Guard | Painel de Gerenciamento
   - Troca de abas (Métricas / Funcionários)
   - Estado das métricas, contadores e filtros
*/

(() => {
    'use strict';

    const ABAS = ['metricas', 'funcionarios'];

    const botoesAba = document.querySelectorAll('[data-tab]');
    const paineis = document.querySelectorAll('[data-panel]');


    const normalizar = (texto) =>
        texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const formatarIntervalo = (segundos) =>
        segundos >= 60 && segundos % 60 === 0 ? `${segundos / 60}min` : `${segundos}s`;

    const definirResumo = (painel, chave, valor) => {
        const el = painel.querySelector(`[data-resumo="${chave}"]`);
        if (el) el.textContent = valor;
    };


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

        // Navegação por setas entre as abas (acessibilidade)
        botao.addEventListener('keydown', (evento) => {
            if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') return;
            const passo = evento.key === 'ArrowRight' ? 1 : -1;
            const proximo = botoesAba[(indice + passo + botoesAba.length) % botoesAba.length];
            abrirAba(proximo.dataset.tab);
            proximo.focus();
        });
    });


    function iniciarMetricas() {
        const painel = document.getElementById('painel-metricas');
        const linhas = [...painel.querySelectorAll('.linha-metrica')];
        const busca = document.getElementById('busca-metrica');
        const vazio = painel.querySelector('.sem-resultados');
        const botaoSalvar = document.getElementById('salvar-metricas');
        const notaPadrao = painel.querySelector('[data-resumo="nota"]').textContent;
        let timerNota;

        const estaAtiva = (linha) => linha.querySelector('input[type="checkbox"]').checked;
        const intervalo = (linha) => Number(linha.querySelector('select').value);

        function atualizar() {
            linhas.forEach((linha) => {
                const ativa = estaAtiva(linha);
                linha.querySelector('.estado-texto').textContent = ativa ? 'Ativa' : 'Inativa';
                linha.classList.toggle('is-inativa', !ativa);
            });

            const ativas = linhas.filter(estaAtiva);
            definirResumo(painel, 'total', linhas.length);
            definirResumo(painel, 'ativas', ativas.length);
            definirResumo(painel, 'inativas', linhas.length - ativas.length);
            definirResumo(
                painel,
                'menor',
                ativas.length ? formatarIntervalo(Math.min(...ativas.map(intervalo))) : '—'
            );
        }

        function filtrar() {
            const termo = normalizar(busca.value);
            let visiveis = 0;
            linhas.forEach((linha) => {
                const nome = normalizar(linha.querySelector('.item-nome').textContent);
                const mostrar = nome.includes(termo);
                linha.hidden = !mostrar;
                if (mostrar) visiveis++;
            });
            vazio.hidden = visiveis > 0;
        }

        painel.addEventListener('change', (evento) => {
            if (evento.target.matches('input[type="checkbox"], select')) atualizar();
        });

        busca.addEventListener('input', filtrar);

        botaoSalvar.addEventListener('click', () => {
            const nota = painel.querySelector('[data-resumo="nota"]');
            nota.textContent = 'Alterações salvas. Entram em vigor no próximo ciclo de coleta.';
            clearTimeout(timerNota);
            timerNota = setTimeout(() => (nota.textContent = notaPadrao), 3500);
        });

        atualizar();
    }

    function iniciarFuncionarios() {
        const painel = document.getElementById('painel-funcionarios');
        const linhas = [...painel.querySelectorAll('.linha-funcionario')];
        const busca = document.getElementById('busca-funcionario');
        const filtroPerfil = document.getElementById('filtro-perfil');
        const vazio = painel.querySelector('.sem-resultados');

        function atualizarResumo() {
            const ativos = linhas.filter((l) => l.dataset.status === 'ativo').length;
            const niveis = new Set(linhas.map((l) => l.dataset.perfil)).size;

            definirResumo(painel, 'total', linhas.length);
            definirResumo(painel, 'ativos', ativos);
            definirResumo(painel, 'inativos', linhas.length - ativos);
            definirResumo(painel, 'niveis', niveis);
            definirResumo(
                painel,
                'rodape',
                `${linhas.length} funcionários • ${ativos} com acesso ativo`
            );
        }

        function filtrar() {
            const termo = normalizar(busca.value);
            const perfil = filtroPerfil.value;
            let visiveis = 0;

            linhas.forEach((linha) => {
                const texto = normalizar(
                    `${linha.querySelector('.item-nome').textContent} ${linha.querySelector('.col-email').textContent}`
                );
                const mostrar =
                    texto.includes(termo) && (perfil === 'todos' || linha.dataset.perfil === perfil);
                linha.hidden = !mostrar;
                if (mostrar) visiveis++;
            });
            vazio.hidden = visiveis > 0;
        }

        busca.addEventListener('input', filtrar);
        filtroPerfil.addEventListener('change', filtrar);

        atualizarResumo();
    }


    iniciarMetricas();
    iniciarFuncionarios();
    abrirAba(location.hash.replace('#', '') || 'metricas');
})();
