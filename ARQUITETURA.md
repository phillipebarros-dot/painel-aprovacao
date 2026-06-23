# Documento de Arquitetura de Software (SAD)
# Painel de Aprovacao de Checking

Grupo OM. Versao 1.0. Data: 23 de junho de 2026.

Este documento descreve a arquitetura completa do sistema, cobrindo o frontend (painel web), o backend (n8n workflows), o banco de dados (BigQuery), o armazenamento de arquivos (Google Drive) e o formulario de coleta (Sistema de Checking). Escrito para que qualquer pessoa consiga entender o que o sistema faz, e para que desenvolvedores consigam dar manutencao.

---

## Sumario

1. Visao Geral do Sistema
2. Componentes Principais
3. Arquitetura do Frontend
4. Arquitetura do Backend (n8n)
5. Banco de Dados (BigQuery)
6. Armazenamento de Arquivos (Google Drive)
7. Sistema de Checking (Formulario do Fornecedor)
8. Fluxo de Dados Completo
9. Autenticacao e Seguranca
10. Deploy e Infraestrutura
11. Mapa de Rotas da API
12. Telas do Painel
13. Regras de Negocio
14. Decisoes Tecnicas
15. Limitacoes Conhecidas
16. Glossario

---

## 1. Visao Geral do Sistema

O Painel de Aprovacao de Checking e um sistema web interno do Grupo OM que permite a equipe de midia auditar e aprovar comprovantes de veiculacao enviados por fornecedores. O fornecedor envia fotos, videos e PDFs pelo formulario (Sistema de Checking). A equipe interna acessa o painel, visualiza os arquivos, e decide se aprova ou reprova cada checking.

O sistema tem quatro partes que trabalham juntas:

```
Fornecedor          Equipe Interna
    |                     |
    v                     v
[Formulario]         [Painel Web]
    |                     |
    v                     v
[n8n Workflow] <-------> [n8n Webhook API]
    |                     |
    v                     v
[Google Drive]       [BigQuery]
(arquivos)           (dados)
```

O formulario coleta os arquivos do fornecedor. O n8n processa, salva no Drive e registra no BigQuery. O painel web consome os dados do BigQuery via API n8n e exibe para a equipe tomar decisoes.

---

## 2. Componentes Principais

| Componente | Tecnologia | Onde roda | Funcao |
|---|---|---|---|
| Painel Web (Frontend) | React 19 + Vite 8 | Google Cloud Run | Interface da equipe interna |
| API Backend | n8n (self-hosted) | Servidor dedicado | Processa requisicoes, orquestra logica |
| Banco de Dados | Google BigQuery | Google Cloud | Armazena checkings, usuarios, logs |
| Armazenamento | Google Drive | Google Cloud | Fotos, videos, PDFs dos fornecedores |
| Formulario | HTML + JS vanilla | Google Cloud Run | Coleta de comprovantes pelos fornecedores |
| IA Copiloto | Gemini 2.0 Flash | Via n8n (Google AI) | Analise automatica de checkings |

---

## 3. Arquitetura do Frontend

### 3.1 Stack Tecnologica

| Item | Valor |
|---|---|
| Framework | React 19.2 (Classic JSX Runtime) |
| Bundler | Vite 8.1 |
| CSS | Vanilla CSS (sem Tailwind) |
| Fontes | Montserrat, Open Sans, JetBrains Mono (Google Fonts) |
| 3D | Three.js (efeito visual na tela de login) |
| Autenticacao | Google Identity Services (GSI) + JWT |
| Hospedagem | Google Cloud Run (container Docker) |
| Servidor | Nginx Alpine |

### 3.2 Estrutura de Arquivos

