// ==========================================
// STREAMGUARD - DASHBOARD INDIVIDUAL
// ==========================================

// Indicadores operacionais e recomendações permanecem demonstrativos.
// O histórico Gold e os cálculos financeiros são consultados pelo backend.

(function () {

    'use strict';

    // ==========================================
    // 1. CONFIGURAÇÕES GERAIS
    // ==========================================

    function $(id) {
        return document.getElementById(id);
    }

    function escaparHtml(texto) {

        return String(texto).replace(/[&<>"']/g, function (caractere) {

            const caracteres = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };

            return caracteres[caractere];
        });
    }

    const COMPONENTES = ['CPU', 'RAM', 'Disco', 'Rede'];

    const CORES = {
        CPU: '#2de2c0',
        RAM: '#b095fc',
        Disco: '#66a8ff',
        Rede: '#f59a3d'
    };

    const LIMITES = {
        CPU: 85,
        RAM: 90,
        Disco: 85,
        Rede: 80
    };

    const NOMES_STATUS = {
        critico: 'Crítico',
        atencao: 'Atenção',
        normal: 'Normal'
    };

    // ==========================================
    // 2. DADOS DEMONSTRATIVOS
    // ==========================================

    // FUTURO: substituir pelas informações da API.

    const HOSTS = [
        {
            id: 'srv-encoder-01',
            role: 'Codificação',
            CPU: 93,
            RAM: 71,
            Disco: 63,
            Rede: 61
        },
        {
            id: 'srv-edge-01',
            role: 'Distribuição / Edge',
            CPU: 65,
            RAM: 68,
            Disco: 56,
            Rede: 91
        },
        {
            id: 'srv-db-01',
            role: 'Banco de dados',
            CPU: 71,
            RAM: 94,
            Disco: 91,
            Rede: 49
        },
        {
            id: 'srv-stream-01',
            role: 'Streaming',
            CPU: 84,
            RAM: 89,
            Disco: 64,
            Rede: 78
        },
        {
            id: 'srv-backup-01',
            role: 'Backup',
            CPU: 43,
            RAM: 60,
            Disco: 89,
            Rede: 36
        },
        {
            id: 'srv-stream-02',
            role: 'Streaming',
            CPU: 67,
            RAM: 76,
            Disco: 54,
            Rede: 72
        },
        {
            id: 'srv-cache-01',
            role: 'Cache',
            CPU: 49,
            RAM: 77,
            Disco: 43,
            Rede: 52
        },
        {
            id: 'srv-api-01',
            role: 'API',
            CPU: 75,
            RAM: 70,
            Disco: 51,
            Rede: 67
        }
    ];

    // Variações utilizadas na simulação.

    const CENARIOS = {
        normal: {
            CPU: -13,
            RAM: -9,
            Disco: -4,
            Rede: -17
        },
        pico: {
            CPU: 0,
            RAM: 0,
            Disco: 0,
            Rede: 0
        },
        recuperacao: {
            CPU: -10,
            RAM: -6,
            Disco: -8,
            Rede: -13
        }
    };

    // ==========================================
    // 3. REGRAS GERENCIAIS
    // ==========================================


    const REGRAS = {

        CPU: {
            titulo: 'Avaliar capacidade de processamento',

            explicacao:
                'A utilização elevada pode reduzir a folga para picos de audiência, mas a causa precisa ser confirmada.',

            acao:
                'Solicitar análise técnica da recorrência dos picos e avaliar o custo de expandir ou redistribuir a capacidade.'
        },

        RAM: {
            titulo: 'Avaliar capacidade de memória',

            explicacao:
                'Pouca folga de memória pode limitar o crescimento da operação.',

            acao:
                'Priorizar a análise com a equipe técnica e avaliar ampliação de capacidade se a pressão persistir.'
        },

        Disco: {
            titulo: 'Planejar expansão de armazenamento',

            explicacao:
                'A ocupação elevada pode exigir revisão da capacidade para manter gravações e arquivos.',

            acao:
                'Solicitar previsão de crescimento, revisar a retenção e comparar custos de expansão.'
        },

        Rede: {
            titulo: 'Avaliar capacidade de distribuição',

            explicacao:
                'Tráfego elevado pode sinalizar necessidade de maior capacidade de entrega.',

            acao:
                'Validar o impacto com o analista e comparar os custos de ampliação da conectividade ou distribuição.'
        }

    };

    // ==========================================
    // 4. CONFIGURAÇÕES FINANCEIRAS
    // ==========================================

    const BASE_CUSTOS = {
        servidores: 8,
        armazenamento: 1200,
        trafego: 4
    };

    // Armazena informações da interface.

    const ESTADO = {
        servidores: [],
        acoes: [],
        cenario: 'pico',
        custos: null
    };

    // ==========================================
    // 5. FUNÇÕES AUXILIARES
    // ==========================================

    function limitarPercentual(numero) {

        numero = Math.round(numero);

        if (numero < 1) {
            return 1;
        }

        if (numero > 99) {
            return 99;
        }

        return numero;
    }

    function classificar(fator) {

        if (fator >= 1) {
            return 'critico';

        } else if (fator >= 0.92) {
            return 'atencao';

        } else {
            return 'normal';
        }
    }

    function moedaReal(numero) {

        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0
        }).format(numero);
    }

    function moedaDolar(numero) {

        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'USD'
        }).format(numero);
    }

    function numeroFormatado(numero) {

        return new Intl.NumberFormat('pt-BR', {
            maximumFractionDigits: 1
        }).format(numero);
    }

    // ==========================================
    // 6. CLASSIFICAÇÃO DOS SERVIDORES
    // ==========================================

    function calcularPrioridade(servidor) {

        let componentePrincipal = 'CPU';
        let maiorFator = 0;

        for (let i = 0; i < COMPONENTES.length; i++) {

            let componente = COMPONENTES[i];

            let utilizacao = servidor[componente];

            let limite = LIMITES[componente];

            let fator = utilizacao / limite;

            if (fator > maiorFator) {

                maiorFator = fator;

                componentePrincipal = componente;
            }
        }

        return {
            c: componentePrincipal,
            value: servidor[componentePrincipal],
            factor: maiorFator,
            status: classificar(maiorFator)
        };
    }

    // Prepara os servidores demonstrativos.

    function prepararServidores() {

        let resultado = [];

        let cenarioSelecionado = $('cenario').value;

        let variacao = CENARIOS[cenarioSelecionado];

        for (let i = 0; i < HOSTS.length; i++) {

            let original = HOSTS[i];

            let servidor = {
                id: original.id,
                role: original.role
            };

            for (let j = 0; j < COMPONENTES.length; j++) {

                let componente = COMPONENTES[j];

                let ajuste = original.id.length % 3 - 1;

                let valor =
                    original[componente] +
                    variacao[componente] +
                    ajuste;

                servidor[componente] = limitarPercentual(valor);
            }

            servidor.risk = calcularPrioridade(servidor);

            resultado.push(servidor);
        }

        // Ordena pela prioridade.

        resultado.sort(function (a, b) {

            return b.risk.factor - a.risk.factor;
        });

        return resultado;
    }

    function prepararServidoresGold(metricas) {

        let grupos = {};

        // Agrupa as métricas por servidor.
        for (let metrica of metricas) {

            let id = String(metrica.servidor_id);
            let tipo = metrica.tipo;

            let media = Number(metrica.media_amostral);
            let quantidade = Number(metrica.quantidade_amostras);

            if (
                metrica.media_amostral == null ||
                metrica.quantidade_amostras == null ||
                !Number.isFinite(media) ||
                !Number.isFinite(quantidade) ||
                quantidade <= 0
            ) {
                continue;
            }

            if (!grupos[id]) {
                grupos[id] = {};
            }

        if (!grupos[id][tipo]) {
    grupos[id][tipo] = {
        soma: 0,
        quantidade: 0,
        maximo: null,
        janelasAcimaLimite: 0
    };
}

grupos[id][tipo].soma += media * quantidade;
grupos[id][tipo].quantidade += quantidade;

// Obtém o maior valor registrado na janela.
let maximo = metrica.maximo == null
    ? null
    : Number(metrica.maximo);

if (maximo !== null && Number.isFinite(maximo)) {

    if (
        grupos[id][tipo].maximo === null ||
        maximo > grupos[id][tipo].maximo
    ) {
        grupos[id][tipo].maximo = maximo;
    }

    // Verifica se houve pico acima do limite.
    let limite = null;

    if (tipo === 'USO_CPU') {
        limite = LIMITES.CPU;
    } else if (tipo === 'USO_RAM') {
        limite = LIMITES.RAM;
    } else if (tipo === 'USO_DISCO') {
        limite = LIMITES.Disco;
    }

    if (limite !== null && maximo >= limite) {
        grupos[id][tipo].janelasAcimaLimite++;
    }
}
        }

        let servidores = [];

        for (let id in grupos) {

            let metricasServidor = grupos[id];

            function calcularMedia(tipo) {

                let metrica = metricasServidor[tipo];

                if (!metrica || metrica.quantidade === 0) {
                    return null;
                }

                return metrica.soma / metrica.quantidade;
            }

            function calcularPico(tipo) {

    let metrica = metricasServidor[tipo];

    if (!metrica) {
        return null;
    }

    return metrica.maximo;
}

function contarJanelasAcimaLimite(tipo) {

    let metrica = metricasServidor[tipo];

    if (!metrica) {
        return 0;
    }

    return metrica.janelasAcimaLimite;
}

            let cpu = calcularMedia('USO_CPU');
            let ram = calcularMedia('USO_RAM');
            let disco = calcularMedia('USO_DISCO');

            let envioRede = calcularMedia('TAXA_ENVIO_REDE');
            let capacidadeRede = calcularMedia('CAPACIDADE_REDE');

            // Não inventa valores quando faltar alguma métrica.
            if (
                cpu === null ||
                ram === null ||
                disco === null ||
                envioRede === null ||
                capacidadeRede === null ||
                capacidadeRede <= 0
            ) {
                console.warn('Métricas incompletas para o servidor:', id);
                continue;
            }

            let rede = envioRede / capacidadeRede * 100;

            let servidor = {
    id: 'srv-' + id,
    role: 'Servidor monitorado',

    // Médias históricas.
    CPU: Math.round(cpu),
    RAM: Math.round(ram),
    Disco: Math.round(disco),
    Rede: Math.round(rede),

    // Maiores valores registrados.
    picos: {
        CPU: calcularPico('USO_CPU'),
        RAM: calcularPico('USO_RAM'),
        Disco: calcularPico('USO_DISCO')
    },

    // Janelas históricas com limites ultrapassados.
    janelasAcimaLimite: {
        CPU: contarJanelasAcimaLimite('USO_CPU'),
        RAM: contarJanelasAcimaLimite('USO_RAM'),
        Disco: contarJanelasAcimaLimite('USO_DISCO')
    }
};

            servidor.risk = calcularPrioridade(servidor);

            servidores.push(servidor);
        }

        servidores.sort(function (a, b) {
            return b.risk.factor - a.risk.factor;
        });

        return servidores;
    }
    // Identifica o servidor com maior utilização
    // de determinado componente.

    function maiorServidor(componente) {

        let maior = ESTADO.servidores[0];

        for (let i = 1; i < ESTADO.servidores.length; i++) {

            let servidor = ESTADO.servidores[i];

            if (servidor[componente] > maior[componente]) {

                maior = servidor;
            }
        }

        return maior;
    }

    // Identifica os principais problemas.

    function obterProblemas() {

        let problemas = [];

        for (let i = 0; i < COMPONENTES.length; i++) {

            let componente = COMPONENTES[i];

            let servidor = maiorServidor(componente);

            let valor = servidor[componente];

            let limite = LIMITES[componente];

            let fator = valor / limite;

            let problema = {
                key: componente,
                host: servidor,
                value: valor,
                factor: fator,
                status: classificar(fator)
            };

            problemas.push(problema);
        }

        problemas.sort(function (a, b) {

            return b.factor - a.factor;
        });

        return problemas;
    }

    // ==========================================
    // 7. INDICADORES EXECUTIVOS
    // ==========================================

    function atualizarResumo() {

        let sobAtencao = 0;
        let servidoresCriticos = 0;
        let limitesExcedidos = 0;

        for (let i = 0; i < ESTADO.servidores.length; i++) {

            let servidor = ESTADO.servidores[i];

            if (servidor.risk.status !== 'normal') {

                sobAtencao++;
            }

            if (servidor.risk.status === 'critico') {

                servidoresCriticos++;
            }

            for (let j = 0; j < COMPONENTES.length; j++) {

                let componente = COMPONENTES[j];

                if (servidor[componente] >= LIMITES[componente]) {

                    limitesExcedidos++;
                }
            }
        }

        let principal = ESTADO.servidores[0];

        let problemas = obterProblemas();

        let recursosCriticos = 0;

        for (let i = 0; i < problemas.length; i++) {

            if (problemas[i].status === 'critico') {

                recursosCriticos++;
            }
        }

        // Atualiza os elementos HTML.

        $('kpiRisk').innerHTML =
            sobAtencao +
            '<small> / ' +
            ESTADO.servidores.length +
            '</small>';

        $('kpiRiskNote').textContent =
            servidoresCriticos +
            ' com pelo menos um limite excedido';

        $('kpiComp').textContent = limitesExcedidos;

        $('kpiMain').textContent =
            principal.id.replace('srv-', '');

        $('kpiMainNote').textContent =
            principal.risk.c +
            ' ' +
            principal.risk.value +
            '% • limite ' +
            LIMITES[principal.risk.c] +
            '%';

        $('noticeTitle').textContent =
    recursosCriticos +
    ' recursos críticos no período analisado';

        $('noticeDesc').textContent =
            'Maior prioridade: ' +
            problemas[0].key +
            ' em ' +
            problemas[0].host.id +
            ' (' +
            problemas[0].value +
            '%). Investigue os componentes destacados.';
    }

    // ==========================================
    // 7. INTEGRAÇÃO FINANCEIRA COM O BACKEND
    // ==========================================

    let temporizadorFinanceiro;
    let versaoFinanceira = 0;
    let tarifasAwsCarregadas = false;

    // Lê o orçamento e os percentuais preenchidos pelo gestor.
    function obterConfiguracaoFinanceira() {

        return {
            orcamentoMensal: valorCampo('orcamentoMensal'),
            crescimentoMensal: valorCampo('crescimentoMensal'),
            rateioCpu: valorCampo('rateioCpu'),
            distribuicaoOrcamento: {
                CPU: valorCampo('pctCpu'),
                RAM: valorCampo('pctRam'),
                Disco: valorCampo('pctDisco'),
                Rede: valorCampo('pctRede')
            }
        };
    }

    // Guarda a configuração separadamente para cada empresa neste navegador.
    function chaveOrcamentoGerencial() {

        let empresaId = sessionStorage.getItem('ID_EMPRESA') || 'local';

        return 'streamguard_orcamento_gerencial_' + empresaId;
    }

    function salvarOrcamentoLocal() {

        try {
            localStorage.setItem(
                chaveOrcamentoGerencial(),
                JSON.stringify(obterConfiguracaoFinanceira())
            );
        } catch (erro) {
            console.error('Não foi possível salvar o orçamento:', erro);
        }
    }

    // Evita fazer uma requisição a cada tecla digitada.
    function agendarSimulacaoFinanceira() {

        versaoFinanceira++;
        let versaoAtual = versaoFinanceira;
        clearTimeout(temporizadorFinanceiro);

        let configuracao = obterConfiguracaoFinanceira();
        let distribuicao = configuracao.distribuicaoOrcamento;
        let soma = distribuicao.CPU + distribuicao.RAM +
            distribuicao.Disco + distribuicao.Rede;

        if (Math.abs(soma - 100) > 0.001) {
            $('statusFinanceiro').textContent =
                'A distribuição precisa somar 100%. Soma atual: ' +
                numeroFormatado(soma) + '%.';
            $('custosComponentes').innerHTML = '';
            $('insightsFinanceiros').innerHTML = '';
            return;
        }

        if (configuracao.crescimentoMensal > 100 ||
            configuracao.rateioCpu > 100) {
            $('statusFinanceiro').textContent =
                'O crescimento mensal e o rateio da CPU devem estar entre 0% e 100%.';
            $('custosComponentes').innerHTML = '';
            $('insightsFinanceiros').innerHTML = '';
            return;
        }

        temporizadorFinanceiro = setTimeout(function () {
            enviarSimulacaoFinanceira(versaoAtual);
        }, 350);
    }

    async function enviarSimulacaoFinanceira(versaoAtual) {

        let dados = obterConfiguracaoFinanceira();

        dados.servidores = BASE_CUSTOS.servidores + valorCampo('extraNodes');
        dados.horasMes = valorCampo('hours');
        dados.armazenamentoGb = valorCampo('storage');

        // O controle egress está em TB, enquanto a API recebe GB.
        dados.trafegoSaidaGb = valorCampo('egress') * 1024;
        dados.cambio = valorCampo('fx');

        // Rede e câmbio continuam sendo premissas configuradas pelo gestor.
        dados.precoRedeUsdGb = valorCampo('priceTraffic');

        $('statusFinanceiro').textContent = 'Calculando custos...';

        try {
            let resposta = await fetch('/gestor/simular', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });

            let resultado = await resposta.json();

            // Descarta respostas antigas quando o usuário altera os campos.
            if (versaoAtual !== versaoFinanceira) {
                return;
            }

            if (!resposta.ok) {
                throw new Error(
                    resultado.mensagem || resultado.erro ||
                    'Não foi possível calcular a simulação.'
                );
            }

            exibirResultadoFinanceiro(resultado);
            ESTADO.custos.api = resultado;

            let mensagem = 'Estimativa atualizada pela API financeira.';

            if (tarifasAwsCarregadas) {
                mensagem += ' EC2 e EBS usam as tarifas AWS consultadas; ' +
                    'rede e câmbio são premissas informadas.';
            }

            $('statusFinanceiro').textContent = mensagem;

        } catch (erro) {
            if (versaoAtual !== versaoFinanceira) {
                return;
            }

            $('custosComponentes').innerHTML = '';
            $('insightsFinanceiros').innerHTML = '';
            $('statusFinanceiro').textContent =
                'Não foi possível atualizar os custos: ' + erro.message;
        }
    }

    // Mostra os valores calculados pelo Node.js, sem usar dados sintéticos.
    function exibirResultadoFinanceiro(resultado) {

        if (!resultado.componentes) {
            throw new Error('A API não retornou os custos por componente.');
        }

        let nomes = ['CPU', 'RAM', 'Disco', 'Rede'];
        let formatador = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
        let html = '';

        for (let i = 0; i < nomes.length; i++) {
            let nome = nomes[i];
            let componente = resultado.componentes[nome];

            if (!componente) {
                throw new Error('A API não retornou o custo de ' + nome + '.');
            }

            let custo = Number(componente.custo);
            let orcamento = Number(componente.orcamento);

            if (!Number.isFinite(custo) || !Number.isFinite(orcamento)) {
                throw new Error('A API retornou valores financeiros inválidos.');
            }

            let situacao = componente.situacao ||
                (custo > orcamento ? 'Acima do orçamento' : 'Dentro do orçamento');

            html += `
                <div class="item-financeiro">
                    <strong>${nome}</strong>
                    <p>Custo estimado: ${formatador.format(custo)}</p>
                    <p>Orçamento: ${formatador.format(orcamento)}</p>
                    <small>${escaparHtml(situacao)}</small>
                </div>
            `;
        }

        $('custosComponentes').innerHTML = html;

        let insights = Array.isArray(resultado.insights) ? resultado.insights : [];
        let insightsHtml = '';

        for (let i = 0; i < insights.length; i++) {
            let insight = insights[i];
            let texto = typeof insight === 'string'
                ? insight
                : (insight.mensagem || insight.descricao || 'Revisar custo estimado.');

            insightsHtml += `
                <div class="insight-financeiro">${escaparHtml(texto)}</div>
            `;
        }

        if (insights.length === 0) {
            insightsHtml = `
                <div class="insight-financeiro">
                    Nenhum componente ultrapassou o limite financeiro informado.
                </div>
            `;
        }

        $('insightsFinanceiros').innerHTML = insightsHtml;

        // Usa o cálculo do backend também no custo principal do painel.
        let custoTotal = Number(resultado.custoTotal);

        if (Number.isFinite(custoTotal)) {
            $('billingTotal').textContent = moedaReal(custoTotal);
            $('kpiCost').textContent = moedaReal(custoTotal);
            $('kpiCostNote').textContent =
                'Estimativa calculada pelo serviço financeiro Node.js';
        }

        // Mantém os indicadores do orçamento alinhados ao backend.
        let orcamentoTotal = Number(resultado.orcamentoTotal);
        let saldo = Number(resultado.saldo);

        if (Number.isFinite(orcamentoTotal) &&
            Number.isFinite(saldo) && orcamentoTotal > 0) {

            let percentual = custoTotal / orcamentoTotal * 100;
            $('orcamentoPercentual').textContent =
                numeroFormatado(percentual) + '%';
            $('orcamentoProgresso').value = Math.min(percentual, 100);
            $('orcamentoSaldo').textContent = saldo >= 0
                ? moedaReal(saldo) + ' disponíveis'
                : moedaReal(Math.abs(saldo)) + ' acima do limite';

            let situacao = 'Infraestrutura dentro do orçamento.';
            let cor = 'var(--mint)';

            if (percentual >= 100) {
                situacao = 'Atenção: orçamento excedido.';
                cor = 'var(--pink)';
            } else if (percentual >= 80) {
                situacao = 'Atenção: orçamento próximo do limite.';
                cor = 'var(--orange)';
            }

            $('orcamentoSituacao').textContent = situacao;
            $('orcamentoSituacao').style.color = cor;
        }
    }

    // Atualiza as tarifas da simulação visual com o JSON gerado pela AWS.
    async function carregarPrecosAws() {

        try {
            let resposta = await fetch('/gestor/precos');
            let precos = await resposta.json();

            if (!resposta.ok) {
                throw new Error(precos.mensagem || 'API de preços indisponível.');
            }

            let precoEc2 = Number(precos.instancia.usdPorHora);
            let precoEbs = Number(precos.armazenamento.usdPorGbMes);

            if (!Number.isFinite(precoEc2) || precoEc2 <= 0 ||
                !Number.isFinite(precoEbs) || precoEbs <= 0) {
                throw new Error('A API retornou tarifas inválidas.');
            }

            $('priceNode').value = precoEc2;
            $('priceNode').step = '0.0001';
            $('priceStorage').value = precoEbs;

            // As tarifas de EC2 e EBS vêm do catálogo, não do formulário.
            $('priceNode').readOnly = true;
            $('priceStorage').readOnly = true;
            tarifasAwsCarregadas = true;

            let texto = document.querySelector('.premissas p');
            if (texto) {
                texto.textContent =
                    'Tarifas EC2 (' + precos.instancia.tipo + ') e EBS (' +
                    precos.armazenamento.tipo + ') consultadas no catálogo AWS ' +
                    'para ' + precos.regiao + '. Rede e câmbio continuam como premissas. ' +
                    'A simulação não representa uma fatura.';
            }

            atualizarBilling();

        } catch (erro) {
            tarifasAwsCarregadas = false;
            console.warn('Não foi possível carregar tarifas AWS:', erro.message);

            let texto = document.querySelector('.premissas p');
            if (texto) {
                texto.textContent =
                    'Consulta às tarifas AWS indisponível. Os valores do ' +
                    'formulário são referências demonstrativas. ' +
                    'Rede e câmbio continuam sendo premissas.';
            }
        }
    }

    // ==========================================
    // 8. INSIGHTS GERENCIAIS
    // ==========================================

    function atualizarDecisoes() {

        let problemas = obterProblemas();

        let html = '';

        for (let i = 0; i < problemas.length; i++) {

            let problema = problemas[i];

            let regra = REGRAS[problema.key];

            let cor = 'var(--mint)';

            let jaAdicionada = false;

            if (problema.status === 'critico') {

                cor = 'var(--pink)';

            } else if (problema.status === 'atencao') {

                cor = 'var(--orange)';
            }

            // Verifica se já está no plano.

            for (let j = 0; j < ESTADO.acoes.length; j++) {

                if (ESTADO.acoes[j].key === problema.key) {

                    jaAdicionada = true;
                }
            }

            let textoBotao = '+ Adicionar ao plano';

            let desabilitado = '';

            if (jaAdicionada) {

                textoBotao = '✓ No plano de ação';

                desabilitado = 'disabled';
            }

            // Monta o cartão da recomendação.

            html += `
                <article
                    class="cartao decisao"
                    style="--status:${cor}"
                >

                    <span class="numero-decisao">
                        0${i + 1}
                    </span>

                    <div>

                        <div class="cabecalho-decisao">

                            <h3>
                                ${regra.titulo} · ${problema.key}
                            </h3>

                            <span class="etiqueta-decisao">
                                ${problema.status.toUpperCase()}
                            </span>

                        </div>

                        <p>${regra.explicacao}</p>

                        <div class="evidencia">

                            <b>Evidência:</b>

                            ${escaparHtml(problema.host.id)}

                            • ${problema.key} ${problema.value}%

                            • limite ${LIMITES[problema.key]}%.

                        </div>

                        <div class="recomendacao">

                            <span>DECISÃO ›</span>

                            <span style="color:#d8d8ec;font-weight:500">
                                ${regra.acao}
                            </span>

                        </div>

                        <button
                            type="button"
                            class="acao-inline"
                            data-add="${problema.key}"
                            ${desabilitado}
                        >
                            ${textoBotao}
                        </button>

                    </div>

                </article>
            `;
        }

        $('decisionList').innerHTML = html;
    }

    // ==========================================
    // 9. PLANO DE AÇÃO
    // ==========================================

    function salvarPlano() {

        try {

            localStorage.setItem(
                'streamguard:demo:actions-v2',
                JSON.stringify(ESTADO.acoes)
            );

        } catch (erro) {

            console.error(
                'Não foi possível salvar o plano:',
                erro
            );
        }
    }

    function carregarPlano() {

        try {

            let texto = localStorage.getItem(
                'streamguard:demo:actions-v2'
            );

            let dados = JSON.parse(texto || '[]');

            if (Array.isArray(dados)) {

                for (let i = 0; i < dados.length; i++) {

                    if (dados[i] && REGRAS[dados[i].key]) {

                        ESTADO.acoes.push({
                            key: dados[i].key
                        });
                    }
                }
            }

        } catch (erro) {

            ESTADO.acoes = [];
        }
    }

    function atualizarPlano() {

        let quantidade = ESTADO.acoes.length;

        if (quantidade === 1) {

            $('planCount').textContent = '1 item';

        } else {

            $('planCount').textContent =
                quantidade + ' itens';
        }

        if (quantidade === 0) {

            $('planList').innerHTML = `
                <li class="plano-vazio">
                    Selecione “Adicionar ao plano”
                    em uma das recomendações.
                </li>
            `;

            return;
        }

        let html = '';

        for (let i = 0; i < ESTADO.acoes.length; i++) {

            let componente = ESTADO.acoes[i].key;

            let regra = REGRAS[componente];

            html += `
                <li class="item-plano">

                    <div class="cabecalho-item-plano">

                        <strong>
                            ${componente} · ${regra.titulo}
                        </strong>

                        <button
                            type="button"
                            data-remove="${componente}"
                            aria-label="Remover ${componente}"
                        >
                            ×
                        </button>

                    </div>

                    <p>${regra.acao}</p>

                </li>
            `;
        }

        $('planList').innerHTML = html;
    }

    // ==========================================

    // ==========================================
    // SIMULADOR FINANCEIRO
    // ==========================================

    function valorCampo(id) {

        let valor = Number($(id).value);

        if (!Number.isFinite(valor) || valor < 0) {

            return 0;
        }

        return valor;
    }

    // Calcula a simulação visual com as premissas atuais.
    // A conferência por componente acontece no backend.

    function calcularCustos(
        quantidadeServidores,
        armazenamento,
        trafego
    ) {

        let horas = valorCampo('hours');

        let precoServidor = valorCampo('priceNode');

        let precoArmazenamento = valorCampo('priceStorage');

        let precoTrafego = valorCampo('priceTraffic');

        let cambio = valorCampo('fx');

        // Custo de computação.

        let computacao =
            quantidadeServidores *
            horas *
            precoServidor;

        // Custo de armazenamento.

        let disco =
            armazenamento *
            precoArmazenamento;

        // Custo de transferência.

        let rede =
            trafego *
            1024 *
            precoTrafego;

        // Soma dos custos.

        let totalDolar =
            computacao +
            disco +
            rede;

        let totalReal = totalDolar * cambio;

        return {
            nodes: computacao,
            storage: disco,
            traffic: rede,
            usd: totalDolar,
            brl: totalReal,
            fx: cambio
        };
    }

    // ==========================================
    // ORÇAMENTO E PREVISÃO FINANCEIRA
    // ==========================================

    function atualizarPlanejamento(
        simulacao,
        quantidadeServidores,
        armazenamento,
        trafego
    ) {

        let orcamento = valorCampo('orcamentoMensal');

        let crescimento = valorCampo('crescimentoMensal');

        // Limita o crescimento a 100%.
        crescimento = Math.min(crescimento, 100);

        let taxa = crescimento / 100;

        // ======================================
        // AVALIAÇÃO DO ORÇAMENTO
        // ======================================

        let percentual = 0;

        if (orcamento > 0) {
            percentual = simulacao.brl / orcamento * 100;
        }

        let saldo = orcamento - simulacao.brl;

        let situacao = '';
        let cor = 'var(--mint)';

        if (orcamento <= 0) {

            situacao = 'Defina um orçamento mensal.';

            cor = 'var(--muted)';

        } else if (percentual >= 100) {

            situacao = 'Atenção: orçamento excedido.';

            cor = 'var(--pink)';

        } else if (percentual >= 80) {

            situacao = 'Atenção: orçamento próximo do limite.';

            cor = 'var(--orange)';

        } else {

            situacao = 'Infraestrutura dentro do orçamento.';

        }

        $('orcamentoPercentual').textContent =
            orcamento > 0
                ? numeroFormatado(percentual) + '%'
                : '—';

        if (orcamento <= 0) {

            $('orcamentoSaldo').textContent = '—';

        } else if (saldo >= 0) {

            $('orcamentoSaldo').textContent =
                moedaReal(saldo) + ' disponíveis';

        } else {

            $('orcamentoSaldo').textContent =
                moedaReal(Math.abs(saldo)) + ' acima do limite';
        }

        $('orcamentoSituacao').textContent = situacao;

        $('orcamentoSituacao').style.color = cor;

        $('orcamentoProgresso').value =
            orcamento > 0
                ? Math.min(percentual, 100)
                : 0;

        // ======================================
        // PREVISÃO PARA TRÊS MESES
        // ======================================

        let previsoes = [];

        let armazenamentoPrevisto = armazenamento;

        let trafegoPrevisto = trafego;

        let html = '';

        for (let mes = 1; mes <= 3; mes++) {

            let custo = calcularCustos(
                quantidadeServidores,
                armazenamentoPrevisto,
                trafegoPrevisto
            );

            previsoes.push({
                mes: mes,
                custo: custo.brl
            });

            let aviso = '';

            if (orcamento > 0 && custo.brl > orcamento) {
                aviso = 'Acima do orçamento';
            }

            html += `
            <div class="mes-projetado">

                <span>Mês ${mes}</span>

                <strong>${moedaReal(custo.brl)}</strong>

                <small>${aviso}</small>

            </div>
        `;

            // Aplica o crescimento ao próximo mês.
            armazenamentoPrevisto =
                armazenamentoPrevisto * (1 + taxa);

            trafegoPrevisto =
                trafegoPrevisto * (1 + taxa);
        }

        $('previsaoMensal').innerHTML = html;

        // Mantém os resultados disponíveis
        // para exportações e futuras integrações.

        ESTADO.custos.planejamento = {
            orcamento: orcamento,
            crescimento: crescimento,
            percentual: percentual,
            saldo: saldo,
            situacao: situacao,
            previsoes: previsoes
        };
    }

    function atualizarBilling() {

        let extra = valorCampo('extraNodes');

        let armazenamento = valorCampo('storage');

        let trafego = valorCampo('egress');

        // Calcula a configuração de referência.

        let base = calcularCustos(
            BASE_CUSTOS.servidores,
            BASE_CUSTOS.armazenamento,
            BASE_CUSTOS.trafego
        );

        // Calcula a configuração simulada.

        let simulacao = calcularCustos(
            BASE_CUSTOS.servidores + extra,
            armazenamento,
            trafego
        );

        let diferenca = simulacao.brl - base.brl;

        let percentual = 0;

        if (base.brl > 0) {

            percentual = diferenca / base.brl * 100;
        }

        ESTADO.custos = {
            base: base,
            scenario: simulacao,
            delta: diferenca,
            extra: extra,
            storage: armazenamento,
            egress: trafego
        };

        // Atualiza os campos do simulador.

        let textoNos = '';

        if (extra === 1) {

            textoNos = '+1 nó';

        } else {

            textoNos = '+' + extra + ' nós';
        }

        $('extraNodesText').textContent = textoNos;

        $('storageText').textContent =
            numeroFormatado(armazenamento) + ' GB';

        $('egressText').textContent =
            numeroFormatado(trafego) + ' TB/mês';

        $('billingTotal').textContent =
            moedaReal(simulacao.brl);

        $('billingUsd').textContent =
            moedaDolar(simulacao.usd) +
            ' • câmbio assumido R$ ' +
            numeroFormatado(simulacao.fx);

        $('billingBase').textContent =
            moedaReal(base.brl);

        let sinal = '+';

        if (diferenca < 0) {

            sinal = '−';
        }

        $('billingDelta').textContent =
            sinal + moedaReal(Math.abs(diferenca));

        $('billingDeltaPct').textContent =
            sinal +
            numeroFormatado(Math.abs(percentual)) +
            '% em relação à referência';

        if (diferenca > 0) {

            $('billingDelta').style.color = 'var(--orange)';

        } else {

            $('billingDelta').style.color = 'var(--mint)';
        }

        $('kpiCost').textContent =
            moedaReal(simulacao.brl);

        $('kpiCostNote').textContent =
            extra +
            ' nó(s) adicional(is) • projeção simulada';

        // ======================================
        // COMPOSIÇÃO DOS CUSTOS
        // ======================================

        let categorias = [
            {
                nome: 'Computação (instâncias)',
                chave: 'nodes',
                cor: CORES.CPU
            },
            {
                nome: 'Disco / armazenamento',
                chave: 'storage',
                cor: CORES.Disco
            },
            {
                nome: 'Saída de dados / rede',
                chave: 'traffic',
                cor: CORES.Rede
            }
        ];

        let barraHtml = '';
        let linhasHtml = '';

        for (let i = 0; i < categorias.length; i++) {

            let categoria = categorias[i];

            let custo = simulacao[categoria.chave];

            let largura = 0;

            if (simulacao.usd > 0) {

                largura = custo / simulacao.usd * 100;
            }

            barraHtml += `
                <span
                    class="segmento-custo"
                    style="
                        width:${largura}%;
                        background:${categoria.cor}
                    "
                    title="${categoria.nome}: ${moedaReal(custo * simulacao.fx)}"
                ></span>
            `;

            linhasHtml += `
                <div class="linha-custo">

                    <span>
                        <i style="background:${categoria.cor}"></i>
                        ${categoria.nome}
                    </span>

                    <strong>
                        ${moedaReal(custo * simulacao.fx)}
                    </strong>

                </div>
            `;
        }

        $('billingStack').innerHTML = barraHtml;

        $('billingRows').innerHTML = linhasHtml;

        // ======================================
        // INTERPRETAÇÃO FINANCEIRA
        // ======================================

        if (diferenca > 0) {

            $('billingEvaluation').innerHTML = `
                <strong>Impacto da decisão:</strong>

                a configuração aumenta o custo em

                ${moedaReal(diferenca)}/mês

                (${numeroFormatado(percentual)}%).

                Avalie se o ganho esperado de capacidade
                justifica o gasto.
            `;

        } else if (diferenca < 0) {

            $('billingEvaluation').innerHTML = `
                <strong>Impacto da decisão:</strong>

                redução estimada de

                ${moedaReal(Math.abs(diferenca))}/mês.

                Verifique a viabilidade técnica antes
                de reduzir recursos.
            `;

        } else {

            $('billingEvaluation').innerHTML = `
                <strong>Referência:</strong>

                a configuração possui o mesmo
                custo estimado da base.
            `;
        }

        // ======================================
        // COMPARAÇÃO DE CENÁRIOS
        // ======================================

        let quantidadeExpansao = Math.min(6, extra + 2);

        let opcoes = [
            {
                quantidade: 0,
                nome: 'Manter nós atuais'
            },
            {
                quantidade: extra,
                nome: 'Sua escolha (+' + extra + ')'
            },
            {
                quantidade: quantidadeExpansao,
                nome: 'Expandir (+' + quantidadeExpansao + ')'
            }
        ];

        let valores = [];

        for (let i = 0; i < opcoes.length; i++) {

            let valor = calcularCustos(
                BASE_CUSTOS.servidores + opcoes[i].quantidade,
                armazenamento,
                trafego
            ).brl;

            valores.push(valor);
        }

        let maior = Math.max(...valores) * 1.06;

        let cores = [
            'var(--blue)',
            'var(--mint)',
            'var(--orange)'
        ];

        let grafico = '';

        for (let i = 0; i < opcoes.length; i++) {

            let altura = 0;

            if (maior > 0) {

                altura = valores[i] / maior * 100;
            }

            grafico += `
                <div class="coluna-projecao">

                    <label>${opcoes[i].nome}</label>

                    <strong>
                        ${moedaReal(valores[i])}
                    </strong>

                    <div class="area-barra-projecao">

                        <div
                            class="barra-projecao"
                            style="
                                height:${altura.toFixed(1)}%;
                                background:${cores[i]}
                            "
                        ></div>

                    </div>

                    <small>
                        ${BASE_CUSTOS.servidores + opcoes[i].quantidade}
                        nós • mesmos volumes
                    </small>

                </div>
            `;
        }

        $('forecastBars').innerHTML = grafico;

        // Atualiza o orçamento e a previsão mensal.
        atualizarPlanejamento(
            simulacao,
            BASE_CUSTOS.servidores + extra,
            armazenamento,
            trafego
        );
        agendarSimulacaoFinanceira();

    }

    // ==========================================
    // 15. EXPORTAÇÃO CSV
    // ==========================================

    // Exportação demonstrativa pelo navegador.
    // FUTURO: relatórios PDF gerados pelo Java.

    function exportarCsv() {

        let linhas = [
            ['STREAMGUARD - RELATÓRIO DEMONSTRATIVO'],

            ['Cenário', ESTADO.cenario],

            ['Tipo', 'Dados sintéticos / demonstrativos'],

            [],

            [
                'Servidor',
                'Função',
                'CPU (%)',
                'RAM (%)',
                'Disco (%)',
                'Rede (% de 1 Gbit/s)',
                'Prioridade'
            ]
        ];

        // Adiciona os servidores.

        for (let i = 0; i < ESTADO.servidores.length; i++) {

            let servidor = ESTADO.servidores[i];

            linhas.push([
                servidor.id,
                servidor.role,
                servidor.CPU,
                servidor.RAM,
                servidor.Disco,
                servidor.Rede,
                NOMES_STATUS[servidor.risk.status]
            ]);
        }

        linhas.push([]);

        // Adiciona os custos.

        linhas.push([
            'CUSTOS ESTIMADOS - VALORES HIPOTÉTICOS'
        ]);

        linhas.push([
            'Referência (R$)',
            ESTADO.custos.base.brl.toFixed(2)
        ]);

        linhas.push([
            'Simulação (R$)',
            ESTADO.custos.scenario.brl.toFixed(2)
        ]);

        linhas.push([
            'Variação (R$)',
            ESTADO.custos.delta.toFixed(2)
        ]);

        linhas.push([
            'Nós extras',
            ESTADO.custos.extra
        ]);

        linhas.push([
            'Armazenamento (GB)',
            ESTADO.custos.storage
        ]);

        linhas.push([
            'Tráfego de saída (TB)',
            ESTADO.custos.egress
        ]);

        linhas.push([]);

        linhas.push(['PLANO DE AÇÃO']);

        for (let i = 0; i < ESTADO.acoes.length; i++) {

            let componente = ESTADO.acoes[i].key;

            linhas.push([
                componente,
                REGRAS[componente].acao
            ]);
        }

        // Converte as linhas para texto CSV.

        let texto = '\ufeff';

        for (let i = 0; i < linhas.length; i++) {

            let linha = linhas[i];

            let campos = [];

            for (let j = 0; j < linha.length; j++) {

                let campo = String(linha[j]);

                campo = campo.replaceAll('"', '""');

                campos.push('"' + campo + '"');
            }

            texto += campos.join(';') + '\r\n';
        }

        // Gera o arquivo.

        let arquivo = new Blob(
            [texto],
            {
                type: 'text/csv;charset=utf-8'
            }
        );

        let url = URL.createObjectURL(arquivo);

        let link = document.createElement('a');

        link.href = url;

        link.download = 'streamguard_relatorio_demonstrativo.csv';

        document.body.appendChild(link);

        link.click();

        link.remove();

        setTimeout(function () {

            URL.revokeObjectURL(url);

        }, 1500);

        mostrarToast(
            'Relatório CSV demonstrativo gerado.'
        );
    }

    // ==========================================
    // 16. MENSAGENS E MODAIS
    // ==========================================

    function mostrarToast(mensagem) {

        $('toast').textContent = mensagem;

        $('toast').hidden = false;

        setTimeout(function () {

            $('toast').hidden = true;

        }, 3200);
    }

    function abrirModal(titulo, mensagem) {

        $('dialogTitle').textContent = titulo;

        $('dialogText').textContent = mensagem;

        $('overlay').hidden = false;

        $('closeDialog').focus();
    }

    // ==========================================
    // 17. MENU COMPARTILHADO DO STREAMGUARD
    // ==========================================

    function integrarMenu() {

        // let sidebar = document.querySelector(
        //     '[data-shell="sidebar"]'
        // );

        // if (!sidebar) {
        //     return;
        // }

        // let dashboard = sidebar.querySelector(
        //     '[data-menu="dashboard"]'
        // );

        // if (!dashboard) {
        //     return;
        // }

        // if (sidebar.querySelector('[data-menu="dashIndividual"]')) {
        //     return;
        // }

        // dashboard.classList.remove('ativo');

        // dashboard.removeAttribute('aria-current');

        // let link = document.createElement('a');

        // link.href = './painel_gestor_insight.html';

        // link.className = 'menu-item ativo';

        // link.dataset.menu = 'dashIndividual';

        // link.setAttribute('aria-current', 'page');

        // link.innerHTML = `
        //     <svg class="sg-ic" aria-hidden="true">
        //         <use href="#sg-grid"/>
        //     </svg>

        //     <span>Inteligência Gerencial</span>
        // `;

        // dashboard.insertAdjacentElement('afterend', link);

        // let selo = document.querySelector('.selo-online');

        // if (selo) {

        //     selo.textContent = '● Dados demonstrativos';
        // }
    }

    // ==========================================
    // 18. NAVEGAÇÃO POR ABAS
    // ==========================================


    const ABAS = {

        executivo: [
            'resumo',
            'billing'
        ],

        decisoes: [
            'decisoes',
            'relatorios'
        ]

    };

    function mostrarAba(nome, rolar) {

        if (!ABAS[nome]) {
            return;
        }

        let nomes = Object.keys(ABAS);

        // Mostra ou oculta as seções.

        for (let i = 0; i < nomes.length; i++) {

            let aba = nomes[i];

            for (let j = 0; j < ABAS[aba].length; j++) {

                let secao = $(ABAS[aba][j]);

                if (secao) {

                    secao.hidden = aba !== nome;
                }
            }
        }

        // Atualiza os botões.

        let botoes = document.querySelectorAll('.aba-gerencial');

        for (let i = 0; i < botoes.length; i++) {

            let ativo = botoes[i].dataset.tab === nome;

            botoes[i].classList.toggle('ativo', ativo);

            botoes[i].setAttribute(
                'aria-pressed',
                String(ativo)
            );
        }

        // Move a visualização até a navegação.

        if (rolar) {

            document.querySelector('.navegacao-gerencial').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    function prepararNavegacao() {

        let menu = document.querySelector('.navegacao-gerencial');

        if (!menu) {
            return;
        }

        let primeiraAba = menu.querySelector('[data-tab]');

        // Caso o HTML ainda utilize links por âncora,
        // mantém o funcionamento original.

        if (!primeiraAba) {
            return;
        }

        menu.addEventListener('click', function (evento) {

            let botao = evento.target.closest('[data-tab]');

            if (botao) {

                mostrarAba(botao.dataset.tab, true);
            }
        });

        // Atalho para a seção de decisões.

        let atalho = document.querySelector(
            '.aviso a[href="#decisoes"]'
        );

        if (atalho) {

            atalho.addEventListener('click', function (evento) {

                evento.preventDefault();

                mostrarAba('decisoes', true);
            });
        }

        // Define a aba inicial.

        let parametros = new URLSearchParams(
            window.location.search
        );

        let abaInicial = parametros.get('aba');

        if (!ABAS[abaInicial]) {

            abaInicial = 'executivo';
        }

        mostrarAba(abaInicial, false);
    }

    // ==========================================
    // 19. ATUALIZAÇÃO GERAL DA DASHBOARD
    // ==========================================

    function atualizarDashboard() {

        ESTADO.cenario = $('cenario').value;

        ESTADO.servidores = prepararServidores();

        atualizarResumo();

        atualizarDecisoes();

        atualizarPlano();

        atualizarBilling();
    }

    // ==========================================
    // 20. EVENTOS DA DASHBOARD
    // ==========================================

    function configurarEventos() {

        // Filtros gerais.

        $('cenario').addEventListener(
            'change',
            atualizarDashboard
        );

        $('filtroPeriodoGestor').addEventListener('click', function (evento) {

            let botao = evento.target.closest('[data-periodo]');

            if (!botao || !$('filtroPeriodoGestor').contains(botao)) {
                return;
            }

            let periodo = botao.dataset.periodo;

            if (periodo !== '24h' && periodo !== '7d' && periodo !== '30d') {
                return;
            }

            periodoGestor = periodo;

            let botoes = $('filtroPeriodoGestor').querySelectorAll('[data-periodo]');

            for (let i = 0; i < botoes.length; i++) {
                let ativo = botoes[i].dataset.periodo === periodoGestor;
                botoes[i].classList.toggle('ativo', ativo);
                botoes[i].setAttribute('aria-pressed', String(ativo));
            }

            carregarPeriodoGestor();
        });

        // ======================================
        // PLANO DE AÇÃO
        // ======================================

        $('decisionList').addEventListener('click', function (evento) {

            let botao = evento.target.closest('[data-add]');

            if (!botao) {
                return;
            }

            let existe = false;

            for (let i = 0; i < ESTADO.acoes.length; i++) {

                if (ESTADO.acoes[i].key === botao.dataset.add) {

                    existe = true;
                }
            }

            if (!existe) {

                ESTADO.acoes.push({
                    key: botao.dataset.add
                });

                salvarPlano();

                atualizarPlano();

                atualizarDecisoes();

                mostrarToast(
                    'Ação adicionada ao plano gerencial.'
                );
            }
        });

        $('planList').addEventListener('click', function (evento) {

            let botao = evento.target.closest('[data-remove]');

            if (!botao) {
                return;
            }

            let novasAcoes = [];

            for (let i = 0; i < ESTADO.acoes.length; i++) {

                if (ESTADO.acoes[i].key !== botao.dataset.remove) {

                    novasAcoes.push(ESTADO.acoes[i]);
                }
            }

            ESTADO.acoes = novasAcoes;

            salvarPlano();

            atualizarPlano();

            atualizarDecisoes();
        });

        // ======================================
        // SIMULADOR DE BILLING
        // ======================================

        let campos = [
            'extraNodes',
            'storage',
            'egress',
            'priceNode',
            'hours',
            'priceStorage',
            'priceTraffic',
            'fx'
        ];

        for (let i = 0; i < campos.length; i++) {

            $(campos[i]).addEventListener(
                'input',
                atualizarBilling
            );
        }


        // ==========================================
        // EVENTOS DO PLANEJAMENTO FINANCEIRO
        // ==========================================
        let camposPlanejamento = [
            'orcamentoMensal',
            'crescimentoMensal',
            'pctCpu',
            'pctRam',
            'pctDisco',
            'pctRede',
            'rateioCpu'
        ];

        for (let i = 0; i < camposPlanejamento.length; i++) {
            $(camposPlanejamento[i]).addEventListener('input', function () {

                // Mantém compatibilidade com as configurações já salvas.
                try {
                    localStorage.setItem(
                        'streamguard_orcamento', $('orcamentoMensal').value
                    );
                    localStorage.setItem(
                        'streamguard_crescimento', $('crescimentoMensal').value
                    );
                } catch (erro) {
                    console.error('Não foi possível salvar o planejamento:', erro);
                }

                salvarOrcamentoLocal();
                atualizarBilling();
            });
        }

        // ======================================
        // EXPORTAÇÃO DE RELATÓRIOS
        // ======================================

        $('buttonCsv').addEventListener(
            'click',
            exportarCsv
        );

        let botoesPdf = [
            'buttonPrintTop',
            'buttonPrint'
        ];

        for (let i = 0; i < botoesPdf.length; i++) {

            $(botoesPdf[i]).addEventListener('click', function () {

                mostrarToast(
                    'Na janela de impressão, escolha “Salvar como PDF”.'
                );

                setTimeout(function () {

                    window.print();

                }, 200);
            });
        }

        // ======================================
        // EXPLICAÇÃO DOS INDICADORES
        // ======================================

        $('buttonMethod').addEventListener('click', function () {

            let mensagem =
                'Este é um PROTÓTIPO com dados simulados.\n\n' +

                'Os indicadores destacam riscos e decisões prioritárias.\n' +

                'O cenário é demonstrativo, não um histórico real da ETL.\n' +

                'A classificação compara utilização e limites definidos na demonstração.\n' +

                'Rede considera um enlace hipotético de 1 Gbit/s.\n' +

                'EC2 e EBS usam o catálogo AWS quando disponível; rede e câmbio são premissas.\n' +

                'CPU e RAM não determinam sozinhas a fatura de nuvem.';

            abrirModal(
                'Como interpretar este painel',
                mensagem
            );
        });

        // ======================================
        // FECHAMENTO DOS MODAIS
        // ======================================

        $('closeDialog').addEventListener('click', function () {

            $('overlay').hidden = true;
        });

        $('overlay').addEventListener('click', function (evento) {

            if (evento.target === $('overlay')) {

                $('overlay').hidden = true;
            }
        });

        document.addEventListener('keydown', function (evento) {

            if (evento.key === 'Escape') {

                $('overlay').hidden = true;
            }
        });
    }

    function carregarPlanejamento() {

        // Valores antigos do simulador continuam sendo aceitos.
        try {
            let orcamento = localStorage.getItem('streamguard_orcamento');
            let crescimento = localStorage.getItem('streamguard_crescimento');

            if (orcamento !== null && Number.isFinite(Number(orcamento)) &&
                Number(orcamento) >= 0) {
                $('orcamentoMensal').value = orcamento;
            }

            if (crescimento !== null && Number.isFinite(Number(crescimento)) &&
                Number(crescimento) >= 0 && Number(crescimento) <= 100) {
                $('crescimentoMensal').value = crescimento;
            }

            // Configuração financeira separada por empresa no navegador.
            let texto = localStorage.getItem(chaveOrcamentoGerencial());

            if (!texto) {
                return;
            }

            let configuracao = JSON.parse(texto);
            let distribuicao = configuracao.distribuicaoOrcamento || {};

            let campos = [
                ['orcamentoMensal', configuracao.orcamentoMensal],
                ['crescimentoMensal', configuracao.crescimentoMensal],
                ['rateioCpu', configuracao.rateioCpu],
                ['pctCpu', distribuicao.CPU],
                ['pctRam', distribuicao.RAM],
                ['pctDisco', distribuicao.Disco],
                ['pctRede', distribuicao.Rede]
            ];

            for (let i = 0; i < campos.length; i++) {
                let id = campos[i][0];
                let valor = campos[i][1];

                if (valor === undefined || valor === null || valor === '') {
                    continue;
                }

                let numero = Number(valor);

                if (Number.isFinite(numero) && numero >= 0 &&
                    (id === 'orcamentoMensal' || numero <= 100)) {
                    $(id).value = numero;
                }
            }

        } catch (erro) {
            console.error('Não foi possível recuperar o planejamento:', erro);
        }
    }

    // ==========================================
    // CONSULTA DE HISTÓRICO GOLD POR PERÍODO
    // ==========================================

    let periodoGestor = '24h';
    let requisicaoPeriodo = 0;

    async function carregarPeriodoGestor() {

        let requisicao = ++requisicaoPeriodo;

        $('statusPeriodoGestor').textContent =
            'Consultando histórico Gold de ' + periodoGestor + '...';

        try {
            let resposta = await fetch(
                '/gestor/resumo?periodo=' + encodeURIComponent(periodoGestor) +
                '&idUsuario=' + encodeURIComponent(sessionStorage.getItem('ID_USUARIO') || '')
            );

            let dados = {};

            try {
                dados = await resposta.json();
            } catch (erro) {
                // A resposta pode ser HTML caso a rota não esteja registrada.
            }

            if (requisicao !== requisicaoPeriodo) {
                return;
            }

            if (resposta.status === 401 || resposta.status === 403) {
                $('statusPeriodoGestor').textContent =
                    'Entre com um usuário ativo para consultar o histórico Gold. ' +
                    'Os indicadores operacionais continuam demonstrativos.';
                return;
            }

            if (resposta.status === 404) {
                $('statusPeriodoGestor').textContent =
                    'A rota de histórico Gold ainda não está disponível no backend.';
                return;
            }

            if (!resposta.ok) {
                throw new Error(
                    dados.mensagem || dados.erro || 'Falha ao consultar o histórico.'
                );
            }

            let total = Number(dados.totalRegistros);

            if (!Number.isFinite(total)) {
                throw new Error('O retorno do histórico não contém totalRegistros.');
            }

        
            let servidoresGold = prepararServidoresGold(dados.metricas || []);


            // ==========================================
// TESTE DE PICOS HISTÓRICOS
// ==========================================

console.table(servidoresGold.map(function (servidor) {

    return {
        servidor: servidor.id,

        cpuMedia: servidor.CPU,
        cpuPico: servidor.picos.CPU,
        janelasCpu: servidor.janelasAcimaLimite.CPU,

        ramMedia: servidor.RAM,
        ramPico: servidor.picos.RAM,
        janelasRam: servidor.janelasAcimaLimite.RAM,

        discoMedia: servidor.Disco,
        discoPico: servidor.picos.Disco,
        janelasDisco: servidor.janelasAcimaLimite.Disco
    };

}));
if (servidoresGold.length > 0) {

    // Utiliza os servidores reais encontrados no Gold.
    ESTADO.servidores = servidoresGold;

    // Impede que o cenário demonstrativo altere os dados reais.
    $('cenario').disabled = true;


    // Oculta o seletor de cenários demonstrativos.
$('cenario').closest('.campo').style.display = 'none';

    // Atualiza os indicadores da dashboard.
    atualizarResumo();

    // Atualiza as recomendações com os dados reais.
    atualizarDecisoes();

    // Atualiza a identificação da origem dos dados.
    document.querySelector('.etiqueta-demo').textContent =
        'INDICADORES OPERACIONAIS · DADOS GOLD';

} else {

    // Não apresenta os indicadores demonstrativos como se fossem reais.
    ESTADO.servidores = [];

    $('cenario').disabled = true;

    $('kpiRisk').textContent = '—';
    $('kpiRiskNote').textContent = 'Sem dados no período';

    $('kpiComp').textContent = '—';

    $('kpiMain').textContent = '—';
    $('kpiMainNote').textContent = 'Sem métricas disponíveis';

    $('noticeTitle').textContent = 'Sem dados operacionais';
    $('noticeDesc').textContent =
        'Não foram encontradas métricas completas neste período.';

    $('decisionList').innerHTML =
        '<p>Não há dados suficientes para gerar recomendações.</p>';

    document.querySelector('.etiqueta-demo').textContent =
        'SEM DADOS OPERACIONAIS NO PERÍODO';
}

$('statusPeriodoGestor').textContent =
    servidoresGold.length === 0
        ? 'Não há métricas completas disponíveis em ' + periodoGestor + '.'
        : total + ' registros Gold encontrados em ' + periodoGestor +
          '. Exibindo médias históricas de ' +
          servidoresGold.length + ' servidores reais.';
        } catch (erro) {
            if (requisicao !== requisicaoPeriodo) {
                return;
            }

            $('statusPeriodoGestor').textContent =
                'Histórico indisponível: ' + erro.message;
        }
    }

    // ==========================================
    // 21. INICIALIZAÇÃO
    // ==========================================

    carregarPlano();

    carregarPlanejamento();

    atualizarDashboard();

    configurarEventos();

    carregarPrecosAws();

    carregarPeriodoGestor();

    integrarMenu();

    prepararNavegacao();

})();
