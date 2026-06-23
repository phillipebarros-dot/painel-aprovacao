# Painel de Checking · Grupo OM

Painel de auditoria de mídia (checking de veiculações) integrado a **n8n + BigQuery + Google Drive**.

## Arquitetura

App único, sem dados falsos. Abre em branco e carrega tudo do backend após o login.

```
index.html              Entry de produção (carrega React + a app)
lib/api.js              Client do webhook n8n — TODAS as actions (login, dados, decisões)
src/app.jsx             Shell raiz (sidebar, topbar, rotas, atalhos)
src/core/               Lógica pura (sem JSX): data.js, helpers.js, intelligence.js, rules.js
src/components/         UI reutilizável: ui.jsx, viz.jsx, copilot.jsx, shader-login.jsx
src/screens/            Telas: login, dashboard, approvals, producao, review, etc.
src/styles/             core.css + components.css
assets/img/             Logos OM, selos, favicon
n8n/                    SQL + nodes + fluxo completo da 2ª fase
```

Fluxo de boot: `index.html` importa `lib/api.js` como módulo e expõe `window.PainelAPI`. O usuário faz login (Google Workspace SSO ou email/senha) contra o n8n. Após o login, `window.MOCK.loadReal()` busca checkings, usuários e quem está online do BigQuery. Antes disso o painel fica em branco. Não existe mock nem dado de exemplo.

## Configuração (`lib/api.js`)
- `BASE_URL` — webhook do n8n (`https://n8n.grupoom.com.br/webhook/painel-aprovacao`).
- `GOOGLE_CLIENT_ID` — client id do SSO Google.
- `INACTIVITY_TIMEOUT_MS` — logout automático por inatividade (15 min).

Segurança no client: token ofuscado em sessionStorage, fingerprint de dispositivo, limite de requisições concorrentes, timeout, expiração por inatividade. Nenhum segredo vive no front (o `N8N_JWT_SECRET` fica como env do n8n). No backend, o nó `Sanitizar Input` escapa/valida todo campo antes de ir ao BigQuery (anti SQL injection).

## Actions (contrato front <-> n8n)
Já no fluxo: `login`, `login_sso`, `logout`, `heartbeat`, `health_check`, `get_stats`, `get_pending`, `get_all_checkings`, `get_checkings`, `approve`, `reject`, `resubmit_checking`, `get_users`, `register_user`, `update_user_role`, `update_user_status`, `get_files`, `generate_slides`, `get_security_alerts`, `get_online_users`, `get_notifications`, `log_security_event`.

Novas da 2ª fase (ver `n8n/`): `assign_responsible`, `get_responsaveis`, `add_comment`, `get_history`, `set_supplier_rating`, `get_suppliers`, `update_checking_status`, `save_sla_config`, `get_sla_config`, `export_pdf`.

## Deploy

### 1. BigQuery (rodar uma vez)
Execute `n8n/01-schema-bigquery.sql` — cria 4 tabelas da 2ª fase (`pi_responsaveis`, `checking_comments`, `suppliers`, `sla_config`).

### 2. n8n
Importe `n8n/02-novos-nodes.json` e ligue ao Switch conforme `n8n/README.md`. Aplique também os ajustes nos nós existentes descritos lá (e-mail de aprovação ao fornecedor, JOIN do responsável nas leituras, privacidade de métricas individuais só para gestor, export PDF, divisão mensal).

### 3. Frontend
Servir os estáticos no domínio `painelchecking.grupoom.com.br`. `index.html` carrega `lib/api.js` como módulo ES — qualquer host estático com suporte a módulos serve direto. CORS no n8n já está travado nesse domínio.

## GitHub
`git init && git add . && git commit -m "Painel checking 2a fase" && git push`. O `.gitignore` já ignora node_modules, dist, .env.
