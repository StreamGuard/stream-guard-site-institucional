document.addEventListener('DOMContentLoaded', () => {
    'use strict';
    // Exclusivamente mock: nenhuma API, autenticação ou escrita de dados.
    const $ = id => document.getElementById(id);
    const nomes = ['srv-stream-01', 'srv-stream-02', 'srv-edge-01', 'srv-backup-01'];
    const limites = { CPU: 85, RAM: 90, Disco: 85, Rede: 80 };
    const cores = { CPU: '#2de2c0', RAM: '#b095fc', Disco: '#66a8ff', Rede: '#f5b45f' };
    const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const fracaoDia = 14 / 24;
    const fmt = (n, casas = 1) => n.toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: casas });
    const esc = texto => String(texto).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const media = valores => valores.reduce((s, v) => s + v, 0) / valores.length;
    const selecionados = () => $('servidor').value === 'todos' ? [0, 1, 2, 3] : [Number($('servidor').value)];
    const diaAtual = () => Number($('dia').value);
    // Ajuste por mínimos quadrados: tempo em dias e valor da série.
    function regressao(valores) {
        const x = valores.map((_, i) => i), mx = media(x), my = media(valores);
        const b = x.reduce((s, v, i) => s + (v - mx) * (valores[i] - my), 0) / x.reduce((s, v) => s + (v - mx) ** 2, 0);
        return { b, prever: t => my + b * (t - mx) };
    }
    function historicoDisco(s) { return Array.from({ length: 28 }, (_, i) => 47 + s * 5 + i * (.61 + s * .045) + Math.sin(i * .9 + s) * 1.1); }
    function historicoAlertas(s, c) { return Array.from({ length: 28 }, (_, i) => Math.max(0, Math.round(1 + (3 - s) * .8 + c * .45 + i * .055 + Math.sin(i * 1.4 + s + c) * 1.5))); }
    function historicoTotal(ids) { return Array.from({ length: 28 }, (_, i) => ids.reduce((total, s) => total + [0, 1, 2].reduce((soma, c) => soma + historicoAlertas(s, c)[i], 0), 0)); }
    // Janela de 16 medições por componente, com um episódio e um pico isolado.
    function amostrasPico(s, c, d) {
        const limite = limites[c];
        return Array.from({ length: 16 }, (_, i) => {
            if (i >= 5 && i <= 8) return Math.min(99, limite + 2 + (s + d + Object.keys(limites).indexOf(c)) % 5 + (i === 7 ? 3 : 0));
            if (i === 12) return 99; // Ignorado: único ponto acima do limite.
            return limite - 13 + (i + s + d) % 7;
        });
    }
    function maiorPico(componente) {
        const episodios = [];
        for (const s of selecionados()) for (const c of [componente]) for (let d = 0; d <= diaAtual(); d++) {
            const serie = amostrasPico(s, c, d); let inicio = null;
            for (let i = 0; i <= serie.length; i++) {
                if (i < serie.length && serie[i] >= limites[c]) { if (inicio === null) inicio = i; }
                else if (inicio !== null) {
                    if (i - inicio >= 2) episodios.push({ s, c, d, valor: Math.max(...serie.slice(inicio, i)), amostras: i - inicio, duracao: i - inicio - 1 });
                    inicio = null;
                }
            }
        }
        return episodios.sort((a, b) => b.valor - a.valor || b.d - a.d)[0];
    }
    function kpis() {
        $('picosComponentes').innerHTML = Object.keys(limites).map(c => {
            const pico = maiorPico(c);
            const nome = { CPU: 'CPU', RAM: 'Memória RAM', Disco: 'Disco', Rede: 'Rede' }[c];
            return `<section class="pico-quadrante" style="--cor-componente:${cores[c]}"><h4>${nome}</h4><strong>${pico ? fmt(pico.valor, 0) : '—'}<span>${pico ? '%' : ''}</span></strong><p>${pico ? nomes[pico.s] : 'Sem pico persistente'}</p><small>${pico ? `${dias[pico.d]}, 13h07 · ${pico.amostras} medições<br>${pico.duracao} min · limite ${limites[c]}%` : 'Nenhum episódio elegível'}</small></section>`;
        }).join('');
        const rank = nomes.map((nome, s) => ({ nome, contagens: [0, 1, 2].map(c => historicoAlertas(s, c).reduce((a, b) => a + b, 0)) }));
        rank.forEach(r => r.total = r.contagens.reduce((a, b) => a + b, 0)); rank.sort((a, b) => b.total - a.total);
        $('ranking').innerHTML = rank.slice(0, 3).map(r => `<div><div class="rank-label"><span>${r.nome}</span><b>${r.total} episódios</b></div><div class="rank-trilho" role="img" aria-label="${esc(r.nome)}: CPU ${r.contagens[0]}, RAM ${r.contagens[1]}, disco ${r.contagens[2]} episódios"><div class="rank-barra" style="width:${r.total / rank[0].total * 100}%">${r.contagens.map((n, c) => `<span style="width:${n / r.total * 100}%;background:${cores[['CPU', 'RAM', 'Disco'][c]]}" title="${['CPU', 'RAM', 'Disco'][c]}: ${n} episódios"></span>`).join('')}</div></div></div>`).join('');
        const ids = selecionados(), dia = diaAtual();
        const anterior = media(ids.map(s => [52, 42, 68, 24][s] + dia * .8));
        const atual = media(ids.map(s => [61, 38, 77, 29][s] + dia * .5));
        const delta = (atual - anterior) / anterior * 100, pontos = atual - anterior;
        $('redeValor').innerHTML = `${fmt(atual)}<span>%</span>`;
        $('redeComparacao').innerHTML = `<span class="variacao ${delta < 0 ? 'queda' : ''}">${delta >= 0 ? '↑' : '↓'} ${fmt(Math.abs(delta))}%</span> em relação à hora anterior<br><span>${pontos >= 0 ? '+' : ''}${fmt(pontos)} pontos percentuais · antes ${fmt(anterior)}%</span>`;
        $('redeBarra').innerHTML = `<span style="width:${atual}%"></span>`;
        $('redeNota').textContent = `${dias[dia]} · 13–14h versus 12–13h. Capacidade hipotética: ${ids.length} Gbit/s de saída ${ids.length > 1 ? 'somados no parque' : 'no enlace'}.`;
    }
    function eixos(w, h, max, rotulos, xMax = 7) {
        const p = { l: 43, r: 20, t: 24, b: 35 };
        const x = v => p.l + (w - p.l - p.r) * v / xMax, y = v => h - p.b - (h - p.t - p.b) * v / max;
        let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
        for (let i = 0; i <= 4; i++) { const v = max * i / 4; svg += `<line x1="${p.l}" y1="${y(v)}" x2="${w - p.r}" y2="${y(v)}" stroke="#2a2a44"/><text x="${p.l - 8}" y="${y(v) + 4}" text-anchor="end">${Math.round(v)}${rotulos === '%' ? '%' : ''}</text>`; }
        return { svg, x, y, p };
    }
    function linha(pontos, x, y, cor, tracejada = false) {
        return `<path d="${pontos.map((p, i) => `${i ? 'L' : 'M'} ${x(p[0]).toFixed(2)} ${y(p[1]).toFixed(2)}`).join(' ')}" stroke="${cor}" stroke-width="2.8" fill="none" ${tracejada ? 'stroke-dasharray="6 5"' : ''} stroke-linejoin="round"/>`;
    }
    function contexto() { return $('servidor').value === 'todos' ? 'Parque completo · média simples dos servidores' : nomes[Number($('servidor').value)]; }
    function graficoHorarios() {
        const comp = $('componente').value, ids = selecionados(), dia = diaAtual();
        const base = { CPU: [31, 59, 78, 50], RAM: [55, 68, 80, 65], Disco: [64, 65, 67, 68], Rede: [24, 48, 73, 52] }[comp];
        const horas = [6, 6, 2, 0].map((v, i) => dia * 6 + v);
        const valores = base.map((b, i) => horas[i] ? Math.min(99, media(ids.map(s => b + s * 2 + Math.sin(s + dia + i) * 3))) : null);
        const w = Math.max(270, Math.min(1000, $('graficoHorarios').clientWidth)), h = 232, { svg, x, y } = eixos(w, h, 100, '%', 4);
        const larguraBarra = Math.min(86, (w - 63) / 4 * .56);
        let out = svg; const labels = ['00h–06h', '06h–12h', '12h–18h', '18h–24h'];
        valores.forEach((v, i) => { const cx = x(i + .5); if (v !== null) out += `<rect x="${cx - larguraBarra / 2}" y="${y(v)}" width="${larguraBarra}" height="${y(0) - y(v)}" rx="5" fill="${cores[comp]}" fill-opacity=".8"><title>${labels[i]}: ${fmt(v)}%, ${horas[i]} horas observadas</title></rect><text class="valor-barra" x="${cx}" y="${y(v) - 9}" text-anchor="middle">${fmt(v)}%</text>`; else out += `<text x="${cx}" y="${y(0) - 14}" text-anchor="middle"><title>Faixa ainda sem observação nesta semana</title>—</text>`; out += `<text x="${cx}" y="${h - 11}" text-anchor="middle">${labels[i]}</text>`; });
        $('graficoHorarios').innerHTML = out + '</svg>';
        $('horarioContexto').textContent = `${comp} · ${contexto()} · até ${dias[dia]}, 14h`;
    }
    function graficoDisco() {
        const ids = selecionados(), dia = diaAtual(), t = dia + fracaoDia;
        const history = Array.from({ length: 28 }, (_, i) => media(ids.map(s => historicoDisco(s)[i])));
        const fit = regressao(history), inicio = history.at(-1);
        const observado = [[0, inicio]];
        for (let d = 0; d < dia; d++)observado.push([d + 1, inicio + fit.b * (d + 1) + Math.sin(d + 1) * .55]);
        observado.push([t, inicio + fit.b * t + Math.sin(t) * .55]);
        const ultimo = observado.at(-1)[1];
        const previsto = Array.from({ length: 8 }, (_, d) => [d, fit.prever(27 + d)]);
        const domingo = previsto.at(-1)[1], max = Math.max(100, Math.ceil(domingo / 10) * 10);
        const w = Math.max(270, Math.min(550, $('graficoDisco').clientWidth)), h = 260, { svg, x, y, p } = eixos(w, h, max, '%'); let out = svg;
        out += `<rect x="${x(t)}" y="${p.t}" width="${x(7) - x(t)}" height="${y(0) - p.t}" fill="#66a8ff" fill-opacity=".035"/><line x1="${p.l}" x2="${w - p.r}" y1="${y(85)}" y2="${y(85)}" stroke="#ff8799" stroke-dasharray="4 5"/><text x="${w - p.r}" y="${y(85) - 6}" text-anchor="end" style="fill:#ff8799">Limite 85%</text>`;
        out += linha(previsto, x, y, '#f5b45f', true) + linha(observado, x, y, cores.Disco);
        out += `<circle cx="${x(t)}" cy="${y(ultimo)}" r="4" fill="${cores.Disco}"/><circle cx="${x(7)}" cy="${y(domingo)}" r="4" fill="#f5b45f"/>`;
        dias.forEach((d, i) => out += `<text x="${x(i + .5)}" y="${h - 10}" text-anchor="middle">${d}</text>`);
        $('graficoDisco').innerHTML = out + '</svg>';
        $('discoContexto').textContent = `${contexto()} · tendência baseada em 28 médias diárias`;
        $('discoResumo').innerHTML = `Atual: <strong>${fmt(ultimo)}%</strong> · estimativa ao fim de domingo: <strong>${fmt(domingo)}%</strong>.<br>${domingo >= 85 ? 'A tendência alcança o limite de referência. Investigue retenção e capacidade.' : 'A tendência permanece abaixo do limite de referência.'} Inclinação histórica: ${fmt(fit.b, 2)} p.p./dia.`;
    }
    function graficoAlertas() {
        const ids = selecionados(), dia = diaAtual(), t = dia + fracaoDia, fit = regressao(historicoTotal(ids));
        const observado = [[0, 0]]; let acumulado = 0;
        for (let d = 0; d < dia; d++) { acumulado += Math.max(0, Math.round(fit.prever(28 + d) + Math.sin(d + 2) * 3)); observado.push([d + 1, acumulado]); }
        acumulado += Math.max(0, Math.round((fit.prever(28 + dia) + 2) * fracaoDia)); observado.push([t, acumulado]);
        const previsto = [[0, 0]]; let futuro = 0;
        for (let d = 0; d < 7; d++) { futuro += Math.max(0, fit.prever(28 + d)); previsto.push([d + 1, futuro]); }
        const max = Math.max(20, Math.ceil(Math.max(futuro, acumulado) / 20) * 20);
        const w = Math.max(270, Math.min(550, $('graficoAlertas').clientWidth)), h = 260, { svg, x, y, p } = eixos(w, h, max, ''); let out = svg;
        out += `<rect x="${x(t)}" y="${p.t}" width="${x(7) - x(t)}" height="${y(0) - p.t}" fill="#b095fc" fill-opacity=".035"/>`;
        out += linha(previsto, x, y, '#f5b45f', true) + linha(observado, x, y, cores.RAM);
        out += `<circle cx="${x(t)}" cy="${y(acumulado)}" r="4" fill="${cores.RAM}"/>`;
        dias.forEach((d, i) => out += `<text x="${x(i + .5)}" y="${h - 10}" text-anchor="middle">${d}</text>`);
        $('graficoAlertas').innerHTML = out + '</svg>';
        $('alertaContexto').textContent = `${ids.length > 1 ? 'Soma do parque' : contexto()} · episódios de CPU, RAM e disco`;
        $('alertaResumo').innerHTML = `Observados: <strong>${acumulado} episódios</strong> · predição da semana até domingo: <strong>≈ ${Math.round(futuro)}</strong>.<br>Regressão de contagens diárias das quatro semanas anteriores; dia atual parcial. Não é previsão validada.`;
    }
    function render() { $('escopo').textContent = `Até ${dias[diaAtual()]}, 14h · valores simulados`; kpis(); graficoHorarios(); graficoDisco(); graficoAlertas(); }
    ['servidor', 'componente', 'dia'].forEach(id => $(id).addEventListener('change', render));
    document.querySelector('.aviso-demonstracao')?.remove();
    const selo = document.querySelector('.selo-online'); if (selo) selo.textContent = 'Protótipo semanal';
    window.SG?.definirNotificacoes([]);
    let quadro;
    window.addEventListener('resize', () => { cancelAnimationFrame(quadro); quadro = requestAnimationFrame(() => { graficoHorarios(); graficoDisco(); graficoAlertas(); }); });
    render();
});
