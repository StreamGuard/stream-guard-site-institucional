var ambiente_processo = 'producao';
// var ambiente_processo = 'desenvolvimento';

var caminho_env = ambiente_processo === 'desenvolvimento' ? '.env.dev' : '.env';
require("dotenv").config({ path: caminho_env });

var jiraRouter = require("./src/routes/jira");
// Acima, temos o uso do operador ternário para definir o caminho do arquivo .env
// A sintaxe do operador ternário é: condição ? valor_se_verdadeiro : valor_se_falso

require("dotenv").config({ path: caminho_env });

var express = require("express");
var cors = require("cors");
var path = require("path");
var PORTA_APP = process.env.APP_PORT || 3333;
var HOST_APP = process.env.APP_HOST || "localhost";

var app = express();
var sessao = require("./src/middleware/sessao");
var controleSessao = sessao.criarSessao();

if (process.env.TRUST_PROXY) {
    app.set("trust proxy", process.env.TRUST_PROXY.split(",").map(valor => valor.trim()));
}

var indexRouter = require("./src/routes/index");
var usuariosRouter = require("./src/routes/usuarios");
var servidoresRouter = require("./src/routes/servidores")
var empresasRouter = require("./src/routes/empresas");
var componentesRouter = require("./src/routes/componentes");
var metricasRouter = require("./src/routes/metricas");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(["/usuarios/autenticar", "/usuarios/sair", "/metricas/configuracoes", "/servidores/cadastrar", "/componentes/cadastrar", "/metricas/cadastrarMetrica"], controleSessao.middleware);
app.use(cors());

app.use(express.static(path.join(__dirname, "public")));
app.use("/api", jiraRouter);
app.use("/empresas", empresasRouter);
app.use("/usuarios", usuariosRouter);
app.use("/servidores", servidoresRouter)
app.use("/componentes", componentesRouter);
app.use("/metricas", metricasRouter);
app.use("/", indexRouter);

app.use(function (erro, req, res, next) {
    if (res.headersSent) return next(erro);
    if (!["/usuarios/autenticar", "/usuarios/cadastrar", "/usuarios/sair"].includes(req.path) &&
        !req.path.startsWith("/metricas/configuracoes/") && !["/empresas/cadastrar", "/servidores/cadastrar", "/componentes/cadastrar", "/metricas/cadastrarMetrica"].includes(req.path)) return next(erro);
    console.error("Erro na requisição:", erro.code || "ERRO_INTERNO");
    const status = erro.status >= 400 && erro.status < 500 ? erro.status : 500;
    res.status(status).json({ erro: "Não foi possível concluir a requisição." });
});

app.listen(PORTA_APP, function () {
    console.log(`
        ███████╗████████╗██████╗ ███████╗ █████╗ ███╗   ███╗
        ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██╔══██╗████╗ ████║
        ███████╗   ██║   ██████╔╝█████╗  ███████║██╔████╔██║
        ╚════██║   ██║   ██╔══██╗██╔══╝  ██╔══██║██║╚██╔╝██║
        ███████║   ██║   ██║  ██║███████╗██║  ██║██║ ╚═╝ ██║
        ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝

         ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗
        ██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗
        ██║  ███╗██║   ██║███████║██████╔╝██║  ██║
        ██║   ██║██║   ██║██╔══██║██╔══██╗██║  ██║
        ╚██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝
        ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝

        Servidor do Stream Guard já está rodando!
        Acesse: http://${HOST_APP}:${PORTA_APP}

        Ambiente: ${process.env.AMBIENTE_PROCESSO}

        Desenvolvimento -> banco local
        Produção        -> banco remoto

        Para alterar o ambiente, comente ou descomente
        as linhas 1 ou 2 no arquivo 'app.js'
    `);
});
