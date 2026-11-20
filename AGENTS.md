# AGENTS.md

O StreamGuard é uma aplicação Node/Express + MySQL que disponibiliza um dashboard estático com várias páginas a partir da pasta public/ e APIs JSON. Não existe etapa de build, suíte de testes, linter, formatador, verificação de tipos ou ORM.

## Setup e comandos

```bash
npm install
npm start        # node app.js
```
## Introdução

- Copie `.env.example` para `.env`, depois importe `src/database/StreamGuard-ScriptBD.sql` no MySQL e configure as variáveis `DB_*`.
- O script SQL começa com `DROP DATABASE IF EXISTS StreamGuard;` nunca execute esse comando em um banco de dados compartilhado ou de produção.
- Não existem migrations; o arquivo SQL é a fonte oficial da estrutura do banco de dados.
- Acesse as páginas pelo servidor (http://localhost:$APP_PORT, sendo 8080 o valor definido em `.env.example`), nunca diretamente pelo file://. Todas as requisições do front-end utilizam caminhos relativos.
- É necessário utilizar Node 18 ou superior, pois o código do Jira utiliza o fetch global.
- O arquivo app.js define qual arquivo de ambiente será carregado por meio da variável fixa `ambiente_processo = 'producao'`, que utiliza `.env`.
- Alterar esse valor para `'desenvolvimento'` fará com que o sistema carregue `.env.dev`, que não está disponível no projeto. Além disso, a variável `AMBIENTE_PROCESSO`, dentro do arquivo de ambiente, precisa continuar configurada como producao ou desenvolvimento, caso contrário, todas as consultas ao banco de dados serão rejeitadas.
- Um banco de dados recém-importado não possui um login utilizável: a senha do usuário inicial (senha_hash) contém o valor literal hash_exemplo.
- Para acessar o sistema, faça o cadastro em `/login/cadastroUsuario.html`, utilizando um código de empresa já cadastrado `(ABC12345)`.
- O cadastro de novos usuários sempre cria uma conta com o nível de permissão 4 (User).
- Não existe verificação automatizada. É necessário iniciar o servidor e testar manualmente a página ou rota afetada.

## Arquitetura

# app.js é o arquivo principal da aplicação.

- Ele registra as rotas nos seguintes caminhos: `/clientes, /admin, /alerta, /config, /perfil, /api (Jira), /empresas, /analista_geral, /usuarios, /servidores e / (arquivos estáticos e página 404)`.

# A estrutura do back-end é dividida em camadas:

- `src/routes:` recebe e direciona as requisições.
- `src/controllers:` realiza validações e define os códigos de resposta.
- `src/models:` contém as consultas SQL.
- `src/database/config.js:` configura a conexão com o banco de dados.
- `database.executar():` abre uma nova conexão com o MySQL para cada consulta. Não utiliza pool de conexões nem transações. Apenas executar é exportada.
- `public/main` contém o site institucional.
- `public/login` e `public/painel` contêm a aplicação.

# Cada página do painel possui seus respectivos arquivos nas pastas js/ e css/.

- `public/painel/js/painel_shell.js` constrói a barra lateral e a barra superior compartilhadas entre as páginas. Além disso ela cuida bastante dos permissionamentos e comportamentos das páginas.
- O atributo `body[data-pagina]` identifica qual item do menu deve ficar destacado.

# Os modelos de Análise e Data Lake leem, por padrão, os arquivos public/painel/dados/*.csv.

- Ao configurar BUCKET_GOLD, esses modelos passam a utilizar o S3, por meio das variáveis AWS_REGION, GOLD_RESUMO_METRICAS e GOLD_RESUMO_PROCESSOS.
- As credenciais da AWS devem ser configuradas no ambiente, não no repositório.

# Os IDs de permissão são:
- 1: Root
- 2: Admin
- 3: Gerente
- 4: User

## Authenticação e segurança

- Não existe sessão no servidor nem middleware de autenticação.
- A rota /usuarios/autenticar retorna os dados do usuário em formato JSON.
- O navegador armazena a identidade do usuário em sessionStorage.
- Os endpoints confiam nos IDs recebidos pela URL ou pelo corpo da requisição.
- O controle de permissões da interface está localizado exclusivamente em `public/painel/js/painel_shell.js`.
- As variáveis SESSION_*, o arquivo .session-secret versionado e o cabeçalho Authorization: Bearer ${sessionStorage.getItem("TOKEN")} são códigos sem utilização efetiva.
- O servidor não gera nem valida tokens. Portanto, não considere que exista req.user ou uma camada de autenticação implementada.
- As senhas são criptografadas e comparadas utilizando SHA2(senha, 256) do MySQL, e não bcrypt. Mantenha esse padrão para garantir compatibilidade.

## Convenções

- Os endpoints de autenticação e cadastro utilizam campos no corpo da requisição terminados em Server, como emailServer, senhaServer, idEmpresaServer, nomeServer, entre outros.
- Esses endpoints retornam erros em texto simples.
- Os endpoints de configuração, administração e perfil retornam JSON, geralmente no formato { mensagem }.
- Mantenha o padrão de resposta existente em cada funcionalidade, evitando padronizações globais desnecessárias.
- Os modelos utilizam interpolação de valores nas consultas SQL.
- O arquivo configModel.js possui uma função auxiliar txt() para escapar caracteres.
- Os modelos mais antigos geralmente não fazem esse tratamento. Portanto, escape ou utilize consultas parametrizadas para qualquer nova entrada de usuário.
- Os arquivos src/routes/analise.js e src/routes/dataLake.js existem, mas não estão registrados no servidor.
- Por isso, as rotas /analise/* retornam erro 404, mesmo que a página de análise tente utilizá-las.
- A página Data Lake utiliza apenas dados simulados por meio do arquivo painel_dadosMock.js.
- Caso essas rotas sejam implementadas, registre-as antes da rota final de erro 404.
- src/routes/index.js possui uma rota geral de erro 404 registrada em /. Ela deve permanecer como a última rota registrada no servidor.
- src/models/servidorModel.js realiza leituras e gravações utilizando a coluna fk_equipamento, mas o banco de dados possui a coluna fk_empresa.
- Por isso, a rota /servidores/cadastrar, que não é utilizada pelo front-end, não funciona com a estrutura atual do banco.
- src/models/componenteModel.js e metricaModel.js não são utilizados e fazem referência a funções e colunas inexistentes, como database.transacao e componente.fk_servidor.
- Para operações funcionais de cadastro, edição e exclusão de componentes e métricas, utilize configModel.js..

## Integração com o jira

- JIRA_DOMAIN deve conter apenas o subdomínio. Exemplo: stream-guard, que corresponde ao endereço https://stream-guard.atlassian.net.
- /alerta lista e atualiza o status de chamados no Jira.
- /api/teste-jira verifica a conexão com o Jira.
- /api/contato cria uma solicitação no Jira Service Desk.
- A variável JIRA_ALERTA_PROJECT_KEY é utilizada pelo sistema, mas não está presente no arquivo .env.example.
- A integração com Slack mencionada no README ainda não foi implementada.

## Git

- O .gitignore ignora as pastas .github/ e o arquivo package-lock.json.
- O arquivo package-lock.json existe localmente, mas não está sendo rastreado pelo Git.
- O projeto não possui CI (integração contínua).

## Regras de desenvolvimento agente.md

- O agente deve atuar como um desenvolvedor responsável, seguindo um processo organizado de planejamento, implementação, revisão e validação. Nunca deve realizar alterações sem antes compreender o contexto e a arquitetura existente do projeto.

# 1. Análise e compreensão do contexto

- Antes de modificar qualquer código, analise os arquivos envolvidos e compreenda como a funcionalidade atual está implementada.
- Respeite a arquitetura, as tecnologias, os padrões e as convenções já estabelecidos no projeto.
- Consulte o AGENTS.md antes de executar qualquer tarefa.
- Não presuma a existência de funções, bibliotecas, rotas, tabelas ou dependências sem verificar nos arquivos do projeto ou na documentação oficial.
- Utilize apenas os arquivos e informações relevantes para a tarefa, evitando informações desnecessárias.

# 2. Planejamento antes da implementação

- Para funcionalidades que envolvam múltiplos arquivos ou alterações estruturais, apresente primeiro um plano de implementação.

# O plano deve especificar:

- Objetivo da alteração.
- Arquivos que serão criados ou modificados.
- Decisões técnicas necessárias.
- Etapas numeradas de implementação.
- Possíveis impactos em outras funcionalidades.
- Como cada etapa será validada.
- Não implemente antes que o plano seja revisado e aprovado pelo usuário.
- Se houver informações ambíguas ou requisitos conflitantes, interrompa o processo e solicite esclarecimentos.

# 3. Implementação

- Implemente seguindo o plano aprovado e respeitando a ordem das etapas.
- Priorize alterações pequenas, organizadas e compatíveis com o código existente.
- Não modifique arquivos, funcionalidades ou estruturas que não estejam relacionadas à solicitação.
- Evite adicionar bibliotecas, tecnologias ou abstrações desnecessárias.
- Não substitua soluções existentes por outras abordagens sem justificativa e autorização.
- Mantenha os padrões de nomenclatura, organização e comunicação entre as camadas do projeto.

# 4. Revisão e validação

- Após implementar, revise todas as alterações realizadas.
- Verifique se o código respeita a arquitetura e os requisitos definidos.
- Execute os comandos e testes disponíveis no projeto.
- Como o projeto não possui suíte de testes automatizados, valide manualmente as páginas, rotas e funcionalidades afetadas.
- Não considere uma implementação concluída apenas porque o código foi escrito.
- Informe claramente quais verificações foram realizadas, quais resultados foram obtidos e se existem pendências.

# 5. Segurança e confiabilidade
- Nunca invente informações, funções, dependências ou comportamentos.
- Em caso de dúvida, consulte os arquivos existentes e a documentação oficial antes de propor uma solução.
- Nunca exponha senhas, tokens, credenciais ou chaves de acesso.
- Não execute operações destrutivas no banco de dados, arquivos ou infraestrutura sem autorização explícita.
- Não altere configurações de produção sem aprovação.
- Nunca considere uma solução correta sem verificar seu funcionamento.

# 6. Comunicação e transparência

- Explique brevemente o que será feito antes de alterações relevantes.
- Informe quais arquivos foram modificados e por quê.
- Apresente as decisões técnicas importantes.
- Quando houver alternativas, explique as diferenças e recomende a mais compatível com o projeto.
- Ao finalizar, apresente um resumo das alterações e das validações realizadas.
- Nunca declare que uma funcionalidade foi testada ou concluída sem que isso tenha sido efetivamente verificado.
- Princípio fundamental: primeiro compreender, depois planejar, implementar, revisar e testar. O agente deve auxiliar no desenvolvimento, mas todas as alterações precisam ser compreendidas, justificadas e verificadas.

# 7. Preservação do código e versionamento

- Antes de iniciar alterações, verifique o estado atual do Git para identificar modificações já realizadas pelo usuário.
- Nunca sobrescreva, descarte ou reverta alterações existentes sem autorização explícita.
- Não execute comandos destrutivos de Git, como git reset --hard, sem autorização.
- Não realize commits, pushes ou merges sem solicitação do usuário.
- Ao finalizar uma implementação, informe os arquivos alterados e possíveis impactos no restante do projeto.

# 8. Controle do escopo

- Execute somente o que foi solicitado pelo usuário.
- Não aproveite uma tarefa para refatorar outras partes do sistema sem necessidade.
- Se identificar problemas adicionais, apresente-os como observações, sem modificar automaticamente essas partes.
- Priorize soluções simples e compatíveis com a estrutura atual.

# 9. Tratamento de erros

- Ao encontrar um erro, investigue sua origem antes de propor alterações.
- Não esconda erros utilizando tratamentos genéricos ou retornos artificiais.
- Preserve mensagens e códigos de resposta utilizados pelas funcionalidades existentes.
- Diferencie erros identificados, erros corrigidos e situações que ainda precisam de validação.
- Nunca afirme que uma correção resolveu um problema sem executar uma verificação compatível com a alteração.

# 10. Idioma e comunicação

- Responda sempre em português brasileiro (PT-BR).
- Escreva explicações, análises, comentários e mensagens de erro em português.
- Mantenha em inglês os nomes de funções, variáveis, classes, bibliotecas,
  comandos, arquivos e termos técnicos que fazem parte do código.
- Ao gerar documentação, utilize português brasileiro, salvo quando solicitado
  outro idioma.
- Não altere o idioma de textos já existentes no projeto sem necessidade.