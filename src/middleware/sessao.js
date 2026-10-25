var session = require("express-session");
var MySQLStore = require("express-mysql-session")(session);
var mysql = require("mysql2/promise");
var crypto = require("crypto");

function cookieSeguro() {
    return process.env.SESSION_COOKIE_SECURE !== "false";
}

function criarSessao() {
    const segredo = process.env.SESSION_SECRET;
    const minutos = Number(process.env.SESSION_TTL_MINUTES || 30);
    if (!segredo || Buffer.byteLength(segredo) < 32) {
        throw new Error("Configure SESSION_SECRET com pelo menos 32 bytes aleatórios.");
    }
    if (!Number.isInteger(minutos) || minutos < 1 || minutos > 120) {
        throw new Error("SESSION_TTL_MINUTES deve ser um inteiro entre 1 e 120.");
    }
    if (process.env.AMBIENTE_PROCESSO !== "desenvolvimento" &&
        (!cookieSeguro() || !process.env.APP_ORIGIN || new URL(process.env.APP_ORIGIN).protocol !== "https:")) {
        throw new Error("Homologação/produção exige APP_ORIGIN HTTPS e cookie Secure.");
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