```
painel-aprovacao/
|
|   index.html              Ponto de entrada HTML
|   package.json            Dependencias Node
|   vite.config.js          Config do Vite (plugins, build)
|   Dockerfile              Build multi-stage (Node + Nginx)
|   nginx.conf              Config do servidor web
|   MANUAL_DO_USUARIO.md    Manual de funcoes
|   ARQUITETURA.md          Este documento
|
|   lib/
|       api.js              Cliente da API (todas as rotas)
|
|   src/
|       main.jsx            Entry point (importa tudo)
|
|       core/
|           data.js         Camada de dados (loadFiles, cache)
|           helpers.js      Funcoes utilitarias (formatacao, datas)
|           intelligence.js Motor de IA local (fallback offline)
|           rules.js        Regras de negocio (validacao, SLA)
|
|       components/
|           ui.jsx          Primitivas: Icon, Pill, Avatar, Button, etc
|           viz.jsx         Graficos: DonutChart, BarChart, SparkLine
|           copilot.jsx     Copiloto IA (analise de checking)
|           shader-login.jsx Efeito 3D da tela de login (Three.js)
|
|       screens/
|           login.jsx       Tela de login (Google SSO + email/senha)
|           dashboard.jsx   Dashboard com KPIs e graficos
|           approvals.jsx   Lista de checkings (tabela principal)
|           review.jsx      Revisao detalhada de um checking
|           triage.jsx      Revisao em sequencia (modo rapido)
|           producao.jsx    Board de producao (kanban)
|           reports.jsx     Relatorios e exportacao
|           alerts.jsx      Alertas e riscos de SLA
|           users.jsx       Gestao de usuarios
|           operations.jsx  Operacoes e configuracoes
|           fornecedores.jsx Lista e classificacao de fornecedores
|           comprovante.jsx Visualizacao de comprovante
|           automacoes.jsx  Configuracao de automacoes
|
|       styles/
|           core.css        Design system (tokens, layout, tema)
|           components.css  Estilos de componentes
|
|       app.jsx             Shell principal (sidebar, roteamento, estado)
```

### 3.3 Como o Frontend Funciona

O frontend e uma SPA (Single Page Application). Toda a logica de roteamento acontece no JavaScript, nao no servidor. O Nginx serve o index.html para qualquer rota e o React decide qual tela mostrar.

O arquivo main.jsx e o ponto de entrada. Ele importa tudo na ordem correta:

1. CSS (core.css e components.css)
2. React, ReactDOM e Three.js ficam globais (window.React, window.THREE)
3. Core: data.js, helpers.js, intelligence.js, rules.js
4. API: api.js fica global como window.PainelAPI
5. Components: ui.jsx, viz.jsx, copilot.jsx, shader-login.jsx
6. Screens: todas as telas
7. Shell: app.jsx (componente raiz que renderiza tudo)

Os componentes se comunicam via window global. Cada tela exporta para window (ex: window.ScreenDashboard). O app.jsx controla qual tela esta ativa e passa dados como props.

### 3.4 Design System

O design usa CSS puro com variaveis CSS (custom properties). O tema suporta modo claro e escuro:

| Variavel | Funcao |
|---|---|
| --bg | Cor de fundo principal |
| --surface-1, --surface-2 | Superficies elevadas |
| --ink, --ink-2, --ink-3 | Cores de texto (primario, secundario, terciario) |
| --accent | Cor principal de acao (verde/teal) |
| --alert | Cor de erro (vermelho) |
| --warn | Cor de aviso (amarelo) |
| --rule | Cor de bordas e divisores |
| --font-body | Open Sans |
| --font-display | Montserrat |
| --font-mono | JetBrains Mono |

### 3.5 Estado da Aplicacao

O estado e gerenciado de tres formas:

1. React useState/useEffect: estado local de cada tela (dados carregados, filtros ativos, modais abertos).
2. localStorage: persistencia de sessao (token JWT, notas internas, links de reanexar, rating de fornecedor, tema).
3. API (BigQuery via n8n): fonte de verdade para todos os dados de negocio (checkings, usuarios, arquivos).

Nao ha gerenciamento de estado global (nao usa Redux, Context API, nem Zustand). Cada tela carrega seus dados da API quando monta.

### 3.6 Vite Config

O Vite tem um plugin customizado chamado `injectReactImport` que adiciona automaticamente `import React from 'react'` em todo arquivo .jsx que usa React sem importar explicitamente. Isso permite que os componentes usem React.useState sem precisar de import no topo de cada arquivo.

O build produz tres chunks separados:

| Chunk | Conteudo |
|---|---|
| vendor | React + ReactDOM |
| three | Three.js (efeito de login) |
| index | Todo o codigo da aplicacao |

---

## 4. Arquitetura do Backend (n8n)

### 4.1 O que e o n8n

O n8n e uma plataforma de automacao que funciona como o "cerebro" do sistema. Ele recebe requisicoes HTTP do frontend, processa a logica, consulta o BigQuery, e retorna dados. Roda self-hosted no servidor do Grupo OM.

### 4.2 Como funciona

Existe um unico webhook no n8n que recebe TODAS as requisicoes do painel:

