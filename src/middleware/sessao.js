var session = require("express-session");
var MySQLStore = require("express-mysql-session")(session);
var mysql = require("mysql2/promise");
var crypto = require("crypto");

var fs = require("fs");
var path = require("path");

function obterSegredo() {
    if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
    const arquivo = process.env.SESSION_SECRET_FILE || path.resolve(__dirname, "../../.session-secret");
    try {
        fs.lstatSync(arquivo);
    } catch (erro) {
        if (erro.code !== "ENOENT") throw erro;
        const temporario = arquivo + "." + process.pid + "." + crypto.randomBytes(8).toString("hex") + ".tmp";
        let descritor;
        let criado = false;
        try {
            descritor = fs.openSync(temporario, "wx", 0o600);
            criado = true;
            if (process.platform === "win32") {
                const executar = require("child_process").execFileSync;
                const identidade = executar(path.join(process.env.SystemRoot || "C:/Windows", "System32", "whoami.exe"), ["/user", "/fo", "csv", "/nh"], { encoding: "utf8", windowsHide: true });
                const sid = identidade.match(/S-1-[\d-]+/);
                if (!sid) throw new Error("Nao foi possivel proteger o arquivo de sessao.");
                executar(path.join(process.env.SystemRoot || "C:/Windows", "System32", "icacls.exe"), [temporario, "/inheritance:r", "/grant:r", "*" + sid[0] + ":F"], { stdio: "ignore", windowsHide: true });
            }
            fs.writeFileSync(descritor, crypto.randomBytes(32).toString("hex"), "utf8");
            fs.fsyncSync(descritor);
            fs.closeSync(descritor);
            descritor = undefined;
            try {
                fs.linkSync(temporario, arquivo);
            } catch (erro) {
                if (erro.code !== "EEXIST") throw erro;
            }
        } finally {
            if (descritor !== undefined) fs.closeSync(descritor);
            if (criado) fs.unlinkSync(temporario);
        }
    }
    if (!fs.lstatSync(arquivo).isFile()) throw new Error("SESSION_SECRET_FILE deve ser um arquivo privado regular.");
    const segredo = fs.readFileSync(arquivo, "utf8").trim();
    if (!/^[a-f0-9]{64}$/.test(segredo)) throw new Error("Arquivo SESSION_SECRET_FILE invalido; preserve e revise o arquivo existente.");
    return segredo;
}

function cookieSeguro() {
    if (process.env.SESSION_COOKIE_SECURE) return process.env.SESSION_COOKIE_SECURE !== "false";
    return new URL(process.env.APP_ORIGIN || "http://localhost:3333").protocol === "https:";
}

function criarSessao() {
    const segredo = obterSegredo();
    const minutos = Number(process.env.SESSION_TTL_MINUTES || 30);
    if (!segredo || Buffer.byteLength(segredo) < 32) {
        throw new Error("Configure SESSION_SECRET com pelo menos 32 bytes aleatórios.");
    }
    if (!Number.isInteger(minutos) || minutos < 1 || minutos > 120) {
        throw new Error("SESSION_TTL_MINUTES deve ser um inteiro entre 1 e 120.");
    }
    if (!process.env.APP_ORIGIN) process.env.APP_ORIGIN = "http://localhost:3333";
    if (process.env.APP_ORIGIN) {
        const protocolo = new URL(process.env.APP_ORIGIN).protocol;
        if (!["http:", "https:"].includes(protocolo) || cookieSeguro() !== (protocolo === "https:")) {
            throw new Error("APP_ORIGIN e SESSION_COOKIE_SECURE devem corresponder: HTTP usa false; HTTPS usa true.");
        }
    }
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        connectionLimit: 2
    });
    const store = new MySQLStore({
        createDatabaseTable: false,
        endConnectionOnClose: true,
        disableTouch: true,
        expiration: minutos * 60 * 1000,
        schema: { tableName: "web_sessoes" }
    }, pool);
    const middleware = session({
        name: "streamguard.sid",
        secret: segredo,
        store: store,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: cookieSeguro(),
            sameSite: "lax",
            path: "/",
            maxAge: minutos * 60 * 1000
        }
    });
    return { middleware, store };
}

function origemPermitida(req) {
    if (req.get("Sec-Fetch-Site") === "cross-site") return false;
    const origem = req.get("Origin");
    if (!origem) return true;
    const esperada = process.env.APP_ORIGIN || req.protocol + "://" + req.get("host");
    return origem === new URL(esperada).origin;
}

function validarOrigem(req, res, next) {
    if (!origemPermitida(req)) return res.status(403).json({ erro: "Origem não permitida." });
    next();
}

function exigirOrigem(req, res, next) {
    if (!req.get("Origin")) return res.status(403).json({ erro: "Origem obrigatória." });
    validarOrigem(req, res, next);
}

async function iniciarSessao(req, usuario_id) {
    if (!req.session) throw new Error("Middleware de sessão não configurado.");
    await new Promise((resolve, reject) => req.session.regenerate(erro => erro ? reject(erro) : resolve()));
    req.session.usuario_id = usuario_id;
    req.session.csrf = crypto.randomBytes(32).toString("hex");
    req.session.expira_em = Date.now() + req.session.cookie.originalMaxAge;
    await new Promise((resolve, reject) => req.session.save(erro => erro ? reject(erro) : resolve()));
}

function sessaoValida(req) {
    return req.session && Number.isSafeInteger(req.session.usuario_id) &&
        req.session.usuario_id > 0 && Number.isFinite(req.session.expira_em) && req.session.expira_em > Date.now();
}

function informarCsrf(req, res, next) {
    if (sessaoValida(req)) {
        res.set("X-CSRF-Token", req.session.csrf);
        res.set("Cache-Control", "no-store");
        res.vary("Cookie");
    }
    next();
}

function exigirSessao(req, res, next) {
    if (!sessaoValida(req)) {
        res.clearCookie("streamguard.sid", { path: "/", httpOnly: true, secure: cookieSeguro(), sameSite: "lax" });
        return res.status(401).json({ erro: "Sessão ausente ou expirada. Entre novamente." });
    }
    const token = req.get("X-CSRF-Token");
    if (!origemPermitida(req) || typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token) ||
        typeof req.session.csrf !== "string" || token.length !== req.session.csrf.length ||
        !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(req.session.csrf))) {
        return res.status(403).json({ erro: "Confirmação CSRF inválida. Recarregue as configurações." });
    }
    next();
}

module.exports = {
    criarSessao,
    iniciarSessao,
    informarCsrf,
    exigirSessao,
    validarOrigem,
    exigirOrigem
};
