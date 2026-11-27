
document.addEventListener("DOMContentLoaded", async () => {
    // ---------- Configuração ----------
    const SILENCIO_MIN = 15;      // sem lote há mais que isso: servidor silencioso
    const ALERTA_REJEICAO = 3;    // % de rejeição para destacar
    const GOLD_ATRASADO_MIN = 10;

    const el = (id) => document.getElementById(id);

    const USAR_MOCK = false;
    const URL_API = "/dataLake/buscarDadosETL";
    const PRECO_GB_MES = 0.023;

    let dados = {};
    let servidores = [];
    let dias = 30;
    let grafCrescimento = null;
    let grafRejeicao = null;

    function dadosVazios() {
        return {
            gerado_em: null,
            preco_gb_mes: PRECO_GB_MES,
            camadas: null,
            crescimento_gb_semana: null,
            ultimo_gold_em: null,
            empresas: [],
            servidores: [],
            crescimento_bronze: [],
            rejeicoes_por_dia: [],
            execucoes: [],
            fontes: { inventario: false, qualidade: false },
            aviso: null
        };
    }

    async function carregarDados() {
        if (USAR_MOCK) {
            return DADOS_MOCK.dataLake;
        }

        const resposta = await fetch(URL_API);

        let corpo = null;
        try {
            corpo = await resposta.json();
        } catch (erroJson) {
            corpo = null;
        }

        if (!resposta.ok || !corpo || !corpo.dados) {
            throw new Error((corpo && corpo.mensagem) || "Falha ao carregar os dados (HTTP " + resposta.status + ").");
        }

        return corpo.dados;
    }

    function mostrarAviso(texto) {
        const aviso = el("avisoDados");
        if (!aviso) return;

        if (!texto) {
            aviso.hidden = true;
            aviso.textContent = "";
            return;
        }

        aviso.textContent = texto;
        aviso.hidden = false;
    }

    // ---------- Formatação ----------
    const numeroSeguro = (valor) => {
        const convertido = Number(valor);
        return Number.isFinite(convertido) ? convertido : 0;
    };

    const numero = (valor, casas = 0) =>
        numeroSeguro(valor).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

    // Abaixo de 1 GB, mostra em MB para o valor não sumir no arredondamento.
    const formatarVolume = (gb) => {
        if (gb === null || gb === undefined) return "—";
        const valor = numeroSeguro(gb);
        if (valor === 0) return "0 MB";
        if (valor < 1) return `${numero(valor * 1024, 1)} MB`;
        return `${numero(valor, 1)} GB`;
    };

    // Separa o valor da unidade para o card, que destaca a unidade em <small>.
    const partesVolume = (gb) => {
        const texto = formatarVolume(gb);
        const fim = texto.lastIndexOf(" ");
        if (fim === -1) return { valor: texto, unidade: "" };
        return { valor: texto.slice(0, fim), unidade: texto.slice(fim + 1) };
    };

    // Custo em dólar: 2 casas normalmente e no máximo 3 abaixo de um centavo.
    const dinheiro = (gb) => {
        if (gb === null || gb === undefined) return "—";
        const preco = dados.preco_gb_mes === undefined || dados.preco_gb_mes === null
            ? PRECO_GB_MES
            : numeroSeguro(dados.preco_gb_mes);
        const valor = numeroSeguro(gb) * preco;
        const casas = valor > 0 && valor < 0.01 ? 3 : 2;
        return "US$ " + valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
    };

    // 1 dia de recorte é exibido como 24h para acompanhar o filtro.
    const rotuloDias = (total) => (total === 1 ? "24h" : `${total} dias`);

    const minutosDesde = (dataISO) => {
        if (!dataISO) return null;
        const ms = Date.now() - new Date(dataISO).getTime();
        return Number.isFinite(ms) ? ms / 60000 : null;
    };

    function idade(minutos) {
        if (minutos < 1) return "agora";
        if (minutos < 60) return `${Math.round(minutos)} min`;
        if (minutos < 2880) return `${Math.round(minutos / 60)} h`;
        return `${Math.round(minutos / 1440)} d`;
    }

    function dataCurta(dataISO) {
        if (!dataISO) return "—";
        const data = new Date(dataISO);
        if (Number.isNaN(data.getTime())) return "—";
        return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    }

    function dataHora(dataISO) {
        if (!dataISO) return "—";
        const data = new Date(dataISO);
        if (Number.isNaN(data.getTime())) return "—";
        return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " +
            data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }

    function escapar(texto) {
        const div = document.createElement("div");
        div.textContent = texto;
        return div.innerHTML;
    }

    const porcentagem = (parte, total) => (total ? (parte / total) * 100 : 0);

    // ---------- Preparação ----------
    const temInventario = () => (dados.fontes
        ? Boolean(dados.fontes.inventario)
        : Boolean(dados.camadas));

    const temQualidade = () => (dados.fontes
        ? Boolean(dados.fontes.qualidade)
        : (dados.rejeicoes_por_dia || []).length > 0);

    const temGold = () => Boolean(dados.ultimo_gold_em) ||
        (dados.servidores || []).some((s) => Boolean(s.ultimo_lote_em));

    function prepararServidores() {
        const nomeEmpresa = {};
        (dados.empresas || []).forEach((e) => { nomeEmpresa[e.id] = e.nome; });

        return (dados.servidores || []).map((s) => {
            const periodos = s.rejeicoes_por_periodo || {};
            const rej = periodos[dias] || null;
            const linhasRecebidas = rej ? numeroSeguro(rej.linhas_recebidas) : 0;
            const linhasRejeitadas = rej ? numeroSeguro(rej.linhas_rejeitadas) : 0;

            return {
                ...s,
                empresa: nomeEmpresa[s.empresa_id] || "—",
                minutosSemLote: minutosDesde(s.ultimo_lote_em),
                taxaRejeicao: porcentagem(linhasRejeitadas, linhasRecebidas),
                linhasRecebidas,
                linhasRejeitadas,
                totalGb: numeroSeguro(s.bronze_gb) + numeroSeguro(s.silver_gb) + numeroSeguro(s.gold_gb)
            };
        });
    }

    // Últimos N dias de uma lista diária.
    const ultimosDias = (lista) => (lista || []).slice(-dias);

    // ---------- Cards ----------
    function card(classe, titulo, fonte, valor, unidade, detalhe) {
        const rotulo = { lake: "Lake", rejeitados: "Rejeitados" }[fonte];
        return `
            <article class="card ${classe}">
                <header class="card-cabecalho">
                    <h3>${titulo}</h3>
                    <span class="fonte fonte-${fonte}">${rotulo}</span>
                </header>
                <p class="card-valor">${valor} ${unidade ? `<small>${unidade}</small>` : ""}</p>
                <p class="card-detalhe">${detalhe}</p>
            </article>`;
    }

    function desenharCards() {
        const camadas = dados.camadas;
        const totalGb = camadas
            ? numeroSeguro(camadas.bronze_gb) + numeroSeguro(camadas.silver_gb) + numeroSeguro(camadas.gold_gb)
            : null;

        const rejeicoes = dados.rejeicoes_por_dia || [];
        const recebidas = ultimosDias(rejeicoes).reduce((t, d) => t + numeroSeguro(d.linhas_recebidas), 0);
        const rejeitadas = ultimosDias(rejeicoes).reduce((t, d) => t + numeroSeguro(d.linhas_rejeitadas), 0);
        const taxa = porcentagem(rejeitadas, recebidas);
        const temDadosRejeicao = temQualidade() && rejeicoes.length > 0;

        const temDadosGold = temGold();
        const silenciosos = temDadosGold
            ? servidores.filter((s) => s.minutosSemLote === null || s.minutosSemLote > SILENCIO_MIN).length
            : null;

        const ultimas = (dados.execucoes || []).slice(0, 10);
        const falhas = temQualidade() && ultimas.length
            ? ultimas.filter((e) => e.situacao !== "concluida").length
            : null;
        const goldMin = minutosDesde(dados.ultimo_gold_em);

        const recorteCrescimento = ultimosDias(dados.crescimento_bronze);
        const crescimentoPeriodo = recorteCrescimento.reduce((t, d) => t + numeroSeguro(d.gb_adicionados), 0);
        const temCrescimento = recorteCrescimento.length > 0;
        const volumeTotal = partesVolume(totalGb);
        const semCamadas = temInventario()
            ? "O inventário não trouxe os volumes por camada."
            : "Inventário ainda não disponível";

        el("cardsKpi").innerHTML = [
            card("", "Volume total", "lake", camadas ? volumeTotal.valor : "—", camadas ? volumeTotal.unidade : "",
                camadas ? "Soma das camadas Bronze, Silver e Gold" : semCamadas),
            card("card-roxo", "Custo estimado", "lake", temCrescimento ? dinheiro(crescimentoPeriodo) : "—", temCrescimento ? "/mês" : "",
                `Preço de referência US$ ${numero(dados.preco_gb_mes === undefined || dados.preco_gb_mes === null ? PRECO_GB_MES : dados.preco_gb_mes, 3)} por GB`),
            card(temDadosRejeicao && taxa > ALERTA_REJEICAO ? "card-alerta" : temDadosRejeicao ? "card-verde" : "",
                "Taxa de rejeição", "rejeitados", temDadosRejeicao ? numero(taxa, 2) : "—", temDadosRejeicao ? "%" : "",
                temDadosRejeicao
                    ? `${numero(rejeitadas)} de ${numero(recebidas)} linhas em ${rotuloDias(dias)}`
                    : "Qualidade ainda não disponível"),
            card(silenciosos === null ? "" : silenciosos ? "card-alerta" : "card-verde",
                "Servidores sem enviar", "lake", silenciosos === null ? "—" : silenciosos,
                silenciosos === null ? "" : `de ${servidores.length}`,
                silenciosos === null ? "Gold ainda não disponível" : `Sem lote há mais de ${SILENCIO_MIN} min`),
            card(falhas === null ? "" : falhas ? "card-alerta" : "card-verde",
                "Falhas do ETL", "lake", falhas === null ? "—" : falhas,
                falhas === null ? "" : `em ${ultimas.length}`,
                falhas === null
                    ? (temQualidade() ? "Nenhuma execução registrada" : "Qualidade ainda não disponível")
                    : "Últimas execuções"),
            card(goldMin === null ? "" : goldMin > GOLD_ATRASADO_MIN ? "card-alerta" : "card-verde",
                "Último Gold", "lake", goldMin === null ? "—" : Math.round(goldMin),
                goldMin === null ? "" : "min atrás",
                goldMin === null
                    ? "Gold ainda não disponível"
                    : goldMin > GOLD_ATRASADO_MIN ? "Processamento atrasado" : "Processamento em dia")
        ].join("");
    }

    // ---------- Camadas ----------
    function desenharCamadas() {
        el("subCamadas").textContent = dados.gerado_em
            ? `Inventário de ${dataHora(dados.gerado_em)}`
            : "Inventário ainda não disponível";

        if (!dados.camadas) {
            el("listaCamadas").innerHTML = `<li class="vazio">${temInventario()
                ? "O inventário não trouxe os volumes por camada."
                : "O arquivo datalake/inventario.json ainda não está no bucket."}</li>`;
            return;
        }

        const camadas = [
            { nome: "Bronze (bruto)", gb: numeroSeguro(dados.camadas.bronze_gb), classe: "camada-bronze" },
            { nome: "Silver (limpo)", gb: numeroSeguro(dados.camadas.silver_gb), classe: "camada-silver" },
            { nome: "Gold (resumos)", gb: numeroSeguro(dados.camadas.gold_gb), classe: "camada-gold" }
        ];
        const maior = Math.max(1, ...camadas.map((c) => c.gb));

        el("listaCamadas").innerHTML = camadas.map((c) => `
            <li class="${c.classe}">
                <p class="ranking-linha">
                    <span class="ranking-nome">${c.nome}</span>
                    <span class="ranking-valor">${formatarVolume(c.gb)} · ${dinheiro(c.gb)}/mês</span>
                </p>
                <meter min="0" max="${maior}" value="${c.gb}">${formatarVolume(c.gb)}</meter>
            </li>`).join("");
    }

    // ---------- Armazenamento por empresa ----------
    function desenharEmpresas() {
        if (!dados.camadas || !(dados.empresas || []).length) {
            el("subEmpresas").textContent = "Volume por empresa ainda não disponível";
            const mensagem = !dados.camadas
                ? (temInventario()
                    ? "O inventário não trouxe os volumes por camada."
                    : "O arquivo datalake/inventario.json ainda não está no bucket.")
                : "Nenhuma empresa cadastrada.";
            el("rankEmpresas").innerHTML = `<li class="vazio">${mensagem}</li>`;
            return;
        }

        const porEmpresa = dados.empresas.map((empresa) => {
            const doGrupo = servidores.filter((s) => s.empresa_id === empresa.id);
            const soma = (campo) => doGrupo.reduce((t, s) => t + numeroSeguro(s[campo]), 0);
            return {
                nome: empresa.nome || "—",
                bronze: soma("bronze_gb"),
                silver: soma("silver_gb"),
                gold: soma("gold_gb")
            };
        }).sort((a, b) => (b.bronze + b.silver + b.gold) - (a.bronze + a.silver + a.gold));

        const maximo = Math.max(1, ...porEmpresa.map((e) => e.bronze + e.silver + e.gold));

        el("subEmpresas").textContent = "Volume total de cada empresa nas três camadas";

        el("rankEmpresas").innerHTML = porEmpresa.map((e) => {
            const total = e.bronze + e.silver + e.gold;
            const largura = (valor) => (valor / maximo) * 100;
            return `
            <li>
                <p class="ranking-linha">
                    <span class="ranking-nome">${escapar(e.nome)}</span>
                    <span class="ranking-valor">${formatarVolume(total)} · ${dinheiro(total)}/mês</span>
                </p>
                <div class="barra-empilhada" role="img" aria-label="Bronze ${formatarVolume(e.bronze)}, Silver ${formatarVolume(e.silver)}, Gold ${formatarVolume(e.gold)}">
                    <span class="camada-bronze" style="width: ${largura(e.bronze)}%"></span>
                    <span class="camada-silver" style="width: ${largura(e.silver)}%"></span>
                    <span class="camada-gold" style="width: ${largura(e.gold)}%"></span>
                </div>
            </li>`;
        }).join("");
    }

    // ---------- Tabelas ----------
    function desenharRejeicoes() {
        if (!temQualidade()) {
            el("tabelaRejeicoes").innerHTML = `<tr><td colspan="4" class="vazio-tabela">O arquivo datalake/qualidade.json ainda não está no bucket.</td></tr>`;
            return;
        }

        const piores = [...servidores]
            .filter((s) => s.linhasRejeitadas > 0)
            .sort((a, b) => b.taxaRejeicao - a.taxaRejeicao)
            .slice(0, 6);

        if (piores.length === 0) {
            el("tabelaRejeicoes").innerHTML = `<tr><td colspan="4" class="vazio-tabela">Nenhuma linha rejeitada no período.</td></tr>`;
            return;
        }

        el("tabelaRejeicoes").innerHTML = piores.map((s) => {
            const classe = s.taxaRejeicao > ALERTA_REJEICAO ? "tag-critico" : s.taxaRejeicao > 1 ? "tag-alerta" : "tag-ok";
            return `
            <tr>
                <th scope="row">${escapar(s.id)}</th>
                <td>${escapar(s.empresa)}</td>
                <td class="num"><span class="tag ${classe}">${numero(s.taxaRejeicao, 1)}%</span></td>
                <td>${escapar(s.motivo_principal_rejeicao || "—")}</td>
            </tr>`;
        }).join("");
    }

    function desenharSemLote() {
        if (!temGold()) {
            el("tabelaSemLote").innerHTML = `<tr><td colspan="4" class="vazio-tabela">O Gold ainda não está disponível.</td></tr>`;
            return;
        }

        if (servidores.length === 0) {
            el("tabelaSemLote").innerHTML = `<tr><td colspan="4" class="vazio-tabela">Nenhum servidor cadastrado.</td></tr>`;
            return;
        }

        const lista = [...servidores].sort((a, b) => {
            const aMin = a.minutosSemLote === null ? Infinity : a.minutosSemLote;
            const bMin = b.minutosSemLote === null ? Infinity : b.minutosSemLote;
            return bMin - aMin;
        }).slice(0, 6);

        el("tabelaSemLote").innerHTML = lista.map((s) => {
            const semRegistro = s.minutosSemLote === null;
            let classe = "tag-ok";
            let texto = "Enviando";

            if (semRegistro) {
                classe = "tag-alerta";
                texto = "Sem registro";
            } else if (s.minutosSemLote > 1440) {
                classe = "tag-critico";
                texto = "Parado";
            } else if (s.minutosSemLote > SILENCIO_MIN) {
                classe = "tag-alerta";
                texto = "Atrasado";
            }

            return `
            <tr>
                <th scope="row">${escapar(s.id)}</th>
                <td>${escapar(s.empresa)}</td>
                <td class="num">${semRegistro ? "—" : s.minutosSemLote < 1 ? "agora" : "há " + idade(s.minutosSemLote)}</td>
                <td><span class="tag ${classe}">${texto}</span></td>
            </tr>`;
        }).join("");
    }

    function desenharExecucoes() {
        const execucoes = dados.execucoes || [];

        if (!temQualidade() || execucoes.length === 0) {
            el("tabelaExecucoes").innerHTML = `<tr><td colspan="7" class="vazio-tabela">${temQualidade()
                ? "Nenhuma execução registrada."
                : "O arquivo datalake/qualidade.json ainda não está no bucket."}</td></tr>`;
            return;
        }

        el("tabelaExecucoes").innerHTML = execucoes.map((e) => {
            const validas = numeroSeguro(e.linhas_validas);
            const rejeitadas = numeroSeguro(e.linhas_rejeitadas);
            const taxa = porcentagem(rejeitadas, validas + rejeitadas);
            const ok = e.situacao === "concluida";
            return `
            <tr>
                <th scope="row">${escapar(e.id || "—")}</th>
                <td>${dataHora(e.inicio)}</td>
                <td class="num">${e.duracao_s === null || e.duracao_s === undefined ? "—" : numero(e.duracao_s) + " s"}</td>
                <td class="num">${e.lotes === null || e.lotes === undefined ? "—" : numero(e.lotes)}</td>
                <td class="num">${numero(validas)}</td>
                <td class="num">${numero(rejeitadas)}${rejeitadas ? ` (${numero(taxa, 1)}%)` : ""}</td>
                <td>
                    <span class="tag ${ok ? "tag-ok" : "tag-critico"}">${ok ? "Concluída" : "Falhou"}</span>
                    ${e.observacao ? `<small>${escapar(e.observacao)}</small>` : ""}
                </td>
            </tr>`;
        }).join("");
    }

    // ---------- Gráficos (Chart.js) ----------
    const COR_TEXTO = "#6f7a94";
    const COR_GRADE = "#1c1c3a";

    function escalas(sufixo) {
        return {
            x: { ticks: { color: COR_TEXTO, maxTicksLimit: 8, maxRotation: 0 }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { color: COR_TEXTO, callback: (v) => v + sufixo }, grid: { color: COR_GRADE } }
        };
    }

    function desenharGraficoCrescimento() {
        const recorte = ultimosDias(dados.crescimento_bronze);
        const total = recorte.reduce((t, d) => t + numeroSeguro(d.gb_adicionados), 0);
        el("subCrescimento").textContent = recorte.length
            ? `+${formatarVolume(total)} em ${rotuloDias(recorte.length)}`
            : "Sem dados de crescimento no período";

        // GB acumulados no período, partindo de zero.
        let acumulado = 0;
        const serie = recorte.map((d) => { acumulado += numeroSeguro(d.gb_adicionados); return Number(acumulado.toFixed(3)); });

        if (grafCrescimento) grafCrescimento.destroy();
        grafCrescimento = new Chart(el("chartCrescimento"), {
            type: "line",
            data: {
                labels: recorte.map((d) => dataCurta(d.dia)),
                datasets: [{
                    label: "GB adicionados (acumulado)",
                    data: serie,
                    borderColor: "#cd7f32",
                    backgroundColor: "rgba(205, 127, 50, 0.15)",
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: escalas(" GB")
            }
        });
    }

    function desenharGraficoRejeicao() {
        const recorte = ultimosDias(dados.rejeicoes_por_dia);
        const taxas = recorte.map((d) => Number(porcentagem(numeroSeguro(d.linhas_rejeitadas), numeroSeguro(d.linhas_recebidas)).toFixed(2)));

        if (grafRejeicao) grafRejeicao.destroy();
        grafRejeicao = new Chart(el("chartRejeicao"), {
            type: "bar",
            data: {
                labels: recorte.map((d) => dataCurta(d.dia)),
                datasets: [{
                    label: "Taxa de rejeição (%)",
                    data: taxas,
                    backgroundColor: taxas.map((t) => (t > ALERTA_REJEICAO ? "#ff4d6d" : "#4f8cff")),
                    borderRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: escalas("%")
            }
        });
    }

    // ---------- Tela ----------
    function desenharTudo() {
        servidores = prepararServidores();
        desenharCards();
        desenharCamadas();
        desenharEmpresas();
        desenharRejeicoes();
        desenharSemLote();
        desenharExecucoes();
        desenharGraficoCrescimento();
        desenharGraficoRejeicao();
    }

    // ---------- Eventos ----------
    function ativarBotao(grupo, botao) {
        grupo.querySelectorAll(".btn-periodo").forEach((b) => b.classList.toggle("ativo", b === botao));
    }

    el("grupoPeriodo").addEventListener("click", (evento) => {
        const botao = evento.target.closest("[data-dias]");
        if (!botao) return;
        dias = Number(botao.dataset.dias);
        ativarBotao(el("grupoPeriodo"), botao);
        desenharTudo();
    });

    // ---------- Início ----------
    try {
        dados = await carregarDados();
    } catch (erro) {
        console.error(erro);
        dados = dadosVazios();
        mostrarAviso("Não foi possível carregar os dados do Data Lake. " + erro.message);
    }

    if (dados.aviso) {
        mostrarAviso(dados.aviso);
    }

    desenharTudo();
});