```
POST https://n8n.grupoom.com.br/webhook/painel-aprovacao
```

Cada requisicao inclui um campo `action` que indica o que o frontend quer fazer. Um node Switch no n8n roteia a requisicao para o fluxo correto com base nesse action.

Exemplo de requisicao:
```json
{
  "action": "get_pending",
  "token": "eyJhbGciOiJIUzI1..."
}
```

### 4.3 Mapa Completo de Rotas (39 actions)

#### Rotas de Dados (consulta)

| Action | O que faz | Quem usa |
|---|---|---|
| get_stats | Retorna KPIs (pendentes, aprovados, reprovados, SLA) | Dashboard |
| get_pending | Lista checkings pendentes | Approvals, Triage |
| get_all_checkings | Lista todos os checkings sem filtro | Approvals |
| get_checkings | Lista checkings com filtros (periodo, status, meio) | Approvals |
| get_files | Busca arquivos (imagens) de um checking pelo submission_id | Review, Triage |
| get_users | Lista todos os usuarios do painel | Users |
| get_online_users | Lista usuarios conectados agora (heartbeat) | Sidebar |
| get_notifications | Busca notificacoes do usuario | App |
| get_security_alerts | Lista alertas de seguranca | Alerts |
| get_suppliers | Lista fornecedores com classificacao | Fornecedores |
| get_history | Historico de acoes de um PI | Review |
| get_responsaveis | Lista responsaveis atribuidos no mes | Producao |
| get_sla_config | Le configuracao de SLA | Operations |
| get_production_board | Dados do board de producao | Producao |
| get_automations | Lista automacoes configuradas | Automacoes |
| get_alerts | Lista alertas operacionais | Alerts |
| get_slide_options | Opcoes para geracao de slides | Reports |

#### Rotas de Acao (escrita)

| Action | O que faz | Quem usa |
|---|---|---|
| approve | Aprova um checking (atualiza status no BigQuery) | Review, Triage |
| reject | Reprova um checking (atualiza status + registra motivo) | Review, Triage |
| login | Autentica com email e senha, retorna JWT | Login |
| login_sso | Autentica com token Google, retorna JWT | Login |
| logout | Invalida sessao | App |
| register_user | Cria novo usuario | Users |
| update_user_role | Altera perfil de acesso (admin/analyst/viewer) | Users |
| update_user_status | Ativa/desativa usuario | Users |
| assign_responsible | Atribui responsavel a um PI | Producao |
| add_comment | Adiciona comentario a um checking | Review |
| set_supplier_rating | Classifica fornecedor (1 a 5 estrelas) | Fornecedores |
| update_checking_status | Altera status de checking (reverter decisao) | Review |
| save_sla_config | Salva configuracao de SLA | Operations |
| toggle_automation | Liga/desliga uma automacao | Automacoes |
| resubmit_checking | Reabre checking para novo envio | Review |
| generate_slides | Gera apresentacao de slides | Reports |
| upload_supplement | Recebe arquivo suplementar (FormData binario) | Review |
| distribute_demands | Distribui demandas entre equipe | Producao |
| export_pdf | Exporta relatorio em PDF | Reports |
| heartbeat | Registra que o usuario esta online | App (automatico) |
| health_check | Verifica se a API esta funcionando | App (automatico) |
| log_security_event | Registra evento de seguranca | App (automatico) |

#### Rota de IA

| Action | O que faz | Quem usa |
|---|---|---|
| copilot_analyze | Envia checking para analise do Gemini 2.0 Flash | Copilot |

O copiloto do Gemini recebe os dados do checking, consulta historico do fornecedor no BigQuery, e retorna uma analise estruturada com score (0 a 100), recomendacao (APROVAR/REVISAR/REJEITAR), nivel de confianca, resumo e riscos identificados.

### 4.4 Fluxo de Aprovacao no n8n

Quando o frontend envia `action: approve`:

1. O n8n valida o token JWT
2. Busca os dados do checking no BigQuery
3. Atualiza o status para "approved" no BigQuery
4. Registra quem aprovou e quando
5. Retorna confirmacao para o frontend

Quando envia `action: reject`:

1. Valida token
2. Busca dados do checking
3. Atualiza status para "rejected"
4. Registra motivo da reprovacao
5. Envia notificacao por email ao fornecedor (se configurado)
6. Retorna confirmacao

---

