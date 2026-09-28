const express = require("express");
const router = express.Router();

//  rota de teste isso serve para validar se o e-mail e o Token salvos no .env.dev estão funcionando
router.get("/teste-jira", async (req, res) => {
    try {
        console.log("--- TESTANDO CONEXÃO COM O JIRA ---");
        console.log("DOMAIN:", process.env.JIRA_DOMAIN);
        console.log("EMAIL:", process.env.JIRA_EMAIL);
        console.log("TOKEN CONFIGURADO?:", !!process.env.JIRA_API_TOKEN);

        const credentials = Buffer.from(
            `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`
        ).toString("base64");

        const response = await fetch(
            `https://${process.env.JIRA_DOMAIN}.atlassian.net/rest/api/3/myself`,
            {
                method: "GET",
                headers: {
                    Authorization: `Basic ${credentials}`,
                    Accept: "application/json"
                }
            }
        );

        console.log("STATUS DA AUTENTICAÇÃO:", response.status);
        const texto = await response.text();

        res.status(response.status).send(texto);

    } catch (erro) {
        console.error("Erro na rota de teste:", erro);
        res.status(500).send(erro.message);
    }
});

// rota de contato - crio um chamado oficial no seu Jira Service Management 
router.post("/contato", async (req, res) => {
    try {
        const { nome, email, pedido } = req.body;

        const credentials = Buffer.from(
            `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`
        ).toString("base64");

        // Endpoint oficial da API do Jira Service Management para criar requisições de clientes
        const response = await fetch(
            `https://${process.env.JIRA_DOMAIN}.atlassian.net/rest/servicedeskapi/request`,
            {
                method: "POST",
                headers: {
                    Authorization: `Basic ${credentials}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-ExperimentalApi": "opt-in" // Cabeçalho obrigatório exigido pela API do Service Desk
                },
                body: JSON.stringify({
                    serviceDeskId: process.env.JIRA_SERVICE_DESK_ID || "1",
                    requestTypeId: process.env.JIRA_REQUEST_TYPE_ID || "1",
                    requestFieldValues: {
                        summary: `[Contato] ${nome}`,
                        description: `Nome: ${nome}\nEmail: ${email}\n\nPedido/Mensagem:\n${pedido}`
                    }
                })
            }
        );

        const data = await response.json();

        console.log("Status do Chamado:", response.status);
        console.log("Resposta da Atlassian:", data);

        if (!response.ok) {
            return res.status(response.status).json({
                erro: data
            });
        }

        // Retorna a chave do chamado de suporte criado (Ex: SUP-1)
        return res.status(201).json({
            key: data.issueKey,
            id: data.issueId,
            status: data.currentStatus?.status
        });

    } catch (erro) {
        console.error("Erro ao criar chamado:", erro);
        return res.status(500).json({
            erro: erro.message
        });
    }
});

module.exports = router;
