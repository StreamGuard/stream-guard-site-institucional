(() => {
    'use strict';

    const GRAVIDADE = ['critico', 'indisponivel', 'degradado'];

    const plural = (n, singular, pluralTxt) => `${n} ${n === 1 ? singular : pluralTxt}`;

    const definir = (seletor, texto) => {
        const el = document.querySelector(seletor);
        if (el) el.textContent = texto;
    };

    function ordenarAtencao() {
        const lista = document.querySelector('.lista-atencao');
        const itens = [...lista.querySelectorAll('.item-atencao')];

        itens
            .sort((a, b) => GRAVIDADE.indexOf(a.dataset.status) - GRAVIDADE.indexOf(b.dataset.status))
            .forEach((item) => lista.appendChild(item));
    }

    function atualizarResumo() {
        const contagem = { critico: 0, indisponivel: 0, degradado: 0, normal: 0 };

        document.querySelectorAll('[data-status]').forEach((el) => {
            if (el.dataset.status in contagem) contagem[el.dataset.status]++;
        });

        Object.entries(contagem).forEach(([status, total]) =>
            definir(`[data-contagem="${status}"]`, total)
        );

        const comProblema = contagem.critico + contagem.indisponivel + contagem.degradado;
        const total = comProblema + contagem.normal;

        definir(
            '[data-resumo="subtitulo"]',
            `Estado geral da infraestrutura • StreamCo Brasil • ${plural(total, 'servidor monitorado', 'servidores monitorados')}`
        );
        definir(
            '[data-resumo="atencao"]',
            comProblema
                ? `${plural(comProblema, 'servidor com problema', 'servidores com problema')}, do mais grave para o menos grave`
                : 'Nenhum servidor com problema no momento'
        );
        definir(
            '[data-resumo="normais"]',
            contagem.normal
                ? `${plural(contagem.normal, 'servidor sem nenhum problema', 'servidores sem nenhum problema')}`
                : 'Nenhum servidor funcionando normalmente'
        );
    }

    document.addEventListener('click', (evento) => {
        const botao = evento.target.closest('[data-acao]');
        if (!botao) return;

        document.dispatchEvent(
            new CustomEvent(`sg:${botao.dataset.acao}`, {
                detail: { servidor: botao.dataset.servidor || null }
            })
        );
    });

    ordenarAtencao();
    atualizarResumo();
})();