## 5. Banco de Dados (BigQuery)

### 5.1 Tabelas Principais

| Tabela | O que guarda |
|---|---|
| checkings | Todos os checkings recebidos (PI, cliente, veiculo, meio, status, datas) |
| checking_files | Arquivos associados a cada checking (URLs do Drive, metadados) |
| users | Usuarios do painel (nome, email, senha hash, perfil, status) |
| copilot_decisions | Log de analises feitas pelo Gemini (score, recomendacao, riscos) |
| checking_comments | Comentarios internos por PI |
| checking_logs | Historico de acoes (aprovacoes, reprovacoes, reaberturas) |
| pi_responsaveis | Atribuicao de responsavel por PI e mes |
| supplier_ratings | Classificacao de fornecedores |
| sla_config | Configuracoes de SLA |
| security_events | Log de eventos de seguranca |
| online_sessions | Sessoes ativas (heartbeat) |
| automations | Configuracao de automacoes |

### 5.2 Campos Importantes da Tabela checkings

| Campo | Tipo | Descricao |
|---|---|---|
| submission_id | STRING | Identificador unico do envio |
| n_pi | STRING | Numero do PI (Pedido de Insercao) |
| cliente | STRING | Nome do cliente |
| veiculo | STRING | Veiculo de midia (ex: TV Globo, Outdoor) |
| meio | STRING | Codigo do tipo de midia (OD, FL, DO, TV, RD, etc) |
| praca | STRING | Cidade/regiao da veiculacao |
| status | STRING | pending, approved, rejected |
| submittedAt | TIMESTAMP | Data/hora do envio |
| approval_user | STRING | Quem aprovou/reprovou |
| approval_date | TIMESTAMP | Quando foi aprovado/reprovado |
| rejection_reason | STRING | Motivo da reprovacao |
| total_arquivos | INTEGER | Quantidade de arquivos enviados |
| nome_contato | STRING | Nome do contato do fornecedor |
| email_contato | STRING | Email do contato |
| observacoes | STRING | Observacao livre do fornecedor |
| is_complement | INTEGER | 1 se e envio complementar, 0 se e original |
| rejection_count | INTEGER | Quantas vezes foi reprovado |
| webViewLink | STRING | Link direto para a pasta no Google Drive |

---

## 6. Armazenamento de Arquivos (Google Drive)

Todos os arquivos enviados pelo fornecedor (fotos, videos, PDFs) sao salvos no Google Drive. Cada PI tem sua propria pasta. A estrutura e:

```
Drive Grupo OM/
    Checking/
        [Ano]/
            [Mes]/
                PI_[numero]_[cliente]/
                    foto_perto_end_001.jpg
                    foto_longe_end_001.jpg
                    video_diurno_end_001.mp4
                    relatorio_veiculacao.pdf
```

O painel acessa os arquivos via API do Google Drive (usando links thumbnailUrl e webViewLink retornados pelo BigQuery).

---

## 7. Sistema de Checking (Formulario do Fornecedor)

### 7.1 O que e

O Sistema de Checking e um formulario web separado do painel. Os fornecedores acessam esse formulario para enviar os comprovantes de veiculacao. Roda em outro repositorio (phillipebarros-dot/Sistema-de-Cheking) e tem sua propria infraestrutura.

### 7.2 Regras de Upload por Tipo de Midia

O formulario muda dinamicamente conforme o tipo de midia (meio). Cada meio tem regras especificas do que o fornecedor precisa enviar:

| Meio | Codigo | Arquivos Obrigatorios |
|---|---|---|
| Outdoor | OD | Foto de perto (1) + Foto de longe (1) por endereco. Se iluminado: foto noturna |
| Frontlight/Gigadoor | FL | Foto de perto (1) + Foto de longe (1) + Foto noturna (1) por endereco |
| DOOH/Painel LED | DO | Foto de perto (1) + Foto de longe (1) por endereco. Video diurno opcional. Ou: relatorio de exibicoes + fotos amostrais (indoor) |
| TV | TV | Relatorio de veiculacao automatizado |
| Radio | RD | Relatorio de veiculacao + Audios da campanha (opcional) + Videos (opcional) |
| Internet/Digital | IN | Relatorio de veiculacao + Prints das pecas |
| Jornal | JO | Material impresso (PDF ou foto) |
| Revista | RV | PDF da revista ou foto (capa + pagina) |
| Metro | MT | Relatorio com estacoes/linhas/carros + Fotos ou videos amostrais |
| Midia Externa | ME | Relatorio com endereco dos pontos + Fotos diurnas amostrais |
| Midia Interna | MN | Relatorio fotografico de todos os pontos + Relacao de locais |
| Assessoria | AS | Clipping de midia + Relatorio de resultados |

