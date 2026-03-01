# Painel de Aprovacao - Grupo OM
*(Criador: Phillipe)*

Sistema interno de aprovacao de checkings para o departamento de Midia do Grupo OM. Desenvolvido com frontend HTML/CSS/JS puro e backend n8n conectado ao Google BigQuery, Google Drive e servidor SMTP para notificacoes por email.

---

## Sumario

1. [Visao Geral](#visao-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Tecnologias Utilizadas](#tecnologias-utilizadas)
4. [Estrutura de Arquivos](#estrutura-de-arquivos)
5. [Frontend -- Paginas e Modulos](#frontend----paginas-e-modulos)
6. [Backend -- Workflow n8n](#backend----workflow-n8n)
7. [Esquema do Banco de Dados (BigQuery)](#esquema-do-banco-de-dados-bigquery)
8. [Seguranca e Autenticacao](#seguranca-e-autenticacao)
9. [Configuracao e Deploy](#configuracao-e-deploy)
10. [Processo de Desenvolvimento][def]

---

## Visao Geral

O Painel de Aprovacao e uma aplicacao web interna desenvolvida para gerenciar o fluxo de aprovacao de checkings de midia. Checkings sao registros de veiculacao de campanhas publicitarias que precisam ser revisados e aprovados (ou reprovados) por analistas internos antes de serem finalizados.

O sistema permite:
- Login com autenticacao JWT
- Dashboard com KPIs em tempo real (total, pendentes, aprovados, reprovados)
- 6 graficos interativos (distribuicao, timeline, volume por cliente, ranking, veiculos, status por cliente)
- Tabela paginada com filtros e busca textual
- Aprovacao e reprovacao com modal confirmatorio e campo de responsavel/motivo
- Visualizacao de arquivos do Google Drive organizados por endereco
- Geracao de relatorio PDF de auditoria
- Gerenciamento de usuarios (cadastro, troca de role, ativar/desativar)
- Log de auditoria com todas as acoes registradas
- Tema claro e escuro com transicao automatica
- Auto-refresh a cada 60 segundos

---

## Arquitetura do Sistema

```
+-------------------+       HTTPS/POST        +-------------------+
|                   | --------------------->   |                   |
|   Frontend        |   JSON + JWT Bearer      |   n8n Workflow    |
|   (HTML/CSS/JS)   | <---------------------  |   (Backend)       |
|                   |       JSON Response      |                   |
+-------------------+                          +--------+----------+
                                                        |
                                      +-----------------+-----------------+
                                      |                 |                 |
                              +-------v------+  +-------v------+  +------v-------+
                              |   BigQuery   |  | Google Drive |  |    SMTP      |
                              |   (Dados)    |  |  (Arquivos)  |  |   (Email)    |
                              +--------------+  +--------------+  +--------------+
```

O frontend se comunica com o backend exclusivamente atraves de requisicoes POST para um unico endpoint webhook. Cada requisicao inclui um campo `action` que determina qual operacao sera executada. O token JWT e enviado no header `Authorization: Bearer <token>`.

O backend n8n recebe a requisicao, roteia internamente pela acao solicitada, escuta no BigQuery ou Google Drive conforme necessario, e retorna a resposta em JSON.

---

## Tecnologias Utilizadas

### Frontend
- **HTML5** -- Estrutura semantica, paginas independentes (index.html, dashboard.html, review.html)
- **CSS3** -- Design system customizado com CSS Custom Properties, tema dark/light, variaveis de cor, tipografia, e componentes reutilizaveis
- **JavaScript ES6+** -- Modulos IIFE (Immediately Invoked Function Expression) para encapsulamento. Nenhum framework. Nenhum bundler.
- **Google Charts** -- 6 tipos de graficos (PieChart, AreaChart, ComboChart, BarChart com orientacao horizontal)
- **SweetAlert2** -- Modais customizados para aprovacao, reprovacao, visualizacao de arquivos e notificacoes toast
- **jsPDF** -- Geracao de relatorio PDF de auditoria no client-side
- **Google Fonts** -- Inter (corpo de texto), JetBrains Mono (monospace/codigo), Material Symbols Outlined (icones)

### Backend
- **n8n** -- Plataforma de automacao no-code/low-code hospedada em `n8n.grupoom.com.br`
- **Google BigQuery** -- Banco de dados anamitico da Google Cloud, utilizado como storage principal para checkings e usuarios
- **Google Drive API** -- Acesso aos arquivos de checkings organizados em pastas por submission
- **SMTP** -- Envio de emails de notificacao quando um checking e reprovado (alertando o fornecedor)
- **JSON Web Tokens (JWT)** -- Implementacao customizada de autenticacao com HMAC-SHA256

### Design System
- **Tipografia**: Inter (sans-serif), JetBrains Mono (mono)
- **Tema Dark**: Background #000000, cards #050505, bordas #1a1a1a -- estetica tecnica e minimalista
- **Tema Light**: Background #f0f2f5, cards #ffffff, bordas #e2e8f0 -- limpo e profissional
- **Raio de Borda**: 0px em todos os componentes (estetica quadrada intencional)
- **Cores de Acento**: Azul #2563eb, Verde #22c55e, Vermelho #ef4444, Amber #f59e0b, Roxo #8b5cf6

---

## Estrutura de Arquivos

```
painel/
  index.html              -- Pagina de login (autenticacao)
  dashboard.html          -- Dashboard principal (KPIs, graficos, tabela, usuarios)
  review.html             -- Pagina de review detalhado de um checking
  assets/
    css/
      styles.css          -- Design system completo (1900+ linhas)
    js/
      api.js              -- Cliente HTTP centralizado com JWT
      auth.js             -- Login, registro e verificacao de sessao
      charts.js           -- 6 graficos Google Charts com tema responsivo
      dashboard.js        -- Inicializacao, KPIs, navegacao e auto-refresh
      approvals.js        -- Tabela de checkings, modais, filtros e paginacao
      users.js            -- CRUD de usuarios com cards e modais
      pdf-export.js       -- Geracao de relatorio PDF de auditoria com jsPDF
    img/                  -- Imagens e assets visuais
```

---

## Frontend -- Paginas e Modulos

### index.html (Pagina de Login)

Pagina de entrada do sistema com layout de duas colunas:
- **Painel esquerdo**: Branding do Grupo OM com tagline e informacoes
- **Painel direito**: Formulario de login com email e senha, e opcao de registro

Funcionalidades:
- Toggle entre modo login e modo registro
- Validacao de campos obrigatorios
- Feedback visual com loading spinner e mensagens de erro/sucesso
- Redirecionamento automatico para o dashboard apos login bem-sucedido
- Toggle de tema claro/escuro

### dashboard.html (Dashboard Principal)

Pagina central do sistema dividida em 3 secoes navegaveis:

**Secao Dashboard:**
- 4 KPIs principais: Total de Registros, Pendentes, Aprovados, Reprovados
- 4 KPIs avancados: Taxa de Aprovacao (gauge SVG circular), Veiculos Distintos, Top Veiculo, Proporcao de Complementos
- 6 graficos interativos com animacao e tema responsivo
- Log de auditoria com busca textual
- Botao "Gerar Relatorio PDF" que produz documento de auditoria completo

**Secao Aprovacoes:**
- Tabela paginada (15 por pagina) com todas as colunas: ID, Cliente, PI, Veiculo, Meio, Tipo, Pasta (Drive), Status, Reprovacoes, Responsavel, Acoes
- Filtros por tab: Todos, Pendentes, Aprovados, Reprovados
- Busca textual por cliente, PI, veiculo ou responsavel
- Link para review detalhado de cada checking
- Badge de contagem de pendentes

**Secao Usuarios:**
- Grid de cards com avatar (iniciais), nome, email, status e role
- Select inline para troca de role (admin, manager, analyst)
- Botao de ativar/desativar usuario
- Modal de cadastro de novo usuario

### review.html (Review Detalhado)

Pagina dedicada ao review detalhado de um checking especifico:
- Header com busca e controles
- Sidebar com navegacao e filtros
- Area principal com metadados do checking
- Grid de assets (imagens, videos, documentos) do Google Drive
- Botoes de acao: Aprovar e Reprovar com modais confirmatorios

### Modulos JavaScript

| Modulo | Arquivo | Responsabilidade |
|---|---|---|
| API | api.js | Cliente HTTP centralizado. Todas as chamadas ao backend passam por `API.call(action, body)`. Gerencia token JWT, detecta expiracao, e trata erros de rede. |
| Auth | auth.js | Formularios de login e registro, verificacao de sessao (`checkSession`), e menu do usuario no header. |
| Charts | charts.js | 6 graficos Google Charts: pizza (distribuicao), area (timeline), combo (volume + media), barra (ranking), donut (veiculos), barra empilhada (status por cliente). Suporta tema dark/light e resize. |
| Dashboard | dashboard.js | Orquestracao central: inicializa todos os modulos, carrega dados em paralelo, atualiza KPIs com animacao, controla navegacao entre abas, gerencia tema e auto-refresh (60s). |
| Approvals | approvals.js | Tabela de checkings com filtros, paginacao, busca, modais de aprovacao/reprovacao (SweetAlert2), visualizacao de arquivos do Drive e log de auditoria. |
| Users | users.js | Grid de cards de usuarios, troca de role, toggle de status, e modal de registro. |
| PDF Export | pdf-export.js | Geracao de relatorio de auditoria em PDF usando jsPDF. Inclui cabecalho brandado, KPIs, tabela de checkings com cores por status, log de auditoria, resumo estatistico e rodape com paginacao. |

---

## Backend -- Workflow n8n

O backend e um workflow n8n com mais de 50 nodes organizados em branches de roteamento por acao. Cada requisicao POST chega no webhook com um campo `action` que determina o fluxo de execucao.

### Ponto de Entrada: Webhook

- **URL Producao**: `https://n8n.grupoom.com.br/webhook/painel-aprovacao`
- **URL Teste**: `https://n8n.grupoom.com.br/webhook-test/painel-aprovacao`
- **Metodo**: POST
- **Content-Type**: application/json
- **Formato do body**: `{ "action": "<nome_da_acao>", ...parametros }`

### Roteamento por Acao (Switch Node)

O node "Roteamento da Acao" recebe o campo `action` e direciona para o branch correspondente:

| Acao | Descricao | Parametros |
|---|---|---|
| `login` | Autenticacao de usuario | `email`, `password` |
| `register_user` | Cadastro de novo usuario | `name`, `email`, `password`, `role` |
| `get_stats` | Retorna KPIs agregados | nenhum |
| `get_pending` | Lista checkings pendentes | nenhum |
| `get_all_checkings` | Lista todos os checkings | nenhum |
| `get_checkings` | Lista checkings com filtros | filtros opcionais |
| `approve` | Aprova um checking | `id`, `approval_user` |
| `reject` | Reprova um checking | `id`, `approval_user`, `reason` |
| `get_users` | Lista usuarios | nenhum |
| `update_user_role` | Altera role de usuario | `userId`, `newRole` |
| `update_user_status` | Ativa/desativa usuario | `userId`, `status` |
| `get_files` | Lista arquivos do Drive | `submission_id` |
| `health_check` | Verifica se o backend esta ativo | nenhum |

### Fluxo Detalhado por Acao

#### Login

1. Webhook recebe `{ action: "login", email, password }`
2. **Validacao de Middleware (JWT)**: verifica campos obrigatorios
3. **Consulta BigQuery**: busca usuario por email na tabela `usuarios`
4. **Hash da senha**: aplica SHA-256 na senha recebida e compara com o hash armazenado
5. **Geracao de JWT**: cria token com payload `{ id, email, role, name, exp }` assinado com HMAC-SHA256
6. **Resposta**: retorna `{ token, user: { id, name, email, role } }`

O JWT e gerado com implementacao customizada em JavaScript dentro do n8n usando:
- Encode Base64URL do header `{ alg: "HS256", typ: "JWT" }`
- Encode Base64URL do payload com claims padrao
- Assinatura HMAC-SHA256 com chave secreta configurada como credencial do n8n

#### Registro de Usuario

1. Webhook recebe `{ action: "register_user", name, email, password, role }`
2. **Validacao**: verifica se email ja existe no BigQuery
3. **Hash da senha**: SHA-256 da senha em texto plano
4. **Geracao de UUID**: cria ID unico para o usuario
5. **INSERT BigQuery**: insere novo registro na tabela `usuarios` com status `active`
6. **Resposta**: confirmacao de sucesso

#### Consulta de Estatisticas (get_stats)

1. **Validacao de JWT**: verifica token do header Authorization
2. **Query BigQuery**: executa COUNT/SUM agregado na tabela `checkings`
3. **Calcula metricas**: total, pendentes, aprovados, reprovados, novos, complementos
4. **Resposta**: JSON com todas as metricas

#### Aprovacao de Checking

1. **Validacao de JWT**: verifica autenticacao
2. **UPDATE BigQuery**: atualiza o checking com `status = 'approved'`, `approval_user`, `approved_at`
3. **Resposta**: confirmacao de sucesso

#### Reprovacao de Checking

1. **Validacao de JWT**: verifica autenticacao
2. **UPDATE BigQuery**: atualiza o checking com `status = 'rejected'`, `approval_user`, `rejected_at`, `rejection_reason`, incrementa `rejection_count`
3. **Envio de Email (SMTP)**: notifica o fornecedor sobre a reprovacao com os detalhes e o motivo
4. **Resposta**: confirmacao de sucesso

O email de reprovacao e enviado automaticamente para o contato cadastrado no checking, incluindo:
- Nome do cliente
- Numero do PI
- Veiculo
- Motivo da reprovacao
- Nome do responsavel pela reprovacao

#### Listagem de Arquivos (get_files)

1. **Validacao de JWT**: verifica autenticacao
2. **Consulta BigQuery**: busca o `webViewLink` (URL da pasta no Google Drive) do checking
3. **Google Drive API**: lista arquivos na pasta correspondente
4. **Organizacao por endereco**: agrupa arquivos por subpasta (endereco de veiculacao)
5. **Metadados**: identifica tipo do arquivo (imagem, PDF, video), gera thumbnails
6. **Resposta**: JSON com arquivos organizados por endereco

### Seguranca no Workflow

- **Middleware JWT**: presente em todas as acoes que nao sejam `login` e `register_user`
- **Validacao de Token**: decodifica o JWT, verifica assinatura HMAC-SHA256 e expiracao
- **Hash de Senhas**: SHA-256 aplicado antes de armazenar no BigQuery
- **CORS**: configurado no n8n para aceitar requisicoes apenas de origens autorizadas
- **Respostas de Erro**: padronizadas com status HTTP adequado (401, 400, 500)

---

## Esquema do Banco de Dados (BigQuery)

### Tabela: `checkings`

| Coluna | Tipo | Descricao |
|---|---|---|
| submission_id | STRING | ID unico do checking (UUID) |
| n_pi | STRING | Numero do Plano de Insercao |
| cliente | STRING | Nome do cliente anunciante |
| veiculo | STRING | Veiculo de midia (outdoor, LED, painel, etc.) |
| meio | STRING | Meio de comunicacao |
| nome_contato | STRING | Nome do contato do fornecedor |
| email_contato | STRING | Email do contato do fornecedor |
| status | STRING | Status atual: pending, approved, rejected |
| approval_user | STRING | Nome de quem aprovou/reprovou |
| approved_at | TIMESTAMP | Data/hora da aprovacao |
| rejected_at | TIMESTAMP | Data/hora da reprovacao |
| rejection_reason | STRING | Motivo da reprovacao |
| rejection_count | INTEGER | Numero de reprovacoes (contagem de reenvios) |
| is_complement | INTEGER | 1 = complemento/reenvio, 0 = envio original |
| webViewLink | STRING | URL da pasta no Google Drive |
| created_at | TIMESTAMP | Data/hora de criacao do registro |

### Tabela: `usuarios`

| Coluna | Tipo | Descricao |
|---|---|---|
| id | STRING | ID unico do usuario (UUID) |
| name | STRING | Nome completo |
| email | STRING | Email de login |
| password_hash | STRING | Hash SHA-256 da senha |
| role | STRING | Permissao: admin, manager, analyst |
| status | STRING | Status: active, inactive |
| created_at | TIMESTAMP | Data de criacao da conta |

---

## Seguranca e Autenticacao

### Fluxo de Autenticacao

1. Usuario digita email e senha no formulario de login
2. Frontend envia POST com `{ action: "login", email, password }`
3. Backend busca usuario por email no BigQuery
4. Backend aplica SHA-256 na senha recebida e compara com o hash armazenado
5. Se a senha bate, gera um token JWT com HMAC-SHA256 contendo:
   - `id`: UUID do usuario
   - `email`: email do usuario
   - `name`: nome do usuario
   - `role`: permissao (admin/manager/analyst)
   - `exp`: timestamp de expiracao
6. Token e retornado ao frontend e salvo no `localStorage`
7. Todas as requisicoes subsequentes incluem o token no header `Authorization: Bearer <token>`
8. Backend valida o token em todas as acoes protegidas

### Implementacao do JWT (dentro do n8n)

O JWT e implementado manualmente em JavaScript no n8n usando:

```
Header:  { "alg": "HS256", "typ": "JWT" }
Payload: { id, email, name, role, iat, exp }
```

- Encode: Base64URL (substituindo +/= por -/_)
- Assinatura: HMAC-SHA256 com chave secreta armazenada como credencial do n8n
- Expiracao: configuravel (padrao de 24 horas)

### Verificacao no Frontend

O `api.js` decodifica o payload do JWT para verificar a expiracao localmente antes de fazer requisicoes. A funcao `decodeJwtPayload` trata a conversao de Base64URL para Base64 padrao, incluindo padding adequado para que o `atob()` funcione corretamente.

### Protecao de Rotas

- **Frontend**: `Auth.checkSession()` redireciona para `index.html` se o token nao existir ou estiver expirado
- **Backend**: middleware JWT em todas as acoes exceto `login` e `register_user`
- **Token expirado**: retorno 401 do backend, frontend remove o token e redireciona para login

---

## Configuracao e Deploy

### Pre-requisitos

- Servidor web (qualquer um: Nginx, Apache, Vercel, Netlify, ou ate um Live Server local)
- Instancia n8n rodando (self-hosted ou cloud)
- Projeto Google Cloud com BigQuery e Drive API habilitados
- Credenciais de servico Google configuradas no n8n
- Credencial SMTP configurada no n8n para envio de emails

### Passos de Configuracao

1. **Frontend**: Servir os arquivos HTML/CSS/JS em qualquer servidor web

2. **Backend n8n**:
   - Importar o workflow no n8n
   - Configurar as credenciais do Google BigQuery
   - Configurar as credenciais do Google Drive
   - Configurar as credenciais SMTP
   - Definir a chave secreta JWT como credencial
   - Ativar o workflow

3. **Banco de Dados**:
   - Criar o dataset e as tabelas `checkings` e `usuarios` no BigQuery
   - Inserir o usuario administrador inicial usando o node "Definir Dados Admin" ou via registro

4. **Ajuste de URL**:
   - Em `api.js`, verificar se `BASE_URL` aponta para o webhook correto
   - Alternar `IS_TEST_MODE` entre `true/false` conforme necessario

### Variavel de Modo de Teste

No arquivo `api.js`, a constante `IS_TEST_MODE` controla qual URL do webhook sera utilizada:

```javascript
const IS_TEST_MODE = false;  // false = producao, true = teste
const BASE_URL = IS_TEST_MODE
    ? 'https:-test/fake-aprovacao'
    : 'https:produção-aprovacao';
```

Ao usar `IS_TEST_MODE = true`, as requisicoes vao para o webhook de teste do n8n, que requer que o workflow esteja em modo de escuta (botao "Test Workflow" clicado no n8n).

---

## Processo de Desenvolvimento

### Decisoes de Arquitetura

**Frontend sem framework**: a decisao de usar HTML/CSS/JS puro foi intencional. O sistema e uma aplicacao interna com 3 paginas, onde a complexidade nao justifica a adocao de um framework como React ou Vue. Isso resulta em:
- Zero dependencias de build (nao precisa de npm, webpack, vite)
- Deploy extremamente simples (copiar arquivos para qualquer servidor)
- Performance maxima (sem overhead de virtual DOM ou runtime de framework)
- Manutencao facilitada (qualquer desenvolvedor com conhecimento basico de JS entende o codigo)

**Modulos IIFE**: cada modulo JavaScript usa o padrao IIFE (Immediately Invoked Function Expression) para encapsular o escopo e expor apenas a API publica. Isso evita poluicao do escopo global e simula o encapsulamento de modulos ES6 sem precisar de bundler.

**Google Charts**: escolhido por nao exigir instalacao (CDN), ter suporte nativo a animacoes, interatividade e temas, e ser mantido pelo Google com documentacao extensa.

**n8n como backend**: permite iterar rapidamente na logica de negocio sem precisar escrever codigo de servidor. O roteamento por acao via Switch node simula um sistema de rotas REST. A implementacao customizada de JWT em JavaScript dentro do n8n demonstra que a plataforma e flexivel o suficiente para necessidades de seguranca reais.

**BigQuery como banco**: apesar de ser otimizado para analytics, funciona bem como banco transacional para este volume de dados. A vantagem e a integracao nativa com o ecossistema Google Cloud (Drive, Sheets, etc.).

### Desafios Tecnicos Resolvidos

1. **Base64URL no JWT**: o `atob()` do JavaScript nao aceita caracteres `-` e `_` (Base64URL). Foi necessario implementar conversao de Base64URL para Base64 padrao com padding adequado.

2. **CORS no n8n**: configuracao do n8n para aceitar requisicoes cross-origin do frontend.

3. **Tooltip flickering nos graficos**: os tooltips do Google Charts causavam reflow no container, resultando em piscar ao passar o mouse. Resolvido com `tooltip: { trigger: 'focus' }`, `focusTarget: 'category'`, containers com altura explicita e CSS de estabilizacao.

4. **Tema responsivo nos graficos**: como Google Charts renderiza em SVG/Canvas, as cores nao respondem automaticamente a CSS variables. Cada grafico verifica o tema ativo e aplica cores correspondentes, re-renderizando quando o tema muda.

5. **Geracao de PDF no client-side**: implementado com jsPDF gerando documento multi-pagina com tabelas formatadas, cores por status, cabecalho brandado e rodape com paginacao.

---

## Propriedade Intelectual e Autoria
**Desenvolvido e Criado por:** Nero/Phillipe 
**Propriedade Intelectual e Direitos Atribuidos a:** Grupo OM

*Este sistema foi idealizado e construido integralmente por Nero/Phillipe para uso exclusivo do departamento de chekin e midia do Grupo OM. Todo o codigo, arquitetura e fluxos sao de propriedade intelectual exclusiva do Grupo OM.*
