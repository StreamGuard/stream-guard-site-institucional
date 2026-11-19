
var projeto = process.env.JIRA_ALERTA_PROJECT_KEY || "SUP";

function obterBaseUrl() {
    var dominio = process.env.JIRA_DOMAIN;

    if (!dominio) {
        throw new Error("JIRA_DOMAIN não está configurado no .env.");
    }

    dominio = dominio.replace(/^https?:\/\//, "").replace(/\/$/, "");

    if (!dominio.includes(".atlassian.net")) {
        dominio += ".atlassian.net";
    }

    return "https://" + dominio;
}

function obterCabecalhos() {
    if (!process.env.JIRA_EMAIL || !process.env.JIRA_API_TOKEN) {
        throw new Error("JIRA_EMAIL ou JIRA_API_TOKEN não está configurado no .env.");
    }

    var token = Buffer.from(
        process.env.JIRA_EMAIL + ":" + process.env.JIRA_API_TOKEN
    ).toString("base64");

    return {
        Authorization: "Basic " + token,
        Accept: "application/json",
        "Content-Type": "application/json"
    };
}

async function requisicaoJira(caminho, metodo, corpo) {
    var opcoes = {
        method: metodo || "GET",
        headers: obterCabecalhos()
    };

    if (corpo) {
        opcoes.body = JSON.stringify(corpo);
    }

    var resposta = await fetch(obterBaseUrl() + caminho, opcoes);
    var texto = await resposta.text();
    var dados = {};

    if (texto) {
        try {
            dados = JSON.parse(texto);
        } catch (erro) {
            dados = { mensagem: texto };
        }
    }

    if (!resposta.ok) {
        var mensagem = dados.errorMessages
            ? dados.errorMessages.join(", ")
            : dados.message || dados.mensagem || "Erro na comunicação com o Jira.";

        var erroJira = new Error(mensagem);
        erroJira.status = resposta.status;
        throw erroJira;
    }

    return dados;
}

function converterDescricao(conteudo) {
    if (!conteudo) return "";

    if (typeof conteudo === "string") return conteudo;

    if (Array.isArray(conteudo)) {
        return conteudo.map(converterDescricao).filter(Boolean).join("\n");
    }

    var texto = conteudo.text || "";
    var filhos = conteudo.content
        ? converterDescricao(conteudo.content)
        : "";

    return [texto, filhos].filter(Boolean).join("");
}

function classificarStatus(issue) {
    var categoria = issue.fields.status &&
        issue.fields.status.statusCategory
        ? issue.fields.status.statusCategory.key
        : "";

    if (categoria === "done") {
        return "resolvido";
    }

    var prioridade = issue.fields.priority
        ? issue.fields.priority.name.toLowerCase()
        : "";

    if (
        prioridade.includes("highest") ||
        prioridade.includes("blocker") ||
        prioridade.includes("critical") ||
        prioridade.includes("crítica") ||
        prioridade.includes("critica")
    ) {
        return "critico";
    }

    return "alerta";
}

function formatarAlerta(issue) {
    var campos = issue.fields || {};
    var status = campos.status || {};
    var prioridade = campos.priority || {};
    var tipo = campos.issuetype || {};

    return {
        id: issue.id,
        chave: issue.key,
        titulo: campos.summary || "Sem título",
        descricao: converterDescricao(campos.description),
        status: classificarStatus(issue),
        statusJira: status.name || "Não informado",
        categoriaStatus: status.statusCategory
            ? status.statusCategory.key
            : "",
        prioridade: prioridade.name || "Não definida",
        tipo: tipo.name || "Não definido",
        responsavel: campos.assignee
            ? campos.assignee.displayName
            : "Não atribuído",
        relator: campos.reporter
            ? campos.reporter.displayName
            : "Não informado",
        etiquetas: campos.labels || [],
        hora: campos.created || null,
        atualizado: campos.updated || null,
        url: obterBaseUrl() + "/browse/" + issue.key
    };
}

async function listarAlertas() {
    var jql = 'project = "' + projeto + '" ORDER BY created DESC';

    var resultado = await requisicaoJira(
        "/rest/api/3/search/jql",
        "POST",
        {
            jql: jql,
            maxResults: 100,
            fields: [
                "summary",
                "description",
                "status",
                "created",
                "updated",
                "priority",
                "assignee",
                "reporter",
                "issuetype",
                "labels"
            ]
        }
    );

    return (resultado.issues || []).map(formatarAlerta);
}

async function buscarAlerta(chave) {
    var issue = await requisicaoJira(
        "/rest/api/3/issue/" + encodeURIComponent(chave) +
        "?fields=summary,description,status,created,updated,priority,assignee,reporter,issuetype,labels",
        "GET"
    );

    return formatarAlerta(issue);
}

async function reconhecerAlerta(chave) {
    var resultado = await requisicaoJira(
        "/rest/api/3/issue/" + encodeURIComponent(chave) + "/transitions",
        "GET"
    );

    var transicoes = resultado.transitions || [];

    // Reconhecer significa concluir o chamado no fluxo do Jira.
    var transicao = transicoes.find(function (item) {
        return item.to &&
            item.to.statusCategory &&
            item.to.statusCategory.key === "done";
    });

    if (!transicao) {
        throw new Error(
            "O Jira não disponibilizou uma transição para concluir este chamado. Verifique o workflow e as permissões do usuário da integração."
        );
    }

    await requisicaoJira(
        "/rest/api/3/issue/" + encodeURIComponent(chave) + "/transitions",
        "POST",
        {
            transition: {
                id: transicao.id
            }
        }
    );

    return true;
}

module.exports = {
    listarAlertas: listarAlertas,
    buscarAlerta: buscarAlerta,
    reconhecerAlerta: reconhecerAlerta
};