### 7.3 Fluxo de Duas Etapas

Alguns meios (DOOH principalmente) exigem dois envios separados:

Etapa 1: Enviar fotos dos enderecos (foto de perto + foto de longe por endereco)
Etapa 2: Enviar relatorio de veiculacao em PDF (apos o periodo de campanha encerrar)

O fornecedor seleciona qual etapa esta enviando. O sistema trata cada envio de forma independente.

### 7.4 Enderecos OOH

Para meios de midia exterior (OD, FL, DO), o sistema puxa uma lista de enderecos cadastrados no PI. Cada endereco precisa de seus proprios arquivos. O formulario gera um card por endereco, e o fornecedor preenche foto de perto e foto de longe para cada um.

Exemplo: um PI com 15 outdoors gera 15 cards de endereco, e o fornecedor precisa enviar 30 fotos (2 por endereco).

---

## 8. Fluxo de Dados Completo

### 8.1 Do Fornecedor ate a Aprovacao

```
1. Fornecedor acessa o formulario web
2. Busca o PI pelo numero
3. O formulario consulta o n8n, que busca dados do PI no BigQuery
4. O n8n retorna: cliente, veiculo, meio, enderecos (se OOH)
5. O formulario renderiza os campos de upload conforme o meio
6. Fornecedor seleciona arquivos e envia
7. O n8n recebe os binarios via webhook
8. O n8n cria pasta no Google Drive (se nao existe)
9. O n8n faz upload dos arquivos para o Drive
10. O n8n registra no BigQuery: submission_id, metadados, URLs dos arquivos
11. O n8n atualiza o status para "pending"
```

### 8.2 Da Equipe Decidindo

```
1. Analista acessa o painel web
2. Faz login com Google SSO
3. O painel chama get_pending no n8n
4. O n8n consulta BigQuery e retorna lista de checkings pendentes
5. Analista clica em um checking
6. O painel chama get_files com o submission_id
7. O n8n consulta BigQuery e retorna URLs dos arquivos
8. O painel renderiza as fotos/videos/PDFs
9. Analista analisa os arquivos
10. Analista decide: aprovar ou reprovar
11. O painel chama approve ou reject no n8n
12. O n8n atualiza o BigQuery
13. Se reprovado: o n8n pode enviar email ao fornecedor
```

### 8.3 Diagrama de Sequencia

```
Fornecedor        Formulario       n8n              BigQuery         Drive
    |                 |              |                  |               |
    |--- abre ------->|              |                  |               |
    |                 |-- busca PI ->|                  |               |
    |                 |              |--- SELECT PI --->|               |
    |                 |              |<-- dados PI -----|               |
    |                 |<- renderiza -|                  |               |
    |--- envia ------>|              |                  |               |
    |                 |-- FormData ->|                  |               |
    |                 |              |--- upload ------>|-------------->|
    |                 |              |--- INSERT ------>|               |
    |                 |              |<-- ok ---------- |               |
    |                 |<- sucesso ---|                  |               |
    |                 |              |                  |               |
Analista          Painel           n8n              BigQuery         Drive
    |                 |              |                  |               |
    |--- login ------>|              |                  |               |
    |                 |-- login_sso->|                  |               |
    |                 |<- JWT -------|                  |               |
    |                 |-- pending -->|                  |               |
    |                 |              |--- SELECT ------>|               |
    |                 |<- lista -----|                  |               |
    |--- abre PI ---->|              |                  |               |
    |                 |-- get_files->|                  |               |
    |                 |              |--- SELECT ------>|               |
    |                 |<- URLs ------|                  |               |
    |                 |--- img src ->|                  |               |  
    |                 |              |                  |               |
    |--- aprova ----->|              |                  |               |
    |                 |-- approve -->|                  |               |
    |                 |              |--- UPDATE ------>|               |
    |                 |<- ok --------|                  |               |
```

---

## 9. Autenticacao e Seguranca

### 9.1 Fluxo de Login

O painel suporta dois metodos de autenticacao:

