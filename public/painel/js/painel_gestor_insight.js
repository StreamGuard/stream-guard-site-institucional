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

            // CPU, RAM e disco são necessários para a análise.
            if (
                cpu === null ||
                ram === null ||
                disco === null
            ) {
                console.warn('Métricas incompletas para o servidor:', id);
                continue;
            }

            // A rede só pode ser calculada quando existe capacidade informada.
            let rede = null;

            if (
                envioRede !== null &&
                capacidadeRede !== null &&
                capacidadeRede > 0
            ) {
                rede = envioRede / capacidadeRede * 100;
            }

            let servidor = {
                id: 'srv-' + id,
                role: 'Servidor monitorado',

                // Médias históricas.
                CPU: Math.round(cpu),
                RAM: Math.round(ram),
                Disco: Math.round(disco),
                Rede: rede === null ? null : Math.round(rede),

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



    // Identifica os principais problemas.



    // ==========================================
    // 7. INDICADORES EXECUTIVOS
    // ==========================================

    function atualizarResumo() {

        // Considera somente servidores com métricas Gold.
        let servidoresGold = ESTADO.servidores.filter(function (servidor) {
            return servidor.picos && servidor.janelasAcimaLimite;
        });

        if (servidoresGold.length === 0) {

            $('kpiRisk').textContent = '—';
            $('kpiRiskNote').textContent = 'Sem dados Gold disponíveis';

            $('kpiComp').textContent = '—';
            $('kpiCompNote').textContent = 'Aguardando análise operacional';

            $('noticeTitle').textContent = 'Aguardando histórico operacional';
            $('noticeDesc').textContent =
                'Os riscos serão analisados quando os dados Gold estiverem disponíveis.';

            return;
        }

        let servidoresComAlertas = 0;

        let riscoComputacao = false;
        let riscoArmazenamento = false;

        let componentes = ['CPU', 'RAM', 'Disco'];

        for (let servidor of servidoresGold) {

            let servidorComRisco = false;

            for (let componente of componentes) {

                let media = servidor[componente];

                let janelas = servidor.janelasAcimaLimite[componente];

                let limite = LIMITES[componente];

                // Verifica se houve risco no período.
                if (janelas > 0 || media >= limite) {

                    servidorComRisco = true;

                    if (componente === 'CPU' || componente === 'RAM') {
                        riscoComputacao = true;
                    }

                    if (componente === 'Disco') {
                        riscoArmazenamento = true;
                    }
                }
            }

            if (servidorComRisco) {
                servidoresComAlertas++;
            }
        }

        // Quantidade de categorias de investimento a avaliar.
        let alternativas = 0;

        if (riscoComputacao) {
            alternativas++;
        }

        if (riscoArmazenamento) {
            alternativas++;
        }

        // KPI: servidores com alertas históricos.
        $('kpiRisk').innerHTML =
            servidoresComAlertas +
            '<small> / ' +
            servidoresGold.length +
            '</small>';

        $('kpiRiskNote').textContent =
            'Médias ou picos acima dos limites no período';

        // KPI: alternativas de investimento.
        $('kpiComp').textContent = alternativas;

        $('kpiCompNote').textContent =
            'Categorias de investimento para avaliar';

        // Resumo gerencial.
        if (alternativas > 0) {

            $('noticeTitle').textContent =
                alternativas + ' alternativa(s) de investimento para análise';

            $('noticeDesc').textContent =
                servidoresComAlertas +
                ' servidor(es) apresentaram alertas históricos. ' +
                'Consulte as decisões sugeridas e avalie o impacto financeiro.';

        } else {

            $('noticeTitle').textContent =
                'Nenhum risco acima dos limites identificado';

            $('noticeDesc').textContent =
                'As métricas disponíveis não indicaram ultrapassagens ' +
                'dos limites de CPU, RAM ou disco no período.';
        }
    }

    // ==========================================
    // 7. INTEGRAÇÃO FINANCEIRA COM O BACKEND
    // ==========================================

    let temporizadorFinanceiro;
    let versaoFinanceira = 0;
    let tarifasAwsCarregadas = false;
    let comparacoesFinanceiras = null;

    let mensagemComparacoesFinanceiras =
        'Calculando impacto financeiro da alternativa...';

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

    // ==========================================
    // TRATAMENTO DE PARÂMETROS FINANCEIROS
    // ==========================================

    function mostrarErroParametrosFinanceiros(mensagem) {

        // Informa o problema encontrado.
        $('statusFinanceiro').textContent = mensagem;

        // Limpa os indicadores principais.
        $('kpiCost').textContent = '—';
        $('kpiCostNote').textContent = 'Simulação indisponível';

        $('kpiMain').textContent = '—';
        $('kpiMainNote').textContent = 'Corrija os parâmetros financeiros';

        // Limpa os custos.
        $('billingTotal').textContent = '—';
        $('billingUsd').textContent = '—';
        $('billingBase').textContent = '—';
        $('billingDelta').textContent = '—';

        $('billingDeltaPct').textContent =
            'Comparação indisponível';

        $('billingEvaluation').textContent =
            'Corrija os parâmetros para calcular o impacto financeiro.';

        // Limpa a composição financeira.
        $('billingStack').innerHTML = '';

        $('billingRows').textContent =
            'Composição indisponível. Corrija os parâmetros.';

        $('custosComponentes').innerHTML = '';
        $('insightsFinanceiros').innerHTML = '';

        // Limpa os indicadores do orçamento.
        $('orcamentoPercentual').textContent = '—';
        $('orcamentoSaldo').textContent = '—';

        $('orcamentoSituacao').textContent =
            'Corrija os parâmetros financeiros.';

        $('orcamentoSituacao').style.color = 'var(--muted)';
        $('orcamentoProgresso').value = 0;

        // Limpa as projeções.
        $('previsaoMensal').textContent =
            'Previsão indisponível. Corrija os parâmetros.';

        $('forecastBars').textContent =
            'Comparação indisponível. Corrija os parâmetros.';

        // Impede que as recomendações fiquem em carregamento.
        mensagemComparacoesFinanceiras =
            'Corrija os parâmetros financeiros para comparar as alternativas.';

        comparacoesFinanceiras = null;

        atualizarDecisoes();
    }

    // Evita fazer uma requisição a cada tecla digitada.
    function agendarSimulacaoFinanceira() {

        versaoFinanceira++;

        if (ESTADO.custos) {
            ESTADO.custos.api = null;
        }

        // Invalida as comparações anteriores.
        comparacoesFinanceiras = null;

        mensagemComparacoesFinanceiras =
            'Calculando impacto financeiro da alternativa...';

        atualizarDecisoes();

        let versaoAtual = versaoFinanceira;

        clearTimeout(temporizadorFinanceiro);

        let configuracao = obterConfiguracaoFinanceira();
        let distribuicao = configuracao.distribuicaoOrcamento;
        let soma = distribuicao.CPU + distribuicao.RAM +
            distribuicao.Disco + distribuicao.Rede;

        if (Math.abs(soma - 100) > 0.001) {

            mostrarErroParametrosFinanceiros(
                'A distribuição precisa somar 100%. Soma atual: ' +
                numeroFormatado(soma) + '%.'
            );

            return;
        }

        if (configuracao.crescimentoMensal > 100 ||
            configuracao.rateioCpu > 100) {

            mostrarErroParametrosFinanceiros(
                'O crescimento mensal e o rateio da CPU devem estar entre 0% e 100%.'
            );

            return;
        }

        temporizadorFinanceiro = setTimeout(function () {
            enviarSimulacaoFinanceira(versaoAtual);
        }, 350);
    }

    // ==========================================
    // COMPARAÇÃO COM A CONFIGURAÇÃO DE REFERÊNCIA
    // ==========================================

    async function atualizarReferenciaFinanceira(dados, resultado, versaoAtual) {

        // Configuração inicial utilizada como referência.
        let dadosReferencia = {
            ...dados,
            servidores: BASE_CUSTOS.servidores,
            armazenamentoGb: BASE_CUSTOS.armazenamento,
            trafegoSaidaGb: BASE_CUSTOS.trafego * 1024
        };

        try {

            let resposta = await fetch('/gestor/simular', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosReferencia)
            });

            let referencia = await resposta.json();

            // Ignora resultados de simulações anteriores.
            if (versaoAtual !== versaoFinanceira) {
                return;
            }

            if (!resposta.ok) {
                throw new Error(
                    referencia.mensagem || 'Erro ao calcular referência.'
                );
            }

            let custoReferencia = Number(referencia.custoTotal);

            let custoAtual = Number(resultado.custoTotal);

            if (
                !Number.isFinite(custoReferencia) ||
                !Number.isFinite(custoAtual) ||
                custoReferencia < 0 ||
                custoAtual < 0
            ) {
                throw new Error('Valores financeiros inválidos.');
            }

            // Calcula a diferença entre os dois resultados.
            let diferenca = custoAtual - custoReferencia;

            let percentual = 0;

            if (custoReferencia > 0) {
                percentual = diferenca / custoReferencia * 100;
            }

            // Atualiza a referência.
            $('billingBase').textContent =
                moedaReal(custoReferencia);

            let sinal = '';

            if (diferenca > 0) {
                sinal = '+';
            } else if (diferenca < 0) {
                sinal = '−';
            }

            // Atualiza a variação.
            $('billingDelta').textContent =
                sinal + moedaReal(Math.abs(diferenca));

            if (custoReferencia > 0) {

                $('billingDeltaPct').textContent =
                    sinal +
                    numeroFormatado(Math.abs(percentual)) +
                    '% em relação à referência';

            } else {

                $('billingDeltaPct').textContent =
                    'Sem referência para calcular o percentual';
            }

            // Atualiza a interpretação financeira.
            if (diferenca > 0) {

                $('billingDelta').style.color = 'var(--orange)';

                $('billingEvaluation').innerHTML = `
                <strong>Impacto financeiro:</strong>
                a configuração atual custa
                ${moedaReal(diferenca)} a mais por mês
                que a configuração de referência.
            `;

            } else if (diferenca < 0) {

                $('billingDelta').style.color = 'var(--mint)';

                $('billingEvaluation').innerHTML = `
                <strong>Impacto financeiro:</strong>
                a configuração atual apresenta
                uma redução estimada de
                ${moedaReal(Math.abs(diferenca))} por mês.
            `;

            } else {

                $('billingDelta').style.color = 'var(--mint)';

                $('billingEvaluation').innerHTML = `
                <strong>Referência financeira:</strong>
                a configuração atual possui o mesmo
                custo estimado da referência.
            `;
            }

        } catch (erro) {

            if (versaoAtual !== versaoFinanceira) {
                return;
            }

            $('billingBase').textContent = '—';

            $('billingDelta').textContent = '—';

            $('billingDeltaPct').textContent =
                'Comparação indisponível';

            $('billingEvaluation').textContent =
                'Não foi possível comparar as configurações.';

            console.error('Erro na referência financeira:', erro.message);
        }
    }

    // ==========================================
    // GRÁFICO DE EXPANSÃO CALCULADO PELO NODE.JS
    // ==========================================

    async function atualizarGraficoExpansao(dados, resultadoAtual, versaoAtual) {

        let extra = valorCampo('extraNodes');

        let expansao = Math.min(6, extra + 2);

        let nomeExpansao = 'Expandir (+' + expansao + ')';

        if (expansao === extra) {
            nomeExpansao = 'Limite do simulador (+' + expansao + ')';
        }

        let opcoes = [
            {
                quantidade: 0,
                nome: 'Manter nós atuais',
                cor: 'var(--blue)'
            },
            {
                quantidade: extra,
                nome: 'Sua escolha (+' + extra + ')',
                cor: 'var(--mint)'
            },
            {
                quantidade: expansao,
                nome: nomeExpansao,
                cor: 'var(--orange)'
            }
        ];

        let valores = [];

        try {

            for (let opcao of opcoes) {

                let custo;

                // Reutiliza o cálculo atual quando possível.
                if (opcao.quantidade === extra) {

                    custo = Number(resultadoAtual.custoTotal);

                } else {

                    // Simula outra quantidade de servidores.
                    let dadosCenario = {
                        ...dados,
                        servidores: BASE_CUSTOS.servidores + opcao.quantidade
                    };

                    let resposta = await fetch('/gestor/simular', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(dadosCenario)
                    });

                    let resultado = await resposta.json();

                    // Ignora respostas de simulações antigas.
                    if (versaoAtual !== versaoFinanceira) {
                        return;
                    }

                    if (!resposta.ok) {
                        throw new Error(
                            resultado.mensagem || 'Falha ao calcular cenário.'
                        );
                    }

                    custo = Number(resultado.custoTotal);
                }

                if (!Number.isFinite(custo) || custo < 0) {
                    throw new Error('Custo de cenário inválido.');
                }

                valores.push(custo);
            }

            if (versaoAtual !== versaoFinanceira) {
                return;
            }

            // Identifica o maior custo para dimensionar as barras.
            let maior = Math.max(...valores) * 1.06;

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
                                height: ${altura.toFixed(1)}%;
                                background: ${opcoes[i].cor};
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

            // Apresenta os cenários calculados pelo backend.
            $('forecastBars').innerHTML = grafico;

        } catch (erro) {

            if (versaoAtual !== versaoFinanceira) {
                return;
            }

            $('forecastBars').textContent =
                'Comparação de cenários indisponível.';

            console.error(
                'Erro no gráfico de expansão:',
                erro.message
            );
        }
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

            // ==========================================
            // COMPARAÇÃO FINANCEIRA DAS DECISÕES
            // ==========================================

            async function compararCustosDasDecisoes(dadosBase, resultadoBase, versaoAtual) {

                let alternativas = [
                    {
                        chave: 'CPU',
                        descricao: 'Adicionar 1 instância computacional'
                    },
                    {
                        chave: 'Disco',
                        descricao: 'Adicionar 100 GB de armazenamento'
                    }
                ];

                let resultados = {};

                try {

                    for (let alternativa of alternativas) {

                        // Copia os dados da simulação atual.
                        let dados = {
                            ...dadosBase,
                            distribuicaoOrcamento: {
                                ...dadosBase.distribuicaoOrcamento
                            }
                        };

                        // Modifica somente o recurso da alternativa.
                        if (alternativa.chave === 'CPU') {

                            dados.servidores += 1;

                        } else if (alternativa.chave === 'Disco') {

                            dados.armazenamentoGb += 100;
                        }

                        // Reutiliza o serviço financeiro Node.js.
                        let resposta = await fetch('/gestor/simular', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(dados)
                        });

                        let resultado = await resposta.json();

                        // Evita utilizar respostas de simulações antigas.
                        if (versaoAtual !== versaoFinanceira) {
                            return;
                        }

                        if (!resposta.ok) {
                            throw new Error(
                                resultado.mensagem ||
                                'Não foi possível calcular a alternativa.'
                            );
                        }

                        let custoAtual = Number(resultadoBase.custoTotal);

                        let custoNovo = Number(resultado.custoTotal);

                        let saldo = Number(resultado.saldo);

                        let orcamento = Number(resultado.orcamentoTotal);

                        if (
                            !Number.isFinite(custoAtual) ||
                            !Number.isFinite(custoNovo) ||
                            !Number.isFinite(saldo) ||
                            !Number.isFinite(orcamento)
                        ) {
                            throw new Error('A API retornou valores financeiros inválidos.');
                        }

                        resultados[alternativa.chave] = {
                            descricao: alternativa.descricao,
                            custoAtual: custoAtual,
                            custoNovo: custoNovo,
                            diferenca: custoNovo - custoAtual,
                            saldo: saldo,
                            orcamento: orcamento
                        };
                    }

                    // Confirma que os resultados ainda são atuais.
                    if (versaoAtual !== versaoFinanceira) {
                        return;
                    }

                    // Guarda os resultados.
                    comparacoesFinanceiras = resultados;

                    // Atualiza os cartões gerenciais.
                    atualizarDecisoes();

                } catch (erro) {

                    if (versaoAtual !== versaoFinanceira) {
                        return;
                    }

                    comparacoesFinanceiras = null;

                    mensagemComparacoesFinanceiras =
                        'Não foi possível calcular o impacto financeiro das alternativas.';

                    atualizarDecisoes();

                    console.error(
                        'Erro nas comparações financeiras:',
                        erro.message
                    );
                }
            }

            exibirResultadoFinanceiro(resultado);

            ESTADO.custos.api = resultado;

            atualizarReferenciaFinanceira(dados, resultado, versaoAtual);

            // Atualiza o gráfico de expansão utilizando o backend.
            atualizarGraficoExpansao(dados, resultado, versaoAtual);

            // As comparações ainda estão sendo calculadas.
            comparacoesFinanceiras = null;

            mensagemComparacoesFinanceiras =
                'Calculando impacto financeiro da alternativa...';

            atualizarDecisoes();

            // Compara os investimentos utilizando o backend.
            compararCustosDasDecisoes(dados, resultado, versaoAtual);
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
            console.error('Erro na simulação financeira:', erro);

            // Limpa os indicadores financeiros.


            $('forecastBars').textContent =
                'Comparação de cenários indisponível.';

            $('kpiCost').textContent = '—';

            $('kpiCostNote').textContent =
                'Simulação financeira indisponível';

            $('billingTotal').textContent = '—';

            $('billingUsd').textContent = '—';

            $('billingBase').textContent = '—';

            $('billingDelta').textContent = '—';

            $('billingDeltaPct').textContent =
                'Comparação indisponível';

            $('billingEvaluation').textContent =
                'Não foi possível calcular a simulação.';

            // Limpa os indicadores do orçamento.

            $('orcamentoPercentual').textContent = '—';

            $('orcamentoSaldo').textContent = '—';

            $('orcamentoSituacao').textContent =
                'Não foi possível calcular o orçamento.';

            $('orcamentoSituacao').style.color = 'var(--muted)';

            $('orcamentoProgresso').value = 0;

            // Limpa a composição financeira.

            $('billingStack').innerHTML = '';

            $('billingRows').textContent =
                'Composição financeira indisponível.';

            $('kpiMain').textContent = '—';

            $('kpiMainNote').textContent =
                'Não foi possível calcular o saldo';

            $('custosComponentes').innerHTML = '';
            $('insightsFinanceiros').innerHTML = '';
            $('previsaoMensal').innerHTML = `
    <p class="descricao-orcamento">
        Previsão indisponível.
        Verifique os parâmetros da simulação.
    </p>
`;
            $('statusFinanceiro').textContent =
                'Não foi possível atualizar os custos: ' + erro.message;
        }
    }

    // ==========================================
    // COMPOSIÇÃO FINANCEIRA PELO BACKEND
    // ==========================================

    function atualizarComposicaoFinanceira(resultado) {

        let componentes = resultado.componentes;

        // O backend divide o custo EC2 entre CPU e RAM.
        // Para o gráfico, reunimos os dois valores.

        let computacao =
            Number(componentes.CPU.custo) +
            Number(componentes.RAM.custo);

        let armazenamento = Number(componentes.Disco.custo);

        let rede = Number(componentes.Rede.custo);

        let total = Number(resultado.custoTotal);

        // Verifica se os valores recebidos são válidos.

        if (
            !Number.isFinite(computacao) ||
            !Number.isFinite(armazenamento) ||
            !Number.isFinite(rede) ||
            !Number.isFinite(total) ||
            total < 0
        ) {
            throw new Error('Valores da composição financeira inválidos.');
        }

        // Categorias exibidas no gráfico.

        let categorias = [
            {
                nome: 'Computação (EC2)',
                custo: computacao,
                cor: CORES.CPU
            },
            {
                nome: 'Disco / armazenamento',
                custo: armazenamento,
                cor: CORES.Disco
            },
            {
                nome: 'Saída de dados / rede',
                custo: rede,
                cor: CORES.Rede
            }
        ];

        let barraHtml = '';
        let linhasHtml = '';

        for (let categoria of categorias) {

            let percentual = 0;

            if (total > 0) {
                percentual = categoria.custo / total * 100;
            }

            // Monta o segmento da barra.

            barraHtml += `
            <span
                class="segmento-custo"
                style="
                    width: ${percentual}%;
                    background: ${categoria.cor};
                "
                title="${categoria.nome}: ${moedaReal(categoria.custo)}"
            ></span>
        `;

            // Monta a descrição do componente.

            linhasHtml += `
            <div class="linha-custo">

                <span>
                    <i style="background: ${categoria.cor}"></i>
                    ${categoria.nome}
                </span>

                <strong>
                    ${moedaReal(categoria.custo)}
                </strong>

            </div>
        `;
        }

        // Exibe os valores calculados pelo Node.js.

        $('billingStack').innerHTML = barraHtml;

        $('billingRows').innerHTML = linhasHtml;
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

        atualizarComposicaoFinanceira(resultado);

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

            // Converte para dólares usando o câmbio da simulação.
            let cambio = valorCampo('fx');

            if (cambio > 0) {

                $('billingUsd').textContent =
                    moedaDolar(custoTotal / cambio) +
                    ' • câmbio assumido R$ ' +
                    numeroFormatado(cambio);

            } else {

                $('billingUsd').textContent = 'Câmbio inválido';
            }
        }

        // Mantém os indicadores do orçamento alinhados ao backend.
        let orcamentoTotal = Number(resultado.orcamentoTotal);
        let saldo = Number(resultado.saldo);

        // Atualiza o KPI de saldo financeiro.
        if (
            Number.isFinite(orcamentoTotal) &&
            Number.isFinite(saldo) &&
            orcamentoTotal > 0
        ) {

            $('kpiMain').textContent = moedaReal(saldo);

            if (saldo >= 0) {

                $('kpiMainNote').textContent =
                    'Disponível no orçamento informado';

            } else {

                $('kpiMainNote').textContent =
                    'Orçamento estimado ultrapassado';
            }

        } else {

            $('kpiMain').textContent = '—';

            $('kpiMainNote').textContent =
                'Defina um orçamento mensal válido';
        }

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
        else {

            $('orcamentoPercentual').textContent = '—';

            $('orcamentoSaldo').textContent = '—';

            $('orcamentoSituacao').textContent =
                'Defina um orçamento mensal válido.';

            $('orcamentoSituacao').style.color = 'var(--muted)';

            $('orcamentoProgresso').value = 0;
        }

        // ==========================================
        // PREVISÃO FINANCEIRA CALCULADA PELO NODE.JS
        // ==========================================

        if (!Array.isArray(resultado.previsoes) ||
            resultado.previsoes.length !== 3) {

            throw new Error('A API não retornou as três previsões.');
        }

        let htmlPrevisao = '';

        for (let previsao of resultado.previsoes) {

            let mes = Number(previsao.mes);

            let custo = Number(previsao.custo);

            if (
                ![1, 2, 3].includes(mes) ||
                !Number.isFinite(custo) ||
                custo < 0
            ) {
                throw new Error('A API retornou uma previsão inválida.');
            }

            let aviso = '';

            if (orcamentoTotal > 0 && custo > orcamentoTotal) {

                aviso = 'Acima do orçamento';
            }

            htmlPrevisao += `
        <div class="mes-projetado">

            <span>Mês ${mes}</span>

            <strong>${moedaReal(custo)}</strong>

            <small>${aviso}</small>

        </div>
    `;
        }

        // Atualiza a interface com os valores do backend.
        $('previsaoMensal').innerHTML = htmlPrevisao;

        // Mantém os dados disponíveis para futuras integrações.
        if (ESTADO.custos && ESTADO.custos.planejamento) {

            ESTADO.custos.planejamento.previsoes = resultado.previsoes;
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

        let lista = $('decisionList');

        // Considera somente servidores que vieram do Gold.
        let servidores = ESTADO.servidores.filter(function (servidor) {
            return servidor.picos && servidor.janelasAcimaLimite;
        });

        if (servidores.length === 0) {
            lista.innerHTML = '<p>Aguardando dados do histórico Gold.</p>';
            return;
        }

        // Agrupa os problemas por possíveis decisões financeiras.
        let grupos = [
            {
                titulo: 'Capacidade computacional',
                componentes: ['CPU', 'RAM'],
                chavePlano: 'CPU',
                acao: 'Investigar os picos e avaliar se a redistribuição de carga é suficiente antes de simular uma expansão.'
            },
            {
                titulo: 'Capacidade de armazenamento',
                componentes: ['Disco'],
                chavePlano: 'Disco',
                acao: 'Analisar a ocupação e o crescimento do armazenamento antes de simular uma ampliação.'
            }
        ];

        let html = '';
        let quantidadeDecisoes = 0;

        for (let grupo of grupos) {

            let evidencias = [];

            for (let servidor of servidores) {

                for (let componente of grupo.componentes) {

                    let media = servidor[componente];
                    let pico = servidor.picos[componente];
                    let janelas = servidor.janelasAcimaLimite[componente];

                    // Exibe apenas componentes com risco identificado.
                    if (janelas > 0 || media >= LIMITES[componente]) {

                        let texto =
                            servidor.id + ' · ' + componente +
                            ': média ' + numeroFormatado(media) + '%';

                        if (pico !== null && Number.isFinite(pico)) {
                            texto +=
                                ', pico ' + numeroFormatado(pico) + '%';
                        }

                        if (janelas > 0) {
                            texto +=
                                ' · ' + janelas +
                                ' janela(s) com ultrapassagem do limite';
                        }

                        evidencias.push(escaparHtml(texto));
                    }
                }
            }

            // Não cria recomendações sem evidências.
            if (evidencias.length === 0) {
                continue;
            }

            quantidadeDecisoes++;


            // ==========================================
            // IMPACTO FINANCEIRO DA DECISÃO
            // ==========================================

            let comparacao = comparacoesFinanceiras
                ? comparacoesFinanceiras[grupo.chavePlano]
                : null;

            let textoFinanceiro = mensagemComparacoesFinanceiras;

            if (comparacao) {

                textoFinanceiro =
                    'Alternativa: ' + comparacao.descricao + '. ' +

                    'Custo da configuração atual: ' +
                    moedaReal(comparacao.custoAtual) + '/mês. ' +

                    'Custo com a alternativa: ' +
                    moedaReal(comparacao.custoNovo) + '/mês. ' +

                    'Impacto mensal: +' +
                    moedaReal(comparacao.diferenca) + '. ';

                if (comparacao.orcamento <= 0) {

                    textoFinanceiro +=
                        'Defina um orçamento para avaliar a viabilidade financeira.';

                } else if (comparacao.saldo >= 0) {

                    textoFinanceiro +=
                        'A alternativa permanece dentro do orçamento. ' +
                        'Saldo estimado: ' +
                        moedaReal(comparacao.saldo) + '.';

                } else {

                    textoFinanceiro +=
                        'A alternativa ultrapassa o orçamento em ' +
                        moedaReal(Math.abs(comparacao.saldo)) + '.';
                }
            }


            let noPlano = ESTADO.acoes.some(function (acao) {
                return acao.key === grupo.chavePlano;
            });

            html += `
            <article class="cartao decisao"
                     style="--status:var(--orange)">

                <span class="numero-decisao">
                    0${quantidadeDecisoes}
                </span>

                <div>

                    <div class="cabecalho-decisao">

                        <h3>${grupo.titulo}</h3>

                        <span class="etiqueta-decisao">
                            AVALIAR INVESTIMENTO
                        </span>

                    </div>

                    <p>
                        <strong>Evidências do histórico:</strong>
                        <br>
                        ${evidencias.join('<br>')}
                    </p>

                    <div class="evidencia">
                        <strong>Referência financeira:</strong>
                        <p>${escaparHtml(textoFinanceiro)}</p>
                    </div>

                    <div class="recomendacao">

                        <span>PRÓXIMA DECISÃO ›</span>

                        <span>${grupo.acao}</span>

                    </div>

                    <p>
                        <small>
                            O impacto financeiro é uma estimativa baseada
                            na configuração atual e nas tarifas utilizadas
                            pelo simulador. A expansão não garante que
                            os problemas operacionais sejam resolvidos.
                        </small>
                    </p>

                    <button
                        type="button"
                        class="acao-inline"
                        data-add="${grupo.chavePlano}"
                        ${noPlano ? 'disabled' : ''}
                    >
                        ${noPlano
                    ? '✓ No plano de ação'
                    : '+ Adicionar ao plano'}
                    </button>

                </div>

            </article>
        `;
        }

        if (quantidadeDecisoes === 0) {
            html = `
            <article class="cartao">
                <h3>Sem investimentos prioritários identificados</h3>
                <p>
                    As métricas analisadas não apresentaram
                    ultrapassagens dos limites considerados.
                </p>
            </article>
        `;
        }

        lista.innerHTML = html;
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

    // ==========================================
    // ORÇAMENTO E PREVISÃO FINANCEIRA
    // ==========================================

    function atualizarPlanejamento() {

        // Aguarda os valores calculados pelo backend.

        $('orcamentoPercentual').textContent = '—';

        $('orcamentoSaldo').textContent = '—';

        $('orcamentoSituacao').textContent =
            'Atualizando análise financeira...';

        $('orcamentoSituacao').style.color = 'var(--muted)';

        $('orcamentoProgresso').value = 0;

        $('previsaoMensal').innerHTML = `
        <p class="descricao-orcamento">
            Atualizando previsão financeira...
        </p>
    `;

        ESTADO.custos.planejamento = {
            previsoes: []
        };
    }

    function atualizarBilling() {

        let extra = valorCampo('extraNodes');
        let armazenamento = valorCampo('storage');
        let trafego = valorCampo('egress');

        // Guarda os parâmetros escolhidos pelo gestor.
        ESTADO.custos = {
            extra: extra,
            storage: armazenamento,
            egress: trafego,
            api: null,
            planejamento: {
                previsoes: []
            }
        };

        // Atualiza os textos dos controles.

        if (extra === 1) {
            $('extraNodesText').textContent = '+1 nó';
        } else {
            $('extraNodesText').textContent = '+' + extra + ' nós';
        }

        $('storageText').textContent =
            numeroFormatado(armazenamento) + ' GB';

        $('egressText').textContent =
            numeroFormatado(trafego) + ' TB/mês';

        // Aguarda os resultados do Node.js.

        $('billingTotal').textContent = '—';

        $('billingUsd').textContent =
            'Calculando valor em dólares...';

        $('billingBase').textContent = '—';

        $('billingDelta').textContent = '—';

        $('billingDeltaPct').textContent =
            'Calculando variação...';

        $('billingEvaluation').textContent =
            'Calculando impacto financeiro...';

        $('kpiCost').textContent = '—';

        $('kpiCostNote').textContent =
            'Atualizando estimativa...';

        // Limpa as visualizações anteriores.

        $('billingStack').innerHTML = '';

        $('billingRows').textContent =
            'Atualizando composição dos custos...';

        $('forecastBars').textContent =
            'Calculando comparação de cenários...';

        // Prepara o planejamento financeiro.
        atualizarPlanejamento();

        $('kpiMain').textContent = '—';

        $('kpiMainNote').textContent =
            'Atualizando análise do orçamento...';

        // Solicita os cálculos ao backend.
        agendarSimulacaoFinanceira();
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

        // Inicia o painel sem dados operacionais fictícios.
        ESTADO.servidores = [];

        atualizarResumo();

        atualizarDecisoes();

        atualizarPlano();

        atualizarBilling();
    }



    function prepararDadosRelatorio() {

        let financeiro = ESTADO.custos?.api;

        if (!financeiro) {
            throw new Error(
                'Aguarde a conclusão da simulação financeira.'
            );
        }

        let servidores = ESTADO.servidores.filter(function (servidor) {

            return servidor.picos && servidor.janelasAcimaLimite;
        });

        if (servidores.length === 0) {
            throw new Error(
                'Não existem dados Gold disponíveis para o período.'
            );
        }

        let servidoresAtencao = 0;

        let componentes = ['CPU', 'RAM', 'Disco'];

        for (let servidor of servidores) {

            let servidorComRisco = false;

            for (let componente of componentes) {

                if (
                    servidor.janelasAcimaLimite[componente] > 0 ||
                    servidor[componente] >= LIMITES[componente]
                ) {
                    servidorComRisco = true;
                }
            }

            if (servidorComRisco) {
                servidoresAtencao++;
            }
        }

        let previsoes = [];

        for (let previsao of financeiro.previsoes) {

            previsoes.push({
                mes: 'Mês ' + previsao.mes,
                custo: previsao.custo
            });
        }

        let recomendacoes = [];

        for (let insight of financeiro.insights) {
            recomendacoes.push(insight);
        }

        for (let acao of ESTADO.acoes) {

            if (REGRAS[acao.key]) {

                recomendacoes.push(
                    REGRAS[acao.key].acao
                );
            }
        }

        if (recomendacoes.length === 0) {

            recomendacoes.push(
                'Continuar acompanhando os indicadores operacionais e financeiros.'
            );
        }

        let dados = {

            dataGeracao: new Date().toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo'
            }),

            cenario: 'Histórico Gold - ' + periodoGestor +
                ' | Simulação financeira AWS',

            totalServidores: servidores.length,

            servidoresAtencao: servidoresAtencao,

            custoEstimado: financeiro.custoTotal,

            orcamentoMensal: financeiro.orcamentoTotal,

            previsoes: previsoes,

            recomendacoes: recomendacoes
        };

        return dados;
    }
        async function baixarRelatorio() {

            let botao = $('buttonRelatorio');

            botao.disabled = true;

            botao.textContent = 'Gerando relatório...';

            try {

                let dados = prepararDadosRelatorio();

                let resposta = await fetch('/gestor/relatorio', {

                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify(dados)
                });

                if (!resposta.ok) {

                    let erro = await resposta.json();

                    throw new Error(
                        erro.mensagem || 'Erro ao gerar relatório.'
                    );
                }

                let arquivo = await resposta.blob();

                let url = URL.createObjectURL(arquivo);

                let link = document.createElement('a');

                link.href = url;

                link.download = 'relatorio-gerencial.pdf';

                document.body.appendChild(link);

                link.click();

                link.remove();

                setTimeout(function () {
                    URL.revokeObjectURL(url);
                }, 1000);

                mostrarToast('Relatório gerado com sucesso!');

            } catch (erro) {

                console.error(erro);

                mostrarToast(erro.message);

            } finally {

                botao.disabled = false;

                botao.textContent = 'Gerar relatório executivo';
            }
        
    }
    // EVENTOS 


    function configurarEventos() {


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
        // IMPRESSÃO DA DASHBOARD
        // ======================================


        $('buttonRelatorio').addEventListener(
            'click',
            baixarRelatorio
        );

        $('buttonPrint').addEventListener('click', function () {

            mostrarToast(
                'Na janela de impressão, escolha "Salvar como PDF".'
            );

            setTimeout(function () {
                window.print();
            }, 200);

        });

        // ======================================
        // EXPLICAÇÃO DOS INDICADORES
        // ======================================

        $('buttonMethod').addEventListener('click', function () {

            let mensagem =
                'Os indicadores operacionais utilizam dados históricos do Data Lake Gold.\n\n' +

                'As médias representam a utilização dos recursos durante o período selecionado.\n\n' +

                'Os picos indicam os maiores valores registrados nas janelas analisadas.\n\n' +

                'As janelas com limites ultrapassados não representam necessariamente incidentes individuais.\n\n' +

                'Os custos são estimativas calculadas pelo serviço financeiro Node.js, utilizando tarifas AWS e premissas configuradas.\n\n' +

                'As alternativas de investimento são simulações. Uma expansão não garante a resolução dos problemas identificados.';

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

        // Limpa os dados operacionais do período anterior.
        ESTADO.servidores = [];

        atualizarResumo();

        atualizarDecisoes();

        // Oculta os controles demonstrativos.
        $('cenario').disabled = true;

        $('cenario').closest('.campo').style.display = 'none';

        // Informa que os dados reais estão sendo consultados.
        document.querySelector('#resumo .etiqueta-demo').textContent =
            'CONSULTANDO HISTÓRICO GOLD';

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
                $('kpiCompNote').textContent = 'Sem dados operacionais';

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
