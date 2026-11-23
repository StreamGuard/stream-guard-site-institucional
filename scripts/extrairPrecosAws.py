import csv
import io
import json
import os
import sys
import urllib.request

from pathlib import Path
from datetime import datetime, timezone


# ==========================================
# CONFIGURAÇÕES
# ==========================================

regiao = sys.argv[1] if len(sys.argv) > 1 else "us-east-1"
instancia = sys.argv[2] if len(sys.argv) > 2 else "t3.micro"

regioes_permitidas = ["us-east-1", "sa-east-1"]

url_base = "https://pricing.us-east-1.amazonaws.com"

url_indice = (
    url_base +
    "/offers/v1.0/aws/AmazonEC2/current/region_index.json"
)

# Pasta onde o JSON será armazenado.
pasta = Path(__file__).resolve().parent.parent / "src" / "services"

pasta.mkdir(parents=True, exist_ok=True)


# ==========================================
# CONSULTAR PREÇOS AWS
# ==========================================

def consultar_precos():

    if regiao not in regioes_permitidas:
        raise ValueError("Região AWS não permitida.")

    print("Consultando catálogo AWS...")

    # Consulta o índice de regiões da AWS.
    with urllib.request.urlopen(url_indice, timeout=60) as resposta:
        indice = json.load(resposta)

    informacoes = indice["regions"].get(regiao)

    if informacoes is None:
        raise ValueError("Região não encontrada.")

    # Identifica a versão atual do catálogo.
    caminho = informacoes["currentVersionUrl"]

    caminho = caminho.replace(
        "/index.json",
        "/index.csv"
    )

    url_catalogo = url_base + caminho

    print("Região:", regiao)
    print("Instância:", instancia)
    print("Arquivo:", url_catalogo)

    preco_instancia = None
    preco_armazenamento = None

    # Lê o arquivo CSV da AWS.
    with urllib.request.urlopen(url_catalogo, timeout=120) as resposta:

        arquivo = io.TextIOWrapper(
            resposta,
            encoding="utf-8-sig",
            newline=""
        )

        # Ignora os metadados iniciais.
        for i in range(5):
            next(arquivo)

        leitor = csv.DictReader(arquivo)

        for linha in leitor:

            if linha.get("TermType") != "OnDemand":
                continue

            if linha.get("Currency") != "USD":
                continue

            if linha.get("Region Code") != regiao:
                continue

            try:
                valor = float(linha.get("PricePerUnit", ""))
            except (ValueError, TypeError):
                continue

            if valor <= 0:
                continue

            uso = linha.get("usageType", "")

            # ==================================
            # PREÇO DA INSTÂNCIA EC2
            # ==================================

            if preco_instancia is None:

                if (
                    linha.get("Product Family") == "Compute Instance"
                    and linha.get("Instance Type") == instancia
                    and linha.get("Operating System") == "Linux"
                    and linha.get("Tenancy") == "Shared"
                    and linha.get("Pre Installed S/W") == "NA"
                    and linha.get("License Model") == "No License required"
                    and linha.get("CapacityStatus") == "Used"
                    and linha.get("Unit") == "Hrs"
                    and uso.endswith("BoxUsage:" + instancia)
                ):

                    preco_instancia = {
                        "tipo": instancia,
                        "sku": linha["SKU"],
                        "usdPorHora": valor
                    }

            # ==================================
            # PREÇO DE ARMAZENAMENTO EBS GP3
            # ==================================

            if preco_armazenamento is None:

                if (
                    linha.get("Product Family") == "Storage"
                    and linha.get("Volume API Name") == "gp3"
                    and linha.get("Unit") == "GB-Mo"
                    and uso.endswith("EBS:VolumeUsage.gp3")
                ):

                    preco_armazenamento = {
                        "tipo": "gp3",
                        "sku": linha["SKU"],
                        "usdPorGbMes": valor
                    }

            if preco_instancia and preco_armazenamento:
                break

    if preco_instancia is None:
        raise ValueError("Preço da instância não encontrado.")

    if preco_armazenamento is None:
        raise ValueError("Preço do armazenamento não encontrado.")

    return {
        "fonte": "AWS Price List Bulk API",
        "regiao": regiao,
        "consultadoEm": datetime.now(timezone.utc).isoformat(),
        "instancia": preco_instancia,
        "armazenamento": preco_armazenamento
    }


# ==========================================
# SALVAR O RESULTADO
# ==========================================

def main():

    precos = consultar_precos()

    caminho = pasta / "precosAws.json"
    temporario = pasta / "precosAws.json.tmp"

    with open(temporario, "w", encoding="utf-8") as arquivo:

        json.dump(
            precos,
            arquivo,
            indent=4,
            ensure_ascii=False
        )

    os.replace(temporario, caminho)

    print("\nPreços encontrados:")
    print(json.dumps(precos, indent=4, ensure_ascii=False))

    print("\nArquivo salvo em:", caminho)


if __name__ == "__main__":

    try:
        main()

    except Exception as erro:
        print("Erro na consulta:", erro, file=sys.stderr)
        sys.exit(1)