Google SSO (principal): O usuario clica em "Entrar com Google". O Google retorna um token ID. O frontend envia esse token para o n8n (action: login_sso). O n8n valida o token com a API do Google, verifica se o email esta cadastrado no BigQuery, e retorna um JWT proprio.

Email e senha (alternativo): O usuario digita email e senha. O frontend envia para o n8n (action: login). O n8n verifica no BigQuery e retorna JWT se correto.

### 9.2 Token JWT

O JWT e armazenado no localStorage (chave: painel_token). Toda requisicao ao n8n inclui o token no corpo da mensagem. O n8n valida o token antes de processar qualquer action.

### 9.3 Heartbeat

A cada 60 segundos, o frontend envia um heartbeat ao n8n. Isso registra que o usuario esta online e atualiza a lista de usuarios conectados que aparece na sidebar.

### 9.4 Inatividade

Apos 15 minutos sem interacao (clique, tecla, scroll), o painel faz logout automatico e redireciona para a tela de login.

### 9.5 Perfis de Acesso

| Perfil | Pode aprovar/reprovar | Pode gerenciar usuarios | Pode ver operacoes | Pode ver tudo |
|---|---|---|---|---|
| Admin | Sim | Sim | Sim | Sim |
| Analyst | Sim | Nao | Nao | Sim (exceto config) |
| Viewer | Nao | Nao | Nao | Somente leitura |

---

## 10. Deploy e Infraestrutura

### 10.1 Build

O build usa um Dockerfile multi-stage:

Estagio 1 (Node): Instala dependencias, executa `vite build`, gera a pasta dist/ com HTML, JS e CSS otimizados.

Estagio 2 (Nginx): Copia a pasta dist/ para o Nginx, aplica a configuracao nginx.conf, e serve na porta 8080.

### 10.2 Nginx

O nginx.conf tem tres regras importantes:

1. index.html NUNCA e cacheado (no-cache, no-store, must-revalidate). Isso garante que apos cada deploy, o browser busque o HTML novo que aponta para os chunks JS atualizados.

2. Assets (JS, CSS, imagens) com hash no nome tem cache de 1 ano (immutable). Como o Vite gera nomes com hash de conteudo (ex: index-A3f2B9d.js), se o conteudo muda o hash muda e o browser baixa o novo.

3. SPA fallback: qualquer rota que nao corresponda a um arquivo estatico retorna index.html. Isso permite que o React gerencie o roteamento no cliente.

### 10.3 Cloud Run

O container e deployado no Google Cloud Run. O Cloud Run escala automaticamente de 0 a N instancias conforme a demanda. Cada instancia escuta na porta 8080.

### 10.4 Repositorio

| Repositorio | URL | Conteudo |
|---|---|---|
| Painel de Aprovacao | github.com/phillipebarros-dot/painel-aprovacao | Este projeto (frontend) |
| Sistema de Checking | github.com/phillipebarros-dot/Sistema-de-Cheking | Formulario do fornecedor |

---

## 11. Mapa de Rotas da API

Todas as rotas usam o mesmo endpoint:

```
POST https://n8n.grupoom.com.br/webhook/painel-aprovacao
Content-Type: application/json
Body: { "action": "nome_da_acao", "token": "jwt...", ...params }
```

O cliente da API esta em lib/api.js. Ele exporta um objeto PainelAPI com metodos para cada rota. Exemplo:

```javascript
PainelAPI.getPending()        // action: get_pending
PainelAPI.approve(id, user)   // action: approve, id + approval_user
PainelAPI.getFiles(sid)       // action: get_files, submission_id
```

O metodo `call()` interno adiciona o token automaticamente e trata erros.

Para upload de arquivos binarios (reanexar no review), o metodo `uploadSupplement()` envia FormData diretamente via fetch (nao usa JSON).

---

## 12. Telas do Painel

### 12.1 Login (login.jsx)

Tela de entrada com dois metodos de autenticacao. Tem um efeito 3D com particulas (Three.js) no fundo. O botao principal e "Entrar com Google" que usa a biblioteca GSI do Google.

### 12.2 Dashboard (dashboard.jsx)

Visao operacional com quatro KPIs no topo (pendentes, aprovados, reprovados, SLA medio). Abaixo, graficos de donut mostrando distribuicao por status e graficos de barra mostrando volume por periodo. Filtros de periodo: 7 dias, 30 dias, 90 dias, personalizado.

### 12.3 Approvals (approvals.jsx)

