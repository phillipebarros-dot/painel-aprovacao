# Painel de Aprovacao de Checking

Grupo OM. Sistema interno de auditoria e aprovacao de comprovantes de veiculacao de midia.

## O que e este projeto

Este e o frontend do Painel de Aprovacao de Checking. A equipe interna do Grupo OM usa este painel para revisar fotos, videos e PDFs enviados por fornecedores de midia, e decidir se aprova ou reprova cada comprovante.

O sistema completo tem quatro partes:

| Parte | Tecnologia | Funcao |
|---|---|---|
| Frontend (este repo) | React 19 + Vite 8 | Interface web da equipe |
| Backend | n8n (self-hosted) | API, logica de negocio, orquestracao |
| Banco de dados | Google BigQuery | Armazena checkings, usuarios, logs |
| Armazenamento | Google Drive | Fotos, videos, PDFs dos fornecedores |

## Stack

| Item | Valor |
|---|---|
| React | 19.2 (Classic JSX Runtime) |
| Vite | 8.1 |
| CSS | Vanilla (variaveis CSS, sem Tailwind) |
| Fontes | Montserrat, Open Sans, JetBrains Mono |
| 3D | Three.js (efeito de login) |
| Auth | Google Identity Services (SSO) + JWT |
| Deploy | Docker multi-stage (Node build + Nginx serve) em Cloud Run |

## Estrutura

```
lib/
    api.js                  Cliente da API (39 rotas para o n8n)

src/
    main.jsx                Entry point (importa tudo na ordem)
    app.jsx                 Shell raiz (sidebar, roteamento, estado)

    core/
        data.js             Camada de dados (loadFiles, cache)
        helpers.js          Utilitarios (formatacao, datas)
        intelligence.js     Motor de IA local (fallback offline)
        rules.js            Regras de negocio (SLA, validacao)

    components/
        ui.jsx              Primitivas: Icon, Pill, Avatar, Button
        viz.jsx             Graficos: DonutChart, BarChart, SparkLine
        copilot.jsx         Copiloto IA (Gemini 2.0 Flash)
        shader-login.jsx    Efeito 3D da tela de login

    screens/
        login.jsx           Login (Google SSO + email/senha)
        dashboard.jsx       KPIs e graficos
        approvals.jsx       Tabela de checkings
        review.jsx          Revisao detalhada de um checking
        triage.jsx          Revisao em sequencia (modo rapido)
        producao.jsx        Board de producao
        reports.jsx         Relatorios e exportacao
        alerts.jsx          Alertas e riscos de SLA
        users.jsx           Gestao de usuarios
        operations.jsx      Configuracoes
        fornecedores.jsx    Lista de fornecedores
        comprovante.jsx     Visualizacao de comprovante
        automacoes.jsx      Automacoes

    styles/
        core.css            Design system (tokens, layout, temas)
        components.css      Estilos de componentes

index.html                  HTML de entrada
Dockerfile                  Build multi-stage (Node + Nginx)
nginx.conf                  Config do servidor web
ARQUITETURA.md              Documento de arquitetura completo
MANUAL_DO_USUARIO.md        Manual de funcoes do painel
```

## Como rodar localmente

```bash
npm install
npm run dev
```

O painel abre em http://localhost:3000. Precisa de conexao com o n8n para funcionar (os dados vem da API).

## Como fazer build

```bash
npm run build
```

Gera a pasta dist/ com HTML, JS e CSS otimizados. Para testar o build localmente:

```bash
npm run preview
```

## Deploy

O deploy e feito via Docker no Google Cloud Run:

```bash
docker build -t painel-aprovacao .
docker push [registry]/painel-aprovacao
gcloud run deploy painel-aprovacao --image [registry]/painel-aprovacao --port 8080
```

O Dockerfile faz build com Node e serve com Nginx. O nginx.conf garante:
1. index.html nunca e cacheado (sempre busca a versao mais recente)
2. Assets com hash tem cache de 1 ano (immutable)
3. Qualquer rota desconhecida retorna index.html (SPA fallback)

## API

Todas as rotas usam um unico endpoint:

```
POST https://n8n.grupoom.com.br/webhook/painel-aprovacao
Content-Type: application/json
Body: { "action": "nome_da_acao", "token": "jwt...", ...params }
```

39 actions disponiveis. Consulte o arquivo ARQUITETURA.md para a lista completa com descricao de cada uma.

## Autenticacao

Login com Google SSO (principal) ou email/senha (alternativo). Token JWT armazenado em localStorage. Logout automatico apos 15 minutos de inatividade. Heartbeat a cada 60 segundos para registrar presenca.

Perfis de acesso: Admin (acesso total), Analyst (pode aprovar/reprovar), Viewer (somente leitura).

## Documentacao

| Arquivo | Conteudo |
|---|---|
| ARQUITETURA.md | Documento de Arquitetura de Software completo (SAD). Cobre frontend, backend, banco, Drive, formulario, regras de negocio, deploy, decisoes tecnicas, limitacoes. Para leigos e desenvolvedores |
| MANUAL_DO_USUARIO.md | Manual de funcoes do painel. Descreve como cada tela funciona |
| README.md | Este arquivo. Visao geral e como rodar |

## Repositorios Relacionados

| Repo | Funcao |
|---|---|
| phillipebarros-dot/painel-aprovacao | Este projeto (frontend do painel) |
| phillipebarros-dot/Sistema-de-Cheking | Formulario web do fornecedor (coleta de comprovantes) |

## Configuracao

As constantes ficam no topo de lib/api.js:

| Constante | Valor | Descricao |
|---|---|---|
| BASE_URL | https://n8n.grupoom.com.br/webhook/painel-aprovacao | Endpoint unico da API |
| GOOGLE_CLIENT_ID | 737388...apps.googleusercontent.com | Client ID do Google SSO |
| INACTIVITY_TIMEOUT_MS | 900000 (15 min) | Tempo ate logout automatico |
