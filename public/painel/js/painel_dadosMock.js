// Dados simulados das telas "Clientes" e "Data Lake".
//
// Simulam o JSON que o backend vai entregar (montado pelo job a partir do bucket S3 e do banco).
// Cada bloco é a resposta de uma rota:
//   DADOS_MOCK.clientes  ->  GET /insights/clientes
//   DADOS_MOCK.dataLake  ->  GET /insights/data-lake
// As datas são geradas a partir de "agora" para os "há X min" fazerem sentido a qualquer hora.

const DADOS_MOCK = (() => {
    const AGORA = Date.now();
    const MIN = 60000;
    const DIA = 86400000;
    const DIAS_HISTORICO = 92;

    const minutosAtras = (m) => new Date(AGORA - m * MIN).toISOString();
    const diasAtras = (d) => new Date(AGORA - d * DIA).toISOString();
    const diaAtras = (d) => diasAtras(d).slice(0, 10); // "2026-11-11"

    // Números "aleatórios" com semente fixa: os dados não mudam a cada abertura da tela.
    function criarSorteio(semente) {
        let s = semente;
        return () => (s = (s * 16807) % 2147483647) / 2147483647;
    }
    const sorteio = criarSorteio(20261111);

    const soma = (lista) => lista.reduce((total, n) => total + n, 0);
    const slug = (texto) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, "-");

    // ---------- Empresas (vêm do banco) ----------
    const EMPRESAS = [
        { id: 1, nome: "Nimbus TV", meses: 14, usuarios: { usuario: 31, gerente: 8, admin: 3 }, servidores: 7, alertas_7d: 9 },
        { id: 2, nome: "Aurora Play", meses: 12, usuarios: { usuario: 23, gerente: 6, admin: 2 }, servidores: 6, alertas_7d: 11 },
        { id: 3, nome: "Vértice Live", meses: 11, usuarios: { usuario: 20, gerente: 5, admin: 2 }, servidores: 5, alertas_7d: 1 },
        { id: 4, nome: "Pulso Esportes", meses: 9, usuarios: { usuario: 19, gerente: 4, admin: 1 }, servidores: 8, alertas_7d: 21 },
        { id: 5, nome: "Estúdio Prisma", meses: 8, usuarios: { usuario: 15, gerente: 3, admin: 1 }, servidores: 4, alertas_7d: 1 },
        { id: 6, nome: "Onda Sul", meses: 7, usuarios: { usuario: 12, gerente: 3, admin: 1 }, servidores: 3, alertas_7d: 1 },
        { id: 7, nome: "Cinema Norte", meses: 6, usuarios: { usuario: 10, gerente: 3, admin: 1 }, servidores: 4, alertas_7d: 0 },
        { id: 8, nome: "Faísca Games", meses: 5, usuarios: { usuario: 9, gerente: 2, admin: 1 }, servidores: 3, alertas_7d: 9 },
        { id: 9, nome: "Rádio Orla", meses: 4, usuarios: { usuario: 6, gerente: 2, admin: 1 }, servidores: 2, alertas_7d: 2 },
        { id: 10, nome: "Lume Educação", meses: 3, usuarios: { usuario: 6, gerente: 1, admin: 1 }, servidores: 2, alertas_7d: 1 },
        { id: 11, nome: "Tela Aberta", meses: 2, usuarios: { usuario: 4, gerente: 1, admin: 1 }, servidores: 2, alertas_7d: 0 },
        { id: 12, nome: "Casa do Podcast", meses: 1, usuarios: { usuario: 2, gerente: 1, admin: 1 }, servidores: 1, alertas_7d: 0 },
    ];

    // Servidores fora do normal: minutos sem enviar lote e cobertura (% das janelas de 5 min recebidas).
    const AJUSTES_SERVIDOR = {
        "faisca-games-02": { semLoteMin: 95, cobertura: 71 },
        "aurora-play-04": { semLoteMin: 40, cobertura: 84 },
        "tela-aberta-01": { cobertura: 88.5 },
        "casa-do-podcast-01": { semLoteMin: 6200, cobertura: 0 },
    };

    // Servidores com muitas linhas rejeitadas: desde quantos dias, taxa de rejeição e motivo.
    const PROBLEMAS_QUALIDADE = {
        "faisca-games-02": { desdeDias: 20, taxa: 0.06, motivo: "Cabeçalho incompatível" },
        "tela-aberta-01": { desdeDias: DIAS_HISTORICO, taxa: 0.032, motivo: "Valor fora do intervalo" },
        "aurora-play-04": { desdeDias: 35, taxa: 0.021, motivo: "Timestamp inválido" },
        "pulso-esportes-03": { desdeDias: 12, taxa: 0.014, motivo: "Quantidade de campos diferente do cabeçalho" },
    };

    // ---------- Servidores ----------
    const servidoresBase = [];
    EMPRESAS.forEach((empresa) => {
        for (let n = 1; n <= empresa.servidores; n++) {
            const id = `${slug(empresa.nome)}-0${n}`;
            const ajuste = AJUSTES_SERVIDOR[id] || {};
            servidoresBase.push({
                id,
                empresa_id: empresa.id,
                ultimo_lote_em: minutosAtras(ajuste.semLoteMin ?? 1 + Math.floor(sorteio() * 4)),
                cobertura_pct: ajuste.cobertura ?? +(96 + sorteio() * 4).toFixed(1),
            });
        }
    });

    // ---------- Bloco "clientes" ----------
    const clientes = {
        gerado_em: minutosAtras(1),
        empresas: EMPRESAS.map((empresa) => ({
            id: empresa.id,
            nome: empresa.nome,
            criada_em: diasAtras(Math.max(empresa.meses * 30 - 10, 12)),
            usuarios: empresa.usuarios,
            alertas_7d: empresa.alertas_7d,
            servidores: servidoresBase
                .filter((s) => s.empresa_id === empresa.id)
                .map(({ id, ultimo_lote_em, cobertura_pct }) => ({ id, ultimo_lote_em, cobertura_pct })),
        })),
        data_lake: {
            bronze_gb: 18.4,
            silver_gb: 9.1,
            gold_gb: 0.6,
            crescimento_gb_semana: 1.4,
            ultimo_gold_em: minutosAtras(3),
        },
    };

    // ---------- Bloco "dataLake" ----------
    const BRONZE_GB = 18.4;
    const SILVER_GB = 9.1;
    const GOLD_GB = 0.6;
    const CRESCIMENTO_SEMANA_GB = 1.4;

    // GB que chegaram ao Bronze em cada dia (do mais antigo ao mais recente).
    // Os últimos 7 dias somam o crescimento semanal e o total fecha com o volume do Bronze.
    let adicionados = Array.from({ length: DIAS_HISTORICO }, (_, i) => (1 + 0.05 * i / DIAS_HISTORICO) * (0.85 + sorteio() * 0.3));
    const somaUltimaSemana = soma(adicionados.slice(-7));
    const somaResto = soma(adicionados.slice(0, -7));
    adicionados = adicionados.map((gb, i) => i >= DIAS_HISTORICO - 7
        ? gb * CRESCIMENTO_SEMANA_GB / somaUltimaSemana
        : gb * (BRONZE_GB - CRESCIMENTO_SEMANA_GB) / somaResto);
    const crescimentoBronze = adicionados.map((gb, i) => ({
        dia: diaAtras(DIAS_HISTORICO - 1 - i),
        gb_adicionados: +gb.toFixed(3),
    }));

    // Linhas recebidas e rejeitadas por dia, para cada servidor (índice 0 = dia mais antigo).
    function linhasPorDia(servidor) {
        const semLoteDias = new Date(AGORA) - new Date(servidor.ultimo_lote_em) > 2 * DIA
            ? Math.ceil((AGORA - new Date(servidor.ultimo_lote_em)) / DIA) : 0;
        const problema = PROBLEMAS_QUALIDADE[servidor.id];
        return Array.from({ length: DIAS_HISTORICO }, (_, i) => {
            const diasAtrasDoDia = DIAS_HISTORICO - 1 - i;
            if (diasAtrasDoDia < semLoteDias) return { recebidas: 0, rejeitadas: 0 };
            const recebidas = Math.round(35000 + sorteio() * 25000);
            const taxa = problema && diasAtrasDoDia < problema.desdeDias
                ? problema.taxa * (0.7 + sorteio() * 0.6)
                : 0.002 + sorteio() * 0.004;
            return { recebidas, rejeitadas: Math.round(recebidas * taxa) };
        });
    }

    // Peso de cada servidor no volume do lake (servidor sem dado quase não ocupa espaço).
    const pesos = servidoresBase.map((s) => (s.cobertura_pct === 0 ? 0.05 : 0.4 + sorteio() * 1.2));
    const somaPesos = soma(pesos);
    const totalPorDia = Array.from({ length: DIAS_HISTORICO }, () => ({ recebidas: 0, rejeitadas: 0 }));

    const servidoresLake = servidoresBase.map((s, i) => {
        const fracao = pesos[i] / somaPesos;
        const dias = linhasPorDia(s);
        dias.forEach((d, n) => {
            totalPorDia[n].recebidas += d.recebidas;
            totalPorDia[n].rejeitadas += d.rejeitadas;
        });
        const somaUltimos = (qtd, campo) => soma(dias.slice(-qtd).map((d) => d[campo]));
        const rejeicoes = {};
        [7, 30, 90].forEach((qtd) => {
            rejeicoes[qtd] = { linhas_recebidas: somaUltimos(qtd, "recebidas"), linhas_rejeitadas: somaUltimos(qtd, "rejeitadas") };
        });
        return {
            id: s.id,
            empresa_id: s.empresa_id,
            bronze_gb: +(BRONZE_GB * fracao).toFixed(3),
            silver_gb: +(SILVER_GB * fracao).toFixed(3),
            gold_gb: +(GOLD_GB * fracao).toFixed(3),
            ultimo_lote_em: s.ultimo_lote_em,
            cobertura_pct: s.cobertura_pct,
            motivo_principal_rejeicao: PROBLEMAS_QUALIDADE[s.id]?.motivo ?? "Registro duplicado",
            rejeicoes_por_periodo: rejeicoes, // chave = últimos N dias
        };
    });

    // Últimas execuções do ETL, uma a cada 5 minutos (a décima ainda não terminou de rodar na hora do teste).
    const execucoes = Array.from({ length: 10 }, (_, i) => {
        const falhou = i === 6;
        const validas = falhou ? 0 : Math.round(9000 + sorteio() * 4000);
        const taxa = i === 2 ? 0.043 : 0.003 + sorteio() * 0.01;
        const inicio = new Date(AGORA - (3 + i * 5) * MIN);
        const carimbo = inicio.toISOString().slice(0, 16).replace(/[-:T]/g, "");
        return {
            id: `exec-${carimbo.slice(0, 8)}-${carimbo.slice(8)}`,
            inicio: inicio.toISOString(),
            duracao_s: 18 + Math.floor(sorteio() * 22),
            lotes: 3 + Math.floor(sorteio() * 7),
            linhas_validas: validas,
            linhas_rejeitadas: falhou ? 0 : Math.round(validas * taxa),
            situacao: falhou ? "falhou" : "concluida",
            observacao: falhou ? "Falha ao ler silver/atual; reprocessada na execução seguinte" : "",
        };
    });

    const dataLake = {
        gerado_em: minutosAtras(1),
        preco_gb_mes: 0.023, // US$ por GB-mês no S3 padrão (valor de referência)
        camadas: { bronze_gb: BRONZE_GB, silver_gb: SILVER_GB, gold_gb: GOLD_GB },
        crescimento_gb_semana: CRESCIMENTO_SEMANA_GB,
        ultimo_gold_em: minutosAtras(3),
        empresas: EMPRESAS.map(({ id, nome }) => ({ id, nome })),
        servidores: servidoresLake,
        crescimento_bronze: crescimentoBronze,
        rejeicoes_por_dia: totalPorDia.map((d, i) => ({
            dia: diaAtras(DIAS_HISTORICO - 1 - i),
            linhas_recebidas: d.recebidas,
            linhas_rejeitadas: d.rejeitadas,
        })),
        execucoes,
    };

    return { clientes, dataLake };
})();