Tabela principal com todos os checkings. Colunas: PI, cliente, veiculo, meio, praca, recebido, status, quem decidiu. Suporta filtros por status, periodo, busca textual, e ordenacao por qualquer coluna. Tem modo tabela e modo cards.

### 12.4 Review (review.jsx)

Tela de revisao detalhada de um checking especifico. Mostra:

Na area principal:
Todos os arquivos agrupados por endereco. Cada arquivo tem thumbnail clicavel que abre lightbox em tela cheia. Para meios OOH (OD, FL, DO), mostra tags de completude por endereco (foto perto OK, foto longe faltando, etc).

Na sidebar direita:
Botoes de aprovacao (aprovar, reprovar, liberar sem checking).
Rating do fornecedor (1 a 5 estrelas, salvo em localStorage).
Notas internas (comentarios da equipe, salvos em localStorage e sincronizados via API).
Secao de uso interno: colar link do Drive e reanexar arquivos. Os botoes de reanexar mudam conforme o tipo de midia do checking (cada meio tem seus proprios tipos de arquivo aceitos).

### 12.5 Triage (triage.jsx)

Modo de revisao rapida em sequencia. Mostra um checking por vez em modal fullscreen. Decisao por teclado: A para aprovar, R para reprovar, S para pular, setas para navegar. Mostra progresso (ex: 45/1770), contagem de aprovados/reprovados/pulados. Ao final, mostra resumo da sessao.

### 12.6 Producao (producao.jsx)

Board de producao tipo kanban. Mostra PIs organizados por responsavel e status. Permite arrastar PIs entre colunas. Tem filtros por mes de referencia. Permite atribuir responsavel a um PI.

### 12.7 Alerts (alerts.jsx)

Lista de alertas operacionais. Mostra checkings que estao proximo de estourar o SLA, checkings reprovados multiplas vezes, fornecedores com taxa de reprovacao alta, e alertas de seguranca (tentativas de login suspeitas).

### 12.8 Reports (reports.jsx)

Exportacao de relatorios em CSV, PDF e slides (Google Slides). Filtros por periodo, cliente, veiculo, meio, status.

### 12.9 Users (users.jsx)

Gestao de usuarios do painel. Listar, criar, editar perfil (admin/analyst/viewer), ativar/desativar. Mostra status online (quem esta conectado agora).

### 12.10 Operations (operations.jsx)

Configuracoes operacionais. Definir meta de SLA, configurar limites de alerta, ajustes de prazo.

### 12.11 Fornecedores (fornecedores.jsx)

Lista de fornecedores (veiculos de midia) com classificacao por estrelas, taxa de aprovacao, tempo medio de resposta. Clicavel para ver historico de checkings daquele fornecedor.

### 12.12 Automacoes (automacoes.jsx)

Configuracao de automacoes: aprovacao automatica para fornecedores com alta taxa historica, notificacoes automaticas por email, lembrete de SLA.

---

## 13. Regras de Negocio

### 13.1 SLA

O SLA padrao e de 4 horas entre o recebimento do checking e a decisao. O dashboard mostra o SLA medio. Checkings que ultrapassam o SLA aparecem em amarelo nos alertas.

### 13.2 Complemento

Quando um checking e reprovado, o fornecedor pode enviar um complemento. O complemento e um novo envio vinculado ao mesmo PI. O campo is_complement indica se e complemento. O campo rejection_count mostra quantas vezes o PI foi reprovado.

### 13.3 Tipos de Arquivo Aceitos

Imagens: JPG, JPEG, PNG, HEIC
Videos: MP4, MOV, AVI, WEBM
Documentos: PDF
Planilhas: XLSX, XLS, CSV (em alguns meios)
Audios: MP3, M4A, WAV, OGG, AAC, WMA (apenas Radio)
Compactados: ZIP (relatorios com muitos arquivos)

### 13.4 Completude OOH

Para meios de midia exterior, o painel verifica se cada endereco tem todos os arquivos obrigatorios. Tags verdes indicam arquivo presente, vermelhas indicam faltante. A verificacao e feita pelo tag/detalhe do arquivo comparado com os tipos obrigatorios do meio.

### 13.5 Reanexar (Uso Interno)

A equipe interna pode reanexar arquivos no review sem precisar pedir ao fornecedor. Isso e util quando o fornecedor envia por WhatsApp ou email e a equipe precisa registrar no sistema. Os botoes de reanexar mudam conforme o meio: OD mostra "Foto perto/longe/noturna", TV mostra "Relatorio veiculacao", RD mostra "Relatorio/Foto/Video" e habilita audio.

