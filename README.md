# StreamGuard 🛡️

![STATUS EM DESENVOLVIMENTO](https://img.shields.io/badge/Status-Em%20Desenvolvimento-orange?style=for-the-badge)
![INSTITUIÇÃO SPTECH SCHOOL](https://img.shields.io/badge/Institui%C3%A7%C3%A3o-SPTech%20School-blue?style=for-the-badge)

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

### Front-end

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)

### Back-end & Banco de Dados

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)

### Captura e Logs

![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![Java](https://img.shields.io/badge/java-%23ED8B00.svg?style=for-the-badge&logo=openjdk&logoColor=white)

### Outras Ferramentas

![Slack](https://img.shields.io/badge/Slack-4A154B?style=for-the-badge&logo=slack&logoColor=white)
![Jira](https://img.shields.io/badge/jira-%230052CC.svg?style=for-the-badge&logo=jira&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-%23232F3E.svg?style=for-the-badge&logo=amazonaws&logoColor=white)

---

## ⚙️ Metodologia

O projeto é conduzido utilizando **Metodologia Ágil**, estruturada em Sprints. O processo é apoiado por três pilares fundamentais:

1. **Comunicação:** Reuniões _Daily_ para acompanhamento e remoção de impedimentos.
2. **Transparência:** Gestão visual do backlog via Planner, com tarefas estimadas usando a sequência de Fibonacci.
3. **Melhoria Contínua:** Retrospectivas ao final de cada Sprint para aprimorar processos e qualidade das entregas.

---

## 👥 Equipe Desenvolvedora

Este projeto está sendo construído pelos seguintes alunos de Ciência da Computação:

- Ana Clara Ferreira Clarete
- Bruno Rafael Silva Gonçalves
- Eduardo Guaglioni Lupianez
- Jonatas Pereira Teles
- Miguel Pereira Soares
- Pedro Ludovic Nascimento Lima
