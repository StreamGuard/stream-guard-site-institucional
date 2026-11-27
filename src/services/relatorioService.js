const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");

function gerarRelatorio(dados) {

    return new Promise(function (resolve, reject) {

        let pastaJava = process.env.JAVA_RELATORIOS_PATH;

        if (!pastaJava) {
            reject(new Error("Caminho do Java não configurado."));
            return;
        }

        let pastaTemporaria = fs.mkdtempSync(
            path.join(os.tmpdir(), "streamguard-")
        );

        let caminhoJson = path.join(
            pastaTemporaria,
            "dados-relatorio.json"
        );

        try {

            fs.writeFileSync(
                caminhoJson,
                JSON.stringify(dados, null, 4),
                "utf8"
            );

            execFile(
                "mvn",
                [
                    "compile",
                    "exec:java",
                    "-Dexec.args=" + caminhoJson
                ],
                {
                    cwd: pastaJava,
                    timeout: 120000
                },
                function (erro, stdout, stderr) {

                    fs.rmSync(pastaTemporaria, {
                        recursive: true,
                        force: true
                    });

                    if (erro) {
                        console.error(stderr);
                        reject(erro);
                        return;
                    }

                    let linhas = stdout.split("\n");

                    let caminhoPdf = "";

                    for (let linha of linhas) {

                        if (linha.startsWith("ARQUIVO_PDF=")) {

                            caminhoPdf = linha.replace(
                                "ARQUIVO_PDF=",
                                ""
                            ).trim();
                        }
                    }

                    if (!caminhoPdf || !fs.existsSync(caminhoPdf)) {

                        reject(new Error("PDF não encontrado."));
                        return;
                    }

                    resolve(caminhoPdf);
                }
            );

        } catch (erro) {

            fs.rmSync(pastaTemporaria, {
                recursive: true,
                force: true
            });

            reject(erro);
        }
    });
}

module.exports = {
    gerarRelatorio
};