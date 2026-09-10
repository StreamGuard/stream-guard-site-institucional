# StreamGuard 🛡️
**Monitoramento de Componentes de Hardware para Sites de Streaming**

## 📖 Sobre o Projeto

Durante grandes eventos transmitidos ao vivo (como a Copa do Mundo e as Olimpíadas), a infraestrutura de servidores pode ficar sobrecarregada pelo acesso simultâneo de milhões de usuários. Isso frequentemente resulta em travamentos, congelamento de imagem e interrupções nas transmissões, gerando insatisfação no público e prejuízos milionários em publicidade. 

Atualmente, sinais de sobrecarga costumam ser identificados apenas **depois** que já afetam o público. O **StreamGuard** nasce para mudar esse cenário de reativo para preventivo.

### 🎯 Objetivo
Desenvolver um painel dinâmico e automatizado capaz de coletar e exibir, em tempo real, dados de uso de servidores durante transmissões ao vivo. O sistema emite alertas e abre chamados automaticamente quando os recursos da máquina (CPU, RAM, Disco e Rede) se aproximam de seus limites críticos.

---

## ✨ Funcionalidades Principais

- **Monitoramento em Tempo Real:** Captura contínua de dados de uso de CPU, memória RAM, disco e rede através de scripts em Python.
- **Dashboard Centralizado:** Painel web intuitivo com gráficos e indicadores de desempenho da infraestrutura.
- **Gestão de Componentes (CRUD):** Telas web para o cadastro e gerenciamento dos componentes de infraestrutura que serão monitorados.
- **Alertas Automatizados via Slack:** Notificações disparadas diretamente para a equipe técnica assim que os recursos atingem limites pré-definidos.
- **Abertura de Chamados no Jira:** Integração para criação automática de tickets de incidentes, anexando logs gerados pela aplicação Java (.jar).

---

## 🛠️ Tecnologias e Ferramentas

Embora a stack completa possa evoluir, a arquitetura do StreamGuard é baseada em:

* **Captura de Dados:** Python (Scripts de monitoramento de SO)
* **Lógica e Logs:** Java (Executável `.jar`)
* **Interface:** Aplicação Web Responsiva (Site institucional e Dashboard)
* **Integrações (ITIL - Gestão de Incidentes):** 
  * WebHook do Slack (Mensageria e Alertas)
  * API do Jira (Abertura de Chamados)
* **Gestão de Projeto:** Metodologia Ágil, Planner (Backlog/Burndown)

---

## ⚙️ Metodologia

O projeto é conduzido utilizando **Metodologia Ágil**, estruturada em Sprints. O processo é apoiado por três pilares fundamentais:
1. **Comunicação:** Reuniões *Daily* para acompanhamento e remoção de impedimentos.
2. **Transparência:** Gestão visual do backlog via Planner, com tarefas estimadas usando a sequência de Fibonacci.
3. **Melhoria Contínua:** Retrospectivas ao final de cada Sprint para aprimorar processos e qualidade das entregas.

---

## 👥 Equipe Desenvolvedora

Este projeto está sendo construído pelos seguintes alunos de Ciência da Computação:

* Ana Clara Ferreira Clarete
* Bruno Rafael Silva Gonçalves
* Eduardo Guaglioni Lupianez
* Jonatas Pereira Teles
* Miguel Pereira Soares
* Pedro Ludovic Nascimento Lima