---

## 14. Decisoes Tecnicas

### 14.1 Por que n8n e nao um backend tradicional?

O n8n permite alterar a logica de negocio sem precisar de deploy. O time de operacoes pode ajustar fluxos diretamente na interface visual do n8n. Isso acelera iteracoes e reduz dependencia do time de desenvolvimento.

### 14.2 Por que React sem framework (Next.js, Remix)?

O painel e uma SPA pura servida por CDN/Nginx. Nao precisa de SSR (Server Side Rendering) porque e um sistema interno, nao precisa de SEO, e todos os dados vem da API. React puro com Vite e a forma mais leve e rapida de servir isso.

### 14.3 Por que CSS vanilla e nao Tailwind?

Controle total sobre o design system. O CSS usa variaveis nativas com suporte a temas (claro/escuro) sem dependencia de build de CSS. O arquivo de estilos e grande mas previsivel.

### 14.4 Por que BigQuery e nao PostgreSQL?

O BigQuery ja faz parte da infraestrutura do Grupo OM para analytics. Usar a mesma plataforma simplifica integracao com outros sistemas de dados da empresa. O volume de dados nao justifica um banco transacional dedicado.

### 14.5 Por que Google Drive e nao S3/GCS?

Os fornecedores ja usam o Drive no dia a dia. A equipe interna precisa acessar as pastas diretamente para verificacao manual. O Drive permite compartilhamento facil e organizacao por pastas familiar para usuarios nao tecnicos.

---

## 15. Limitacoes Conhecidas

### 15.1 Estado Global

Nao ha gerenciador de estado global. Cada tela carrega seus dados independentemente. Isso pode causar dados desatualizados se o usuario ficar em uma tela por muito tempo sem navegar.

### 15.2 Cache de Navegador

O index.html agora tem no-cache no Nginx, mas se o CDN ou proxy intermediario cachear, pode servir chunks antigos. O index.html tambem tem meta tags de no-cache como fallback.

### 15.3 Upload de Suplemento

O endpoint upload_supplement esta implementado no frontend (envia FormData binario) mas a rota no n8n precisa ser configurada para receber binarios, salvar no Drive e registrar no BigQuery. Sem essa rota, os uploads sao registrados apenas como comentarios locais.

### 15.4 Copiloto IA

O n8n tem o pipeline completo do Gemini 2.0 Flash, mas o frontend usa uma heuristica local (intelligence.js) como fallback. A integracao completa com o Gemini real esta parcialmente implementada.

### 15.5 Fotos do Formulario na Triagem

O loadFiles pode retornar vazio para alguns checkings se o get_files do n8n nao encontrar registros no BigQuery. Nesses casos, o painel mostra um card com link direto para a pasta no Drive como fallback.

---

## 16. Glossario

| Termo | Significado |
|---|---|
| PI | Pedido de Insercao. Documento que autoriza a veiculacao de uma campanha |
| Checking | Comprovante de veiculacao enviado pelo fornecedor |
| Meio | Tipo de midia (OD = Outdoor, FL = Frontlight, DO = DOOH, TV, RD = Radio, etc) |
| Veiculo | Empresa de midia (ex: TV Globo, Rede Atlantica, Eletromidia) |
| Praca | Cidade ou regiao onde a campanha veiculou |
| SLA | Service Level Agreement. Tempo maximo para analisar um checking |
| OOH | Out of Home. Midia exterior (outdoors, paineis, frontlights) |
| DOOH | Digital Out of Home. Paineis digitais/LED |
| SSO | Single Sign On. Login unico com conta Google |
| JWT | JSON Web Token. Token de autenticacao |
| n8n | Plataforma de automacao (pronuncia-se "n-eight-n") |
| BigQuery | Banco de dados analitico do Google Cloud |
| Cloud Run | Servico de containers do Google Cloud |
| Vite | Ferramenta de build para aplicacoes web |
| Nginx | Servidor web que serve os arquivos estaticos |
| FormData | Formato de envio de arquivos binarios via HTTP |
| Heartbeat | Sinal periodico que indica que o usuario esta online |
| Lightbox | Visualizacao de imagem/video em tela cheia |
| Triage | Modo de revisao rapida em sequencia |
