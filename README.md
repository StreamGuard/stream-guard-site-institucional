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

## Configurações de métricas

O agente cadastra servidor, componentes e métricas pelas rotas existentes. Cada métrica recebe uma configuração inicial na mesma transação, sem substituir valores personalizados em cadastros repetidos.

| Métricas | Intervalo inicial | Limite máximo inicial |
|---|---:|---:|
| Uso de CPU | 5 s | 90% |
| Uso de RAM | 10 s | 90% |
| RAM disponível | 10 s | Não definido |
| Envio / recebimento de rede | 5 / 10 s | Não definido |
| Leitura / escrita de disco | 15 s | Não definido |
| Ocupação do disco | 60 s | 95% |
| Carga de CPU de 1 / 5 / 15 minutos | 30 / 60 / 60 s | Não definido |

Esses limites são parâmetros operacionais editáveis. Limites não definidos são armazenados como `NULL`; bytes, bytes/s e carga não recebem limites percentuais. Os limites numéricos aceitam até duas casas decimais, são não negativos e respeitam a precisão segura do JavaScript; métricas percentuais ficam entre 0 e 100.

Com a aplicação configurada conforme `.env.example`, abra `/painel/painel_config.html?servidor_id=<id>` ou informe o ID na tela. Carregue as métricas, ajuste habilitação, intervalo em segundos e limites e clique em **Salvar alterações**. O sucesso depende da confirmação da API. O agente consulta os novos parâmetros no ciclo de atualização das configurações.

- `GET /metricas/configuracoes/:servidor_id`: contrato de consulta usado pelos agentes real e simulado, preservado.
- `PUT /metricas/configuracoes/:servidor_id`: recebe `{"configuracoes":[{"id_metrica":1,"habilitado":1,"intervalo_coleta":5,"limite_minimo":null,"limite_maximo":90}]}`. A lista é validada e atualizada integralmente em uma transação; todas as métricas devem pertencer ao servidor informado.

Para bancos existentes, use `src/database/migracoes/001-configuracoes-metricas.sql`, com o schema correto selecionado, backup disponível e aplicação parada. O script exige MySQL 8.0.13 ou superior, detecta duplicações antes das alterações e interrompe sem excluir nem escolher registros conflitantes. Adiciona unicidade, amplia limites para `DECIMAL(20,2)` e preenche apenas configurações ausentes dos tipos e unidades reconhecidos. Métricas legadas não reconhecidas são listadas para revisão manual. O DDL do MySQL possui commits implícitos; o script pode ser repetido após corrigir uma interrupção.

O script `StreamGuard-ScripBD.sql` continua destinado à criação inicial e recria o banco; não o execute sobre dados que deseja preservar. Os modos real e simulado utilizam a mesma API, com equipamentos distintos. A tela edita configurações das métricas cadastradas pelo agente. A aba de funcionários é uma demonstração identificada, somente para consulta, sem cadastro, edição ou exclusão. As demais dashboards mantêm sua implementação atual.

O PUT exige sessão válida, token CSRF e perfil Admin da empresa proprietária do servidor, conferidos no banco a cada atualização. O GET continua disponível aos agentes sem sessão e mantém seu JSON original. As demais rotas não receberam exigência de autenticação nesta alteração.
## Sessão web

O login existente cria uma sessão com `express-session`, persistida no MySQL por `express-mysql-session`. O navegador recebe somente o identificador assinado em cookie `HttpOnly`, `SameSite=Lax` e `Secure` por padrão. A sessão guarda o ID do usuário, expiração e proteção CSRF, sem senha ou token de autenticação no sessionStorage. O ID é regenerado ao entrar, e Sair invalida a sessão no servidor.

Antes de iniciar a API:

1. Instale as dependências com `npm install`.
2. No banco existente, aplique `src/database/migracoes/002-sessoes-web.sql` no schema selecionado. Ela cria somente a tabela técnica `web_sessoes`, sem alterar tabelas de negócio. O script de criação inicial já contém essa tabela.
3. Configure `SESSION_SECRET` no ambiente privado, com pelo menos 32 bytes aleatórios; mantenha o mesmo segredo nas reinicializações e instâncias. Por exemplo, gere um valor localmente com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Não versione nem registre o valor.
4. Defina `APP_ORIGIN` com a origem HTTPS exata do site e mantenha `SESSION_COOKIE_SECURE=true` na homologação/produção. `SESSION_TTL_MINUTES` define a duração absoluta da sessão, entre 1 e 120 minutos; padrão 30.
5. Se o HTTPS termina em um proxy, configure `TRUST_PROXY` somente com IPs/redes dos proxies confiáveis. Use `loopback` apenas quando o proxy realmente estiver na mesma máquina. O acesso direto ao Node deve ser restrito para impedir falsificação de cabeçalhos de proxy.

Para desenvolvimento HTTP exclusivamente local, use `AMBIENTE_PROCESSO=desenvolvimento`, `SESSION_COOKIE_SECURE=false` e `APP_ORIGIN=http://localhost:<porta>`. Cookies inseguros são rejeitados pela configuração em outros ambientes. Não publique essa configuração local.

O usuário entra normalmente, sem repetir a senha em cada salvamento. Ao carregar as configurações, o painel recebe `X-CSRF-Token` no cabeçalho do GET autenticado e o mantém apenas em memória para enviar no PUT. O corpo e o status do GET dos agentes permanecem iguais. Uma sessão ausente ou expirada retorna 401 no PUT; CSRF, perfil ou empresa sem autorização retornam 403. Os parâmetros editados permanecem na tela em caso de falha. Após nova sessão, recarregue as configurações antes de editar.

`POST /usuarios/sair` encerra a sessão e exige origem válida; é usado pelo botão Sair. O login também rejeita origens externas declaradas. A aplicação usa o mesmo domínio para página e API; não é necessário liberar cookies para CORS externo.

O usuário MySQL da API precisa ler/gravar/remover registros da tabela técnica de sessões. A aplicação não cria tabelas automaticamente e não utiliza MemoryStore como fallback. Se o store falhar, o login não é confirmado e a edição permanece protegida. A limpeza automática remove apenas sessões expiradas dessa tabela técnica.

Os hashes SHA-256 do cadastro atual foram preservados para compatibilidade. Modernização de hashes, limitação de tentativas e proteção das demais rotas não foram implementadas nesta alteração. A homologação ainda deve validar HTTPS, proxy, segredo privado, permissões do banco e comportamento no navegador real.
